ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS ai_chat_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_chat_count_date date NOT NULL DEFAULT CURRENT_DATE;