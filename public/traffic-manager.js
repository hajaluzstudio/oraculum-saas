// =======================================================
// GESTÃO DE TRÁFEGO PAGO (Recepção de Criativos do Kanban)
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
  const wrTrafficContent = document.getElementById('wr-traffic-content');
  if (!wrTrafficContent) return;

  // Cria o container para a lista de criativos despachados
  const creativesContainer = document.createElement('div');
  creativesContainer.id = 'traffic-creatives-list';
  creativesContainer.style.marginTop = '24px';
  creativesContainer.innerHTML = `
    <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #10B981;">
      <i class="fa-solid fa-rocket"></i> Criativos Prontos para Subida
    </h3>
    <div id="traffic-creatives-grid" style="display: flex; flex-direction: column; gap: 12px;"></div>
  `;
  wrTrafficContent.appendChild(creativesContainer);

  const creativesGrid = document.getElementById('traffic-creatives-grid');

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
            <i class="fa-regular fa-copy"></i> Copiar Copy
          </button>
          <button type="button" onclick="this.parentElement.parentElement.style.opacity='0.5'; this.innerText='Publicado!'" style="flex: 1; background: rgba(16,185,129,0.15); color: #10B981; border: 1px solid rgba(16,185,129,0.3); padding: 6px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">
            <i class="fa-solid fa-check"></i> Marcar como Publicado
          </button>
        </div>
      </div>
    `;
  }

  window.loadArchivedTrafficCards = function() {
    const activeClientId = window.currentClientId || localStorage.getItem('oraculum_active_client_id');
    if (!activeClientId) return;
    
    let cards = [];
    const saved = localStorage.getItem(`oraculum_kanban_${activeClientId}`);
    if (saved) cards = JSON.parse(saved);

    const trafficCards = cards.filter(c => c.stage === 'archived_traffic');
    if (trafficCards.length > 0) {
      creativesGrid.innerHTML = trafficCards.map(renderTrafficCard).join('');
    } else {
      creativesGrid.innerHTML = `<p style="font-size: 12px; color: #64748B;">Nenhum criativo aguardando subida.</p>`;
    }
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
