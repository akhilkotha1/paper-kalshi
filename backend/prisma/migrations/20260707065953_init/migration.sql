-- CreateEnum
CREATE TYPE "market_status" AS ENUM ('open', 'closed', 'settled');

-- CreateEnum
CREATE TYPE "contract_side" AS ENUM ('yes', 'no');

-- CreateEnum
CREATE TYPE "trade_action" AS ENUM ('buy', 'sell');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('buy', 'sell', 'payout', 'deposit', 'adjustment', 'fee');

-- CreateEnum
CREATE TYPE "resolution_result" AS ENUM ('yes', 'no', 'void');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "balance_cents" BIGINT NOT NULL DEFAULT 1000000,
    "total_trades" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "realized_pnl_cents" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "markets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kalshi_ticker" TEXT NOT NULL,
    "event_ticker" TEXT NOT NULL,
    "series_ticker" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "category" TEXT,
    "yes_bid_cents" SMALLINT,
    "yes_ask_cents" SMALLINT,
    "no_bid_cents" SMALLINT,
    "no_ask_cents" SMALLINT,
    "last_price_cents" SMALLINT,
    "volume" BIGINT NOT NULL DEFAULT 0,
    "open_interest" BIGINT NOT NULL DEFAULT 0,
    "open_time" TIMESTAMP(3),
    "close_time" TIMESTAMP(3),
    "expiration_time" TIMESTAMP(3),
    "status" "market_status" NOT NULL DEFAULT 'open',
    "raw_data" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "side" "contract_side" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "avg_cost_cents" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "realized_pnl_cents" BIGINT NOT NULL DEFAULT 0,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "market_id" UUID NOT NULL,
    "side" "contract_side" NOT NULL,
    "action" "trade_action" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_cents" SMALLINT NOT NULL,
    "cost_cents" BIGINT NOT NULL,
    "market_price_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "balance_after_cents" BIGINT NOT NULL,
    "related_trade_id" UUID,
    "related_market_id" UUID,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_resolutions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "market_id" UUID NOT NULL,
    "result" "resolution_result" NOT NULL,
    "payout_per_contract_cents" SMALLINT NOT NULL DEFAULT 100,
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'kalshi_api',
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_resolutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "markets_kalshi_ticker_key" ON "markets"("kalshi_ticker");

-- CreateIndex
CREATE INDEX "markets_event_ticker_idx" ON "markets"("event_ticker");

-- CreateIndex
CREATE INDEX "markets_status_idx" ON "markets"("status");

-- CreateIndex
CREATE INDEX "markets_close_time_idx" ON "markets"("close_time");

-- CreateIndex
CREATE INDEX "positions_user_id_idx" ON "positions"("user_id");

-- CreateIndex
CREATE INDEX "positions_market_id_idx" ON "positions"("market_id");

-- CreateIndex
CREATE UNIQUE INDEX "positions_user_id_market_id_side_key" ON "positions"("user_id", "market_id", "side");

-- CreateIndex
CREATE INDEX "trades_user_id_created_at_idx" ON "trades"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "trades_market_id_created_at_idx" ON "trades"("market_id", "created_at");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "market_resolutions_market_id_key" ON "market_resolutions"("market_id");

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_trade_id_fkey" FOREIGN KEY ("related_trade_id") REFERENCES "trades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_related_market_id_fkey" FOREIGN KEY ("related_market_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_resolutions" ADD CONSTRAINT "market_resolutions_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
