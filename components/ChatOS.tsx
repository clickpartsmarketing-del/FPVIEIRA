import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Camera, Check, RotateCcw, Volume2, VolumeX, Loader2, Siren } from 'lucide-react';
import { osService } from '../services/osService';
import { supabase } from '../services/supabaseClient';
import { ESCOLAS } from '../data/escolas';

// ============================================================
// CHAT O.S. — assistente guiado estilo WhatsApp, feito para
// apontador com ZERO prática: uma pergunta por vez, resposta
// por ÁUDIO (botão grande) ou texto, e a O.S. se preenche só.
// Numeração automática segue a contagem fictícia do almoxarifado.
// ============================================================

interface Msg { de: 'bot' | 'eu'; texto: string; }
type Etapa = 'escola' | 'servico' | 'materiais' | 'medidas' | 'foto' | 'confirma';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const acharEscola = (fala: string): string | null => {
  const f = norm(fala);
  let melhor: string | null = null, melhorPts = 0;
  for (const e of ESCOLAS) {
    const tokens = norm(e).replace(/escola m\.|creche m\.|e\.? ?m\.?|municipal/g, ' ').split(/[^a-z0-9]+/).filter(t => t.length >= 4);
    let pts = 0;
    for (const t of tokens) if (f.includes(t)) pts++;
    if (pts > melhorPts) { melhorPts = pts; melhor = e; }
  }
  return melhorPts > 0 ? melhor : null;
};

const PERGUNTA: Record<Etapa, string> = {
  escola: 'Fala, chefe! 👷 Emergência registrada por aqui. Me diz: em QUAL ESCOLA você está?',
  servico: 'Anotado! Agora me conta O QUE ESTÁ SENDO FEITO — o problema e o serviço.',
  materiais: 'Show. Quais MATERIAIS estão sendo usados? Fala a quantidade e o item (ex.: dois sifões, uma torneira, fita teflon).',
  medidas: 'Agora a parte que vira DINHEIRO na medição: as MEDIDAS. Fala devagar: largura, altura, metros, quantidades (ex.: parede três e oitenta e cinco por um e vinte).',
  foto: 'Quase lá! Tira uma FOTO do serviço (antes/depois) ou toca em PULAR.',
  confirma: 'Confere o resumo aí embaixo. Tá certo? Toca em CONFIRMAR que eu salvo no sistema. ✅'
};

const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const ChatOS: React.FC<{ aoSalvar: () => void }> = ({ aoSalvar }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [etapa, setEtapa] = useState<Etapa>('escola');
  const [entrada, setEntrada] = useState('');
  const [ouvindo, setOuvindo] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [proxFict, setProxFict] = useState<number | null>(null);
  const [executor, setExecutor] = useState('');
  const [dados, setDados] = useState({ unidade: '', servico: '', materiais: '', memoria: '' });
  const [fotos, setFotos] = useState<File[]>([]);
  const recRef = useRef<any>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const mudoRef = useRef(mudo);
  mudoRef.current = mudo;

  const falar = (t: string) => {
    if (mudoRef.current || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/[👷✅]/g, ''));
      u.lang = 'pt-BR';
      speechSynthesis.speak(u);
    } catch { /* segue sem voz */ }
  };

  const bot = (texto: string) => {
    setMsgs(prev => [...prev, { de: 'bot', texto }]);
    falar(texto);
  };

  useEffect(() => {
    // próxima numeração fictícia (segue a contagem do almoxarifado)
    osService.proximaFict().then(setProxFict);
    // executor = usuário logado
    supabase.auth.getUser().then(({ data }) => {
      const nome = data.user?.email?.split('@')[0] || '';
      setExecutor(capitalizar(nome.replace(/[._-]/g, ' ')));
    });
    // reconhecimento de voz
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = 'pt-BR';
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (ev: any) => {
        let t = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        if (t.trim()) enviarResposta(t.trim());
      };
      r.onend = () => setOuvindo(false);
      recRef.current = r;
    }
    bot(PERGUNTA.escola);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const mic = () => {
    if (!recRef.current) { bot('Áudio não suportado neste navegador — usa o Chrome, chefe. Pode digitar também!'); return; }
    if (ouvindo) { recRef.current.stop(); setOuvindo(false); }
    else { speechSynthesis.cancel(); recRef.current.start(); setOuvindo(true); }
  };

  const enviarResposta = (texto: string) => {
    setMsgs(prev => [...prev, { de: 'eu', texto }]);
    setEntrada('');

    if (etapa === 'escola') {
      const achada = acharEscola(texto);
      if (achada) {
        setDados(d => ({ ...d, unidade: achada }));
        bot(`Entendi: ${achada}. ✔`);
        setTimeout(() => { setEtapa('servico'); bot(PERGUNTA.servico); }, 400);
      } else {
        setDados(d => ({ ...d, unidade: texto }));
        bot(`Não achei essa escola na lista — vou anotar como "${texto}" e a engenharia confere depois.`);
        setTimeout(() => { setEtapa('servico'); bot(PERGUNTA.servico); }, 400);
      }
    } else if (etapa === 'servico') {
      setDados(d => ({ ...d, servico: d.servico ? d.servico + ' ' + texto : texto }));
      setEtapa('materiais'); bot(PERGUNTA.materiais);
    } else if (etapa === 'materiais') {
      setDados(d => ({ ...d, materiais: d.materiais ? d.materiais + ' ' + texto : texto }));
      setEtapa('medidas'); bot(PERGUNTA.medidas);
    } else if (etapa === 'medidas') {
      setDados(d => ({ ...d, memoria: d.memoria ? d.memoria + ' ' + texto : texto }));
      setEtapa('foto'); bot(PERGUNTA.foto);
    } else if (etapa === 'foto') {
      setEtapa('confirma'); bot(PERGUNTA.confirma);
    } else if (etapa === 'confirma') {
      bot('Toca no botão verde CONFIRMAR aí embaixo, ou em RECOMEÇAR se algo estiver errado.');
    }
  };

  const anexouFoto = (files: FileList | null) => {
    if (files && files.length) {
      setFotos(prev => [...prev, ...Array.from(files)]);
      setMsgs(prev => [...prev, { de: 'eu', texto: `📷 ${files.length} foto(s) anexada(s)` }]);
      setEtapa('confirma'); bot(PERGUNTA.confirma);
    }
  };

  const pularFoto = () => { setMsgs(prev => [...prev, { de: 'eu', texto: 'Pular foto' }]); setEtapa('confirma'); bot(PERGUNTA.confirma); };

  const recomecar = () => {
    setDados({ unidade: '', servico: '', materiais: '', memoria: '' });
    setFotos([]); setMsgs([]); setEtapa('escola');
    bot('Sem problema, vamos de novo. ' + PERGUNTA.escola);
  };

  const confirmar = async () => {
    setSalvando(true);
    const urls: string[] = [];
    for (const f of fotos) {
      const u = await osService.uploadFoto(f);
      if (u) urls.push(u);
    }
    const res = await osService.salvar({
      numero: null,
      numero_fict: null, // o TRIGGER do banco atribui o F-nº (sequência única app + n8n)
      emergencial: true,
      unidade: dados.unidade,
      fiscal: 'Central',
      classificacao: 'Emergencial',
      entrada: new Date().toISOString().slice(0, 10),
      conclusao: null,
      executor,
      status: 'Executando',
      medicao: '',
      servico: dados.servico,
      materiais: dados.materiais,
      memoria_calculo: dados.memoria,
      foto_urls: urls
    } as any);
    setSalvando(false);
    if (res.ok) {
      const fictReal = res.os?.numero_fict ?? proxFict;
      bot(`🚀 O.S. F-${fictReal} salva no sistema central! Quando chegar o número oficial, a engenharia vincula. Bora pra próxima?`);
      setDados({ unidade: '', servico: '', materiais: '', memoria: '' });
      setFotos([]); setEtapa('escola');
      setProxFict(fictReal ? fictReal + 1 : proxFict);
      aoSalvar();
      setTimeout(() => bot(PERGUNTA.escola), 1200);
    } else {
      bot('⚠️ Deu erro ao salvar: ' + (res.erro || 'confere a internet') + '. Seus dados estão aqui, tenta CONFIRMAR de novo.');
    }
  };

  return (
    <div className="bg-[#E7EFE9] rounded-2xl border border-stone-200 shadow-sm flex flex-col" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
      {/* topo estilo WhatsApp */}
      <div className="bg-fpv-700 text-white rounded-t-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-fpv-500 flex items-center justify-center"><Siren size={17} /></div>
        <div className="flex-1 leading-tight">
          <div className="font-bold text-sm">Apontador FPV · Emergência</div>
          <div className="text-[11px] text-fpv-100">próxima O.S.: <b>F-{proxFict ?? '…'}</b> · {executor || 'identificando…'}</div>
        </div>
        <button onClick={() => setMudo(m => !m)} className="p-2 rounded-full hover:bg-white/10" title={mudo ? 'Ativar voz' : 'Silenciar voz'}>
          {mudo ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.de === 'eu' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${m.de === 'eu'
              ? 'bg-fpv-500 text-white rounded-2xl rounded-br-sm'
              : 'bg-white text-stone-800 rounded-2xl rounded-bl-sm'}`}>
              {m.texto}
            </div>
          </div>
        ))}

        {etapa === 'foto' && (
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => fotoRef.current?.click()} className="flex items-center gap-2 bg-white border border-fpv-100 text-fpv-700 font-bold text-sm px-5 py-3 rounded-full shadow-sm">
              <Camera size={17} /> Tirar foto
            </button>
            <button onClick={pularFoto} className="bg-white border border-stone-200 text-stone-500 font-bold text-sm px-5 py-3 rounded-full shadow-sm">Pular</button>
          </div>
        )}

        {etapa === 'confirma' && (
          <div className="bg-white rounded-2xl border-2 border-fpv-100 p-4 mt-2 text-sm space-y-1.5">
            <div className="font-bold text-fpv-700 mb-2">📋 Resumo — O.S. F-{proxFict}</div>
            <div><b>Escola:</b> {dados.unidade || '—'}</div>
            <div><b>Serviço:</b> {dados.servico || '—'}</div>
            <div><b>Materiais:</b> {dados.materiais || '—'}</div>
            <div><b>Medidas:</b> {dados.memoria || '—'}</div>
            <div><b>Fotos:</b> {fotos.length}</div>
            <div className="flex gap-2 pt-3">
              <button onClick={confirmar} disabled={salvando}
                className="flex-1 bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                {salvando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} CONFIRMAR
              </button>
              <button onClick={recomecar} className="px-4 py-3.5 rounded-xl border border-stone-200 text-stone-500" title="Recomeçar">
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <input ref={fotoRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={e => anexouFoto(e.target.files)} />

      {/* barra de entrada estilo WhatsApp — microfone GIGANTE */}
      <div className="p-3 bg-white rounded-b-2xl border-t border-stone-200 flex items-center gap-2">
        <input
          value={entrada}
          onChange={e => setEntrada(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && entrada.trim()) enviarResposta(entrada.trim()); }}
          placeholder={ouvindo ? '🎙️ Ouvindo… fala à vontade' : 'Fala no microfone ou digita aqui…'}
          className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-4 py-3 text-sm outline-none focus:border-fpv-500"
        />
        {entrada.trim() ? (
          <button onClick={() => enviarResposta(entrada.trim())}
            className="w-12 h-12 rounded-full bg-fpv-500 text-white flex items-center justify-center shrink-0">
            <Send size={19} />
          </button>
        ) : (
          <button onClick={mic}
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all ${ouvindo ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-fpv-500 text-white'}`}>
            <Mic size={24} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatOS;
