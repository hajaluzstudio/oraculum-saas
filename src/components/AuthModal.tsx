import React, { useState } from 'react';
import { Building2, User, Lock, Mail, ShieldCheck, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export interface AuthUserSession {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'agency_owner' | 'agency_member';
  agencyId: string;
  agencyName: string;
  agencyStatus: 'active' | 'blocked' | 'trial' | 'past_due';
}

interface AuthModalProps {
  onSuccess: (session: AuthUserSession) => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Form states - Register Agency
  const [regAgencyName, setRegAgencyName] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Tenta autenticar via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (!authError && authData.user) {
        // Buscar perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, agencies(*)')
          .eq('id', authData.user.id)
          .single();

        if (profile) {
          const session: AuthUserSession = {
            id: profile.id,
            email: profile.email,
            fullName: profile.full_name,
            role: profile.role || 'agency_member',
            agencyId: profile.agency_id || 'default-agency',
            agencyName: profile.agencies?.name || 'Sua Agência',
            agencyStatus: profile.agencies?.status || 'active',
          };
          localStorage.setItem('oraculum_session', JSON.stringify(session));
          onSuccess(session);
          return;
        }
      }

      // Fallback Demo Login (para testes em desenvolvimento)
      let role: 'super_admin' | 'agency_owner' = 'agency_owner';
      let agencyStatus: 'active' | 'blocked' = 'active';

      if (loginEmail.toLowerCase().includes('admin')) {
        role = 'super_admin';
      } else if (loginEmail.toLowerCase().includes('bloqueado')) {
        agencyStatus = 'blocked';
      }

      const mockSession: AuthUserSession = {
        id: 'user_' + Date.now(),
        email: loginEmail,
        fullName: loginEmail.split('@')[0],
        role,
        agencyId: 'agency_demo_' + Date.now(),
        agencyName: role === 'super_admin' ? 'Oraculum Master Corp' : 'Agência ' + loginEmail.split('@')[0],
        agencyStatus,
      };

      localStorage.setItem('oraculum_session', JSON.stringify(mockSession));
      onSuccess(mockSession);

    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterAgency(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const slug = regAgencyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      let createdUserId = 'usr_' + Date.now();
      let createdAgencyId = 'ag_' + Date.now();

      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: { full_name: regFullName, agency_name: regAgencyName }
        }
      });

      if (authData.user) {
        createdUserId = authData.user.id;
      }

      // 2. Inserir Agência no Supabase
      const { data: agencyData } = await supabase
        .from('agencies')
        .insert([{
          name: regAgencyName,
          slug,
          email_billing: regEmail,
          status: 'active',
          plan_tier: 'pro',
          monthly_fee: 497.00
        }])
        .select()
        .single();

      if (agencyData) {
        createdAgencyId = agencyData.id;
      }

      // 3. Inserir Perfil no Supabase vinculado como agency_owner
      await supabase
        .from('profiles')
        .insert([{
          id: createdUserId,
          agency_id: createdAgencyId,
          full_name: regFullName,
          email: regEmail,
          role: 'agency_owner',
          is_active: true
        }]);

      const newSession: AuthUserSession = {
        id: createdUserId,
        email: regEmail,
        fullName: regFullName,
        role: 'agency_owner',
        agencyId: createdAgencyId,
        agencyName: regAgencyName,
        agencyStatus: 'active'
      };

      localStorage.setItem('oraculum_session', JSON.stringify(newSession));
      onSuccess(newSession);

    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao cadastrar agência.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 font-sans text-slate-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Glow de Fundo */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-cyan-400 rounded-2xl mx-auto flex items-center justify-center text-slate-950 font-black shadow-lg shadow-purple-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white font-outfit">ORACULUM SaaS</h2>
          <p className="text-xs text-slate-400">Plataforma Híbrida de Inteligência Estratégica ROI-First</p>
        </div>

        {/* Seletor de Abas */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('login')}
            className={`py-2.5 rounded-lg transition-all ${
              tab === 'login' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setTab('register')}
            className={`py-2.5 rounded-lg transition-all ${
              tab === 'register' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cadastrar Nova Agência
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* FORMULÁRIO 1: LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="seu.email@agencia.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Autenticando...' : <>Entrar no Oraculum <ArrowRight className="w-4 h-4" /></>}
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              Dica: Digite <code className="text-purple-400 font-mono">admin@oraculum.com</code> para entrar como Super Admin.
            </p>
          </form>
        )}

        {/* FORMULÁRIO 2: AUTO-CADASTRO DE AGÊNCIA */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterAgency} className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nome da sua Agência / Empresa</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Ex: Agência Turbo Scale Digital"
                  value={regAgencyName}
                  onChange={(e) => setRegAgencyName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Nome do Responsável / CEO</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Seu nome completo"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">E-mail Administrativo</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="contato@suaagencia.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Senha Mestra de Acesso</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition"
                  placeholder="Mínimo 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? 'Cadastrando Agência...' : <><ShieldCheck className="w-4 h-4" /> Criar Agência & Iniciar Teste</>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
