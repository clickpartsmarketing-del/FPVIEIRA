import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Camera, Check, RotateCcw, Volume2, VolumeX, Loader2, Siren, CheckCircle2, Hammer } from 'lucide-react';
import { osService } from '../services/osService';
import { supabase } from '../services/supabaseClient';
import { ESCOLAS } from '../data/escolas';

// ============================================================
// CHAT O.S. — engenharia reversa da planilha de medição:
// cada pergunta é uma coluna. Data e F-nº entram sozinhos.
// Validações "forçam" o dado certo (escola real, quantidade
// nos materiais, NÚMEROS nas medidas) sem travar o apontador.
// ============================================================

interface Msg { de: 'bot' | 'eu'; texto: string; }
type Etapa = 'escola' | 'solicitado' | 'executado' | 'materiais' | 'medidas' | 'conclusao' | 'foto' | 'confirma';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const acharEscola = (fala: string): string | null => {
  const f = norm(fala);
  let melhor: string | null = null, melhorPts = 0;
  for (const e of ESCOLAS) {
    const tokens = norm(e).replace(/escola m\.|creche m\.|e\.? ?m\.?|municipal|estadual/g, ' ').split(/[^a-z0-9]+/).filter(t => t.length >= 4);
    let pts = 0;
    for (const t of tokens) if (f.includes(t)) pts++;
    if (pts > melhorPts) { melhorPts = pts; melhor = e; }
  }
  return melhorPts > 0 ? melhor : null;
};

const temNumero = (s: string) => /\d|\b(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|meio|meia)\b/i.test(s);

const hojeBR = () => new Date().toLocaleDateString('pt-BR');

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
  const [dados, setDados] = useState({ unidade: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null as string | null, status: 'Executando' });
  const [fotos, setFotos] = useState<File[]>([]);

  // refs espelham o estado para o callback de voz NUNCA ficar preso
  // na pergunta antiga (bug da v1: closure congelada na etapa 'escola')
  const etapaRef = useRef<Etapa>('escola');
  const tentativaRef = useRef(0);
  const recRef = useRef<any>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const mudoRef = useRef(mudo);
  mudoRef.current = mudo;

  const mudarEtapa = (e: Etapa) => { etapaRef.current = e; tentativaRef.current = 0; setEtapa(e); };

  const falar = (t: string) => {
    if (mudoRef.current || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t.replace(/[👷✅📋🚀⚠️📷🔩📐]/g, ''));
      u.lang = 'pt-BR';
      speechSynthesis.speak(u);
    } catch { /* segue sem voz */ }
  };

  const bot = (texto: string) => { setMsgs(prev => [...prev, { de: 'bot', texto }]); falar(texto); };
  const eu = (texto: string) => setMsgs(prev => [...prev, { de: 'eu', texto }]);

  useEffect(() => {
    osService.proximaFict().then(n => {
      setProxFict(n);
      bot(`Fala, chefe! 👷 O.S. de emergência ABERTA: número F-${n}, data de hoje (${hojeBR()}) e seu nome já anexados automaticamente. Primeira pergunta: em QUAL ESCOLA você está?`);
    });
    supabase.auth.getUser().then(({ data }) => {
      const nome = data.user?.email?.split('@')[0] || '';
      setExecutor(capitalizar(nome.replace(/[._-]/g, ' ')));
    });
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = 'pt-BR';
      r.continuous = false;
      r.interimResults = false;
      r.onresult = (ev: any) => {
        let t = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        if (t.trim()) enviarResposta(t.trim());   // usa etapaRef → sempre a pergunta ATUAL
      };
      r.onend = () => setOuvindo(false);
      recRef.current = r;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const mic = () => {
    if (!recRef.current) { bot('Áudio não suportado neste navegador — usa o Chrome. Pode digitar também!'); return; }
    if (ouvindo) { recRef.current.stop(); setOuvindo(false); }
    else { speechSynthesis.cancel(); recRef.current.start(); setOuvindo(true); }
  };

  const enviarResposta = (texto: string) => {
    eu(texto);
    setEntrada('');
    const et = etapaRef.current;   // ← etapa REAL do momento, não a da closure

    if (et === 'escola') {
      const achada = acharEscola(texto);
      if (achada) {
        setDados(d => ({ ...d, unidade: achada }));
        bot(`✅ ${achada}. Agora: O QUE O FISCAL PEDIU? (a demanda que chegou pra você)`);
        mudarEtapa('solicitado');
      } else if (tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Não achei essa escola. Me fala só o NOME dela — ex.: "João Bento", "Senhorinha", "CIEP"…');
      } else {
        setDados(d => ({ ...d, unidade: texto }));
        bot(`Anotei como "${texto}" — a engenharia confere. O QUE O FISCAL PEDIU?`);
        mudarEtapa('solicitado');
      }

    } else if (et === 'solicitado') {
      if (texto.length < 5 && tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Me dá mais detalhe do PEDIDO do fiscal — o que ele mandou fazer?');
        return;
      }
      setDados(d => ({ ...d, solicitado: d.solicitado ? d.solicitado + ' ' + texto : texto }));
      bot('🔨 E o que VOCÊ FEZ de verdade aí? (o serviço executado)');
      mudarEtapa('executado');

    } else if (et === 'executado') {
      if (texto.length < 5 && tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Detalha um pouco mais o que foi feito, chefe.');
        return;
      }
      setDados(d => ({ ...d, executado: d.executado ? d.executado + ' ' + texto : texto }));
      bot('🔩 Quais MATERIAIS gastou? Fala QUANTIDADE + item (ex.: DOIS assentos sanitários, UM sifão). Isso casa com a saída do almoxarifado no seu nome.');
      mudarEtapa('materiais');

    } else if (et === 'materiais') {
      if (!temNumero(texto) && tentativaRef.current === 0) {
        tentativaRef.current++;
        setDados(d => ({ ...d, materiais: d.materiais ? d.materiais + ' ' + texto : texto }));
        bot('Faltou a QUANTIDADE — repete com o número junto (ex.: 2 assentos, 1 sifão). Sem isso o almoxarifado não bate.');
        return;
      }
      setDados(d => ({ ...d, materiais: d.materiais ? d.materiais + ' ' + texto : texto }));
      bot('📐 Agora a parte que vira DINHEIRO na medição: as MEDIDAS. Só números: metros, área, unidades (ex.: "2 unidades de assento" ou "parede 3 e 85 por 1 e 20").');
      mudarEtapa('medidas');

    } else if (et === 'medidas') {
      if (!temNumero(texto) && tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Preciso de NÚMEROS aqui, chefe — é a memória de cálculo que gera a cobrança. Quantos metros? Quantas unidades?');
        return;
      }
      setDados(d => ({ ...d, memoria: d.memoria ? d.memoria + ' ' + texto : texto }));
      bot('O serviço JÁ TERMINOU? Toca num dos botões aí embaixo. 👇');
      mudarEtapa('conclusao');

    } else if (et === 'conclusao') {
      bot('Usa os botões aí embaixo, chefe: TERMINEI ou AINDA EXECUTANDO. 👇');

    } else if (et === 'foto') {
      bot('Toca em TIRAR FOTO ou PULAR aí embaixo. 👇');

    } else if (et === 'confirma') {
      bot('Confere o resumo e toca no botão verde CONFIRMAR — ou em recomeçar se algo estiver errado.');
    }
  };

  const responderConclusao = (terminou: boolean) => {
    eu(terminou ? '✅ Terminei agora' : '🔄 Ainda executando');
    setDados(d => ({
      ...d,
      status: terminou ? 'Concluído' : 'Executando',
      conclusao: terminou ? new Date().toISOString().slice(0, 10) : null
    }));
    bot('📷 Foto do serviço (antes/depois) vale ouro contra glosa. Tira uma ou toca em PULAR.');
    mudarEtapa('foto');
  };

  const anexouFoto = (files: FileList | null) => {
    if (files && files.length) {
      setFotos(prev => [...prev, ...Array.from(files)]);
      eu(`📷 ${files.length} foto(s) anexada(s)`);
      bot('📋 Confere o resumo aí embaixo. Tá certo? CONFIRMAR salva no sistema central.');
      mudarEtapa('confirma');
    }
  };

  const pularFoto = () => {
    eu('Pular foto');
    bot('📋 Confere o resumo aí embaixo. Tá certo? CONFIRMAR salva no sistema central.');
    mudarEtapa('confirma');
  };

  const recomecar = () => {
    setDados({ unidade: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null, status: 'Executando' });
    setFotos([]); setMsgs([]);
    mudarEtapa('escola');
    bot(`Sem problema, do zero. O.S. F-${proxFict}, ${hojeBR()}. Em QUAL ESCOLA você está?`);
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
      numero_fict: null, // trigger do banco atribui — sequência única app + n8n
      emergencial: true,
      unidade: dados.unidade,
      fiscal: 'Central',
      classificacao: 'Emergencial',
      entrada: new Date().toISOString().slice(0, 10),
      conclusao: dados.conclusao,
      executor,
      status: dados.status,
      medicao: '',
      solicitado: dados.solicitado,
      servico: dados.executado,
      materiais: dados.materiais,
      memoria_calculo: dados.memoria,
      foto_urls: urls
    } as any);
    setSalvando(false);
    if (res.ok) {
      const fictReal = res.os?.numero_fict ?? proxFict;
      bot(`🚀 O.S. F-${fictReal} salva no sistema central com data, executor, materiais e memória de cálculo — pronta pra casar com o almoxarifado e virar medição. Bora pra próxima?`);
      setDados({ unidade: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null, status: 'Executando' });
      setFotos([]);
      const prox = fictReal ? fictReal + 1 : proxFict;
      setProxFict(prox);
      mudarEtapa('escola');
      aoSalvar();
      setTimeout(() => bot(`O.S. F-${prox} aberta, ${hojeBR()}. Em QUAL ESCOLA você está?`), 1500);
    } else {
      bot('⚠️ Erro ao salvar: ' + (res.erro || 'confere a internet') + '. Seus dados continuam aqui — tenta CONFIRMAR de novo.');
    }
  };

  return (
    <div className="bg-[#E7EFE9] rounded-2xl border border-stone-200 shadow-sm flex flex-col" style={{ height: 'calc(100vh - 190px)', minHeight: 480 }}>
      <div className="bg-fpv-700 text-white rounded-t-2xl px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-fpv-500 flex items-center justify-center"><Siren size={17} /></div>
        <div className="flex-1 leading-tight">
          <div className="font-bold text-sm">Apontador FPV · Emergência</div>
          <div className="text-[11px] text-fpv-100">O.S. <b>F-{proxFict ?? '…'}</b> · {hojeBR()} · {executor || 'identificando…'}</div>
        </div>
        <button onClick={() => setMudo(m => !m)} className="p-2 rounded-full hover:bg-white/10" title={mudo ? 'Ativar voz' : 'Silenciar voz'}>
          {mudo ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

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

        {etapa === 'conclusao' && (
          <div className="flex gap-2 justify-center pt-2">
            <button onClick={() => responderConclusao(true)} className="flex items-center gap-2 bg-fpv-500 text-white font-bold text-sm px-5 py-3.5 rounded-full shadow-sm">
              <CheckCircle2 size={17} /> Terminei agora
            </button>
            <button onClick={() => responderConclusao(false)} className="flex items-center gap-2 bg-white border border-amber-300 text-amber-700 font-bold text-sm px-5 py-3.5 rounded-full shadow-sm">
              <Hammer size={17} /> Ainda executando
            </button>
          </div>
        )}

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
            <div className="font-bold text-fpv-700 mb-2">📋 Resumo — O.S. F-{proxFict} · {hojeBR()}</div>
            <div><b>Escola:</b> {dados.unidade || '—'}</div>
            <div><b>Fiscal pediu:</b> {dados.solicitado || '—'}</div>
            <div><b>Foi feito:</b> {dados.executado || '—'}</div>
            <div><b>Materiais:</b> {dados.materiais || '—'}</div>
            <div><b>Medidas (memória):</b> {dados.memoria || '—'}</div>
            <div><b>Situação:</b> {dados.status}{dados.conclusao ? ' em ' + dados.conclusao.split('-').reverse().join('/') : ''}</div>
            <div><b>Executor:</b> {executor} · <b>Fotos:</b> {fotos.length}</div>
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
