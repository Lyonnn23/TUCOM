
-- Create stations table
CREATE TABLE public.gas_stations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fuel prices table (current average prices)
CREATE TABLE public.fuel_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fuel_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  change_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'CLP/L',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create station prices table (prices per station)
CREATE TABLE public.station_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.gas_stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(station_id, fuel_type)
);

-- Create reported prices table (user reports)
CREATE TABLE public.reported_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  station_id UUID NOT NULL REFERENCES public.gas_stations(id) ON DELETE CASCADE,
  fuel_type TEXT NOT NULL,
  price INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gas_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_prices ENABLE ROW LEVEL SECURITY;

-- Gas stations: everyone can read
CREATE POLICY "Anyone can view stations" ON public.gas_stations FOR SELECT USING (true);

-- Fuel prices: everyone can read
CREATE POLICY "Anyone can view fuel prices" ON public.fuel_prices FOR SELECT USING (true);

-- Station prices: everyone can read
CREATE POLICY "Anyone can view station prices" ON public.station_prices FOR SELECT USING (true);

-- Reported prices: everyone can read, authenticated users can insert
CREATE POLICY "Anyone can view reported prices" ON public.reported_prices FOR SELECT USING (true);
CREATE POLICY "Authenticated users can report prices" ON public.reported_prices FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gas_stations_updated_at BEFORE UPDATE ON public.gas_stations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fuel_prices_updated_at BEFORE UPDATE ON public.fuel_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
