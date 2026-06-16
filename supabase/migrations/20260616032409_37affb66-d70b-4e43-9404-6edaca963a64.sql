CREATE TABLE public.share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  station_id text,
  fuel_type text,
  price numeric,
  channel text,
  shared_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.share_events TO authenticated;
GRANT INSERT ON public.share_events TO anon;
GRANT ALL ON public.share_events TO service_role;
ALTER TABLE public.share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert share events" ON public.share_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Users can read their own share events" ON public.share_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX share_events_station_idx ON public.share_events (station_id, shared_at DESC);