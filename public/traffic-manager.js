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

  window.markTrafficCardPublished = async function(cardId) {
    if (window.supabaseClient) {
      try {
        const { error } = await window.supabaseClient
          .from('kanban_cards')
          .update({ status: 'published', updated_at: new Date().toISOString() })
          .eq('id', cardId);
        if (!error) {
          window.loadArchivedTrafficCards();
        }
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
      }
    }
  };

  window.loadArchivedTrafficCards = async function() {
    const container = document.getElementById('traffic-creatives-list');
    if (!container) return;

    let cards = [];
    if (window.supabaseClient) {
      const { data, error } = await window.supabaseClient
        .from('kanban_cards')
        .select('*')
        .eq('status', 'archived_traffic')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        cards = data;
      }
    }

    if (!cards || cards.length === 0) {
      container.innerHTML = '<p class="text-sm text-gray-400">Nenhum criativo aguardando veiculação no momento.</p>';
      return;
    }

    container.innerHTML = cards.map(c => `
      <div class="card-glass p-4 rounded-lg flex justify-between items-center border border-emerald-500/30 mb-3 bg-black/40">
        <div>
          <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold tracking-wide uppercase">${c.type === 'design' ? '🎨 DESIGN' : '🎬 VÍDEO'}</span>
          <h4 class="text-sm font-semibold text-white mt-1.5">${c.title}</h4>
          <p class="text-xs text-gray-300 mt-1 max-w-xl line-clamp-3">${c.description}</p>
        </div>
        <div class="flex gap-2 shrink-0">
          <button onclick="navigator.clipboard.writeText('${(c.description || '').replace(/'/g, "\\'")}'); alert('Copy copiada com sucesso!');" class="btn-xs btn-secondary">📋 Copiar Copy</button>
          <button onclick="window.markTrafficCardPublished('${c.id}')" class="btn-xs btn-primary">✅ Marcar Veiculado</button>
        </div>
      </div>
    `).join('');
  }

  // Escuta o evento desacoplado do Kanban
  window.addEventListener('cardSentToTraffic', (e) => {
    window.loadArchivedTrafficCards();
  });

  // Escuta a seleção de um novo cliente
  window.addEventListener('clientChanged', (e) => {
    setTimeout(window.loadArchivedTrafficCards, 100);
  });

  // Carrega na montagem
  setTimeout(window.loadArchivedTrafficCards, 500);
});
