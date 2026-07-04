import { supabase } from './supabaseClient';
import { OSCampo } from '../types';

export const osService = {
  async listar(): Promise<OSCampo[]> {
    // o PostgREST corta em 1000 linhas por requisição — com a planilha
    // importada (~1.8k O.S.) é preciso paginar até vir página incompleta
    const PAGINA = 1000;
    const todas: OSCampo[] = [];
    for (let off = 0; off < 10000; off += PAGINA) {
      const { data, error } = await supabase
        .from('os_campo')
        .select('*')
        .order('criado_em', { ascending: false })
        .range(off, off + PAGINA - 1);
      if (error) { console.error('Erro ao listar O.S.:', error.message); break; }
      todas.push(...(data as OSCampo[]));
      if (!data || data.length < PAGINA) break;
    }
    return todas;
  },

  async salvar(os: OSCampo): Promise<{ ok: boolean; erro?: string; os?: OSCampo }> {
    const payload = { ...os };
    delete (payload as any).id;
    delete (payload as any).criado_em;

    if (os.id) {
      let { error } = await supabase.from('os_campo').update(payload).eq('id', os.id);
      // resiliência: banco sem a coluna 'area' ainda → tira e salva mesmo assim
      if (error && /'area'/i.test(error.message)) {
        const p2: any = { ...payload };
        delete p2.area;
        ({ error } = await supabase.from('os_campo').update(p2).eq('id', os.id));
      }
      return { ok: !error, erro: error?.message };
    }
    // insert devolve a linha gravada — o trigger do banco atribui o F-nº
    let { data, error } = await supabase.from('os_campo').insert([payload]).select().single();

    // resiliência: banco sem a coluna 'area' → tira e re-insere
    if (error && /'area'/i.test(error.message)) {
      const pa: any = { ...payload };
      delete pa.area;
      ({ data, error } = await supabase.from('os_campo').insert([pa]).select().single());
    }

    // resiliência: se o banco ainda não tem a coluna 'solicitado',
    // funde o pedido do fiscal dentro do serviço e salva mesmo assim
    if (error && /solicitado/i.test(error.message)) {
      const p2: any = { ...payload };
      if (p2.solicitado) {
        p2.servico = `[FISCAL PEDIU] ${p2.solicitado} | [EXECUTADO] ${p2.servico || ''}`.trim();
      }
      delete p2.solicitado;
      delete p2.area; // banco sem 'solicitado' também não tem 'area'
      const r2 = await supabase.from('os_campo').insert([p2]).select().single();
      return { ok: !r2.error, erro: r2.error?.message, os: r2.data as OSCampo };
    }

    return { ok: !error, erro: error?.message, os: data as OSCampo };
  },

  async excluir(id: number): Promise<boolean> {
    const { error } = await supabase.from('os_campo').delete().eq('id', id);
    return !error;
  },

  // Próximo número da contagem FICTÍCIA (segue a sequência criada pelo almoxarifado).
  // Início em 77 = continua de onde a contagem manual parou.
  async proximaFict(): Promise<number> {
    const INICIO_FICT = 77;
    const { data, error } = await supabase
      .from('os_campo')
      .select('numero_fict')
      .not('numero_fict', 'is', null)
      .order('numero_fict', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return INICIO_FICT;
    return Math.max((data[0] as any).numero_fict + 1, INICIO_FICT);
  },

  async uploadFoto(file: File): Promise<string | null> {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `os/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('fotos-os').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('fotos-os').getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      console.error('Erro no upload da foto:', e.message);
      return null;
    }
  }
};
