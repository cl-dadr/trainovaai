import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdTracking } from "@/hooks/useAdTracking";

interface SponsoredProduct {
  id: string;
  brand_name: string;
  product_name: string;
  description: string | null;
  image_url: string | null;
  cta_text: string;
  cta_url: string;
  price: number | null;
  badge: string | null;
}

const SponsoredProductBanner = ({ page = "home" }: { page?: string }) => {
  const [product, setProduct] = useState<SponsoredProduct | null>(null);
  const { trackImpression } = useAdTracking();

  useEffect(() => {
    const fetchSponsored = async () => {
      const { data } = await (supabase as any)
        .from("sponsored_products")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setProduct(data[0]);
        trackImpression(page, "sponsored_product");
      }
    };
    fetchSponsored();
  }, [page]);

  if (!product) return null;

  const handleClick = () => {
    // Track the click as an affiliate click
    (supabase as any).from("affiliate_clicks").insert({
      product_id: product.id,
      product_name: `[SPONSORED] ${product.brand_name} - ${product.product_name}`,
      affiliate_url: product.cta_url,
      user_id: null,
    });
  };

  return (
    <motion.a
      href={product.cta_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="block glass-card overflow-hidden border border-neon-orange/30 hover:border-neon-orange/50 transition-colors"
    >
      <div className="relative">
        {product.image_url && (
          <div className="h-32 overflow-hidden">
            <img
              src={product.image_url}
              alt={product.product_name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded-full">
          <Megaphone className="h-2.5 w-2.5 text-neon-orange" />
          <span className="text-[8px] font-bold text-neon-orange uppercase">Sponsored</span>
        </div>
        {product.badge && (
          <span className="absolute top-2 right-2 text-[8px] font-bold gradient-primary text-primary-foreground px-2 py-0.5 rounded-full">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-[9px] font-bold text-neon-orange uppercase mb-0.5">{product.brand_name}</p>
        <h4 className="text-sm font-bold text-foreground">{product.product_name}</h4>
        {product.description && (
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {product.price ? (
            <span className="text-sm font-black text-foreground">₹{product.price}</span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1 gradient-primary text-primary-foreground text-[10px] font-bold px-3 py-1.5 rounded-lg">
            <ExternalLink className="h-3 w-3" /> {product.cta_text}
          </span>
        </div>
      </div>
    </motion.a>
  );
};

export default SponsoredProductBanner;
