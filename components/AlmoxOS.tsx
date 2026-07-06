import React, { useEffect, useState } from 'react';
import { PackageMinus, Save, Loader2, Trash2, Link2, Undo2, Pencil, Search, TrendingUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { OSCampo, refDaOS } from '../types';
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
  const [buscaLista, setBuscaLista] = useState('');
  const [mostrar, setMostrar] = useState(30);

  const carregar = async () => {
    // 400 linhas: o suficiente p/ o painel do dia + top da semana sem pesar
    const { data, error } = await supabase.from('saida_material').select('*').order('criado_em', { ascending: false }).limit(400);
    if (!error && data) setSaidas(data as Saida[]);
    if (error && /saida_material/.test(error.message)) setMsg('⚠️ Tabela saida_material ainda não existe — rode o SQL do arquivo almoxarifado.sql no Supabase.');
  };

  useEffect(() => { carregar(); }, []);

  // ===== painel do almoxarife (visão do João, calculada das saídas) =====
  const hojeStr = hoje();
  const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const ehDevolucao = (s: Saida) => s.quantidade < 0 || /devolu/i.test(s.origem || '');
  const saidasHoje = saidas.filter(s => s.data === hojeStr && !ehDevolucao(s));
  const semOSAbertas = saidas.filter(s => !ehDevolucao(s) && !(s.os_ref || '').trim());
  const devolucoes7d = saidas.filter(s => ehDevolucao(s) && s.data >= seteDiasAtras);
  const kit7d = saidas.filter(s => /kit emergencial/i.test(s.origem || '') && s.data >= seteDiasAtras);
  const top7d = Object.entries(
    saidas.filter(s => !ehDevolucao(s) && s.data >= seteDiasAtras)
      .reduce<Record<string, number>>((acc, s) => {
        acc[s.descricao] = (acc[s.descricao] || 0) + s.quantidade;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const campo = (k: keyof Saida, v: any) => setSaida(prev => ({ ...prev, [k]: v }));

  // referências de O.S. vivas do campo: nº oficial, L/M-nº da equipe ou
  // F-nn legado — com a escola junto
  const refsOS = listaOS.map(os => {
    const r = refDaOS(os);
    return { ref: r === 'S/Nº' ? '' : r, rotulo: `${r} — ${os.unidade}` };
  }).filter(r => r.ref);

  // websemântica: escolher a O.S. já puxa a escola dela
  const escolheuOS = (v: string) => {
    campo('os_ref', v);
    const achada = listaOS.find(os =>
      (os.numero && String(os.numero) === v) ||
      (os.fict_ref && os.fict_ref === v) ||
      (os.numero_fict && `F-${os.numero_fict}` === v));
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

  // DEVOLUÇÃO: pediu 8, usou 6, voltaram 2 → linha negativa devolve ao saldo
  // (mantém o rastro: a saída original fica intacta, a devolução é auditável)
  const devolver = async (s: Saida) => {
    const resp = prompt(
      `Quantas ${s.unidade} de "${s.descricao}" VOLTARAM pro estoque?\n` +
      `(saíram ${s.quantidade}${s.os_ref ? ' na O.S. ' + s.os_ref : ''})`
    );
    if (resp == null) return;
    const q = parseFloat(resp.replace(',', '.'));
    if (!q || q <= 0) { setMsg('Quantidade de devolução inválida.'); return; }
    if (q > s.quantidade) { setMsg(`Devolução (${q}) maior que a saída (${s.quantidade}) — confere aí.`); return; }
    const { error } = await supabase.from('saida_material').insert([{
      data: hoje(), descricao: s.descricao, quantidade: -q, unidade: s.unidade,
      os_ref: s.os_ref || null, escola: s.escola, origem: 'DEVOLUÇÃO'
    }]);
    if (error) { setMsg('Erro: ' + error.message); return; }
    setMsg(`↩ Devolução registrada: +${q} ${s.unidade} ${s.descricao} de volta ao saldo${s.os_ref ? ' (O.S. ' + s.os_ref + ')' : ''}.`);
    carregar();
  };

  const editarQt = async (s: Saida) => {
    const resp = prompt(`Corrigir a quantidade de "${s.descricao}" (atual: ${s.quantidade} ${s.unidade}):`, String(s.quantidade));
    if (resp == null) return;
    const q = parseFloat(resp.replace(',', '.'));
    if (isNaN(q) || q === 0) { setMsg('Quantidade inválida.'); return; }
    const { error } = await supabase.from('saida_material').update({ quantidade: q }).eq('id', s.id);
    if (error) { setMsg('Erro: ' + error.message); return; }
    setMsg(`✏️ Corrigido: ${q} ${s.unidade} ${s.descricao}.`);
    carregar();
  };

  return (
    <div className="space-y-4">
      {/* ===== o dia do almoxarife num relance ===== */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-stone-900 tabular-nums">{saidasHoje.length}</div>
          <div className="text-[10px] font-bold uppercase text-stone-400">saídas hoje</div>
        </div>
        <div className={`rounded-2xl border shadow-sm p-3 text-center ${semOSAbertas.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
          <div className={`text-2xl font-bold tabular-nums ${semOSAbertas.length > 0 ? 'text-amber-700' : 'text-stone-900'}`}>{semOSAbertas.length}</div>
          <div className={`text-[10px] font-bold uppercase ${semOSAbertas.length > 0 ? 'text-amber-600' : 'text-stone-400'}`}>sem O.S. (vincular!)</div>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-3 text-center">
          <div className="text-2xl font-bold text-stone-900 tabular-nums">{devolucoes7d.length}</div>
          <div className="text-[10px] font-bold uppercase text-stone-400">devoluções 7d</div>
        </div>
      </div>

      {kit7d.length > 0 && (
        <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          🚨 {kit7d.length} baixa(s) de KIT EMERGENCIAL na semana — lançadas pelo app das equipes, confira o estoque físico do kit.
        </div>
      )}

      {top7d.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
          <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-fpv-600" /> Mais consumidos (7 dias) — de olho na reposição
          </h3>
          <div className="space-y-1">
            {top7d.map(([desc, qt]) => (
              <div key={desc} className="flex items-center gap-2 text-sm">
                <span className="flex-1 min-w-0 truncate text-stone-700">{desc}</span>
                <b className="tabular-nums text-stone-900">{qt}</b>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-3 mb-3">
          <h3 className="font-bold text-stone-900 text-sm flex-1">Últimas saídas <span className="text-stone-400 font-medium">({saidas.length})</span></h3>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-stone-400" />
            <input value={buscaLista} onChange={e => setBuscaLista(e.target.value)} placeholder="material, escola, O.S…"
              className="pl-7 pr-2 py-1 text-xs border border-stone-200 rounded-lg bg-stone-50 outline-none focus:border-fpv-500 w-40" />
          </div>
        </div>
        {saidas.length === 0 && <p className="text-sm text-stone-400 text-center py-5">Nenhuma saída registrada ainda.</p>}
        <div className="space-y-1.5">
          {saidas.filter(s =>
            !buscaLista ||
            s.descricao.toLowerCase().includes(buscaLista.toLowerCase()) ||
            (s.escola || '').toLowerCase().includes(buscaLista.toLowerCase()) ||
            (s.os_ref || '').toLowerCase().includes(buscaLista.toLowerCase())
          ).slice(0, mostrar).map(s => {
            const dev = s.quantidade < 0 || /devolu/i.test(s.origem || '');
            return (
              <div key={s.id} className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-sm ${dev ? 'border-amber-200 bg-amber-50/60' : 'border-stone-100'}`}>
                <span className="text-[11px] text-stone-400 tabular-nums shrink-0">{s.data?.split('-').reverse().slice(0, 2).join('/')}</span>
                <span className="flex-1 min-w-0 truncate">
                  {dev
                    ? <b className="text-amber-700">↩ +{Math.abs(s.quantidade)} {s.unidade}</b>
                    : <b>{s.quantidade} {s.unidade}</b>} {s.descricao}
                  {dev && <span className="text-[10px] text-amber-700 font-bold"> · devolução</span>}
                  {/kit emergencial/i.test(s.origem || '') && <span className="text-[10px] text-red-600 font-bold"> · 🚨 kit</span>}
                </span>
                {s.os_ref
                  ? <span className="text-[11px] font-bold text-fpv-700 bg-fpv-50 border border-fpv-100 rounded-full px-2 py-0.5 shrink-0">O.S. {s.os_ref}</span>
                  : <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 shrink-0">sem O.S.</span>}
                {!dev && (
                  <button onClick={() => devolver(s)} title="Devolução ao estoque"
                    className="p-1 text-stone-300 hover:text-amber-600 shrink-0"><Undo2 size={14} /></button>
                )}
                <button onClick={() => editarQt(s)} title="Corrigir quantidade"
                  className="p-1 text-stone-300 hover:text-fpv-600 shrink-0"><Pencil size={14} /></button>
                <button onClick={() => excluir(s)} className="p-1 text-stone-300 hover:text-red-500 shrink-0"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
        {saidas.length > mostrar && !buscaLista && (
          <button onClick={() => setMostrar(m => m + 100)}
            className="w-full text-xs font-bold text-fpv-700 py-3">
            Carregar mais ({saidas.length - mostrar} restantes)
          </button>
        )}
      </div>
    </div>
  );
};

export default AlmoxOS;
