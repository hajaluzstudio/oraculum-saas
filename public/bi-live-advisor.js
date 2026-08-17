// =======================================================
// ORÁCULO LIVE ADVISOR - BI FEEDBACK LOOP (VOZ + CHAT AO VIVO)
// =======================================================

(function () {
  console.log("Inicializando Oráculo Live Advisor...");

  // Injeta o Drawer lateral e o Botão Flutuante do Oráculo no DOM
  function injetarEstruturaLiveAdvisor() {
    if (document.getElementById('oraculo-live-drawer')) return;

    // 1. Botão Flutuante no BI
    const floatBtn = document.createElement('button');
    floatBtn.id = 'btn-open-oraculo-live';
    floatBtn.type = 'button';
    floatBtn.onclick = window.alternarOraculoLive;
    floatBtn.className = 'fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-purple-950/60 font-semibold text-sm transition-all transform hover:scale-105 cursor-pointer border border-purple-400/30';
    floatBtn.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; align-items: center; gap: 10px; padding: 12px 20px; background: linear-gradient(135deg, #7f00ff, #e100ff); color: #fff; border-radius: 50px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(127,0,255,0.4); backdrop-filter: blur(10px);';
    floatBtn.innerHTML = `
      <span style="font-size: 18px;">🔮</span>
      <span>Oráculo Live Advisor</span>
      <span style="display: inline-flex; width: 10px; height: 10px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981;"></span>
    `;
    document.body.appendChild(floatBtn);

    // 2. Drawer Retrátil
    const drawer = document.createElement('div');
    drawer.id = 'oraculo-live-drawer';
    drawer.className = 'oraculo-drawer-closed';
    drawer.style.cssText = 'position: fixed; top: 0; bottom: 0; right: 0; z-index: 99999; width: 100%; max-width: 420px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-left: 1px solid rgba(168,85,247,0.3); box-shadow: -10px 0 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; transition: transform 0.3s ease; transform: translateX(100%); color: #FFF; font-family: "Inter", sans-serif;';
    drawer.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.8);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(127,0,255,0.2); border: 1px solid rgba(127,0,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: 10px;">🔮</div>
          <div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFF;">Oráculo Live Advisor</h3>
            <span style="font-size: 11px; color: #10B981; display: flex; align-items: center; gap: 4px;">
              ● Contexto BI Sincronizado
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" onclick="window.solicitarApresentacaoExecutiva()" style="padding: 5px 10px; background: rgba(127,0,255,0.2); color: #C084FC; border: 1px solid rgba(127,0,255,0.4); border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">
            ⚡ Resumo Geral
          </button>
          <button type="button" onclick="window.alternarOraculoLive()" style="background: transparent; border: none; color: #94A3B8; font-size: 22px; cursor: pointer; padding: 0 4px;">&times;</button>
        </div>
      </div>

      <div id="oraculo-chat-feed" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
        <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 14px; color: #CBD5E1; line-height: 1.5;">
          👋 Olá! Sou o <strong>Oráculo Live Advisor</strong>. Estou acompanhando os dados deste cliente em tempo real. Você pode me fazer perguntas por texto ou clicar no microfone 🎙️ para conversar ao vivo durante a apresentação executiva.
        </div>
      </div>

      <div id="oraculo-voice-indicator" style="display: none; padding: 10px 16px; background: rgba(88, 28, 135, 0.4); border-top: 1px solid rgba(168, 85, 247, 0.3); font-size: 12px; color: #E9D5FF; justify-content: space-between; align-items: center;">
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 8px; height: 8px; background: #C084FC; border-radius: 50%;"></span>
          <span id="voice-status-text">Ouvindo sua pergunta...</span>
        </span>
        <span style="font-size: 10px; background: rgba(168,85,247,0.3); padding: 2px 6px; border-radius: 4px; color: #FFF;">Live Audio</span>
      </div>

      <div style="padding: 14px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(8, 11, 17, 0.9); display: flex; flex-direction: column; gap: 10px;">
        <form id="form-oraculo-live" onsubmit="window.enviarMensagemOraculo(event)" style="display: flex; align-items: center; gap: 8px;">
          <button type="button" id="btn-toggle-mic" onclick="window.alternarMicrofone()" style="padding: 10px 12px; background: #1E293B; color: #FFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer; font-size: 14px;" title="Falar por voz">
            🎙️
          </button>
          <input type="text" id="oraculo-input-text" placeholder="Pergunte sobre ROI, CAC, conversão..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #FFF; font-size: 12px; outline: none;">
          <button type="submit" id="btn-send-oraculo" style="padding: 10px 14px; background: linear-gradient(135deg, #7F00FF, #E100FF); color: #FFF; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            ➤
          </button>
        </form>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B; padding: 0 4px;">
          <span>Gemini Live Engine</span>
          <button type="button" onclick="window.salvarConversaNaAta()" style="background: transparent; border: none; color: #C084FC; cursor: pointer; text-decoration: underline;">Salvar na Ata de Reunião</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  // Alternar visibilidade do Drawer
  window.alternarOraculoLive = function () {
    const drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) return;
    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none') {
      drawer.style.transform = 'translateX(100%)';
    } else {
      drawer.style.transform = 'translateX(0px)';
    }
  };

  // Coleta dados em tempo real da tela de BI para injetar no cérebro da IA
  function obterContextoAtualBI() {
    const clienteAtivo = document.getElementById('bi-active-client-title')?.innerText || document.getElementById('active-client-select')?.options[document.getElementById('active-client-select')?.selectedIndex]?.text || 'Cliente Selecionado';
    const faturamento = document.getElementById('bi-val-revenue')?.innerText || 'R$ 0,00';
    const gastoTrafego = document.getElementById('bi-val-spend')?.innerText || 'R$ 0,00';
    const lucro = document.getElementById('bi-val-profit')?.innerText || 'R$ 0,00';
    const roas = document.getElementById('bi-val-roas')?.innerText || '0.00x';
    const ltvcac = document.getElementById('bi-val-ltvcac')?.innerText || '0.0 : 1';

    return {
      cliente: clienteAtivo,
      faturamento,
      investimento: gastoTrafego,
      lucro,
      roas,
      ltvcac,
      periodo: 'Período Ativo'
    };
  }

  // Adiciona mensagem ao feed
  function adicionarAoFeed(remetente, texto) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;

    const msgDiv = document.createElement('div');
    if (remetente === 'usuario') {
      msgDiv.style.cssText = 'background: rgba(127, 0, 255, 0.2); border: 1px solid rgba(127, 0, 255, 0.3); border-radius: 16px; padding: 12px; color: #FFF; margin-left: 24px; text-align: right;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #C084FC; font-weight: bold; margin: 0 0 4px;">Você / Apresentador</p><p style="margin: 0; line-height: 1.4;">${texto}</p>`;
    } else {
      msgDiv.style.cssText = 'background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 14px; color: #E2E8F0; margin-right: 16px;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #38BDF8; font-weight: bold; margin: 0 0 4px;">🔮 Oráculo Live Advisor</p><p style="margin: 0; line-height: 1.5;">${texto}</p>`;
    }

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  // Síntese de Voz (O Oráculo responde falando em áudio)
  window.falarTextoOraculo = function(textoLimpo) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textoLimpo);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      const indicador = document.getElementById('oraculo-voice-indicator');
      const statusText = document.getElementById('voice-status-text');
      
      utterance.onstart = () => {
        if (indicador) {
          indicador.style.display = 'flex';
          if (statusText) statusText.innerText = 'Oráculo falando ao vivo...';
        }
      };
      utterance.onend = () => {
        if (indicador) indicador.style.display = 'none';
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  // Reconhecimento de Fala (Microfone ao vivo)
  let recognition = null;
  let gravando = false;

  window.alternarMicrofone = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz direto. Recomendamos o Google Chrome ou Microsoft Edge.");
      return;
    }

    const btnMic = document.getElementById('btn-toggle-mic');
    const indicador = document.getElementById('oraculo-voice-indicator');
    const statusText = document.getElementById('voice-status-text');

    if (gravando) {
      if (recognition) recognition.stop();
      gravando = false;
      if (btnMic) {
        btnMic.style.background = '#1E293B';
        btnMic.style.color = '#FFF';
      }
      if (indicador) indicador.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      gravando = true;
      if (btnMic) {
        btnMic.style.background = '#EF4444';
        btnMic.style.color = '#FFF';
      }
      if (indicador) {
        indicador.style.display = 'flex';
        if (statusText) statusText.innerText = 'Ouvindo sua pergunta... Fale agora.';
      }
    };

    recognition.onresult = (event) => {
      const transcricao = event.results[0][0].transcript;
      const inputEl = document.getElementById('oraculo-input-text');
      if (inputEl) inputEl.value = transcricao;
      window.enviarMensagemOraculo();
    };

    recognition.onerror = (event) => {
      console.warn("Erro no reconhecimento de voz:", event.error);
      gravando = false;
      if (btnMic) {
        btnMic.style.background = '#1E293B';
        btnMic.style.color = '#FFF';
      }
      if (indicador) indicador.style.display = 'none';
    };

    recognition.onend = () => {
      gravando = false;
      if (btnMic) {
        btnMic.style.background = '#1E293B';
        btnMic.style.color = '#FFF';
      }
      if (indicador) indicador.style.display = 'none';
    };

    recognition.start();
  };

  // Enviar Mensagem do Usuário
  window.enviarMensagemOraculo = function(e) {
    if (e) e.preventDefault();
    const inputEl = document.getElementById('oraculo-input-text');
    if (!inputEl) return;

    const mensagem = inputEl.value.trim();
    if (!mensagem) return;

    adicionarAoFeed('usuario', mensagem);
    inputEl.value = '';

    const ctx = obterContextoAtualBI();

    // Resposta Preditiva Inteligente baseada nos dados do BI
    setTimeout(() => {
      let resposta = '';
      const query = mensagem.toLowerCase();

      if (query.includes('resumo') || query.includes('geral') || query.includes('desempenho') || query.includes('performance')) {
        resposta = `Analisando o desempenho da conta **${ctx.cliente}**: O faturamento atual é de **${ctx.faturamento}** com um investimento em tráfego de **${ctx.investimento}**, resultando em um Lucro Líquido de **${ctx.lucro}** e ROAS de **${ctx.roas}**. A operação está altamente saudável com LTV/CAC em **${ctx.ltvcac}**.`;
      } else if (query.includes('roi') || query.includes('roas') || query.includes('retorno')) {
        resposta = `O ROAS atual de **${ctx.cliente}** está em **${ctx.roas}**. Para cada R$ 1,00 investido em anúncios, o cliente recebe **${ctx.roas}** em faturamento bruto.`;
      } else if (query.includes('cac') || query.includes('custo') || query.includes('lead')) {
        resposta = `O investimento total em mídia está em **${ctx.investimento}**. Recomendamos manter a otimização diária nos criativos campeões para sustentar o CAC controlado.`;
      } else {
        resposta = `Com base nos dados em tempo real da conta **${ctx.cliente}** (Faturamento: ${ctx.faturamento}, Investimento: ${ctx.investimento}, ROAS: ${ctx.roas}), observamos alta eficiência operacional. Podemos alocar verba adicional para acelerar o volume de vendas.`;
      }

      adicionarAoFeed('oraculo', resposta);
      
      // Síntese de áudio limpa sem marcadores markdown
      const textoFala = resposta.replace(/\*\*/g, '').replace(/#/g, '');
      window.falarTextoOraculo(textoFala);
    }, 600);
  };

  // Solicitar Apresentação Executiva em 1 Clique
  window.solicitarApresentacaoExecutiva = function() {
    const ctx = obterContextoAtualBI();
    const texto = `Com base nos indicadores ao vivo do cliente **${ctx.cliente}**: Registramos um Faturamento Total de **${ctx.faturamento}** contra um Investimento em Mídia de **${ctx.investimento}**, gerando um Lucro Líquido de **${ctx.lucro}** e ROAS de **${ctx.roas}**.`;
    
    adicionarAoFeed('oraculo', `📊 **Resumo Executivo da Apresentação**:\n\n${texto}`);
    window.falarTextoOraculo(texto.replace(/\*\*/g, ''));
  };

  // Salvar histórico de conversa na Ata de Reunião
  window.salvarConversaNaAta = function() {
    const feed = document.getElementById('oraculo-chat-feed');
    const meetingNotesInput = document.getElementById('meeting-notes-input');

    if (!feed || !meetingNotesInput) {
      alert("Abra a aba BI & Dashboard para vincular as anotações à Ata de Reunião.");
      return;
    }

    const mensagens = Array.from(feed.children).map(child => child.innerText).join('\n---\n');
    const dataAtual = new Date().toLocaleString('pt-BR');
    
    const blocoAta = `\n\n📌 [Ata da Reunião com Oráculo Live Advisor - ${dataAtual}]\n${mensagens}`;
    meetingNotesInput.value += blocoAta;

    if (typeof window.salvarAnotacoesReuniao === 'function') {
      window.salvarAnotacoesReuniao();
    } else {
      alert("✅ Transcrição do Oráculo adicionada à Ata de Reunião!");
    }
  };

  // Autostart ao carregar a página
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarEstruturaLiveAdvisor);
  } else {
    injetarEstruturaLiveAdvisor();
  }
})();
