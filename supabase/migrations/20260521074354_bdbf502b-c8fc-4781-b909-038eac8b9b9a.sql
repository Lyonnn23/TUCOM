-- tag_rates: pórticos de autopistas chilenas
CREATE TABLE public.tag_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autopista_name text NOT NULL,
  portico_id text NOT NULL,
  portico_name text,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  tarifa_baja integer NOT NULL,
  tarifa_punta integer NOT NULL,
  tarifa_saturacion integer NOT NULL,
  vehicle_class text NOT NULL DEFAULT 'auto',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portico_id, vehicle_class)
);

CREATE INDEX idx_tag_rates_coords ON public.tag_rates (lat, lng);
CREATE INDEX idx_tag_rates_autopista ON public.tag_rates (autopista_name);

ALTER TABLE public.tag_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tag rates"
  ON public.tag_rates FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage tag rates"
  ON public.tag_rates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- user_vehicles
CREATE TABLE public.user_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nickname text,
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  fuel_type text NOT NULL DEFAULT 'gasoline95',
  tank_size_l integer NOT NULL DEFAULT 50,
  consumption_kml numeric NOT NULL DEFAULT 12,
  color text NOT NULL DEFAULT '#7C3AED',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fuel_type IN ('gasoline93','gasoline95','gasoline97','diesel','electric')),
  CHECK (tank_size_l BETWEEN 20 AND 200),
  CHECK (consumption_kml BETWEEN 2 AND 40)
);

CREATE INDEX idx_user_vehicles_user ON public.user_vehicles (user_id);

ALTER TABLE public.user_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vehicles"
  ON public.user_vehicles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own vehicles"
  ON public.user_vehicles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vehicles"
  ON public.user_vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own vehicles"
  ON public.user_vehicles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all vehicles"
  ON public.user_vehicles FOR SELECT
  TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_user_vehicles_updated
  BEFORE UPDATE ON public.user_vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed tag_rates (autos clase 1, tarifas representativas 2025 CLP)
INSERT INTO public.tag_rates (autopista_name, portico_id, portico_name, lat, lng, tarifa_baja, tarifa_punta, tarifa_saturacion) VALUES
-- Autopista Central — Eje Norte-Sur (General Velásquez)
('Autopista Central','AC-NS-01','Maipú',-33.5085,-70.7560,420,820,1340),
('Autopista Central','AC-NS-02','Cerrillos',-33.4925,-70.7100,420,820,1340),
('Autopista Central','AC-NS-03','Pajaritos',-33.4690,-70.7050,420,820,1340),
('Autopista Central','AC-NS-04','Departamental',-33.5160,-70.6700,420,820,1340),
('Autopista Central','AC-NS-05','Carlos Valdovinos',-33.4720,-70.6620,420,820,1340),
('Autopista Central','AC-NS-06','Lo Espejo',-33.5300,-70.6600,420,820,1340),
('Autopista Central','AC-NS-07','El Bosque',-33.5660,-70.6710,420,820,1340),
-- Autopista Central — General Velásquez
('Autopista Central','AC-GV-01','Mapocho',-33.4290,-70.6650,420,820,1340),
('Autopista Central','AC-GV-02','Yungay',-33.4380,-70.6660,420,820,1340),

-- Costanera Norte
('Costanera Norte','CN-01','Estoril',-33.3990,-70.5340,560,1050,1680),
('Costanera Norte','CN-02','Tabancura',-33.4040,-70.5520,560,1050,1680),
('Costanera Norte','CN-03','Lo Saldes',-33.4140,-70.6010,560,1050,1680),
('Costanera Norte','CN-04','Pedro de Valdivia',-33.4250,-70.6160,560,1050,1680),
('Costanera Norte','CN-05','Salvador',-33.4300,-70.6300,560,1050,1680),
('Costanera Norte','CN-06','Centro',-33.4360,-70.6500,560,1050,1680),
('Costanera Norte','CN-07','Manuel Rodríguez',-33.4430,-70.6700,560,1050,1680),
('Costanera Norte','CN-08','Walker Martínez',-33.4530,-70.7100,560,1050,1680),

-- Vespucio Sur (Av. Américo Vespucio Sur)
('Vespucio Sur','VS-01','La Florida',-33.5240,-70.5910,490,940,1520),
('Vespucio Sur','VS-02','Macul',-33.5140,-70.6030,490,940,1520),
('Vespucio Sur','VS-03','Vicuña Mackenna',-33.5070,-70.6160,490,940,1520),
('Vespucio Sur','VS-04','Departamental',-33.5050,-70.6310,490,940,1520),
('Vespucio Sur','VS-05','Gran Avenida',-33.5040,-70.6520,490,940,1520),
('Vespucio Sur','VS-06','San Bernardo',-33.5780,-70.7050,490,940,1520),

-- Vespucio Norte
('Vespucio Norte','VN-01','El Salto',-33.3700,-70.6300,490,940,1520),
('Vespucio Norte','VN-02','Recoleta',-33.3760,-70.6360,490,940,1520),
('Vespucio Norte','VN-03','Independencia',-33.3920,-70.6620,490,940,1520),
('Vespucio Norte','VN-04','Conchalí',-33.3830,-70.6850,490,940,1520),
('Vespucio Norte','VN-05','Pudahuel',-33.4280,-70.7560,490,940,1520),
('Vespucio Norte','VN-06','Quilicura',-33.3590,-70.7350,490,940,1520),

-- Vespucio Oriente
('Vespucio Oriente','VO-01','Príncipe de Gales',-33.4170,-70.5700,620,1180,1880),
('Vespucio Oriente','VO-02','El Salto',-33.4040,-70.5660,620,1180,1880),
('Vespucio Oriente','VO-03','Lo Curro',-33.3870,-70.5740,620,1180,1880),

-- Ruta 68 (Santiago–Valparaíso) — tarifa fija por pórtico inter-urbano (sin punta)
('Ruta 68','R68-01','Lo Prado',-33.4540,-70.7700,2300,2300,2300),
('Ruta 68','R68-02','Zapata',-33.3460,-71.1300,2400,2400,2400),
('Ruta 68','R68-03','La Pólvora',-33.0560,-71.5260,1900,1900,1900),

-- Ruta 78 (Santiago–San Antonio)
('Ruta 78','R78-01','Talagante',-33.6720,-70.9290,2200,2200,2200),
('Ruta 78','R78-02','Melipilla',-33.6920,-71.2150,2300,2300,2300),
('Ruta 78','R78-03','Leyda',-33.5840,-71.5360,1800,1800,1800);