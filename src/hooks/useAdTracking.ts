import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useAdTracking = () => {
  const { user } = useAuth();

  const trackImpression = useCallback(
    async (page: string, adSlot: string) => {
      if (!user) return;
      try {
        await (supabase as any).from("ad_impressions").insert({
          user_id: user.id,
          page,
          ad_slot: adSlot,
          impression_type: "view",
        });
      } catch {
        // silent fail
      }
    },
    [user]
  );

  const trackAffiliateClick = useCallback(
    async (productId: string, productName: string, affiliateUrl: string) => {
      if (!user) return;
      try {
        await (supabase as any).from("affiliate_clicks").insert({
          user_id: user.id,
          product_id: productId,
          product_name: productName,
          affiliate_url: affiliateUrl,
        });
      } catch {
        // silent fail
      }
    },
    [user]
  );

  return { trackImpression, trackAffiliateClick };
};
