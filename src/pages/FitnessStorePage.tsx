import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductCard, { Product } from "@/components/monetization/ProductCard";
import NativeAd from "@/components/monetization/NativeAd";
import { usePremium } from "@/hooks/usePremium";

const products: Product[] = [
  {
    id: "1",
    name: "ON Gold Standard Whey Protein",
    price: "₹4,299",
    originalPrice: "₹5,499",
    image: "https://images.unsplash.com/photo-1593095948071-474c5cc2c348?w=400&h=300&fit=crop",
    rating: 5,
    description: "24g protein per serving. World's #1 selling whey protein.",
    affiliateUrl: "https://www.amazon.in/s?k=whey+protein",
    badge: "BESTSELLER",
  },
  {
    id: "2",
    name: "Creatine Monohydrate 250g",
    price: "₹799",
    originalPrice: "₹1,199",
    image: "https://images.unsplash.com/photo-1619088009433-b6c3e7dc8b38?w=400&h=300&fit=crop",
    rating: 4,
    description: "Micronized creatine for strength and muscle gains.",
    affiliateUrl: "https://www.amazon.in/s?k=creatine+monohydrate",
    badge: "33% OFF",
  },
  {
    id: "3",
    name: "Resistance Bands Set (5 Levels)",
    price: "₹449",
    originalPrice: "₹899",
    image: "https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=300&fit=crop",
    rating: 4,
    description: "Portable workout anywhere. Perfect for home training.",
    affiliateUrl: "https://www.amazon.in/s?k=resistance+bands",
    badge: "50% OFF",
  },
  {
    id: "4",
    name: "Nike Revolution Running Shoes",
    price: "₹3,495",
    originalPrice: "₹4,995",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop",
    rating: 5,
    description: "Lightweight cushioned running shoes for daily training.",
    affiliateUrl: "https://www.amazon.in/s?k=nike+running+shoes",
  },
  {
    id: "5",
    name: "Adjustable Dumbbells (2-20kg)",
    price: "₹6,999",
    originalPrice: "₹9,999",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=300&fit=crop",
    rating: 4,
    description: "Space-saving adjustable dumbbells for home gym.",
    affiliateUrl: "https://www.amazon.in/s?k=adjustable+dumbbells",
    badge: "30% OFF",
  },
  {
    id: "6",
    name: "Premium Yoga Mat (6mm)",
    price: "₹1,299",
    originalPrice: "₹1,999",
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop",
    rating: 4,
    description: "Anti-slip, eco-friendly mat for yoga and floor exercises.",
    affiliateUrl: "https://www.amazon.in/s?k=yoga+mat",
  },
];

const FitnessStorePage = () => {
  const navigate = useNavigate();
  const { isPremium } = usePremium();

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full glass-card flex items-center justify-center">
          <ArrowLeft className="h-4 w-4 text-foreground" />
        </button>
        <div>
          <h1 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-neon-green" /> Fitness Store
          </h1>
          <p className="text-[10px] text-muted-foreground">Curated gear for your gains</p>
        </div>
      </motion.div>

      {/* Ad slot — hidden for premium */}
      {!isPremium && (
        <div className="relative z-10 mb-4">
          <NativeAd
            title="Flat 30% Off on Supplements"
            description="Use code TRAINOVA30 at checkout. Limited time offer."
            variant="compact"
          />
        </div>
      )}

      <div className="relative z-10 grid grid-cols-2 gap-3">
        {products.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>

      <p className="relative z-10 text-center text-[9px] text-muted-foreground/50 mt-6">
        Affiliate links — we may earn a commission at no extra cost to you
      </p>
    </div>
  );
};

export default FitnessStorePage;
