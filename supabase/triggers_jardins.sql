-- ============================================================
--  Lógica de Jardins Críticos e Conclusão de Manutenções
--  Jardins d'Óbidos
-- ============================================================

-- 1. Helper para cálculo de estado de um jardim
create or replace function calcular_status_jardim(p_proxima date)
returns text language sql stable as $$
  select case
    when p_proxima is null then 'ok'
    when p_proxima < current_date then 'atrasado'
    when p_proxima <= current_date + interval '2 days' then 'urgente'
    else 'ok'
  end;
$$;

-- 2. Recálculo em lote do status de todos os jardins ativos
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

-- Permite ao frontend autenticado chamar o recálculo (ex.: no Dashboard)
grant execute on function recalcular_status_jardins() to authenticated;

-- 3. Trigger ao concluir manutenção:
--    - ultima_manutencao = data da manutenção (ou hoje)
--    - proxima_manutencao = ultima + 7d (semanal) ou + 14d (quinzenal)
--    - recalcula status
--    - avança etapa rotativa (se o jardim tiver plano rotativo ativo)
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

      -- Avançar etapa rotativa se aplicável
      v_proxima_etapa_id := v_jardim.etapa_atual_id;
      if v_jardim.tem_plano_rotativo then
        if v_jardim.etapa_atual_id is not null then
          select ordem into v_ordem_atual from etapa_rotativa where id = v_jardim.etapa_atual_id;
          -- Próxima etapa ordenada
          select id into v_proxima_etapa_id
          from etapa_rotativa
          where jardim_id = v_jardim.id and ordem > v_ordem_atual
          order by ordem asc limit 1;
        end if;

        -- Se não havia etapa atual ou se já terminou a última, reinicia na primeira
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

-- 4. Trigger ao registar execução (1:1 com manutenção):
--    Marca automaticamente a manutenção como 'concluida'
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

-- 5. Trigger no próprio jardim para manter status consistente quando datas são inseridas/alteradas
create or replace function on_jardim_datas_status()
returns trigger language plpgsql as $$
begin
  -- Se proxima_manutencao não foi especificada mas ultima_manutencao existe
  if NEW.proxima_manutencao is null and NEW.ultima_manutencao is not null then
    NEW.proxima_manutencao := NEW.ultima_manutencao +
      case when NEW.frequencia = 'quinzenal' then interval '14 days' else interval '7 days' end;
  end if;

  -- Calcular status
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
