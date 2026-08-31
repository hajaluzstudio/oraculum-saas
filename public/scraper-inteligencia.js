window.carregarPortalInteligencia = async function() {
  const activeClientId = localStorage.getItem('oraculum_active_client_id') || localStorage.getItem('oraculum_active_client') || window.currentClientId;
  const list = window.globalClientsList || window.clientesMock || [];
  const clienteAtivo = list.find(c => String(c.id) === String(activeClientId));

  const elNiche = document.getElementById('intel-niche-name');
  const elDate = document.getElementById('intel-last-scraped');
  const elTrends = document.getElementById('intel-trends-list');
  const elCompliance = document.getElementById('intel-compliance-box');
  const elPlayers = document.getElementById('intel-players-grid');

  if (!clienteAtivo) {
    if(elNiche) elNiche.innerText = "Nenhum cliente selecionado";
    return;
  }

  if(elNiche) elNiche.innerText = clienteAtivo.niche;

  const supaClient = typeof getSupabaseClient === 'function' ? getSupabaseClient() : window.supabaseClient;
  if (!supaClient) return;

  const { data, error } = await supaClient
    .from('market_intelligence_feed')
    .select('scraper_data, created_at')
    .eq('niche', clienteAtivo.niche)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data && data.scraper_data) {
    const output = data.scraper_data;
    if(elDate) {
      const dataVarredura = data.created_at ? new Date(data.created_at) : new Date();
      elDate.innerText = dataVarredura.toLocaleString('pt-BR');
    }

    window.renderizarPortalInteligenciaVisual(output);
  } else {
    if(elDate) elDate.innerText = "Nenhuma varredura recente";
    if(elTrends) elTrends.innerHTML = '<li class="p-3 bg-gray-900/60 rounded-xl border border-gray-800 text-gray-400">Aguardando varredura...</li>';
    if(elCompliance) elCompliance.innerHTML = '<p class="p-3 bg-gray-900/60 rounded-xl border border-gray-800 text-gray-400">Aguardando varredura...</p>';
    if(elPlayers) elPlayers.innerHTML = '<div class="p-4 bg-gray-900/60 rounded-xl border border-gray-800 text-gray-400">Aguardando varredura...</div>';
  }
};

window.renderizarPortalInteligenciaVisual = function(dossierData) {
  if (!dossierData) return;

  // 1. Tendências Globais
  const containerTendencias = document.getElementById('lista-tendencias-portal');
  if (containerTendencias) {
    containerTendencias.innerHTML = (dossierData.marketTrends || []).map((tItem, index) => {
      const isStr = typeof tItem === 'string';
      const trendTitle = isStr ? tItem : tItem.trend;
      const justification = isStr ? 'Contexto aprofundado não disponível nesta versão antiga da varredura.' : tItem.justification;
      const strategy = isStr ? '' : `\\n\\n🎯 Ação Estratégica: ${tItem.strategicAction}`;
      return `
      <div onclick="abrirLeituraDetalhada('Tendência Global #${index + 1}', \`${justification}${strategy}\`, 'Relatório analítico extraído via monitoramento autônomo da web.')" 
           class="p-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-emerald-500/50 rounded-lg cursor-pointer transition flex items-center justify-between group">
        <span class="text-sm text-gray-200 group-hover:text-emerald-300">⚡ ${trendTitle}</span>
        <span class="text-xs text-emerald-400 opacity-0 group-hover:opacity-100 transition font-medium whitespace-nowrap ml-3">Ler Detalhes &rarr;</span>
      </div>
      `;
    }).join('');
  }

  // 2. Compliance
  const containerCompliance = document.getElementById('lista-compliance-portal');
  if (containerCompliance) {
    const renderComplianceItem = (item, typeStr, color) => {
      const isStr = typeof item === 'string';
      const title = isStr ? item : (item.claim || item.disclaimer || item.rule);
      const explanation = isStr ? 'Explicação detalhada não disponível na varredura antiga.' : item.explanation;
      return `
        <div onclick="abrirLeituraDetalhada('${typeStr}', \`${explanation}\`, 'Diretriz legal e de conformidade')" class="mt-1 cursor-pointer hover:bg-${color}-500/10 p-1.5 rounded transition flex justify-between items-center group">
          <span class="text-xs text-gray-300 group-hover:text-${color}-300">&bull; ${title}</span>
          <span class="text-[10px] text-${color}-400 opacity-0 group-hover:opacity-100 font-bold ml-2">Ler &rarr;</span>
        </div>
      `;
    };

    const forbiddenList = dossierData.regulatoryCompliance?.forbiddenClaims || [];
    const forbiddenHtml = forbiddenList.length > 0 
      ? forbiddenList.map(f => renderComplianceItem(f, 'Alegação Proibida', 'red')).join('') 
      : '<p class="text-xs text-gray-500">Nenhuma restrição crítica.</p>';

    const mandatoryList = dossierData.regulatoryCompliance?.mandatoryDisclaimers || [];
    const mandatoryHtml = mandatoryList.length > 0 
      ? mandatoryList.map(m => renderComplianceItem(m, 'Aviso Obrigatório', 'emerald')).join('') 
      : '<p class="text-xs text-gray-500">Nenhum aviso obrigatório.</p>';

    containerCompliance.innerHTML = `
      <div class="p-3 bg-gray-800/50 rounded-lg border border-red-500/20 mb-2">
        <strong class="text-red-400 text-xs uppercase block mb-1">Alegações Proibidas (Forbidden Claims):</strong>
        ${forbiddenHtml}
      </div>
      <div class="p-3 bg-gray-800/50 rounded-lg border border-emerald-500/20">
        <strong class="text-emerald-400 text-xs uppercase block mb-1">Avisos Obrigatórios (Mandatory Disclaimers):</strong>
        ${mandatoryHtml}
      </div>
    `;
  }

  // 3. Players
  const containerPlayers = document.getElementById('lista-players-portal');
  if (containerPlayers) {
    containerPlayers.innerHTML = (dossierData.topPlayers || []).map((player, index) => `
      <div onclick="abrirLeituraDetalhada('Raio-X do Concorrente: ${player.name}', 'Posição de Mercado:\\n${player.marketPosition}\\n\\nPadrão de Copy Identificado:\\n${player.copyPattern}\\n\\nEstrutura de Oferta:\\n${player.highTicketOfferStructure}\\n\\nLinguagem de Posicionamento:\\n${player.positioningLanguage}', 'Análise estratégica de posicionamento obtida via varredura de mercado.')"
           class="p-4 bg-gray-800/40 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/50 rounded-xl cursor-pointer transition flex flex-col justify-between">
        <div>
          <span class="text-xs font-bold text-purple-400 uppercase tracking-wider">Player #${index + 1}</span>
          <h4 class="text-white font-semibold text-sm mt-1">${player.name || 'Concorrente Principal'}</h4>
          <p class="text-xs text-gray-400 mt-2 line-clamp-2">${player.marketPosition || ''}</p>
        </div>
        <div class="mt-4 pt-2 border-t border-gray-700/40 flex items-center justify-between text-xs text-purple-300">
          <span>Ver Dossiê Completo</span>
          <span>&rarr;</span>
        </div>
      </div>
    `).join('');
  }

  // 4. Feed de Matérias Clicáveis
  const containerFeed = document.getElementById('feed-materias-web');
  if (containerFeed) {
    if (dossierData.newsFeed && dossierData.newsFeed.length > 0) {
      containerFeed.innerHTML = dossierData.newsFeed.map(news => {
        const linkBtn = (news.url && news.url !== '#' && news.url !== 'URL indisponível') 
          ? `<a href="${news.url}" target="_blank" onclick="event.stopPropagation()" class="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] whitespace-nowrap ml-2 border border-gray-700">Ler na Íntegra 🔗</a>` 
          : '';
        const timeText = news.publishedAt ? `Publicado: ${news.publishedAt}` : (news.timeAgo || 'Recente');
        
        return `
        <div onclick="abrirLeituraDetalhada('Matéria: ${news.title.replace(/'/g, "\\'")}', '${news.summary.replace(/'/g, "\\'")}', 'Fonte: ${news.source.replace(/'/g, "\\'")}')" 
             class="p-3 bg-gray-950/60 hover:bg-gray-800/60 border border-gray-800 hover:border-emerald-500/40 rounded-lg cursor-pointer transition flex flex-col md:flex-row md:items-center justify-between text-xs gap-3">
          <div class="flex items-center gap-3 flex-1">
            <span class="px-2 py-1 ${news.type?.toLowerCase().includes('tend') ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'} rounded font-medium whitespace-nowrap">${news.type || 'Notícia'}</span>
            <span class="text-gray-300 font-medium line-clamp-2 md:line-clamp-1">${news.title || 'Artigo de Inteligência'}</span>
            ${linkBtn}
          </div>
          <span class="text-gray-500 whitespace-nowrap md:text-right">${timeText}</span>
        </div>
      `}).join('');
    } else {
      containerFeed.innerHTML = '<p class="text-gray-400 text-sm italic">Nenhuma notícia ou tendência recente encontrada para este nicho.</p>';
    }
  }
};

window.abrirLeituraDetalhada = function(titulo, conteudoPrincipal, contextualizacao) {
  const modal = document.getElementById('modal-leitura-inteligencia');
  const elTitulo = document.getElementById('modal-titulo-leitura');
  const elConteudo = document.getElementById('modal-conteudo-leitura');

  if (elTitulo) elTitulo.innerText = titulo;
  if (elConteudo) {
    // Se a função marked existir, usa ela para renderizar o markdown, caso contrário usa regex simples para links
    let parsedContent = conteudoPrincipal;
    if (typeof marked !== 'undefined') {
      parsedContent = marked.parse(conteudoPrincipal);
    } else {
      parsedContent = conteudoPrincipal.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-emerald-400 hover:underline">$1</a>');
    }
    
    elConteudo.innerHTML = `
      <div class="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg mb-4">
        <p class="text-xs text-emerald-300 font-medium">Contexto da IA: ${contextualizacao}</p>
      </div>
      <div class="prose prose-invert prose-emerald max-w-none text-gray-100 text-sm leading-relaxed">${parsedContent}</div>
    `;
  }
  if (modal) modal.classList.remove('hidden');
};

window.fecharModalLeituraInteligencia = function() {
  const modal = document.getElementById('modal-leitura-inteligencia');
  if (modal) modal.classList.add('hidden');
};

window.copiarRelatorioModal = function() {
  const texto = document.getElementById('modal-conteudo-leitura').innerText;
  navigator.clipboard.writeText(texto);
  alert("📋 Relatório copiado para a área de transferência!");
};

window.dispararScraperInteligencia = async function() {
  console.log("🟢 Botão clicado. Solicitando inteligência ao servidor...");
  
  const activeClientId = localStorage.getItem('oraculum_active_client_id') || localStorage.getItem('oraculum_active_client') || window.currentClientId;
  const list = window.globalClientsList || window.clientesMock || [];
  const clienteAtivo = list.find(c => String(c.id) === String(activeClientId));

  if (!clienteAtivo) {
    alert("⚠️ Selecione um cliente ativo primeiro na carteira.");
    return;
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`🚀 Varredura iniciada para: ${clienteAtivo.niche}. Aguarde o servidor processar.`, 'info');
  } else {
    alert(`🚀 Varredura iniciada para: ${clienteAtivo.niche}. Aguarde o servidor processar.`);
  }

  try {
    // Faz a requisição para a rota segura na Vercel
    const apiRes = await fetch('/api/autonomous-scraper/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ niche: clienteAtivo.niche, clientId: clienteAtivo.id })
    });

    const data = await apiRes.json();

    if (!apiRes.ok || !data.success) {
      throw new Error(data.error || "Erro desconhecido no servidor ao rodar o scraper.");
    }

    if (typeof window.showToast === 'function') {
      window.showToast("🎉 Inteligência de mercado atualizada com sucesso!", "success");
    } else {
      alert("🎉 Inteligência de mercado atualizada com sucesso!");
    }
    
    if (typeof window.carregarPortalInteligencia === 'function') {
      window.carregarPortalInteligencia();
    }
  } catch (err) {
    if (typeof window.showToast === 'function') {
      window.showToast("⚠️ Erro: " + err.message, "error");
    } else {
      alert("⚠️ Erro: " + err.message);
    }
  }
};
