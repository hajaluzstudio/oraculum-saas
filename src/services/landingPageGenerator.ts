import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { loadClientsFromDisk, loadDossiersFromDisk } from './diskStorage';

dotenv.config();

export interface GeneratedLandingPage {
  pageId: string;
  clientId: string;
  clientName: string;
  niche: string;
  headline: string;
  subheadline: string;
  htmlCode: string;
  generatedAt: string;
}

const apiKey = process.env.GEMINI_API_KEY;
export const ai = new GoogleGenAI({
  apiKey: apiKey || '',
});

export async function generateAutonomousLandingPage(input: {
  clientId: string;
  clientName?: string;
  niche?: string;
  primaryColor?: string;
  theme?: 'dark_vip' | 'clinical_minimal' | 'tech_growth';
  offerGoal?: string;
}): Promise<GeneratedLandingPage> {
  const clients = loadClientsFromDisk();
  const client = clients.find(c => c.id === input.clientId) || { name: 'Cliente Ativo', niche: 'Saúde & Estética Avançada' };
  
  const dossiers = loadDossiersFromDisk();
  const dossier = dossiers[input.clientId] || null;

  const targetAudience = dossier?.marketOverview?.targetAudience || 'Público de Alta Renda';
  const averageTicket = dossier?.budgetPricingStrategy?.suggestedAverageTicket || 'R$ 15.000,00';
  const corePains = dossier?.audienceInsights?.corePains?.join(', ') || 'Insegurança com resultados e tratamentos genéricos';
  const verbalHooks = dossier?.neuromarketingGuidelines?.verbalHooksFirst3s?.join(', ') || 'A precisão que você merece';

  console.log(`[Landing Page Generator] 🌐 Gerando Landing Page de Alta Conversão para "${client.name}" (${client.niche})...`);

  const systemInstruction = `Você é o Principal Arquiteto de Landing Pages e Engenheiro de Conversão de Neuromarketing da agência.
Sua missão é gerar o CÓDIGO HTML5 COMPLETO E AUTÔNOMO (com CSS3 embutido na tag <style>, tipografia Google Fonts, responsividade mobile-first e formulário de agendamento).

DIRETRIZES DE DESIGN E CONVERSÃO:
1. DESIGN PREMIUM: Cores elegantes (fundo escuro #0B0F19 ou tons refinados, gradientes cyan #00F2FE / esmeralda #00F5A0, tipografia Inter/Outfit).
2. HERO SECTION COM HOOK VISCERAL: Headline magnética nos primeiros 3 segundos de leitura.
3. QUEBRA DE OBJEÇÕES: Comparativo 'Antes vs. Metodologia Proprietária'.
4. PROVA SOCIAL & AUTORIDADE: Avaliações de 5 estrelas e credenciais.
5. FORMULÁRIO DE CAPTURA VIP: Nome, WhatsApp, e-mail e botão de agendamento em destaque.
6. RETORNO: Retorne um documento HTML5 válido e completo (<!DOCTYPE html><html>...</html>).`;

  const prompt = `Gere uma Landing Page completa de Alta Conversão para:
- Cliente: "${client.name}"
- Nicho: "${client.niche}"
- Público Alvo (ICP): "${targetAudience}"
- Ticket Médio: "${averageTicket}"
- Dores a combater: "${corePains}"
- Frases de Impacto: "${verbalHooks}"
- Tema Visual: "${input.theme || 'dark_vip'}"
- Objetivo: "${input.offerGoal || 'Agendamento de Consultas / Avaliações VIP'}"

Retorne o código HTML puro sem markdown adicional.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    let rawHtml = response.text || '';
    rawHtml = rawHtml.replace(/```html/g, '').replace(/```/g, '').trim();

    return {
      pageId: `lp_${Date.now()}`,
      clientId: input.clientId,
      clientName: client.name,
      niche: client.niche,
      headline: `${client.name} - Metodologia Exclusiva em ${client.niche}`,
      subheadline: 'Planejamento cirúrgico e previsibilidade de resultados de alto padrão.',
      htmlCode: rawHtml,
      generatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn('Fallback da Landing Page ativado...');
    const fallbackHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${client.name} | Metodologia de Alta Precisão</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; background-color: #080B11; color: #F1F5F9; line-height: 1.6; }
    .container { max-width: 1140px; margin: 0 auto; padding: 0 24px; }
    
    /* HEADER */
    header { padding: 24px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .nav-wrapper { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #FFF; letter-spacing: -0.5px; }
    .logo span { color: #00F2FE; }
    .btn-header { background: rgba(0,242,254,0.12); color: #00F2FE; border: 1px solid rgba(0,242,254,0.3); padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; }
    .btn-header:hover { background: #00F2FE; color: #080B11; }

    /* HERO SECTION */
    .hero { padding: 90px 0 60px; text-align: center; background: radial-gradient(circle at 50% 10%, rgba(0,242,254,0.12) 0%, transparent 60%); }
    .badge { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,245,160,0.1); border: 1px solid rgba(0,245,160,0.3); color: #00F5A0; padding: 6px 16px; border-radius: 50px; font-size: 12px; font-weight: 700; margin-bottom: 24px; }
    h1 { font-family: 'Outfit', sans-serif; font-size: 48px; font-weight: 800; line-height: 1.15; color: #FFF; margin-bottom: 20px; letter-spacing: -1px; }
    h1 span { background: linear-gradient(135deg, #00F2FE 0%, #00F5A0 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { font-size: 18px; color: #94A3B8; max-width: 680px; margin: 0 auto 36px; }

    /* FORM CARD */
    .form-card { background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; padding: 36px; max-width: 480px; margin: 0 auto; box-shadow: 0 20px 40px rgba(0,0,0,0.5); backdrop-filter: blur(12px); text-align: left; }
    .form-card h3 { font-family: 'Outfit', sans-serif; font-size: 20px; margin-bottom: 6px; color: #FFF; }
    .form-card p { font-size: 13px; color: #94A3B8; margin-bottom: 20px; }
    .input-group { margin-bottom: 14px; }
    .input-group label { display: block; font-size: 12px; color: #CBD5E1; margin-bottom: 6px; font-weight: 600; }
    .input-group input { width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: #FFF; padding: 12px 14px; border-radius: 8px; font-size: 14px; outline: none; }
    .btn-submit { width: 100%; background: linear-gradient(135deg, #00F2FE 0%, #00C6FF 100%); color: #080B11; border: none; padding: 14px; border-radius: 8px; font-weight: 800; font-size: 15px; cursor: pointer; transition: all 0.2s ease; margin-top: 10px; }
    .btn-submit:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,242,254,0.3); }

    /* GRID FEATURES */
    .features { padding: 80px 0; border-top: 1px solid rgba(255,255,255,0.06); }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    .feature-box { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 28px; transition: all 0.2s ease; }
    .feature-box:hover { border-color: rgba(0,242,254,0.3); transform: translateY(-4px); }
    .feature-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(0,242,254,0.1); color: #00F2FE; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 16px; }
    .feature-box h4 { font-family: 'Outfit', sans-serif; font-size: 17px; color: #FFF; margin-bottom: 8px; }
    .feature-box p { font-size: 13px; color: #94A3B8; }

    /* FOOTER */
    footer { padding: 40px 0; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12px; color: #64748B; }

    @media (max-width: 768px) {
      h1 { font-size: 32px; }
      .grid-3 { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container nav-wrapper">
      <div class="logo">${client.name.toUpperCase()} <span>PRO</span></div>
      <a href="#agendamento" class="btn-header">Agendar Avaliação</a>
    </div>
  </header>

  <section class="hero">
    <div class="container">
      <div class="badge"><i class="fa-solid fa-shield-check"></i> Metodologia Certificada em ${client.niche}</div>
      <h1>A Excelência que Você Merece com <span>Precisão Absoluta</span></h1>
      <p class="subtitle">Chega de incertezas e procedimentos genéricos. Conheça o planejamento personalizado e seguro com ${client.name}.</p>

      <div class="form-card" id="agendamento">
        <h3>Solicitar Avaliação VIP</h3>
        <p>Preencha os campos para receber o contato exclusivo de nossa equipe:</p>
        <form onsubmit="alert('Obrigado! Sua solicitação foi recebida com sucesso.'); return false;">
          <div class="input-group">
            <label>Seu Nome Completo *</label>
            <input type="text" placeholder="Ex: Maria Silva" required>
          </div>
          <div class="input-group">
            <label>WhatsApp para Contato *</label>
            <input type="tel" placeholder="(11) 98765-4321" required>
          </div>
          <button type="submit" class="btn-submit">CONFIRMAR AGENDAMENTO EXCLUSIVO →</button>
        </form>
      </div>
    </div>
  </section>

  <section class="features">
    <div class="container">
      <div class="grid-3">
        <div class="feature-box">
          <div class="feature-icon"><i class="fa-solid fa-microchip"></i></div>
          <h4>Tecnologia de Ponta</h4>
          <p>Utilização dos equipamentos e softwares mais avançados para previsibilidade milimétrica.</p>
        </div>
        <div class="feature-box">
          <div class="feature-icon"><i class="fa-solid fa-user-shield"></i></div>
          <h4>Segurança & Conforto</h4>
          <p>Protocolos rigorosos de atendimento com foco na experiência completa e bem-estar do paciente.</p>
        </div>
        <div class="feature-box">
          <div class="feature-icon"><i class="fa-solid fa-gem"></i></div>
          <h4>Exclusividade Total</h4>
          <p>Atendimento individualizado com dedicação integral a cada detalhe do seu objetivo.</p>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <div class="container">
      <p>© ${new Date().getFullYear()} ${client.name}. Todos os direitos reservados. Landing Page otimizada por Oraculum SaaS.</p>
    </div>
  </footer>
</body>
</html>`;

    return {
      pageId: `lp_${Date.now()}`,
      clientId: input.clientId,
      clientName: client.name,
      niche: client.niche,
      headline: `${client.name} - Metodologia Exclusiva`,
      subheadline: 'Planejamento cirúrgico de alta conversão.',
      htmlCode: fallbackHtml,
      generatedAt: new Date().toISOString()
    };
  }
}
