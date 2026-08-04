-- settle_market_positions.sql
--
-- Pays out all open positions for a market once it's been resolved.
-- Run this once in the Supabase SQL Editor to create the function —
-- it was referenced in an old comment months ago but never actually
-- created for real until now.
--
-- Called from the backend's resolveMarkets.ts script after it
-- inserts a row into market_resolutions.

create or replace function settle_market_positions(p_market_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result resolution_result;
  v_payout smallint;
  pos record;
  v_amount bigint;
begin
  select result, payout_per_contract_cents into v_result, v_payout
    from market_resolutions where market_id = p_market_id;

  if v_result is null then
    raise exception 'No resolution found for market %', p_market_id;
  end if;

  for pos in
    select * from positions
    where market_id = p_market_id and quantity > 0 and not closed
  loop
    v_amount := case
      when v_result = 'void' then (pos.avg_cost_cents * pos.quantity)::bigint -- refund what they paid
      when pos.side::text = v_result::text then (v_payout * pos.quantity)::bigint -- won: pay out in full
      else 0 -- lost: no payout
    end;

    update profiles
      set balance_cents = balance_cents + v_amount,
          realized_pnl_cents = realized_pnl_cents + (v_amount - (pos.avg_cost_cents * pos.quantity)::bigint),
          total_trades = total_trades + 1,
          wins = wins + (case when v_amount > (pos.avg_cost_cents * pos.quantity)::bigint then 1 else 0 end),
          losses = losses + (case when v_amount < (pos.avg_cost_cents * pos.quantity)::bigint then 1 else 0 end),
          updated_at = now()
      where id = pos.user_id;

    insert into transactions (user_id, type, amount_cents, balance_after_cents, related_market_id)
      select pos.user_id, 'payout', v_amount, balance_cents, p_market_id
      from profiles where id = pos.user_id;

    update positions
      set closed = true,
          realized_pnl_cents = v_amount - (pos.avg_cost_cents * pos.quantity)::bigint,
          updated_at = now()
      where id = pos.id;
  end loop;
end;
$$;
