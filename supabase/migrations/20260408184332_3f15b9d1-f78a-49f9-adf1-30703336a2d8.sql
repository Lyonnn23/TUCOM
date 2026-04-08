
-- Table to store daily fuel price snapshots
CREATE TABLE public.fuel_price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fuel_type TEXT NOT NULL,
  avg_price INTEGER NOT NULL,
  min_price INTEGER NOT NULL,
  max_price INTEGER NOT NULL,
  station_count INTEGER NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (fuel_type, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.fuel_price_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view price history"
  ON public.fuel_price_history
  FOR SELECT
  TO public
  USING (true);

-- Index for fast date range queries
CREATE INDEX idx_fuel_price_history_date ON public.fuel_price_history (snapshot_date DESC);
CREATE INDEX idx_fuel_price_history_fuel_date ON public.fuel_price_history (fuel_type, snapshot_date DESC);
