import { motion } from "framer-motion";
import { Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PremiumUpsellBanner = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate("/premium")}
      className="w-full glass-card p-4 border border-neon-purple/30 text-left group"
      style={{ boxShadow: "0 0 20px hsl(280 100% 65% / 0.15)" }}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl gradient-purple flex items-center justify-center shrink-0">
          <Crown className="h-5 w-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Go PRO — No Ads</p>
          <p className="text-[10px] text-muted-foreground">AI Coach, Nutrition AI & more from ₹49/mo</p>
        </div>
        <ArrowRight className="h-4 w-4 text-neon-purple group-hover:translate-x-1 transition-transform shrink-0" />
      </div>
    </motion.button>
  );
};

export default PremiumUpsellBanner;
