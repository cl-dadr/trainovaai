import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, CheckCircle, Share, MoreVertical, PlusSquare, Camera, Zap, Trophy, Shield } from "lucide-react";
import { Link } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Listen for install prompt (Android/Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const features = [
    { icon: <Camera className="h-5 w-5" />, label: "AI Camera Detection", desc: "Track reps with pose estimation" },
    { icon: <Zap className="h-5 w-5" />, label: "Offline Mode", desc: "Works without internet" },
    { icon: <Trophy className="h-5 w-5" />, label: "Gamification", desc: "XP, combos, achievements" },
    { icon: <Shield className="h-5 w-5" />, label: "Native Feel", desc: "Full-screen, no browser UI" },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-8 safe-area-top safe-area-bottom">
      <div className="ambient-glow" />
      
      <div className="relative z-10 max-w-md mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-neon-cyan flex items-center justify-center shadow-lg shadow-primary/30">
            <Smartphone className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-black text-foreground mb-2">Install Trainova AI</h1>
          <p className="text-sm text-muted-foreground">Add to your home screen for the best experience</p>
        </motion.div>

        {/* Status */}
        {isInstalled ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} 
            className="glass-card p-6 text-center mb-6 border border-primary/30">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-1">Already Installed! 🎉</h2>
            <p className="text-sm text-muted-foreground mb-4">Open BEAST from your home screen for the full experience.</p>
            <Link to="/camera" className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold">
              Open AI Trainer →
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Install button (Android) */}
            {deferredPrompt && (
              <motion.button initial={{ scale: 0.95 }} animate={{ scale: 1 }} whileTap={{ scale: 0.97 }}
                onClick={handleInstall}
                className="w-full bg-primary text-primary-foreground rounded-2xl p-4 font-display font-bold text-lg mb-6 flex items-center justify-center gap-2">
                <Download className="h-5 w-5" />
                Install App
              </motion.button>
            )}

            {/* iOS Instructions */}
            {isIOS && !deferredPrompt && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 mb-6">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Share className="h-4 w-4 text-primary" /> How to install on iPhone
                </h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span>Scroll down and tap <PlusSquare className="inline h-4 w-4 mx-1" /> "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span>Tap "Add" in the top right corner</span>
                  </li>
                </ol>
              </motion.div>
            )}

            {/* Android Instructions (fallback) */}
            {!isIOS && !deferredPrompt && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4 mb-6">
                <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <MoreVertical className="h-4 w-4 text-primary" /> How to install on Android
                </h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <span>Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> menu (3 dots) in Chrome</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <span>Tap "Add to Home screen" or "Install app"</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <span>Confirm by tapping "Add"</span>
                  </li>
                </ol>
              </motion.div>
            )}
          </>
        )}

        {/* Features */}
        <div className="space-y-2 mb-6">
          <p className="text-[10px] text-muted-foreground font-bold tracking-widest">WHY INSTALL?</p>
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-card p-3 flex items-center gap-3">
              <div className="text-primary">{f.icon}</div>
              <div>
                <p className="text-sm font-bold text-foreground">{f.label}</p>
                <p className="text-[10px] text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Skip link */}
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          Continue in browser →
        </Link>
      </div>
    </div>
  );
};

export default InstallPage;
