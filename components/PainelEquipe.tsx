import React from 'react';
import { Siren, AlertTriangle, Camera, Ruler, CheckCircle2, ArrowRight } from 'lucide-react';
import { OSCampo, refDaOS } from '../types';
import { Equipe, medDoMes } from '../config';

// =============================================================
// PAINEL DA EQUIPE DE EMERGÊNCIA — a zona do fiscal num relance:
// o que está estourando, o que falta evidência e o que priorizar
// AGORA. Alimenta o mesmo banco que a Gestão e o medidor veem.
// =============================================================

const dias = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

const rotulo = refDaOS;

interface Props {
  lista: OSCampo[];
  equipe: Equipe;
  aoVerLista: () => void;
  aoNovaOS: () => void;
}

const PainelEquipe: React.FC<Props> = ({ lista, equipe, aoVerLista, aoNovaOS }) => {
  const zona = lista.filter(o => o.fiscal === equipe.fiscal && o.status !== 'Cancelada');
  // última numeração DA EQUIPE (spec do engenheiro: "no topo, qual foi a
  // última utilizada") — L/M-nº novo; cai pro F-nn legado se ainda não há
  const ultimaEquipe = lista.reduce((m, o) => {
    if (!o.fict_ref || !o.fict_ref.startsWith(equipe.prefixo)) return m;
    const n = parseInt(o.fict_ref.slice(equipe.prefixo.length), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const ultimaF = lista.reduce((m, o) => Math.max(m, o.numero_fict || 0), 0);
  const chipUltima = ultimaEquipe > 0
    ? `última ${equipe.prefixo}${String(ultimaEquipe).padStart(2, '0')}`
    : ultimaF > 0 ? `última F-${ultimaF}` : '';
  const abertas = zona.filter(o => o.status !== 'Concluído');
  const estourou = (o: OSCampo) => {
    const d = dias(o.entrada);
    return d != null && d > (o.emergencial ? 2 : 15);
  };
  const estouradas = abertas.filter(estourou);
  const semFoto = abertas.filter(o => !(o.foto_urls?.length > 0));
  const semMemoria = abertas.filter(o => !(o.memoria_calculo || '').trim());
  const concluidas7d = zona.filter(o => o.status === 'Concluído' && (dias(o.conclusao) ?? 99) <= 7);

  // prioridade: emergencial estourada > estourada > emergencial > mais velha
  const prioridade = [...abertas].sort((a, b) => {
    const pa = (estourou(a) ? 2 : 0) + (a.emergencial ? 1 : 0);
    const pb = (estourou(b) ? 2 : 0) + (b.emergencial ? 1 : 0);
    if (pa !== pb) return pb - pa;
    return (dias(b.entrada) ?? 0) - (dias(a.entrada) ?? 0);
  }).slice(0, 8);

  const Kpi = ({ n, rot, alerta }: { n: number; rot: string; alerta?: boolean }) => (
    <div className={`rounded-2xl border shadow-sm p-3 text-center ${alerta && n > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'}`}>
      <div className={`text-2xl font-bold tabular-nums ${alerta && n > 0 ? 'text-red-700' : 'text-stone-900'}`}>{n}</div>
      <div className={`text-[10px] font-bold uppercase leading-tight ${alerta && n > 0 ? 'text-red-600' : 'text-stone-400'}`}>{rot}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Siren size={18} className="text-red-600" />
        <h2 className="font-bold text-stone-900 flex-1">Emergência · zona {equipe.fiscal}</h2>
        <span className="text-[11px] font-bold text-stone-400">{medDoMes()} vigente</span>
        {chipUltima && (
          <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-100 rounded-full px-2 py-0.5" title="última numeração usada pela equipe (a próxima o sistema gera sozinho)">
            {chipUltima}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Kpi n={abertas.length} rot="abertas na zona" />
        <Kpi n={estouradas.length} rot="prazo estourado" alerta />
        <Kpi n={semFoto.length} rot="sem foto" alerta />
        <Kpi n={concluidas7d.length} rot="concluídas 7d" />
      </div>

      {/* funil por status (spec do engenheiro): a zona em 4 baldes */}
      <div className="grid grid-cols-4 gap-2">
        <Kpi n={zona.filter(o => ['Pendente', 'Material'].includes(o.status)).length} rot="pendente" />
        <Kpi n={zona.filter(o => o.status === 'Executando').length} rot="executando" />
        <Kpi n={zona.filter(o => o.status === 'Assinatura').length} rot="assinatura" />
        <Kpi n={zona.filter(o => o.status === 'Concluído').length} rot="concluído" />
      </div>

      {abertas.length > 0 && (
        <div className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <Ruler size={14} /> {abertas.length} O.S. em aberto na zona — sem foto e memória de cálculo, NÃO conclui.
          {semMemoria.length > 0 && <> ({semMemoria.length} sem memória)</>}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-4">
        <h3 className="font-bold text-stone-900 text-sm mb-2 flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-600" /> Prioridade agora
        </h3>
        {prioridade.length === 0 && (
          <p className="text-sm text-stone-400 text-center py-6">Zona limpa — nenhuma O.S. aberta. 💪</p>
        )}
        <div className="space-y-1.5">
          {prioridade.map(o => {
            const d = dias(o.entrada);
            return (
              <div key={o.id} className="flex items-center gap-2.5 border border-stone-100 rounded-xl px-3 py-2">
                <span className="w-12 shrink-0 text-center font-bold text-stone-900 tabular-nums text-sm">{rotulo(o)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-800 truncate">{o.unidade}</div>
                  <div className="text-[11px] text-stone-400 truncate">{o.servico || o.solicitado || '—'}</div>
                </div>
                {o.emergencial && <Siren size={13} className="text-red-500 shrink-0" />}
                {!(o.foto_urls?.length > 0) && <Camera size={13} className="text-amber-500 shrink-0" />}
                {d != null && (
                  <span className={`text-[11px] font-bold border rounded-full px-2 py-0.5 shrink-0 ${estourou(o) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-stone-50 text-stone-500 border-stone-200'}`}>
                    {d}d
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {abertas.length > 0 && (
          <button onClick={aoVerLista} className="w-full text-xs font-bold text-fpv-700 pt-3 flex items-center justify-center gap-1">
            Ver todas da zona <ArrowRight size={13} />
          </button>
        )}
      </div>

      <button onClick={aoNovaOS}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm">
        <Siren size={18} /> REGISTRO DE ORDEM DE SERVIÇO / EMERGENCIAL AGORA
      </button>

      <p className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1">
        <CheckCircle2 size={12} /> Tudo que salvar aqui cai no banco central e na planilha do medidor.
      </p>
    </div>
  );
};

export default PainelEquipe;
