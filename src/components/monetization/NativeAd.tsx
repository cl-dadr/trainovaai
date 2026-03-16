import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import AdSenseBanner from "./AdSenseBanner";

interface NativeAdProps {
  title?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  variant?: "compact" | "full";
  useAdSense?: boolean;
}

const NativeAd = ({
  title = "Fuel Your Workout",
  description = "Premium whey protein for faster recovery. Try it now.",
  imageUrl = "https://images.unsplash.com/photo-1593095948071-474c5cc2c348?w=400&h=200&fit=crop",
  ctaText = "Learn More",
  ctaUrl = "#",
  variant = "full",
  useAdSense = true,
}: NativeAdProps) => {
  // When AdSense is enabled, render the real ad unit
  if (useAdSense) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <AdSenseBanner
          adFormat={variant === "compact" ? "fluid" : "auto"}
          className={variant === "compact" ? "min-h-[60px]" : "min-h-[120px]"}
        />
      </motion.div>
    );
  }
  if (variant === "compact") {
    return (
      <motion.a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="block glass-card p-3 border border-border/40 hover:border-neon-cyan/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <img src={imageUrl} alt={title} className="h-12 w-12 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{description}</p>
          </div>
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider shrink-0">Sponsored</span>
        </div>
      </motion.a>
    );
  }

  return (
    <motion.a
      href={ctaUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="block glass-card overflow-hidden border border-border/40 hover:border-neon-cyan/30 transition-colors group"
    >
      <div className="relative h-28 overflow-hidden">
        <img src={imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
        <span className="absolute top-2 right-2 text-[8px] text-muted-foreground/60 uppercase tracking-wider bg-background/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
          Sponsored
        </span>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-foreground mb-1">{title}</h4>
        <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{description}</p>
        <div className="flex items-center gap-1 text-neon-cyan text-[11px] font-semibold">
          {ctaText} <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </motion.a>
  );
};

export default NativeAd;
