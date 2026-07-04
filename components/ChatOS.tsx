import React, { useEffect, useRef, useState } from 'react';
import { Mic, Send, Camera, Check, RotateCcw, Volume2, VolumeX, Loader2, Siren, CheckCircle2, Hammer } from 'lucide-react';
import { osService } from '../services/osService';
import { supabase } from '../services/supabaseClient';
import { ESCOLAS } from '../data/escolas';
import { AREAS, areaDoTexto } from '../data/areas';

// ============================================================
// CHAT O.S. — engenharia reversa da planilha de medição:
// cada pergunta é uma coluna. Data e F-nº entram sozinhos.
// Validações "forçam" o dado certo (escola real, quantidade
// nos materiais, NÚMEROS nas medidas) sem travar o apontador.
// ============================================================

interface Msg { de: 'bot' | 'eu'; texto: string; }
type Etapa = 'escola' | 'area' | 'solicitado' | 'executado' | 'materiais' | 'medidas' | 'conclusao' | 'foto' | 'confirma';

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
  const [dados, setDados] = useState({ unidade: '', area: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null as string | null, status: 'Executando' });
  const [fotos, setFotos] = useState<File[]>([]);

  // refs espelham o estado para o callback de voz NUNCA ficar preso
  // na pergunta antiga (bug da v1: closure congelada na etapa 'escola')
  const etapaRef = useRef<Etapa>('escola');
  const areaRef = useRef('');        // espelho da área p/ o callback de voz (closure!)
  const tentativaRef = useRef(0);
  const recRef = useRef<any>(null);
  const bufferRef = useRef('');      // acumula a fala enquanto o dedo segura
  const cancelRef = useRef(false);   // arrastou pra fora = cancela o áudio
  const segurandoRef = useRef(false); // dedo ainda no botão? religa o motor se ele parar sozinho
  const fimRef = useRef<HTMLDivElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  // ===== áudio REAL estilo WhatsApp (MediaRecorder + Edge Function) =====
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioModoRef = useRef(true);   // tenta áudio real; cai p/ voz do navegador se falhar
  const [segundos, setSegundos] = useState(0);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const mudoRef = useRef(mudo);
  mudoRef.current = mudo;

  const mudarEtapa = (e: Etapa) => { etapaRef.current = e; tentativaRef.current = 0; setEtapa(e); };

  const ORDEM: Etapa[] = ['escola', 'area', 'solicitado', 'executado', 'materiais', 'medidas'];
  const PERGUNTA: Record<string, string> = {
    escola: 'Em QUAL ESCOLA você está?',
    area: '🛠️ Qual a ÁREA do serviço? Hidráulica, elétrica, pintura, alvenaria, esquadrias ou telhado — fala ou toca num botão aí embaixo.',
    solicitado: 'O QUE O FISCAL PEDIU? (a demanda que chegou pra você)',
    executado: '🔨 O que VOCÊ FEZ de verdade aí? (o serviço executado)',
    materiais: '🔩 Quais MATERIAIS gastou? Quantidade + item (ex.: 2 assentos, 1 sifão).',
    medidas: '📐 As MEDIDAS pro cálculo: metros, área ou unidades — só números.',
    conclusao: 'O serviço JÁ TERMINOU? Toca num dos botões aí embaixo. 👇'
  };

  const guiaDaArea = (nome: string) =>
    (AREAS.find(a => a.nome === nome) || AREAS[AREAS.length - 1]).guiaMemoria;

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
      r.continuous = true;       // grava ENQUANTO o dedo segura (estilo WhatsApp)
      r.interimResults = false;
      r.onresult = (ev: any) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) bufferRef.current += ev.results[i][0].transcript + ' ';
        }
      };
      r.onend = () => {
        // Chrome desliga sozinho em pausas de fala — se o dedo AINDA está
        // no botão, religa o motor e continua acumulando (estilo WhatsApp)
        if (segurandoRef.current && !cancelRef.current) {
          try { r.start(); return; } catch { /* segue para envio */ }
        }
        setOuvindo(false);
        const t = bufferRef.current.trim();
        bufferRef.current = '';
        if (t && !cancelRef.current) enviarResposta(t);  // solta o dedo → envia
        cancelRef.current = false;
      };
      recRef.current = r;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, transcrevendo]);

  // cronômetro do gravador
  useEffect(() => {
    if (!ouvindo) { setSegundos(0); return; }
    const t = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [ouvindo]);

  const transcreverAudio = async (blob: Blob, duracao: number) => {
    eu(`🎙️ áudio de ${duracao}s`);
    setTranscrevendo(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'audio.webm');
      const { data, error } = await supabase.functions.invoke('transcrever', { body: fd });
      setTranscrevendo(false);
      const texto = (data as any)?.texto?.trim();
      if (error || !texto) {
        audioModoRef.current = false;
        bot('⚠️ Transcrição indisponível (função "transcrever" ainda não configurada no Supabase). Sem problema: voltei pro modo do navegador — segura e fala de novo.');
        return;
      }
      enviarResposta(texto);
    } catch {
      setTranscrevendo(false);
      audioModoRef.current = false;
      bot('⚠️ Erro na transcrição — voltei pro modo do navegador. Segura e fala de novo.');
    }
  };

  // ===== botões Refazer / Avançar (pedido do campo) =====
  const limparCampoAtual = (et: Etapa) => {
    if (et === 'escola') setDados(d => ({ ...d, unidade: '' }));
    if (et === 'area') { areaRef.current = ''; setDados(d => ({ ...d, area: '' })); }
    if (et === 'solicitado') setDados(d => ({ ...d, solicitado: '' }));
    if (et === 'executado') setDados(d => ({ ...d, executado: '' }));
    if (et === 'materiais') setDados(d => ({ ...d, materiais: '' }));
    if (et === 'medidas') setDados(d => ({ ...d, memoria: '' }));
  };

  const refazer = () => {
    const et = etapaRef.current;
    if (!ORDEM.includes(et)) return;
    eu('🔁 Refazer resposta');
    limparCampoAtual(et);
    tentativaRef.current = 0;
    bot('Beleza, apaguei. ' + PERGUNTA[et]);
  };

  const avancar = () => {
    const et = etapaRef.current;
    if (!ORDEM.includes(et)) return;
    if (et === 'escola' && !dados.unidade) { bot('A escola é obrigatória, chefe — fala o nome dela.'); return; }
    eu('➡️ Avançar');
    if (et === 'medidas') { bot(PERGUNTA.conclusao); mudarEtapa('conclusao'); return; }
    const prox = ORDEM[ORDEM.indexOf(et) + 1];
    bot(PERGUNTA[prox]);
    mudarEtapa(prox);
  };

  const escolherArea = (nome: string, emoji: string) => {
    areaRef.current = nome;
    setDados(d => ({ ...d, area: nome }));
    bot(`${emoji} ${nome} anotada. ${PERGUNTA.solicitado}`);
    mudarEtapa('solicitado');
  };

  // ===== push-to-talk estilo WhatsApp =====
  const segurarMic = async (e: React.PointerEvent) => {
    e.preventDefault();
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ok */ }
    cancelRef.current = false;
    speechSynthesis.cancel();

    // MODO 1 — áudio REAL (grava e transcreve no servidor, fluido como WhatsApp)
    if (audioModoRef.current && navigator.mediaDevices?.getUserMedia && (window as any).MediaRecorder) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunksRef.current = [];
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
        const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
        mr.ondataavailable = ev => { if (ev.data.size) chunksRef.current.push(ev.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          setOuvindo(false);
          const dur = segundos;
          const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
          chunksRef.current = [];
          if (!cancelRef.current && blob.size > 2000) transcreverAudio(blob, dur);
          cancelRef.current = false;
        };
        mediaRef.current = mr;
        mr.start(250);
        segurandoRef.current = true;
        setOuvindo(true);
        return;
      } catch { audioModoRef.current = false; /* sem permissão/suporte → modo 2 */ }
    }

    // MODO 2 — reconhecimento do navegador (fallback)
    if (!recRef.current) { bot('Áudio não suportado neste navegador — usa o Chrome. Pode digitar também!'); return; }
    bufferRef.current = '';
    segurandoRef.current = true;
    try { recRef.current.start(); } catch { /* já ativo */ }
    setOuvindo(true);
  };

  const soltarMic = () => {
    segurandoRef.current = false;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      try { mediaRef.current.stop(); } catch { /* ok */ }
      return; // onstop → transcreverAudio
    }
    if (recRef.current) { try { recRef.current.stop(); } catch { /* ok */ } }
  };

  const arrastouFora = () => {
    if (!ouvindo || cancelRef.current) return;
    cancelRef.current = true;
    segurandoRef.current = false;
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      try { mediaRef.current.stop(); } catch { /* ok */ }
    } else if (recRef.current) {
      try { recRef.current.stop(); } catch { /* ok */ }
    }
    eu('🚫 áudio cancelado');
  };

  // dedo capturado: detecta "arrastar pra fora" medindo a distância do botão
  const moveuMic = (e: React.PointerEvent) => {
    if (!ouvindo) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const m = 36; // margem de tolerância (px)
    const fora = e.clientX < r.left - m || e.clientX > r.right + m || e.clientY < r.top - m || e.clientY > r.bottom + m;
    if (fora) arrastouFora();
  };

  const enviarResposta = (texto: string) => {
    eu(texto);
    setEntrada('');
    const et = etapaRef.current;   // ← etapa REAL do momento, não a da closure

    if (et === 'escola') {
      const achada = acharEscola(texto);
      if (achada) {
        setDados(d => ({ ...d, unidade: achada }));
        bot(`✅ ${achada}. ${PERGUNTA.area}`);
        mudarEtapa('area');
      } else if (tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Não achei essa escola. Me fala só o NOME dela — ex.: "João Bento", "Senhorinha", "CIEP"…');
      } else {
        setDados(d => ({ ...d, unidade: texto }));
        bot(`Anotei como "${texto}" — a engenharia confere. ${PERGUNTA.area}`);
        mudarEtapa('area');
      }

    } else if (et === 'area') {
      const a = areaDoTexto(texto);
      if (a.nome === 'Outros' && tentativaRef.current === 0) {
        tentativaRef.current++;
        bot('Não peguei a área. Fala uma dessas: hidráulica, elétrica, pintura, alvenaria, esquadrias, telhado — ou toca num botão aí embaixo.');
        return;
      }
      escolherArea(a.nome, a.emoji);

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
      bot(`📐 Agora a parte que vira DINHEIRO na medição — as MEDIDAS. ${guiaDaArea(areaRef.current)}`);
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

  const MAX_FOTOS = 7;

  const anexouFoto = (files: FileList | null) => {
    if (!files || !files.length) return;
    const total = Math.min(fotos.length + files.length, MAX_FOTOS);
    const passou = fotos.length + files.length > MAX_FOTOS;
    setFotos(prev => [...prev, ...Array.from(files)].slice(0, MAX_FOTOS));
    eu(`📷 ${total}/${MAX_FOTOS} foto(s)`);
    if (passou) bot(`Máximo de ${MAX_FOTOS} fotos — mantive as ${MAX_FOTOS} primeiras. Pode CONTINUAR.`);
  };

  const continuarFotos = () => {
    eu(fotos.length ? `Continuar com ${fotos.length} foto(s)` : 'Continuar sem foto');
    bot('📋 Confere o resumo aí embaixo. Tá certo? CONFIRMAR salva no sistema central.');
    mudarEtapa('confirma');
  };

  const recomecar = () => {
    areaRef.current = '';
    setDados({ unidade: '', area: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null, status: 'Executando' });
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
      area: dados.area || null,
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
      areaRef.current = '';
      setDados({ unidade: '', area: '', solicitado: '', executado: '', materiais: '', memoria: '', conclusao: null, status: 'Executando' });
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

        {etapa === 'area' && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            {AREAS.map(a => (
              <button key={a.nome}
                onClick={() => { eu(`${a.emoji} ${a.nome}`); escolherArea(a.nome, a.emoji); }}
                className="bg-white border border-fpv-100 text-fpv-700 font-bold text-xs px-3.5 py-2.5 rounded-full shadow-sm">
                {a.emoji} {a.nome}
              </button>
            ))}
          </div>
        )}

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

        {(etapa === 'foto' || etapa === 'confirma') && fotos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-center pt-2">
            {fotos.map((f, i) => (
              <div key={i} className="relative">
                <img src={URL.createObjectURL(f)} alt={`foto ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm" />
                <button onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-[11px] font-bold leading-none shadow">×</button>
              </div>
            ))}
          </div>
        )}

        {etapa === 'foto' && (
          <div className="flex flex-wrap gap-2 justify-center pt-2">
            <button onClick={() => fotoRef.current?.click()} className="flex items-center gap-2 bg-white border border-fpv-100 text-fpv-700 font-bold text-sm px-5 py-3 rounded-full shadow-sm">
              <Camera size={17} /> Câmera
            </button>
            <button onClick={() => galeriaRef.current?.click()} className="flex items-center gap-2 bg-white border border-fpv-100 text-fpv-700 font-bold text-sm px-5 py-3 rounded-full shadow-sm">
              🖼️ Galeria (até {MAX_FOTOS})
            </button>
            <button onClick={continuarFotos} className="flex items-center gap-2 bg-fpv-500 text-white font-bold text-sm px-5 py-3 rounded-full shadow-sm">
              <Check size={16} /> Continuar {fotos.length > 0 ? `(${fotos.length}/${MAX_FOTOS})` : 'sem foto'}
            </button>
          </div>
        )}

        {etapa === 'confirma' && (
          <div className="bg-white rounded-2xl border-2 border-fpv-100 p-4 mt-2 text-sm space-y-1.5">
            <div className="font-bold text-fpv-700 mb-2">📋 Resumo — O.S. F-{proxFict} · {hojeBR()}</div>
            <div><b>Escola:</b> {dados.unidade || '—'}</div>
            <div><b>Área:</b> {dados.area || '—'}</div>
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
        {transcrevendo && (
          <div className="flex justify-end">
            <div className="bg-fpv-100 text-fpv-700 text-sm px-3.5 py-2.5 rounded-2xl rounded-br-sm animate-pulse shadow-sm">
              ⏳ transcrevendo áudio…
            </div>
          </div>
        )}
        <div ref={fimRef} />
      </div>

      <input ref={fotoRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { anexouFoto(e.target.files); e.target.value = ''; }} />
      <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { anexouFoto(e.target.files); e.target.value = ''; }} />

      <div className="p-3 bg-white rounded-b-2xl border-t border-stone-200">
        {ORDEM.includes(etapa) && !ouvindo && (
          <div className="flex gap-2 justify-center mb-2">
            <button onClick={refazer} className="text-xs font-bold text-stone-500 bg-stone-100 border border-stone-200 rounded-full px-4 py-1.5">
              🔁 Refazer resposta
            </button>
            <button onClick={avancar} className="text-xs font-bold text-fpv-700 bg-fpv-50 border border-fpv-100 rounded-full px-4 py-1.5">
              ➡️ Avançar
            </button>
          </div>
        )}
        {ouvindo && (
          <div className="text-center text-xs font-bold text-red-500 mb-2 animate-pulse">
            🎙️ GRAVANDO {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')} · solta pra ENVIAR · arrasta pra fora pra CANCELAR
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            value={entrada}
            onChange={e => setEntrada(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && entrada.trim()) enviarResposta(entrada.trim()); }}
            placeholder={ouvindo ? '🎙️ Gravando…' : 'SEGURA o microfone pra falar, ou digita…'}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-full px-4 py-3 text-sm outline-none focus:border-fpv-500"
          />
          {entrada.trim() ? (
            <button onClick={() => enviarResposta(entrada.trim())}
              className="w-12 h-12 rounded-full bg-fpv-500 text-white flex items-center justify-center shrink-0">
              <Send size={19} />
            </button>
          ) : (
            <button
              onPointerDown={segurarMic}
              onPointerUp={soltarMic}
              onPointerMove={moveuMic}
              onPointerCancel={arrastouFora}
              onContextMenu={e => e.preventDefault()}
              style={{ touchAction: 'none' }}
              className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-all select-none ${ouvindo ? 'bg-red-500 text-white animate-pulse scale-125' : 'bg-fpv-500 text-white'}`}>
              <Mic size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatOS;
