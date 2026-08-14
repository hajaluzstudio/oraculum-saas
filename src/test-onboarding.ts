import { registerClientAndGenerateDossier } from './services/nicheResearcher';

async function runOnboardingIntegrationTest() {
  console.log('🚀 Iniciando Teste de Integração de Onboarding de Cliente + Supabase + Gemini API...\n');

  // ID de exemplo de uma Organização (Tenant)
  const mockTenantId = 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';

  const onboardingPayload = {
    organizationId: mockTenantId,
    clientName: 'Dr. Roberto Silveira - Rinoplastia de Alta Definição',
    niche: 'Médico Cirurgião Plástico',
    website: 'https://drrobertosilveira.com.br',
    previousAgencyNotes: 'Cliente focado em cirurgias de alto ticket (R$ 30k+). Tom de voz extremamente elegante e sóbrio. Deseja branding sofisticado.',
  };

  try {
    console.log(`📋 Dados do Onboarding:`, onboardingPayload);
    console.log('\n⏳ Processando cadastro e inteligência de nicho...');
    
    const result = await registerClientAndGenerateDossier(onboardingPayload);

    console.log('\n🎉 PROCESSO DE ONBOARDING CONCLUÍDO COM SUCESSO!');
    console.log('--------------------------------------------------');
    console.log('Cliente ID:', result.client.id);
    console.log('Status do Cliente:', result.client.status);
    console.log('Base de Conhecimento ID:', result.knowledgeBaseRecord.id);
    console.log('Nicho Analisado:', result.dossier.niche);
    console.log('\n📊 Resumo da Visão de Mercado (Preditiva):');
    console.table(result.dossier.marketOverview);
    console.log('\n🧠 Ganchos de Neuromarketing (Primeiros 3 segundos):');
    console.log(result.dossier.neuromarketingAngles.hookConcepts);
  } catch (error) {
    console.error('❌ Falha na execução da integração:', error);
  }
}

runOnboardingIntegrationTest();
