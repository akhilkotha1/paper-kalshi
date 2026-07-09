alter table profiles enable row level security;

create policy "profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- no delete policy — profiles shouldn't be deletable by users directly
-- handle account deletion via a service-role admin flow instead



-- MARKETS
-- Public read-only. Only backend (service role, which
-- bypasses RLS entirely) should ever write here via the sync job.
alter table markets enable row level security;

create policy "markets are viewable by everyone"
  on markets for select
  using (true);

-- deliberately no insert/update/delete policy for the authenticated
-- role — writes only happen via the service role key from
-- sync job, which bypasses RLS



-- MARKET_RESOLUTIONS
-- Public read-only

alter table market_resolutions enable row level security;

create policy "resolutions are viewable by everyone"
  on market_resolutions for select
  using (true);


-- POSITIONS
-- Users can only see and modify their own positions.
alter table positions enable row level security;

create policy "users can view their own positions"
  on positions for select
  using (auth.uid() = user_id);

create policy "users can insert their own positions"
  on positions for insert
  with check (auth.uid() = user_id);

create policy "users can update their own positions"
  on positions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TRADES
-- Users can view only their own trade history. Inserts should
-- go through the SECURITY DEFINER function too, but a
-- direct insert policy is included for simplicity/dev purposes.

alter table trades enable row level security;

create policy "users can view their own trades"
  on trades for select
  using (auth.uid() = user_id);

create policy "users can insert their own trades"
  on trades for insert
  with check (auth.uid() = user_id);

-- no update/delete — trades are immutable

-- TRANSACTIONS
-- Same idea: users can view only their own ledger, never edit it
-- directly (balance integrity depends on this being system-written)

alter table transactions enable row level security;

create policy "users can view their own transactions"
  on transactions for select
  using (auth.uid() = user_id);

-- deliberately NO insert/update/delete policy for authenticated
-- users. All transactions should be written by the SECURITY
-- DEFINER trade/payout functions or the service role


create or replace function execute_trade(
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
  v_user_id uuid := auth.uid();
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
    -- check quantity held, decrement position, credit balance, log trade + transaction
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
      -- profit/loss locked in on this sale: (sale price - avg cost paid) * quantity sold
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

-- Grant execute to authenticated users, but NOT direct table writes
grant execute on function execute_trade to authenticated;