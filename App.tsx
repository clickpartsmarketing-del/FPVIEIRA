import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, ClipboardPlus, ListChecks, FileSignature, LogOut, RefreshCw, Package, LayoutDashboard, KeyRound, X } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { osService } from './services/osService';
import { OSCampo, EXECUTOR_OPTIONS } from './types';
import { VOZ_ATIVA, GESTORES, ALMOX, EQUIPES, CORRETIVA } from './config';
import LoginScreen from './components/LoginScreen';
import ChatOS from './components/ChatOS';
import NovaOS from './components/NovaOS';
import ListaOS from './components/ListaOS';
import FechamentoSemanal from './components/FechamentoSemanal';
import AlmoxOS from './components/AlmoxOS';
import Gestao from './components/Gestao';
import PainelEquipe from './components/PainelEquipe';

type Aba = 'chat' | 'nova' | 'lista' | 'almox' | 'gestao' | 'fechamento' | 'painel';

// versão visível no cabeçalho — se o campo reportar tela antiga,
// primeiro confere este número (cache de bundle no celular!)
const VERSAO = 'v28';

// casa o prefixo do e-mail com o nome do executor (gilson → Gilson,
// carlosalberto → Carlos Alberto) p/ a visão "Minhas O.S." do encarregado
const normaliza = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

const App: React.FC = () => {
  const [sessao, setSessao] = useState<any>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [aba, setAba] = useState<Aba>(VOZ_ATIVA ? 'chat' : 'nova');
  const [lista, setLista] = useState<OSCampo[]>([]);
  const [editando, setEditando] = useState<OSCampo | null>(null);
  const [erroLista, setErroLista] = useState('');
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [novaSenha2, setNovaSenha2] = useState('');
  const [senhaMsg, setSenhaMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregandoSessao(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSessao(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // gestores, engenheiro e medição abrem direto na tela deles — SÓ 1x por login
  // (refresh de token dispara onAuthStateChange e não pode teleportar o usuário)
  const jaDirecionou = useRef(false);
  useEffect(() => {
    if (!sessao) { jaDirecionou.current = false; return; }
    const u = sessao.user?.email?.split('@')[0];
    if (u && !jaDirecionou.current) {
      if (GESTORES.includes(u)) { jaDirecionou.current = true; setAba('gestao'); }
      else if (ALMOX.includes(u)) { jaDirecionou.current = true; setAba('almox'); }
      else if (EQUIPES[u] || CORRETIVA[u]) { jaDirecionou.current = true; setAba('painel'); }
    }
  }, [sessao]);

  const recarregar = async () => {
    const { dados, erro } = await osService.listar();
    setLista(dados);
    setErroLista(erro ? 'Conexão instável — a lista pode estar INCOMPLETA. Toque em ↻ para tentar de novo.' : '');
  };

  useEffect(() => { if (sessao) recarregar(); }, [sessao]);

  // TEMPO REAL: qualquer O.S. criada/alterada em qualquer celular
  // atualiza todas as telas sozinha (debounce p/ não recarregar em rajada).
  // Precisa do REALTIME-E-TIPO.sql rodado no banco; sem ele, nada quebra —
  // o ↻ manual continua valendo.
  useEffect(() => {
    if (!sessao) return;
    let t: any;
    const ch = supabase
      .channel('rt-os-campo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'os_campo' }, () => {
        clearTimeout(t);
        t = setTimeout(recarregar, 1500);
      })
      .subscribe();
    return () => { clearTimeout(t); supabase.removeChannel(ch); };
  }, [sessao]);

  if (carregandoSessao) return <div className="min-h-screen flex items-center justify-center text-stone-400">Carregando…</div>;
  if (!sessao) return <LoginScreen />;

  const usuario = sessao.user?.email?.split('@')[0] || 'usuário';
  const ehGestor = GESTORES.includes(usuario);
  // João: SÓ o Almoxarifado — é o dashboard dele, sem O.S./fechamento
  const soAlmox = ALMOX.includes(usuario) && !ehGestor;
  const veAlmox = ALMOX.includes(usuario) || ehGestor;
  const equipe = EQUIPES[usuario];
  const corretiva = CORRETIVA[usuario];
  // "responsabilidade do autor do painel": encarregado vê as O.S. em
  // que é o EXECUTOR; equipe de emergência vê as emergenciais do seu
  // FISCAL (zona) — decisão Renan 05/07
  const meuExecutor = ehGestor || equipe ? undefined
    : corretiva?.executor ?? EXECUTOR_OPTIONS.find(e => normaliza(e) === normaliza(usuario));
  // equipe vê TODAS as O.S. da zona do seu fiscal (não só as com flag
  // emergencial — as 1.794 importadas da planilha não têm a flag e
  // sumiam da tela; correção do "sumiu tudo" do v18)
  const filtroMinhas = ehGestor ? undefined
    : equipe ? (os: OSCampo) => os.fiscal === equipe.fiscal
    : meuExecutor ? (os: OSCampo) => os.executor === meuExecutor
    : undefined;
  // painel de campo: equipes de emergência (por zona) E corretiva (por
  // executor) — "tudo que o emergencial tem" (decisão Renan 06/07)
  const painelCfg = equipe ? {
    titulo: `Emergência · zona ${equipe.fiscal}`,
    apelido: equipe.apelido, prefixo: equipe.prefixo, membros: equipe.membros,
    filtro: (os: OSCampo) => os.fiscal === equipe.fiscal,
  } : corretiva ? {
    titulo: `Corretiva · ${corretiva.executor}`,
    apelido: corretiva.apelido, prefixo: corretiva.prefixo, membros: [corretiva.executor],
    filtro: (os: OSCampo) => os.executor === corretiva.executor,
  } : null;

  const trocarSenha = async () => {
    if (novaSenha.length < 6) { setSenhaMsg('A senha precisa de pelo menos 6 caracteres.'); return; }
    if (novaSenha !== novaSenha2) { setSenhaMsg('As duas senhas não conferem.'); return; }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) { setSenhaMsg('Erro: ' + error.message); return; }
    setTrocandoSenha(false); setNovaSenha(''); setNovaSenha2(''); setSenhaMsg('');
    alert('✅ Senha alterada! Use a nova no próximo login.');
  };

  const TabBtn = ({ id, icon: Icon, label }: { id: Aba; icon: any; label: string }) => (
    <button onClick={() => { setAba(id); if (id !== 'nova') setEditando(null); }}
      className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-bold transition-colors ${aba === id ? 'bg-fpv-500 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
      <Icon size={19} /> <span className="max-w-full truncate leading-tight">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-20 print-hidden">
        <div className="w-9 h-9 rounded-lg bg-fpv-500 text-white flex items-center justify-center font-bold text-xs">FPV</div>
        <div className="flex-1 leading-tight">
          <div className="font-bold text-stone-900 text-sm">FPV Campo</div>
          <div className="text-[11px] text-stone-500">FP.094 Educação · {usuario} · <span className="text-stone-300">{VERSAO}</span></div>
        </div>
        <button onClick={() => { setTrocandoSenha(true); setSenhaMsg(''); }} title="Alterar senha" className="p-2 text-stone-400 hover:text-fpv-600 rounded-lg hover:bg-stone-50">
          <KeyRound size={18} />
        </button>
        <button onClick={recarregar} title="Atualizar" className="p-2 text-stone-400 hover:text-fpv-600 rounded-lg hover:bg-stone-50">
          <RefreshCw size={18} />
        </button>
        <button onClick={() => supabase.auth.signOut()} title="Sair" className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-50">
          <LogOut size={18} />
        </button>
      </header>

      {trocandoSenha && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4 print-hidden" onClick={() => setTrocandoSenha(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={18} className="text-fpv-600" />
              <h3 className="font-bold text-stone-900 flex-1">Alterar minha senha</h3>
              <button onClick={() => setTrocandoSenha(false)} className="p-1 text-stone-400"><X size={18} /></button>
            </div>
            <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Nova senha (mín. 6 caracteres)"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 mb-2" />
            <input type="password" value={novaSenha2} onChange={e => setNovaSenha2(e.target.value)}
              placeholder="Repete a nova senha"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 mb-2" />
            {senhaMsg && <p className="text-xs font-bold text-red-600 mb-2">{senhaMsg}</p>}
            <button onClick={trocarSenha}
              className="w-full bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3 rounded-xl">
              Salvar nova senha
            </button>
          </div>
        </div>
      )}

      {erroLista && (
        <div className="max-w-3xl mx-auto px-4 pt-3 print-hidden">
          <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠️ {erroLista}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto p-4">
        {aba === 'painel' && painelCfg && (
          <PainelEquipe lista={lista} cfg={painelCfg} aoVerLista={() => setAba('lista')} aoNovaOS={() => setAba('nova')} />
        )}
        {VOZ_ATIVA && aba === 'chat' && !soAlmox && <ChatOS aoSalvar={recarregar} />}
        {aba === 'nova' && !soAlmox && (
          <NovaOS
            editando={editando}
            usuario={usuario}
            aoSalvar={() => { setEditando(null); recarregar(); }}
            aoCancelarEdicao={() => setEditando(null)}
          />
        )}
        {aba === 'lista' && !soAlmox && (
          <ListaOS
            lista={lista}
            aoEditar={(os) => { setEditando(os); setAba('nova'); }}
            aoMudar={recarregar}
            filtroMinhas={filtroMinhas}
            rotuloMinhas={equipe ? `O.S. da zona · fiscal ${equipe.fiscal}` : 'Minhas O.S.'}
            restrito={!ehGestor && !!filtroMinhas}
            podeExcluir={ehGestor}
          />
        )}
        {aba === 'almox' && veAlmox && <AlmoxOS listaOS={lista} />}
        {aba === 'gestao' && (
          <Gestao
            lista={lista}
            papel={usuario}
            aoEditar={(os) => { setEditando(os); setAba('nova'); }}
            aoMudar={recarregar}
            aoVerLista={() => setAba('lista')}
          />
        )}
        {aba === 'fechamento' && !soAlmox && !equipe && <FechamentoSemanal lista={lista} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-stone-200 px-4 py-2 print-hidden">
        <div className="max-w-3xl mx-auto flex gap-1">
          {painelCfg && <TabBtn id="painel" icon={LayoutDashboard} label="Painel" />}
          {VOZ_ATIVA && !soAlmox && <TabBtn id="chat" icon={MessageCircle} label="Chat O.S." />}
          {!soAlmox && <TabBtn id="nova" icon={ClipboardPlus} label="Formulário" />}
          {!soAlmox && <TabBtn id="lista" icon={ListChecks} label={filtroMinhas ? 'Minhas O.S.' : `O.S. (${lista.length})`} />}
          {veAlmox && <TabBtn id="almox" icon={Package} label="Almox" />}
          {ehGestor && <TabBtn id="gestao" icon={LayoutDashboard} label="Gestão" />}
          {/* fechamento (folha de assinatura semanal) é rito da CORRETIVA e
              da gestão — emergência assina pela zona, some da navegação dela */}
          {!soAlmox && !equipe && <TabBtn id="fechamento" icon={FileSignature} label="Fechamento" />}
        </div>
      </nav>
    </div>
  );
};

export default App;
