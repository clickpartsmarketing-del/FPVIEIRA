import React, { useState } from 'react';
import { Pencil, Trash2, Siren, Search, CheckCircle2 } from 'lucide-react';
import { OSCampo } from '../types';
import { osService } from '../services/osService';

interface Props {
  lista: OSCampo[];
  aoEditar: (os: OSCampo) => void;
  aoMudar: () => void;
  meuNome?: string; // encarregado logado → habilita "Minhas O.S." com alerta de prazo
}

const pillCor = (status: string) => {
  if (status === 'Concluído') return 'bg-fpv-50 text-fpv-700 border-fpv-100';
  if (status === 'Assinatura') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'Cancelada') return 'bg-stone-100 text-stone-500 border-stone-200';
  return 'bg-orange-50 text-orange-700 border-orange-200';
};

const diasDesde = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

// alerta de prazo — hoje derivado da entrada + emergencial (48h);
// quando o prazo do e-mail do fiscal entrar no banco, é só trocar aqui
const alertaPrazo = (os: OSCampo) => {
  if (['Concluído', 'Cancelada'].includes(os.status)) return null;
  const d = diasDesde(os.entrada);
  if (d == null) return null;
  const limite = os.emergencial ? 2 : 15;
  const aviso = os.emergencial ? 1 : 7;
  if (d > limite) return { txt: `⏰ ${d}d — prazo estourado`, cls: 'bg-red-50 text-red-700 border-red-200' };
  if (d > aviso) return { txt: `⏳ ${d}d em aberto`, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  return null;
};

const ListaOS: React.FC<Props> = ({ lista, aoEditar, aoMudar, meuNome }) => {
  const [busca, setBusca] = useState('');
  const [soMinhas, setSoMinhas] = useState(!!meuNome);

  const minhas = meuNome ? lista.filter(os => os.executor === meuNome && os.status !== 'Cancelada') : [];
  const base = meuNome && soMinhas ? minhas : lista;

  const filtradas = base.filter(os =>
    !busca ||
    String(os.numero ?? '').includes(busca) ||
    os.unidade.toLowerCase().includes(busca.toLowerCase()) ||
    (os.executor || '').toLowerCase().includes(busca.toLowerCase())
  );

  const abertas = minhas.filter(os => !['Concluído', 'Cancelada'].includes(os.status));
  const semFoto = abertas.filter(os => !(os.foto_urls?.length > 0)).length;
  const semMem = abertas.filter(os => !(os.memoria_calculo || '').trim()).length;

  const excluir = async (os: OSCampo) => {
    if (!os.id) return;
    if (!confirm(`Excluir a O.S. ${os.numero ?? '(s/ nº)'} — ${os.unidade}?`)) return;
    await osService.excluir(os.id);
    aoMudar();
  };

  const concluir = async (os: OSCampo) => {
    await osService.salvar({ ...os, status: 'Concluído', conclusao: os.conclusao || new Date().toISOString().slice(0, 10) });
    aoMudar();
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-bold text-stone-900 flex-1">
          {meuNome && soMinhas ? <>Minhas O.S. <span className="text-stone-400 font-medium">({minhas.length})</span></>
            : <>O.S. no banco central <span className="text-stone-400 font-medium">({lista.length})</span></>}
        </h2>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="nº, escola, executor…"
            className="pl-8 pr-3 py-1.5 text-sm border border-stone-200 rounded-lg bg-stone-50 outline-none focus:border-fpv-500 w-48" />
        </div>
      </div>

      {meuNome && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button onClick={() => setSoMinhas(true)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${soMinhas ? 'bg-fpv-600 text-white border-fpv-600' : 'bg-white text-stone-600 border-stone-200'}`}>
            Minhas ({minhas.length})
          </button>
          <button onClick={() => setSoMinhas(false)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${!soMinhas ? 'bg-fpv-600 text-white border-fpv-600' : 'bg-white text-stone-600 border-stone-200'}`}>
            Todas ({lista.length})
          </button>
          {soMinhas && abertas.length > 0 && (
            <span className="text-[11px] text-stone-500 w-full sm:w-auto">
              {abertas.length} aberta{abertas.length !== 1 ? 's' : ''}
              {semFoto > 0 && <span className="text-amber-700 font-bold"> · {semFoto} sem foto</span>}
              {semMem > 0 && <span className="text-amber-700 font-bold"> · {semMem} sem memória</span>}
            </span>
          )}
        </div>
      )}

      {filtradas.length === 0 && (
        <p className="text-sm text-stone-400 text-center py-8">
          {meuNome && soMinhas ? 'Nenhuma O.S. no seu nome ainda. Registre pelo Chat 💪' : 'Nenhuma O.S. ainda. Registre a primeira na aba "Nova O.S." 💪'}
        </p>
      )}

      <div className="space-y-2">
        {filtradas.map(os => {
          const alerta = alertaPrazo(os);
          return (
            <div key={os.id} className="flex items-start gap-3 border border-stone-100 rounded-xl p-3 hover:border-fpv-100 transition-colors">
              <div className="w-14 shrink-0 text-center">
                <div className="font-bold text-stone-900 tabular-nums">{os.numero ?? (os.numero_fict ? `F-${os.numero_fict}` : 'S/Nº')}</div>
                {os.emergencial && <Siren size={13} className="text-red-500 mx-auto mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-stone-800 truncate">{os.unidade}</div>
                <div className="text-xs text-stone-500 truncate">{os.servico || os.materiais || '—'}</div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[11px] font-bold border rounded-full px-2 py-0.5 ${pillCor(os.status)}`}>{os.status}{os.medicao ? ' · ' + os.medicao : ''}</span>
                  {alerta && <span className={`text-[11px] font-bold border rounded-full px-2 py-0.5 ${alerta.cls}`}>{alerta.txt}</span>}
                  {os.executor && <span className="text-[11px] text-stone-500">{os.executor}</span>}
                  {os.memoria_calculo && <span className="text-[11px] text-fpv-600 font-bold">📐 memória ok</span>}
                  {os.foto_urls?.length > 0 && <span className="text-[11px] text-stone-500">📷 {os.foto_urls.length}</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {os.status !== 'Concluído' && (
                  <button onClick={() => concluir(os)} title="Marcar concluída"
                    className="p-1.5 text-fpv-600 hover:bg-fpv-50 rounded-lg"><CheckCircle2 size={16} /></button>
                )}
                <button onClick={() => aoEditar(os)} title="Editar"
                  className="p-1.5 text-stone-400 hover:text-fpv-600 hover:bg-stone-50 rounded-lg"><Pencil size={16} /></button>
                <button onClick={() => excluir(os)} title="Excluir"
                  className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListaOS;
