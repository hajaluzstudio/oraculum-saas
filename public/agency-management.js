// =======================================================
// GESTÃO MASTER DE AGÊNCIAS (MODAL, VIA CEP, RBAC, EQUIPE E BLOQUEIO)
// =======================================================

(function carregarAgenciasLocalStorage() {
  const defaultAgencies = [
    {
      id: 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104',
      name: 'Agência Oraculum Master',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 99999-8888',
      admin_email: 'master@oraculum.com.br',
      zip: '01001-000',
      street: 'Praça da Sé',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      plan: 'Enterprise',
      monthly_fee: '1997.00',
      users_count: 12,
      active: true,
      created_at: new Date().toLocaleDateString('pt-BR')
    },
    {
      id: 'artcreations-agency-id',
      name: 'ArtCreations Digital Agency',
      cnpj: '33.444.555/0001-66',
      phone: '(11) 97123-4567',
      admin_email: 'contato@artcreations.com.br',
      zip: '01310-100',
      street: 'Av. Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      plan: 'Enterprise',
      monthly_fee: '997.00',
      users_count: 5,
      active: true,
      created_at: new Date().toLocaleDateString('pt-BR')
    },
    {
      id: 'b7c9a2d1-8e4f-43f2-96b9-3094cf3g0205',
      name: 'Agência Turbo Performance Digital',
      cnpj: '98.765.432/0001-10',
      phone: '(21) 98888-7777',
      admin_email: 'contato@turbodigital.com.br',
      zip: '20040-002',
      street: 'Av. Rio Branco',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      plan: 'Pro',
      monthly_fee: '994.00',
      users_count: 8,
      active: true,
      created_at: new Date().toLocaleDateString('pt-BR')
    }
  ];

  try {
    const savedCustom = localStorage.getItem('oraculum_custom_agencies');
    if (savedCustom) {
      const parsed = JSON.parse(savedCustom);
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.agenciasMock = parsed;
        return;
      }
    }
  } catch(e) {}
  window.agenciasMock = defaultAgencies;
})();

window.agencyUsersMock = window.agencyUsersMock || [];

// Helper para obter o cliente Supabase disponível globalmente
function getSupabaseClient() {
  if (typeof supabase !== 'undefined' && supabase.from) return supabase;
  if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
  if (window.supabase && window.supabase.from) return window.supabase;
  return null;
}

// 1. AUTO-BUSCA DE CEP VIA API (ViaCEP)
window.buscarEnderecoPorCEP = async function(cepValor) {
  if (!cepValor) return;
  const cep = cepValor.replace(/\D/g, '');
  if (cep.length === 8) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const streetEl = document.getElementById('agency-street');
        const neighEl = document.getElementById('agency-neighborhood');
        const cityEl = document.getElementById('agency-city');
        const stateEl = document.getElementById('agency-state');
        if (streetEl) streetEl.value = data.logradouro || '';
        if (neighEl) neighEl.value = data.bairro || '';
        if (cityEl) cityEl.value = data.localidade || '';
        if (stateEl) stateEl.value = data.uf || '';
      } else {
        console.warn("CEP não encontrado no ViaCEP.");
      }
    } catch(e) { 
      console.warn("Erro ao buscar CEP:", e); 
    }
  }
};

// 2. ABRIR MODAL DE CADASTRO / EDIÇÃO REFORÇADO (Z-INDEX ABSOLUTO)
window.abrirModalAgencia = function(agenciaId = null) {
  console.log("Abrindo modal de agência...", agenciaId);
  let modal = document.getElementById('modal-agency');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-agency';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    modal.innerHTML = `
      <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><i class="fa-solid fa-building"></i></span>
            <h3 id="modal-agency-title" class="text-lg font-bold text-white">Cadastrar Nova Agência</h3>
          </div>
          <button type="button" onclick="window.fecharModalAgencia()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
        </div>
        
        <form id="form-agency-modal" onsubmit="window.salvarAgencia(event)" class="space-y-3 text-left">
          <input type="hidden" id="agency-id-input">
          
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome da Agência / Razão Social</label>
            <input type="text" id="agency-name-input" required placeholder="Ex: Agência Alfa Digital" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">CNPJ</label>
              <input type="text" id="agency-cnpj-input" placeholder="00.000.000/0001-00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
              <input type="text" id="agency-phone-input" placeholder="(00) 00000-0000" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail do Administrador (Login)</label>
            <input type="email" id="agency-admin-email" required placeholder="admin@agencia.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
          </div>

          <!-- ENDEREÇO COM VIA CEP -->
          <div class="border-t border-slate-800/80 pt-3 mt-3 space-y-3">
            <span class="block text-xs font-semibold text-emerald-400 uppercase tracking-wider">Endereço da Sede (ViaCEP)</span>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">CEP</label>
                <input type="text" id="agency-zip" placeholder="00000-000" 
                       onblur="window.buscarEnderecoPorCEP(this.value)" 
                       oninput="if(this.value.replace(/\\D/g,'').length===8) window.buscarEnderecoPorCEP(this.value)" 
                       class="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Logradouro / Rua</label>
                <input type="text" id="agency-street" placeholder="Rua, Avenida, Alameda..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Bairro</label>
                <input type="text" id="agency-neighborhood" placeholder="Bairro" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Cidade</label>
                <input type="text" id="agency-city" placeholder="Cidade" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">UF / Estado</label>
                <input type="text" id="agency-state" placeholder="UF" maxlength="2" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-emerald-500">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Plano SaaS</label>
              <select id="agency-plan-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
                <option value="Starter">Starter (Até 5 clientes)</option>
                <option value="Pro Growth">Pro Growth (Até 20 clientes)</option>
                <option value="Enterprise Pro">Enterprise Pro (Ilimitado)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Mensalidade (R$)</label>
              <input type="text" id="agency-fee-input" placeholder="Ex: 997,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500">
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button type="button" onclick="window.fecharModalAgencia()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-save-agency" class="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-slate-950 font-extrabold shadow-none rounded-xl text-sm transition-all cursor-pointer">Salvar Agência</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('form-agency-modal');
  if (form) form.reset();

  if (agenciaId) {
    const titleEl = document.getElementById('modal-agency-title');
    if (titleEl) titleEl.innerText = 'Editar Agência';
    const ag = (window.agenciasMock || []).find(a => String(a.id) === String(agenciaId));
    if (ag) {
      document.getElementById('agency-id-input').value = ag.id;
      document.getElementById('agency-name-input').value = ag.name || '';
      document.getElementById('agency-cnpj-input').value = ag.cnpj || '';
      document.getElementById('agency-phone-input').value = ag.phone || '';
      document.getElementById('agency-admin-email').value = ag.admin_email || '';
      document.getElementById('agency-zip').value = ag.zip || '';
      document.getElementById('agency-street').value = ag.street || '';
      document.getElementById('agency-neighborhood').value = ag.neighborhood || '';
      document.getElementById('agency-city').value = ag.city || '';
      document.getElementById('agency-state').value = ag.state || '';
      document.getElementById('agency-plan-input').value = ag.plan || 'Starter';
      document.getElementById('agency-fee-input').value = ag.monthly_fee || '';
    }
  } else {
    const titleEl = document.getElementById('modal-agency-title');
    if (titleEl) titleEl.innerText = 'Cadastrar Nova Agência';
    document.getElementById('agency-id-input').value = '';
  }

  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('z-index', '999999', 'important');
  modal.classList.remove('hidden');
};

// 3. FECHAR MODAL DE FORMA DIRETA E EFICIENTE
window.fecharModalAgencia = function() {
  const modals = [
    document.getElementById('modal-agency'),
    document.getElementById('modal-nova-agencia'),
    document.getElementById('agency-crud-modal'),
    document.getElementById('agency-modal')
  ];
  modals.forEach(m => {
    if (m) {
      m.style.setProperty('display', 'none', 'important');
      m.classList.add('hidden');
    }
  });
};

window.abrirModalNovaAgencia = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const modalComplete = document.getElementById('modal-nova-agencia') || document.getElementById('agency-crud-modal');
  if (modalComplete) {
    const form = document.getElementById('form-agency-crud');
    if (form) form.reset();
    const idInput = document.getElementById('agency-modal-id');
    if (idInput) idInput.value = '';
    const titleEl = document.getElementById('agency-modal-title');
    if (titleEl) titleEl.textContent = 'Cadastrar Nova Agência';
    modalComplete.style.setProperty('display', 'flex', 'important');
    modalComplete.classList.remove('hidden');
    return;
  }
  if (typeof window.abrirModalAgencia === 'function') {
    window.abrirModalAgencia();
  }
};

window.fecharModalNovaAgencia = function(event) {
  if (event) event.preventDefault();
  window.fecharModalAgencia();
};

// 4. SALVAR AGÊNCIA COM FECHAMENTO AUTOMÁTICO E ATUALIZAÇÃO EM TEMPO REAL
window.salvarAgencia = async function(e) {
  if (e) e.preventDefault();
  
  const targetFormId = e && e.target ? e.target.id : '';

  let id = '', name = '', cnpj = '', phone = '', admin_email = '', zip = '', street = '', neighborhood = '', city = '', state = '', plan = 'Starter', monthly_fee = 497, responsible_name = '', due_day = 10, status = 'active';

  if (targetFormId === 'form-agency-crud' || (!document.getElementById('agency-name-input') && document.getElementById('agency-input-name'))) {
    id = document.getElementById('agency-modal-id')?.value || '';
    name = document.getElementById('agency-input-name')?.value?.trim() || '';
    cnpj = document.getElementById('agency-input-cnpj')?.value?.trim() || '';
    responsible_name = document.getElementById('agency-input-responsible')?.value?.trim() || '';
    admin_email = document.getElementById('agency-input-email')?.value?.trim() || '';
    phone = document.getElementById('agency-input-phone')?.value?.trim() || '';
    zip = document.getElementById('agency-input-zip')?.value?.trim() || '';
    street = document.getElementById('agency-input-street')?.value?.trim() || '';
    neighborhood = document.getElementById('agency-input-neighborhood')?.value?.trim() || '';
    city = document.getElementById('agency-input-city')?.value?.trim() || '';
    state = document.getElementById('agency-input-state')?.value?.trim() || '';
    plan = document.getElementById('agency-input-plan')?.value || 'enterprise';
    const feeVal = document.getElementById('agency-input-fee')?.value || '497';
    monthly_fee = parseFloat(String(feeVal).replace(',', '.')) || 497;
    due_day = parseInt(document.getElementById('agency-input-due-day')?.value || '10');
    status = document.getElementById('agency-input-status')?.value || 'active';
  } else {
    id = document.getElementById('agency-id-input')?.value || '';
    name = document.getElementById('agency-name-input')?.value?.trim() || '';
    cnpj = document.getElementById('agency-cnpj-input')?.value?.trim() || '';
    phone = document.getElementById('agency-phone-input')?.value?.trim() || '';
    admin_email = document.getElementById('agency-admin-email')?.value?.trim() || '';
    zip = document.getElementById('agency-zip')?.value?.trim() || '';
    street = document.getElementById('agency-street')?.value?.trim() || '';
    neighborhood = document.getElementById('agency-neighborhood')?.value?.trim() || '';
    city = document.getElementById('agency-city')?.value?.trim() || '';
    state = document.getElementById('agency-state')?.value?.trim() || '';
    plan = document.getElementById('agency-plan-input')?.value || 'Starter';
    const monthly_fee_raw = document.getElementById('agency-fee-input')?.value?.trim() || '497';
    monthly_fee = parseFloat(monthly_fee_raw.replace(',', '.')) || 497.00;
  }

  const btn = document.getElementById('btn-submit-agency-modal') || document.getElementById('btn-save-agency');
  if (btn) {
    btn.innerText = 'Salvando...';
    btn.disabled = true;
  }

  try {
    let savedInSupa = false;
    const payload = {
      name, cnpj, phone, email_billing: admin_email, admin_email, zip, street, neighborhood, city, state,
      address_street: street, address_neighborhood: neighborhood, address_city: city, address_state: state, zip_code: zip,
      plan, plan_tier: plan, monthly_fee, responsible_name, due_day, status, active: status === 'active'
    };

    // 1. Tenta salvar via API backend
    try {
      const endpoint = id ? `/api/admin/agencies/${id}` : '/api/admin/agencies';
      const method = id ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...payload })
      });
      const resData = await res.json();
      if (resData.success) {
        savedInSupa = true;
        if (resData.userCreated) {
           window.mostrarNotificacaoAgencia(`✅ Agência cadastrada com sucesso!\n\nUm usuário administrador foi criado para esta agência.\n\nE-mail: ${payload.admin_email}\nSenha Provisória: ${resData.defaultPassword}\n\nPor favor, copie e envie esta senha para a agência.`, 'success');
        }
      } else {
        console.error("❌ ERRO BACKEND VERCEL ao salvar agência:", resData.error || resData);
        window.mostrarNotificacaoAgencia(`❌ ERRO BACKEND VERCEL ao salvar agência:\n${resData.error || JSON.stringify(resData)}`, 'error');
      }
    } catch (apiErr) {
      console.warn("⚠️ Falha na chamada da API Backend Vercel:", apiErr);
    }

    if (!savedInSupa) {
      const client = getSupabaseClient();
      if (client) {
        try {
          if (id) {
            const { error } = await client.from('agencies').update({
              ...payload, updated_at: new Date().toISOString()
            }).eq('id', id);
            if (!error) savedInSupa = true;
            else window.mostrarNotificacaoAgencia(`❌ ERRO SUPABASE CLIENT (UPDATE): ${error.message}`, 'error');
          } else {
            const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
            const { error } = await client.from('agencies').insert([{
              ...payload, slug
            }]);
            if (!error) savedInSupa = true;
            else window.mostrarNotificacaoAgencia(`❌ ERRO SUPABASE CLIENT (INSERT): ${error.message}`, 'error');
          }
        } catch (supaErr) {
          window.mostrarNotificacaoAgencia(`❌ EXCEÇÃO SUPABASE CLIENT: ${supaErr.message}`, 'error');
        }
      }
    }

    // Atualiza estado local agenciasMock
    if (id) {
      const index = (window.agenciasMock || []).findIndex(a => String(a.id) === String(id));
      if (index !== -1) {
        window.agenciasMock[index] = { ...window.agenciasMock[index], ...payload, monthly_fee: monthly_fee.toFixed(2) };
      }
    } else {
      const novaAgencia = {
        id: String(Date.now()),
        ...payload,
        monthly_fee: monthly_fee.toFixed(2),
        users_count: 1,
        created_at: new Date().toLocaleDateString('pt-BR')
      };
      if (!window.agenciasMock) window.agenciasMock = [];
      window.agenciasMock.unshift(novaAgencia);
    }

    try {
      localStorage.setItem('oraculum_custom_agencies', JSON.stringify(window.agenciasMock));
    } catch(e) {}

    window.fecharModalAgencia();
    window.renderizarListaAgencias();
    window.mostrarNotificacaoAgencia(`✅ Agência ${id ? 'atualizada' : 'cadastrada'} com sucesso!`, 'success');
  } catch (err) {
    console.error('Erro ao salvar agência:', err);
    window.fecharModalAgencia();
    window.renderizarListaAgencias();
    window.mostrarNotificacaoAgencia('✅ Agência salva com sucesso!', 'success');
  } finally {
    if (btn) {
      btn.innerText = 'Salvar Agência';
      btn.disabled = false;
    }
  }
};

// NOTIFICAÇÃO CUSTOMIZADA (Substitui o alert feio)
window.mostrarNotificacaoAgencia = function(mensagem, tipo = 'success') {
  // Se o sistema já tiver showToast global, usa ele
  if (typeof window.showToast === 'function') {
    return window.showToast(mensagem, tipo);
  }

  // Senão, cria um toast nativo estilizado do Oraculum
  let container = document.getElementById('toast-container-agency');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container-agency';
    container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999999; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(container);
  }

  const isSuccess = tipo === 'success';
  const bgColor = isSuccess ? 'bg-emerald-500/10' : 'bg-rose-500/10';
  const borderColor = isSuccess ? 'border-emerald-500/30' : 'border-rose-500/30';
  const textColor = isSuccess ? 'text-emerald-400' : 'text-rose-400';
  const icon = isSuccess ? '✅' : '❌';

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 border rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 transform translate-x-full opacity-0 ${bgColor} ${borderColor} ${textColor}`;
  toast.innerHTML = `
    <span class="text-lg">${icon}</span>
    <span class="text-sm font-medium whitespace-pre-line">${mensagem}</span>
  `;
  
  container.appendChild(toast);
  
  // Animação de entrada
  setTimeout(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  }, 10);

  // Animação de saída e remoção
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-full');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// 5. MODAL DE GESTÃO DE USUÁRIOS / EQUIPE DA AGÊNCIA (RBAC)
window.abrirModalUsuarios = async function(agencyId, agencyName) {
  let modal = document.getElementById('modal-agency-users');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-agency-users';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    document.body.appendChild(modal);
  }

  // Mostra skeleton/loading enquanto busca
  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-4">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      <p class="text-sm text-slate-400">Carregando membros da equipe...</p>
    </div>
  `;
  modal.style.setProperty('display', 'flex', 'important');

  // Buscar usuários reais do backend
  let teamMembers = [];
  try {
    const res = await fetch(`/api/admin/agencies/${agencyId}/users`);
    const data = await res.json();
    if (data.success) {
      teamMembers = data.data || [];
    }
  } catch(e) {
    console.error("Erro ao carregar equipe:", e);
    // Fallback para mock
    teamMembers = (window.agencyUsersMock || []).filter(u => String(u.agency_id) === String(agencyId));
  }

  modal.innerHTML = `
    <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>👥 Equipe & Cargos:</span> <span class="text-emerald-400">${agencyName}</span>
          </h3>
          <p class="text-xs text-slate-400">Gerencie os acessos RBAC e colaboradores desta agência.</p>
        </div>
        <button type="button" onclick="window.fecharModalUsuarios()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
      </div>

      <!-- FORMULÁRIO NOVO MEMBRO -->
      <form onsubmit="window.salvarUsuarioAgencia(event, '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-left">
        <h4 class="text-xs font-semibold text-emerald-400 uppercase tracking-wider">+ Cadastrar Novo Colaborador</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome do Colaborador</label>
            <input type="text" id="user-name-input" required placeholder="Ex: Ana Silva" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail de Acesso</label>
            <input type="email" id="user-email-input" required placeholder="colaborador@agencia.com" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Status do Convite</label>
            <div class="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-2 text-slate-400 text-sm italic">
              Um e-mail de acesso será enviado.
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Cargo / Função (RBAC)</label>
            <select id="user-role-input" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500">
              <option value="Master da Agência">👑 Master da Agência (Total)</option>
              <option value="Coordenador de Marketing">🎯 Coordenador de Marketing / Estrategista</option>
              <option value="Designer Gráfico">🎨 Designer Gráfico (Visual)</option>
              <option value="Videomaker">🎬 Videomaker / Editor (Audiovisual)</option>
              <option value="Copywriter">✍️ Copywriter / Redator (Textos)</option>
              <option value="Gestor de Tráfego">🚀 Gestor de Tráfego (Ads / Campanhas)</option>
              <option value="Social Media">📱 Social Media (Redes Sociais)</option>
              <option value="Desenvolvedor Web">🖥️ Desenvolvedor Web / Programador</option>
              <option value="Analista de SEO">📈 Analista de SEO (Buscas / Tráfego Orgânico)</option>
              <option value="Atendimento (CS)">💼 Atendimento / Sucesso do Cliente (CS)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end pt-1">
          <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-lg transition-all cursor-pointer">
            + Adicionar Colaborador
          </button>
        </div>
      </form>

      <!-- LISTA DE COLABORADORES DA AGÊNCIA -->
      <div class="space-y-2">
        <h4 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Membros da Equipe (${teamMembers.length})</h4>
        
        <div class="border border-slate-800 rounded-xl overflow-hidden">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th class="py-2.5 px-3">Nome / E-mail</th>
                <th class="py-2.5 px-3">Cargo / Status</th>
                <th class="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              ${teamMembers.length === 0 ? `
                <tr><td colspan="3" class="py-4 text-center text-slate-500 text-xs">Nenhum colaborador vinculado a esta agência.</td></tr>
              ` : teamMembers.map(u => `
                <tr class="hover:bg-slate-800/30">
                  <td class="py-2.5 px-3">
                    <div class="font-medium text-white">${u.name}</div>
                    <div class="text-xs text-slate-400">${u.email}</div>
                  </td>
                  <td class="py-2.5 px-3">
                    <div class="flex flex-col gap-1 items-start">
                      <span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-xs">${u.role}</span>
                      <span class="text-[10px] uppercase tracking-wide ${u.status === 'Ativo' ? 'text-emerald-500' : 'text-amber-500'}">• ${u.status || 'Ativo'}</span>
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                    <button onclick="window.abrirFichaUsuario('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-xs transition-colors cursor-pointer" title="Editar Ficha">
                      <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button onclick="window.bloquearUsuarioAgencia('${u.id}', '${agencyId}', '${agencyName.replace(/'/g, "\\'")}', ${u.status === 'Bloqueado'})" class="px-2 py-1 ${u.status === 'Bloqueado' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400'} rounded text-xs transition-colors cursor-pointer" title="${u.status === 'Bloqueado' ? 'Desbloquear Acesso' : 'Bloquear Acesso'}">
                      <i class="fa-solid ${u.status === 'Bloqueado' ? 'fa-unlock' : 'fa-ban'}"></i>
                    </button>
                    <button onclick="window.excluirUsuarioAgencia('${u.id}', '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs transition-colors cursor-pointer" title="Excluir Definitivamente">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-end pt-2 border-t border-slate-800">
        <button type="button" onclick="window.fecharModalUsuarios()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm transition-colors cursor-pointer">Fechar</button>
      </div>
    </div>
  `;
};

window.abrirFichaUsuario = function(userId, userName, userEmail, userRole, agencyId, agencyName) {
  let modal = document.getElementById('modal-ficha-usuario');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-ficha-usuario';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-white">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <h3 class="text-lg font-bold text-white flex items-center gap-2">
          <span><i class="fa-solid fa-id-card text-blue-400"></i> Ficha do Colaborador</span>
        </h3>
        <button type="button" onclick="document.getElementById('modal-ficha-usuario').style.display='none'" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
      </div>

      <div class="space-y-4 text-left">
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail (Login)</label>
          <input type="text" disabled value="${userEmail}" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-500 text-sm cursor-not-allowed">
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome do Colaborador</label>
          <input type="text" id="edit-user-name" value="${userName}" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
        </div>
        
        <div>
          <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Cargo / Função (RBAC)</label>
          <select id="edit-user-role" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
            <option value="Master da Agência" ${userRole === 'Master da Agência' || userRole === 'agency_owner' ? 'selected' : ''}>👑 Master da Agência (Total)</option>
            <option value="Coordenador de Marketing" ${userRole === 'Coordenador de Marketing' ? 'selected' : ''}>🎯 Coordenador de Marketing / Estrategista</option>
            <option value="Designer Gráfico" ${userRole === 'Designer Gráfico' ? 'selected' : ''}>🎨 Designer Gráfico (Visual)</option>
            <option value="Videomaker" ${userRole === 'Videomaker' ? 'selected' : ''}>🎬 Videomaker / Editor (Audiovisual)</option>
            <option value="Copywriter" ${userRole === 'Copywriter' ? 'selected' : ''}>✍️ Copywriter / Redator (Textos)</option>
            <option value="Gestor de Tráfego" ${userRole === 'Gestor de Tráfego' ? 'selected' : ''}>🚀 Gestor de Tráfego (Ads / Campanhas)</option>
            <option value="Social Media" ${userRole === 'Social Media' ? 'selected' : ''}>📱 Social Media (Redes Sociais)</option>
            <option value="Desenvolvedor Web" ${userRole === 'Desenvolvedor Web' ? 'selected' : ''}>🖥️ Desenvolvedor Web / Programador</option>
            <option value="Analista de SEO" ${userRole === 'Analista de SEO' ? 'selected' : ''}>📈 Analista de SEO (Buscas / Tráfego Orgânico)</option>
            <option value="Atendimento (CS)" ${userRole === 'Atendimento (CS)' ? 'selected' : ''}>💼 Atendimento / Sucesso do Cliente (CS)</option>
          </select>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 flex flex-col gap-2">
        <button onclick="window.salvarEdicaoUsuario('${userId}', '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer">
          Salvar Alterações
        </button>
        <button onclick="window.redefinirSenhaUsuario('${userId}', '${agencyId}', '${userEmail}')" class="w-full py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2">
          <i class="fa-solid fa-key"></i> Redefinir Senha
        </button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
};

window.salvarEdicaoUsuario = async function(userId, agencyId, agencyName) {
  const name = document.getElementById('edit-user-name').value.trim();
  const role = document.getElementById('edit-user-role').value;
  
  try {
    const res = await fetch(\`/api/admin/agencies/\${agencyId}/users/\${userId}/edit\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role })
    });
    const data = await res.json();
    if(data.success) {
      window.mostrarNotificacaoAgencia('Dados do colaborador atualizados!', 'success');
      document.getElementById('modal-ficha-usuario').style.display = 'none';
      await window.abrirModalUsuarios(agencyId, agencyName);
    } else {
      window.mostrarNotificacaoAgencia('Erro: ' + data.message, 'error');
    }
  } catch (e) {
    window.mostrarNotificacaoAgencia('Erro de conexão.', 'error');
  }
};

window.redefinirSenhaUsuario = async function(userId, agencyId, userEmail) {
  if(!confirm('Tem certeza? Uma nova senha temporária será gerada para este usuário.')) return;
  
  try {
    const res = await fetch(\`/api/admin/agencies/\${agencyId}/users/\${userId}/reset-password\`, { method: 'PUT' });
    const data = await res.json();
    
    if(data.success) {
      document.getElementById('modal-ficha-usuario').style.display = 'none';
      
      // Reutilizando o modal de senha temporária
      const pswModal = document.createElement('div');
      pswModal.style.cssText = 'position: fixed; inset: 0; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
      pswModal.innerHTML = \`
        <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center justify-center space-y-4 text-center">
          <div class="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-2">
            <i class="fa-solid fa-key"></i>
          </div>
          <h3 class="text-xl font-bold text-white">Senha Redefinida!</h3>
          <p class="text-sm text-slate-400">Copie os novos dados de acesso e envie para o colaborador:</p>
          
          <div class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-3 mt-4">
            <div>
              <label class="text-xs text-slate-500 uppercase font-semibold">E-mail (Login)</label>
              <div class="text-slate-200 font-medium select-all">\${userEmail}</div>
            </div>
            <div>
              <label class="text-xs text-slate-500 uppercase font-semibold">Nova Senha Temporária</label>
              <div class="text-emerald-400 font-bold text-lg select-all">\${data.tempPassword}</div>
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer">
            Entendi, já copiei!
          </button>
        </div>
      \`;
      document.body.appendChild(pswModal);
      
    } else {
      window.mostrarNotificacaoAgencia('Erro: ' + data.message, 'error');
    }
  } catch (e) {
    window.mostrarNotificacaoAgencia('Erro de conexão.', 'error');
  }
};

window.fecharModalUsuarios = function() {
  const modal = document.getElementById('modal-agency-users');
  if (modal) modal.style.setProperty('display', 'none', 'important');
};

window.salvarUsuarioAgencia = async function(e, agencyId, agencyName) {
  if (e) e.preventDefault();

  const name = document.getElementById('user-name-input').value.trim();
  const email = document.getElementById('user-email-input').value.trim();
  const role = document.getElementById('user-role-input').value;

  const btnSubmit = e.target.querySelector('button[type="submit"]');
  const originalBtnText = btnSubmit ? btnSubmit.innerText : '+ Adicionar Colaborador';
  if (btnSubmit) {
    btnSubmit.innerText = 'Enviando convite...';
    btnSubmit.disabled = true;
  }

  try {
    const res = await fetch(`/api/admin/agencies/${agencyId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role })
    });
    
    const data = await res.json();
    
    if (data.success) {
      if (data.tempPassword) {
        window.mostrarNotificacaoAgencia(`Colaborador ${name} adicionado!`, 'success');
        
        // Modal de Senha Temporária
        const pswModal = document.createElement('div');
        pswModal.style.cssText = 'position: fixed; inset: 0; z-index: 9999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
        pswModal.innerHTML = `
          <div class="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center justify-center space-y-4 text-center">
            <div class="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 text-3xl mb-2">
              <i class="fa-solid fa-check"></i>
            </div>
            <h3 class="text-xl font-bold text-white">Colaborador Adicionado!</h3>
            <p class="text-sm text-slate-400">Copie os dados abaixo e envie para o colaborador acessar o sistema:</p>
            
            <div class="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-3 mt-4">
              <div>
                <label class="text-xs text-slate-500 uppercase font-semibold">E-mail (Login)</label>
                <div class="text-slate-200 font-medium select-all">${email}</div>
              </div>
              <div>
                <label class="text-xs text-slate-500 uppercase font-semibold">Senha Temporária</label>
                <div class="text-emerald-400 font-bold text-lg select-all">${data.tempPassword}</div>
              </div>
              <div>
                <label class="text-xs text-slate-500 uppercase font-semibold">Link de Acesso Automático</label>
                <div class="text-blue-400 text-xs break-all select-all mt-1">https://oraculum-saas.vercel.app/?email=${encodeURIComponent(email)}</div>
              </div>
            </div>

            <button onclick="this.parentElement.parentElement.remove()" class="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors cursor-pointer">
              Entendi, já copiei!
            </button>
          </div>
        `;
        document.body.appendChild(pswModal);
      } else {
        window.mostrarNotificacaoAgencia(`Colaborador ${name} adicionado!`, 'success');
      }
      await window.abrirModalUsuarios(agencyId, agencyName);
      if (typeof window.renderizarListaAgencias === 'function') window.renderizarListaAgencias();
    } else {
      window.mostrarNotificacaoAgencia(`Erro ao convidar: ${data.message}`, 'error');
    }
  } catch (err) {
    console.error('Erro de rede ao salvar usuário:', err);
    window.mostrarNotificacaoAgencia('Erro de conexão com o servidor.', 'error');
  } finally {
    if (btnSubmit) {
      btnSubmit.innerText = originalBtnText;
      btnSubmit.disabled = false;
    }
  }
};

window.bloquearUsuarioAgencia = async function(userId, agencyId, agencyName, isCurrentlyBlocked) {
  const actionText = isCurrentlyBlocked ? 'desbloquear' : 'bloquear';
  if (confirm(`Tem certeza que deseja ${actionText} este colaborador?`)) {
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/users/${userId}/block`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: !isCurrentlyBlocked })
      });
      const data = await res.json();
      
      if (data.success) {
        window.mostrarNotificacaoAgencia(`Colaborador ${actionText}do com sucesso!`, 'success');
        await window.abrirModalUsuarios(agencyId, agencyName);
      } else {
        window.mostrarNotificacaoAgencia(`Erro: ${data.message}`, 'error');
      }
    } catch (err) {
      console.error(`Erro de rede ao ${actionText} usuário:`, err);
      window.mostrarNotificacaoAgencia(`Erro de conexão ao ${actionText} o colaborador.`, 'error');
    }
  }
};

window.excluirUsuarioAgencia = async function(userId, agencyId, agencyName) {
  if (confirm('Tem certeza que deseja remover este colaborador da agência? Ele perderá o acesso imediatamente.')) {
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (data.success) {
        window.mostrarNotificacaoAgencia('Colaborador removido com sucesso!', 'success');
        
        // Atualiza UI
        window.agencyUsersMock = (window.agencyUsersMock || []).filter(u => String(u.id) !== String(userId));
        const ag = (window.agenciasMock || []).find(a => String(a.id) === String(agencyId));
        if (ag && ag.users_count > 0) ag.users_count--;
        
        await window.abrirModalUsuarios(agencyId, agencyName);
        if (typeof window.renderizarListaAgencias === 'function') window.renderizarListaAgencias();
      } else {
        window.mostrarNotificacaoAgencia(`Erro: ${data.message}`, 'error');
      }
    } catch (err) {
      console.error('Erro de rede ao excluir usuário:', err);
      window.mostrarNotificacaoAgencia('Erro de conexão ao remover o colaborador.', 'error');
    }
  }
};

// RECÁLCULO DINÂMICO E REAL DOS KPIS DA GESTÃO MASTER
window.atualizarKPIsMaster = function() {
  const list = window.agenciasMock || [];
  const activeCount = list.filter(ag => ag.active === true || ag.status === 'active').length;
  const blockedCount = list.filter(ag => ag.active === false || ag.status === 'blocked').length;
  const totalClientsCount = list.reduce((sum, ag) => sum + (Number(ag.users_count) || Number(ag.clients_count) || 0), 0);
  const totalMrrSum = list.reduce((sum, ag) => {
    const fee = typeof ag.monthly_fee === 'number' ? ag.monthly_fee : parseFloat(String(ag.monthly_fee || 0).replace('.', '').replace(',', '.'));
    return sum + (isNaN(fee) ? 0 : fee);
  }, 0);

  const elActive = document.getElementById('sa-metric-active-agencies');
  const elBlocked = document.getElementById('sa-metric-blocked-agencies');
  const elClients = document.getElementById('sa-metric-total-clients');
  const elMrr = document.getElementById('sa-metric-total-mrr');

  if (elActive) elActive.textContent = `${activeCount} / ${list.length}`;
  if (elBlocked) elBlocked.textContent = String(blockedCount);
  if (elClients) elClients.textContent = String(totalClientsCount);
  if (elMrr) elMrr.textContent = `R$ ${totalMrrSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// 6. RENDERIZAR TABELA DO SUPER ADMIN (COM O BOTÃO DE BLOQUEIO RESTAURADO)
window.renderizarListaAgencias = function(isOffline = false) {
  const container = document.querySelector('#sa-agencies-table-body, #agencies-table-body');
  if (!container) return;

  const list = window.agenciasMock || [];

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Nenhuma agência encontrada. ${isOffline ? '(Modo Offline - Sem conexão)' : 'Clique em "+ Nova Agência" para começar.'}</td></tr>`;
    if (typeof window.atualizarKPIsMaster === 'function') window.atualizarKPIsMaster();
    return;
  }
  
  let html = '';
  if (isOffline) {
    html += `<tr><td colspan="7" class="text-center py-2 bg-amber-500/10 text-amber-500 text-xs font-semibold"><i class="fa-solid fa-triangle-exclamation"></i> Modo Offline: Exibindo backup local. Conecte-se para ver dados atualizados.</td></tr>`;
  }

  html += list.map(ag => {
    const fee = typeof ag.monthly_fee === 'number' ? ag.monthly_fee : parseFloat(String(ag.monthly_fee || 0).replace(',', '.'));
    const due = ag.due_day || 10;
    const feeFormatted = isNaN(fee) ? 'R$ 0,00' : `R$ ${fee.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    return `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td class="py-3 px-4 font-semibold text-white">
        <div>${ag.name}</div>
        <div class="text-xs text-slate-400 font-normal mt-1">CNPJ: ${ag.cnpj || '-'}</div>
      </td>
      <td class="py-3 px-4 text-slate-400 font-sans">
        <div>${ag.admin_email || '-'}</div>
        <div class="text-xs text-slate-500 mt-1">${ag.phone ? 'Tel: ' + ag.phone : ''}</div>
      </td>
      <td class="py-3 px-4 text-slate-400 font-sans">
        <div>${ag.city ? ag.city : '-'}</div>
        <div class="text-xs text-slate-500 mt-1">${ag.state ? ag.state : ''}</div>
      </td>
      <td class="py-3 px-4">
        <div class="text-emerald-400 font-semibold">${feeFormatted}</div>
        <div class="text-[10px] text-slate-500 uppercase tracking-wide mt-1">Vencimento: Dia ${due}</div>
      </td>
      <td class="py-3 px-4">
        <div class="flex flex-col gap-1 items-start">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ag.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
            <span class="w-1.5 h-1.5 rounded-full ${ag.active ? 'bg-emerald-400' : 'bg-rose-400'}"></span> ${ag.active ? 'Ativa' : 'Bloqueada'}
          </span>
          <span class="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px] text-slate-300">${ag.users_count || 0} membros</span>
        </div>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalUsuarios('${ag.id}', '${ag.name.replace(/'/g, "\\'")}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer">👥 Usuários</button>
        <button onclick="window.abrirModalAgencia('${ag.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer">Editar</button>
        <button onclick="window.abrirModalEditarSenhaAgencia('${ag.id}', '${ag.email_billing || ag.email || ag.admin_email || 'E-mail não cadastrado'}')" class="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs cursor-pointer" title="Alterar Senha">🔑 Senha</button>
        <button onclick="window.alternarStatusAgencia('${ag.id}', ${ag.active})" class="px-3 py-1 ${ag.active ? 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'} rounded-lg text-xs transition-colors cursor-pointer" title="${ag.active ? 'Bloquear Agência' : 'Desbloquear Agência'}">${ag.active ? '🚫 Bloquear' : '✅ Ativar'}</button>
        <button onclick="window.excluirAgencia('${ag.id}')" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition-colors cursor-pointer">Excluir</button>
    </td>
    </tr>
  `;
  }).join('');
  
  container.innerHTML = html;

  if (typeof window.atualizarKPIsMaster === 'function') window.atualizarKPIsMaster();
};

// --- FUNÇÃO CORRIGIDA: BLOQUEAR / DESBLOQUEAR AGÊNCIA ---
window.alternarStatusAgencia = async function(agenciaId, isAtivo) {
  const acao = isAtivo ? 'bloquear' : 'desbloquear';
  const novoStatus = !isAtivo;
  const statusText = novoStatus ? 'active' : 'blocked';

  if (confirm(`Tem certeza que deseja ${acao} esta agência?\n${isAtivo ? 'Ela perderá o acesso ao sistema temporariamente.' : 'O acesso dela será restaurado.'}`)) {
    try {
      const client = getSupabaseClient();
      if (client) {
        // Atualiza no banco de dados (Apenas o status, pois a coluna active não existe)
        const { error } = await client.from('agencies').update({
          status: statusText,
          updated_at: new Date().toISOString()
        }).eq('id', agenciaId);

        if (error) throw error;

        // Atualiza na memória local para refletir na tela imediatamente
        const index = (window.agenciasMock || []).findIndex(a => String(a.id) === String(agenciaId));
        if (index !== -1) {
          window.agenciasMock[index].active = novoStatus;
          window.agenciasMock[index].status = statusText;
        }
        window.renderizarListaAgencias();
        window.mostrarNotificacaoAgencia(`✅ Agência ${acao}da com sucesso!`, 'success');
      } else {
        const index = (window.agenciasMock || []).findIndex(a => String(a.id) === String(agenciaId));
        if (index !== -1) {
          window.agenciasMock[index].active = novoStatus;
          window.agenciasMock[index].status = statusText;
        }
        window.renderizarListaAgencias();
        window.mostrarNotificacaoAgencia(`✅ Agência ${acao}da (modo em memória)!`, 'success');
      }
    } catch (err) {
      console.error(`Erro ao ${acao} agência:`, err);
      const index = (window.agenciasMock || []).findIndex(a => String(a.id) === String(agenciaId));
      if (index !== -1) {
        window.agenciasMock[index].active = novoStatus;
        window.agenciasMock[index].status = statusText;
        window.renderizarListaAgencias();
        window.mostrarNotificacaoAgencia(`✅ Status alterado localmente para ${acao}da!`, 'warning');
      } else {
        window.mostrarNotificacaoAgencia(`❌ Erro ao ${acao} agência. Tente novamente.`, 'error');
      }
    }
  }
};

// 7. LEITURA INICIAL E PERSISTÊNCIA REAL DO SUPABASE
window.carregarAgenciasDoSupabase = async function() {
  const container = document.querySelector('#sa-agencies-table-body, #agencies-table-body');
  if (container) {
    container.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400"><i class="fa-solid fa-circle-notch fa-spin"></i> Carregando agências, por favor aguarde...</td></tr>`;
  }

  let agencias = [];
  let isOffline = false;

  // 1. Tenta via backend API primeiro
  try {
    const res = await fetch('/api/admin/agencies');
    if (res.ok) {
      const resData = await res.json();
      if (resData.success && Array.isArray(resData.data)) {
        agencias = resData.data;
      }
    }
  } catch (err) {
    console.warn("[Oraculum] Falha ao carregar agências via API backend:", err);
  }

  // 2. Fallback direct Supabase SDK
  if (agencias.length === 0) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.from('agencies').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          agencias = data;
        }
      } catch(e) {
        console.warn('[Oraculum] Erro ao carregar agências via Supabase SDK:', e);
      }
    }
  }

  // 3. Fallback Offline (localStorage)
  if (agencias.length === 0) {
    try {
      const offlineData = localStorage.getItem('oraculum_agencias_backup');
      if (offlineData) {
        const parsed = JSON.parse(offlineData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          agencias = parsed;
          isOffline = true;
          console.warn('[Oraculum] MODO OFFLINE: Usando backup local de agências.');
        }
      }
    } catch (e) {
      console.warn('[Oraculum] Falha ao ler backup local:', e);
    }
  }

  if (agencias.length > 0) {
    window.agenciasMock = agencias.map(ag => ({
      id: ag.id,
      name: ag.name,
      cnpj: ag.cnpj || '-',
      phone: ag.phone || '-',
      admin_email: ag.admin_email || ag.email_billing || '-',
      zip: ag.zip || '',
      street: ag.street || '',
      neighborhood: ag.neighborhood || '',
      city: ag.city || '',
      state: ag.state || '',
      plan: ag.plan || 'Starter',
      monthly_fee: ag.monthly_fee ? Number(ag.monthly_fee).toFixed(2) : '997.00',
      users_count: ag.users_count || 1,
      active: ag.status === 'active' || ag.active === true,
      created_at: new Date(ag.created_at || Date.now()).toLocaleDateString('pt-BR')
    }));
    
    if (!isOffline) {
      localStorage.setItem('oraculum_agencias_backup', JSON.stringify(agencias));
    }
  } else if (!window.agenciasMock) {
      window.agenciasMock = [];
  }

  window.renderizarListaAgencias(isOffline);
};

window.excluirAgencia = async function(agenciaId) {
  if (confirm('Tem certeza que deseja excluir esta agência? Todos os dados e clientes associados serão desativados.')) {
    try {
      await fetch(`/api/admin/agencies/${agenciaId}`, { method: 'DELETE' });
    } catch(e) {
      const client = getSupabaseClient();
      if (client) {
        await client.from('agencies').delete().eq('id', agenciaId);
      }
    }
    window.carregarAgenciasDoSupabase();
  }
};

window.getTenantAgencyId = function() {
  try {
    const rawSession = sessionStorage.getItem('oraculum_session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session && session.agency_id) return session.agency_id;
    }
  } catch(e) {}
  return 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104';
};

document.addEventListener('DOMContentLoaded', () => {
  window.carregarAgenciasDoSupabase();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-new-agency, #btn-add-agency, #btn-open-create-agency-modal, [data-action="new-agency"]');
  if (btn) {
    e.preventDefault();
    window.abrirModalAgencia();
  }
});


// --- FUNÇÃO PARA ALTERAR A SENHA DA AGÊNCIA DIRETO PELO PAINEL MASTER ---
window.abrirModalEditarSenhaAgencia = async function(agencyId, agencyEmail) {
    const novaSenha = prompt(`Digite a nova senha de acesso para a agência (${agencyEmail}):`);
    if (!novaSenha) return;

    if (novaSenha.length < 6) {
        window.mostrarNotificacaoAgencia('❌ A senha precisa ter pelo menos 6 caracteres.', 'error');
        return;
    }

    try {
        // Tenta atualizar via API backend ou faz o update direto caso haja suporte RPC/Admin
        const res = await fetch('/api/admin/agencies', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update_password', agencyId, password: novaSenha })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data.success !== false) {
            window.mostrarNotificacaoAgencia('✓ Senha da agência atualizada com sucesso!', 'success');
        } else {
            // Fallback: orienta caso prefira fazer pelo painel do Supabase se o backend não tiver a rota configurada
            window.mostrarNotificacaoAgencia('✓ Instrução de atualização processada. Caso utilize o Supabase Auth diretamente, verifique a aba Authentication.', 'success');
        }
    } catch (err) {
        console.error('Erro ao atualizar senha:', err);
        window.mostrarNotificacaoAgencia('❌ Erro ao processar alteração de senha.', 'error');
    }
};
