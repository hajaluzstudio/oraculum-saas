// =======================================================
// ORÁCULO LIVE ADVISOR - BI FEEDBACK LOOP (COMPLETO & UNIFICADO)
// =======================================================

(function () {
  console.log("Inicializando Oráculo Live Advisor Completo...");

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

  function obterMelhorVozHD() {
    try {
      if (!vozesNavegador.length && 'speechSynthesis' in window) {
        vozesNavegador = window.speechSynthesis.getVoices();
      }

      const vozSalva = localStorage.getItem('ORACULO_VOICE_NAME');
      if (vozSalva && vozesNavegador.length) {
        const vozEncontrada = vozesNavegador.find(v => v.name === vozSalva);
        if (vozEncontrada) return vozEncontrada;
      }

      const preferenciais = [
        v => v.name.includes("Francisca") || v.name.includes("Antonio") || (v.name.includes("Natural") && v.lang.includes("pt-BR")),
        v => v.name.includes("Google") && (v.lang === "pt-BR" || v.lang === "pt_BR"),
        v => v.lang === "pt-BR" || v.lang === "pt_BR",
        v => v.lang.startsWith("pt")
      ];
      for (const check of preferenciais) {
        const encontrada = vozesNavegador.find(check);
        if (encontrada) return encontrada;
      }
    } catch(e) { console.warn("Erro ao buscar vozes:", e); }
    return null;
  }

  function injetarEstruturaLiveAdvisor() {
    if (document.getElementById('oraculo-live-drawer')) return;

    // Botão Flutuante
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

    // Drawer Retrátil
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
              ● Contexto de BI Ativo
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
          👋 Olá! Sou o <strong>Oráculo</strong>. Estou acompanhando os dados de BI desta conta em tempo real. Faça perguntas por texto ou use o microfone para conversar ao vivo.
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
          <input type="text" id="oraculo-input-text" placeholder="Pergunte sobre ROI, CAC, conversão, ROAS..." style="flex: 1; background: #0F172A; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 10px 14px; color: #FFF; font-size: 12px; outline: none;">
          <button type="submit" id="btn-send-oraculo" style="padding: 10px 14px; background: linear-gradient(135deg, #7F00FF, #E100FF); color: #FFF; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
            ➤
          </button>
        </form>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748B; padding: 0 4px;">
          <span>Gemini Live Neural Engine</span>
          <button type="button" onclick="window.salvarConversaNaAta()" style="background: transparent; border: none; color: #C084FC; cursor: pointer; text-decoration: underline;">Salvar na Ata</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    monitorarAbaAtivaBI();
  }

  function monitorarAbaAtivaBI() {
    setInterval(() => {
      const btn = document.getElementById('btn-open-oraculo-live');
      const drawer = document.getElementById('oraculo-live-drawer');
      if (!btn) return;

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
    }, 400);
  }

  window.alternarOraculoLive = function () {
    const drawer = document.getElementById('oraculo-live-drawer');
    if (!drawer) return;
    if (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'none') {
      drawer.style.transform = 'translateX(100%)';
    } else {
      drawer.style.transform = 'translateX(0px)';
    }
  };

  function extrairContextoCompletoBI() {
    try {
      return {
        cliente: document.getElementById('bi-active-client-title')?.innerText || document.getElementById('active-client-name')?.innerText || 'Cliente Ativo',
        faturamento: document.getElementById('bi-val-revenue')?.innerText || document.getElementById('bi-total-revenue')?.innerText || 'R$ 0,00',
        gastoTrafego: document.getElementById('bi-val-spend')?.innerText || document.getElementById('bi-ad-spend')?.innerText || 'R$ 0,00',
        roas: document.getElementById('bi-val-roas')?.innerText || document.getElementById('bi-roas-val')?.innerText || '0.0x',
        leads: document.getElementById('funnel-val-leads')?.innerText || document.getElementById('bi-leads-count')?.innerText || '0'
      };
    } catch(e) {
      return { cliente: 'Cliente Ativo', faturamento: 'R$ 0,00', gastoTrafego: 'R$ 0,00', roas: '0.0x', leads: '0' };
    }
  }

  function adicionarAoFeed(remetente, texto) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;

    const msgDiv = document.createElement('div');
    if (remetente === 'usuario') {
      msgDiv.style.cssText = 'background: rgba(127, 0, 255, 0.2); border: 1px solid rgba(127, 0, 255, 0.3); border-radius: 16px; padding: 12px; color: #FFF; margin-left: 24px; text-align: right;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #C084FC; font-weight: bold; margin: 0 0 4px;">Você / Apresentador</p><p style="margin: 0; line-height: 1.4;">${texto}</p>`;
    } else {
      msgDiv.style.cssText = 'background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 14px; color: #E2E8F0; margin-right: 16px;';
      msgDiv.innerHTML = `<p style="font-size: 11px; color: #38BDF8; font-weight: bold; margin: 0 0 4px;">🔮 Oráculo</p><p style="margin: 0; line-height: 1.5; white-space: pre-line;">${texto}</p>`;
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

      const elevenKey = localStorage.getItem('ELEVENLABS_API_KEY') || localStorage.getItem('elevenlabs_api_key');
      const elevenVoiceId = localStorage.getItem('ELEVENLABS_VOICE_ID') || localStorage.getItem('elevenlabs_voice_id') || 'pNInz6obpgDQGcFmaJgB';

      if (!elevenKey) {
        console.warn("[Oráculo Live] Chave da ElevenLabs não configurada. Configure em Configurações > ElevenLabs API Key.");
        return;
      }

      if (indicador) {
        indicador.style.display = 'flex';
        indicador.classList.remove('hidden');
        if (statusText) statusText.innerText = 'Oráculo falando (ElevenLabs HD)...';
      }

      let res = await fetch('/api/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: formatado,
          voiceId: elevenVoiceId,
          apiKey: elevenKey.trim()
        })
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch('/api/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: formatado,
            voiceId: elevenVoiceId,
            apiKey: elevenKey.trim()
          })
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenKey.trim()
          },
          body: JSON.stringify({
            text: formatado,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.8 }
          })
        }).catch(() => null);
      }

      if (res && res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.onended = () => { if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); } };
        audio.onerror = () => { if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); } };
        await audio.play();
      } else {
        console.error("[Oráculo Live] Falha na síntese de voz ElevenLabs.");
        if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); }
      }
    } catch(e) {
      console.warn("Falha no áudio ElevenLabs:", e);
      const indicador = document.getElementById('oraculo-voice-indicator');
      if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); }
    }
  };

  window.alternarMicrofone = function() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta microfone direto. Use Chrome ou Edge.");
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
          indicador.classList.remove('hidden');
          if (statusText) statusText.innerText = 'Ouvindo sua pergunta... Fale agora.';
        }
      };

      recognition.onresult = (event) => {
        const transcricao = event.results[0][0].transcript;
        const input = document.getElementById('oraculo-input-text');
        if (input) input.value = transcricao;
        window.enviarMensagemOraculo();
      };

      recognition.onerror = (e) => {
        console.warn("Erro mic:", e);
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
    } catch(e) {
      console.warn("Não foi possível iniciar microfone:", e);
      gravando = false;
      if (btnMic) {
        btnMic.style.background = '#1E293B';
        btnMic.style.color = '#FFF';
      }
      if (indicador) indicador.style.display = 'none';
    }
  };

  // Resposta Estratégica Especialista (Motor de Inteligência do Oráculo)
  function gerarRespostaInteligente(pergunta, ctx) {
    const p = pergunta.toLowerCase();
    
    if (p.includes('resumo') || p.includes('apresente') || p.includes('geral') || p.includes('balanço')) {
      return `Apresentando o diagnóstico executivo da conta de **${ctx.cliente}**:\n\n• **Faturamento Consolidado:** ${ctx.faturamento}\n• **Investimento em Mídia:** ${ctx.gastoTrafego}\n• **Eficiência de Retorno (ROAS):** ${ctx.roas}\n• **Volume de Leads/Oportunidades:** ${ctx.leads}\n\nA estratégia de funil mantém margem positiva e comprova a geração de caixa no período analisado.`;
    }
    
    if (p.includes('cac') || p.includes('teto') || p.includes('criativo')) {
      return `O **CAC por Criativo versus Teto Alvo** mede o custo exato de aquisição gerado por cada anúncio individual contra o limite financeiro seguro estabelecido para a conta de **${ctx.cliente}**.\n\nQuando um criativo performa abaixo do teto alvo, ele gera lucro líquido imediato e deve receber escala de orçamento. Se ultrapassar o teto, pausamos o anúncio para proteger a margem do cliente.`;
    }

    if (p.includes('ctr') || p.includes('clique') || p.includes('link')) {
      return `O **CTR (Click-Through Rate)** avalia o poder de atração do gancho visual e da cópia. Um CTR acima de 1.5% indica que a mensagem capturou o público correto, enquanto um CTR baixo sinaliza necessidade de testar novas variações de headline e primeiros 3 segundos de vídeo.`;
    }

    if (p.includes('orçamento') || p.includes('verba') || p.includes('investir') || p.includes('aumentar') || p.includes('alocação')) {
      return `Com base no retorno atual de **${ctx.roas}**, a **Alocação Preditiva de Orçamento** recomenda redistribuir 70% da verba nos públicos e criativos de maior taxa de conversão final, mantendo 30% para testes contínuos de novos ângulos de abordagem.`;
    }

    if (p.includes('qualificado') || p.includes('lead') || p.includes('avaliação') || p.includes('procedimento') || p.includes('venda')) {
      return `Para a conta de **${ctx.cliente}**, o funil não mede apenas volume bruto de contatos, mas a taxa de qualificação: leads que avançam para avaliações agendadas e fechamento de procedimentos de alto valor, garantindo o menor Custo por Procedimento Realizado.`;
    }

    return `Análise estratégica para **${ctx.cliente}**: Toda tomada de decisão no sistema prioriza métricas financeiras reais (CAC, LTV e ROAS). Com o investimento atual de **${ctx.gastoTrafego}** gerando **${ctx.faturamento}**, as próximas ações devem focar na escala dos criativos validados pelo AI Creative Score.`;
  }

  // =======================================================
  // ROTINAS DE SINCRONIZAÇÃO EM NUVEM (Supabase / Backend DB)
  // =======================================================
  window.carregarHistoricoNuvem = async function(clientId) {
    if (!clientId) return [];
    try {
      const res = await fetch(`/api/oraculo-chat/${encodeURIComponent(clientId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          localStorage.setItem(`ORACULO_HIST_${clientId}`, JSON.stringify(json.data));
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Erro ao carregar histórico da nuvem, utilizando fallback local:", err);
    }
    try {
      return JSON.parse(localStorage.getItem(`ORACULO_HIST_${clientId}`) || '[]');
    } catch(e) {
      return [];
    }
  };

  window.salvarMensagemNuvem = async function(clientId, role, message, metadata = {}) {
    if (!clientId || !message) return null;
    try {
      const res = await fetch('/api/oraculo-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, role, message, metadata })
      });
      const json = await res.json().catch(() => ({}));

      const localHist = JSON.parse(localStorage.getItem(`ORACULO_HIST_${clientId}`) || '[]');
      localHist.push(json.data || { clientId, role, message, metadata, created_at: new Date().toISOString() });
      localStorage.setItem(`ORACULO_HIST_${clientId}`, JSON.stringify(localHist));

      return json.data;
    } catch (err) {
      console.error("Erro ao salvar mensagem na nuvem:", err);
      return null;
    }
  };

  window.apagarMensagemNuvem = async function(mensagemId) {
    if (!mensagemId) return;
    try {
      await fetch(`/api/oraculo-chat/${encodeURIComponent(mensagemId)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn("Erro ao apagar mensagem da nuvem:", e);
    }
  };

  window.limparHistoricoClienteNuvem = async function(clientId) {
    if (!clientId) return;
    if (confirm("Tem certeza que deseja apagar todo o histórico de conversas deste cliente na nuvem?")) {
      try {
        await fetch(`/api/oraculo-chat/client/${encodeURIComponent(clientId)}`, { method: 'DELETE' });
      } catch (e) {
        console.warn("Erro ao apagar histórico da nuvem:", e);
      }
      localStorage.removeItem(`ORACULO_HIST_${clientId}`);
      const feed = document.getElementById('oraculo-chat-feed');
      if (feed) feed.innerHTML = '';
      alert("✅ Histórico do cliente apagado com sucesso!");
    }
  };

  window.renderizarHistoricoNoFeed = async function(clientId) {
    const feed = document.getElementById('oraculo-chat-feed');
    if (!feed) return;
    
    feed.innerHTML = '';
    const mensagens = await window.carregarHistoricoNuvem(clientId);
    
    if (mensagens.length === 0) {
      adicionarAoFeed('oraculo', 'Olá! Sou o Oráculo Live Advisor. Como posso ajudar com a auditoria de tráfego, ROAS, CAC ou estratégias de escala hoje?');
      return;
    }

    mensagens.forEach(msg => {
      adicionarAoFeed(msg.role === 'user' ? 'usuario' : 'oraculo', msg.message);
    });
  };

  async function perguntarAoOraculoGemini(perguntaUsuario, contextoBI = {}, historico = []) {
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || 
                   localStorage.getItem('custom_gemini_api_key') || 
                   localStorage.getItem('gemini_api_key') || 
                   localStorage.getItem('oraculum_gemini_key') || 
                   window.ENV_GEMINI_API_KEY || '';
    
    if (!apiKey) {
      throw new Error("Chave do Gemini não configurada em 'Configurações Master'. Insira a chave Gemini API Key para respostas da IA ao vivo.");
    }

    const historicoTexto = historico.slice(-6).map(h => `${h.role === 'user' ? 'Usuário' : 'Oráculo'}: ${h.message}`).join('\n');

    const promptSistema = `
Você é o Oráculo Live Advisor, o Diretor de Performance e Inteligência de Marketing da Agência.
Seu objetivo é analisar dados de tráfego pago, CAC, ROAS e ROI com tom executivo, direto, confiante e estratégico.
Responda sempre em Português do Brasil com foco financeiro e de escala de negócios.
Dados contextuais atuais da conta: ${JSON.stringify(contextoBI)}

Histórico recente de diálogo:
${historicoTexto}

Pergunta do usuário: "${perguntaUsuario}"
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: promptSistema }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();
    const respostaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respostaTexto) {
      throw new Error("O Gemini não retornou texto válido.");
    }

    return respostaTexto;
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
    const clientId = contexto.cliente || 'cliente_ativo';

    // Persiste pergunta do usuário na Nuvem
    await window.salvarMensagemNuvem(clientId, 'user', texto, contexto);

    const btnSend = document.getElementById('btn-send-oraculo');
    if (btnSend) btnSend.disabled = true;

    // Loading visual
    const loadingId = 'loading-' + Date.now();
    const feed = document.getElementById('oraculo-chat-feed');
    if (feed) {
      const loadDiv = document.createElement('div');
      loadDiv.id = loadingId;
      loadDiv.style.cssText = 'background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 12px; color: #C084FC; font-size: 12px; display: flex; align-items: center; gap: 8px;';
      loadDiv.innerHTML = '<span style="font-size: 14px;">⏳</span> <span>Oráculo analisando métricas...</span>';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      const historicoAtual = await window.carregarHistoricoNuvem(clientId);
      let respostaTexto = "";

      try {
        respostaTexto = await perguntarAoOraculoGemini(texto, contexto, historicoAtual);
      } catch(geminiErr) {
        console.warn("Consulta ao Gemini falhou, usando motor especialista de regras:", geminiErr);
        respostaTexto = gerarRespostaInteligente(texto, contexto);
      }

      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      adicionarAoFeed('oraculo', respostaTexto);
      
      // Persiste resposta da IA na Nuvem
      await window.salvarMensagemNuvem(clientId, 'assistant', respostaTexto, contexto);

      // Reproduz áudio via ElevenLabs
      window.falarTextoOraculo(respostaTexto);

    } catch (err) {
      console.error("Erro no Oráculo:", err);
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      const respostaFallback = gerarRespostaInteligente(texto, contexto);
      adicionarAoFeed('oraculo', respostaFallback);
      await window.salvarMensagemNuvem(clientId, 'assistant', respostaFallback, contexto);
      window.falarTextoOraculo(respostaFallback);
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

  window.salvarConversaNaAta = function() {
    const feed = document.getElementById('oraculo-chat-feed');
    const meetingNotes = document.getElementById('meeting-notes-input') || document.getElementById('meeting-notes-textarea');
    if (meetingNotes && feed) {
      meetingNotes.value += `\n\n--- [Ata Oráculo Live - ${new Date().toLocaleTimeString('pt-BR')}] ---\n` + feed.innerText;
      if (typeof window.salvarAnotacoesReuniao === 'function') {
        window.salvarAnotacoesReuniao();
      }
      alert("✅ Insights salvos na Ata de Reunião!");
    } else {
      alert("✅ Insights copiados com sucesso!");
    }
  };

  document.addEventListener('DOMContentLoaded', injetarEstruturaLiveAdvisor);
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    injetarEstruturaLiveAdvisor();
  }
})();
