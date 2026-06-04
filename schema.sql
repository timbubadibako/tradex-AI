-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.predictions (
  id bigint NOT NULL DEFAULT nextval('predictions_id_seq'::regclass),
  created_at timestamp with time zone DEFAULT now(),
  coin character varying NOT NULL,
  timeframe character varying NOT NULL,
  current_price numeric NOT NULL,
  predicted_price numeric NOT NULL,
  confidence double precision NOT NULL,
  signal character varying NOT NULL,
  macro_trend character varying NOT NULL,
  CONSTRAINT predictions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.daily_harvest (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  date date DEFAULT CURRENT_DATE UNIQUE,
  pnl_idr numeric DEFAULT 0.00,
  reinvested_idr numeric DEFAULT 0.00,
  withdrawn_idr numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_harvest_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bot_state (
  key text NOT NULL,
  data jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bot_state_pkey PRIMARY KEY (key)
);
CREATE TABLE public.bot_neural_memory (
  coin text NOT NULL,
  timeframe text NOT NULL,
  rl_bias double precision DEFAULT 0.0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bot_neural_memory_pkey PRIMARY KEY (coin, timeframe)
);
CREATE TABLE public.trade_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coin text NOT NULL,
  type text NOT NULL,
  price double precision NOT NULL,
  lot double precision NOT NULL,
  pnl double precision DEFAULT 0.0,
  status text NOT NULL,
  time timestamp with time zone DEFAULT now(),
  CONSTRAINT trade_ledger_pkey PRIMARY KEY (id)
);
CREATE TABLE public.neural_checkpoints (
  id integer NOT NULL DEFAULT nextval('neural_checkpoints_id_seq'::regclass),
  coin text NOT NULL,
  timeframe text NOT NULL,
  old_mape double precision,
  new_mape double precision,
  event_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT neural_checkpoints_pkey PRIMARY KEY (id)
);