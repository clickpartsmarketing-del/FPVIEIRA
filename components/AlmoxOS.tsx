import React, { useEffect, useState } from 'react';
import { PackageMinus, Save, Loader2, Trash2, Link2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { OSCampo } from '../types';
import { MATERIAIS, UNIDADES, ORIGENS } from '../data/materiais';
import { ESCOLAS } from '../data/escolas';

// =============================================================
// ALMOXARIFADO (João) — espelho digital da planilha
// "SAÍDA DE MATERIAIS": DATA · MATERIAL · QUANT · UNID · O.S. ·
// ESCOLA · ORIGEM — com autocompletar do catálogo real e vínculo
// direto às O.S. do campo (adeus número inventado em célula).
// =============================================================

interface Saida {
  id?: number;
  data: string;
  descricao: string;
  quantidade: number;
  unidade: string;
  os_ref: string;
  escola: string;
  origem: string;
  criado_em?: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

const VAZIA: Saida = { data: hoje(), descricao: '', quantidade: 1, unidade: 'UND', os_ref: '', escola: '', origem: 'ALMOXARIFADO' };

const AlmoxOS: React.FC<{ listaOS: OSCampo[] }> = ({ listaOS }) => {
  const [saida, setSaida] = useState<Saida>({ ...VAZIA });
  const [saidas, setSaidas] = useState<Saida[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  const carregar = async () => {
    const { data, error } = await supabase.from('saida_material').select('*').order('criado_em', { ascending: false }).limit(30);
    if (!error && data) setSaidas(data as Saida[]);
    if (error && /saida_material/.test(error.message)) setMsg('⚠️ Tabela saida_material ainda não existe — rode o SQL do arquivo almoxarifado.sql no Supabase.');
  };

  useEffect(() => { carregar(); }, []);

  const campo = (k: keyof Saida, v: any) => setSaida(prev => ({ ...prev, [k]: v }));

  // referências de O.S. vivas do campo: nº oficial ou F-nn, com a escola junto
  const refsOS = listaOS.map(os => ({
    ref: os.numero ? String(os.numero) : (os.numero_fict ? `F-${os.numero_fict}` : ''),
    rotulo: `${os.numero ?? (os.numero_fict ? 'F-' + os.numero_fict : 'S/Nº')} — ${os.unidade}`
  })).filter(r => r.ref);

  // websemântica: escolher a O.S. já puxa a escola dela
  const escolheuOS = (v: string) => {
    campo('os_ref', v);
    const achada = listaOS.find(os =>
      (os.numero && String(os.numero) === v) || (os.numero_fict && `F-${os.numero_fict}` === v));
    if (achada) campo('escola', achada.unidade);
  };

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saida.descricao.trim()) { setMsg('Escolha o material.'); return; }
    if (!saida.quantidade || saida.quantidade <= 0) { setMsg('Quantidade precisa ser maior que zero.'); return; }
    setSalvando(true);
    setMsg('');
    const payload = { ...saida };
    delete (payload as any).id;
    delete (payload as any).criado_em;
    const { error } = await supabase.from('saida_material').insert([payload]);
    setSalvando(false);
    if (error) {
      setMsg(/saida_material/.test(error.message)
        ? '⚠️ Tabela ainda não criada no banco — rode o almoxarifado.sql no SQL Editor.'
        : 'Erro: ' + error.message);
      return;
    }
    setMsg(`✅ Saída registrada: ${saida.quantidade} ${saida.unidade} ${saida.descricao}${saida.os_ref ? ' → O.S. ' + saida.os_ref : ''}`);
    setSaida(prev => ({ ...VAZIA, data: prev.data, escola: prev.escola, os_ref: prev.os_ref, origem: prev.origem }));
    carregar();
  };

  const excluir = async (s: Saida) => {
    if (!s.id || !confirm(`Excluir ${s.quantidade} ${s.unidade} ${s.descricao}?`)) return;
    await supabase.from('saida_material').delete().eq('id', s.id);
    carregar();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={salvar} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-stone-900 flex items-center gap-2">
          <PackageMinus size={18} className="text-fpv-600" /> Saída de material — Almoxarifado
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Data</label>
            <input type="date" value={saida.data} onChange={e => campo('data', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Origem</label>
            <select value={saida.origem} onChange={e => campo('origem', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
              {ORIGENS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Material (catálogo real — comece a digitar)</label>
          <input list="materiais" value={saida.descricao} onChange={e => campo('descricao', e.target.value)} required
            placeholder="ex.: SIF… já completa SIFÃO"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
          <datalist id="materiais">{MATERIAIS.map(m => <option key={m} value={m} />)}</datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Quantidade</label>
            <input type="number" step="0.01" min="0" value={saida.quantidade}
              onChange={e => campo('quantidade', parseFloat(e.target.value) || 0)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Unidade</label>
            <select value={saida.unidade} onChange={e => campo('unidade', e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500">
              {UNIDADES.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">
            <Link2 size={11} className="inline mr-1" />O.S. vinculada (o coração do cruzamento)
          </label>
          <input list="refs-os" value={saida.os_ref} onChange={e => escolheuOS(e.target.value)}
            placeholder="nº oficial ou F-nn — escolher já puxa a escola"
            className="w-full border-2 border-fpv-100 rounded-lg px-3 py-2.5 text-sm bg-fpv-50/40 outline-none focus:border-fpv-500" />
          <datalist id="refs-os">{refsOS.map(r => <option key={r.rotulo} value={r.ref}>{r.rotulo}</option>)}</datalist>
          <p className="text-[11px] text-stone-400 mt-1">sem O.S.? deixe vazio — vira reposição de estoque (mas a meta é sempre vincular!)</p>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-stone-500 mb-1">Escola / destino</label>
          <input list="escolas-almox" value={saida.escola} onChange={e => campo('escola', e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-stone-50 outline-none focus:border-fpv-500" />
          <datalist id="escolas-almox">{ESCOLAS.map(e2 => <option key={e2} value={e2} />)}</datalist>
        </div>

        {msg && <div className="text-sm font-medium text-fpv-700 bg-fpv-50 border border-fpv-100 rounded-lg px-3 py-2">{msg}</div>}

        <button type="submit" disabled={salvando}
          className="w-full bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Registrar saída
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <h3 className="font-bold text-stone-900 mb-3 text-sm">Últimas saídas <span className="text-stone-400 font-medium">({saidas.length})</span></h3>
        {saidas.length === 0 && <p className="text-sm text-stone-400 text-center py-5">Nenhuma saída registrada ainda.</p>}
        <div className="space-y-1.5">
          {saidas.map(s => (
            <div key={s.id} className="flex items-center gap-3 border border-stone-100 rounded-xl px-3 py-2 text-sm">
              <span className="text-[11px] text-stone-400 tabular-nums shrink-0">{s.data?.split('-').reverse().slice(0, 2).join('/')}</span>
              <span className="flex-1 min-w-0 truncate"><b>{s.quantidade} {s.unidade}</b> {s.descricao}</span>
              {s.os_ref
                ? <span className="text-[11px] font-bold text-fpv-700 bg-fpv-50 border border-fpv-100 rounded-full px-2 py-0.5 shrink-0">O.S. {s.os_ref}</span>
                : <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">sem O.S.</span>}
              <button onClick={() => excluir(s)} className="p-1 text-stone-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlmoxOS;
