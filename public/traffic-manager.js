// =======================================================
// GESTÃO DE TRÁFEGO PAGO (Recepção de Criativos do Kanban)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  window.carregarAtivosEntreguesTrafego = async function() {
    const container = document.getElementById('traffic-creatives-list');
    if (!container) return;

    const rawId = window.activeClientId || window.currentClientId || localStorage.getItem('oraculum_active_client_id') || 'client_1787406730';
    const numericId = String(rawId).replace('client_', '');
    const idComPrefixo = `client_${numericId}`;
    const clientIds = [rawId, numericId, idComPrefixo];

    let rawTasks = [];

    // 1. Busca direta e limpa no Supabase (apenas por client_id para não gerar 400)
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('kanban_tasks')
          .select('*')
          .in('client_id', clientIds)
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          rawTasks = data;
        }
      } catch(err) {
        console.warn('[Traffic Manager] Erro ao buscar tarefas do Supabase:', err);
      }
    }

    // 2. Fallback / Merge com localStorage
    const keysToCheck = [
      `kanban_tasks_${rawId}`,
      `kanban_tasks_${numericId}`,
      `oraculum_kanban_cards_${rawId}`,
      `oraculum_kanban_${rawId}`,
      'oraculum_kanban_cards_client_1787406730'
    ];
    
    for (const k of keysToCheck) {
      const localStr = localStorage.getItem(k);
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            rawTasks = [...rawTasks, ...parsed];
          }
        } catch(e) {}
      }
    }

    // Remove duplicatas por ID ou título
    const uniqueTasks = [];
    const seen = new Set();
    for (const t of rawTasks) {
      const key = t.id || t.title;
      if (key && !seen.has(key)) {
        seen.add(key);
        uniqueTasks.push(t);
      }
    }

    // 3. Filtragem flexível em memória (JavaScript) para entregues/concluídos
    const statusEntreguesValidos = ['entregues', 'completed', 'delivered', 'archived_traffic', '6', 'pronto', 'published'];
    const cards = uniqueTasks.filter(c => {
      const st = String(c.status || c.stage || c.column_id || c.coluna || '').toLowerCase();
      return statusEntreguesValidos.some(valid => st.includes(valid));
    });

    // Se não encontrar nenhum card veiculável
    if (cards.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-400 bg-[#040c0b] border border-slate-800/80 rounded-xl text-xs">
          Nenhum criativo aguardando veiculação no momento. Conclua entregas na <strong class="text-emerald-400">Trilha de Equipe & Kanban</strong> para despachar materiais para cá.
        </div>
      `;
      return;
    }

    // 4. Renderização dos cards entregues
    container.innerHTML = cards.map(c => {
      const driveLink = c.drive_url || c.asset_url || (c.description && c.description.match(/https:\/\/drive\.google\.com[^\s\n]+/)?.[0]) || '';
      const safeText = (c.description || c.content || c.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
      const tagNome = (c.tags && c.tags[0]) || (c.category || 'COPYWRITING').toUpperCase();

      return `
        <div class="p-4 bg-[#05110f] border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1.5 flex-1 pr-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-[9px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 rounded uppercase tracking-wider">
                ${tagNome}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">${new Date(c.created_at || Date.now()).toLocaleDateString('pt-BR')}</span>
            </div>
            <h5 class="text-xs font-bold text-white">${c.title || 'Material Criativo'}</h5>
            <p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">${c.description || c.content || ''}</p>
          </div>

          <div class="flex flex-wrap items-center gap-2 flex-shrink-0">
            ${driveLink ? `
              <a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all">
                <i class="fa-brands fa-google-drive"></i> Abrir Drive
              </a>
            ` : ''}
            <button type="button" onclick="navigator.clipboard.writeText('${safeText}'); alert('📋 Conteúdo e Copy copiados com sucesso!');" class="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all">
              <i class="fa-regular fa-copy"></i> Copiar Texto
            </button>
            <button type="button" onclick="window.marcarCriativoVeiculado('${c.id}')" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20">
              <i class="fa-solid fa-check"></i> Marcar Veiculado
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  window.marcarCriativoVeiculado = async function(taskId) {
    if (window.supabaseClient && taskId) {
      try {
        await window.supabaseClient
          .from('kanban_tasks')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', taskId);
      } catch(e) {
        console.warn('[Traffic Manager] Erro ao marcar veiculado:', e);
      }
    }
    alert('✅ Material marcado como veiculado e arquivado com sucesso!');
    window.carregarAtivosEntreguesTrafego();
  };

  // Escuta a troca de abas e evento do kanban
  window.addEventListener('cardSentToTraffic', window.carregarAtivosEntreguesTrafego);
  window.addEventListener('clientChanged', () => setTimeout(window.carregarAtivosEntreguesTrafego, 100));

  // Carrega na montagem
  setTimeout(window.carregarAtivosEntreguesTrafego, 500);
});
