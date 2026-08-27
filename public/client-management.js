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

// --- SISTEMA DE IDENTIDADE SUPREMA (Fim do problema de sumiço) ---
window.obterIdentidadeSegura = async function() {
  let email = '';
  let isMaster = false;
  let agencyId = '';

  const supaClient = getSupabaseClient();

  // 1. A FONTE DA VERDADE: Pergunta diretamente ao Supabase Auth
  if (supaClient) {
      try {
          let authUser = null;
          // Suporte para versões novas e antigas do Supabase
          if (typeof supaClient.auth.getUser === 'function') {
              const { data } = await supaClient.auth.getUser();
              authUser = data?.user;
          } else if (typeof supaClient.auth.user === 'function') {
              authUser = supaClient.auth.user();
          }
          
          if (authUser && authUser.email) {
              email = String(authUser.email).toLowerCase();
          }
      } catch (err) { console.warn("Aviso: Falha ao ler Supabase Auth."); }
  }

  // 2. FALLBACK: Lê a memória do navegador caso o Auth demore
  const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
  const session = sessionStr ? JSON.parse(sessionStr) : {};

  if (!email) email = String(session.email || '').toLowerCase();
  agencyId = session.agency_id || session.agencyId || session.id || '';

  // 3. AUTO-RESGATE DE ID DE AGÊNCIA
  if (email && email !== 'hajaluzstudio@gmail.com' && !agencyId && supaClient) {
      try {
          const { data: agData } = await supaClient.from('agencies').select('id').eq('email_billing', email).single();
          if (agData) {
              agencyId = agData.id;
              session.agency_id = agData.id;
              sessionStorage.setItem('oraculum_session', JSON.stringify(session));
          }
      } catch (err) {}
  }

  // 4. SENTENÇA FINAL: É Master ou não?
  if (session.role === 'master' || email === 'hajaluzstudio@gmail.com') {
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

    // Usa o sistema blindado para garantir que a agência assine o cliente corretamente
    const identidade = await window.obterIdentidadeSegura();

    if (!identidade.isMaster && !identidade.agencyId) {
      alert('❌ Erro: ID da agência não encontrado. Faça login novamente.');
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
    alert(`🎉 Cliente salvo com sucesso!`);
  } catch (err) {
    alert('❌ Erro ao salvar: ' + err.message);
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
  if (typeof window.setActiveClient === 'function') {
    window.setActiveClient(clientId);
    return;
  }
  const client = window.clientesMock.find(c => String(c.id) === String(clientId));
  if (client && window.selectActiveClient) window.selectActiveClient(client.id);
};

// 6. ATUALIZAR SELETORES E MATAR "FANTASMAS"
window.atualizarSeletorClientesOnboarding = function() {
  const selectOnboarding = document.getElementById('select-onboarding-client');
  const selectHeader = document.getElementById('active-client-select');
  const list = window.clientesMock || []; 

  // --- LIMPADOR DE FANTASMAS (Evita o erro do Dr. Lucas) ---
  const activeClientId = localStorage.getItem('oraculum_active_client') || sessionStorage.getItem('oraculum_active_client');
  if (activeClientId && list.length > 0) {
      const clienteValido = list.some(c => String(c.id) === String(activeClientId));
      if (!clienteValido) {
          console.warn("🧹 Limpando cliente fantasma do cache do navegador.");
          localStorage.removeItem('oraculum_active_client');
          sessionStorage.removeItem('oraculum_active_client');
      }
  }

  // Preenche o select da aba de onboarding normalmente
  if (selectOnboarding) {
    selectOnboarding.innerHTML = '<option value="">-- Selecione o Cliente --</option>';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.niche})`;
      selectOnboarding.appendChild(opt);
    });
    // Se houver um cliente ativo salvo, mantém selecionado no dropdown do onboard
    if (activeClientId) {
      selectOnboarding.value = activeClientId;
    }
  }

  // Atualiza o visor no topo (Header) com o nome do cliente ativo atual
  if (selectHeader) {
    if (list.length === 0) {
      selectHeader.innerText = "Nenhum cliente cadastrado";
    } else if (activeClientId) {
      const clienteAtivoObj = list.find(c => String(c.id) === String(activeClientId));
      if (clienteAtivoObj) {
        selectHeader.innerText = `${clienteAtivoObj.name} (${clienteAtivoObj.niche})`;
      } else {
        selectHeader.innerText = "Nenhum cliente selecionado";
      }
    } else {
      selectHeader.innerText = "Nenhum cliente selecionado";
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

// 8. O MOTOR PRINCIPAL (Busca e Filtra com Precisão)
window.carregarClientesDoSupabase = async function() {
  console.log("🚀 Iniciando busca de clientes no Supabase...");
  const supaClient = getSupabaseClient();
  
  if (!supaClient) {
      console.error("❌ Cliente Supabase ausente.");
      return;
  }

  try {
    // 1. DESCUBRE QUEM É O USUÁRIO DE VERDADE (Sem depender da memória lenta)
    const identidade = await window.obterIdentidadeSegura();

    // 2. BUSCA TODOS OS DADOS
    const { data, error } = await supaClient.from('clients').select('*');
    if (error) { console.error("❌ Erro na base:", error.message); return; }
    
    console.log(`✅ Banco retornou ${data.length} clientes.`);

    // 3. A MÁGICA DO ISOLAMENTO OCORRE AQUI
    let clientesFiltrados = [];

    if (identidade.isMaster) {
      clientesFiltrados = data; 
      console.log(`👑 Usuário confirmado como MASTER (${identidade.email}). Exibindo tudo.`);
    } else {
      if (identidade.agencyId) {
        const safeId = String(identidade.agencyId).toLowerCase();
        clientesFiltrados = data.filter(c => c.agency_id && String(c.agency_id).toLowerCase() === safeId);
      }
      console.log(`🏢 Usuário confirmado como AGÊNCIA (${identidade.email}). Encontrados ${clientesFiltrados.length} clientes isolados.`);
    }

    // 4. SALVA E PREPARA A TELA
    window.clientesMock = clientesFiltrados.map(c => ({ ...c, notes: sanitizeNotes(c.notes) }));
    window.clientsList = window.clientesMock;

    // 5. ATRASO ESTRATÉGICO PARA ATROPELAR QUALQUER CONFLITO VISUAL
    setTimeout(() => {
        console.log("🛡️ Forçando renderização da tela...");
        window.renderizarListaClientes();
        window.atualizarSeletorClientesOnboarding();
    }, 400);

  } catch (err) {
    console.error("❌ Erro fatal:", err);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  window.carregarClientesDoSupabase();
});
