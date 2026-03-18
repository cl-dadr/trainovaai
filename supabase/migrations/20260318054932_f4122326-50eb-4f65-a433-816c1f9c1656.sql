CREATE TABLE public.sponsored_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name text NOT NULL,
  product_name text NOT NULL,
  description text,
  image_url text,
  cta_text text NOT NULL DEFAULT 'Shop Now',
  cta_url text NOT NULL,
  price real,
  badge text,
  active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsored_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sponsored products"
  ON public.sponsored_products FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage sponsored products"
  ON public.sponsored_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));