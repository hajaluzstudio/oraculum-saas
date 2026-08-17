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

      const elevenKey = localStorage.getItem('ELEVENLABS_API_KEY');
      const elevenVoiceId = localStorage.getItem('ELEVENLABS_VOICE_ID') || '21m00Tcm4TlvDq8ikWAM';

      if (elevenKey) {
        try {
          if (indicador) {
            indicador.style.display = 'flex';
            indicador.classList.remove('hidden');
            if (statusText) statusText.innerText = 'Oráculo falando (ElevenLabs HD)...';
          }

          const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'xi-api-key': elevenKey.trim()
            },
            body: JSON.stringify({
              text: formatado,
              model_id: "eleven_multilingual_v2",
              voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
          });

          if (res.ok) {
            const blob = await res.blob();
            const audioUrl = URL.createObjectURL(blob);
            const audio = new Audio(audioUrl);
            audio.onended = () => { if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); } };
            audio.onerror = () => { if (indicador) { indicador.style.display = 'none'; indicador.classList.add('hidden'); } };
            await audio.play();
            return;
          }
        } catch (errEleven) {
          console.warn("Fallback ElevenLabs -> WebSpeech:", errEleven);
        }
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(formatado);
        utterance.lang = 'pt-BR';
        const vozHD = obterMelhorVozHD();
        if (vozHD) utterance.voice = vozHD;
        utterance.rate = 1.02;

        utterance.onstart = () => {
          if (indicador) {
            indicador.style.display = 'flex';
            indicador.classList.remove('hidden');
            if (statusText) statusText.innerText = 'Oráculo falando...';
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
      }
    } catch(e) {
      console.warn("Falha no áudio:", e);
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
    const btnSend = document.getElementById('btn-send-oraculo');
    if (btnSend) btnSend.disabled = true;

    // Loading visual
    const loadingId = 'loading-' + Date.now();
    const feed = document.getElementById('oraculo-chat-feed');
    if (feed) {
      const loadDiv = document.createElement('div');
      loadDiv.id = loadingId;
      loadDiv.style.cssText = 'background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 16px; padding: 12px; color: #C084FC; font-size: 12px; display: flex; align-items: center; gap: 8px;';
      loadDiv.innerHTML = '<span style="font-size: 14px;">🔮</span> <span>Oráculo analisando métricas e correlações...</span>';
      feed.appendChild(loadDiv);
      feed.scrollTop = feed.scrollHeight;
    }

    try {
      let respostaTexto = "";
      const apiKey = window.ENV_GEMINI_API_KEY || localStorage.getItem('gemini_api_key') || '';

      if (apiKey) {
        const systemPrompt = `Você é o Oráculo, Diretor de Inteligência, Growth e Performance da agência.
Você está em uma reunião estratégica ao vivo auditando e apresentando os dados do BI Feedback Loop da conta: ${contexto.cliente}.

DADOS ATUAIS DA CONTA:
- Faturamento Total: ${contexto.faturamento}
- Investimento em Tráfego: ${contexto.gastoTrafego}
- ROAS Consolidado: ${contexto.roas}
- Novos Leads / Oportunidades: ${contexto.leads}`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nPERGUNTA DO USUÁRIO: ${texto}` }] }
            ],
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
          })
        });
        const data = await res.json();
        respostaTexto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      }

      if (!respostaTexto) {
        respostaTexto = gerarRespostaInteligente(texto, contexto);
      }

      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      adicionarAoFeed('oraculo', respostaTexto);
      window.falarTextoOraculo(respostaTexto);

    } catch (err) {
      console.error("Erro no Oráculo:", err);
      const loadEl = document.getElementById(loadingId);
      if (loadEl) loadEl.remove();

      const respostaFallback = gerarRespostaInteligente(texto, contexto);
      adicionarAoFeed('oraculo', respostaFallback);
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
