import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, Star, ShoppingCart, Filter, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/usePremium";
import { useAdTracking } from "@/hooks/useAdTracking";
import AdSenseBanner from "@/components/monetization/AdSenseBanner";
import NativeAd from "@/components/monetization/NativeAd";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  category: string;
  badge: string | null;
  in_stock: boolean;
}

const CATEGORIES = ["all", "equipment", "shoes", "clothes", "bags", "bottles", "shakers", "supplements", "accessories"];

const ShopPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { trackImpression } = useAdTracking();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    trackImpression("shop", "shop-page");
  }, []);

  const fetchProducts = async () => {
    const { data } = await (supabase as any).from("products").select("*").eq("in_stock", true).order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };

  const filtered = selectedCategory === "all" ? products : products.filter((p) => p.category === selectedCategory);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBuy = async (product: Product) => {
    if (!user) return;
    setBuyingId(product.id);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: product.price, currency: "INR", plan: `product_${product.id}` },
      });
      if (error) throw error;

      // Create pending order
      await (supabase as any).from("orders").insert({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        amount: product.price,
        razorpay_order_id: data.orderId,
        status: "pending",
      });

      const options = {
        key: data.keyId,
        amount: product.price * 100,
        currency: "INR",
        name: "BEAST Shop",
        description: product.name,
        order_id: data.orderId,
        prefill: { email: user.email || "" },
        theme: { color: "#00ff88" },
        handler: async (response: any) => {
          await (supabase as any)
            .from("orders")
            .update({ status: "paid", razorpay_payment_id: response.razorpay_payment_id })
            .eq("razorpay_order_id", data.orderId);
          toast({ title: "🎉 Order placed!", description: `${product.name} purchased successfully.` });
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      toast({ title: "Payment failed", variant: "destructive" });
    }
    setBuyingId(null);
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" /> BEAST Shop
          </h1>
          <p className="text-[10px] text-muted-foreground">Premium fitness gear</p>
        </div>
      </motion.div>

      {/* AdSense for non-premium */}
      {!isPremium && (
        <div className="relative z-10 mb-4">
          <AdSenseBanner adSlot="8314049068" adFormat="fluid" className="mb-2" />
        </div>
      )}

      {/* Category filter */}
      <div className="relative z-10 flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
              selectedCategory === c
                ? "gradient-primary text-primary-foreground"
                : "glass-card text-muted-foreground"
            }`}
          >
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No products available yet</p>
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {filtered.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card overflow-hidden border border-border/40 group"
            >
              <div className="relative h-32 overflow-hidden bg-secondary/30">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
                {product.badge && (
                  <span className="absolute top-2 left-2 gradient-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h4 className="text-xs font-bold text-foreground truncate">{product.name}</h4>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 mb-2">{product.description}</p>
                <p className="text-[9px] text-muted-foreground/60 capitalize mb-2">{product.category}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-foreground">₹{product.price}</span>
                    {product.original_price && (
                      <span className="text-[10px] text-muted-foreground line-through ml-1.5">₹{product.original_price}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(product)}
                    disabled={buyingId === product.id}
                    className="flex items-center gap-1 gradient-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                  >
                    {buyingId === product.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <ShoppingCart className="h-3 w-3" /> Buy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Native ad after 4th product */}
          {!isPremium && filtered.length > 3 && (
            <div className="col-span-2">
              <NativeAd
                title="Flat 30% Off on Supplements"
                description="Use code BEAST30 at checkout. Limited time offer."
                variant="compact"
              />
            </div>
          )}
        </div>
      )}

      <p className="relative z-10 text-center text-[9px] text-muted-foreground/50 mt-6">
        Secure payments powered by Razorpay
      </p>
    </div>
  );
};

export default ShopPage;
