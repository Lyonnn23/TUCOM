-- Vehicle documents (revisión técnica, SOAP, permiso, aceite, etc.)
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.user_vehicles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('revision_tecnica','soap','permiso_circulacion','cambio_aceite')),
  due_date date,
  last_done_date date,
  last_done_km integer,
  reminder_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vehicle_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_documents_user ON public.vehicle_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_due ON public.vehicle_documents(due_date) WHERE reminder_active = true;

ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vehicle docs" ON public.vehicle_documents
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users insert own vehicle docs" ON public.vehicle_documents
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vehicle docs" ON public.vehicle_documents
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vehicle docs" ON public.vehicle_documents
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_vehicle_documents_updated_at
BEFORE UPDATE ON public.vehicle_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recalls (vehicle safety notices)
CREATE TABLE IF NOT EXISTS public.recalls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  year_from integer,
  year_to integer,
  description text NOT NULL,
  official_url text,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recalls_brand_model ON public.recalls(lower(brand), lower(model));

ALTER TABLE public.recalls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recalls" ON public.recalls
  FOR SELECT USING (true);
CREATE POLICY "Admins manage recalls" ON public.recalls
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Notification log to dedupe reminders
CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  ref_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, ref_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user ON public.notification_log(user_id);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notif log" ON public.notification_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR is_admin());