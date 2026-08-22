// =======================================================
// GESTÃO DE TRÁFEGO PAGO (Recepção de Criativos do Kanban)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  const wrTrafficPanel = document.getElementById('wr-traffic');
  if (!wrTrafficPanel) return;

  // Cria o container para a lista de criativos despachados
  const creativesContainer = document.createElement('div');
  creativesContainer.id = 'traffic-ready-creatives-container';
  creativesContainer.className = 'card-glass mt-4';
  creativesContainer.style.marginTop = '24px';
  creativesContainer.innerHTML = `
    <h3>📦 Criativos Prontos para Subida de Anúncios</h3>
    <div id="traffic-creatives-list" class="space-y-3 mt-3" style="display: flex; flex-direction: column; gap: 12px;"></div>
  `;
  wrTrafficPanel.appendChild(creativesContainer);

  const creativesGrid = document.getElementById('traffic-creatives-list');

  function renderTrafficCard(card) {
    const isVideo = card.asset_type?.toLowerCase().includes('v') || card.title.toLowerCase().includes('vídeo');
    const typeBadge = isVideo ? '🎬 Vídeo' : '🎨 Estático';
    
    return `
      <div class="card-glass" style="padding: 14px; border: 1px solid rgba(16,185,129,0.3); border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; background: rgba(16,185,129,0.15); color: #10B981; padding: 2px 8px; border-radius: 4px;">${typeBadge}</span>
          <span style="font-size: 11px; color: #94A3B8;">ID: ${card.id.substring(0,6)}</span>
        </div>
        <h4 style="font-size: 14px; font-weight: 600; color: #FFF; margin-bottom: 8px;">${card.title}</h4>
        
        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 12px; color: #CBD5E1; max-height: 80px; overflow-y: auto;">
          <strong>Headline / Copy Sugerida:</strong><br>
          ${card.description || 'Nenhuma copy descrita.'}
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button type="button" onclick="navigator.clipboard.writeText('${(card.description || '').replace(/'/g, "\\'")}')" style="flex: 1; background: rgba(59,130,246,0.15); color: #3B82F6; border: 1px solid rgba(59,130,246,0.3); padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
            📋 Copiar Texto do Anúncio
          </button>
          <button type="button" onclick="window.markTrafficCardPublished('${card.id}')" style="flex: 1; background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
            ✅ Marcar como Veiculado no Gerenciador
          </button>
        </div>
      </div>
    `;
  }

  window.loadArchivedTrafficCards = async function() {
    const container = document.getElementById('traffic-creatives-list');
    if (!container) return;

    container.innerHTML = '<p class="text-sm text-emerald-400">⏳ Conectando ao Supabase e carregando criativos...</p>';

    if (!window.supabaseClient) {
      container.innerHTML = '<div class="p-3 bg-red-950/80 border border-red-500 rounded text-red-300 text-xs">⚠️ <strong>Erro:</strong> window.supabaseClient não inicializado.</div>';
      return;
    }

    try {
      const { data, error } = await window.supabaseClient
        .from('kanban_cards')
        .select('*')
        .eq('status', 'archived_traffic')
        .order('id', { ascending: false });

      if (error) {
        console.error("[Traffic Error] Falha na consulta:", error);
        container.innerHTML = `
          <div class="p-3 bg-red-950/80 border border-red-500 rounded text-red-300 text-xs">
            <strong>❌ Erro ao consultar Supabase:</strong> ${error.message} (Código: ${error.code || 'N/A'})
            <br><span class="text-gray-400">Detalhe: ${error.details || error.hint || 'Verifique o schema/RLS'}</span>
          </div>`;
        return;
      }

      if (!data || data.length === 0) {
        container.innerHTML = `
          <div class="text-sm text-gray-400 flex justify-between items-center py-2">
            <span>Nenhum criativo aguardando veiculação no momento.</span>
            <button onclick="window.injectTestTrafficCard()" class="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs rounded border border-emerald-500/40">🧪 Injetar Card de Teste</button>
          </div>`;
        return;
      }

      container.innerHTML = data.map(c => `
        <div class="card-glass p-4 rounded-lg flex justify-between items-center border border-emerald-500/30 mb-3 bg-black/40">
          <div>
            <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold tracking-wide uppercase">${c.type === 'design' ? '🎨 DESIGN' : '🎬 VÍDEO'}</span>
            <h4 class="text-sm font-semibold text-white mt-1.5">${c.title || 'Sem título'}</h4>
            <p class="text-xs text-gray-300 mt-1 max-w-xl line-clamp-3">${c.description || ''}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="navigator.clipboard.writeText('${(c.description || '').replace(/'/g, "\\'")}'); alert('Copy copiada!');" class="btn-xs btn-secondary">📋 Copiar Copy</button>
            <button onclick="window.markTrafficCardPublished('${c.id}')" class="btn-xs btn-primary">✅ Marcar Veiculado</button>
          </div>
        </div>
      `).join('');

    } catch (err) {
      console.error("[Traffic Catch Exception]:", err);
      container.innerHTML = `<div class="p-3 bg-red-950/80 border border-red-500 rounded text-red-300 text-xs">💥 <strong>Exceção:</strong> ${err.message}</div>`;
    }
  }

  // Injetor de Card Fictício para teste de ponta a ponta
  window.injectTestTrafficCard = async function() {
    if (!window.supabaseClient) {
      alert("Erro: Supabase não inicializado.");
      return;
    }

    const dummyCard = {
      title: "🎬 [TESTE AUTÔNOMO] Vídeo Rinoplastia Dr. Lucas",
      description: "Gancho: Você sabia que a recuperação não precisa ser dolorosa? CTA: Agende sua avaliação no link da bio.",
      status: "archived_traffic",
      type: "video",
      client_id: window.currentClientId || "cliente-teste"
    };

    const { data, error } = await window.supabaseClient
      .from('kanban_cards')
      .insert([dummyCard])
      .select();

    if (error) {
      alert("❌ ERRO AO INSERIR NO SUPABASE:\\n" + error.message + "\\nCódigo: " + error.code + "\\nDetalhes: " + (error.details || error.hint || ''));
      console.error("Erro detalhado:", error);
    } else {
      alert("✅ Card fictício inserido com sucesso no Supabase!");
      window.loadArchivedTrafficCards();
    }
  };

  window.markTrafficCardPublished = async function(cardId) {
    if (!window.supabaseClient) return;
    const { error } = await window.supabaseClient
      .from('kanban_cards')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', cardId);

    if (error) {
      alert("Erro ao marcar como veiculado: " + error.message);
    } else {
      window.loadArchivedTrafficCards();
    }
  };

  // Escuta a troca de abas e evento do kanban
  window.addEventListener('cardSentToTraffic', window.loadArchivedTrafficCards);
  window.addEventListener('clientChanged', () => setTimeout(window.loadArchivedTrafficCards, 100));

  // Carrega na montagem
  setTimeout(window.loadArchivedTrafficCards, 500);
});
