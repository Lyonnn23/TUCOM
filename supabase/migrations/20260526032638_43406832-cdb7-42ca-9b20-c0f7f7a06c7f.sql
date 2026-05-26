
CREATE TABLE IF NOT EXISTS public.station_discounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand           text NOT NULL,
  payment_method  text NOT NULL,
  discount_clp    integer NOT NULL,
  fuel_types      text[] NOT NULL DEFAULT '{95,93,97,diesel}',
  day_of_week     text[],
  time_start      time,
  time_end        time,
  max_liters      real,
  max_per_day     integer,
  valid_from      date NOT NULL DEFAULT CURRENT_DATE,
  valid_to        date,
  description     text,
  source_url      text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discounts_brand ON public.station_discounts(brand);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON public.station_discounts(is_active, valid_to);

ALTER TABLE public.station_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discounts_public_read"
  ON public.station_discounts FOR SELECT
  USING (true);

CREATE POLICY "Admins manage discounts"
  ON public.station_discounts FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_station_discounts_updated_at
BEFORE UPDATE ON public.station_discounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS payment_methods text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS discount_alerts_enabled boolean NOT NULL DEFAULT true;

INSERT INTO public.station_discounts
  (brand, payment_method, discount_clp, fuel_types, day_of_week, max_liters, description, valid_from, is_active)
VALUES
('COPEC',     'Tenpo Mastercard',       300, '{95,93,97,diesel}', NULL,             NULL, 'Descuento todos los viernes con Tenpo en Copec',          '2026-01-01', true),
('SHELL',     'Lider BCI',              100, '{95,93,97}',        ARRAY['martes'],  NULL, '$100/L los martes con tarjeta Lider BCI en Shell',        '2026-01-01', true),
('SHELL',     'Banco Internacional',    120, '{95,93,97,diesel}', NULL,             NULL, '$120/L con Banco Internacional en Shell',                 '2026-01-01', true),
('PETROBRAS', 'Ripley',                 150, '{95,93,97,diesel}', ARRAY['viernes'], NULL, 'Hasta $150/L los viernes con tarjeta Ripley',             '2026-03-01', true),
('PETROBRAS', 'Consorcio',              300, '{95,93,97,diesel}', ARRAY['viernes'], 45,   'Hasta $300/L los viernes con Banco Consorcio',            '2026-03-01', true),
('ENEX',      'MACH',                    80, '{95,93,97,diesel}', NULL,             NULL, '$80/L pagando con MACH en ENEX Full',                     '2026-01-01', true),
('ALL',       'Cuenta RUT BancoEstado',  50, '{95,93,97,diesel}', NULL,             NULL, '$50/L con Cuenta RUT en cualquier estación participante', '2026-01-01', true),
('COPEC',     'Copec Pay App',           60, '{95,93,97,diesel}', NULL,             NULL, '$60/L pagando con Copec Pay + 50% más puntos',            '2026-01-01', true),
('SHELL',     'Shell App',               40, '{95,93,97}',        NULL,             NULL, '$40/L pagando con Shell App',                             '2026-01-01', true);
