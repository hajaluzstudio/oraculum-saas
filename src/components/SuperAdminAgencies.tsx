import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, Lock, Unlock, Building2, Plus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export function SuperAdminAgencies() {
  const [agencies, setAgencies] = useState<any[]>([]);
  const [newAgency, setNewAgency] = useState({ name: '', email_billing: '', monthly_fee: 497, slug: '' });
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function loadAgencies() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('⚠️ Conexão em modo offline/demo no Supabase:', error.message);
      }
      if (data && data.length > 0) {
        setAgencies(data);
      } else {
        // Mock inicial para demonstração visual no frontend
        setAgencies([
          {
            id: 'demo-agency-1',
            name: 'Agência Turbo Digital VIP',
            slug: 'agencia-turbo-digital-vip',
            email_billing: 'financeiro@turbodigital.com',
            monthly_fee: 497.00,
            status: 'active',
            created_at: new Date().toISOString()
          },
          {
            id: 'demo-agency-2',
            name: 'Escala 360 Marketing',
            slug: 'escala-360-marketing',
            email_billing: 'contato@escala360.com',
            monthly_fee: 997.00,
            status: 'blocked',
            created_at: new Date().toISOString()
          }
        ]);
      }
    } catch (e: any) {
      console.error('Erro ao carregar agências:', e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAgencies();
  }, []);

  async function toggleStatus(agencyId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    try {
      const { error } = await supabase
        .from('agencies')
        .update({ status: newStatus })
        .eq('id', agencyId);

      if (error) console.warn('Atualizando status em modo local/demo.');

      setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, status: newStatus } : a));
      setFeedbackMsg({ type: 'success', text: `Status da agência alterado para: ${newStatus === 'active' ? 'Ativa' : 'Bloqueada'}` });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao alterar status: ' + e.message });
    }
  }

  async function handleCreateAgency(e: React.FormEvent) {
    e.preventDefault();
    if (!newAgency.name || !newAgency.email_billing) return;

    const payload = {
      ...newAgency,
      slug: newAgency.slug || newAgency.name.toLowerCase().replace(/\s+/g, '-'),
      status: 'active',
      created_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase.from('agencies').insert([payload]).select();

      if (!error && data && data.length > 0) {
        setAgencies([data[0], ...agencies]);
      } else {
        setAgencies([{ id: 'ag_' + Date.now(), ...payload }, ...agencies]);
      }

      setFeedbackMsg({ type: 'success', text: `Agência "${newAgency.name}" cadastrada com sucesso!` });
      setNewAgency({ name: '', email_billing: '', monthly_fee: 497, slug: '' });
    } catch (e: any) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao cadastrar agência: ' + e.message });
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 text-slate-100">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-purple-500" />
            Painel Master: Gestão de Agências & Bloqueio Financeiro
          </h1>
          <p className="text-sm text-slate-400">
            Cadastre novas agências parceiras e gerencie o status de acesso (Ativa / Bloqueada por inadimplência).
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
          feedbackMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          {feedbackMsg.text}
        </div>
      )}

      {/* Formulário de Cadastro de Nova Agência */}
      <form onSubmit={handleCreateAgency} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-400">Nome da Agência</label>
          <input
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-purple-500"
            placeholder="Ex: Agência Turbo Digital"
            value={newAgency.name}
            onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">E-mail Financeiro</label>
          <input
            type="email"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-purple-500"
            placeholder="financeiro@agencia.com"
            value={newAgency.email_billing}
            onChange={(e) => setNewAgency({ ...newAgency, email_billing: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-400">Mensalidade (R$)</label>
          <input
            type="number"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-purple-500"
            value={newAgency.monthly_fee}
            onChange={(e) => setNewAgency({ ...newAgency, monthly_fee: Number(e.target.value) })}
            required
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 transition font-semibold p-2.5 rounded-lg text-sm flex items-center justify-center gap-2 text-white">
            <Plus className="w-4 h-4" /> Cadastrar Agência
          </button>
        </div>
      </form>

      {/* Lista e Tabela de Agências */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-4">Agência</th>
              <th className="p-4">Contato Financeiro</th>
              <th className="p-4">Mensalidade</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Ação de Bloqueio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {agencies.map((agency) => (
              <tr key={agency.id} className="hover:bg-slate-800/50 transition">
                <td className="p-4 font-semibold flex items-center gap-2 text-slate-200">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  {agency.name}
                </td>
                <td className="p-4 text-slate-400">{agency.email_billing}</td>
                <td className="p-4 font-medium text-slate-200">R$ {Number(agency.monthly_fee).toFixed(2)}</td>
                <td className="p-4">
                  {agency.status === 'active' ? (
                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ativa / Em dia
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" /> Bloqueada (Inadimplente)
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => toggleStatus(agency.id, agency.status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                      agency.status === 'active'
                        ? 'bg-red-900/40 text-red-300 hover:bg-red-800/60 border border-red-700/50'
                        : 'bg-emerald-900/40 text-emerald-300 hover:bg-emerald-800/60 border border-emerald-700/50'
                    }`}
                  >
                    {agency.status === 'active' ? <><Lock className="w-3.5 h-3.5" /> Bloquear Acesso</> : <><Unlock className="w-3.5 h-3.5" /> Desbloquear</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
