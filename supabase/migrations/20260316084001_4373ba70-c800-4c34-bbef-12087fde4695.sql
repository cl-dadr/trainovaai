
CREATE TABLE public.ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  page text NOT NULL,
  ad_slot text NOT NULL,
  impression_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert impressions" ON public.ad_impressions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view impressions" ON public.ad_impressions
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  product_id text NOT NULL,
  product_name text NOT NULL,
  affiliate_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (true);

CREATE INDEX idx_ad_impressions_created ON public.ad_impressions(created_at);
CREATE INDEX idx_ad_impressions_page ON public.ad_impressions(page);
CREATE INDEX idx_affiliate_clicks_created ON public.affiliate_clicks(created_at);
CREATE INDEX idx_affiliate_clicks_product ON public.affiliate_clicks(product_id);
