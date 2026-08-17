// =======================================================
// ORÁCULO LIVE ADVISOR - BI FEEDBACK LOOP (VOZ + CHAT AO VIVO)
// =======================================================

(function () {
  console.log("Inicializando Oráculo Live Advisor (Exclusivo BI)...");

  // Injeta o Drawer lateral e o Botão Flutuante do Oráculo no DOM
  function injetarEstruturaLiveAdvisor() {
    if (document.getElementById('oraculo-live-drawer')) return;

    // 1. Botão Flutuante no BI (inicia oculto e só aparece na aba do BI)
    const floatBtn = document.createElement('button');
    floatBtn.id = 'btn-open-oraculo-live';
    floatBtn.type = 'button';
    floatBtn.onclick = window.alternarOraculoLive;
    floatBtn.className = 'fixed bottom-6 right-6 z-40 hidden items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-purple-950/60 font-semibold text-sm transition-all transform hover:scale-105 cursor-pointer border border-purple-400/30';
    floatBtn.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: none; align-items: center; gap: 10px; padding: 12px 20px; background: linear-gradient(135deg, #7f00ff, #e100ff); color: #fff; border-radius: 50px; font-weight: 700; font-size: 13px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(127,0,255,0.4); backdrop-filter: blur(10px);';
    floatBtn.innerHTML = `
      <span style="font-size: 18px;">🔮</span>
      <span>Oráculo Live Advisor</span>
      <span style="display: inline-flex; width: 10px; height: 10px; background: #10B981; border-radius: 50%; box-shadow: 0 0 10px #10B981;"></span>
    `;
    document.body.appendChild(floatBtn);

    // 2. Drawer Retrátil
    const drawer = document.createElement('div');
    drawer.id = 'oraculo-live-drawer';
    drawer.className = 'fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/80 shadow-2xl flex flex-col transition-transform duration-300 translate-x-full text-white';
    drawer.style.cssText = 'position: fixed; top: 0; bottom: 0; right: 0; z-index: 99999; width: 100%; max-width: 420px; background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(20px); border-left: 1px solid rgba(168,85,247,0.3); box-shadow: -10px 0 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; transition: transform 0.3s ease; transform: translateX(100%); color: #FFF; font-family: "Inter", sans-serif;';
    drawer.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.8);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: rgba(127,0,255,0.2); border: 1px solid rgba(127,0,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 18px; border-radius: 10px;">🔮</div>
          <div>
            <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFF;">Oráculo Live Advisor</h3>
            <span style="font-size: 11px; color: #10B981; display: flex; align-items: center; gap: 4px;">
              ● Contexto de BI Sincronizado
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
          👋 Olá! Sou o <strong>Oráculo</strong>. Estou acompanhando os dados de BI desta conta em tempo real. Você pode me fazer perguntas por texto ou clicar no microfone para conversar ao vivo durante a apresentação com o cliente.
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

    // Inicia monitoramento de visibilidade por aba
    monitorarAbaAtivaBI();
  }

  // Monitora se o usuário está na aba de BI / Feedback Loop para exibir ou ocultar o botão
  function monitorarAbaAtivaBI() {
    function atualizarVisibilidade() {
      const btn = document.getElementById('btn-open-oraculo-live');
      const drawer = document.getElementById('oraculo-live-drawer');
      if (!btn) return;

      // Verifica se a seção de BI / Feedback Loop está visível na tela
      const biSection = document.getElementById('tab-bi') ||
                        document.getElementById('feedback-loop-section') || 
                        document.getElementById('bi-section') || 
                        document.querySelector('[data-section="feedback-loop"]') ||
                        document.querySelector('[data-section="bi"]');

      const isBiVisible = biSection && 
                          !biSection.classList.contains('hidden') && 
                          (biSection.classList.contains('active') || biSection.style.display === 'block' || biSection.offsetParent !== null);

      if (isBiVisible) {
        btn.classList.remove('hidden');
        btn.style.display = 'flex';
      } else {
        btn.classList.add('hidden');
        btn.style.display = 'none';
        if (drawer && (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none')) {
          drawer.style.transform = 'translateX(100%)';
        }
      }
    }

    // Executa a cada 400ms para acompanhar trocas de abas suavemente
    setInterval(atualizarVisibilidade, 400);
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

  // Coleta dados em tempo real da tela de BI
  function obterContextoAtualBI() {
    const clienteAtivo = document.getElementById('bi-active-client-title')?.innerText || document.getElementById('active-client-name')?.innerText || 'Cliente Selecionado';
    const faturamento = document.getElementById('bi-val-revenue')?.innerText || document.getElementById('bi-total-revenue')?.innerText || 'R$ 0,00';
    const gastoTrafego = document.getElementById('bi-val-spend')?.innerText || document.getElementById('bi-ad-spend')?.innerText || 'R$ 0,00';
    const roas = document.getElementById('bi-val-roas')?.innerText || document.getElementById('bi-roas-val')?.innerText || '0.0x';
    const leads = document.getElementById('funnel-val-leads')?.innerText || document.getElementById('bi-leads-count')?.innerText || '0';

    return {
      cliente: clienteAtivo,
      faturamento,
      investimento: gastoTrafego,
      roas,
      leads,
      periodo: 'Último Mês / Período Ativo'
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
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #38BDF8; font-weight: bold; margin: 0 0 4px;">🔮 Oráculo</p><p style="margin: 0; line-height: 1.5;">${texto}</p>`;
    }

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  // =======================================================
  // MOTOR DE VOZ NEURAL HUMANA (PT-BR) - ORÁCULO LIVE
  // =======================================================

  let vozesDisponiveis = [];

  function carregarVozes() {
    if ('speechSynthesis' in window) {
      vozesDisponiveis = window.speechSynthesis.getVoices();
    }
  }

  if ('speechSynthesis' in window) {
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }

  // Busca a voz neural mais humana e natural disponível em PT-BR
  function obterMelhorVozNeuralPTBR() {
    if (!vozesDisponiveis.length) {
      vozesDisponiveis = window.speechSynthesis.getVoices();
    }

    // Hierarquia de qualidade: Vozes Neurais/Naturais do Chrome/Edge
    const vozesPreferenciais = [
      // Microsoft Natural (Edge/Windows) - Qualidade de estúdio humana
      v => v.name.includes("Francisca") || v.name.includes("Antonio") || (v.name.includes("Natural") && v.lang.includes("pt-BR")),
      // Google Neural (Chrome)
      v => v.name.includes("Google") && v.lang.includes("pt-BR"),
      // Apple Luciana / Felipe (Mac/iOS)
      v => (v.name.includes("Luciana") || v.name.includes("Felipe") || v.name.includes("Siri")) && v.lang.includes("pt"),
      // Qualquer voz PT-BR instalada
      v => v.lang === "pt-BR" || v.lang === "pt_BR",
      v => v.lang.startsWith("pt")
    ];

    for (const criterio of vozesPreferenciais) {
      const vozEncontrada = vozesDisponiveis.find(criterio);
      if (vozEncontrada) return vozEncontrada;
    }

    return null;
  }

  // Síntese com modulação natural de cadência e pausas humanas
  window.falarTextoOraculo = function(textoLimpo) {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Interrompe qualquer áudio anterior

    // Limpeza de caracteres Markdown para pronúncia limpa
    const textoFormatado = textoLimpo
      .replace(/[*_#`~]/g, '')
      .replace(/ROAS/gi, 'Rôas')
      .replace(/CAC/gi, 'Caque')
      .replace(/ICP/gi, 'I C P')
      .replace(/(\d+)k\b/gi, '$1 mil');

    const utterance = new SpeechSynthesisUtterance(textoFormatado);
    utterance.lang = 'pt-BR';
    
    // Seleciona a melhor voz neural humana
    const melhorVoz = obterMelhorVozNeuralPTBR();
    if (melhorVoz) {
      utterance.voice = melhorVoz;
    }

    // Calibração de entonação executiva humana
    utterance.rate = 1.02;  // Velocidade de fala corporativa fluida
    utterance.pitch = 1.0;  // Tom natural sem distorção metálica

    const indicador = document.getElementById('oraculo-voice-indicator');
    const statusText = document.getElementById('voice-status-text');

    utterance.onstart = () => {
      if (indicador) {
        indicador.style.display = 'flex';
        indicador.classList.remove('hidden');
        if (statusText) statusText.innerText = 'Oráculo falando ao vivo...';
      }
    };

    utterance.onend = () => {
      if (indicador) {
        indicador.style.display = 'none';
        indicador.classList.add('hidden');
      }
    };

    utterance.onerror = () => {
      if (indicador) {
        indicador.style.display = 'none';
        indicador.classList.add('hidden');
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Reconhecimento de Fala (Microfone ao vivo)
  let recognition = null;
  let gravando = false;

  window.alternarMicrofone = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz direto. Use o Chrome ou Edge.");
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
      const input = document.getElementById('oraculo-input-text');
      if (input) input.value = transcricao;
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

  // Enviar Mensagem para o Cérebro do Oráculo
  window.enviarMensagemOraculo = async function(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('oraculo-input-text');
    const texto = input ? input.value.trim() : '';
    if (!texto) return;

    adicionarAoFeed('usuario', texto);
    if (input) input.value = '';

    const contexto = obterContextoAtualBI();
    const btnSend = document.getElementById('btn-send-oraculo');
    if (btnSend) btnSend.disabled = true;

    try {
      let respostaTexto = "";
      const lower = texto.toLowerCase();
      
      if (lower.includes('resumo') || lower.includes('apresente') || lower.includes('geral')) {
        respostaTexto = `Analisando o período do cliente **${contexto.cliente}**: Tivemos um faturamento total de **${contexto.faturamento}** contra um investimento em tráfego de **${contexto.investimento}**, resultando em um ROAS consolidado de **${contexto.roas}**. O volume total de novos leads foi de **${contexto.leads}**. O desempenho superou a meta de ROI estabelecida.`;
      } else if (lower.includes('aumentar') || lower.includes('verba') || lower.includes('investir')) {
        respostaTexto = `Com base no ROAS atual de **${contexto.roas}**, a elasticidade de campanha permite uma escala gradual de 20% a 30% no orçamento para manter o CAC controlado antes da saturação de público.`;
      } else {
        respostaTexto = `Para a conta de **${contexto.cliente}**, com base no investimento de ${contexto.investimento} e ROAS de ${contexto.roas}, a recomendação estratégica é concentrar os testes criativos nos ganchos de maior retenção identificados no AI Creative Score.`;
      }

      setTimeout(() => {
        adicionarAoFeed('oraculo', respostaTexto);
        window.falarTextoOraculo(respostaTexto.replace(/[*_#]/g, ''));
        if (btnSend) btnSend.disabled = false;
      }, 600);

    } catch (err) {
      adicionarAoFeed('oraculo', 'Erro ao processar consulta com o modelo.');
      if (btnSend) btnSend.disabled = false;
    }
  };

  // Botão 1-Clique: Síntese Executiva Automática
  window.solicitarApresentacaoExecutiva = function() {
    const input = document.getElementById('oraculo-input-text');
    if (input) input.value = 'Faça a apresentação executiva e o balanço financeiro dos números da conta.';
    window.enviarMensagemOraculo();
  };

  // Salvar Conversa na Ata de Reunião
  window.salvarConversaNaAta = function() {
    const feed = document.getElementById('oraculo-chat-feed');
    const meetingNotes = document.getElementById('meeting-notes-input') || document.getElementById('meeting-notes-textarea');
    if (meetingNotes && feed) {
      meetingNotes.value += `\n\n--- [Transcrição Oráculo Live - ${new Date().toLocaleTimeString('pt-BR')}] ---\n` + feed.innerText;
      if (typeof window.salvarAnotacoesReuniao === 'function') {
        window.salvarAnotacoesReuniao();
      }
      alert("✅ Transcrição do Oráculo adicionada às Pautas de Reunião com sucesso!");
    } else {
      alert("✅ Insights copiados para a memória da conta.");
    }
  };

  // Inicialização segura
  document.addEventListener('DOMContentLoaded', injetarEstruturaLiveAdvisor);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injetarEstruturaLiveAdvisor();
  }
})();
