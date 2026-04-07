
CREATE TABLE public.fuel_benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  discount_description TEXT NOT NULL,
  discount_percent NUMERIC,
  discount_fixed INTEGER,
  day_of_week INTEGER[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  fuel_types TEXT[] NOT NULL DEFAULT '{gasoline93,gasoline95,gasoline97,diesel}',
  conditions TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view benefits"
ON public.fuel_benefits
FOR SELECT
TO public
USING (true);
