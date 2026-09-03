# 🏛️ ORACULUM SaaS — Contexto Geral da Arquitetura & Diretrizes

## 🎯 Propósito do Sistema
O **Oraculum** é um SaaS de Marketing Híbrido baseado no princípio **ROI-First (Retorno sobre Investimento em primeiro lugar)**. Ele atua como um consultor autônomo (Orcáculo) especializado em inteligência estratégica, neuromarketing, neuroeconomia e governança de tráfego para agências e marcas VIP. O sistema opera de forma isolada por tenant/cliente, gerando dossiês preditivos, briefs detalhados de criativos, gestão financeira (LTV/CAC) e análise preditiva de performance.

---

## 🏗️ Stack Tecnológica & Infraestrutura
* **Backend / API:** Node.js com Express estruturado como **Vercel Serverless Functions** (pasta `api/`).
* **Frontend:** Vanilla JavaScript otimizado, HTML5, Tailwind CSS/Custom UI, Chart.js (responsivo e fluido para qualquer monitor).
* **Banco de Dados & Memória:** Supabase (PostgreSQL com suporte a Vetores/RAG) e salvamento temporário otimizado para `/tmp` em nuvem.
* **Inteligência Artificial:** Google GenAI SDK (`@google/genai`) utilizando o modelo `gemini-2.5-flash`.

---

## 📂 Estrutura Crítica de Pastas e Arquivos
* `/api/` — Contém todas as Serverless Functions da Vercel:
  * `api/index.ts` — Ponto de entrada / roteador central.
  * `api/chat.ts` — Chat Estratégico com memória contextual por cliente e regras absolutas.
  * `api/onboarding.ts` — Geração autônoma do Dossiê Estratégico via IA.
  * `api/clients.ts` — Gerenciamento e isolamento de tenants (clientes).
  * `api/workflow.ts` — Gestão da esteira Kanban e cards criativos.
  * `api/bi.ts` — Rastreador financeiro, feedback loop de ROI e otimizador de orçamento.
  * `api/creatives.ts` — AI Creative Scoring e injeção de metadados EXIF/GEO.
* `/public/` — Arquivos do front-end (`index.html`, `app.js`, estilos).
* `/src/services/` — Camada de serviços internos e lógica de IA.

---

## ⚡ Regras Absolutas de Negócio & Comportamento da IA
1. **Isolamento por Cliente (Tenant):** Nenhuma resposta ou dado de estratégia de um cliente pode se misturar com outro. O Oráculo carrega estritamente o Dossiê Estratégico do cliente ativo.
2. **Respostas Estruturadas Modulares:** Quando solicitado a criar peças (cards, carrosséis, vídeos), a IA **nunca** deve dar respostas em bloco genérico. Ela deve obrigatoriamente desmembrar em tópicos numerados (*Card 1, Card 2, Card 3, Card 4*), contendo:
   * Título e Objetivo Tático.
   * Elementos Visuais Exatos (com Hook de 3s).
   * Copy Completa (Headline visceral + Corpo).
   * Metadados Técnicos de Certidão de Nascimento.
3. **Foco Financeiro (ROI-First):** Toda estratégia visa manter a relação LTV/CAC acima de $3:1$, focando em conversão de leads qualificados e exclusividade (luxo/autoridade).

---

## 🚀 Padrões de Código para Manutenção
* Manter caminhos relativos limpos e compatíveis com Serverless (`/api/`).
* Priorizar layouts responsivos fluidos (`grid` e `flexbox` com quebra automática) para suportar qualquer resolução de monitor (de notebooks a ultrawides).
* Não injetar credenciais no código; utilizar sempre variáveis de ambiente (`GEMINI_API_KEY`, `SUPABASE_URL`, etc.).