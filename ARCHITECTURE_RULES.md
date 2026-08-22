# DIRETIVA MESTRE DE SEGURANÇA E ISOLAMENTO DE ESCOPO (ARCHITECTURE LOCK)

## 1. PRINCÍPIO DO ESCOPO CIRÚRGICO ESTREITO:
- A IDE está TERMINANTEMENTE PROIBIDA de editar, refatorar ou reescrever arquivos, funções ou abas que não tenham sido explicitamente mencionadas na solicitação do usuário.
- NUNCA reescrever arquivos inteiros (`app.js`, `index.html`, etc.). Apenas edições locais/cirúrgicas nas funções solicitadas são permitidas.

## 2. PROTOCOLO DE CONVERSA ENTRE ABAS (CROSS-MODULE COMMUNICATION):
- Quando duas abas precisarem se comunicar (ex: Despacho do Chat criando cards no Kanban ou Kanban abrindo gavetas na Sala de Operação):
  * A comunicação DEVE ocorrer exclusivamente por Eventos Customizados desacoplados (`window.dispatchEvent(new CustomEvent(...))`) ou por leitura/gravação na Store Central (`window.OraculumState`).
  * É PROIBIDO que um módulo altere variáveis internas privadas de outro módulo diretamente.

## 3. BLINDAGEM DO NÚCLEO DE AUTENTICAÇÃO E ROTEAMENTO:
- Os blocos de inicialização síncrona do Supabase no `<head>` de `index.html` e a função de Login em `app.js` estão TRAVADOS. Nenhuma alteração nesses blocos é permitida sem autorização expressa em prompt dedicado.
- As funções globais de seleção de cliente (`window.currentClientId`) e roteamento básico de telas (`switchView`) não podem ter suas assinaturas alteradas.

## 4. CHECKLIST DE PRÉ-COMMIT OBRIGATÓRIO:
- Antes de cada commit, a IDE deve verificar se arquivos fora do escopo foram alterados via `git diff --stat`. Se houver alteração indevida, descarte-a com `git checkout` antes do commit.
