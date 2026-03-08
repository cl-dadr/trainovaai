import { useLocation, useNavigate } from "react-router-dom";
import { Home, BotMusic, User, Camera } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/streak", icon: Flame, label: "Streak" },
  { path: "/camera", icon: Camera, label: "", isCenter: true },
  { path: "/music", icon: Music, label: "Music" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around px-4 pb-2 pt-1 bg-background/80 backdrop-blur-xl border-t border-border/30">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;

        if (tab.isCenter) {
          return (
            <motion.button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              whileTap={{ scale: 0.9 }}
              className="relative -mt-6 flex h-16 w-16 items-center justify-center rounded-full gradient-primary neon-glow"
            >
              <Camera className="h-7 w-7 text-primary-foreground" />
            </motion.button>
          );
        }

        return (
          <motion.button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1 py-2 px-3"
          >
            <tab.icon
              className={`h-5 w-5 transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
            />
            <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-1 h-1 w-1 rounded-full bg-primary"
              />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
