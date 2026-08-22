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

    const fullMessage = \`[CONTEXTO BI]\nCliente: \${contextoBI?.cliente || 'Ativo'}\nFaturamento: \${contextoBI?.faturamento || '0'}\nGasto: \${contextoBI?.gastoTrafego || '0'}\nROAS: \${contextoBI?.roas || '0'}\n\n[PERGUNTA]: \${promptUsuario}\`;

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
})();
