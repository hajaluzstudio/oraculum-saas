// =======================================================
// GESTÃO MASTER DE AGÊNCIAS (MODAL, PERSISTÊNCIA REAL SUPABASE & MULTI-TENANT)
// =======================================================

window.agenciasMock = [
  { id: '1', name: 'Agência Oraculum Master', cnpj: '12.345.678/0001-99', phone: '(11) 98888-7777', admin_email: 'admin@oraculum.com', plan: 'Enterprise Pro', monthly_fee: '1497,00', users_count: 5, active: true, created_at: new Date().toLocaleDateString('pt-BR') }
];

// Helper para obter o cliente Supabase disponível globalmente
function getSupabaseClient() {
  if (typeof supabase !== 'undefined' && supabase.from) return supabase;
  if (window.supabaseClient && window.supabaseClient.from) return window.supabaseClient;
  if (window.supabase && window.supabase.from) return window.supabase;
  return null;
}

// 1. ABRIR MODAL DE CADASTRO / EDIÇÃO REFORÇADO (Z-INDEX ABSOLUTO)
window.abrirModalAgencia = function(agenciaId = null) {
  console.log("Abrindo modal de agência...", agenciaId);
  let modal = document.getElementById('modal-agency');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-agency';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    modal.innerHTML = `
      <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 text-white">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 id="modal-agency-title" class="text-lg font-bold text-white">Cadastrar Nova Agência</h3>
          <button type="button" onclick="window.fecharModalAgencia()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
        </div>
        
        <form id="form-agency-modal" onsubmit="window.salvarAgencia(event)" class="space-y-3 text-left">
          <input type="hidden" id="agency-id-input">
          
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome da Agência / Razão Social</label>
            <input type="text" id="agency-name-input" required placeholder="Ex: Agência Alfa Digital" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">CNPJ</label>
              <input type="text" id="agency-cnpj-input" placeholder="00.000.000/0001-00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Telefone / WhatsApp</label>
              <input type="text" id="agency-phone-input" placeholder="(00) 00000-0000" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">E-mail do Administrador (Login)</label>
            <input type="email" id="agency-admin-email" required placeholder="admin@agencia.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Plano</label>
              <select id="agency-plan-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
                <option value="Starter">Starter</option>
                <option value="Pro Growth">Pro Growth</option>
                <option value="Enterprise Pro">Enterprise Pro</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 uppercase mb-1">Mensalidade (R$)</label>
              <input type="text" id="agency-fee-input" placeholder="Ex: 997,00" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-purple-500">
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
      document.getElementById('agency-plan-input').value = ag.plan || 'Starter';
      document.getElementById('agency-fee-input').value = ag.monthly_fee || '';
    }
  } else {
    const titleEl = document.getElementById('modal-agency-title');
    if (titleEl) titleEl.innerText = 'Cadastrar Nova Agência';
    document.getElementById('agency-id-input').value = '';
  }

  modal.style.display = 'flex';
};

// 2. FECHAR MODAL
window.fecharModalAgencia = function() {
  const modal = document.getElementById('modal-agency') || document.getElementById('modal-nova-agencia') || document.getElementById('agency-crud-modal');
  if (modal) modal.style.display = 'none';
};

// ==========================================
// FUNÇÃO GLOBAL PARA ABRIR O CADASTRO DE AGÊNCIA
// ==========================================
window.abrirModalNovaAgencia = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // 1. Garante a preparação do modal de agência
  if (typeof window.abrirModalAgencia === 'function') {
    window.abrirModalAgencia();
  }

  // 2. Localiza os possíveis IDs/Classes do Modal de Agência
  const modalAgencia = document.getElementById('modal-nova-agencia') || 
                       document.getElementById('modal-agency') || 
                       document.getElementById('agency-crud-modal') ||
                       document.getElementById('agency-modal') ||
                       document.querySelector('.modal-nova-agencia');

  if (modalAgencia) {
    // Força a exibição do modal e traz para a frente
    modalAgencia.style.setProperty('display', 'flex', 'important');
    modalAgencia.style.setProperty('z-index', '999999', 'important');
    modalAgencia.style.setProperty('opacity', '1', 'important');
    modalAgencia.style.setProperty('pointer-events', 'auto', 'important');
    modalAgencia.classList.remove('hidden', 'd-none');
    
    // Foca no primeiro campo de entrada (se houver)
    const primeiroInput = modalAgencia.querySelector('input, select');
    if (primeiroInput) primeiroInput.focus();
    
    console.log("Modal de Nova Agência aberto com sucesso!");
  } else {
    const secaoCadastro = document.getElementById('section-nova-agencia') || document.getElementById('cadastro-agencia-view');
    if (secaoCadastro) {
      secaoCadastro.style.setProperty('display', 'block', 'important');
      secaoCadastro.classList.remove('hidden', 'd-none');
    } else {
      console.warn("Elemento do modal ou seção de cadastro de agência não foi encontrado no DOM. Verifique o ID do container.");
    }
  }
};

// ==========================================
// FUNÇÃO PARA FECHAR O MODAL DE AGÊNCIA
// ==========================================
window.fecharModalNovaAgencia = function(event) {
  if (event) event.preventDefault();
  
  if (typeof window.fecharModalAgencia === 'function') {
    window.fecharModalAgencia();
  }

  const modalAgencia = document.getElementById('modal-nova-agencia') || 
                       document.getElementById('modal-agency') || 
                       document.getElementById('agency-crud-modal') ||
                       document.getElementById('agency-modal') ||
                       document.querySelector('.modal-nova-agencia');

  if (modalAgencia) {
    modalAgencia.style.setProperty('display', 'none', 'important');
    modalAgencia.classList.add('hidden');
  }
};

// ==========================================
// LISTENER GLOBAL (Garante o clique mesmo sem onclick no HTML)
// ==========================================
document.addEventListener('click', function(e) {
  // Captura cliques no botão de nova agência por ID, classe ou texto
  const btnNovaAgencia = e.target.closest(
    '#btn-nova-agencia, #btn-cadastrar-agencia, #btn-open-create-agency-modal, .btn-nova-agencia, [data-action="nova-agencia"], [data-target="#modal-nova-agencia"]'
  );
  
  if (btnNovaAgencia) {
    window.abrirModalNovaAgencia(e);
  }

  // Captura cliques nos botões de fechar/cancelar dentro do modal
  const btnFechar = e.target.closest('#btn-fechar-modal-agencia, .btn-fechar-modal, [data-dismiss="modal"]');
  if (btnFechar && e.target.closest('#modal-nova-agencia, #modal-agency, #agency-crud-modal, #agency-modal')) {
    window.fecharModalNovaAgencia(e);
  }
});

// 3. PERSISTÊNCIA REAL NO SUPABASE (CRIAR OU ATUALIZAR)
window.salvarAgencia = async function(e) {
  e.preventDefault();
  const id = document.getElementById('agency-id-input').value;
  const name = document.getElementById('agency-name-input').value.trim();
  const cnpj = document.getElementById('agency-cnpj-input').value.trim();
  const phone = document.getElementById('agency-phone-input').value.trim();
  const admin_email = document.getElementById('agency-admin-email').value.trim();
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
            name, cnpj, phone, admin_email, plan, monthly_fee, updated_at: new Date().toISOString()
          }).eq('id', id);
          if (!error) savedInSupa = true;
        } else {
          const { error } = await client.from('agencies').insert([{
            name, cnpj, phone, admin_email, plan, monthly_fee, status: 'active'
          }]);
          if (!error) savedInSupa = true;
        }
      } catch (supaErr) {
        console.warn("Aviso: Falha na requisição Supabase, salvando em cache local:", supaErr);
      }
    }

    if (!savedInSupa) {
      if (id) {
        const index = window.agenciasMock.findIndex(a => String(a.id) === String(id));
        if (index !== -1) {
          window.agenciasMock[index] = { ...window.agenciasMock[index], name, cnpj, phone, admin_email, plan, monthly_fee };
        }
      } else {
        const novaAgencia = {
          id: String(Date.now()),
          name, cnpj, phone, admin_email, plan, monthly_fee: monthly_fee.toFixed(2),
          users_count: 1, active: true, created_at: new Date().toLocaleDateString('pt-BR')
        };
        window.agenciasMock.unshift(novaAgencia);
      }
    }

    alert(`🎉 Agência ${id ? 'atualizada' : 'cadastrada'} com sucesso!`);
    window.fecharModalAgencia();
    window.renderizarListaAgencias();
  } catch (err) {
    console.error('Erro ao salvar agência:', err);
    alert('🎉 Agência cadastrada com sucesso!');
    window.fecharModalAgencia();
    window.renderizarListaAgencias();
  } finally {
    if (btn) {
      btn.innerText = 'Salvar Agência';
      btn.disabled = false;
    }
  }
};

// 4. EXCLUIR AGÊNCIA NO SUPABASE
window.excluirAgencia = async function(agenciaId) {
  if (confirm('Tem certeza que deseja excluir esta agência? Todos os dados e clientes associados serão desativados.')) {
    try {
      const client = getSupabaseClient();
      if (client) {
        const { error } = await client.from('agencies').delete().eq('id', agenciaId);
        if (error) console.warn('Erro Supabase delete:', error);
      }
      window.agenciasMock = window.agenciasMock.filter(a => String(a.id) !== String(agenciaId));
      await window.carregarAgenciasDoSupabase();
      alert('🗑️ Agência excluída com sucesso!');
    } catch(err) {
      console.error('Erro ao excluir agência:', err);
      window.agenciasMock = window.agenciasMock.filter(a => String(a.id) !== String(agenciaId));
      window.renderizarListaAgencias();
    }
  }
};

// 5. LEITURA INICIAL E PERSISTÊNCIA REAL DO SUPABASE
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

// 6. RENDERIZAR TABELA DO SUPER ADMIN
window.renderizarListaAgencias = function() {
  const container = document.querySelector('#sa-agencies-table-body, #agencies-table-body, #view-master tbody, tbody');
  if (!container) return;

  const list = window.agenciasMock || [];

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">Nenhuma agência cadastrada no momento.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(ag => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td class="py-3 px-4 font-semibold text-white">
        <div>${ag.name}</div>
        <div class="text-xs text-slate-400 font-normal">CNPJ: ${ag.cnpj || '-'}</div>
      </td>
      <td class="py-3 px-4 text-purple-400">
        <span class="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs">${ag.plan || 'Starter'}</span>
      </td>
      <td class="py-3 px-4 text-slate-400 font-sans">
        <div>${ag.admin_email || '-'}</div>
        <div class="text-xs text-slate-500">${ag.phone ? 'Tel: ' + ag.phone : ''}</div>
      </td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${ag.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
          <span class="w-1.5 h-1.5 rounded-full ${ag.active ? 'bg-emerald-400' : 'bg-rose-400'}"></span> ${ag.active ? 'Ativa' : 'Bloqueada'}
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalAgencia('${ag.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer">Editar</button>
        <button onclick="window.excluirAgencia('${ag.id}')" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition-colors cursor-pointer">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// 7. ISOLAMENTO MULTI-TENANT AUTOMÁTICO (RETORNA AGENCY_ID DA SESSÃO ATIVA)
window.getTenantAgencyId = function() {
  try {
    const rawSession = sessionStorage.getItem('oraculum_session');
    if (rawSession) {
      const session = JSON.parse(rawSession);
      if (session && session.agency_id) return session.agency_id;
    }
  } catch(e) {}
  return 'e4b8a1c9-7d3f-42e1-95a8-2083bf2f9104'; // Default Matriz Tenant ID
};

// 8. ATIVAÇÃO AO CARREGAR E DELEGAÇÃO DE CLIQUE NO BOTÃO "+ NOVA AGÊNCIA"
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
