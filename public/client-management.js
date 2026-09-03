// =======================================================
// GESTÃO CADASTRAL DE CLIENTES DA AGÊNCIA (ORACULUM)
// =======================================================

window.clientesMock = window.clientesMock || [];
window.clientsList = window.clientsList || [];
window.globalClientsList = window.globalClientsList || [];

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
    } catch (_) { }
  }
  return str;
}

// 1. AUTO-BUSCA DE CEP VIA API VIACEP
window.buscarCepCliente = async function (cepValor) {
  const cep = String(cepValor || '').replace(/\D/g, '');
  if (cep.length === 8) {
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const elStreet = document.getElementById('client-modal-street');
        const elNeigh = document.getElementById('client-modal-neighborhood');
        const elCity = document.getElementById('client-modal-city');
        const elState = document.getElementById('client-modal-state');
        const elNum = document.getElementById('client-modal-number');

        if (elStreet) elStreet.value = data.logradouro || '';
        if (elNeigh) elNeigh.value = data.bairro || '';
        if (elCity) elCity.value = data.localidade || '';
        if (elState) elState.value = (data.uf || '').toUpperCase();
        if (elNum) elNum.focus();
      }
    } catch (e) { console.warn("Erro ao buscar CEP:", e); }
  }
};

// 2. ABRIR MODAL COM FICHA CADASTRAL COMPLETA
window.abrirModalNovoCliente = function (clientId = null) {
  let modal = document.getElementById('modal-client-crud');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-client-crud';
    modal.style.cssText = 'position: fixed; inset: 0; z-index: 999999; display: flex; align-items: center; justify-content: center; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(8px); padding: 1rem;';
    modal.innerHTML = `
      <div style="max-height: 90vh; overflow-y: auto;" class="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 text-white custom-scrollbar">
        <div class="flex justify-between items-center border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><i class="fa-solid fa-building-user"></i></span>
            <h3 id="modal-client-title" class="text-lg font-bold text-white">Ficha Cadastral do Cliente</h3>
          </div>
          <button type="button" onclick="window.fecharModalNovoCliente()" class="text-slate-400 hover:text-white text-2xl p-1 cursor-pointer">&times;</button>
        </div>

        <form id="form-client-crud" onsubmit="window.salvarCliente(event)" class="space-y-4 text-left">
          <input type="hidden" id="client-modal-id">

          <!-- SEÇÃO 1: DADOS JURÍDICOS & IDENTIFICAÇÃO -->
          <div class="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
            <span class="text-xs font-bold text-emerald-400 uppercase tracking-wider block">1. Identificação Jurídica</span>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Nome Fantasia / Razão Social *</label>
                <input type="text" id="client-modal-name" required placeholder="Ex: Clínica Alpha LTDA" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Nicho / Especialidade *</label>
                <input type="text" id="client-modal-niche" required placeholder="Ex: Medicina Estética" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">CNPJ</label>
                <input type="text" id="client-modal-cnpj" placeholder="00.000.000/0001-00" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Inscrição Estadual (Opcional)</label>
                <input type="text" id="client-modal-ie" placeholder="Isento ou Nº" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
          </div>

          <!-- SEÇÃO 2: CONTATO & COMUNICAÇÃO -->
          <div class="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
            <span class="text-xs font-bold text-cyan-400 uppercase tracking-wider block">2. Contato & Canais Digitais</span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Responsável / CEO</label>
                <input type="text" id="client-modal-contact-name" placeholder="Dr. Carlos Silva" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input type="text" id="client-modal-phone" placeholder="(11) 99999-9999" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">E-mail Financeiro</label>
                <input type="email" id="client-modal-email" placeholder="financeiro@empresa.com" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Website Oficial</label>
                <input type="text" id="client-modal-website" placeholder="https://clinica.com.br" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Instagram (@)</label>
                <input type="text" id="client-modal-instagram" placeholder="@drclinica" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
          </div>

          <!-- SEÇÃO 3: ENDEREÇO DA SEDE (VIACEP) -->
          <div class="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
            <span class="text-xs font-bold text-amber-400 uppercase tracking-wider block">3. Endereço da Sede</span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">CEP (Busca Automática)</label>
                <input type="text" id="client-modal-zip" placeholder="00000-000" maxlength="9" onblur="window.buscarCepCliente(this.value)" class="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-400 outline-none">
              </div>
              <div class="md:col-span-2">
                <label class="block text-[11px] text-slate-400 mb-1">Logradouro / Rua</label>
                <input type="text" id="client-modal-street" placeholder="Av. Paulista" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Número</label>
                <input type="text" id="client-modal-number" placeholder="1000, Cj 50" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Bairro</label>
                <input type="text" id="client-modal-neighborhood" placeholder="Bela Vista" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Cidade</label>
                <input type="text" id="client-modal-city" placeholder="São Paulo" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">UF (Estado)</label>
                <input type="text" id="client-modal-state" placeholder="SP" maxlength="2" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none uppercase">
              </div>
            </div>
          </div>

          <!-- SEÇÃO 4: UNIT ECONOMICS & TRACKING -->
          <div class="bg-slate-950/60 p-4 border border-slate-800 rounded-xl space-y-3">
            <span class="text-xs font-bold text-purple-400 uppercase tracking-wider block">4. Inteligência, Unit Economics & Anúncios</span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Ticket Médio Real (R$)</label>
                <input type="text" id="client-modal-avg-ticket" placeholder="1500" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Meta de Faturamento (R$)</label>
                <input type="text" id="client-modal-target-revenue" placeholder="50000" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Serviço Carro-Chefe</label>
                <input type="text" id="client-modal-main-service" placeholder="Rinoplastia" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Meta Ad Account ID</label>
                <input type="text" id="client-modal-meta-account" placeholder="act_12345678" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Meta Pixel ID</label>
                <input type="text" id="client-modal-meta-pixel" placeholder="123456789" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
              <div>
                <label class="block text-[11px] text-slate-400 mb-1">Google Ads Customer ID</label>
                <input type="text" id="client-modal-google-customer" placeholder="123-456-7890" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none">
              </div>
            </div>
            <div>
              <label class="block text-[11px] text-slate-400 mb-1">Notas, Histórico & Briefing</label>
              <textarea id="client-modal-notes" rows="2" placeholder="Histórico, restrições e preferências do cliente..." class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-emerald-500 outline-none"></textarea>
            </div>
          </div>

          <div class="flex justify-end space-x-3 pt-2">
            <button type="button" onclick="window.fecharModalNovoCliente()" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-semibold transition cursor-pointer">Cancelar</button>
            <button type="submit" id="btn-save-client-crud" class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition cursor-pointer">Salvar Cliente</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const form = document.getElementById('form-client-crud');
  if (form) form.reset();

  if (clientId) {
    document.getElementById('modal-client-title').innerText = 'Ficha Cadastral do Cliente (Edição)';
    const list = window.clientesMock || window.clientsList || [];
    const client = list.find(c => c && String(c.id) === String(clientId));
    if (client) {
      document.getElementById('client-modal-id').value = client.id || '';
      document.getElementById('client-modal-name').value = client.name || '';
      document.getElementById('client-modal-niche').value = client.niche || '';
      document.getElementById('client-modal-cnpj').value = client.cnpj || '';
      document.getElementById('client-modal-ie').value = client.state_registration || '';
      document.getElementById('client-modal-contact-name').value = client.contact_name || '';
      document.getElementById('client-modal-phone').value = client.phone || '';
      document.getElementById('client-modal-email').value = client.email_billing || '';
      document.getElementById('client-modal-website').value = client.website || '';
      document.getElementById('client-modal-instagram').value = client.instagram || '';
      document.getElementById('client-modal-zip').value = client.zip_code || '';
      document.getElementById('client-modal-street').value = client.address_street || '';
      document.getElementById('client-modal-number').value = client.address_number || '';
      document.getElementById('client-modal-neighborhood').value = client.address_neighborhood || '';
      document.getElementById('client-modal-city').value = client.address_city || '';
      document.getElementById('client-modal-state').value = client.address_state || '';
      document.getElementById('client-modal-avg-ticket').value = client.avg_ticket || client.ticket || '';
      document.getElementById('client-modal-target-revenue').value = client.target_revenue || client.meta_faturamento || '';
      document.getElementById('client-modal-main-service').value = client.main_service || '';
      document.getElementById('client-modal-meta-account').value = client.meta_ad_account_id || '';
      document.getElementById('client-modal-meta-pixel').value = client.meta_pixel_id || '';
      document.getElementById('client-modal-google-customer').value = client.google_customer_id || '';

      let cleanNotes = client.notes || client.previous_agency_notes || '';
      if (cleanNotes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(cleanNotes);
          cleanNotes = parsed.actual_notes || parsed.notes || cleanNotes;
        } catch (_) { }
      }
      document.getElementById('client-modal-notes').value = cleanNotes;
    }
  } else {
    document.getElementById('modal-client-title').innerText = 'Cadastrar Novo Cliente na Carteira';
    document.getElementById('client-modal-id').value = '';
  }

  modal.style.setProperty('display', 'flex', 'important');
  modal.classList.remove('hidden');
};

// 3. FECHAR MODAL
window.fecharModalNovoCliente = function () {
  const modal = document.getElementById('modal-client-crud');
  if (modal) {
    modal.style.setProperty('display', 'none', 'important');
    modal.classList.add('hidden');
  }
};

// 4. SALVAR CLIENTE NO SUPABASE (COM RESILIÊNCIA A SCHEMAS)
window.salvarCliente = async function (e) {
  if (e) e.preventDefault();
  const btn = document.getElementById('btn-save-client-crud');
  if (btn) { btn.innerText = 'Salvando...'; btn.disabled = true; }

  try {
    const supaClient = getSupabaseClient();
    if (!supaClient) throw new Error("Supabase não conectado.");

    const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
    const session = sessionStr ? JSON.parse(sessionStr) : {};
    const currentAgencyId = session.agency_id || session.agencyId || session.id;

    const parseNum = (v) => parseFloat(String(v || '').replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')) || 0;

    let payload = {
      name: document.getElementById('client-modal-name')?.value.trim() || '',
      niche: document.getElementById('client-modal-niche')?.value.trim() || '',
      cnpj: document.getElementById('client-modal-cnpj')?.value.trim() || '',
      state_registration: document.getElementById('client-modal-ie')?.value.trim() || '',
      contact_name: document.getElementById('client-modal-contact-name')?.value.trim() || '',
      phone: document.getElementById('client-modal-phone')?.value.trim() || '',
      email_billing: document.getElementById('client-modal-email')?.value.trim() || '',
      website: document.getElementById('client-modal-website')?.value.trim() || '',
      instagram: document.getElementById('client-modal-instagram')?.value.trim() || '',
      zip_code: document.getElementById('client-modal-zip')?.value.trim() || '',
      address_street: document.getElementById('client-modal-street')?.value.trim() || '',
      address_number: document.getElementById('client-modal-number')?.value.trim() || '',
      address_neighborhood: document.getElementById('client-modal-neighborhood')?.value.trim() || '',
      address_city: document.getElementById('client-modal-city')?.value.trim() || '',
      address_state: (document.getElementById('client-modal-state')?.value.trim() || '').toUpperCase(),
      avg_ticket: parseNum(document.getElementById('client-modal-avg-ticket')?.value),
      target_revenue: parseNum(document.getElementById('client-modal-target-revenue')?.value),
      main_service: document.getElementById('client-modal-main-service')?.value.trim() || '',
      meta_ad_account_id: document.getElementById('client-modal-meta-account')?.value.trim() || '',
      meta_pixel_id: document.getElementById('client-modal-meta-pixel')?.value.trim() || '',
      google_customer_id: document.getElementById('client-modal-google-customer')?.value.trim() || '',
      notes: document.getElementById('client-modal-notes')?.value.trim() || '',
      previous_agency_notes: document.getElementById('client-modal-notes')?.value.trim() || '',
      updated_at: new Date().toISOString()
    };

    const id = document.getElementById('client-modal-id')?.value;

    async function executarPersistencia(dados) {
      if (id) {
        return await supaClient.from('clients').update(dados).eq('id', id);
      } else {
        const insertData = { ...dados, agency_id: currentAgencyId || null };
        return await supaClient.from('clients').insert([insertData]);
      }
    }

    let result = await executarPersistencia(payload);

    // Fallback defensivo caso o banco ainda não tenha aplicado certas colunas
    if (result.error && result.error.message && result.error.message.includes('Could not find the')) {
      console.warn('[Supabase] Schema remoto sem colunas estendidas. Aplicando fallback de compatibilidade...');
      const match = result.error.message.match(/'([^']+)' column/);
      if (match && match[1]) {
        delete payload[match[1]];
        result = await executarPersistencia(payload);
      }

      if (result.error && result.error.message && result.error.message.includes('Could not find the')) {
        const payloadEssencial = {
          name: payload.name,
          niche: payload.niche,
          contact_name: payload.contact_name,
          phone: payload.phone,
          website: payload.website,
          notes: payload.notes
        };
        result = await executarPersistencia(payloadEssencial);
      }
    }

    if (result.error) throw result.error;

    // --- SINCRONIZAÇÃO IMEDIATA DE MEMÓRIA E DOM ---
    // Atualiza a variável global usada pelo Dashboard de BI,
    // evitando que o usuário precise pressionar F5.
    const novoAvgTicket = payload.avg_ticket || 0;
    const clienteEditadoId = document.getElementById('client-modal-id')?.value;

    if (window.currentClientData && String(window.currentClientData.id) === String(clienteEditadoId)) {
      window.currentClientData.avg_ticket = novoAvgTicket;
      window.currentClientData.ticket = novoAvgTicket; // alias defensivo
    }

    // Atualiza o card "Ticket Médio (Ficha)" no Dashboard de BI diretamente no DOM
    const elBiTicket = document.getElementById('bi-val-ticket-medio');
    const elBiFonte = document.getElementById('bi-val-ticket-fonte');
    if (elBiTicket && novoAvgTicket > 0) {
      elBiTicket.innerText = novoAvgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      if (elBiFonte) elBiFonte.innerText = 'Ficha do Cliente (atualizado)';
    }

    // Se existir uma função central de re-render do BI, chama ela também
    if (typeof window.obterTicketMedioClienteSeguro === 'function' && window.currentClientData) {
      const infoTicket = window.obterTicketMedioClienteSeguro(window.currentClientData, null);
      if (elBiTicket && infoTicket?.valorFormatado) elBiTicket.innerText = infoTicket.valorFormatado;
      if (elBiFonte && infoTicket?.fonte) elBiFonte.innerText = infoTicket.fonte;
    }
    // --- FIM DA SINCRONIZAÇÃO ---

    window.fecharModalNovoCliente();
    await window.carregarClientesDoSupabase();

    if (typeof window.mostrarToastOraculum === 'function') {
      window.mostrarToastOraculum('✅ Ficha do cliente salva com sucesso no banco!', 'sucesso');
    } else if (typeof window.showToast === 'function') {
      window.showToast('✅ Ficha do cliente salva com sucesso no banco!', 'success');
    } else {
      alert('✅ Ficha do cliente salva com sucesso no banco!');
    }
  } catch (err) {
    if (typeof window.mostrarToastOraculum === 'function') {
      window.mostrarToastOraculum('❌ Erro ao salvar: ' + err.message, 'erro');
    } else if (typeof window.showToast === 'function') {
      window.showToast('❌ Erro ao salvar: ' + err.message, 'error');
    } else {
      alert('❌ Erro ao salvar: ' + err.message);
    }
  } finally {
    if (btn) { btn.innerText = 'Salvar Cliente'; btn.disabled = false; }
  }
};

// 5. EXCLUIR CLIENTE
window.excluirCliente = async function (clientId, event) {
  if (event) event.stopPropagation();
  if (confirm('Tem certeza que deseja excluir permanentemente este cliente da carteira?')) {
    const supaClient = getSupabaseClient();
    if (supaClient) {
      await supaClient.from('clients').delete().eq('id', clientId);
      await window.carregarClientesDoSupabase();
    }
  }
};

// 6. RENDERIZAR TABELA (LINHA TOTALMENTE CLICÁVEL)
window.renderizarListaClientes = function () {
  const container = document.getElementById('clients-table-body');
  if (!container) return;

  const list = window.clientesMock || window.clientsList || [];
  const elTotal = document.getElementById('client-metric-total');
  const elNiches = document.getElementById('client-metric-niches');
  const elRevenue = document.getElementById('client-metric-revenue');

  const uniqueNiches = new Set(list.map(c => c.niche).filter(Boolean));
  const totalRevSum = list.reduce((sum, c) => sum + (parseFloat(c.target_revenue) || 0), 0);

  if (elTotal) elTotal.textContent = String(list.length);
  if (elNiches) elNiches.textContent = String(uniqueNiches.size);
  if (elRevenue) elRevenue.textContent = `R$ ${totalRevSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (list.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-slate-400">Nenhum cliente cadastrado na carteira.</td></tr>';
    return;
  }

  container.innerHTML = list.map(c => `
    <tr onclick="window.abrirModalNovoCliente('${c.id}')" class="border-b border-slate-800/60 hover:bg-slate-800/50 transition cursor-pointer group">
      <td class="py-3 px-4 text-white font-semibold group-hover:text-emerald-400 transition">
        ${c.name}
        <div class="text-[11px] text-slate-400">${c.contact_name ? 'Resp: ' + c.contact_name : (c.cnpj || '')}</div>
      </td>
      <td class="py-3 px-4">
        <span class="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs">${c.niche || 'Geral'}</span>
      </td>
      <td class="py-3 px-4 text-slate-300 text-xs">${c.phone || '-'}</td>
      <td class="py-3 px-4 text-slate-300 text-xs">
        <div>Ticket: <strong class="text-white">R$ ${Number(c.avg_ticket || 0).toLocaleString('pt-BR')}</strong></div>
        <div class="text-slate-500 text-[10px]">Meta: R$ ${Number(c.target_revenue || 0).toLocaleString('pt-BR')}</div>
      </td>
      <td class="py-3 px-4 text-slate-400 text-xs">
        ${c.instagram ? `<span class="text-cyan-400">${c.instagram}</span>` : (c.website ? 'Site Ativo' : '-')}
      </td>
      <td class="py-3 px-4 text-right space-x-2" onclick="event.stopPropagation()">
        <button onclick="window.abrirModalNovoCliente('${c.id}')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs transition cursor-pointer">Ver / Editar</button>
        <button onclick="window.excluirCliente('${c.id}', event)" class="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs transition cursor-pointer">Excluir</button>
      </td>
    </tr>
  `).join('');
};

// 7. CARREGAR DADOS NO ONBOARDING
window.carregarDadosClienteNoOnboarding = function (clientId) {
  if (!clientId) return;

  localStorage.setItem('oraculum_active_client', clientId);
  localStorage.setItem('oraculum_active_client_id', clientId);
  sessionStorage.setItem('oraculum_active_client', clientId);
  sessionStorage.setItem('oraculum_active_client_id', clientId);
  window.currentClientId = clientId;
  window.activeClientId = clientId;

  const list = window.clientesMock || window.clientsList || [];
  const client = list.find(c => c && String(c.id) === String(clientId));

  if (client) {
    const elName = document.getElementById('client-name');
    const elNiche = document.getElementById('client-niche');
    const elWebsite = document.getElementById('client-website');
    const elNotes = document.getElementById('previous-agency-notes');

    if (elName) elName.value = client.name || '';
    if (elNiche) elNiche.value = client.niche || '';
    if (elWebsite) elWebsite.value = client.website || '';

    if (elNotes) {
      const ticketFormatado = client.avg_ticket || client.ticket
        ? `R$ ${Number(client.avg_ticket || client.ticket).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informado';
      const metaFormatada = client.target_revenue || client.meta_faturamento
        ? `R$ ${Number(client.target_revenue || client.meta_faturamento).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : 'Não informada';
      const servicoPrincipal = client.main_service || 'Não especificado';
      const modeloCobranca = client.billing_model === 'recorrente' ? 'Recorrente / Mensal' : 'Pagamento Único';
      const cicloVenda = client.sales_cycle || 'Imediato';

      let baseNotes = sanitizeNotes(client.notes || client.previous_agency_notes || '');

      const headerEstrategico = `[DADOS CADASTRADOS DA FICHA DO CLIENTE]\n- Ticket Médio Real: ${ticketFormatado}\n- Meta de Faturamento Mensal: ${metaFormatada}\n- Serviço / Produto Carro-Chefe: ${servicoPrincipal}\n- Modelo de Cobrança: ${modeloCobranca}\n- Ciclo de Venda: ${cicloVenda}\n`;

      if (!baseNotes.includes('[DADOS CADASTRADOS DA FICHA DO CLIENTE]')) {
        elNotes.value = baseNotes ? `${headerEstrategico}\n[DIRETRIZES & HISTÓRICO]\n${baseNotes}` : headerEstrategico;
      } else {
        elNotes.value = baseNotes;
      }
    }
  }

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

// 8. ATUALIZAR SELETORES E VISOR DO CABEÇALHO
window.atualizarSeletorClientesOnboarding = function () {
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

    selectOnboarding.onchange = function (e) {
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

  // Preenche o select original do app.js
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

// 9. O MOTOR PRINCIPAL DE BUSCA
window.carregarClientesDoSupabase = async function () {
  console.log("🚀 Iniciando busca de clientes no Supabase com isolamento de tenant...");
  const supaClient = getSupabaseClient();

  let data = null;

  try {
    const sessionStr = sessionStorage.getItem('oraculum_session') || localStorage.getItem('oraculum_session');
    const session = sessionStr ? JSON.parse(sessionStr) : {};
    const isMaster = session.role === 'master' || session.role === 'super_admin' || String(session.email || '').toLowerCase() === 'hajaluzstudio@gmail.com';
    const currentAgencyId = session.agency_id || session.agencyId || session.id;

    (window.initGlobalTenant = async function () {
      const MASTER_ORG_ID = '6064bb16-9e92-40fa-a772-f975361e1f15';

      let currentOrgId = localStorage.getItem('organization_id');
      let userEmail = localStorage.getItem('user_email');

      // Se não houver dados no localStorage (como em uma aba anônima ou PC novo),
      // consultamos diretamente a sessão ativa do Supabase no servidor/banco.
      if (!currentOrgId || !userEmail) {
        try {
          if (window.supabaseClient && typeof window.supabaseClient.auth.getUser === 'function') {
            const { data: { user }, error } = await window.supabaseClient.auth.getUser();
            if (user && user.email) {
              userEmail = user.email;
              localStorage.setItem('user_email', userEmail);

              // Se for o Master Admin, define o ID master diretamente
              if (userEmail === 'hajaluzstudio@gmail.com') {
                currentOrgId = MASTER_ORG_ID;
                localStorage.setItem('organization_id', currentOrgId);
                console.log('[Tenant Auth] Sessão Master reconhecida via banco/SupaAuth:', currentOrgId);
              } else {
                // Se for agência, busca o organization_id vinculado ao e-mail na tabela de agências do Supabase
                const { data: agencyData } = await window.supabaseClient
                  .from('agencies') // ou a tabela correta do seu banco que relaciona e-mail com tenant
                  .select('organization_id')
                  .eq('email', userEmail)
                  .single();

                if (agencyData && agencyData.organization_id) {
                  currentOrgId = agencyData.organization_id;
                  localStorage.setItem('organization_id', currentOrgId);
                  console.log('[Tenant Auth] Agência reconhecida via banco:', currentOrgId);
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Tenant Auth] Erro ao consultar sessão ativa, aplicando fallback universal:', e);
        }
      }

      // Fallback de segurança final caso a sessão ainda esteja carregando
      if (!currentOrgId) {
        currentOrgId = MASTER_ORG_ID;
        localStorage.setItem('organization_id', currentOrgId);
        localStorage.setItem('user_email', 'hajaluzstudio@gmail.com');
      }

      // Interceptador global do fetch para injetar o tenant correto em todas as requisições da API
      const originalFetch = window.fetch;
      window.fetch = async function (url, options = {}) {
        options.headers = options.headers || {};
        if (typeof url === 'string' && url.includes('/api/')) {
          const activeOrg = localStorage.getItem('organization_id') || currentOrgId;
          if (activeOrg) {
            if (options.headers instanceof Headers) {
              options.headers.set('x-organization-id', activeOrg);
            } else {
              options.headers['x-organization-id'] = activeOrg;
            }
          }
        }
        return originalFetch(url, options);
      };
    })();

    // ----------------------------------------------------

    // 1. Carrega via API Backend dedicada (service role, ignora RLS)
    try {
      const resApi = await fetch('/api/clients?organization_id=all', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-organization-id': window.currentOrganizationId || '6064bb16-9e92-40fa-a772-f975361e1f15'
        }
      });
      if (resApi.ok) {
        const jsonApi = await resApi.json();
        // Extração defensiva: cobre { success, data: [...] } e resposta direta como array
        const clientes = jsonApi.data || (Array.isArray(jsonApi) ? jsonApi : null);
        if (Array.isArray(clientes) && clientes.length > 0) {
          data = clientes;
          console.log(`[Clients] ✅ ${data.length} clientes carregados via Backend API.`);
        }
      }
    } catch (apiErr) {
      console.warn('[Clients] Falha na API Backend:', apiErr);
    }


    let clientesFiltrados = data || [];
    if (!isMaster && currentAgencyId) {
      const safeId = String(currentAgencyId).toLowerCase();
      clientesFiltrados = (data || []).filter(c =>
        (c.agency_id && String(c.agency_id).toLowerCase() === safeId) ||
        (c.organization_id && String(c.organization_id).toLowerCase() === safeId)
      );
    }

    const processedClients = clientesFiltrados.map(c => ({ ...c, notes: sanitizeNotes(c.notes || c.previous_agency_notes) }));
    window.clientesMock = processedClients;
    window.clientsList = processedClients;
    window.globalClientsList = processedClients;

    // Gerencia seleção ativa
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
      window.atualizarSeletorClientesOnboarding = function () {
        const selectElement = document.querySelector('select') || document.getElementById('cliente-select') || document.querySelector('select[name*="cliente"]');
        if (!selectElement) return;

        // Limpa as opções atuais mantendo apenas a padrão
        selectElement.innerHTML = '<option value="">-- Selecione o Cliente para o Onboarding --</option>';

        const clientes = window.listaClientesDoBanco || [];

        clientes.forEach(cli => {
          const option = document.createElement('option');
          // Aceita tanto a propriedade 'id' quanto 'client_id' ou 'uuid'
          option.value = cli.id || cli.client_id || cli.uuid;
          // Aceita 'name', 'nome' ou 'nome_cliente'
          option.textContent = cli.name || cli.nome || cli.nome_cliente || 'Cliente sem nome';
          selectElement.appendChild(option);
        });

        console.log('[Seletor] Opções de clientes injetadas com sucesso no dropdown:', clientes.length);
      };

      // Sincronizador contínuo do visor superior
      function sincronizarVisorTopo() {
        const selectHeaderDisplay = document.getElementById('active-client-display');
        const activeClientId = localStorage.getItem('oraculum_active_client') || sessionStorage.getItem('oraculum_active_client');
        const list = window.clientesMock || window.clientsList || [];

        if (selectHeaderDisplay && list.length > 0 && activeClientId) {
          const clienteAtivoObj = list.find(c => String(c.id) === String(activeClientId));
          if (clienteAtivoObj) {
            selectHeaderDisplay.innerText = `${clienteAtivoObj.name} (${clienteAtivoObj.niche})`;
          }
        }
      }

      // SINCRONIZAÇÃO AUTOMÁTICA DO TÍTULO DO CLIENTE NO DASHBOARD DE BI
      (function sincronizarTituloClienteBI() {
        function atualizarNomeClienteNoBI() {
          const tituloBI = document.getElementById('bi-active-client-title');
          const headerDisplay = document.getElementById('active-client-display');

          if (!tituloBI) return;

          let nomeCliente = headerDisplay ? headerDisplay.innerText.trim() : '';

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

          if (nomeCliente && nomeCliente !== 'Carregando...' && nomeCliente !== 'Cliente Selecionado') {
            if (tituloBI.innerText !== nomeCliente) {
              tituloBI.innerText = nomeCliente;
            }
          }
        }

        setInterval(atualizarNomeClienteNoBI, 300);
      })();

      window.addEventListener('DOMContentLoaded', () => {
        window.carregarClientesDoSupabase();
        setInterval(sincronizarVisorTopo, 1000);
      });
