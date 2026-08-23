// =======================================================
// Oraculum Live - BI FEEDBACK LOOP (COMPLETO, MIC & VOZ HD)
// =======================================================

(function () {
  console.log("Inicializando Oraculum Live Completo (Live Meeting & Mic)...");

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
        cac: document.getElementById('bi-val-cac')?.innerText || 'R$ 0,00',
        leads: document.getElementById('funnel-val-leads')?.innerText || '0'
      };
    } catch(e) {
      return { cliente: 'Cliente Ativo', faturamento: 'R$ 0,00', gastoTrafego: 'R$ 0,00', roas: '0.0x', cac: 'R$ 0,00', leads: '0' };
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
      const textoUser = formatarMarkdown(typeof respostaData === 'string' ? respostaData : (respostaData?.replyText || ''));
      msgDiv.style.cssText = 'background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 14px; padding: 12px; color: #FFF; margin-left: 24px; text-align: right;';
      msgDiv.innerHTML = '<p style="font-size: 11px; color: #34D399; font-weight: bold; margin: 0 0 4px;">Você / Reunião</p><p style="margin: 0; line-height: 1.4;">' + textoUser + '</p>';
    } else if (remetente === 'erro') {
      const textoErro = formatarMarkdown(typeof respostaData === 'string' ? respostaData : 'Erro ao processar requisição');
      msgDiv.style.cssText = 'background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 14px; padding: 12px; color: #FCA5A5; margin-right: 16px;';
      msgDiv.innerHTML = '<p style="font-size: 11px; color: #F87171; font-weight: bold; margin: 0 0 4px;">❌ Erro</p><p style="margin: 0;">' + textoErro + '</p>';
    } else {
      const textContent = typeof respostaData === 'string' ? respostaData : (respostaData?.replyText || JSON.stringify(respostaData));
      const textoIA = formatarMarkdown(textContent);
      msgDiv.style.cssText = 'background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 14px; color: #E2E8F0; margin-right: 16px;';
      msgDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 6px; margin: 0 0 6px;"><span style="font-size: 14px;">🤖</span><span style="font-size: 11px; color: #10B981; font-weight: bold;">Oraculum Live</span></div><p style="margin: 0; line-height: 1.5;">' + textoIA + '</p>';
    }

    feed.appendChild(msgDiv);
    feed.scrollTop = feed.scrollHeight;
  }

  window.falarTextoOraculo = async function(textoLimpo) {
    if (!textoLimpo) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      const formatado = textoLimpo
        .replace(/[*_#`~]/g, '')
        .replace(/ROAS/gi, 'Rôas')
        .replace(/CAC/gi, 'Caque')
        .replace(/ICP/gi, 'I C P')
        .replace(/(\d+)k\b/gi, '$1 mil')
        .replace(/(\d+)%/g, '$1 por cento');

      const indicador = document.getElementById('oraculo-voice-indicator');
      const statusText = document.getElementById('voice-status-text');

      const utterance = new SpeechSynthesisUtterance(formatado);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      if (indicador) {
        indicador.style.display = 'flex';
        if (statusText) statusText.innerText = 'Oraculum falando...';
      }
      utterance.onend = () => { if (indicador) indicador.style.display = 'none'; };
      utterance.onerror = () => { if (indicador) indicador.style.display = 'none'; };
      window.speechSynthesis.speak(utterance);
    } catch(e) {
      console.warn("Falha no sintetizador de voz:", e);
    }
  };

  window.alternarMicrofone = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta microfone direto. Use o Google Chrome ou Edge.");
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

    try {
      recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        gravando = true;
        if (btnMic) {
          btnMic.style.background = '#EF4444';
          btnMic.style.color = '#FFF';
        }
        if (indicador) {
          indicador.style.display = 'flex';
          if (statusText) statusText.innerText = 'Ouvindo reunião / microfone...';
        }
      };

      recognition.onresult = (event) => {
        let transcricaoFinal = '';
        let transcricaoInterim = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) transcricaoFinal += event.results[i][0].transcript;
          else transcricaoInterim += event.results[i][0].transcript;
        }
        const input = document.getElementById('oraculo-input-text');
        if (input) input.value = transcricaoFinal + transcricaoInterim;
      };

      recognition.onerror = () => {
        gravando = false;
        if (btnMic) btnMic.style.background = '#1E293B';
        if (indicador) indicador.style.display = 'none';
      };

      recognition.onend = () => {
        gravando = false;
        if (btnMic) btnMic.style.background = '#1E293B';
        if (indicador) indicador.style.display = 'none';
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

  window.carregarHistoricoNuvem = async function(clientId) {
    if (!clientId || !window.supabaseClient) return [];
    try {
      const { data, error } = await window.supabaseClient
        .from('bi_chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        return data
          .filter(item => {
            const txt = (item.content || '').toLowerCase();
            // Ignora mensagens que vazaram do Chat Estratégico antigo (roteiros, anúncios, etc)
            if (txt.includes('destacando headlines') || txt.includes('hooks de 3s') || txt.includes('script de vídeo') || txt.includes('roteiro de anúncio')) {
              return false;
            }
            return true;
          })
          .map(item => ({
            id: item.id,
            clientId: item.client_id,
            role: item.role || 'assistant',
            message: item.content || item.message || item.prompt_input || '',
            created_at: item.created_at
          }));
      }
    } catch (err) {
      console.warn("[Oraculum Live] Erro ao carregar bi_chat_history:", err);
    }
    return [];
  };

  window.renderizarHistoricoNoFeed = async function(clientId) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;
    feed.innerHTML = '';
    const mensagens = await window.carregarHistoricoNuvem(clientId);
    if (mensagens.length === 0) {
      adicionarAoFeed('oraculo', 'Olá! Sou o Oraculum Live. Estou acompanhando os dados de BI desta conta em tempo real. Faça perguntas ou ative o microfone para conduzir a reunião ao vivo.');
      return;
    }
    mensagens.forEach(msg => {
      adicionarAoFeed(msg.role === 'user' ? 'usuario' : 'oraculo', msg.message || msg.content);
    });
  };

  async function perguntarAoOraculoGemini(promptUsuario, contextoBI, historicoAnterior) {
    const tenantId = window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'client_mock_123';

    let nicho = 'N/A';
    let ticketMedio = 'N/A';
    let metaFaturamento = 'N/A';
    let dossieICP = 'N/A';

    if (window.supabaseClient && clientId && clientId !== 'client_mock_123') {
      try {
        const { data: clientData } = await window.supabaseClient
          .from('clients')
          .select('niche, average_ticket, revenue_goal, niche_id')
          .eq('id', clientId)
          .single();

        if (clientData) {
          ticketMedio = clientData.average_ticket || 'N/A';
          metaFaturamento = clientData.revenue_goal || 'N/A';
          nicho = clientData.niche || 'N/A';
          
          let tableToQuery = 'niche_knowledge_base';
          let queryCol = 'niche_name';
          let matchVal = clientData.niche_id || nicho;
          if (clientData.niche_id) queryCol = 'id';
          
          const { data: nicheData } = await window.supabaseClient
            .from('niche_knowledge_base')
            .select('niche_name, icp_pains, value_proposition')
            .eq(queryCol, matchVal)
            .single();

          if (nicheData) {
            if (nicho === 'N/A' || !nicho) nicho = nicheData.niche_name || nicho;
            dossieICP = `Dores: ${nicheData.icp_pains || ''} | Proposta: ${nicheData.value_proposition || ''}`;
          }
        }
      } catch (err) {
        console.warn("Erro ao buscar contexto RAG (clients/niche_knowledge_base):", err);
      }
    }

    if (dossieICP === 'N/A' || !dossieICP.trim()) {
      dossieICP = 'Informações de ICP não encontradas no banco.';
    }

    const biSystemPrompt = `Você é o ORACULUM LIVE, o Copiloto de Inteligência Autônoma e Diretor Estratégico da agência HAJALUZ.
Você está atuando AO VIVO em uma reunião com o cliente ou auditando as decisões de tráfego.

--- [MEMÓRIA & DOSSIÊ ESTRATÉGICO DO CLIENTE] ---
• Cliente / Marca: ${contextoBI.cliente || 'Cliente Ativo'}
• Nicho / Segmento: ${nicho}
• Ticket Médio: ${ticketMedio} | Meta de Faturamento: ${metaFaturamento}
• Dores do ICP & Proposta de Valor: ${dossieICP}

--- [MÉTRICAS DO BI EM TEMPO REAL] ---
• Faturamento Atual: ${contextoBI.faturamento || 'R$ 0,00'}
• Investimento em Mídia: ${contextoBI.gastoTrafego || 'R$ 0,00'}
• ROAS Atual: ${contextoBI.roas || '0.0x'} | CAC: ${contextoBI.cac || 'R$ 0,00'} | Leads: ${contextoBI.leads || '0'}

--- [DIRETRIZES DE INTELIGÊNCIA EXECUTIVA] ---
1. PROIBIDO gerar respostas genéricas de marketing. Todas as sugestões DEVEM citar o nicho, as métricas e o contexto deste cliente específico.
2. Identifique anomalias (ex: ROAS abaixo da meta, CAC elevado em criativos específicos) e aponte ações corretivas imediatas.
3. Trate acordos e decisões anteriores como fatos consolidados.
4. Responda em Português do Brasil de forma concisa, analítica e convincente.`;

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-organization-id': tenantId
      },
      body: JSON.stringify({
        clientId: clientId,
        message: promptUsuario,
        mode: 'bi_live',
        systemPrompt: `Você é o Oraculum Live, Diretor de Estratégia de Negócios e BI.
Analise os dados financeiros, ROAS, CAC e métricas deste cliente em tempo real.
Seja direto, tático, analítico e resolutivo.`
      })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || 'Falha na resposta do Gemini.');
    }
    
    let respostaFinal = "Sem resposta do assistente.";
    if (typeof data.data === 'string') {
      respostaFinal = data.data;
    } else if (data.data?.replyText) {
      respostaFinal = data.data.replyText;
    } else if (data.replyText) {
      respostaFinal = data.replyText;
    } else if (data.data) {
      respostaFinal = JSON.stringify(data.data);
    }
    return respostaFinal;
  }

  // Parser leve e autônomo para renderização executiva no Oraculum Live
  function formatarMarkdownExecutivo(texto) {
    if (!texto) return '';

    let html = texto;

    // 1. Linhas horizontais (---) -> Divisórias sutis
    html = html.replace(/^---$/gim, '<div class="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-3"></div>');

    // 2. Cabeçalhos H3 (###) -> Títulos com destaque e espaçamento executivo
    html = html.replace(/^### (.*$)/gim, '<div class="text-xs font-bold text-cyan-300 uppercase tracking-wider mt-3 mb-1.5 flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>$1</div>');

    // 3. Cabeçalhos H4 (####) -> Subtítulos destacados
    html = html.replace(/^#### (.*$)/gim, '<div class="text-xs font-semibold text-emerald-400 mt-2 mb-1 pl-2 border-l-2 border-emerald-500/40">$1</div>');

    // 4. Negrito (**texto**) -> Texto em branco puro com peso
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>');

    // 5. Itálico (*texto*)
    html = html.replace(/\*(.*?)\*/g, '<span class="text-slate-400 italic">$1</span>');

    // 6. Listas e Bullets (* item) -> Itens alinhados e estilizados
    html = html.replace(/^\* (.*$)/gim, '<div class="flex items-start gap-2 my-1 text-slate-300 text-xs pl-1 leading-relaxed"><span class="text-emerald-400 text-xs select-none">▸</span><div>$1</div></div>');

    // 7. Listas numeradas (1. item)
    html = html.replace(/^(\d+)\. (.*$)/gim, '<div class="flex items-start gap-2 my-1 text-slate-300 text-xs pl-1 leading-relaxed"><span class="text-cyan-400 font-semibold text-[11px] select-none">$1.</span><div>$2</div></div>');

    // 8. Quebras de linha normais
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br/>');

    return html;
  }

  window.enviarMensagemOraculo = async function(event) {
    if (event) {
      if (typeof event.preventDefault === 'function') event.preventDefault();
      if (typeof event.stopPropagation === 'function') event.stopPropagation();
    }
    const input = document.getElementById('input-live-message') || document.getElementById('input-chat-oraculo') || document.getElementById('oraculo-input-text');
    if (!input) return;
    const texto = input.value.trim();
    if (!texto) return;

    input.value = '';

    const chatContainer = document.getElementById('oraculo-live-messages') || document.getElementById('live-chat-feed') || document.getElementById('oraculo-chat-feed');
    if (!chatContainer) return;

    // 1. Bolha do Usuário
    const userBubble = document.createElement('div');
    userBubble.className = 'p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-100 rounded-xl text-xs ml-auto max-w-[85%] my-2';
    userBubble.innerHTML = `<span class="font-bold text-[10px] block text-emerald-400 mb-1">Você / Reunião</span>${texto}`;
    chatContainer.appendChild(userBubble);

    // 2. Bolha da IA (Estado Inicial)
    const aiBubble = document.createElement('div');
    aiBubble.className = 'p-3 bg-slate-900 border border-slate-700/60 text-slate-200 rounded-xl text-xs mr-auto max-w-[90%] my-2';
    aiBubble.innerHTML = `<span class="font-bold text-[10px] block text-cyan-400 mb-1 flex items-center gap-1">
      <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span> Oraculum Live
    </span><div class="resposta-corpo text-slate-400 italic">Analisando dados em tempo real...</div>`;
    chatContainer.appendChild(aiBubble);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    const corpoEl = aiBubble.querySelector('.resposta-corpo');

    try {
      const tenantId = window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
      const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'default_client';

      let clientContextData = null;

      if (window.supabaseClient && clientId && clientId !== 'default_client') {
        try {
          // 1. Busca dados cadastrais e dossiê
          const { data: clientInfo } = await window.supabaseClient
            .from('clients')
            .select('name, niche, website, previous_agency_notes')
            .eq('id', clientId)
            .maybeSingle();

          // 2. Busca últimas métricas de BI
          const { data: biInfo } = await window.supabaseClient
            .from('bi_analytics_data')
            .select('*')
            .eq('client_id', clientId)
            .order('reference_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          clientContextData = {
            cliente: clientInfo || {},
            metricas_bi: biInfo || { status: 'Sem métricas reais lançadas ainda (valores zerados)' }
          };
        } catch (errCtx) {
          console.warn('[Oraculum Live] Falha ao coletar contexto prévio:', errCtx);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': tenantId
        },
        body: JSON.stringify({
          clientId: clientId,
          message: texto,
          mode: 'bi_live',
          clientContext: clientContextData
        })
      });

      const resJson = await response.json().catch(() => null);

      if (!response.ok || !resJson || resJson.success === false) {
        const msgErro = resJson?.error || resJson?.message || `HTTP ${response.status} ${response.statusText}`;
        corpoEl.className = 'resposta-corpo text-red-400 font-semibold';
        corpoEl.innerHTML = `⚠️ Erro na resposta: ${msgErro}`;
        return;
      }

      // Extração prioritária do texto
      const textoResposta = resJson.reply || resJson.replyText || (typeof resJson.data === 'string' ? resJson.data : resJson.data?.replyText) || 'Resposta vazia.';

      corpoEl.className = 'resposta-corpo text-slate-300 leading-relaxed font-sans text-xs space-y-1';
      corpoEl.innerHTML = formatarMarkdownExecutivo(textoResposta);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // Persistência segura usando os campos universais
      if (window.supabaseClient) {
        window.supabaseClient.from('bi_chat_history').insert([
          { client_id: clientId, role: 'user', content: texto, prompt_input: texto, created_at: new Date().toISOString() },
          { client_id: clientId, role: 'assistant', content: textoResposta, response_output: textoResposta, created_at: new Date().toISOString() }
        ]).then(() => {}).catch(err => console.warn('[Supabase Warn]', err));
      }

    } catch (err) {
      corpoEl.className = 'resposta-corpo text-red-400 font-semibold';
      corpoEl.innerHTML = `🛑 Falha de rede: ${err.message}`;
    }
  };

  window.gerarAtaReuniao = function() {
    if (isProcessando) return;
    const input = document.getElementById('oraculo-input-text');
    if (input) input.value = 'Analise as conversas desta reunião e gere uma ATA EXECUTIVA contendo:\n1. Diagnóstico do Momento da Conta (Métricas e Gargalos).\n2. Principais Acordos e Decisões Tomadas com o Cliente.\n3. Plano de Ação Imediato com responsáveis sugeridos (Tráfego, Copy, Design, Atendimento).';
    window.enviarMensagemOraculo();
  };

  window.exportarAcoesParaKanban = async function() {
    if (isProcessando) return;
    isProcessando = true;

    const tenantId = window.activeTenantId || localStorage.getItem('oraculum_active_tenant_id') || 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const clientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'cliente_ativo';

    const loadingId = 'loading-' + Date.now();
    const feed = document.getElementById('oraculo-chat-feed');
    if (feed) {
      const loadDiv = document.createElement('div');
      loadDiv.id = loadingId;
      loadDiv.style.cssText = 'background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 14px; padding: 12px; color: #FDE047; font-size: 12px;';
      loadDiv.innerHTML = '⚙️ Extraindo tarefas da reunião para o Kanban...';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      const historicoAtual = await window.carregarHistoricoNuvem(clientId);
      const promptKanban = "Extraia as tarefas acordadas nesta reunião. Retorne APENAS um JSON válido no formato: [ { \"title\": \"...\", \"description\": \"...\", \"column\": \"backlog\", \"tag\": \"Trafego\" } ]. Não use crases ou texto adicional. Se não houver, retorne [].";
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': tenantId
        },
        body: JSON.stringify({
          clientId: clientId,
          systemPrompt: "Você é um extrator de tarefas. Retorne estritamente um array JSON puro e válido.",
          message: promptKanban,
          history: historicoAtual.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.message }]
          }))
        })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success || !resData.data) {
        throw new Error('Falha na extração de tarefas.');
      }

      let tarefasStr = resData.data.trim();
      if (tarefasStr.startsWith('```')) {
        tarefasStr = tarefasStr.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
      }
      const tarefas = JSON.parse(tarefasStr);

      if (tarefas.length > 0 && window.supabaseClient) {
        const inserts = tarefas.map(t => ({
          client_id: clientId,
          tenant_id: tenantId,
          title: t.title,
          description: t.description,
          status: t.column || 'backlog',
          tags: [t.tag || 'Geral']
        }));
        const { error } = await window.supabaseClient.from('kanban_tasks').insert(inserts);
        if (error) throw error;
        
        adicionarAoFeed('oraculo', `✅ **${tarefas.length} tarefas exportadas para o Kanban!**\n\n` + tarefas.map(t => `- [${t.tag}] ${t.title}`).join('\n'));
      } else {
        adicionarAoFeed('oraculo', 'Nenhuma tarefa identificada para exportação.');
      }
    } catch(err) {
      console.error("Erro exportando tarefas:", err);
      adicionarAoFeed('erro', 'Erro ao exportar tarefas para o Kanban: ' + err.message);
    } finally {
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();
      isProcessando = false;
    }
  };

  function forcarRenderizacaoOraculumLive() {
    // 1. Botão Flutuante no Body
    let btn = document.getElementById('btn-toggle-oraculo-live') || document.getElementById('btn-open-oraculo-live');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-toggle-oraculo-live';
      btn.type = 'button';
      // Removendo o style.cssText inline para usar 100% as classes do Tailwind
      btn.className = 'fixed bottom-6 right-6 z-[2147483647] flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-full shadow-[0_10px_25px_rgba(16,185,129,0.5)] transition-all duration-200 cursor-pointer border border-white/40 hidden';
      btn.innerHTML = `
        <img src="/logo-oraculum-03.svg" alt="Oraculum" class="w-4 h-4 object-contain brightness-0" />
        <span>Oraculum Live</span>
      `;
      document.body.appendChild(btn);
    }
    btn.onclick = function(e) {
      e.preventDefault();
      window.alternarOraculoLive();
    };

    // 2. Drawer Lateral com Botão de Microfone e Resumo de Reunião
    let drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'oraculo-live-drawer';
      drawer.innerHTML = `
        <div style="padding: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(8, 11, 17, 0.9);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg class="text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            <div>
              <h3 style="margin: 0; font-size: 13px; font-weight: 700; color: #FFF;">Oraculum Live (Reunião)</h3>
              <span style="font-size: 10px; color: #10B981;">● Contexto de BI Ativo</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" onclick="window.gerarAtaReuniao()" style="padding: 4px 8px; background: rgba(59, 130, 246, 0.2); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;" title="Ata Executiva">⚡ Ata & Plano de Ação</button>
            <button type="button" onclick="window.exportarAcoesParaKanban()" style="padding: 4px 8px; background: rgba(234, 179, 8, 0.2); color: #FDE047; border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 6px; font-size: 10px; font-weight: bold; cursor: pointer;" title="Exportar Ações">📌 Exportar Ações</button>
            <button type="button" onclick="window.alternarOraculoLive()" style="background: transparent; border: none; color: #94A3B8; font-size: 22px; cursor: pointer; padding: 0 4px;">&times;</button>
          </div>
        </div>

        <div id="oraculo-chat-feed" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; color: #CBD5E1;">
          <div style="background: rgba(30, 41, 59, 0.6); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
            👋 Olá! Sou o <strong>Oraculum Live</strong>. Faça perguntas por texto ou use o microfone para conduzir a reunião ao vivo.
          </div>
        </div>

        <div id="oraculo-voice-indicator" style="display: none; padding: 8px 16px; background: rgba(2, 44, 34, 0.6); border-top: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; color: #34D399; justify-content: space-between; align-items: center;">
          <span id="voice-status-text">Ouvindo...</span>
          <span style="font-size: 10px; background: rgba(16,185,129,0.3); padding: 2px 6px; border-radius: 4px; color: #FFF;">Live Audio</span>
        </div>

        <div style="padding: 12px; border-top: 1px solid rgba(255,255,255,0.1); background: rgba(8, 11, 17, 0.9);">
          <form onsubmit="event.preventDefault(); window.enviarMensagemOraculo(event); return false;" style="display: flex; gap: 8px; align-items: center;">
            <button type="button" id="btn-toggle-mic" onclick="window.alternarMicrofone()" style="padding: 8px 12px; background: #1E293B; color: #FFF; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; cursor: pointer; font-size: 14px;" title="Ativar Microfone / Live Meeting">🎙️</button>
            <input type="text" id="oraculo-input-text" onkeydown="if(event.key==='Enter'){event.preventDefault(); window.enviarMensagemOraculo(event);}" placeholder="Pergunte ou use o microfone..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 8px 12px; color: #FFF; font-size: 12px; outline: none;" />
            <button type="button" onclick="window.enviarMensagemOraculo(event)" id="btn-send-oraculo" style="padding: 8px 14px; background: #10B981; color: #000; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">➤</button>
          </form>
        </div>
      `;
      document.body.appendChild(drawer);
    }
    drawer.style.cssText = 'position: fixed !important; top: 0 !important; bottom: 0 !important; right: 0 !important; z-index: 2147483647 !important; width: 100% !important; max-width: 420px !important; background: rgba(15, 23, 42, 0.98) !important; backdrop-filter: blur(20px) !important; border-left: 1px solid rgba(16, 185, 129, 0.3) !important; box-shadow: -10px 0 30px rgba(0,0,0,0.8) !important; display: flex !important; flex-direction: column !important; transition: transform 0.3s ease !important; transform: translateX(100%) !important; color: #FFF !important;';
  }

  forcarRenderizacaoOraculumLive();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', forcarRenderizacaoOraculumLive);
  }

  function sincronizarVisibilidadeOraculoLive() {
    const btnLive = document.getElementById('btn-toggle-oraculo-live');
    const gavetaLive = document.getElementById('oraculo-live-drawer') || document.getElementById('gaveta-oraculo-live');

    // Verifica se a aba de BI está visível no DOM
    const biSection = document.getElementById('tab-bi') || document.getElementById('section-bi') || document.querySelector('[data-tab="tab-bi"]');
    const isBiActive = biSection && !biSection.classList.contains('hidden') && biSection.style.display !== 'none';

    if (btnLive) {
      if (isBiActive) {
        btnLive.classList.remove('hidden');
        btnLive.style.setProperty('display', 'flex', 'important');
      } else {
        btnLive.classList.add('hidden');
        btnLive.style.setProperty('display', 'none', 'important');
        if (gavetaLive) {
          gavetaLive.classList.add('hidden');
          gavetaLive.style.transform = 'translateX(100%)';
        }
      }
    }
  }

  // Executar no boot e escutar eventos de navegação
  document.addEventListener('DOMContentLoaded', sincronizarVisibilidadeOraculoLive);
  window.addEventListener('hashchange', sincronizarVisibilidadeOraculoLive);
  document.addEventListener('click', () => setTimeout(sincronizarVisibilidadeOraculoLive, 50));
  window.sincronizarVisibilidadeOraculoLive = sincronizarVisibilidadeOraculoLive;
})();
