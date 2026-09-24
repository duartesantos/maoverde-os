-- ============================================================
--  Autenticação (ligação a colaborador) + Row Level Security
--  Correr DEPOIS de schema.sql.
-- ============================================================

-- 1) Ao criar uma conta no Supabase Auth, cria a linha em colaborador.
--    nome e tipo podem vir do metadata do utilizador; por defeito 'trabalhador'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.colaborador (user_id, nome, email, tipo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'tipo', 'trabalhador')
  )
  on conflict (email) do update set user_id = excluded.user_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2) Helper: o utilizador autenticado é patrão?
create or replace function is_patrao()
returns boolean
language sql
security definer stable set search_path = public
as $$
  select exists (
    select 1 from colaborador
    where user_id = auth.uid() and tipo = 'patrao' and ativo
  );
$$;

-- 3) RLS
--    Ponto de partida: qualquer autenticado LÊ tudo; o patrão ESCREVE tudo;
--    e o fluxo de terreno (execução, itens a faturar, materiais extra, estado
--    da manutenção) fica aberto a autenticados. Aperta conforme necessário.
do $$
declare t text;
begin
  foreach t in array array[
    'cliente','volta','jardim','etapa_rotativa','veiculo',
    'kit','kit_item','veiculo_kit',
    'colaborador','manutencao','manutencao_colaborador','execucao',
    'manutencao_material_extra','item_faturavel'
  ] loop
    execute format('alter table %I enable row level security;', t);
    -- leitura para qualquer autenticado
    execute format(
      'create policy "sel_%1$s" on %1$I for select to authenticated using (true);', t);
    -- escrita total para o patrão
    execute format(
      'create policy "adm_%1$s" on %1$I for all to authenticated using (is_patrao()) with check (is_patrao());', t);
  end loop;
end $$;

-- Escritas do fluxo de planeamento e terreno (abertas a autenticados na fase de desenvolvimento)
create policy "field_execucao" on execucao
  for all to authenticated using (true) with check (true);
create policy "field_itemfat" on item_faturavel
  for all to authenticated using (true) with check (true);
create policy "field_extra" on manutencao_material_extra
  for all to authenticated using (true) with check (true);
drop policy if exists "field_man_upd" on manutencao;
create policy "field_man_all" on manutencao
  for all to authenticated using (true) with check (true);
create policy "field_mancol_all" on manutencao_colaborador
  for all to authenticated using (true) with check (true);
