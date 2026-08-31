// =======================================================
// GESTÃO CADASTRAL DE CLIENTES DA AGÊNCIA (BLINDADO E DEFINITIVO)
// =======================================================

window.clientesMock = window.clientesMock || [];
window.clientsList = window.clientsList || [];

function getSupabaseClient() {
  if (typeof supabase !== 'undefined' && supabase.from) return supabase;
  if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
  if (window.supabase && window.supabase.from) return window.supabase;
  return null;
}

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

// --- SISTEMA DE IDENTIDADE SUPREMA (100% SÍNCRONO E IMEDIATO VIA SESSÃO) ---
window.obterIdentidadeSegura = function() {
  const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
  const session = sessionStr ? JSON.parse(sessionStr) : {};

  let email = String(session.email || '').toLowerCase();
  let agencyId = session.agency_id || session.agencyId || session.id || '';
  let isMaster = false;

  if (session.role === 'master' || session.role === 'super_admin' || email === 'hajaluzstudio@gmail.com') {
      isMaster = true;
  }

  return { email, isMaster, agencyId };
};

// 1. ABRIR MODAL
window.abrirModalNovoCliente = function(clientId = null) {
  let modal = document.getElementById('modal-client-crud');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-client-crud';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    modal.innerHTML = `
      <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 id="modal-client-title" class="text-lg font-bold text-white">Cadastrar Novo Cliente</h3>
          <button type="button" onclick="window.fecharModalNovoCliente()" class="text-slate-400 hover:text-white text-2xl p-1">&times;</button>
        </div>
        <form id="form-client-crud" onsubmit="window.salvarCliente(event)" class="space-y-3">
          <input type="hidden" id="client-modal-id">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" id="client-modal-name" required placeholder="Nome / Razão Social *" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
            <input type="text" id="client-modal-niche" required placeholder="Nicho / Especialidade *" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" id="client-modal-contact-name" placeholder="Responsável" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
            <input type="text" id="client-modal-phone" placeholder="Telefone" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" id="client-modal-avg-ticket" placeholder="Ticket Médio (Ex: 1500)" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
            <input type="text" id="client-modal-target-revenue" placeholder="Meta de Faturamento" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500">
          </div>
          <textarea id="client-modal-notes" rows="2" placeholder="Notas & Histórico..." class="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm focus:border-emerald-500"></textarea>
          <div class="flex justify-end space-x-3 pt-4">
            <button type="button" onclick="window.fecharModalNovoCliente()" class="px-4 py-2 bg-slate-800 rounded-xl text-slate-300 text-sm">Cancelar</button>
            <button type="submit" id="btn-save-client-crud" class="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-slate-950 font-bold rounded-xl text-sm">Salvar</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('form-client-crud');
  if (form) form.reset();

  if (clientId) {
    document.getElementById('modal-client-title').innerText = 'Editar Ficha do Cliente';
    const client = window.clientesMock.find(c => String(c.id) === String(clientId));
    if (client) {
      document.getElementById('client-modal-id').value = client.id;
      document.getElementById('client-modal-name').value = client.name || '';
      document.getElementById('client-modal-niche').value = client.niche || '';
      document.getElementById('client-modal-contact-name').value = client.contact_name || '';
      document.getElementById('client-modal-phone').value = client.phone || '';
      document.getElementById('client-modal-avg-ticket').value = client.avg_ticket || '';
      document.getElementById('client-modal-target-revenue').value = client.target_revenue || '';
      document.getElementById('client-modal-notes').value = sanitizeNotes(client.notes || client.previous_agency_notes);
    }
  } else {
    document.getElementById('modal-client-title').innerText = 'Cadastrar Novo Cliente';
    document.getElementById('client-modal-id').value = '';
  }

  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.remove('hidden');
};

// 2. FECHAR MODAL
window.fecharModalNovoCliente = function() {
  const modal = document.getElementById('modal-client-crud');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
  }
};

// 3. SALVAR CLIENTE
window.salvarCliente = async function(e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btn-save-client-crud');
  if (btn) { btn.innerText = 'Salvando...'; btn.disabled = true; }

  try {
    const supaClient = getSupabaseClient();
    if (!supaClient) throw new Error("Supabase não conectado no front-end.");

    const identidade = await window.obterIdentidadeSegura();
    if (!identidade.isMaster && !identidade.agencyId) {
      if (typeof window.showToast === 'function') window.showToast('❌ Erro: ID da agência não encontrado. Faça login novamente.', 'error'); else alert('❌ Erro: ID da agência não encontrado. Faça login novamente.');
      return;
    }

    const payload = {
      name: document.getElementById('client-modal-name').value,
      niche: document.getElementById('client-modal-niche').value,
      contact_name: document.getElementById('client-modal-contact-name').value,
      phone: document.getElementById('client-modal-phone').value,
      avg_ticket: parseFloat(document.getElementById('client-modal-avg-ticket').value) || 0,
      target_revenue: parseFloat(document.getElementById('client-modal-target-revenue').value) || 0,
      notes: document.getElementById('client-modal-notes').value,
      agency_id: identidade.isMaster ? (identidade.agencyId || null) : identidade.agencyId,
    };

    const id = document.getElementById('client-modal-id').value;
    const { error } = id 
        ? await supaClient.from('clients').update(payload).eq('id', id) 
        : await supaClient.from('clients').insert([payload]);

    if (error) throw error;

    window.fecharModalNovoCliente();
    await window.carregarClientesDoSupabase();

    // Bloco de Sucesso
    if (typeof window.mostrarToastOraculum === 'function') {
      window.mostrarToastOraculum('✨ Cliente salvo com sucesso!', 'sucesso');
    } else if (typeof window.showToast === 'function') {
      window.showToast('✨ Cliente salvo com sucesso!', 'success');
    } else {
      alert('✨ Cliente salvo com sucesso!');
    }

  } catch (err) {
    // Bloco de Erro
    if (typeof window.mostrarToastOraculum === 'function') {
      window.mostrarToastOraculum('❌ Erro ao salvar: ' + err.message, 'erro');
    } else if (typeof window.showToast === 'function') {
      window.showToast('❌ Erro ao salvar: ' + err.message, 'error');
    } else {
      alert('❌ Erro ao salvar: ' + err.message);
    }
  } finally {
    if (btn) { btn.innerText = 'Salvar'; btn.disabled = false; }
  }
};

// 4. EXCLUIR CLIENTE
window.excluirCliente = async function(clientId) {
  if (confirm('Tem certeza que deseja excluir?')) {
    const supaClient = getSupabaseClient();
    if (supaClient) {
      await supaClient.from('clients').delete().eq('id', clientId);
      window.carregarClientesDoSupabase();
    }
  }
};

// 5. CARREGAR DADOS NO ONBOARDING
window.carregarDadosClienteNoOnboarding = function(clientId) {
  if (!clientId) return;
  
  localStorage.setItem('oraculum_active_client', clientId);
  localStorage.setItem('oraculum_active_client_id', clientId);
  sessionStorage.setItem('oraculum_active_client', clientId);
  sessionStorage.setItem('oraculum_active_client_id', clientId);
  window.currentClientId = clientId;
  window.activeClientId = clientId;

  const selectHeader = document.getElementById('active-client-select');
  if (selectHeader) {
    selectHeader.value = clientId;
    selectHeader.dispatchEvent(new Event('change'));
  }
  if (typeof window.setActiveClient === 'function') {
    window.setActiveClient(clientId);
  } else if (typeof window.selectActiveClient === 'function') {
    window.selectActiveClient(clientId);
  }
};

// 6. ATUALIZAR SELETORES E VISOR DO CABEÇALHO
window.atualizarSeletorClientesOnboarding = function() {
  const selectOnboarding = document.getElementById('select-onboarding-client');
  const selectHeader = document.getElementById('active-client-select');
  const selectHeaderDisplay = document.getElementById('active-client-display');
  const list = window.clientesMock || window.clientsList || []; 

  const activeClientId = localStorage.getItem('oraculum_active_client_id') || localStorage.getItem('oraculum_active_client') || sessionStorage.getItem('oraculum_active_client');

  // Preenche o seletor da aba de Onboarding
  if (selectOnboarding) {
    selectOnboarding.innerHTML = '<option value="">-- Selecione o Cliente --</option>';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.niche})`;
      selectOnboarding.appendChild(opt);
    });

    if (activeClientId) {
      selectOnboarding.value = activeClientId;
    }

    // Ao mudar no Onboarding, avisa o sistema inteiro
    selectOnboarding.onchange = function(e) {
      const selectedId = e.target.value;
      if (selectedId) {
        localStorage.setItem('oraculum_active_client', selectedId);
        localStorage.setItem('oraculum_active_client_id', selectedId);
        sessionStorage.setItem('oraculum_active_client', selectedId);
        sessionStorage.setItem('oraculum_active_client_id', selectedId);
        window.carregarDadosClienteNoOnboarding(selectedId);
      }
    };
  }

  // Preenche o select original do app.js para manter a compatibilidade interna intacta
  if (selectHeader) {
    selectHeader.innerHTML = list.length === 0 ? '<option value="">Nenhum cliente cadastrado</option>' : '';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.niche})`;
      selectHeader.appendChild(opt);
    });
    if (activeClientId) {
      selectHeader.value = activeClientId;
    }
  }

  // Atualiza o texto visual limpo no cabeçalho superior (#active-client-display)
  if (selectHeaderDisplay) {
    if (list.length === 0) {
      selectHeaderDisplay.innerText = "Nenhum cliente cadastrado";
    } else if (activeClientId) {
      const clienteAtivoObj = list.find(c => String(c.id) === String(activeClientId));
      if (clienteAtivoObj) {
        selectHeaderDisplay.innerText = `${clienteAtivoObj.name} (${clienteAtivoObj.niche})`;
      } else {
        selectHeaderDisplay.innerText = "Nenhum cliente selecionado";
      }
    } else {
      selectHeaderDisplay.innerText = "Nenhum cliente selecionado";
    }
  }
};

// 7. RENDERIZAR TABELA
window.renderizarListaClientes = function() {
  const container = document.getElementById('clients-table-body');
  if (!container) return;

  const list = window.clientesMock || [];
  const elTotal = document.getElementById('client-metric-total');
  const elNiches = document.getElementById('client-metric-niches');
  const elRevenue = document.getElementById('client-metric-revenue');

  const uniqueNiches = new Set(list.map(c => c.niche).filter(Boolean));
  const totalRevSum = list.reduce((sum, c) => sum + (parseFloat(c.target_revenue) || 0), 0);

  if (elTotal) elTotal.textContent = String(list.length);
  if (elNiches) elNiches.textContent = String(uniqueNiches.size);
  if (elRevenue) elRevenue.textContent = `R$ ${totalRevSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Nenhum cliente cadastrado.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(c => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30">
      <td class="py-3 px-4 text-white font-semibold">${c.name} <div class="text-xs text-slate-400">${c.contact_name || ''}</div></td>
      <td class="py-3 px-4 text-emerald-400"><span class="px-2 py-1 bg-emerald-500/10 rounded-full text-xs">${c.niche || 'Geral'}</span></td>
      <td class="py-3 px-4 text-slate-400">${c.phone || '-'}</td>
      <td class="py-3 px-4 text-slate-300 text-xs">Ticket: R$ ${c.avg_ticket || 0}</td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalNovoCliente('${c.id}')" class="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs">Editar</button>
        <button onclick="window.excluirCliente('${c.id}')" class="px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg text-xs">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// 8. O MOTOR PRINCIPAL DE BUSCA
window.carregarClientesDoSupabase = async function() {
  console.log("🚀 Iniciando busca de clientes no Supabase com isolamento de tenant...");
  const supaClient = getSupabaseClient();
  
  let data = null;
  let isOffline = false;

  try {
    const identidade = typeof window.obterIdentidadeSegura === 'function' 
      ? window.obterIdentidadeSegura() 
      : { isMaster: true, email: '', agencyId: '' };

    // 1. Tenta carregar via API Backend dedicada (Vercel Serverless) com service role (ignora RLS)
    try {
      const resApi = await fetch('/api/clients?organization_id=all');
      if (resApi.ok) {
        const jsonApi = await resApi.json();
        if (jsonApi.success && Array.isArray(jsonApi.data) && jsonApi.data.length > 0) {
          data = jsonApi.data;
          console.log(`[Clients] ✅ ${data.length} clientes carregados via Backend API.`);
        }
      }
    } catch (apiErr) {
      console.warn('[Clients] Falha na API Backend, tentando fallback Supabase SDK:', apiErr);
    }

    // 2. Fallback direto Supabase SDK
    if ((!data || data.length === 0) && supaClient) {
      try {
        const res = await supaClient.from('clients').select('*').order('created_at', { ascending: false });
        if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
          data = res.data;
          console.log(`[Clients] ✅ ${data.length} clientes carregados via Supabase Client.`);
        }
      } catch (clientErr) {
        console.warn("Aviso de rede na consulta direta ao Supabase:", clientErr);
      }
    }

    // 3. Fallback de cache local
    if (!data || data.length === 0) {
      try {
        const localData = localStorage.getItem('oraculum_clients_cache');
        if (localData) {
          data = JSON.parse(localData);
          isOffline = true;
        }
      } catch (e) {}
    }
    
    let clientesFiltrados = data || [];
    if (!identidade.isMaster && identidade.agencyId) {
      // Agência individual: visualiza clientes associados ao seu agencyId
      const safeId = String(identidade.agencyId).toLowerCase();
      clientesFiltrados = (data || []).filter(c => 
        (c.agency_id && String(c.agency_id).toLowerCase() === safeId) ||
        (c.organization_id && String(c.organization_id).toLowerCase() === safeId)
      );
    }

    const processedClients = clientesFiltrados.map(c => ({ ...c, notes: sanitizeNotes(c.notes || c.previous_agency_notes) }));
    window.clientesMock = processedClients;
    window.clientsList = processedClients;
    window.globalClientsList = processedClients;

    if (data && data.length > 0) {
      try {
        localStorage.setItem('oraculum_clients_cache', JSON.stringify(data));
      } catch (e) {}
    }

    // Se a agência não tem clientes, limpa o cliente ativo selecionado
    if (processedClients.length === 0) {
      localStorage.removeItem('oraculum_active_client');
      localStorage.removeItem('oraculum_active_client_id');
      sessionStorage.removeItem('oraculum_active_client');
      sessionStorage.removeItem('oraculum_active_client_id');
      window.currentClientId = null;
      window.activeClientId = null;
    } else {
      const savedActiveId = localStorage.getItem('oraculum_active_client_id') || localStorage.getItem('oraculum_active_client');
      const exists = processedClients.some(c => String(c.id) === String(savedActiveId));
      if (!savedActiveId || !exists) {
        const firstClient = processedClients[0];
        localStorage.setItem('oraculum_active_client', firstClient.id);
        localStorage.setItem('oraculum_active_client_id', firstClient.id);
        sessionStorage.setItem('oraculum_active_client', firstClient.id);
        sessionStorage.setItem('oraculum_active_client_id', firstClient.id);
        window.currentClientId = firstClient.id;
        window.activeClientId = firstClient.id;
      }
    }

    setTimeout(() => {
        window.renderizarListaClientes();
        window.atualizarSeletorClientesOnboarding();
    }, 100);

  } catch (err) {
    console.error("❌ Erro ao processar clientes:", err);
  }
};

// Sincronizador contínuo do visor superior
function sincronizarVisorTopo() {
  const selectHeaderDisplay = document.getElementById('active-client-display');
  const activeClientId = localStorage.getItem('oraculum_active_client') || sessionStorage.getItem('oraculum_active_client');
  const list = window.clientesMock || [];

  if (selectHeaderDisplay && list.length > 0 && activeClientId) {
    const clienteAtivoObj = list.find(c => String(c.id) === String(activeClientId));
    if (clienteAtivoObj) {
      selectHeaderDisplay.innerText = `${clienteAtivoObj.name} (${clienteAtivoObj.niche})`;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.carregarClientesDoSupabase();
  setInterval(sincronizarVisorTopo, 1000);
});

// ============================================================================
// SINCRONIZAÇÃO AUTOMÁTICA DO TÍTULO DO CLIENTE NO DASHBOARD DE BI
// ============================================================================
(function sincronizarTituloClienteBI() {
  function atualizarNomeClienteNoBI() {
    const tituloBI = document.getElementById('bi-active-client-title');
    const headerDisplay = document.getElementById('active-client-display');
    const labelTopo = document.querySelector('.user-header-pill, #active-client-display');

    if (!tituloBI) return;

    // 1. Tenta pegar o nome direto do visor do topo (ex: "Dr. Lucas - Rinoplastia...")
    let nomeCliente = headerDisplay ? headerDisplay.innerText.trim() : '';

    // 2. Se não encontrou no visor, busca nos objetos e chaves de armazenamento local
    if (!nomeCliente || nomeCliente === 'Carregando...' || nomeCliente === 'Cliente Selecionado') {
      const activeClientId = localStorage.getItem('oraculum_active_client_id') || localStorage.getItem('oraculum_active_client');
      if (window.clientesMock && Array.isArray(window.clientesMock) && activeClientId) {
        const clienteObj = window.clientesMock.find(c => String(c.id) === String(activeClientId));
        if (clienteObj) {
          nomeCliente = clienteObj.name || clienteObj.nome || clienteObj.empresa;
          if (clienteObj.niche || clienteObj.nicho) {
            nomeCliente += ` (${clienteObj.niche || clienteObj.nicho})`;
          }
        }
      }
    }

    // 3. Aplica o nome formatado no título da aba BI
    if (nomeCliente && nomeCliente !== 'Carregando...' && nomeCliente !== 'Cliente Selecionado') {
      if (tituloBI.innerText !== nomeCliente) {
        tituloBI.innerText = nomeCliente;
      }
    }
  }

  // Executa imediatamente e monitora trocas de cliente / abas
  atualizarNomeClienteNoBI();
  setInterval(atualizarNomeClienteNoBI, 300);
  document.addEventListener('click', () => setTimeout(atualizarNomeClienteNoBI, 100));
})();
