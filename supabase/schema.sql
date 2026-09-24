-- ============================================================
--  Jardins d'Óbidos — Esquema da base de dados (PostgreSQL / Supabase)
--  Correr no Supabase: SQL Editor -> New query -> colar -> Run
--  Ordem: 1) schema.sql  2) auth_and_rls.sql  3) seed.sql (opcional)
-- ============================================================

create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

-- 1. CLIENTE
create table cliente (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  contacto       text,
  premium        boolean not null default false,
  notas          text,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create trigger trg_cliente_upd before update on cliente
  for each row execute function set_atualizado_em();

-- 2. VOLTA
create table volta (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  descricao      text,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create trigger trg_volta_upd before update on volta
  for each row execute function set_atualizado_em();

-- 3. JARDIM  (etapa_atual_id: FK adicionada após etapa_rotativa)
create table jardim (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references cliente(id) on delete restrict,
  volta_id             uuid references volta(id) on delete set null,
  morada_rua           text,
  morada_cidade        text,
  morada_codigo_postal text,
  frequencia           text not null default 'semanal'
                         check (frequencia in ('semanal','quinzenal')),
  ultima_manutencao    date,
  proxima_manutencao   date,
  status               text not null default 'ok'
                         check (status in ('ok','urgente','atrasado')),
  tem_plano_rotativo   boolean not null default false,
  etapa_atual_id       uuid,
  notas                text,
  ativo                boolean not null default true,
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now()
);
create trigger trg_jardim_upd before update on jardim
  for each row execute function set_atualizado_em();
create index idx_jardim_cliente on jardim(cliente_id);
create index idx_jardim_volta   on jardim(volta_id);

-- 4. ETAPA_ROTATIVA
create table etapa_rotativa (
  id          uuid primary key default gen_random_uuid(),
  jardim_id   uuid not null references jardim(id) on delete cascade,
  ordem       integer not null,
  instrucoes  text,
  unique (jardim_id, ordem)
);
create index idx_etapa_jardim on etapa_rotativa(jardim_id);

alter table jardim
  add constraint fk_jardim_etapa_atual
  foreign key (etapa_atual_id) references etapa_rotativa(id) on delete set null;

-- 5. VEICULO
create table veiculo (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  matricula   text,
  marca       text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- 6. KIT (conjunto de ferramentas reutilizável) + itens + ligação à carrinha
create table kit (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  ativo     boolean not null default true
);
create table kit_item (
  id                 uuid primary key default gen_random_uuid(),
  kit_id             uuid not null references kit(id) on delete cascade,
  descricao_material text not null,
  quantidade         numeric(10,2)
);
create index idx_kititem_kit on kit_item(kit_id);

-- Carrinha <-> kit (N:M): que kits cada veículo transporta
create table veiculo_kit (
  id         uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculo(id) on delete cascade,
  kit_id     uuid not null references kit(id) on delete cascade,
  unique (veiculo_id, kit_id)
);
create index idx_vk_veiculo on veiculo_kit(veiculo_id);
create index idx_vk_kit on veiculo_kit(kit_id);

-- 7. COLABORADOR (login via Supabase Auth em user_id)
create table colaborador (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  nome          text not null,
  email         text unique not null,
  tipo          text not null check (tipo in ('patrao','trabalhador')),
  telefone      text,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger trg_colaborador_upd before update on colaborador
  for each row execute function set_atualizado_em();

-- 8. MANUTENCAO (trabalho planeado)
create table manutencao (
  id                      uuid primary key default gen_random_uuid(),
  jardim_id               uuid not null references jardim(id) on delete restrict,
  veiculo_id              uuid references veiculo(id) on delete set null,
  criado_por              uuid references colaborador(id) on delete set null,
  data                    date not null,
  status                  text not null default 'agendada'
                            check (status in ('agendada','em_progresso','concluida','reagendada','cancelada')),
  observacoes_planeamento text,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now()
);
create trigger trg_manutencao_upd before update on manutencao
  for each row execute function set_atualizado_em();
create index idx_manutencao_jardim on manutencao(jardim_id);
create index idx_manutencao_data   on manutencao(data);

-- 9. MANUTENCAO_COLABORADOR (equipa atribuída — N:M)
create table manutencao_colaborador (
  id             uuid primary key default gen_random_uuid(),
  manutencao_id  uuid not null references manutencao(id) on delete cascade,
  colaborador_id uuid not null references colaborador(id) on delete cascade,
  unique (manutencao_id, colaborador_id)
);
create index idx_mc_manutencao  on manutencao_colaborador(manutencao_id);
create index idx_mc_colaborador on manutencao_colaborador(colaborador_id);

-- 10. MANUTENCAO_MATERIAL_EXTRA (materiais extra a levar, além do kit da carrinha)
create table manutencao_material_extra (
  id                 uuid primary key default gen_random_uuid(),
  manutencao_id      uuid not null references manutencao(id) on delete cascade,
  descricao_material text not null,
  quantidade         numeric(10,2)
);
create index idx_mme_manutencao on manutencao_material_extra(manutencao_id);

-- 11. EXECUCAO (registo da execução — 1:1 com manutencao)
create table execucao (
  id             uuid primary key default gen_random_uuid(),
  manutencao_id  uuid not null unique references manutencao(id) on delete cascade,
  concluido_por  uuid references colaborador(id) on delete set null,
  observacoes    text,
  concluido_em   timestamptz not null default now(),
  editado_por    uuid references colaborador(id) on delete set null,
  editado_em     timestamptz
);
create index idx_execucao_manutencao on execucao(manutencao_id);

-- 12. ITEM_FATURAVEL (materiais a faturar — à parte das observações)
create table item_faturavel (
  id           uuid primary key default gen_random_uuid(),
  execucao_id  uuid not null references execucao(id) on delete cascade,
  descricao    text not null,
  quantidade   text,
  faturado     boolean not null default false,
  faturado_em  date,
  criado_em    timestamptz not null default now()
);
create index idx_itemfat_execucao on item_faturavel(execucao_id);
create index idx_itemfat_faturado on item_faturavel(faturado);

-- ============================================================
-- 13. LÓGICA DE JARDINS CRÍTICOS E CONCLUSÃO DE MANUTENÇÃO
-- ============================================================

create or replace function calcular_status_jardim(p_proxima date)
returns text language sql stable as $$
  select case
    when p_proxima is null then 'ok'
    when p_proxima < current_date then 'atrasado'
    when p_proxima <= current_date + interval '2 days' then 'urgente'
    else 'ok'
  end;
$$;

create or replace function recalcular_status_jardins()
returns void language plpgsql security definer as $$
begin
  update jardim
  set status = case
        when proxima_manutencao is null then 'ok'
        when proxima_manutencao < current_date then 'atrasado'
        when proxima_manutencao <= current_date + interval '2 days' then 'urgente'
        else 'ok'
      end,
      atualizado_em = now()
  where ativo = true
    and (
      status is distinct from (
        case
          when proxima_manutencao is null then 'ok'
          when proxima_manutencao < current_date then 'atrasado'
          when proxima_manutencao <= current_date + interval '2 days' then 'urgente'
          else 'ok'
        end
      )
    );
end;
$$;

create or replace function on_manutencao_concluida()
returns trigger language plpgsql security definer as $$
declare
  v_jardim record;
  v_dias integer;
  v_proxima date;
  v_status text;
  v_data_conclusao date;
  v_proxima_etapa_id uuid;
  v_ordem_atual integer;
begin
  if (NEW.status = 'concluida' and (OLD is null or OLD.status is distinct from 'concluida')) then
    select * into v_jardim from jardim where id = NEW.jardim_id;
    if found then
      v_data_conclusao := coalesce(NEW.data, current_date);
      v_dias := case when v_jardim.frequencia = 'quinzenal' then 14 else 7 end;
      v_proxima := v_data_conclusao + (v_dias || ' days')::interval;

      if v_proxima < current_date then
        v_status := 'atrasado';
      elsif v_proxima <= current_date + interval '2 days' then
        v_status := 'urgente';
      else
        v_status := 'ok';
      end if;

      v_proxima_etapa_id := v_jardim.etapa_atual_id;
      if v_jardim.tem_plano_rotativo then
        if v_jardim.etapa_atual_id is not null then
          select ordem into v_ordem_atual from etapa_rotativa where id = v_jardim.etapa_atual_id;
          select id into v_proxima_etapa_id
          from etapa_rotativa
          where jardim_id = v_jardim.id and ordem > v_ordem_atual
          order by ordem asc limit 1;
        end if;

        if v_proxima_etapa_id is null then
          select id into v_proxima_etapa_id
          from etapa_rotativa
          where jardim_id = v_jardim.id
          order by ordem asc limit 1;
        end if;
      end if;

      update jardim
      set ultima_manutencao = v_data_conclusao,
          proxima_manutencao = v_proxima,
          status = v_status,
          etapa_atual_id = v_proxima_etapa_id,
          atualizado_em = now()
      where id = v_jardim.id;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_manutencao_concluida on manutencao;
create trigger trg_manutencao_concluida
  after insert or update on manutencao
  for each row execute function on_manutencao_concluida();

create or replace function on_execucao_inserida()
returns trigger language plpgsql security definer as $$
begin
  update manutencao
  set status = 'concluida'
  where id = NEW.manutencao_id
    and status is distinct from 'concluida';
  return NEW;
end;
$$;

drop trigger if exists trg_execucao_inserida on execucao;
create trigger trg_execucao_inserida
  after insert on execucao
  for each row execute function on_execucao_inserida();

create or replace function on_jardim_datas_status()
returns trigger language plpgsql as $$
begin
  if NEW.proxima_manutencao is null and NEW.ultima_manutencao is not null then
    NEW.proxima_manutencao := NEW.ultima_manutencao +
      case when NEW.frequencia = 'quinzenal' then interval '14 days' else interval '7 days' end;
  end if;

  if NEW.proxima_manutencao is not null then
    if NEW.proxima_manutencao < current_date then
      NEW.status := 'atrasado';
    elsif NEW.proxima_manutencao <= current_date + interval '2 days' then
      NEW.status := 'urgente';
    else
      NEW.status := 'ok';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_jardim_datas_status on jardim;
create trigger trg_jardim_datas_status
  before insert or update of proxima_manutencao, ultima_manutencao, frequencia on jardim
  for each row execute function on_jardim_datas_status();

