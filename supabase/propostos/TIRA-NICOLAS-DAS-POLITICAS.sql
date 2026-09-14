-- =====================================================================
-- TIRA O NICOLAS DAS POLÍTICAS DE DELETE
-- Banco: EDUCAÇÃO (lgdnuyreaknxjswrfbjw) · SQL Editor
--
-- POR QUÊ: ele saiu da operação em 01/09/2026 e a conta está BLOQUEADA,
-- mas o e-mail dele continua em 6 políticas que autorizam DELETE. Hoje é
-- inofensivo (conta bloqueada não loga). Se alguém reabrir a conta —
-- por engano ou não — ele volta a poder apagar O.S. e saída de material,
-- que é o dado que vira medição.
--
-- NÃO É DESTRUTIVO: recria as 6 políticas com a MESMA regra, só sem o
-- nome dele. Nenhuma linha de dado é tocada. Idempotente.
--
-- ⚠ DECISÃO SUA ANTES DE RODAR — ver o bloco "MARCIO" no fim.
-- =====================================================================

-- ---------- ANTES: quem pode apagar hoje ----------
select tablename, policyname, pg_get_expr(polqual, polrelid) as regra
from pg_policies p
join pg_policy pol on pol.polname = p.policyname
join pg_class c on c.oid = pol.polrelid and c.relname = p.tablename
where p.cmd = 'DELETE'
  and p.tablename in ('os_campo','saida_material','estoque_item',
                      'entrada_material','ferramenta','solicitacao_material')
order by tablename;

-- =====================================================================
-- APLICA — 6 políticas, todas recriadas sem 'nicolas@fpv.app'
-- =====================================================================
begin;

-- 1) O.S. — só a gestão apaga
drop policy if exists "fpv_gestores_delete" on os_campo;
create policy "fpv_gestores_delete" on os_campo
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app'
  ));

-- 2) saída de material — gestão + almoxarife
drop policy if exists "almox_delete_restrito" on saida_material;
create policy "almox_delete_restrito" on saida_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'
  ));

-- 3) catálogo do estoque
drop policy if exists "estoque_delete" on estoque_item;
create policy "estoque_delete" on estoque_item
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'
  ));

-- 4) entrada de material
drop policy if exists "entrada_delete" on entrada_material;
create policy "entrada_delete" on entrada_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'
  ));

-- 5) ferramenta
drop policy if exists "ferr_delete" on ferramenta;
create policy "ferr_delete" on ferramenta
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'
  ));

-- 6) solicitação de material
drop policy if exists "solic_delete" on solicitacao_material;
create policy "solic_delete" on solicitacao_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in (
    'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'
  ));

commit;

-- ---------- DEPOIS: conferência ----------
-- esperado: 6 linhas, NENHUMA citando nicolas
select tablename, policyname
from pg_policies
where cmd = 'DELETE'
  and tablename in ('os_campo','saida_material','estoque_item',
                    'entrada_material','ferramenta','solicitacao_material')
order by tablename;


-- =====================================================================
-- ⚠ MARCIO — DECISÃO SUA, NÃO DECIDI POR VOCÊ
--
-- O Marcio Junior entrou no lugar do Nicolas em 01/09. Na v84 eu corrigi
-- os travões do APP (tela do engenheiro, priorizar, ajustar contagem),
-- mas a permissão de DELETE no BANCO nunca foi passada para ele —
-- 'marcio@fpv.app' não aparece em nenhuma política.
--
-- Hoje ele vê a tela do engenheiro mas o banco recusa se ele tentar
-- apagar. Se a intenção era dar a ele tudo o que o Nicolas tinha, rode
-- também o bloco abaixo. Se NÃO era, deixe como está — apagar O.S. é o
-- poder mais perigoso do sistema e nem todo assistente precisa dele.
--
-- Para dar: descomente e rode.
-- =====================================================================
-- begin;
-- drop policy if exists "fpv_gestores_delete" on os_campo;
-- create policy "fpv_gestores_delete" on os_campo
--   for delete to authenticated
--   using (auth.jwt() ->> 'email' in (
--     'lucas@fpv.app','rafael@fpv.app','renan@fpv.app','edmar@fpv.app','marcio@fpv.app'
--   ));
-- commit;
