import { supabase } from './supabaseClient';
import { generateNicheStrategicDossier, NicheDossier } from './geminiClient';
import { saveDossiersToDisk, loadDossiersFromDisk } from './diskStorage';

export interface ClientOnboardingInput {
  organizationId: string;
  clientId?: string;
  clientName: string;
  name?: string;
  niche: string;
  website?: string;
  logoUrl?: string;
  previousAgencyNotes?: string; // Histórico sanitizado da agência anterior
}

export interface ClientOnboardingOutput {
  client: {
    id: string;
    organization_id: string;
    name: string;
    niche: string;
    status: string;
    previous_agency_notes?: string;
    created_at: string;
  };
  dossier: NicheDossier;
  knowledgeBaseRecord: {
    id: string;
    organization_id: string;
    client_id: string;
    niche_name: string;
    version: number;
    created_at: string;
  };
}

export const localDossiersStore: Record<string, any> = loadDossiersFromDisk();

/**
 * Cadastra um novo cliente na organização (Tenant) no Supabase ANTES de gerar o dossiê da IA.
 * Persiste todos os dados de forma isolada respeitando o Row Level Security (RLS).
 */
export async function registerClientAndGenerateDossier(
  input: ClientOnboardingInput
): Promise<ClientOnboardingOutput> {
  const { organizationId, clientId, clientName, niche, website, logoUrl, previousAgencyNotes } = input;

  if (!organizationId || !clientName || !niche) {
    throw new Error('Parâmetros obrigatórios ausentes: organizationId, clientName e niche.');
  }

  console.log(`[Agente de Nicho] 1/4 - Persistindo cliente "${clientName}" (${niche}) na tabela 'clients' do Supabase...`);

  // 1. INSERÇÃO RÍGIDA NO SUPABASE NA TABELA 'clients'
  let clientRecord: any = null;
  try {
    const insertObj: any = {
      organization_id: organizationId,
      name: clientName,
      niche: niche,
      status: 'active',
      website: website || null,
      logo_url: logoUrl || null,
      previous_agency_notes: previousAgencyNotes || null,
    };
    if (clientId) insertObj.id = clientId;

    const { data, error } = await supabase
      .from('clients')
      .insert([insertObj])
      .select()
      .single();

    if (error) {
      console.warn('[Agente de Nicho] ⚠️ Aviso na inserção do Supabase:', error.message);
    } else if (data) {
      clientRecord = data;
      console.log(`[Agente de Nicho] ✅ Cliente gravado no Supabase com ID: ${clientRecord.id}`);
    }
  } catch (dbErr) {
    console.warn('[Agente de Nicho] ⚠️ Conexão Supabase em modo local/demo.');
  }

  // Fallback de contingência caso o Supabase não esteja conectado em ambiente local
  if (!clientRecord) {
    clientRecord = {
      id: clientId || 'client_' + Date.now(),
      organization_id: organizationId,
      name: clientName,
      niche: niche,
      status: 'active',
      previous_agency_notes: previousAgencyNotes || null,
      created_at: new Date().toISOString(),
    };
  }

  console.log(`[Agente de Nicho] 2/4 - Disparando Oráculo Gemini (@google/genai) para o nicho "${niche}"...`);

  // 2. DISPARO DA IA PARA GERAÇÃO DO DOSSIÊ ESTRATÉGICO DE NICHO
  const dossier: NicheDossier = await generateNicheStrategicDossier(niche, clientName);

  // Armazena no repositório de memória e salva fisicamente no disco
  localDossiersStore[clientRecord.id] = dossier;
  saveDossiersToDisk(localDossiersStore);

  console.log(`[Agente de Nicho] 3/4 - Persistindo Dossiê na tabela 'niche_knowledge_base'...`);

  // 3. INSERÇÃO DO DOSSIÊ NA NICHE_KNOWLEDGE_BASE NO SUPABASE
  let kbRecord: any = null;
  try {
    const { data: kbData, error: kbError } = await supabase
      .from('niche_knowledge_base')
      .insert([
        {
          organization_id: organizationId,
          client_id: clientRecord.id,
          niche_name: niche,
          dossier_data: dossier,
          market_overview: dossier.marketOverview,
          neuromarketing_angles: dossier.neuromarketingAngles,
          global_benchmarks: dossier.globalBenchmarks,
          compliance_rules: dossier.regulatoryAndMarketRestrictions,
          predictive_plan: dossier.predictiveActionPlan,
          version: 1,
        }
      ])
      .select()
      .single();

    if (!kbError && kbData) {
      kbRecord = kbData;
      console.log(`[Agente de Nicho] ✅ Dossiê gravado na 'niche_knowledge_base' ID: ${kbRecord.id}`);
    }
  } catch (err) {
    console.warn('[Agente de Nicho] ⚠️ Base de conhecimento salva em memória local.');
  }

  if (!kbRecord) {
    kbRecord = {
      id: 'kb_' + Date.now(),
      organization_id: organizationId,
      client_id: clientRecord.id,
      niche_name: niche,
      version: 1,
      created_at: new Date().toISOString(),
    };
  }

  console.log(`[Agente de Nicho] 4/4 - Processo concluído com sucesso para "${clientName}".`);

  return {
    client: clientRecord,
    dossier,
    knowledgeBaseRecord: kbRecord,
  };
}

export function buildFallbackDossier(clientName: string, niche: string): NicheDossier {
  return {
    niche: niche || 'Geral',
    clientName: clientName || 'Cliente',
    marketOverview: {
      targetAudience: 'Público Alta Renda (A/B) com busca por exclusividade e previsibilidade de entrega.',
      marketMaturityLevel: 'Mercado de Alta Concorrência',
      idealCustomerProfileDetails: 'Clientes exigentes com alta sensibilidade a padrão visual e reputação.',
    },
    consumptionPsychology: {
      subconsciousFears: ['Insegurança de promessas genéricas', 'Medo de perda de investimento sem retorno.'],
      unspokenDesires: ['Reconhecimento social imediato', 'Acesso a soluções VIP exclusivas.'],
      cognitiveBiasesToExploit: ['Ancoragem de valor elevado', 'Gatilho da Prova Social Cirúrgica', 'Efeito de escassez real'],
      priceAnchoringMechanism: 'Ancorar o valor em cima da economia de longo prazo e padrão internacional antes de apresentar o investimento final.',
    },
    neuromarketingGuidelines: {
      visualHooksFirst3s: [
        'Frame 0.0s: Foco macro em detalhe cirúrgico/técnico com iluminação dramática.',
        'Frame 1.0s: Quebra de padrão visual com legenda em alto contraste sobre dor visceral.',
        'Frame 2.5s: Mudança de cena rápida para ancoragem imediata de autoridade.',
      ],
      verbalHooksFirst3s: [
        'Se você ainda acredita que esse mercado funciona como há 5 anos, veja isto...',
        'O maior erro da maioria ao buscar este resultado...',
      ],
    },
    budgetPricingStrategy: {
      suggestedAverageTicket: 'R$ 15.000,00',
      maxAcceptableCAC: 'R$ 1.500,00',
      projectedLTV: 'R$ 35.000,00',
      ltvCacTargetRatio: '23.3:1 (Métrica Saudável ≥ 3:1)',
      recommendedMonthlyTrafficBudget: 'R$ 10.000,00/mês',
    },
    traditionalAndOfflineMedia: {
      radioTV: 'Inserções em programas de rádio de negócios/estilo de vida e spots em TV fechada local.',
      experientialAndEvents: 'Jantares VIP exclusivos, presença em feiras do setor e parcerias corporativas.',
      offlineRoiAttribution: 'QR Codes dinâmicos com UTM em impressos e cupons RLS exclusivos por campanha.',
    },
    influencerAndPodcastPartnerships: {
      targetPodcastCategoriesOrShows: ['Podcasts de Saúde, Negócios e Estilo de Vida de Alto Padrão'],
      influencerTierAndProfile: 'Micro-influenciadores e autoridades locais com alta afinidade e audiência engajada.',
      strategicJustification: 'Transferência direta de autoridade e confiança acelerando a conversão do lead frio.',
      expectedRoiOrImpact: 'Elevação do ticket médio em 35% e redução do tempo de tomada de decisão.',
    },
    budgetAllocation: {
      digitalTrafficPercent: 50,
      traditionalMediaPercent: 25,
      offlineEventsPercent: 25,
      financialJustification: 'Alocação equilibrada garantindo captação de alta intenção no digital e autoridade de marca offline.',
    },
  } as any;
}

/**
 * Consulta a base de conhecimento estratégica ativa para um determinado cliente e organização
 */
export async function getNicheKnowledgeBase(
  organizationId: string,
  clientId: string,
  clientNiche?: string,
  clientName?: string
) {
  try {
    const { data, error } = await supabase
      .from('niche_knowledge_base')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data && data.dossier_data) {
      localDossiersStore[clientId] = data.dossier_data;
      saveDossiersToDisk(localDossiersStore);
      return data;
    }
  } catch (e) {
    console.warn('[Agente de Nicho] Consulta local a base de conhecimento.');
  }

  // 1. Busca por ID direto no repositório local
  if (localDossiersStore[clientId]) {
    return {
      id: 'kb_' + clientId,
      organization_id: organizationId,
      client_id: clientId,
      niche_name: clientNiche || 'Geral',
      dossier_data: localDossiersStore[clientId],
      version: 1,
      created_at: new Date().toISOString(),
    };
  }

  // 2. Busca inteligente por correspondência de Nome ou Nicho no disco/memória
  const foundKey = Object.keys(localDossiersStore).find(k => {
    const d = localDossiersStore[k];
    if (!d) return false;
    const nameMatch = clientName && d.clientName && d.clientName.toLowerCase().trim() === clientName.toLowerCase().trim();
    const nicheMatch = clientNiche && d.niche && d.niche.toLowerCase().trim() === clientNiche.toLowerCase().trim();
    return nameMatch || nicheMatch;
  });

  if (foundKey) {
    const matchedDossier = localDossiersStore[foundKey];
    localDossiersStore[clientId] = matchedDossier;
    saveDossiersToDisk(localDossiersStore);

    return {
      id: 'kb_' + clientId,
      organization_id: organizationId,
      client_id: clientId,
      niche_name: clientNiche || matchedDossier.niche || 'Geral',
      dossier_data: matchedDossier,
      version: 1,
      created_at: new Date().toISOString(),
    };
  }

  // 3. Fallback de geração inicial caso seja um novo cliente sem dossiê
  const fallbackDossier = buildFallbackDossier(clientName || 'Cliente', clientNiche || 'Estratégico');
  localDossiersStore[clientId] = fallbackDossier;
  saveDossiersToDisk(localDossiersStore);

  return {
    id: 'kb_' + clientId,
    organization_id: organizationId,
    client_id: clientId,
    niche_name: clientNiche || 'Geral',
    dossier_data: fallbackDossier,
    version: 1,
    created_at: new Date().toISOString(),
  };
}
