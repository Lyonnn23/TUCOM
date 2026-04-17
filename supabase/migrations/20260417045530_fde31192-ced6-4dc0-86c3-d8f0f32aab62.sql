-- 1. Arreglar SELECT de reported_prices: solo el dueño puede ver sus reportes
DROP POLICY IF EXISTS "Authenticated users can view reported prices" ON public.reported_prices;

CREATE POLICY "Users can view their own reported prices"
ON public.reported_prices
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Validación server-side de reported_prices (rango de precios y tipos válidos)
ALTER TABLE public.reported_prices
  DROP CONSTRAINT IF EXISTS valid_price_range,
  DROP CONSTRAINT IF EXISTS valid_fuel_type_check;

ALTER TABLE public.reported_prices
  ADD CONSTRAINT valid_price_range CHECK (price BETWEEN 500 AND 5000),
  ADD CONSTRAINT valid_fuel_type_check CHECK (fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric'));

-- Reforzar también el WITH CHECK del INSERT
DROP POLICY IF EXISTS "Authenticated users can report prices" ON public.reported_prices;

CREATE POLICY "Authenticated users can report valid prices"
ON public.reported_prices
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND price BETWEEN 500 AND 5000
  AND fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric')
);

-- 3. Requerir autenticación para push_subscriptions (eliminar inserts anónimos)
DROP POLICY IF EXISTS "Insert own push subscription" ON public.push_subscriptions;

CREATE POLICY "Authenticated users can insert their push subscription"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Hacer user_id NOT NULL para garantizar trazabilidad y borrado por el dueño
-- Primero limpiar registros huérfanos sin user_id
DELETE FROM public.push_subscriptions WHERE user_id IS NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN user_id SET NOT NULL;