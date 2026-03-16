import { useEffect, useRef } from "react";
import { useAdTracking } from "@/hooks/useAdTracking";

interface AdSenseBannerProps {
  adSlot?: string;
  adFormat?: "auto" | "fluid" | "rectangle";
  className?: string;
  page?: string;
}

const PUBLISHER_ID = "ca-pub-9511069914372818";
const DEFAULT_SLOT = "8314049068";

const AdSenseBanner = ({
  adSlot = DEFAULT_SLOT,
  adFormat = "fluid",
  className = "",
  page = "unknown",
}: AdSenseBannerProps) => {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const { trackImpression } = useAdTracking();

  useEffect(() => {
    if (pushed.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      pushed.current = true;
      trackImpression(page, adSlot);
    } catch {
      // AdSense not loaded yet or ad blocker active
    }
  }, []);

  return (
    <div ref={adRef} className={`relative overflow-hidden rounded-2xl border border-border/40 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-ad-layout-key="-fb+5w+4e-db+86"
        data-full-width-responsive="true"
      />
      <span className="absolute top-1 right-2 text-[8px] text-muted-foreground/50 uppercase tracking-wider z-10">
        Sponsored
      </span>
    </div>
  );
};

export default AdSenseBanner;
