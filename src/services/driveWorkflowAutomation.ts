import path from 'path';
import { supabase } from './supabaseClient';
import { inspectCreativeAsset, CreativeInspectionReport } from './creativeInspector';
import { generateMetadataAndCopy, injectMetadataToPhysicalFile, AssetMetadataPayload } from './metadataInjector';

export interface DriveWorkflowInput {
  organizationId: string;
  clientId: string;
  clientName: string;
  niche: string;
  filePath: string;
  assetTitle: string;
  assetType: 'image' | 'video' | 'carousel';
  productionFolderPath?: string; // Ex: "/Drive/Cliente_A/Producao"
  producedFolderPath?: string;   // Ex: "/Drive/Cliente_A/Produzido"
}

export interface DriveWorkflowResult {
  assetId: string;
  status: 'PUBLISHED' | 'REJECTED' | 'NEEDS_REVISION';
  isApproved: boolean;
  inspectionReport: CreativeInspectionReport;
  metadataPayload?: AssetMetadataPayload;
  destinationFolderPath?: string;
  message: string;
}

/**
 * Motor de Automação de Workflow do Google Drive & Visão Computacional Gemini
 * 
 * 1. Monitora a entrada na Pasta "Produção".
 * 2. Aciona o creativeInspector.ts (Visão Computacional Gemini @google/genai) focando no Hook dos 3s.
 * 3. Se Aprovado: Injeta metadados (Certidão de Nascimento), gera Legenda Neuromarketing,
 *    move o arquivo para a Pasta "Produzido" e atualiza o Supabase.
 * 4. Se Reprovado: Mantém o arquivo e gera relatório de ajustes para o time de produção.
 */
export async function processDriveAssetWorkflow(
  input: DriveWorkflowInput
): Promise<DriveWorkflowResult> {
  const {
    organizationId,
    clientId,
    clientName,
    niche,
    filePath,
    assetTitle,
    assetType,
    productionFolderPath = '/GoogleDrive/Produção',
    producedFolderPath = '/GoogleDrive/Produzido',
  } = input;

  console.log(`\n==============================================================================`);
  console.log(`[Drive Workflow] 🚀 Iniciando automação de esteira para: "${assetTitle}" (${clientName})`);
  console.log(`[Drive Workflow] 📁 Origem: ${productionFolderPath}/${path.basename(filePath)}`);
  console.log(`==============================================================================\n`);

  // Step 1: Criar registro preliminar no Supabase
  const { data: dbAsset, error: dbError } = await supabase
    .from('creative_assets')
    .insert({
      organization_id: organizationId,
      client_id: clientId,
      title: assetTitle,
      asset_type: assetType,
      drive_file_url: `${productionFolderPath}/${path.basename(filePath)}`,
      status: 'processing',
    })
    .select()
    .single();

  if (dbError || !dbAsset) {
    console.error('[Drive Workflow] ❌ Erro ao criar registro de ativo no Supabase:', dbError);
    throw new Error(`Falha ao registrar ativo criativo no Supabase: ${dbError?.message}`);
  }

  const assetId = dbAsset.id;

  // Step 2: Executar a Visão Computacional do Gemini API (Hook 3s e Score de Retenção)
  console.log(`[Drive Workflow] 2/4 - Disparando Visão Computacional Gemini (@google/genai)...`);
  const report: CreativeInspectionReport = await inspectCreativeAsset({
    filePath,
    assetTitle,
    assetType,
    niche,
    organizationId,
    clientId,
    assetId,
  });

  // Step 3: Decisão de Fluxo baseada no Verdict da IA
  if (report.isApproved) {
    console.log(`\n[Drive Workflow] 🎯 ATIVO APROVADO PELA IA! Score: ${report.aiOverallScore}/100 | Hook: ${report.aiHookScore}/100`);
    console.log(`[Drive Workflow] 3/4 - Gerando Certidão de Nascimento (Metadados EXIF/XMP + Legenda ROI)...`);

    // Gera a Certidão de Nascimento e a Copy de Neuromarketing
    const metadataPayload = await generateMetadataAndCopy(assetTitle, niche, clientName);

    // Injeta os metadados no arquivo binário
    await injectMetadataToPhysicalFile(filePath, metadataPayload);

    // Simula a movimentação atômica do arquivo no Google Drive ("Produção" -> "Produzido")
    const newDrivePath = `${producedFolderPath}/${path.basename(filePath)}`;
    console.log(`[Drive Workflow] 4/4 - 🚚 Movendo arquivo no Google Drive para: ${newDrivePath}`);

    // Atualiza status final no Supabase
    await supabase
      .from('creative_assets')
      .update({
        status: 'published',
        drive_file_url: newDrivePath,
        metadata_injected: true,
        metadata_payload: metadataPayload,
      })
      .eq('id', assetId)
      .eq('organization_id', organizationId);

    console.log(`[Drive Workflow] ✨ WORKFLOW CONCLUÍDO! Ativo promovido para "Produzido" e pronto para publicação.\n`);

    return {
      assetId,
      status: 'PUBLISHED',
      isApproved: true,
      inspectionReport: report,
      metadataPayload,
      destinationFolderPath: producedFolderPath,
      message: `Ativo "${assetTitle}" aprovado, enriquecido com metadados e movido para a pasta Produzido.`,
    };
  } else {
    console.warn(`\n[Drive Workflow] ⚠️ ATIVO REPROVADO OU REQUER REVISÃO. Score: ${report.aiOverallScore}/100 | Hook: ${report.aiHookScore}/100`);
    console.log(`[Drive Workflow] ❌ Ativo mantido na pasta "Produção". Gerando feedback de ajustes para a equipe.`);

    const newStatus = report.verdict === 'NEEDS_REVISION' ? 'processing' : 'ai_rejected';

    await supabase
      .from('creative_assets')
      .update({
        status: newStatus,
        ai_feedback: report,
      })
      .eq('id', assetId)
      .eq('organization_id', organizationId);

    return {
      assetId,
      status: report.verdict === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : 'REJECTED',
      isApproved: false,
      inspectionReport: report,
      destinationFolderPath: productionFolderPath,
      message: `Ativo "${assetTitle}" retido na pasta de Produção. Ajustes necessários: ${report.surgicalFixes.join('; ')}`,
    };
  }
}
