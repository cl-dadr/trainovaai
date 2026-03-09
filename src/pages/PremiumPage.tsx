import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Zap, Shield, BarChart3, Bot, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const plans = [
  {
    name: "Monthly",
    price: 99,
    period: "/mo",
    features: ["Unlimited AI Generations", "AI Workout Planner", "AI Nutrition Plans", "AI Habit Coach", "Mental Wellness Tools"],
  },
  {
    name: "Yearly",
    price: 699,
    period: "/yr",
    badge: "SAVE 41%",
    features: ["Everything in Monthly", "Custom Workout Plans", "Export Reports", "Early Access Features", "Priority Support"],
  },
];

const PremiumPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

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

  const handlePurchase = async (plan: typeof plans[0]) => {
    setLoading(plan.name);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const { data, error } = await supabase.functions.invoke("create-razorpay-order", {
        body: { amount: plan.price, currency: "INR", plan: plan.name },
      });

      if (error) throw error;

      const options = {
        key: data.keyId,
        amount: plan.price * 100,
        currency: "INR",
        name: "BEAST Pro",
        description: `${plan.name} Subscription`,
        order_id: data.orderId,
        prefill: {
          email: user?.email || "",
        },
        theme: { color: "#00ff88" },
        handler: () => {
          alert("🎉 Welcome to BEAST Pro! Your premium features are now active.");
          navigate("/");
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Please try again.");
    }
    setLoading(null);
  };

  return (
    <div className="relative min-h-screen pb-24 px-4 pt-6">
      <div className="ambient-glow" />

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 text-center mb-8">
        <div className="h-16 w-16 rounded-2xl gradient-purple mx-auto flex items-center justify-center mb-4" style={{ boxShadow: "0 0 40px hsl(280 100% 65% / 0.4)" }}>
          <Crown className="h-8 w-8 text-foreground" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">GO PRO</h1>
        <p className="text-sm text-muted-foreground mt-2">Unlock the full BEAST experience</p>
      </motion.div>

      {/* Features */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative z-10 glass-card p-5 mb-6">
        <h3 className="font-bold text-foreground mb-4">Pro Features</h3>
        <div className="space-y-3">
          {[
            { icon: Bot, label: "AI-Powered Form Correction", color: "text-neon-green" },
            { icon: BarChart3, label: "Advanced Analytics & Reports", color: "text-neon-cyan" },
            { icon: Zap, label: "Unlimited Workout Sessions", color: "text-neon-orange" },
            { icon: Shield, label: "Priority Support", color: "text-neon-purple" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <f.icon className={`h-5 w-5 ${f.color}`} />
              <span className="text-sm text-foreground">{f.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Plans */}
      <div className="relative z-10 space-y-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.1 }}
            className={`glass-card p-5 ${i === 1 ? "border-neon-green/30 neon-glow" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                  {plan.badge && (
                    <span className="gradient-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">{plan.badge}</span>
                  )}
                </div>
                <p className="text-2xl font-black text-foreground mt-1">
                  ₹{plan.price}<span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-neon-green" />
                  <span className="text-xs text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => handlePurchase(plan)}
              disabled={!!loading}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                i === 1 ? "gradient-primary text-primary-foreground neon-glow" : "glass-card text-foreground border border-border"
              }`}
            >
              {loading === plan.name ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe Now"}
            </button>
          </motion.div>
        ))}
      </div>

      <p className="relative z-10 text-center text-[10px] text-muted-foreground mt-6">
        Powered by Razorpay • Cancel anytime
      </p>
    </div>
  );
};

export default PremiumPage;
