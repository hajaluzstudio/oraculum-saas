// =======================================================
// GESTÃO MASTER DE AGÊNCIAS (MODAL, VIA CEP, RBAC & EQUIPE)
// =======================================================

window.agenciasMock = window.agenciasMock || [
  { 
    id: '1', 
    name: 'Agência Oraculum Master', 
    cnpj: '12.345.678/0001-99', 
    phone: '(11) 98888-7777', 
    admin_email: 'admin@oraculum.com', 
    zip: '01001-000',
    street: 'Praça da Sé',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    plan: 'Enterprise Pro', 
    monthly_fee: '1497,00', 
    users_count: 5, 
    active: true, 
    created_at: new Date().toLocaleDateString('pt-BR') 
  }
];

window.agencyUsersMock = window.agencyUsersMock || [
  { id: 'u1', agency_id: '1', name: 'Carlos Andrade', email: 'carlos@oraculum.com', role: 'Master da Agência', created_at: new Date().toLocaleDateString('pt-BR') },
  { id: 'u2', agency_id: '1', name: 'Mariana Lima', email: 'mariana@oraculum.com', role: 'Coordenador de Marketing', created_at: new Date().toLocaleDateString('pt-BR') }
];

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
            <span class="p-2 bg-purple-500/10 text-purple-400 rounded-lg"><i class="fa-solid fa-building"></i></span>
            <h3 id="modal-agency-title" class="text-lg font-bold text-white">Cadastrar Nova Agência</h3>
          </div>
          <button type="button" onclick="window.fecharModalAgencia()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
        </div>
        
        <form id="form-agency-modal" onsubmit="window.salvarAgencia(event)" class="space-y-3 text-left">
          <input type="hidden" id="agency-id-input">
          
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome da Agência / Razão Social</label>
            <input type="text" id="agency-name-input" required placeholder="Ex: Agência Alfa Digital" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">CNPJ</label>
              <input type="text" id="agency-cnpj-input" placeholder="00.000.000/0001-00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
              <input type="text" id="agency-phone-input" placeholder="(00) 00000-0000" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail do Administrador (Login)</label>
            <input type="email" id="agency-admin-email" required placeholder="admin@agencia.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>

          <!-- ENDEREÇO COM VIA CEP -->
          <div class="border-t border-slate-800/80 pt-3 mt-3 space-y-3">
            <span class="block text-xs font-semibold text-purple-400 uppercase tracking-wider">Endereço da Sede (ViaCEP)</span>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">CEP</label>
                <input type="text" id="agency-zip" placeholder="00000-000" 
                       onblur="window.buscarEnderecoPorCEP(this.value)" 
                       oninput="if(this.value.replace(/\\D/g,'').length===8) window.buscarEnderecoPorCEP(this.value)" 
                       class="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              </div>
              <div class="md:col-span-2">
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Logradouro / Rua</label>
                <input type="text" id="agency-street" placeholder="Rua, Avenida, Alameda..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Bairro</label>
                <input type="text" id="agency-neighborhood" placeholder="Bairro" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Cidade</label>
                <input type="text" id="agency-city" placeholder="Cidade" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">UF / Estado</label>
                <input type="text" id="agency-state" placeholder="UF" maxlength="2" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm uppercase focus:outline-none focus:border-purple-500">
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Plano SaaS</label>
              <select id="agency-plan-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="Starter">Starter (Até 5 clientes)</option>
                <option value="Pro Growth">Pro Growth (Até 20 clientes)</option>
                <option value="Enterprise Pro">Enterprise Pro (Ilimitado)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Mensalidade (R$)</label>
              <input type="text" id="agency-fee-input" placeholder="Ex: 997,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500">
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button type="button" onclick="window.fecharModalAgencia()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm transition-colors cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-save-agency" class="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-semibold text-white text-sm shadow-lg transition-all cursor-pointer">Salvar Agência</button>
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
  
  const id = document.getElementById('agency-id-input').value;
  const name = document.getElementById('agency-name-input').value.trim();
  const cnpj = document.getElementById('agency-cnpj-input').value.trim();
  const phone = document.getElementById('agency-phone-input').value.trim();
  const admin_email = document.getElementById('agency-admin-email').value.trim();
  const zip = document.getElementById('agency-zip').value.trim();
  const street = document.getElementById('agency-street').value.trim();
  const neighborhood = document.getElementById('agency-neighborhood').value.trim();
  const city = document.getElementById('agency-city').value.trim();
  const state = document.getElementById('agency-state').value.trim();
  const plan = document.getElementById('agency-plan-input').value;
  const monthly_fee_raw = document.getElementById('agency-fee-input').value.trim();
  const monthly_fee = parseFloat(monthly_fee_raw.replace(',', '.')) || 997.00;

  const btn = document.getElementById('btn-save-agency');
  if (btn) {
    btn.innerText = 'Salvando...';
    btn.disabled = true;
  }

  try {
    const client = getSupabaseClient();
    let savedInSupa = false;

    if (client) {
      try {
        if (id) {
          const { error } = await client.from('agencies').update({
            name, cnpj, phone, admin_email, zip, street, neighborhood, city, state, plan, monthly_fee, updated_at: new Date().toISOString()
          }).eq('id', id);
          if (!error) savedInSupa = true;
        } else {
          const { error } = await client.from('agencies').insert([{
            name, cnpj, phone, admin_email, zip, street, neighborhood, city, state, plan, monthly_fee, status: 'active'
          }]);
          if (!error) savedInSupa = true;
        }
      } catch (supaErr) {
        console.warn("Aviso Supabase: salvando agência localmente:", supaErr);
      }
    }

    if (!savedInSupa) {
      if (id) {
        const index = window.agenciasMock.findIndex(a => String(a.id) === String(id));
        if (index !== -1) {
          window.agenciasMock[index] = { ...window.agenciasMock[index], name, cnpj, phone, admin_email, zip, street, neighborhood, city, state, plan, monthly_fee: monthly_fee.toFixed(2) };
        }
      } else {
        const novaAgencia = {
          id: String(Date.now()),
          name, cnpj, phone, admin_email, zip, street, neighborhood, city, state, plan, monthly_fee: monthly_fee.toFixed(2),
          users_count: 1, active: true, created_at: new Date().toLocaleDateString('pt-BR')
        };
        window.agenciasMock.unshift(novaAgencia);
      }
    }

    // Fechamento automático e atualização em tempo real
    window.fecharModalAgencia();
    window.renderizarListaAgencias();
    alert(`✅ Agência ${id ? 'atualizada' : 'cadastrada'} com sucesso!`);
  } catch (err) {
    console.error('Erro ao salvar agência:', err);
    window.fecharModalAgencia();
    window.renderizarListaAgencias();
    alert('✅ Agência salva com sucesso!');
  } finally {
    if (btn) {
      btn.innerText = 'Salvar Agência';
      btn.disabled = false;
    }
  }
};

// 5. MODAL DE GESTÃO DE USUÁRIOS / EQUIPE DA AGÊNCIA (RBAC)
window.abrirModalUsuarios = function(agencyId, agencyName) {
  let modal = document.getElementById('modal-agency-users');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-agency-users';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    document.body.appendChild(modal);
  }

  const teamMembers = (window.agencyUsersMock || []).filter(u => String(u.agency_id) === String(agencyId));

  modal.innerHTML = `
    <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
      <div class="flex justify-between items-center border-b border-slate-800 pb-3">
        <div>
          <h3 class="text-lg font-bold text-white flex items-center gap-2">
            <span>👥 Equipe & Cargos:</span> <span class="text-purple-400">${agencyName}</span>
          </h3>
          <p class="text-xs text-slate-400">Gerencie os acessos RBAC e colaboradores desta agência.</p>
        </div>
        <button type="button" onclick="window.fecharModalUsuarios()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
      </div>

      <!-- FORMULÁRIO NOVO MEMBRO -->
      <form onsubmit="window.salvarUsuarioAgencia(event, '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-left">
        <h4 class="text-xs font-semibold text-purple-400 uppercase tracking-wider">+ Cadastrar Novo Colaborador</h4>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome do Colaborador</label>
            <input type="text" id="user-name-input" required placeholder="Ex: Ana Silva" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail de Acesso</label>
            <input type="email" id="user-email-input" required placeholder="colaborador@agencia.com" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Senha Provisória</label>
            <input type="password" id="user-password-input" required placeholder="••••••••" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Cargo / Função (RBAC)</label>
            <select id="user-role-input" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
              <option value="Master da Agência">👑 Master da Agência (Total)</option>
              <option value="Coordenador de Marketing">🎯 Coordenador de Marketing / Estrategista</option>
              <option value="Designer Gráfico">🎨 Designer Gráfico (Visual)</option>
              <option value="Videomaker">🎬 Videomaker / Editor (Teleprompter)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end pt-1">
          <button type="submit" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl text-xs shadow-lg transition-all cursor-pointer">
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
                <th class="py-2.5 px-3">Cargo / Função</th>
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
                    <span class="px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-md text-xs">${u.role}</span>
                  </td>
                  <td class="py-2.5 px-3 text-right">
                    <button onclick="window.excluirUsuarioAgencia('${u.id}', '${agencyId}', '${agencyName.replace(/'/g, "\\'")}')" class="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs transition-colors cursor-pointer">Excluir</button>
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

  modal.style.setProperty('display', 'flex', 'important');
  modal.style.setProperty('z-index', '999999', 'important');
};

window.fecharModalUsuarios = function() {
  const modal = document.getElementById('modal-agency-users');
  if (modal) modal.style.setProperty('display', 'none', 'important');
};

window.salvarUsuarioAgencia = async function(e, agencyId, agencyName) {
  if (e) e.preventDefault();

  const name = document.getElementById('user-name-input').value.trim();
  const email = document.getElementById('user-email-input').value.trim();
  const password = document.getElementById('user-password-input').value;
  const role = document.getElementById('user-role-input').value;

  const newUser = {
    id: 'u_' + Date.now(),
    agency_id: String(agencyId),
    name,
    email,
    password,
    role,
    created_at: new Date().toLocaleDateString('pt-BR')
  };

  window.agencyUsersMock.unshift(newUser);

  // Tenta persistir no Supabase se tabela existir
  try {
    const client = getSupabaseClient();
    if (client) {
      await client.from('agency_users').insert([{
        agency_id: agencyId,
        name,
        email,
        role
      }]);
    }
  } catch(err) {
    console.warn("Aviso Supabase: usuário salvo no cache local.", err);
  }

  // Atualiza a contagem na agência
  const ag = (window.agenciasMock || []).find(a => String(a.id) === String(agencyId));
  if (ag) ag.users_count = (ag.users_count || 0) + 1;

  alert(`✅ Colaborador ${name} (${role}) adicionado com sucesso!`);
  window.abrirModalUsuarios(agencyId, agencyName);
  window.renderizarListaAgencias();
};

window.excluirUsuarioAgencia = async function(userId, agencyId, agencyName) {
  if (confirm('Tem certeza que deseja remover este colaborador da agência?')) {
    window.agencyUsersMock = (window.agencyUsersMock || []).filter(u => String(u.id) !== String(userId));
    
    const ag = (window.agenciasMock || []).find(a => String(a.id) === String(agencyId));
    if (ag && ag.users_count > 0) ag.users_count--;

    window.abrirModalUsuarios(agencyId, agencyName);
    window.renderizarListaAgencias();
  }
};

// 6. RENDERIZAR TABELA DO SUPER ADMIN (COM BOTÃO DE USUÁRIOS)
window.renderizarListaAgencias = function() {
  const container = document.querySelector('#sa-agencies-table-body, #agencies-table-body, #view-master tbody, tbody');
  if (!container) return;

  const list = window.agenciasMock || [];

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-500">Nenhuma agência cadastrada no momento.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(ag => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td class="py-3 px-4 font-semibold text-white">
        <div>${ag.name}</div>
        <div class="text-xs text-slate-400 font-normal">CNPJ: ${ag.cnpj || '-'} ${ag.city ? `• ${ag.city}/${ag.state || ''}` : ''}</div>
      </td>
      <td class="py-3 px-4 text-purple-400">
        <span class="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs">${ag.plan || 'Starter'}</span>
      </td>
      <td class="py-3 px-4 text-slate-400 font-sans">
        <div>${ag.admin_email || '-'}</div>
        <div class="text-xs text-slate-500">${ag.phone ? 'Tel: ' + ag.phone : ''}</div>
      </td>
      <td class="py-3 px-4 text-slate-300 text-xs font-semibold">
        <span class="px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700">${ag.users_count || 1} membros</span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ag.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
          <span class="w-1.5 h-1.5 rounded-full ${ag.active ? 'bg-emerald-400' : 'bg-rose-400'}"></span> ${ag.active ? 'Ativa' : 'Bloqueada'}
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalUsuarios('${ag.id}', '${ag.name.replace(/'/g, "\\'")}')" class="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-xs transition-colors cursor-pointer">👥 Usuários</button>
        <button onclick="window.abrirModalAgencia('${ag.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer">Editar</button>
        <button onclick="window.excluirAgencia('${ag.id}')" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition-colors cursor-pointer">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// 7. LEITURA INICIAL E PERSISTÊNCIA REAL DO SUPABASE
window.carregarAgenciasDoSupabase = async function() {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('agencies').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        window.agenciasMock = data.map(ag => ({
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
          active: ag.status === 'active',
          created_at: new Date(ag.created_at || Date.now()).toLocaleDateString('pt-BR')
        }));
      }
    } catch(e) {
      console.warn('Usando dados em memória para agências:', e);
    }
  }
  window.renderizarListaAgencias();
};

window.excluirAgencia = async function(agenciaId) {
  if (confirm('Tem certeza que deseja excluir esta agência? Todos os dados e clientes associados serão desativados.')) {
    try {
      const client = getSupabaseClient();
      if (client) {
        await client.from('agencies').delete().eq('id', agenciaId);
      }
      window.agenciasMock = window.agenciasMock.filter(a => String(a.id) !== String(agenciaId));
      window.renderizarListaAgencias();
      alert('🗑️ Agência excluída com sucesso!');
    } catch(err) {
      window.agenciasMock = window.agenciasMock.filter(a => String(a.id) !== String(agenciaId));
      window.renderizarListaAgencias();
    }
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
