// =======================================================
// Oraculum Live - BI FEEDBACK LOOP (100% SUPABASE & FIX BOTÃO)
// =======================================================

(function () {
  console.log("Inicializando Oraculum Live Definitivo (Supabase Core)...");

  let isProcessando = false;
  let gravando = false;
  let recognition = null;
  let vozesNavegador = [];

  function carregarVozes() {
    if ('speechSynthesis' in window) {
      vozesNavegador = window.speechSynthesis.getVoices();
    }
  }
  if ('speechSynthesis' in window) {
    carregarVozes();
    window.speechSynthesis.onvoiceschanged = carregarVozes;
  }

  function injetarEstruturaLiveAdvisor() {
    // 1. Criação do Botão Flutuante Direto no BODY (z-index máximo)
    let floatBtn = document.getElementById('btn-open-oraculo-live');
    if (!floatBtn) {
      floatBtn = document.createElement('button');
      floatBtn.id = 'btn-open-oraculo-live';
      floatBtn.type = 'button';
      floatBtn.onclick = function(e) {
        e.preventDefault();
        window.alternarOraculoLive();
      };
      floatBtn.style.cssText = 'position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 999999 !important; display: flex !important; align-items: center !important; gap: 10px !important; padding: 12px 22px !important; background: #10B981 !important; color: #020705 !important; border-radius: 50px !important; font-weight: 800 !important; font-size: 13px !important; cursor: pointer !important; border: 1px solid rgba(255,255,255,0.4) !important; box-shadow: 0 10px 30px rgba(16,185,129,0.6) !important; backdrop-filter: blur(10px) !important;';
      floatBtn.innerHTML = `
        <span style="font-size: 16px;">🤖</span>
        <span>Oraculum Live</span>
      `;
      document.body.appendChild(floatBtn);
    }

    // 2. Criação do Drawer Lateral Direto no BODY
    let drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'oraculo-live-drawer';
      drawer.style.cssText = 'position: fixed !important; top: 0 !important; bottom: 0 !important; right: 0 !important; z-index: 999999 !important; width: 100% !important; max-width: 420px !important; background: rgba(15, 23, 42, 0.98) !important; backdrop-filter: blur(25px) !important; border-left: 1px solid rgba(16,185,129,0.3) !important; box-shadow: -10px 0 40px rgba(0,0,0,0.8) !important; display: flex !important; flex-direction: column !important; transition: transform 0.3s ease !important; transform: translateX(100%) !important; color: #FFF !important; font-family: sans-serif !important;';
      drawer.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.8);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; background: rgba(16,185,129,0.2); border: 1px solid rgba(16,185,129,0.4); display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 16px;">🤖</div>
            <div>
              <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #FFF;">Oraculum Live</h3>
              <span style="font-size: 11px; color: #10B981; display: flex; align-items: center; gap: 4px;">
                ● Contexto de BI Ativo
              </span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" onclick="window.solicitarApresentacaoExecutiva()" style="padding: 5px 10px; background: rgba(16,185,129,0.2); color: #34D399; border: 1px solid rgba(16,185,129,0.4); border-radius: 8px; font-size: 11px; cursor: pointer; font-weight: 600;">
              ⚡ Resumo Geral
            </button>
            <button type="button" onclick="window.alternarOraculoLive()" style="background: transparent; border: none; color: #94A3B8; font-size: 24px; cursor: pointer; padding: 0 6px;">&times;</button>
          </div>
        </div>

        <div id="oraculo-chat-feed" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
          <div style="background: rgba(30, 41, 59, 0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; color: #CBD5E1; line-height: 1.5;">
            👋 Olá! Sou o <strong>Oraculum</strong>. Estou acompanhando os dados de BI desta conta em tempo real. Faça perguntas por texto ou use o microfone para conversar ao vivo.
          </div>
        </div>

        <div id="oraculo-voice-indicator" style="display: none; padding: 10px 16px; background: rgba(2, 44, 34, 0.4); border-top: 1px solid rgba(16, 185, 129, 0.3); font-size: 12px; color: #E9D5FF; justify-content: space-between; align-items: center;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 8px; height: 8px; background: #34D399; border-radius: 50%;"></span>
            <span id="voice-status-text">Ouvindo sua pergunta...</span>
          </span>
          <span style="font-size: 10px; background: rgba(16,185,129,0.3); padding: 2px 6px; border-radius: 4px; color: #FFF;">Live Audio</span>
        </div>

        <div style="padding: 14px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(8, 11, 17, 0.9); display: flex; flex-direction: column; gap: 10px;">
          <form id="form-oraculo-live" onsubmit="window.enviarMensagemOraculo(event)" style="display: flex; align-items: center; gap: 8px;">
            <button type="button" id="btn-toggle-mic" onclick="window.alternarMicrofone()" style="padding: 10px 12px; background: #1E293B; color: #FFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer; font-size: 14px;" title="Falar por voz">
              🎙️
            </button>
            <input type="text" id="oraculo-input-text" placeholder="Pergunte sobre ROI, CAC, conversão, ROAS..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #FFF; font-size: 12px; outline: none;">
            <button type="submit" id="btn-send-oraculo" style="padding: 10px 14px; background: #10B981; color: #0f172a; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
              ➤
            </button>
          </form>
        </div>
      `;
      document.body.appendChild(drawer);
    }
  }

  window.alternarOraculoLive = function () {
    const drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) return;
    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none') {
      drawer.style.transform = 'translateX(100%)';
    } else {
      drawer.style.transform = 'translateX(0px)';
      const activeClientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id');
      if (activeClientId) {
        window.renderizarHistoricoNoFeed(activeClientId);
      }
    }
  };

  function extrairContextoCompletoBI() {
    try {
      return {
        cliente: window.currentClientName || document.getElementById('bi-active-client-title')?.innerText || 'Cliente Ativo',
        faturamento: document.getElementById('bi-val-revenue')?.innerText || 'R$ 0,00',
        gastoTrafego: document.getElementById('bi-val-spend')?.innerText || 'R$ 0,00',
        roas: document.getElementById('bi-val-roas')?.innerText || '0.0x',
        leads: document.getElementById('funnel-val-leads')?.innerText || '0'
      };
    } catch(e) {
      return { cliente: 'Cliente Ativo', faturamento: 'R$ 0,00', gastoTrafego: 'R$ 0,00', roas: '0.0x', leads: '0' };
    }
  }

  function formatarMarkdown(texto) {
    if (!texto) return '';
    return texto
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*[\-\*]\s+/gm, '• ')
      .replace(/\n/g, '<br>');
  }

  function adicionarAoFeed(remetente, respostaData) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;

    const msgDiv = document.createElement('div');
    if (remetente === 'usuario') {
      const textoFormatado = formatarMarkdown(typeof respostaData === 'string' ? respostaData : (respostaData?.replyText || ''));
      msgDiv.style.cssText = 'background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px; color: #FFF; margin-left: 24px; text-align: right;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #34D399; font-weight: bold; margin: 0 0 4px;">Você</p><p style="margin: 0; line-height: 1.4;">${textoFormatado}</p>`;
    } else if (remetente === 'erro') {
      const textoFormatado = formatarMarkdown(typeof respostaData === 'string' ? respostaData : 'Erro ao processar requisição');
      msgDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 14px; padding: 12px; color: #FCA5A5; margin-right: 16px;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #F87171; font-weight: bold; margin: 0 0 4px;">❌ Erro</p><p style="margin: 0;">${textoFormatado}</p>`;
    } else {
      const textContent = typeof respostaData === 'string' ? respostaData : (respostaData?.replyText || JSON.stringify(respostaData));
      const textoFormatado = formatarMarkdown(textContent);
      msgDiv.style.cssText = 'background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 14px; color: #E2E8F0; margin-right: 16px;';
      msgDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 6px; margin: 0 0 6px;"><span style="font-size: 14px;">🤖</span><span style="font-size: 11px; color: #10B981; font-weight: bold;">Oraculum Live</span></div><p style="margin: 0; line-height: 1.5;">${textoFormatado}</p>`;
    }

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  // LEITURA 100% SUPABASE (SEM LOCALSTORAGE)
  window.carregarHistoricoNuvem = async function(clientId) {
    if (!clientId || !window.supabaseClient) return [];
    try {
      const { data, error } = await window.supabaseClient
        .from('bi_chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map(item => ({
          id: item.id,
          clientId: item.client_id,
          role: item.role || (item.prompt_input ? 'user' : 'assistant'),
          message: item.content || item.message || item.prompt_input || JSON.stringify(item.json_response),
          created_at: item.created_at
        }));
      }
    } catch(e) {
      console.warn("Erro ao buscar bi_chat_history no Supabase:", e);
    }
    return [];
  };

  window.renderizarHistoricoNoFeed = async function(clientId) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;
    feed.innerHTML = '';
    const mensagens = await window.carregarHistoricoNuvem(clientId);
    if (mensagens.length === 0) {
      adicionarAoFeed('oraculo', 'Olá! Sou o Oraculum Live. Como posso ajudar com a auditoria de tráfego, ROAS, CAC ou estratégias de escala hoje?');
      return;
    }
    mensagens.forEach(msg => {
      adicionarAoFeed(msg.role === 'user' ? 'usuario' : 'oraculo', msg.message || msg.content);
    });
  };

  async function perguntarAoOraculoGemini(promptUsuario, contextoBI, historicoAnterior = []) {
    const tenantId = window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'client_mock_123';

    const fullMessage = \`[CONTEXTO DO DASHBOARD BI]\nCliente: \${contextoBI?.cliente || 'Ativo'}\nFaturamento: \${contextoBI?.faturamento || '0'}\nGasto Tráfego: \${contextoBI?.gastoTrafego || '0'}\nROAS: \${contextoBI?.roas || '0'}\nLeads: \${contextoBI?.leads || '0'}\n\n[PERGUNTA DO USUÁRIO]: \${promptUsuario}\`;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': tenantId
      },
      body: JSON.stringify({
        clientId: clientId,
        message: fullMessage,
        history: historicoAnterior || []
      })
    });

    const resData = await response.json();
    if (!response.ok || !resData.success || !resData.data) {
      throw new Error(resData?.error || resData?.message || 'Falha na resposta do servidor.');
    }
    return resData.data;
  }
  window.perguntarAoOraculoGemini = perguntarAoOraculoGemini;

  // GRAVAÇÃO 100% SUPABASE (SEM LOCALSTORAGE)
  window.enviarMensagemOraculo = async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (isProcessando) return;

    const input = document.getElementById('oraculo-input-text');
    const texto = input ? input.value.trim() : '';
    if (!texto) return;

    isProcessando = true;
    adicionarAoFeed('usuario', texto);
    if (input) input.value = '';

    const contexto = extrairContextoCompletoBI();
    const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'cliente_ativo';

    // Grava pergunta direto no Supabase
    if (window.supabaseClient) {
      window.supabaseClient.from('bi_chat_history').insert([{ 
        client_id: clientId, 
        role: 'user', 
        content: texto, 
        prompt_input: texto,
        created_at: new Date().toISOString()
      }]).catch(console.error);
    }

    const btnSend = document.getElementById('btn-send-oraculo');
    if (btnSend) btnSend.disabled = true;

    const loadingId = 'loading-' + Date.now();
    const feed = document.getElementById('oraculo-chat-feed');
    if (feed) {
      const loadDiv = document.createElement('div');
      loadDiv.id = loadingId;
      loadDiv.style.cssText = 'background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 10px; color: #34D399; font-size: 12px;';
      loadDiv.innerHTML = '⏳ Oraculum analisando métricas com Gemini...';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      const historicoAtual = await window.carregarHistoricoNuvem(clientId);
      const respostaTexto = await perguntarAoOraculoGemini(texto, contexto, historicoAtual);

      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      adicionarAoFeed('oraculo', respostaTexto);
      
      // Grava resposta da IA direto no Supabase
      if (window.supabaseClient) {
        window.supabaseClient.from('bi_chat_history').insert([{ 
          client_id: clientId, 
          role: 'assistant', 
          content: respostaTexto,
          created_at: new Date().toISOString()
        }]).catch(console.error);
      }
    } catch (err) {
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();
      adicionarAoFeed('erro', err.message);
    } finally {
      if (btnSend) btnSend.disabled = false;
      isProcessando = false;
    }
  };

  window.solicitarApresentacaoExecutiva = function() {
    if (isProcessando) return;
    const input = document.getElementById('oraculo-input-text');
    if (input) input.value = 'Apresente o resumo geral dos dados da conta.';
    window.enviarMensagemOraculo();
  };

  window.alternarMicrofone = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta microfone direto.");
      return;
    }
    const btnMic = document.getElementById('btn-toggle-mic');
    if (gravando) {
      if (recognition) recognition.stop();
      gravando = false;
      if (btnMic) btnMic.style.background = '#1E293B';
      return;
    }
    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.onstart = () => {
        gravando = true;
        if (btnMic) btnMic.style.background = '#EF4444';
      };
      recognition.onresult = (event) => {
        const transcricao = Array.from(event.results).map(r => r[0].transcript).join('');
        const input = document.getElementById('oraculo-input-text');
        if (input) input.value = transcricao;
      };
      recognition.onend = () => {
        gravando = false;
        if (btnMic) btnMic.style.background = '#1E293B';
        const input = document.getElementById('oraculo-input-text');
        if (input && input.value.trim().length > 0) {
          window.enviarMensagemOraculo();
        }
      };
      recognition.start();
    } catch(e) {
      gravando = false;
    }
  };

  // Garante a injeção contínua e visível no Body
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injetarEstruturaLiveAdvisor);
  } else {
    injetarEstruturaLiveAdvisor();
  }
  setInterval(injetarEstruturaLiveAdvisor, 1000);
})();
