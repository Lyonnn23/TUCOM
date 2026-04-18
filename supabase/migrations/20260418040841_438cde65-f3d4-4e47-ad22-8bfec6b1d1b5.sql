-- 1. Permitir push_subscriptions anónimas: user_id vuelve a ser opcional
ALTER TABLE public.push_subscriptions
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Limpiar políticas anteriores de push_subscriptions
DROP POLICY IF EXISTS "Authenticated users can insert their push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Select own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Update own push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Delete own push subscription" ON public.push_subscriptions;

-- 3. Nuevas políticas: permite suscripciones anónimas pero protege la privacidad
-- INSERT: cualquiera puede crear su suscripción. Si está autenticado, debe coincidir su user_id.
CREATE POLICY "Anyone can insert push subscription"
ON public.push_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- SELECT: bloqueado para clientes. Solo el service role (edge functions) lee suscripciones para enviar push.
-- Esto evita que nadie pueda enumerar endpoints/keys de otros usuarios.
-- (Sin política de SELECT = nadie puede leer vía API pública)

-- UPDATE: solo si conoces el endpoint exacto (que es secreto del navegador) y mantienes coherencia
CREATE POLICY "Update own push subscription by endpoint"
ON public.push_subscriptions
FOR UPDATE
TO anon, authenticated
USING (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
)
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);

-- DELETE: igual criterio
CREATE POLICY "Delete own push subscription"
ON public.push_subscriptions
FOR DELETE
TO anon, authenticated
USING (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
);