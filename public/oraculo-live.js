// ============================================================================
// ORACULUM LIVE - SISTEMA COMPLETO DE INTELIGÊNCIA EM TEMPO REAL & BI
// ============================================================================

(function inicializarOraculumLiveCompleto() {
  console.log("%c⚡ [Oraculum Live] Inicializando com Logo Escuro Contrastado...", "color: #10B981; font-weight: bold; font-size: 13px;");

  // 1. Limpeza de instâncias antigas
  const hostId = 'oraculo-live-host-root';
  const hostAntigo = document.getElementById(hostId);
  if (hostAntigo) hostAntigo.remove();

  // 2. Criação do Host na raiz suprema do documento
  const host = document.createElement('div');
  host.id = hostId;
  host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Estado interno
  let gravando = false;
  let recognition = null;
  let isProcessando = false;

  // 3. Parser Markdown Executivo
  function formatarMarkdown(texto) {
    if (!texto) return '';
    let html = texto;
    html = html.replace(/^---$/gim, '<div style="height: 1px; background: rgba(255,255,255,0.1); margin: 12px 0;"></div>');
    html = html.replace(/^### (.*$)/gim, '<div style="font-size: 11.5px; font-weight: 800; color: #67e8f9; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px; display: flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #22d3ee; display: inline-block;"></span>$1</div>');
    html = html.replace(/^#### (.*$)/gim, '<div style="font-size: 11px; font-weight: 700; color: #34d399; margin: 10px 0 4px; padding-left: 8px; border-left: 2px solid #10b981;">$1</div>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #f8fafc; font-weight: 700;">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<span style="color: #94a3b8; font-style: italic;">$1</span>');
    html = html.replace(/^\* (.*$)/gim, '<div style="display: flex; align-items: flex-start; gap: 6px; margin: 4px 0; color: #cbd5e1; font-size: 12px; line-height: 1.4;"><span style="color: #10b981; font-size: 10px; user-select: none;">▸</span><div>$1</div></div>');
    html = html.replace(/^(\d+)\. (.*$)/gim, '<div style="display: flex; align-items: flex-start; gap: 6px; margin: 4px 0; color: #cbd5e1; font-size: 12px; line-height: 1.4;"><span style="color: #38bdf8; font-weight: bold; font-size: 11px; user-select: none;">$1.</span><div>$2</div></div>');
    html = html.replace(/\n\n/g, '<div style="height: 8px;"></div>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  // 4. Estrutura HTML & CSS encapsulada
  shadow.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      
      .btn-flutuante {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #10B981;
        color: #022c22;
        font-size: 13px;
        font-weight: 800;
        padding: 12px 20px;
        border-radius: 9999px;
        border: 1px solid rgba(255,255,255,0.4);
        box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(16,185,129,0.3);
        cursor: pointer;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: transform 0.2s ease, background 0.2s ease;
        user-select: none;
      }
      .btn-flutuante:hover { transform: scale(1.05); background: #34d399; }
      
      /* Filtro para deixar o logo no mesmo tom escuro do texto */
      .btn-flutuante img { 
        width: 20px; 
        height: 20px; 
        object-fit: contain;
        filter: brightness(0) saturate(100%) invert(11%) sepia(28%) saturate(1682%) hue-rotate(119deg) brightness(94%) contrast(98%);
      }

      .gaveta {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 460px;
        max-width: 92vw;
        height: 100vh;
        background: #090d16;
        border-left: 1px solid rgba(16, 185, 129, 0.4);
        box-shadow: -20px 0 60px rgba(0,0,0,0.95);
        display: flex;
        flex-direction: column;
        color: #fff;
        pointer-events: auto;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .gaveta.aberta { transform: translateX(0px); }

      .feed-scroll {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        background: #06090e;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .feed-scroll::-webkit-scrollbar { width: 5px; }
      .feed-scroll::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 4px; }
      .feed-scroll::-webkit-scrollbar-thumb:hover { background: #334155; }

      .msg-user {
        background: rgba(6, 78, 59, 0.7);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-radius: 12px;
        padding: 10px 14px;
        color: #ecfdf5;
        margin-left: 28px;
        font-size: 12.5px;
        line-height: 1.4;
      }

      .msg-ai {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid rgba(51, 65, 85, 0.8);
        border-radius: 12px;
        padding: 12px 14px;
        color: #e2e8f0;
        margin-right: 20px;
        font-size: 12.5px;
        line-height: 1.5;
      }
    </style>

    <!-- Botão Flutuante com a Logo Escura Contrastada -->
    <button class="btn-flutuante" id="btn-toggle-live">
      <img src="/logo-oraculum-03.svg" alt="Oraculum Logo" onerror="this.onerror=null; this.src='logo-oraculum-03.svg';" />
      <span>Oraculum Live</span>
    </button>

    <!-- Gaveta Lateral -->
    <div class="gaveta" id="gaveta-live">
      <div style="padding: 14px 18px; background: #0f172a; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center;">
            <img src="/logo-oraculum-03.svg" alt="Oraculum" style="width: 20px; height: 20px; object-fit: contain;" />
          </div>
          <div>
            <h3 style="margin: 0; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
              Oraculum Live <span style="font-size: 10px; color: #10B981; font-weight: normal;">● Conectado</span>
            </h3>
            <span id="label-contexto-cliente" style="font-size: 10px; color: #94a3b8;">Sincronizando com BI...</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="btn-ata" style="padding: 5px 10px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; font-size: 10.5px; font-weight: bold; cursor: pointer;">⚡ Ata</button>
          <button id="btn-kanban" style="padding: 5px 10px; background: rgba(234, 179, 8, 0.2); color: #fde047; border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 6px; font-size: 10.5px; font-weight: bold; cursor: pointer;">📌 Kanban</button>
          <button id="btn-fechar" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;">✕</button>
        </div>
      </div>

      <div id="chat-feed" class="feed-scroll">
        <div style="padding: 12px; background: rgba(30,41,59,0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #cbd5e1;">
          👋 Olá! Sou o <strong>Oraculum Live</strong>. Estou conectado aos dados de BI desta conta em tempo real.
        </div>
      </div>

      <div id="voice-indicator" style="display: none; padding: 8px 16px; background: rgba(2, 44, 34, 0.8); border-top: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; color: #34d399; justify-content: space-between; align-items: center;">
        <span id="voice-status">🎙️ Ouvindo microfone da reunião...</span>
        <span style="font-size: 9.5px; background: rgba(16,185,129,0.3); padding: 2px 6px; border-radius: 4px; color: #fff;">Live Mic</span>
      </div>

      <div style="padding: 12px 16px; background: #0f172a; border-top: 1px solid rgba(255,255,255,0.1); display: flex; gap: 8px; align-items: center;">
        <button id="btn-mic" style="padding: 10px 13px; background: #1e293b; color: #fff; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; cursor: pointer; font-size: 14px;" title="Alternar Microfone">🎙️</button>
        <input id="chat-in" type="text" placeholder="Pergunte sobre as métricas de BI..." style="flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #334155; background: #1e293b; color: #fff; font-size: 12.5px; outline: none;" />
        <button id="chat-env" style="padding: 10px 18px; background: #10B981; color: #022c22; border: none; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer;">➤</button>
      </div>
    </div>
  `;

  // Elementos do Shadow DOM
  const btnToggle = shadow.getElementById('btn-toggle-live');
  const gaveta = shadow.getElementById('gaveta-live');
  const btnFechar = shadow.getElementById('btn-fechar');
  const btnAta = shadow.getElementById('btn-ata');
  const btnKanban = shadow.getElementById('btn-kanban');
  const btnMic = shadow.getElementById('btn-mic');
  const input = shadow.getElementById('chat-in');
  const btnEnv = shadow.getElementById('chat-env');
  const feed = shadow.getElementById('chat-feed');
  const labelContexto = shadow.getElementById('label-contexto-cliente');
  const voiceIndicator = shadow.getElementById('voice-indicator');

  function obterContextoAtivo() {
    const clientId = window.currentClientId || 
                     localStorage.getItem('oraculum_active_client_id') || 
                     localStorage.getItem('oraculum_active_client') || 
                     'default_client';

    const tenantId = window.activeTenantId || 
                     localStorage.getItem('oraculum_active_tenant_id') || 
                     'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';

    return { clientId, tenantId };
  }

  // Carregar Histórico do Supabase
  async function carregarHistoricoDoBanco() {
    const { clientId } = obterContextoAtivo();
    labelContexto.innerText = `Cliente: ${clientId}`;

    if (!window.supabaseClient || clientId === 'default_client') {
      feed.innerHTML = `
        <div style="padding: 12px; background: rgba(30,41,59,0.6); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #cbd5e1;">
          👋 Olá! Sou o <strong>Oraculum Live</strong>. Selecione um cliente na carteira para sincronizar todo o histórico.
        </div>
      `;
      return;
    }

    feed.innerHTML = '<div style="color: #64748b; font-size: 11px; text-align: center; padding: 12px;">Carregando histórico do Supabase...</div>';

    try {
      const { data, error } = await window.supabaseClient
        .from('bi_chat_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      feed.innerHTML = '';

      if (error || !data || data.length === 0) {
        feed.innerHTML = `
          <div style="padding: 12px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); border-radius: 12px; font-size: 12px; color: #6ee7b7;">
            ✨ Histórico limpo e conectado. Envie uma mensagem ou use o microfone para conduzir a reunião.
          </div>
        `;
        return;
      }

      data.forEach(item => {
        const isUser = item.role === 'user';
        const msg = item.content || item.message || item.prompt_input || '';
        const msgDiv = document.createElement('div');
        msgDiv.className = isUser ? 'msg-user' : 'msg-ai';

        if (isUser) {
          msgDiv.innerHTML = `<span style="font-weight: 700; font-size: 10px; color: #34d399; display: block; margin-bottom: 3px;">Você / Reunião</span>${formatarMarkdown(msg)}`;
        } else {
          msgDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <img src="/logo-oraculum-03.svg" alt="AI" style="width: 15px; height: 15px; object-fit: contain;" />
              <span style="font-weight: 700; font-size: 11px; color: #22d3ee;">Oraculum Live</span>
            </div>
            <div>${formatarMarkdown(msg)}</div>
          `;
        }
        feed.appendChild(msgDiv);
      });

      feed.scrollTop = feed.scrollHeight;
    } catch (err) {
      feed.innerHTML = `<div style="color: #f87171; font-size: 11.5px;">⚠️ Erro ao carregar histórico: ${err.message}</div>`;
    }
  }

  // Enviar Mensagem para o Chat Gemini
  async function enviarMensagem(textoPersonalizado) {
    const texto = (textoPersonalizado || input.value).trim();
    if (!texto) return;
    if (!textoPersonalizado) input.value = '';

    const { clientId, tenantId } = obterContextoAtivo();

    const userDiv = document.createElement('div');
    userDiv.className = 'msg-user';
    userDiv.innerHTML = `<span style="font-weight: 700; font-size: 10px; color: #34d399; display: block; margin-bottom: 3px;">Você / Reunião</span>${formatarMarkdown(texto)}`;
    feed.appendChild(userDiv);

    const aiDiv = document.createElement('div');
    aiDiv.className = 'msg-ai';
    aiDiv.style.fontStyle = 'italic';
    aiDiv.style.color = '#94a3b8';
    aiDiv.innerHTML = 'Analisando métricas de BI e formulando resposta...';
    feed.appendChild(aiDiv);
    feed.scrollTop = feed.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': tenantId },
        body: JSON.stringify({ clientId, message: texto, mode: 'bi_live' })
      });

      const data = await response.json();
      const respostaIA = data.reply || data.replyText || (typeof data.data === 'string' ? data.data : data.data?.replyText) || 'Sem resposta.';

      aiDiv.style.fontStyle = 'normal';
      aiDiv.style.color = '#e2e8f0';
      aiDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <img src="/logo-oraculum-03.svg" alt="AI" style="width: 15px; height: 15px; object-fit: contain;" />
          <span style="font-weight: 700; font-size: 11px; color: #22d3ee;">Oraculum Live</span>
        </div>
        <div>${formatarMarkdown(respostaIA)}</div>
      `;
      feed.scrollTop = feed.scrollHeight;

      if (window.supabaseClient && clientId !== 'default_client') {
        await window.supabaseClient.from('bi_chat_history').insert([
          { client_id: clientId, role: 'user', content: texto, prompt_input: texto, created_at: new Date().toISOString() },
          { client_id: clientId, role: 'assistant', content: respostaIA, response_output: respostaIA, created_at: new Date().toISOString() }
        ]);
      }
    } catch (err) {
      aiDiv.style.color = '#f87171';
      aiDiv.innerHTML = `⚠️ Erro na requisição: ${err.message}`;
    }
  }

  window.alternarOraculoLive = function () {
    const aberta = gaveta.classList.toggle('aberta');
    if (aberta) {
      carregarHistoricoDoBanco();
      setTimeout(() => input.focus(), 100);
    }
  };

  btnToggle.onclick = window.alternarOraculoLive;
  btnFechar.onclick = () => gaveta.classList.remove('aberta');
  btnEnv.onclick = () => enviarMensagem();
  input.onkeydown = (e) => { if (e.key === 'Enter') enviarMensagem(); };

  btnAta.onclick = () => {
    enviarMensagem('Analise os tópicos desta reunião e as métricas de BI e elabore uma ATA EXECUTIVA com: 1. Diagnóstico da Conta; 2. Principais Decisões Tomadas; 3. Próximos Passos com responsáveis.');
  };

  btnKanban.onclick = async () => {
    if (isProcessando) return;
    isProcessando = true;
    const { clientId, tenantId } = obterContextoAtivo();

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'background: rgba(234, 179, 8, 0.2); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 10px; padding: 10px; color: #fde047; font-size: 11.5px;';
    tempDiv.innerHTML = '⚙️ Extraindo tarefas acordadas para o Kanban...';
    feed.appendChild(tempDiv);
    feed.scrollTop = feed.scrollHeight;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-organization-id': tenantId },
        body: JSON.stringify({
          clientId,
          systemPrompt: 'Você é um extrator de tarefas. Retorne estritamente um array JSON puro: [ { "title": "...", "description": "...", "column": "backlog", "tag": "Trafego" } ].',
          message: 'Extraia as tarefas acordadas nesta reunião. Retorne APENAS o JSON puro sem crases.'
        })
      });

      const resData = await response.json();
      let tarefasStr = (resData.data || resData.reply || '[]').trim();
      let tarefas = [];

      try {
        // Tenta extrair um array JSON em qualquer parte da string (limpa a tagarelice da IA)
        const match = tarefasStr.match(/\[[\s\S]*\]/);
        if (match) {
          tarefas = JSON.parse(match[0]);
        } else {
          throw new Error('Nenhum array JSON encontrado na resposta da IA.');
        }
      } catch (parseError) {
        console.error("Erro no Parse do JSON do Kanban:", parseError, "Resposta bruta:", tarefasStr);
        throw new Error('A IA não retornou um formato estruturado válido.');
      }

      if (tarefas.length > 0 && window.supabaseClient) {
        const inserts = tarefas.map(t => ({
          client_id: clientId,
          tenant_id: tenantId,
          title: t.title,
          description: t.description,
          status: t.column || 'backlog',
          tags: [t.tag || 'Geral']
        }));
        await window.supabaseClient.from('kanban_tasks').insert(inserts);
        tempDiv.style.cssText = 'background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 10px; padding: 10px; color: #6ee7b7; font-size: 11.5px;';
        tempDiv.innerHTML = `✅ <strong>${tarefas.length} tarefas exportadas para o Kanban com sucesso!</strong>`;
      } else {
        tempDiv.innerHTML = 'Nenhuma tarefa identificada para exportação.';
      }
    } catch (err) {
      tempDiv.style.color = '#f87171';
      tempDiv.innerHTML = `Erro ao exportar tarefas: ${err.message}`;
    } finally {
      isProcessando = false;
    }
  };

  btnMic.onclick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Microfone requer Google Chrome ou Edge.");

    if (gravando) {
      if (recognition) recognition.stop();
      gravando = false;
      btnMic.style.background = '#1e293b';
      voiceIndicator.style.display = 'none';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      gravando = true;
      btnMic.style.background = '#ef4444';
      voiceIndicator.style.display = 'flex';
    };

    recognition.onresult = (e) => {
      let transcrito = '';
      for (let i = 0; i < e.results.length; ++i) transcrito += e.results[i][0].transcript;
      input.value = transcrito;
    };

    recognition.onend = () => {
      gravando = false;
      btnMic.style.background = '#1e293b';
      voiceIndicator.style.display = 'none';
      if (input.value.trim()) enviarMensagem();
    };

    recognition.start();
  };

  // Controle de Visibilidade
  function sincronizarVisibilidade() {
    const authGate = document.getElementById('auth-gate-container');
    const mainDash = document.getElementById('main-dashboard-container');
    const tabBi = document.getElementById('tab-bi');

    const estaNoLogin = (authGate && window.getComputedStyle(authGate).display !== 'none') ||
                        (mainDash && window.getComputedStyle(mainDash).display === 'none');

    if (estaNoLogin) {
      btnToggle.style.display = 'none';
      gaveta.classList.remove('aberta');
      return;
    }

    const isBiVisivel = tabBi && (
      tabBi.classList.contains('active') || 
      window.getComputedStyle(tabBi).display !== 'none'
    );

    if (isBiVisivel) {
      btnToggle.style.display = 'flex';
    } else {
      btnToggle.style.display = 'none';
      gaveta.classList.remove('aberta');
    }
  }

  sincronizarVisibilidade();
  setInterval(sincronizarVisibilidade, 300);
  document.addEventListener('click', () => setTimeout(sincronizarVisibilidade, 60));
})();
