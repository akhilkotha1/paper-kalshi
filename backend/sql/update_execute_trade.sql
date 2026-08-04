-- update_execute_trade.sql
--
-- Changes execute_trade to accept the user id as an explicit
-- parameter, instead of reading it from auth.uid().
--
-- Why: auth.uid() only works when Supabase's own client library
-- calls Postgres directly (it reads a JWT claim that Supabase's
-- API layer sets). Our Express backend connects via Prisma using a
-- plain database connection, which never goes through that layer —
-- so auth.uid() would always return null there. Since requireAuth
-- middleware already independently verified the user via Supabase
-- Auth, we pass that verified id straight into the function instead.
--
-- Run this in the Supabase SQL Editor. It replaces the existing
-- function entirely (same name, new signature).

create or replace function execute_trade(
  p_user_id uuid,
  p_market_id uuid,
  p_side contract_side,
  p_action trade_action,
  p_quantity integer,
  p_price_cents smallint
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := p_user_id;
  v_cost_cents bigint := p_quantity * p_price_cents;
  v_trade_id uuid;
  v_balance bigint;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_action = 'buy' then
    select balance_cents into v_balance from profiles where id = v_user_id for update;
    if v_balance < v_cost_cents then
      raise exception 'insufficient balance';
    end if;

    update profiles set balance_cents = balance_cents - v_cost_cents, updated_at = now()
      where id = v_user_id;

    insert into positions (user_id, market_id, side, quantity, avg_cost_cents)
      values (v_user_id, p_market_id, p_side, p_quantity, p_price_cents)
      on conflict (user_id, market_id, side) do update
      set quantity = positions.quantity + excluded.quantity,
          avg_cost_cents = (
            (positions.avg_cost_cents * positions.quantity) + (excluded.avg_cost_cents * excluded.quantity)
          ) / (positions.quantity + excluded.quantity),
          updated_at = now();

    insert into trades (user_id, market_id, side, action, quantity, price_cents, cost_cents)
      values (v_user_id, p_market_id, p_side, p_action, p_quantity, p_price_cents, -v_cost_cents)
      returning id into v_trade_id;

    insert into transactions (user_id, type, amount_cents, balance_after_cents, related_trade_id, related_market_id)
      select v_user_id, 'buy', -v_cost_cents, balance_cents, v_trade_id, p_market_id
      from profiles where id = v_user_id;

  elsif p_action = 'sell' then
    declare
      v_position positions%rowtype;
      v_realized_gain bigint;
      v_new_quantity integer;
    begin
      select * into v_position
        from positions
        where user_id = v_user_id and market_id = p_market_id and side = p_side
        for update;

      if v_position is null or v_position.quantity < p_quantity then
        raise exception 'insufficient position: you do not hold % contracts to sell', p_quantity;
      end if;

      v_new_quantity := v_position.quantity - p_quantity;
      v_realized_gain := ((p_price_cents - v_position.avg_cost_cents) * p_quantity)::bigint;

      update positions
        set quantity = v_new_quantity,
            realized_pnl_cents = realized_pnl_cents + v_realized_gain,
            closed = (v_new_quantity = 0),
            updated_at = now()
        where id = v_position.id;

      update profiles
        set balance_cents = balance_cents + v_cost_cents,
            realized_pnl_cents = realized_pnl_cents + v_realized_gain,
            updated_at = now()
        where id = v_user_id;

      insert into trades (user_id, market_id, side, action, quantity, price_cents, cost_cents)
        values (v_user_id, p_market_id, p_side, p_action, p_quantity, p_price_cents, v_cost_cents)
        returning id into v_trade_id;

      insert into transactions (user_id, type, amount_cents, balance_after_cents, related_trade_id, related_market_id)
        select v_user_id, 'sell', v_cost_cents, balance_cents, v_trade_id, p_market_id
        from profiles where id = v_user_id;
    end;
  end if;

  return v_trade_id;
end;
$$;
