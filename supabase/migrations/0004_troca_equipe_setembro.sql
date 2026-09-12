-- =====================================================================
-- TROCA-EQUIPE-2026-09.sql — Nicolas SAI, Marcio Junior ENTRA
--
-- As políticas de RLS listam os e-mails na mão. Trocar o login no app
-- NÃO basta: sem isso o Marcio não consegue excluir nada (o banco recusa)
-- e o Nicolas continuaria autorizado no banco mesmo com a conta bloqueada.
--
-- O que muda: 'nicolas@fpv.app' → 'marcio@fpv.app' em TODA policy de
-- DELETE. Emiliano NÃO entra aqui: encarregado de campo não apaga
-- registro (mesma regra do Gilson e do Carlos Alberto).
--
-- Rodar 1x no SQL Editor. Idempotente (drop + create). Só permissão —
-- NENHUM dado é alterado.
-- =====================================================================

-- 1) os_campo — exclusão (que na prática é o soft delete do app)
drop policy if exists "fpv_gestores_delete" on os_campo;
create policy "fpv_gestores_delete" on os_campo
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app'));

-- 2) saida_material — gestão + João (almoxarife)
drop policy if exists "almox_delete_restrito" on saida_material;
create policy "almox_delete_restrito" on saida_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

-- 3) demais tabelas do almoxarifado
drop policy if exists "estoque_delete" on estoque_item;
create policy "estoque_delete" on estoque_item
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

drop policy if exists "entrada_delete" on entrada_material;
create policy "entrada_delete" on entrada_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

drop policy if exists "ferr_delete" on ferramenta;
create policy "ferr_delete" on ferramenta
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

drop policy if exists "solic_delete" on solicitacao_material;
create policy "solic_delete" on solicitacao_material
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

-- 4) andaime (v76)
drop policy if exists "and_delete" on andaime_item;
create policy "and_delete" on andaime_item
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

drop policy if exists "andmov_delete" on andaime_movimento;
create policy "andmov_delete" on andaime_movimento
  for delete to authenticated
  using (auth.jwt() ->> 'email' in
    ('lucas@fpv.app','rafael@fpv.app','marcio@fpv.app','renan@fpv.app','edmar@fpv.app','joao@fpv.app'));

-- 5) conferência: nenhuma policy pode continuar citando o nicolas
select tablename, policyname, cmd,
       case when qual::text like '%nicolas%' then 'AINDA CITA NICOLAS' else 'OK' end as situacao,
       case when qual::text like '%marcio%'  then 'marcio autorizado'  else '—' end as marcio
from pg_policies
where schemaname = 'public' and cmd = 'DELETE'
order by tablename;
