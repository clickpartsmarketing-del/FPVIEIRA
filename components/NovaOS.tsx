import React, { useEffect, useRef, useState } from 'react';
import { Save, Mic, Camera, X, Loader2, Eraser, Siren } from 'lucide-react';
import { OSCampo, STATUS_OPTIONS, FISCAL_OPTIONS, CLASSIF_OPTIONS, EXECUTOR_OPTIONS, MED_OPTIONS } from '../types';
import { ESCOLAS } from '../data/escolas';
import { osService } from '../services/osService';

const VAZIA: OSCampo = {
  numero: null, emergencial: false, unidade: '', fiscal: 'Wellington', classificacao: 'Normal',
  entrada: new Date().toISOString().slice(0, 10), conclusao: null, executor: '', status: 'Executando',
  medicao: '', solicitado: '', servico: '', materiais: '', memoria_calculo: '', foto_urls: []
};

interface Props {
  editando: OSCampo | null;
  aoSalvar: () => void;
  aoCancelarEdicao: () => void;
}

const NovaOS: React.FC<Props> = ({ editando, aoSalvar, aoCancelarEdicao }) => {
  const [os, setOs] = useState<OSCampo>({ ...VAZIA });
  const [fotos, setFotos] = useState<File[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');
  const [ouvindo, setOuvindo] = useState(false);
  const recRef = useRef<any>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) setOs({ ...editando });
  }, [editando]);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      recRef.current = new SR();
      recRef.current.lang = 'pt-BR';
      recRef.current.continuous = true;
      recRef.current.interimResults = false;
      recRef.current.onresult = (ev: any) => {
        let texto = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) texto += ev.results[i][0].transcript;
        setOs(prev => ({ ...prev, memoria_calculo: (prev.memoria_calculo ? prev.memoria_calculo + ' ' : '') + texto.trim() }));
      };
      recRef.current.onend = () => setOuvindo(false);
    }
  }, []);

  const ditar = () => {
    if (!recRef.current) { setMsg('Ditado não suportado neste navegador — use o Chrome.'); return; }
    if (ouvindo) { recRef.current.stop(); setOuvindo(false); }
    else { recRef.current.start(); setOuvindo(true); }
  };

  const campo = (k: keyof OSCampo, v: any) => setOs(prev => ({ ...prev, [k]: v }));

  const limpar = () => { setOs({ ...VAZIA }); setFotos([]); setMsg(''); aoCancelarEdicao(); };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!os.unidade.trim()) { setMsg('Informe a unidade (escola).'); return; }
    setSalvando(true);
    setMsg('');

    // AUDITORIA: se o upload de foto falhar (sinal ruim na escola), NÃO salva
    // silenciosamente sem evidência — pergunta antes. Foto perdida = risco de glosa.
    const { urls: novas, falhas } = await osService.uploadFotos(fotos);
    if (falhas > 0) {
      const segue = confirm(`⚠️ ${falhas} foto(s) FALHARAM no envio (sinal fraco?).\n\nOK = salvar mesmo assim (sem essas fotos)\nCancelar = tentar de novo com as fotos`);
      if (!segue) { setSalvando(false); setMsg(`Envio pausado — ${falhas} foto(s) não subiram. Tente salvar de novo.`); return; }
    }
    const urls = [...os.foto_urls, ...novas];

    const resultado = await osService.salvar({ ...os, foto_urls: urls, numero: os.numero ? Number(os.numero) : null });
    setSalvando(false);
    if (resultado.ok) {
      setMsg((os.id ? 'O.S. atualizada ✔' : 'O.S. registrada no banco central ✔') + (falhas > 0 ? ` (sem ${falhas} foto(s) que falharam)` : ''));
      setOs({ ...VAZIA });
      setFotos([]);
      aoSalvar();
    } else {
      setMsg('Erro ao salvar: ' + (resultado.erro || 'verifique a conexão'));
    }
  };

  return (
    <form onSubmit={salvar} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-stone-900">{os.id ? `Editando O.S. ${os.numero ?? '(s/ nº)'}` : 'Registrar O.S. de campo'}</h2>
        <label className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer border ${os.emergencial ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
          <input type="checkbox" checked={os.emergencial} onChange={e => campo('emergencial', e.target.checked)} className="hidden" />
          <Siren size={14} /> EMERGENCIAL
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Nº da O.S.</label>
          <input type="number" value={os.numero ?? ''} onChange={e => campo('numero', e.target.value ? Number(e.target.value) : null)}
            placeholder="vazio = sem nº ainda"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Entrada</label>
          <input type="date" value={os.entrada ?? ''} onChange={e => campo('entrada', e.target.value || null)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Unidade (escola)</label>
        <input list="escolas" value={os.unidade} onChange={e => campo('unidade', e.target.value)} required
          placeholder="comece a digitar…"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
        <datalist id="escolas">{ESCOLAS.map(e => <option key={e} value={e} />)}</datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Fiscal</label>
          <select value={os.fiscal} onChange={e => campo('fiscal', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
            {FISCAL_OPTIONS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Classificação</label>
          <select value={os.classificacao} onChange={e => campo('classificacao', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
            {CLASSIF_OPTIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Executor</label>
          <input list="executores" value={os.executor} onChange={e => campo('executor', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
          <datalist id="executores">{EXECUTOR_OPTIONS.map(x => <option key={x} value={x} />)}</datalist>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Status</label>
          <select value={os.status} onChange={e => campo('status', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Conclusão</label>
          <input type="date" value={os.conclusao ?? ''} onChange={e => campo('conclusao', e.target.value || null)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Medição</label>
          <select value={os.medicao} onChange={e => campo('medicao', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
            {MED_OPTIONS.map(m => <option key={m} value={m}>{m || '—'}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">O que o fiscal solicitou</label>
        <textarea value={os.solicitado ?? ''} onChange={e => campo('solicitado', e.target.value)} rows={2}
          placeholder="a demanda que chegou (e-mail, WhatsApp ou verbal do fiscal)"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 resize-y" />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Serviço executado</label>
        <textarea value={os.servico} onChange={e => campo('servico', e.target.value)} rows={2}
          placeholder="ex.: troca de 2 sifões e 1 torneira no banheiro masc. bloco B"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 resize-y" />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Materiais utilizados</label>
        <textarea value={os.materiais} onChange={e => campo('materiais', e.target.value)} rows={2}
          placeholder="ex.: 2 UND sifão + 1 UND torneira + 1 UND fita teflon"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 resize-y" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-bold uppercase text-stone-500">Memória de cálculo (medidas do campo)</label>
          <button type="button" onClick={ditar}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${ouvindo ? 'bg-red-500 text-white border-red-500 animate-pulse' : 'bg-fpv-50 text-fpv-700 border-fpv-100 hover:bg-fpv-100'}`}>
            <Mic size={13} /> {ouvindo ? 'Ouvindo… toque p/ parar' : 'Ditar por voz'}
          </button>
        </div>
        <textarea value={os.memoria_calculo} onChange={e => campo('memoria_calculo', e.target.value)} rows={3}
          placeholder="ex.: parede 3,85 × 1,20 = 4,62 m² · rodapé 7 m lineares · 2 und porta 0,80 — é isto que vira R$ na EMOP"
          className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500 resize-y" />
      </div>

      <div>
        <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Fotos (antes / depois)</label>
        <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden"
          onChange={e => { if (e.target.files) setFotos(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 7)); e.target.value = ''; }} />
        <div className="flex flex-wrap gap-2 items-center">
          <button type="button" onClick={() => fotoRef.current?.click()}
            className="flex items-center gap-2 text-sm font-bold text-fpv-700 bg-fpv-50 border border-fpv-100 px-4 py-2.5 rounded-lg hover:bg-fpv-100">
            <Camera size={16} /> Tirar / anexar foto
          </button>
          {fotos.map((f, i) => (
            <span key={i} className="flex items-center gap-1 text-xs bg-stone-100 border border-stone-200 rounded-full px-3 py-1.5">
              📷 {f.name.slice(0, 14)}…
              <button type="button" onClick={() => setFotos(fotos.filter((_, j) => j !== i))}><X size={12} /></button>
            </span>
          ))}
          {os.foto_urls.length > 0 && <span className="text-xs text-stone-400">{os.foto_urls.length} já no banco</span>}
        </div>
      </div>

      {msg && <div className="text-sm font-medium text-fpv-700 bg-fpv-50 border border-fpv-100 rounded-lg px-3 py-2">{msg}</div>}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={salvando}
          className="flex-1 bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {salvando ? 'Enviando…' : (os.id ? 'Salvar alterações' : 'Salvar O.S.')}
        </button>
        <button type="button" onClick={limpar}
          className="px-4 py-3.5 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50" title="Limpar">
          <Eraser size={18} />
        </button>
      </div>
    </form>
  );
};

export default NovaOS;
