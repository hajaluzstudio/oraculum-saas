// =======================================================
// GESTÃO MASTER DE AGÊNCIAS (MODAL, CADASTRO, EDIÇÃO, EXCLUSÃO)
// =======================================================

window.agenciasMock = [
  { id: '1', name: 'Agência Oraculum Master', plan: 'Enterprise Pro', users_count: 5, active: true, created_at: new Date().toLocaleDateString('pt-BR') }
];

// 1. Abrir Modal de Cadastro/Edição
window.abrirModalAgencia = function(agenciaId = null) {
  let modal = document.getElementById('modal-agency');
  
  // Se o modal não existir no DOM, cria ele dinamicamente
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-agency';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4';
    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-white">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 id="modal-agency-title" class="text-lg font-bold">Nova Agência</h3>
          <button onclick="window.fecharModalAgencia()" class="text-slate-400 hover:text-white text-xl">&times;</button>
        </div>
        
        <form id="form-agency-modal" onsubmit="window.salvarAgencia(event)" class="space-y-4">
          <input type="hidden" id="agency-id-input">
          
          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome da Agência / Tenant</label>
            <input type="text" id="agency-name-input" required placeholder="Ex: Growth Marketing SP" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plano de Assinatura</label>
            <select id="agency-plan-input" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500">
              <option value="Starter">Starter (Até 2 Usuários)</option>
              <option value="Pro Growth">Pro Growth (Até 10 Usuários)</option>
              <option value="Enterprise Pro">Enterprise Pro (Ilimitado)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">E-mail do Administrador</label>
            <input type="email" id="agency-admin-email" required placeholder="admin@agencia.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500">
          </div>

          <div class="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <button type="button" onclick="window.fecharModalAgencia()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors">Cancelar</button>
            <button type="submit" id="btn-save-agency" class="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-semibold text-white shadow-lg transition-all">Salvar Agência</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Preenchimento em caso de edição ou novo
  const form = document.getElementById('form-agency-modal');
  if (form) form.reset();

  if (agenciaId) {
    const titleEl = document.getElementById('modal-agency-title');
    if (titleEl) titleEl.innerText = 'Editar Agência';
    const ag = window.agenciasMock.find(a => a.id === String(agenciaId));
    if (ag) {
      document.getElementById('agency-id-input').value = ag.id;
      document.getElementById('agency-name-input').value = ag.name;
      document.getElementById('agency-plan-input').value = ag.plan;
      document.getElementById('agency-admin-email').value = ag.admin_email || 'admin@agencia.com';
    }
  } else {
    const titleEl = document.getElementById('modal-agency-title');
    if (titleEl) titleEl.innerText = 'Nova Agência';
    document.getElementById('agency-id-input').value = '';
  }

  modal.style.setProperty('display', 'flex', 'important');
};

// 2. Fechar Modal
window.fecharModalAgencia = function() {
  const modal = document.getElementById('modal-agency');
  if (modal) modal.style.setProperty('display', 'none', 'important');
};

// 3. Salvar Agência (Criar ou Atualizar)
window.salvarAgencia = async function(e) {
  e.preventDefault();
  const id = document.getElementById('agency-id-input').value;
  const name = document.getElementById('agency-name-input').value.trim();
  const plan = document.getElementById('agency-plan-input').value;
  const admin_email = document.getElementById('agency-admin-email').value.trim();

  const btn = document.getElementById('btn-save-agency');
  if (btn) {
    btn.innerText = 'Salvando...';
    btn.disabled = true;
  }

  try {
    if (id) {
      // Atualização
      const index = window.agenciasMock.findIndex(a => a.id === id);
      if (index !== -1) {
        window.agenciasMock[index] = { ...window.agenciasMock[index], name, plan, admin_email };
      }
    } else {
      // Novo Cadastro
      const novaAgencia = {
        id: String(Date.now()),
        name,
        plan,
        admin_email,
        users_count: 1,
        active: true,
        created_at: new Date().toLocaleDateString('pt-BR')
      };
      window.agenciasMock.unshift(novaAgencia);
    }

    window.fecharModalAgencia();
    window.renderizarListaAgencias();
  } catch (err) {
    alert('Erro ao salvar agência: ' + err.message);
  } finally {
    if (btn) {
      btn.innerText = 'Salvar Agência';
      btn.disabled = false;
    }
  }
};

// 4. Excluir Agência
window.excluirAgencia = function(agenciaId) {
  if (confirm('Tem certeza que deseja excluir esta agência? Todos os dados associados serão desativados.')) {
    window.agenciasMock = window.agenciasMock.filter(a => a.id !== String(agenciaId));
    window.renderizarListaAgencias();
  }
};

// 5. Renderizar Tabela na tela Master
window.renderizarListaAgencias = function() {
  const container = document.querySelector('#agencies-table-body, #view-master tbody, tbody');
  if (!container) return;

  if (window.agenciasMock.length === 0) {
    container.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-500">Nenhuma agência cadastrada no momento.</td></tr>`;
    return;
  }

  container.innerHTML = window.agenciasMock.map(ag => `
    <tr class="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      <td class="py-3 px-4 font-semibold text-white">${ag.name}</td>
      <td class="py-3 px-4 text-purple-400"><span class="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs">${ag.plan}</span></td>
      <td class="py-3 px-4 text-slate-400">${ag.users_count || 1} membros</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ativa
        </span>
      </td>
      <td class="py-3 px-4 text-right space-x-2">
        <button onclick="window.abrirModalAgencia('${ag.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors">Editar</button>
        <button onclick="window.excluirAgencia('${ag.id}')" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs transition-colors">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// 6. Ativação automática ao carregar e escuta de cliques no botão "+ Nova Agência"
document.addEventListener('DOMContentLoaded', () => {
  window.renderizarListaAgencias();
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-new-agency, #btn-add-agency, [data-action="new-agency"]');
  if (btn) {
    e.preventDefault();
    window.abrirModalAgencia();
  }
});
