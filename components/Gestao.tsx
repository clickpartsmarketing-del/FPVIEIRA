import React from 'react';
import { Download, MapPin, ShieldCheck } from 'lucide-react';
import { OSCampo } from '../types';

// Aba GESTÃO — Lucas/Rafael (visão executiva, sem edição),
// Nicolas (rota de conferência por escola) e Edmar (export p/ medição).

const br = (iso: string | null | undefined) => (iso ? iso.split('-').reverse().join('/') : '');

const Gestao: React.FC<{ lista: OSCampo[]; papel: string }> = ({ lista, papel }) => {
  const tot = lista.length;
  const conc = lista.filter(o => o.status === 'Concluído').length;
  const exec = lista.filter(o => o.status === 'Executando' || o.status === 'Pendente').length;
  const semNum = lista.filter(o => !o.numero).length;
  const comFoto = lista.filter(o => o.foto_urls?.length > 0).length;
  const comMem = lista.filter(o => (o.memoria_calculo || '').trim()).length;

  // rota do engenheiro: escolas com O.S. abertas ou aguardando conferência/assinatura
  const rota: Record<string, OSCampo[]> = {};
  lista.filter(o => o.status !== 'Cancelada').forEach(o => {
    (rota[o.unidade] = rota[o.unidade] || []).push(o);
  });

  const csvMedicao = () => {
    const head = ['OS', 'F', 'Unidade', 'Fiscal', 'Classificação', 'Entrada', 'Conclusão', 'Executor', 'Status', 'Medição', 'Fiscal pediu', 'Serviço executado', 'Materiais', 'Memória de cálculo', 'Fotos'];
    const q = (v: any) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const rows = lista.map(o => [o.numero, o.numero_fict ? 'F-' + o.numero_fict : '', o.unidade, o.fiscal, o.classificacao, br(o.entrada), br(o.conclusao), o.executor, o.status, o.medicao, o.solicitado, o.servico, o.materiais, o.memoria_calculo, o.foto_urls?.length || 0].map(q).join(';'));
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + head.join(';') + '\n' + rows.join('\n'));
    a.download = 'OS_campo_para_medicao.csv';
    a.click();
  };

  const K = ({ n, l, cor }: { n: number; l: string; cor?: string }) => (
    <div className="bg-white border border-stone-200 rounded-xl p-3 text-center">
      <div className={`text-2xl font-black tabular-nums ${cor || 'text-stone-900'}`}>{n}</div>
      <div className="text-[10px] font-bold uppercase text-stone-400 leading-tight">{l}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <h2 className="font-bold text-stone-900 flex items-center gap-2 mb-1"><ShieldCheck size={18} className="text-fpv-600" /> Gestão — contrato FP.094 ao vivo</h2>
        <p className="text-xs text-stone-500 mb-3">visão de {papel} · dados em tempo real do campo</p>
        <div className="grid grid-cols-3 gap-2">
          <K n={tot} l="O.S. no sistema" />
          <K n={conc} l="concluídas" cor="text-fpv-600" />
          <K n={exec} l="em andamento" cor="text-amber-600" />
          <K n={semNum} l="sem nº oficial (F)" cor="text-red-600" />
          <K n={comFoto} l="com foto" />
          <K n={comMem} l="com memória de cálculo" cor="text-fpv-600" />
        </div>
        <button onClick={csvMedicao} disabled={!tot}
          className="mt-4 w-full bg-fpv-500 hover:bg-fpv-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
          <Download size={17} /> Baixar CSV p/ planilha de MEDIÇÃO (Edmar)
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
        <h3 className="font-bold text-stone-900 flex items-center gap-2 mb-1"><MapPin size={17} className="text-fpv-600" /> Rota de conferência (Nicolas)</h3>
        <p className="text-xs text-stone-500 mb-3">por escola — conferir serviço, medir e colher assinatura do fiscal (folhas na aba Fechamento)</p>
        {Object.keys(rota).length === 0 && <p className="text-sm text-stone-400 text-center py-4">Sem O.S. no sistema ainda.</p>}
        <div className="space-y-2">
          {Object.entries(rota).map(([esc, oss]) => (
            <div key={esc} className="border border-stone-100 rounded-xl px-3 py-2">
              <div className="text-sm font-bold text-stone-800">{esc}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {oss.map(o => (
                  <span key={o.id} className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${o.status === 'Concluído' ? 'bg-fpv-50 text-fpv-700 border-fpv-100' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {o.numero ?? (o.numero_fict ? 'F-' + o.numero_fict : 'S/Nº')} · {o.status}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gestao;
