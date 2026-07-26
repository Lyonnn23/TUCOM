
CREATE TABLE IF NOT EXISTS public.ranking_snapshots (
  user_id uuid PRIMARY KEY,
  position integer NOT NULL,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ranking_snapshots TO authenticated;
GRANT ALL ON public.ranking_snapshots TO service_role;

ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ranking snapshot"
  ON public.ranking_snapshots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
