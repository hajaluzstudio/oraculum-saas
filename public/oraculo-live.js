// =======================================================
// Oraculum Live - BI FEEDBACK LOOP (100% SUPABASE & ASCII CLEAN)
// =======================================================

(function () {
  console.log("Inicializando Oraculum Live (ASCII Clean)...");

  let isProcessando = false;
  let gravando = false;
  let recognition = null;

  window.alternarOraculoLive = function () {
    const drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) return;
    
    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none') {
      drawer.style.transform = 'translateX(100%)';
    } else {
      drawer.style.transform = 'translateX(0px)';
      const activeClientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id');
      if (activeClientId && typeof window.renderizarHistoricoNoFeed === 'function') {
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
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #34D399; font-weight: bold; margin: 0 0 4px;">Voce</p><p style="margin: 0; line-height: 1.4;">${textoFormatado}</p>`;
    } else if (remetente === 'erro') {
      const textoFormatado = formatarMarkdown(typeof respostaData === 'string' ? respostaData : 'Erro ao processar');
      msgDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 14px; padding: 12px; color: #FCA5A5; margin-right: 16px;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #F87171; font-weight: bold; margin: 0 0 4px;">Erro</p><p style="margin: 0;">${textoFormatado}</p>`;
    } else {
      const textContent = typeof respostaData === 'string' ? respostaData : (respostaData?.replyText || JSON.stringify(respostaData));
      const textoFormatado = formatarMarkdown(textContent);
      msgDiv.style.cssText = 'background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 14px; color: #E2E8F0; margin-right: 16px;';
      msgDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 6px; margin: 0 0 6px;"><span style="font-size: 14px;">🤖</span><span style="font-size: 11px; color: #10B981; font-weight: bold;">Oraculum Live</span></div><p style="margin: 0; line-height: 1.5;">${textoFormatado}</p>`;
    }

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

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
      console.warn("Erro ao ler Supabase:", e);
    }
    return [];
  };

  window.renderizarHistoricoNoFeed = async function(clientId) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;
    feed.innerHTML = '';
    const mensagens = await window.carregarHistoricoNuvem(clientId);
    if (mensagens.length === 0) {
      adicionarAoFeed('oraculo', 'Ola! Sou o Oraculum Live. Como posso ajudar com a auditoria de trafego, ROAS, CAC ou escala hoje?');
      return;
    }
    mensagens.forEach(msg => {
      adicionarAoFeed(msg.role === 'user' ? 'usuario' : 'oraculo', msg.message || msg.content);
    });
  };

  async function perguntarAoOraculoGemini(promptUsuario, contextoBI, historicoAnterior) {
    const tenantId = window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'client_mock_123';

    const cliNome = (contextoBI && contextoBI.cliente) ? contextoBI.cliente : 'Ativo';
    const fatur = (contextoBI && contextoBI.faturamento) ? contextoBI.faturamento : '0';
    const gasto = (contextoBI && contextoBI.gastoTrafego) ? contextoBI.gastoTrafego : '0';
    const roasVal = (contextoBI && contextoBI.roas) ? contextoBI.roas : '0';

    const fullMessage = "[CONTEXTO BI]\nCliente: " + cliNome + "\nFaturamento: " + fatur + "\nGasto: " + gasto + "\nROAS: " + roasVal + "\n\n[PERGUNTA]: " + promptUsuario;

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
      throw new Error(resData?.error || resData?.message || 'Falha no servidor Gemini.');
    }
    return resData.data;
  }
  window.perguntarAoOraculoGemini = perguntarAoOraculoGemini;

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
      loadDiv.innerHTML = '⏳ Oraculum analisando metricas...';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      const historicoAtual = await window.carregarHistoricoNuvem(clientId);
      const respostaTexto = await perguntarAoOraculoGemini(texto, contexto, historicoAtual);

      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      adicionarAoFeed('oraculo', respostaTexto);
      
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
      alert("Navegador sem suporte a microfone.");
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

  function forcarRenderizacaoOraculumLive() {
    // 1. Botão Flutuante
    let btn = document.getElementById('btn-open-oraculo-live');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-open-oraculo-live';
      btn.type = 'button';
      btn.innerHTML = '<span style="font-size:16px;">🤖</span><span>Oraculum Live</span>';
      document.body.appendChild(btn);
    }
    btn.onclick = function(e) {
      e.preventDefault();
      window.alternarOraculoLive();
    };
    btn.style.cssText = 'position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; gap: 8px !important; padding: 12px 20px !important; background-color: #10b981 !important; color: #020705 !important; border-radius: 9999px !important; font-weight: 800 !important; font-size: 13px !important; cursor: pointer !important; border: 1px solid rgba(255,255,255,0.4) !important; box-shadow: 0 10px 25px rgba(16,185,129,0.5) !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important;';

    // 2. Drawer Lateral
    let drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'oraculo-live-drawer';
      drawer.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.9);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 18px;">🤖</span>
            <strong style="color: #FFF; font-size: 14px;">Oraculum Live</strong>
          </div>
          <button type="button" onclick="window.alternarOraculoLive()" style="background: transparent; border: none; color: #94A3B8; font-size: 22px; cursor: pointer;">&times;</button>
        </div>
        <div id="oraculo-chat-feed" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: #CBD5E1;">
          <div style="background: rgba(30, 41, 59, 0.6); padding: 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);">
            👋 Olá! Sou o <strong>Oraculum Live</strong>. Como posso ajudar com métricas e escala hoje?
          </div>
        </div>
        <div style="padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(8, 11, 17, 0.9);">
          <form onsubmit="window.enviarMensagemOraculo(event)" style="display: flex; gap: 8px;">
            <input type="text" id="oraculo-input-text" placeholder="Pergunte ao Oraculum..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 12px; color: #FFF; font-size: 12px; outline: none;" />
            <button type="submit" id="btn-send-oraculo" style="padding: 8px 14px; background: #10B981; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">➤</button>
          </form>
        </div>
      `;
      document.body.appendChild(drawer);
    }
    drawer.style.cssText = 'position: fixed !important; top: 0 !important; bottom: 0 !important; right: 0 !important; z-index: 2147483647 !important; width: 100% !important; max-width: 400px !important; background: rgba(15, 23, 42, 0.98) !important; backdrop-filter: blur(20px) !important; border-left: 1px solid rgba(16,185,129,0.3) !important; box-shadow: -10px 0 30px rgba(0,0,0,0.8) !important; display: flex !important; flex-direction: column !important; transition: transform 0.3s ease !important; transform: translateX(100%) !important; color: #FFF !important;';
  }

  // Executa imediatamente e no carregamento
  forcarRenderizacaoOraculumLive();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forcarRenderizacaoOraculumLive);
  }
  window.addEventListener('load', forcarRenderizacaoOraculumLive);
})();
