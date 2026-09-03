import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface ClientWorkflowDashboardProps {
  organizationId: string;
  clientId: string;
  clientName?: string;
}

export interface CreativeAsset {
  id: string;
  organization_id: string;
  client_id: string;
  title: string;
  asset_type: 'image' | 'video' | 'carousel';
  drive_file_url?: string;
  status: 'raw' | 'processing' | 'ai_approved' | 'ai_rejected' | 'published';
  ai_overall_score?: number;
  ai_hook_score?: number;
  ai_feedback?: any;
  metadata_injected?: boolean;
  created_at: string;
}

export interface ClientData {
  id: string;
  name: string;
  niche: string;
  status: string;
  previous_agency_notes?: string;
}

/**
 * Componente Visual de Trilha de Equipe (Workflow Tracking por Cliente)
 * 
 * Exibe o workspace isolado do cliente selecionado dividido em:
 * 1. "Dossiê Estratégico" (output da IA Gemini)
 * 2. "Gestão de Equipe & Workflow" (Kanban com as 4 colunas operacionais da esteira)
 */
export const ClientWorkflowDashboard: React.FC<ClientWorkflowDashboardProps> = ({
  organizationId,
  clientId,
  clientName,
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'kanban'>('kanban');
  const [client, setClient] = useState<ClientData | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClientWorkspaceData();
  }, [organizationId, clientId]);

  /**
   * Busca dados em tempo real da tabela 'clients', 'niche_knowledge_base' e 'creative_assets'
   * filtrando estritamente pelo organizationId (Tenant) e clientId selecionado.
   */
  const fetchClientWorkspaceData = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Busca os dados cadastrais do cliente
      const { data: clientRes, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (clientErr) console.warn('[Kanban] Supabase em modo fallback local para cliente.');
      setClient(clientRes || { id: clientId, name: clientName || 'Dr. Alexandre Viana', niche: 'Médico Cirurgião Plástico', status: 'active' });

      // 2. Busca o Dossiê Estratégico ativo
      const { data: kbRes } = await supabase
        .from('niche_knowledge_base')
        .select('dossier_data')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      setDossier(kbRes?.dossier_data || getMockDossierFallback());

      // 3. Busca os ativos em produção/aprovados do cliente para o Kanban
      const { data: assetsRes } = await supabase
        .from('creative_assets')
        .select('*')
        .eq('client_id', clientId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      setAssets(assetsRes || getMockAssetsFallback(clientId, organizationId));
    } catch (err: any) {
      console.error('[Workflow Dashboard] Erro ao buscar dados:', err);
      setError('Falha ao carregar dados do workspace do cliente.');
      setAssets(getMockAssetsFallback(clientId, organizationId));
    } finally {
      setLoading(false);
    }
  };

  // Separação dos ativos nas 4 Colunas do Quadro Kanban
  const colProduzindo = assets.filter((a) => a.status === 'raw');
  const colAnaliseIA = assets.filter((a) => a.status === 'processing');
  const colAjustesNecessarios = assets.filter((a) => a.status === 'ai_rejected');
  const colPublicado = assets.filter((a) => a.status === 'published' || a.status === 'ai_approved');

  return (
    <div className="client-workflow-dashboard" style={containerStyle}>
      {/* CABEÇALHO DO WORKSPACE DO CLIENTE */}
      <header style={headerStyle}>
        <div>
          <span style={tenantBadgeStyle}>WORKSPACE ISOLADO // TENANT RLS</span>
          <h2 style={{ fontSize: '24px', margin: '4px 0', fontFamily: 'Outfit, sans-serif' }}>
            👤 {client?.name || clientName || 'Carregando cliente...'}
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '14px' }}>
            Nicho: <strong>{client?.niche || 'Geral'}</strong> | Status: <span style={{ color: '#00F5A0' }}>{client?.status.toUpperCase()}</span>
          </p>
        </div>

        {/* NAVEGAÇÃO DE ABAS INTERNAS */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('dossier')}
            style={activeTab === 'dossier' ? tabActiveStyle : tabInactiveStyle}
          >
            📜 Dossiê Estratégico (IA)
          </button>

          <button
            onClick={() => setActiveTab('kanban')}
            style={activeTab === 'kanban' ? tabActiveStyle : tabInactiveStyle}
          >
            📊 Gestão de Equipe & Workflow
          </button>
        </div>
      </header>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#00F2FE' }}>
          ⏳ Carregando dados da esteira em tempo real...
        </div>
      )}

      {/* ABA 1: DOSSIÊ ESTRATÉGICO */}
      {!loading && activeTab === 'dossier' && (
        <div style={cardGlassStyle}>
          <h3 style={{ color: '#00F2FE', marginBottom: '12px' }}>🧠 Dossiê Preditivo de Nicho - Gemini AI Output</h3>
          {dossier ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={boxStyle}>
                  <h4 style={{ color: '#FFD700' }}>📊 Visão Financeira de Mercado</h4>
                  <p><strong>ICP Alvo:</strong> {dossier.marketOverview?.targetAudience}</p>
                  <p><strong>Ticket Médio:</strong> {dossier.budgetPricingStrategy?.suggestedAverageTicket || 'R$ 15.000,00'}</p>
                  <p><strong>Meta LTV/CAC:</strong> {dossier.budgetPricingStrategy?.ltvCacTargetRatio || '3:1'}</p>
                </div>

                <div style={boxStyle}>
                  <h4 style={{ color: '#00F5A0' }}>⚡ Hooks de Retenção Visual (Primeiros 3s)</h4>
                  <ul>
                    {dossier.neuromarketingGuidelines?.visualHooksFirst3s?.map((h: string, idx: number) => (
                      <li key={idx}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Seção de Parcerias com Podcasts e Influenciadores no Dossiê Estratégico */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mt-4" style={{ background: '#111726', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                <h3 className="text-purple-400 font-semibold mb-2" style={{ color: '#A855F7', fontWeight: 600, marginBottom: '8px', fontSize: '16px' }}>🎙️ Patrocínios de Podcasts & Influenciadores</h3>
                <p className="text-sm text-slate-300 mb-1" style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '4px' }}><strong>Podcasts Alvo / Categorias:</strong> {dossier.influencerAndPodcastPartnerships?.targetPodcastCategoriesOrShows?.join(', ')}</p>
                <p className="text-sm text-slate-300 mb-1" style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '4px' }}><strong>Perfil de Influenciador:</strong> {dossier.influencerAndPodcastPartnerships?.influencerTierAndProfile}</p>
                <p className="text-sm text-slate-300 mb-1" style={{ fontSize: '14px', color: '#CBD5E1', marginBottom: '4px' }}><strong>Justificativa Estratégica:</strong> {dossier.influencerAndPodcastPartnerships?.strategicJustification}</p>
                <p className="text-sm text-slate-300" style={{ fontSize: '14px', color: '#CBD5E1' }}><strong>Impacto / ROI Esperado:</strong> {dossier.influencerAndPodcastPartnerships?.expectedRoiOrImpact}</p>
              </div>
            </div>
          ) : (
            <p>Nenhum dossiê gerado ainda.</p>
          )}
        </div>
      )}

      {/* ABA 2: QUADRO KANBAN DE GESTÃO DE EQUIPE */}
      {!loading && activeTab === 'kanban' && (
        <div style={kanbanGridStyle}>
          {/* COLUNA 1: PRODUZINDO [DESIGNER / VIDEOMAKER] */}
          <div style={kanbanColStyle}>
            <div style={colHeaderStyle('#3B82F6')}>
              <span>1. Produzindo [Designer/Videomaker]</span>
              <span style={badgeCountStyle}>{colProduzindo.length}</span>
            </div>
            <div style={cardListStyle}>
              {colProduzindo.map((asset) => (
                <KanbanAssetCard key={asset.id} asset={asset} />
              ))}
              {colProduzindo.length === 0 && <EmptyColState text="Sem demandas em produção" />}
            </div>
          </div>

          {/* COLUNA 2: ANÁLISE DA IA [HOOK SCORE] */}
          <div style={kanbanColStyle}>
            <div style={colHeaderStyle('#00F2FE')}>
              <span>2. Análise da IA [Hook Score]</span>
              <span style={badgeCountStyle}>{colAnaliseIA.length}</span>
            </div>
            <div style={cardListStyle}>
              {colAnaliseIA.map((asset) => (
                <KanbanAssetCard key={asset.id} asset={asset} />
              ))}
              {colAnaliseIA.length === 0 && <EmptyColState text="Sem criativos aguardando análise" />}
            </div>
          </div>

          {/* COLUNA 3: AJUSTES NECESSÁRIOS */}
          <div style={kanbanColStyle}>
            <div style={colHeaderStyle('#EF4444')}>
              <span>3. Ajustes Necessários</span>
              <span style={badgeCountStyle}>{colAjustesNecessarios.length}</span>
            </div>
            <div style={cardListStyle}>
              {colAjustesNecessarios.map((asset) => (
                <KanbanAssetCard key={asset.id} asset={asset} showFixes />
              ))}
              {colAjustesNecessarios.length === 0 && <EmptyColState text="Nenhuma peça reprovada" />}
            </div>
          </div>

          {/* COLUNA 4: PUBLICADO / PRODUZIDO */}
          <div style={kanbanColStyle}>
            <div style={colHeaderStyle('#10B981')}>
              <span>4. Publicado / Produzido</span>
              <span style={badgeCountStyle}>{colPublicado.length}</span>
            </div>
            <div style={cardListStyle}>
              {colPublicado.map((asset) => (
                <KanbanAssetCard key={asset.id} asset={asset} showMetadata />
              ))}
              {colPublicado.length === 0 && <EmptyColState text="Nenhuma peça concluída" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// COMPONENTE DO CARD KANBAN
const KanbanAssetCard: React.FC<{ asset: CreativeAsset; showFixes?: boolean; showMetadata?: boolean }> = ({
  asset,
  showFixes,
  showMetadata,
}) => {
  return (
    <div style={assetCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={typeBadgeStyle}>{asset.asset_type.toUpperCase()}</span>
        {asset.ai_hook_score !== undefined && (
          <span style={{ fontSize: '12px', color: '#00F2FE', fontWeight: 'bold' }}>
            Hook: {asset.ai_hook_score}/100
          </span>
        )}
      </div>

      <h4 style={{ fontSize: '14px', margin: '8px 0 4px', color: '#F1F5F9' }}>{asset.title}</h4>

      {showFixes && asset.ai_feedback?.surgicalFixes && (
        <div style={{ background: 'rgba(239,68,68,0.1)', padding: '6px', borderRadius: '4px', marginTop: '6px' }}>
          <strong style={{ fontSize: '11px', color: '#EF4444' }}>Ajustes Solicitados:</strong>
          <ul style={{ fontSize: '11px', color: '#FCA5A5', paddingLeft: '14px' }}>
            {asset.ai_feedback.surgicalFixes.slice(0, 2).map((fix: string, i: number) => (
              <li key={i}>{fix}</li>
            ))}
          </ul>
        </div>
      )}

      {showMetadata && (
        <div style={{ fontSize: '11px', color: '#10B981', marginTop: '6px' }}>
          ✅ Certidão de Nascimento EXIF/XMP Injetada
        </div>
      )}
    </div>
  );
};

const EmptyColState: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ textAlign: 'center', padding: '20px', color: '#64748B', fontSize: '12px', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px' }}>
    {text}
  </div>
);

// ESTILOS EM OBJETO JS PARA COMPATIBILIDADE REPO
const containerStyle: React.CSSProperties = {
  background: '#0B0F19',
  color: '#F1F5F9',
  padding: '24px',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  paddingBottom: '16px',
};

const tenantBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  background: 'rgba(0, 242, 254, 0.15)',
  color: '#00F2FE',
  padding: '2px 8px',
  borderRadius: '4px',
};

const tabActiveStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'linear-gradient(135deg, rgba(0,242,254,0.2), rgba(127,0,255,0.2))',
  border: '1px solid #00F2FE',
  color: '#00F2FE',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
};

const tabInactiveStyle: React.CSSProperties = {
  padding: '10px 16px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#94A3B8',
  borderRadius: '8px',
  cursor: 'pointer',
};

const cardGlassStyle: React.CSSProperties = {
  background: 'rgba(18, 24, 38, 0.7)',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '20px',
  borderRadius: '12px',
};

const boxStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.08)',
};

const kanbanGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
  width: '100%',
  minWidth: 0,
};

const kanbanColStyle: React.CSSProperties = {
  background: 'rgba(13, 18, 29, 0.8)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '14px',
  minWidth: 0,
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
};

const colHeaderStyle = (color: string): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontWeight: 600,
  fontSize: '13px',
  color: color,
  marginBottom: '14px',
  paddingBottom: '8px',
  borderBottom: `2px solid ${color}`,
  minWidth: 0,
  wordBreak: 'break-word',
});

const badgeCountStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '11px',
  color: '#FFF',
};

const cardListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  minWidth: 0,
};

const assetCardStyle: React.CSSProperties = {
  background: '#111726',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px',
  borderRadius: '8px',
  minWidth: 0,
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
};

const typeBadgeStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  background: 'rgba(255,255,255,0.06)',
  padding: '2px 6px',
  borderRadius: '4px',
  color: '#94A3B8',
};

// FALLBACKS DE DEMONSTRAÇÃO QUANDO OFFLINE
function getMockDossierFallback() {
  return {
    marketOverview: { targetAudience: 'Público A/B', averageTicket: 'R$ 18.500,00', ltvCacRatio: '31.6:1' },
    neuromarketingAngles: { hookConcepts: ['Frame 0s: Foco no detalhe e legenda visceral', 'Frame 1.5s: Pergunta direta de quebra de padrão'] }
  };
}

function getMockAssetsFallback(clientId: string, organizationId: string): CreativeAsset[] {
  return [
    {
      id: 'asset_01',
      organization_id: organizationId,
      client_id: clientId,
      title: 'VSL Rinoplastia Alta Definição - V1',
      asset_type: 'video',
      status: 'raw',
      created_at: new Date().toISOString(),
    },
    {
      id: 'asset_02',
      organization_id: organizationId,
      client_id: clientId,
      title: 'Carrossel Mito vs Verdade Cirurgia',
      asset_type: 'carousel',
      status: 'processing',
      ai_hook_score: 84,
      created_at: new Date().toISOString(),
    },
    {
      id: 'asset_03',
      organization_id: organizationId,
      client_id: clientId,
      title: 'Reels Antes e Depois Sem Contraste',
      asset_type: 'video',
      status: 'ai_rejected',
      ai_hook_score: 52,
      ai_feedback: {
        surgicalFixes: ['Elevar contraste do primeiro segundo', 'Adicionar legenda em amarelo neon no Hook']
      },
      created_at: new Date().toISOString(),
    },
    {
      id: 'asset_04',
      organization_id: organizationId,
      client_id: clientId,
      title: 'Anúncio Institucional Clínica Luxe (Aprovado)',
      asset_type: 'video',
      status: 'published',
      ai_hook_score: 95,
      metadata_injected: true,
      created_at: new Date().toISOString(),
    },
  ];
}
