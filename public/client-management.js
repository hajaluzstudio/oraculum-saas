// =======================================================
// GESTÃO CADASTRAL DE CLIENTES DA AGÊNCIA (MÓDULO ISOLADO)
// =======================================================

window.clientesMock = window.clientesMock || [];
window.clientsList = window.clientsList || [];

// Helper para obter o cliente Supabase global
function getSupabaseClient() {
  if (typeof supabase !== 'undefined' && supabase.from) return supabase;
  if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
  if (window.supabase && window.supabase.from) return window.supabase;
  return null;
}

// Extrai texto limpo das anotações (evita erro de JSON bruto na tela)
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

// 1. ABRIR MODAL DE CADASTRO / EDIÇÃO DE CLIENTE
window.abrirModalNovoCliente = function(clientId = null) {
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
            <h3 id="modal-client-title" class="text-lg font-bold text-white">Cadastrar Novo Cliente</h3>
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
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nicho / Especialidade *</label>
              <input type="text" id="client-modal-niche" required placeholder="Ex: Médico Cirurgião Plástico" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Contato / Responsável</label>
              <input type="text" id="client-modal-contact-name" placeholder="Ex: Dr. Alexandre Viana" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
              <input type="text" id="client-modal-phone" placeholder="(11) 99999-8888" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Site Oficial</label>
              <input type="url" id="client-modal-website" placeholder="https://exemplo.com.br" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Instagram (@)</label>
              <input type="text" id="client-modal-instagram" placeholder="@nomedaclinica" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Ticket Médio (R$)</label>
              <input type="text" id="client-modal-avg-ticket" placeholder="Ex: 15.000,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Meta de Faturamento (R$)</label>
              <input type="text" id="client-modal-target-revenue" placeholder="Ex: 150.000,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="p-3 bg-slate-950/70 border border-emerald-500/20 rounded-xl space-y-2">
            <div class="flex items-center gap-2 mb-1">
              <i class="fa-solid fa-rectangle-ad text-emerald-400 text-xs"></i>
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider">Tráfego & Tracking</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">ID Meta Ads</label>
                <input type="text" id="client-modal-meta-account" placeholder="act_123456789" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Meta Pixel ID</label>
                <input type="text" id="client-modal-meta-pixel" placeholder="9876543210" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Google Ads ID</label>
                <input type="text" id="client-modal-google-customer" placeholder="123-456-7890" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Notas & Histórico</label>
            <textarea id="client-modal-notes" rows="3" placeholder="Informações relevantes..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500"></textarea>
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
    const client = window.clientesMock.find(c => String(c.id) === String(clientId));
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
      document.getElementById('client-modal-notes').value = sanitizeNotes(client.notes || client.previous_agency_notes);
    }
  } else {
    const titleEl = document.getElementById('modal-client-title');
    if (titleEl) titleEl.innerText = 'Cadastrar Novo Cliente da Agência';
    document.getElementById('client-modal-id').value = '';
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

// 3. SALVAR CLIENTE (Com Fallback API blindado contra RLS)
window.salvarCliente = async function(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('client-modal-id').value;
  const name = document.getElementById('client-modal-name')?.value.trim() || '';
  const niche = document.getElementById('client-modal-niche')?.value.trim() || '';
  const contact_name = document.getElementById('client-modal-contact-name')?.value.trim() || '';
  const phone = document.getElementById('client-modal-phone')?.value.trim() || '';
  const website = document.getElementById('client-modal-website')?.value.trim() || '';
  const instagram = document.getElementById('client-modal-instagram')?.value.trim() || '';
  const avg_ticket = document.getElementById('client-modal-avg-ticket')?.value.trim() || '0';
  const target_revenue = document.getElementById('client-modal-target-revenue')?.value.trim() || '0';
  const meta_ad_account_id = document.getElementById('client-modal-meta-account')?.value.trim() || '';
  const meta_pixel_id = document.getElementById('client-modal-meta-pixel')?.value.trim() || '';
  const google_customer_id = document.getElementById('client-modal-google-customer')?.value.trim() || '';
  const cleanNotes = document.getElementById('client-modal-notes')?.value.trim() || '';

  const btn = document.getElementById('btn-save-client-crud');
  if (btn) { btn.innerText = 'Salvando...'; btn.disabled = true; }

  try {
    const supaClient = getSupabaseClient();
    const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
    const session = sessionStr ? JSON.parse(sessionStr) : {};
    
    const isMaster = session.role === 'master' || session.email === 'hajaluzstudio@gmail.com';
    let currentAgencyId = session.agency_id || session.agencyId || session.id || session.agencyUuid;

    // Resgate de ID automático se faltar na sessão da agência
    if (!isMaster && !currentAgencyId && session.email && supaClient) {
      try {
        const { data: agData } = await supaClient.from('agencies').select('id').eq('email_billing', session.email).single();
        if (agData) {
          currentAgencyId = agData.id;
          session.agency_id = agData.id;
          sessionStorage.setItem('oraculum_session', JSON.stringify(session));
        }
      } catch(e) { console.warn('Falha no resgate de ID', e); }
    }

    if (!isMaster && !currentAgencyId) {
      alert('❌ Erro de sessão: ID da agência não identificado. Faça login novamente.');
      return;
    }

    const masterFallbackId = (typeof window.getTenantAgencyId === 'function') ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
    const finalAgencyId = isMaster ? (currentAgencyId || masterFallbackId) : currentAgencyId;

    const payload = {
      name, niche, contact_name, phone, website, instagram,
      avg_ticket: parseFloat(String(avg_ticket).replace(',', '.')) || 0,
      target_revenue: parseFloat(String(target_revenue).replace(',', '.')) || 0,
      meta_ad_account_id, meta_pixel_id, google_customer_id,
      notes: cleanNotes,
      previous_agency_notes: cleanNotes,
      agency_id: finalAgencyId,
      updated_at: new Date().toISOString()
    };

    let sucesso = false;
    let erroDetalhe = '';

    // TENTATIVA 1: Supabase Direto
    if (supaClient) {
      if (id) {
        const { error } = await supaClient.from('clients').update(payload).eq('id', id);
        if (!error) sucesso = true; else erroDetalhe = error.message;
      } else {
        const { error } = await supaClient.from('clients').insert([payload]);
        if (!error) sucesso = true; else erroDetalhe = error.message;
      }
    }

    // TENTATIVA 2: Fallback API REST (Bypassa RLS se necessário)
    if (!sucesso) {
      try {
        const res = await fetch('/api/clients', {
          method: id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', 'x-organization-id': finalAgencyId },
          body: JSON.stringify(id ? { ...payload, id } : payload)
        });
        const data = await res.json();
        if (res.ok && data.success) sucesso = true;
      } catch (err) {
        erroDetalhe = err.message;
      }
    }

    if (sucesso) {
      window.fecharModalNovoCliente();
      await window.carregarClientesDoSupabase();
      alert(`🎉 Cliente "${name}" salvo com sucesso!`);
    } else {
      alert('❌ Falha ao salvar cliente. Verifique permissões RLS. Erro: ' + erroDetalhe);
    }
  } catch (err) {
    alert('❌ Erro crítico: ' + err.message);
  } finally {
    if (btn) { btn.innerText = 'Salvar Cliente'; btn.disabled = false; }
  }
};

// 4. EXCLUIR CLIENTE
window.excluirCliente = async function(clientId) {
  if (confirm('Tem certeza que deseja excluir este cliente da carteira?')) {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('clients').delete().eq('id', clientId);
      }
      window.carregarClientesDoSupabase();
      alert('🗑️ Cliente removido com sucesso!');
    } catch(err) {
      console.error('Erro ao excluir:', err);
    }
  }
};

// 5. CARREGAR DADOS DO CLIENTE NO ONBOARDING
window.carregarDadosClienteNoOnboarding = function(clientId) {
  if (!clientId) return;
  if (typeof window.setActiveClient === 'function') {
    window.setActiveClient(clientId);
    return;
  }
  const client = window.clientesMock.find(c => String(c.id) === String(clientId));
  if (client && window.selectActiveClient) {
    window.selectActiveClient(client.id);
  }
};

// 6. ATUALIZAR SELETOR DE CLIENTES NO ONBOARDING E HEADER
window.atualizarSeletorClientesOnboarding = function() {
  const selectOnboarding = document.getElementById('select-onboarding-client');
  const selectHeader = document.getElementById('active-client-select');
  
  // A variável window.clientesMock JÁ FOI filtrada pelo passo 8
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
      opt.textContent = 'Nenhum cliente cadastrado';
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

// 8. BUSCAR CLIENTES DO SUPABASE (Extrai tudo e filtra no front com Fallback Seguro)
window.carregarClientesDoSupabase = async function() {
  const supaClient = getSupabaseClient();
  let rawData = [];
  let fetchedData = false;

  const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
  const session = sessionStr ? JSON.parse(sessionStr) : {};
  const isMaster = session.role === 'master' || session.email === 'hajaluzstudio@gmail.com';
  let currentAgencyId = session.agency_id || session.agencyId || session.id || session.agencyUuid;

  // Auto-resgate do ID via email
  if (!isMaster && !currentAgencyId && session.email && supaClient) {
    try {
      const { data: agData } = await supaClient.from('agencies').select('id').eq('email_billing', session.email).single();
      if (agData) {
        currentAgencyId = agData.id;
        session.agency_id = agData.id;
        sessionStorage.setItem('oraculum_session', JSON.stringify(session));
      }
    } catch (err) {}
  }

  const activeTenantId = currentAgencyId || (typeof window.getTenantAgencyId === 'function' ? window.getTenantAgencyId() : 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104');

  // TENTATIVA 1: Bater direto no Supabase (Pode ser bloqueado pelo RLS)
  if (supaClient) {
    try {
      const { data, error } = await supaClient.from('clients').select('*').order('created_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        rawData = data;
        fetchedData = true;
      }
    } catch (e) {}
  }

  // TENTATIVA 2: Fallback API REST (Bypassa o RLS via backend)
  if (!fetchedData) {
    try {
      const res = await fetch(`${window.location.origin}/api/clients`, {
        headers: { 'x-organization-id': activeTenantId }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        rawData = data.data;
      }
    } catch (e) {
      console.warn("Nenhum dado recuperado via API");
    }
  }

  // A MÁGICA DO ISOLAMENTO: Filtra tudo com precisão antes de soltar na tela
  let clientesFiltrados = [];
  if (isMaster) {
    clientesFiltrados = rawData; // Master vê toda a base
  } else {
    // Agência vê só os que combinam com o ID dela
    if (currentAgencyId) {
      clientesFiltrados = rawData.filter(c => String(c.agency_id) === String(currentAgencyId));
    }
  }

  // Atualiza as variáveis globais que alimentam o resto do sistema
  window.clientesMock = clientesFiltrados.map(c => ({ ...c, notes: sanitizeNotes(c.notes) }));
  window.clientsList = window.clientesMock;

  // Renderiza Forçadamente Tabela e Seletor logo em seguida
  window.renderizarListaClientes();
  window.atualizarSeletorClientesOnboarding();
};

document.addEventListener('DOMContentLoaded', () => {
  window.carregarClientesDoSupabase();
});
