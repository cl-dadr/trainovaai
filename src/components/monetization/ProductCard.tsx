import { motion } from "framer-motion";
import { ShoppingCart, Star } from "lucide-react";
import { useAdTracking } from "@/hooks/useAdTracking";

export interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  image: string;
  rating: number;
  description: string;
  affiliateUrl: string;
  badge?: string;
}

const ProductCard = ({ product, index = 0 }: { product: Product; index?: number }) => {
  const { trackAffiliateClick } = useAdTracking();

  const handleClick = () => {
    trackAffiliateClick(product.id, product.name, product.affiliateUrl);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="glass-card overflow-hidden border border-border/40 group"
    >
      <div className="relative h-32 overflow-hidden bg-secondary/30">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {product.badge && (
          <span className="absolute top-2 left-2 gradient-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-3">
        <h4 className="text-xs font-bold text-foreground truncate">{product.name}</h4>
        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 mb-2">{product.description}</p>
        <div className="flex items-center gap-1 mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${i < product.rating ? "text-neon-orange fill-neon-orange" : "text-muted-foreground/30"}`}
            />
          ))}
          <span className="text-[9px] text-muted-foreground ml-1">{product.rating}.0</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-black text-foreground">{product.price}</span>
            {product.originalPrice && (
              <span className="text-[10px] text-muted-foreground line-through ml-1.5">{product.originalPrice}</span>
            )}
          </div>
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="flex items-center gap-1 gradient-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
          >
            <ShoppingCart className="h-3 w-3" /> Buy
          </a>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
