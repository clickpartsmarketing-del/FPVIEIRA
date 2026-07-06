import React, { useState } from 'react';
import { User, Lock, ArrowRight, Loader2, HardHat } from 'lucide-react';
import { supabase, configOk } from '../services/supabaseClient';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    // Autenticação REAL via Supabase Auth — nada de senha no código.
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(error.message === 'Invalid login credentials'
        ? 'E-mail ou senha incorretos.'
        : 'Erro de conexão: ' + error.message);
      setCarregando(false);
    }
    // Sucesso: o App detecta a sessão via onAuthStateChange.
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-fpv-500 text-fpv-50 flex items-center justify-center font-bold">FPV</div>
          <div>
            <h1 className="font-bold text-lg text-stone-900 leading-tight">FPV Campo</h1>
            <p className="text-xs text-stone-500">F.P. Vieira Engenharia · FP.094</p>
          </div>
        </div>

        {!configOk && (
          <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 font-medium">
            ⚠️ Este deploy está SEM as variáveis <b>VITE_SUPABASE_URL</b> / <b>VITE_SUPABASE_ANON_KEY</b>.
            Configure na Vercel (Settings → Environment Variables) e faça <b>Redeploy</b>.
          </div>
        )}

        <form onSubmit={entrar} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-stone-400" size={18} />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="seu e-mail de acesso"
              autoComplete="username" name="username" inputMode="email" autoCapitalize="none"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-fpv-500 focus:ring-2 focus:ring-fpv-100 text-sm font-medium"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-stone-400" size={18} />
            <input
              type="password" value={senha} onChange={e => setSenha(e.target.value)} required
              placeholder="senha"
              autoComplete="current-password" name="password"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-fpv-500 focus:ring-2 focus:ring-fpv-100 text-sm font-medium"
            />
          </div>

          {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erro}</div>}

          <button
            type="submit" disabled={carregando}
            className="w-full bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            {carregando ? <Loader2 size={18} className="animate-spin" /> : <><HardHat size={18} /> Entrar <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="text-[11px] text-stone-400 mt-6 text-center">
          Acesso criado pela engenharia. Problemas? Fale com o Renan/Nicolas.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
