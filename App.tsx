import React, { useEffect, useState } from 'react';
import { MessageCircle, ClipboardPlus, ListChecks, FileSignature, LogOut, RefreshCw, Package } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { osService } from './services/osService';
import { OSCampo } from './types';
import LoginScreen from './components/LoginScreen';
import ChatOS from './components/ChatOS';
import NovaOS from './components/NovaOS';
import ListaOS from './components/ListaOS';
import FechamentoSemanal from './components/FechamentoSemanal';
import AlmoxOS from './components/AlmoxOS';
import Gestao from './components/Gestao';

type Aba = 'chat' | 'nova' | 'lista' | 'almox' | 'gestao' | 'fechamento';
const GESTORES = ['lucas', 'rafael', 'nicolas', 'edmar'];

const App: React.FC = () => {
  const [sessao, setSessao] = useState<any>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [aba, setAba] = useState<Aba>('chat');
  const [lista, setLista] = useState<OSCampo[]>([]);
  const [editando, setEditando] = useState<OSCampo | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregandoSessao(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const recarregar = async () => setLista(await osService.listar());

  useEffect(() => { if (sessao) recarregar(); }, [sessao]);

  if (carregandoSessao) return <div className="min-h-screen flex items-center justify-center text-stone-400">Carregando…</div>;
  if (!sessao) return <LoginScreen />;

  const usuario = sessao.user?.email?.split('@')[0] || 'usuário';

  const TabBtn = ({ id, icon: Icon, label }: { id: Aba; icon: any; label: string }) => (
    <button onClick={() => { setAba(id); if (id !== 'nova') setEditando(null); }}
      className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${aba === id ? 'bg-fpv-500 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
      <Icon size={19} /> {label}
    </button>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 print-hidden">
        <div className="w-9 h-9 rounded-lg bg-fpv-500 text-white flex items-center justify-center font-bold text-xs">FPV</div>
        <div className="flex-1 leading-tight">
          <div className="font-bold text-stone-900 text-sm">FPV Campo</div>
          <div className="text-[11px] text-stone-500">FP.094 Educação · {usuario}</div>
        </div>
        <button onClick={recarregar} title="Atualizar" className="p-2 text-stone-400 hover:text-fpv-600 rounded-lg hover:bg-stone-50">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => supabase.auth.signOut()} title="Sair" className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-50">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        {aba === 'chat' && <ChatOS aoSalvar={recarregar} />}
        {aba === 'nova' && (
          <NovaOS
            editando={editando}
            aoSalvar={() => { setEditando(null); recarregar(); }}
            aoCancelarEdicao={() => setEditando(null)}
          />
        )}
        {aba === 'lista' && (
          <ListaOS
            lista={lista}
            aoEditar={(os) => { setEditando(os); setAba('nova'); }}
            aoMudar={recarregar}
          />
        )}
        {aba === 'almox' && <AlmoxOS listaOS={lista} />}
        {aba === 'gestao' && <Gestao lista={lista} papel={usuario} />}
        {aba === 'fechamento' && <FechamentoSemanal lista={lista} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-2 print-hidden">
        <div className="max-w-3xl mx-auto flex gap-2">
          <TabBtn id="chat" icon={MessageCircle} label="Chat O.S." />
          <TabBtn id="nova" icon={ClipboardPlus} label="Formulário" />
          <TabBtn id="lista" icon={ListChecks} label={`O.S. (${lista.length})`} />
          <TabBtn id="almox" icon={Package} label="Almox" />
          {GESTORES.includes(usuario) && <TabBtn id="gestao" icon={RefreshCw} label="Gestão" />}
          <TabBtn id="fechamento" icon={FileSignature} label="Fechamento" />
        </div>
      </nav>
    </div>
  );
};

export default App;
