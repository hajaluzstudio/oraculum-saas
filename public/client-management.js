// =======================================================
// GESTÃO CADASTRAL DE CLIENTES DA AGÊNCIA (MÓDULO ISOLADO)
// =======================================================

window.clientesMock = window.clientesMock || [];

// Helper para obter o cliente Supabase disponível globalmente
function getSupabaseClient() {
  if (typeof supabase !== 'undefined' && supabase.from) return supabase;
  if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
  if (window.supabase && window.supabase.from) return window.supabase;
  return null;
}

// 1. ABRIR MODAL DE CADASTRO / EDIÇÃO DE CLIENTE (Z-INDEX ABSOLUTO)
window.abrirModalNovoCliente = function(clientId = null) {
  console.log("[ClientManagement] Abrindo modal de cliente...", clientId);
  let modal = document.getElementById('modal-client-crud');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-client-crud';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    modal.innerHTML = `
      <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><i class="fa-solid fa-user-plus"></i></span>
            <h3 id="modal-client-title" class="text-lg font-bold text-white">Cadastrar Novo Cliente da Agência</h3>
          </div>
          <button type="button" onclick="window.fecharModalNovoCliente()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
        </div>

        <form id="form-client-crud" onsubmit="window.salvarCliente(event)" class="space-y-3 text-left">
          <input type="hidden" id="client-modal-id">

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome / Razão Social *</label>
              <input type="text" id="client-modal-name" required placeholder="Ex: Clínica Viana Plastia" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nicho de Mercado / Especialidade *</label>
              <input type="text" id="client-modal-niche" required placeholder="Ex: Médico Cirurgião Plástico" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome do Responsável / Contato</label>
              <input type="text" id="client-modal-contact-name" placeholder="Ex: Dr. Alexandre Viana" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
              <input type="text" id="client-modal-phone" placeholder="(11) 99999-8888" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Site Oficial (URL)</label>
              <input type="url" id="client-modal-website" placeholder="https://exemplo.com.br" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Instagram (@)</label>
              <input type="text" id="client-modal-instagram" placeholder="@nomedaclinica" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Ticket Médio Estimado (R$)</label>
              <input type="text" id="client-modal-avg-ticket" placeholder="Ex: 15.000,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Meta de Faturamento (R$)</label>
              <input type="text" id="client-modal-target-revenue" placeholder="Ex: 150.000,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <!-- BLOCO VISUAL: IDENTIFICADORES DE TRÁFEGO PAGO -->
          <div class="p-3 bg-slate-950/70 border border-emerald-500/20 rounded-xl space-y-2">
            <div class="flex items-center gap-2 mb-1">
              <i class="fa-solid fa-rectangle-ad text-emerald-400 text-xs"></i>
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Identificadores de Tráfego Pago & Tracking</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">ID Conta Meta Ads (act_...)</label>
                <input type="text" id="client-modal-meta-account" placeholder="Ex: act_123456789" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Meta Pixel ID</label>
                <input type="text" id="client-modal-meta-pixel" placeholder="Ex: 9876543210" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Google Ads Customer ID</label>
                <input type="text" id="client-modal-google-customer" placeholder="Ex: 123-456-7890" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Notas & Histórico da Agência Anterior</label>
            <textarea id="client-modal-notes" rows="3" placeholder="Informações relevantes do cliente, objeções do público, diferenciais e tom de voz..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500"></textarea>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button type="button" onclick="window.fecharModalNovoCliente()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-save-client-crud" class="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-slate-950 font-extrabold shadow-none rounded-xl text-sm transition-all cursor-pointer">Salvar Cliente</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('form-client-crud');
  if (form) form.reset();

  if (clientId) {
    const titleEl = document.getElementById('modal-client-title');
    if (titleEl) titleEl.innerText = 'Editar Ficha do Cliente';
    const client = (window.clientesMock || []).find(c => String(c.id) === String(clientId));
    if (client) {
      document.getElementById('client-modal-id').value = client.id;
      document.getElementById('client-modal-name').value = client.name || '';
      document.getElementById('client-modal-niche').value = client.niche || '';
      document.getElementById('client-modal-contact-name').value = client.contact_name || '';
      document.getElementById('client-modal-phone').value = client.phone || '';
      document.getElementById('client-modal-website').value = client.website || '';
      document.getElementById('client-modal-instagram').value = client.instagram || '';
      document.getElementById('client-modal-avg-ticket').value = client.avg_ticket || '';
      document.getElementById('client-modal-target-revenue').value = client.target_revenue || '';
      document.getElementById('client-modal-meta-account').value = client.meta_ad_account_id || client.meta_account_id || '';
      document.getElementById('client-modal-meta-pixel').value = client.meta_pixel_id || '';
      document.getElementById('client-modal-google-customer').value = client.google_customer_id || '';
      // Extract plain text from notes — never expose raw JSON to the textarea
      let notesText = client.notes || client.actual_notes || client.previous_agency_notes || '';
      if (notesText && notesText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(notesText);
          notesText = parsed.actual_notes || parsed.notes || parsed.text || JSON.stringify(parsed);
        } catch (_) { /* keep original if unparseable */ }
      }
      document.getElementById('client-modal-notes').value = notesText;
    }
  } else {
    const titleEl = document.getElementById('modal-client-title');
    if (titleEl) titleEl.innerText = 'Cadastrar Novo Cliente da Agência';
    document.getElementById('client-modal-id').value = '';
    const inputMetaAcc = document.getElementById('client-modal-meta-account');
    const inputMetaPix = document.getElementById('client-modal-meta-pixel');
    const inputGogCust = document.getElementById('client-modal-google-customer');
    if (inputMetaAcc) inputMetaAcc.value = '';
    if (inputMetaPix) inputMetaPix.value = '';
    if (inputGogCust) inputGogCust.value = '';
  }

  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('z-index', '999999', 'important');
  modal.classList.remove('hidden');
};

// 2. FECHAR MODAL DE CLIENTE
window.fecharModalNovoCliente = function() {
  const modal = document.getElementById('modal-client-crud');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.add('hidden');
  }
};

// 3. SALVAR CLIENTE (SUPABASE DIRETO — SEM JSON ENCAPSULADO)
window.salvarCliente = async function(e) {
  if (e) e.preventDefault();

  const id       = document.getElementById('client-modal-id').value;
  const name     = document.getElementById('client-modal-name')?.value.trim()    || '';
  const niche    = document.getElementById('client-modal-niche')?.value.trim()   || '';
  const contact_name  = document.getElementById('client-modal-contact-name')?.value.trim() || '';
  const phone    = document.getElementById('client-modal-phone')?.value.trim()   || '';
  const website  = document.getElementById('client-modal-website')?.value.trim() || '';
  const instagram = document.getElementById('client-modal-instagram')?.value.trim() || '';
  const avg_ticket     = document.getElementById('client-modal-avg-ticket')?.value.trim()     || '0';
  const target_revenue = document.getElementById('client-modal-target-revenue')?.value.trim() || '0';
  const meta_ad_account_id  = document.getElementById('client-modal-meta-account')?.value.trim()     || '';
  const meta_pixel_id       = document.getElementById('client-modal-meta-pixel')?.value.trim()       || '';
  const google_customer_id  = document.getElementById('client-modal-google-customer')?.value.trim()  || '';
  // Texto limpo — nunca JSON encapsulado
  const cleanNotes = document.getElementById('client-modal-notes')?.value.trim() || '';

  const btn = document.getElementById('btn-save-client-crud');
  if (btn) {
    btn.innerText = 'Salvando...';
    btn.disabled = true;
  }

  try {
    const activeTenantId = (typeof window.getTenantAgencyId === 'function') ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const supaClient = getSupabaseClient();
    let errDetail = '';

    if (id) {
      // UPDATE DIRETO NO SUPABASE (evita rotas /api/ que retornam 404)
      if (!supaClient) {
        alert('⚠️ Supabase não inicializado. Não foi possível salvar.');
        return;
      }
      const payload = {
        name,
        niche,
        contact_name,
        phone,
        website,
        instagram,
        avg_ticket: parseFloat(String(avg_ticket).replace(',', '.')) || 0,
        target_revenue: parseFloat(String(target_revenue).replace(',', '.')) || 0,
        meta_ad_account_id,
        meta_pixel_id,
        google_customer_id,
        notes: cleanNotes,
        previous_agency_notes: cleanNotes,
        updated_at: new Date().toISOString()
      };
      const { error: updateError } = await supaClient
        .from('clients')
        .update(payload)
        .eq('id', id);
      if (updateError) {
        alert('❌ Erro ao atualizar cliente no Supabase: ' + updateError.message);
        return;
      }
    } else {
     // INSERT DIRETO NO SUPABASE (fonte primária, sem API intermediária)
    const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
    const session = sessionStr ? JSON.parse(sessionStr) : {};
    const currentAgencyId = session.agencyId || session.id || (typeof window.getTenantAgencyId === 'function' ? window.getTenantAgencyId() : null);

    const insertPayload = {
        name, niche, contact_name, phone, website, instagram,
        avg_ticket: parseFloat(String(avg_ticket).replace(',', '.')) || 0,
        target_revenue: parseFloat(String(target_revenue).replace(',', '.')) || 0,
        meta_ad_account_id, meta_pixel_id, google_customer_id,
        notes: cleanNotes,
        previous_agency_notes: cleanNotes,
        agency_id: currentAgencyId, // <-- Vincula obrigatoriamente à agência logada
        updated_at: new Date().toISOString()
    };

      if (supaClient) {
        const { error: insertError } = await supaClient
          .from('clients')
          .insert([insertPayload]);
        if (insertError) {
          // Fallback: tenta via API REST
          try {
            const activeTenantId = (typeof window.getTenantAgencyId === 'function') ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
            const response = await fetch('/api/clients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-organization-id': activeTenantId },
              body: JSON.stringify(insertPayload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
              alert('❌ Erro ao cadastrar cliente: ' + (insertError.message || data.error || 'Erro desconhecido'));
              return;
            }
          } catch (apiErr) {
            alert('❌ Erro de rede ao cadastrar: ' + apiErr.message);
            return;
          }
        }
      } else {
        // Sem Supabase — tenta API diretamente
        try {
          const activeTenantId = (typeof window.getTenantAgencyId === 'function') ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
          const response = await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-organization-id': activeTenantId },
            body: JSON.stringify(insertPayload)
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.success) {
            alert('⚠️ Falha ao cadastrar cliente: ' + (data.error || 'Erro desconhecido'));
            return;
          }
        } catch (apiErr) {
          alert('⚠️ Erro de rede ao cadastrar: ' + apiErr.message);
          return;
        }
      }
    }

    window.fecharModalNovoCliente();
    await window.carregarClientesDoSupabase();
    alert(`🎉 Cliente "${name}" gravado no Supabase do Oraculum!`);
    
  } catch (err) {
    console.error('Erro ao salvar cliente:', err);
    window.fecharModalNovoCliente();
    window.renderizarListaClientes();
    window.atualizarSeletorClientesOnboarding();
    alert('✅ Cliente salvo com sucesso!');
  } finally {
    if (btn) {
      btn.innerText = 'Salvar Cliente';
      btn.disabled = false;
    }
  }
};

// 4. EXCLUIR CLIENTE DA CARTEIRA
window.excluirCliente = async function(clientId) {
  if (confirm('Tem certeza que deseja excluir este cliente da carteira? Todos os dossiês associados permanecerão no histórico.')) {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('clients').delete().eq('id', clientId);
      }
      window.clientesMock = (window.clientesMock || []).filter(c => String(c.id) !== String(clientId));
      window.renderizarListaClientes();
      window.atualizarSeletorClientesOnboarding();
      alert('🗑️ Cliente removido com sucesso!');
    } catch(err) {
      window.clientesMock = (window.clientesMock || []).filter(c => String(c.id) !== String(clientId));
      window.renderizarListaClientes();
      window.atualizarSeletorClientesOnboarding();
    }
  }
};

// 5. CARREGAR DADOS DO CLIENTE NO FORMULÁRIO DE ONBOARDING
window.carregarDadosClienteNoOnboarding = function(clientId) {
  if (!clientId) return;
  // Delega toda a sincronia bidirecional para o Maestro Global
  if (typeof window.setActiveClient === 'function') {
    window.setActiveClient(clientId);
    return;
  }
  // Fallback legado (caso setActiveClient ainda não esteja disponível)
  const list = window.clientesMock || [];
  const client = list.find(c => String(c.id) === String(clientId));
  
  if (client) {
    const inputName = document.getElementById('client-name');
    const inputNiche = document.getElementById('client-niche');
    const inputWebsite = document.getElementById('client-website');
    const inputNotes = document.getElementById('previous-agency-notes') || document.getElementById('briefing-notes');

    if (inputName) inputName.value = client.name || '';
    if (inputNiche) inputNiche.value = client.niche || '';
    if (inputWebsite) inputWebsite.value = client.website || '';
    if (inputNotes) inputNotes.value = client.previous_agency_notes || client.notes || '';

    // Atualiza o seletor de cliente ativo no header
    const activeClientSelect = document.getElementById('active-client-select');
    if (activeClientSelect) {
      if (!Array.from(activeClientSelect.options).some(opt => opt.value === client.id)) {
        const opt = document.createElement('option');
        opt.value = client.id;
        opt.textContent = `${client.name} (${client.niche})`;
        opt.style.background = '#0d121d';
        opt.style.color = '#F1F5F9';
        activeClientSelect.appendChild(opt);
      }
      activeClientSelect.value = client.id;
    }

    const chatLabel = document.getElementById('chat-active-client-label');
    if (chatLabel) chatLabel.textContent = `${client.name} (${client.niche})`;
    
    console.log(`[Onboarding] Cliente "${client.name}" carregado para Onboarding.`);
    
    if (window.selectActiveClient) {
      window.selectActiveClient(client.id);
    }
  }
};

// 6. ATUALIZAR SELETOR DE CLIENTES NO ONBOARDING E HEADER
window.atualizarSeletorClientesOnboarding = function() {
  const selectOnboarding = document.getElementById('select-onboarding-client');
  const selectHeader = document.getElementById('active-client-select');
  const list = window.clientesMock || [];

  if (selectOnboarding) {
    selectOnboarding.innerHTML = '<option value="">-- Selecione o Cliente para o Onboarding --</option>';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.niche})`;
      selectOnboarding.appendChild(opt);
    });
  }

  if (selectHeader) {
    selectHeader.innerHTML = '';
    if (list.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Nenhum cliente ativo';
      opt.style.background = '#0d121d';
      opt.style.color = '#94A3B8';
      selectHeader.appendChild(opt);
    } else {
      list.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.name} (${c.niche})`;
        opt.style.background = '#0d121d';
        opt.style.color = '#F1F5F9';
        selectHeader.appendChild(opt);
      });
    }
  }
};

// 7. RENDERIZAR TABELA DE CLIENTES DA CARTEIRA
window.renderizarListaClientes = function() {
  const container = document.getElementById('clients-table-body');
  if (!container) return;

  const list = window.clientesMock || [];

  // Atualiza métricas da carteira
  const elTotal = document.getElementById('client-metric-total');
  const elNiches = document.getElementById('client-metric-niches');
  const elRevenue = document.getElementById('client-metric-revenue');

  const uniqueNiches = new Set(list.map(c => c.niche).filter(Boolean));
  const totalRevSum = list.reduce((sum, c) => {
    const rev = parseFloat(String(c.target_revenue || 0).replace('.', '').replace(',', '.'));
    return sum + (isNaN(rev) ? 0 : rev);
  }, 0);

  if (elTotal) elTotal.textContent = String(list.length);
  if (elNiches) elNiches.textContent = String(uniqueNiches.size);
  if (elRevenue) elRevenue.textContent = `R$ ${totalRevSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Nenhum cliente cadastrado na carteira. Clique em "+ Novo Cliente" para começar.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td class="py-3 px-4 font-semibold text-white">
        <div>${c.name}</div>
        <div class="text-xs text-slate-400 font-normal">${c.contact_name ? 'Resp: ' + c.contact_name : 'Sem responsável'}</div>
      </td>
      <td class="py-3 px-4 text-emerald-400">
        <span class="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs">${c.niche || 'Geral'}</span>
      </td>
      <td class="py-3 px-4 text-slate-400 font-sans">
        <div>${c.phone || '-'}</div>
        <div class="text-xs text-slate-500">${c.contact_name || '-'}</div>
      </td>
      <td class="py-3 px-4 text-slate-300 text-xs font-semibold">
        <div>${c.avg_ticket ? 'Ticket: R$ ' + c.avg_ticket : 'Ticket: -'}</div>
        <div class="text-xs text-emerald-400">${c.target_revenue ? 'Meta: R$ ' + c.target_revenue : ''}</div>
      </td>
      <td class="py-3 px-4 text-xs text-slate-400">
        <div>${c.website ? `<a href="${c.website}" target="_blank" class="text-emerald-400 hover:underline"><i class="fa-solid fa-globe"></i> ${c.website.replace('https://','')}</a>` : '-'}</div>
        <div class="text-xs text-slate-500">${c.instagram ? `<i class="fa-brands fa-instagram"></i> ${c.instagram}` : ''}</div>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalNovoCliente('${c.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer">Editar</button>
        <button onclick="window.excluirCliente('${c.id}')" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition-colors cursor-pointer">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// Extrai texto limpo de notes (suporte a legado com JSON bruto)
function sanitizeNotes(raw) {
  if (!raw) return '';
  const str = String(raw).trim();
  if (str.startsWith('{')) {
    try {
      const parsed = JSON.parse(str);
      return parsed.actual_notes || parsed.notes || parsed.text || str;
    } catch (_) {}
  }
  return str;
}

// 8. BUSCAR CLIENTES DO SUPABASE / BACKEND
window.carregarClientesDoSupabase = async function() {
  const activeTenantId = (typeof window.getTenantAgencyId === 'function') ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
  const supaClient = getSupabaseClient();
  let loaded = false;

  // FONTE PRIMÁRIA: Supabase direto
  if (supaClient) {
    try {
      const { data, error } = await supaClient
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        // Sanitiza notes legadas em todos os registros
        window.clientesMock = data.map(c => ({ ...c, notes: sanitizeNotes(c.notes) }));
        window.clientsList = window.clientesMock;
        loaded = true;
      }
    } catch (e) {
      console.warn('[ClientManagement] Supabase direto falhou, tentando API...', e);
    }
  }

  // FALLBACK: API REST
  if (!loaded) {
    try {
      const res = await fetch(`${window.location.origin}/api/clients`, {
        headers: { 'x-organization-id': activeTenantId }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        window.clientesMock = data.data.map(c => ({ ...c, notes: sanitizeNotes(c.notes) }));
        window.clientsList = window.clientesMock;
      }
    } catch(e) {
      console.warn('[ClientManagement] Usando cache local para lista de clientes.');
    }
  }

  window.renderizarListaClientes();
  window.atualizarSeletorClientesOnboarding();
};

document.addEventListener('DOMContentLoaded', () => {
  window.carregarClientesDoSupabase();
});


