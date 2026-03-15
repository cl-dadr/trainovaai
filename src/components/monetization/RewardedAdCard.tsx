import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Gift, Loader2, Check } from "lucide-react";

interface RewardedAdCardProps {
  rewardLabel: string;
  rewardIcon?: React.ReactNode;
  onRewardClaimed?: () => void;
}

const RewardedAdCard = ({ rewardLabel, rewardIcon, onRewardClaimed }: RewardedAdCardProps) => {
  const [state, setState] = useState<"idle" | "watching" | "claimed">("idle");

  const handleWatch = () => {
    setState("watching");
    // Simulate ad watch (placeholder — replace with real ad SDK)
    setTimeout(() => {
      setState("claimed");
      onRewardClaimed?.();
    }, 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 border border-neon-orange/20"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-neon-orange/15 flex items-center justify-center shrink-0">
          {rewardIcon || <Gift className="h-5 w-5 text-neon-orange" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">{rewardLabel}</p>
          <p className="text-[10px] text-muted-foreground">Watch a short video to claim</p>
        </div>
        <button
          onClick={handleWatch}
          disabled={state !== "idle"}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            state === "claimed"
              ? "bg-neon-green/20 text-neon-green"
              : state === "watching"
              ? "bg-muted text-muted-foreground"
              : "gradient-orange text-primary-foreground"
          }`}
        >
          {state === "idle" && <><Play className="h-3 w-3" /> Watch</>}
          {state === "watching" && <Loader2 className="h-3 w-3 animate-spin" />}
          {state === "claimed" && <><Check className="h-3 w-3" /> Claimed</>}
        </button>
      </div>
    </motion.div>
  );
};

export default RewardedAdCard;
