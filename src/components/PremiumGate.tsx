import { Crown, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface PremiumGateProps {
  remainingUses: number;
  feature: string;
}

const PremiumGate = ({ remainingUses, feature }: PremiumGateProps) => {
  const navigate = useNavigate();

  if (remainingUses > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="text-neon-orange font-semibold">{remainingUses} free</span> {feature} left
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 text-center border border-neon-purple/30"
    >
      <div className="h-12 w-12 rounded-xl bg-neon-purple/20 flex items-center justify-center mx-auto mb-3">
        <Lock className="h-6 w-6 text-neon-purple" />
      </div>
      <h3 className="font-bold text-foreground mb-1">Free Trial Ended</h3>
      <p className="text-xs text-muted-foreground mb-4">
        You've used your 2 free {feature}. Upgrade to Pro for unlimited access.
      </p>
      <button
        onClick={() => navigate("/premium")}
        className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 neon-glow"
      >
        <Crown className="h-4 w-4" /> Upgrade to Pro — ₹99/mo
      </button>
    </motion.div>
  );
};

export default PremiumGate;
