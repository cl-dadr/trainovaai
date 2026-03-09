import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const FREE_LIMIT = 2;

export const usePremium = () => {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    const [{ data: sub }, { data: usage }] = await Promise.all([
      supabase
        .from("premium_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("feature_usage")
        .select("feature")
        .eq("user_id", user.id),
    ]);

    // Check if any active subscription exists and hasn't expired
    const activeSub = sub?.[0];
    const isActive = activeSub && (!activeSub.expires_at || new Date(activeSub.expires_at) > new Date());
    setIsPremium(!!isActive);

    // Count usage per feature
    const counts: Record<string, number> = {};
    usage?.forEach((u: any) => {
      counts[u.feature] = (counts[u.feature] || 0) + 1;
    });
    setUsageCounts(counts);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const canUseFeature = useCallback((feature: string): boolean => {
    if (isPremium) return true;
    return (usageCounts[feature] || 0) < FREE_LIMIT;
  }, [isPremium, usageCounts]);

  const getRemainingUses = useCallback((feature: string): number => {
    if (isPremium) return Infinity;
    return Math.max(0, FREE_LIMIT - (usageCounts[feature] || 0));
  }, [isPremium, usageCounts]);

  const trackUsage = useCallback(async (feature: string) => {
    if (!user || isPremium) return;
    await supabase.from("feature_usage").insert({ user_id: user.id, feature });
    setUsageCounts(prev => ({ ...prev, [feature]: (prev[feature] || 0) + 1 }));
  }, [user, isPremium]);

  return { isPremium, loading, canUseFeature, getRemainingUses, trackUsage, refetch: fetchStatus };
};
