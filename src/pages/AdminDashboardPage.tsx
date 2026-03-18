import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, MousePointerClick, CreditCard, TrendingUp, Users, DollarSign, BarChart3, Package, ShoppingBag, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

interface DashboardStats {
  totalImpressions: number;
  totalClicks: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  impressionsByPage: { page: string; count: number }[];
  clicksByProduct: { product: string; count: number }[];
  dailyImpressions: { date: string; count: number }[];
  dailyClicks: { date: string; count: number }[];
  subscriptionsByPlan: { plan: string; count: number }[];
  revenueEstimate: number;
}

const CHART_COLORS = [
  "hsl(160, 100%, 50%)",
  "hsl(180, 100%, 50%)",
  "hsl(25, 100%, 55%)",
  "hsl(280, 100%, 65%)",
  "hsl(330, 100%, 60%)",
];

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const sb = supabase as any;

      const [impressionsRes, clicksRes, subsRes] = await Promise.all([
        sb.from("ad_impressions").select("*").order("created_at", { ascending: false }),
        sb.from("affiliate_clicks").select("*").order("created_at", { ascending: false }),
        supabase.from("premium_subscriptions").select("*"),
      ]);

      const impressions = impressionsRes.data || [];
      const clicks = clicksRes.data || [];
      const subs = subsRes.data || [];

      // Impressions by page
      const pageMap = new Map<string, number>();
      impressions.forEach((i: any) => pageMap.set(i.page, (pageMap.get(i.page) || 0) + 1));
      const impressionsByPage = Array.from(pageMap.entries()).map(([page, count]) => ({ page, count }));

      // Clicks by product
      const productMap = new Map<string, number>();
      clicks.forEach((c: any) => productMap.set(c.product_name, (productMap.get(c.product_name) || 0) + 1));
      const clicksByProduct = Array.from(productMap.entries())
        .map(([product, count]) => ({ product, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Daily impressions (last 14 days)
      const dailyImpressions = getLast14Days(impressions, "created_at");
      const dailyClicks = getLast14Days(clicks, "created_at");

      // Subscriptions by plan
      const planMap = new Map<string, number>();
      subs.forEach((s: any) => planMap.set(s.plan, (planMap.get(s.plan) || 0) + 1));
      const subscriptionsByPlan = Array.from(planMap.entries()).map(([plan, count]) => ({ plan, count }));

      const activeSubscriptions = subs.filter((s: any) => s.status === "active").length;

      // Revenue estimate: monthly = ₹49, quarterly = ₹199
      const revenueEstimate = subs
        .filter((s: any) => s.status === "active")
        .reduce((sum: number, s: any) => sum + (s.plan === "quarterly" ? 199 : 49), 0);

      setStats({
        totalImpressions: impressions.length,
        totalClicks: clicks.length,
        totalSubscriptions: subs.length,
        activeSubscriptions,
        impressionsByPage,
        clicksByProduct,
        dailyImpressions,
        dailyClicks,
        subscriptionsByPlan,
        revenueEstimate,
      });
    } catch (err) {
      console.error("Failed to fetch admin stats", err);
    } finally {
      setLoading(false);
    }
  };

  const getLast14Days = (data: any[], dateField: string) => {
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    data.forEach((item: any) => {
      const day = item[dateField]?.split("T")[0];
      if (day && days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      count,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl bg-secondary/50">
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground font-display">Revenue Dashboard</h1>
            <p className="text-[10px] text-muted-foreground">Admin Analytics</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => navigate("/admin/products")}
              className="text-[10px] font-bold text-foreground px-2 py-1 rounded-lg border border-border/50 flex items-center gap-1"
            >
              <Package className="h-3 w-3" /> Products
            </button>
            <button
              onClick={() => navigate("/admin/sponsored")}
              className="text-[10px] font-bold text-foreground px-2 py-1 rounded-lg border border-neon-orange/50 flex items-center gap-1 text-neon-orange"
            >
              <Megaphone className="h-3 w-3" /> Sponsored
            </button>
            <button
              onClick={fetchStats}
              className="text-[10px] font-bold text-primary px-3 py-1 rounded-lg border border-primary/30"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard icon={Eye} label="Ad Impressions" value={stats?.totalImpressions || 0} color="text-primary" />
          <KPICard icon={MousePointerClick} label="Affiliate Clicks" value={stats?.totalClicks || 0} color="text-accent" />
          <KPICard icon={Users} label="Active Subs" value={stats?.activeSubscriptions || 0} color="text-neon-orange" />
          <KPICard icon={DollarSign} label="Est. Revenue" value={`₹${stats?.revenueEstimate || 0}`} color="text-neon-purple" />
        </div>

        <Tabs defaultValue="ads" className="w-full">
          <TabsList className="w-full bg-secondary/50">
            <TabsTrigger value="ads" className="flex-1 text-[10px]">
              <BarChart3 className="h-3 w-3 mr-1" /> Ads
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="flex-1 text-[10px]">
              <MousePointerClick className="h-3 w-3 mr-1" /> Affiliate
            </TabsTrigger>
            <TabsTrigger value="subs" className="flex-1 text-[10px]">
              <CreditCard className="h-3 w-3 mr-1" /> Subs
            </TabsTrigger>
          </TabsList>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-4 mt-3">
            <Card className="bg-card border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold">Daily Ad Impressions (14d)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ChartContainer config={{ count: { label: "Impressions", color: "hsl(160, 100%, 50%)" } }} className="h-48">
                  <BarChart data={stats?.dailyImpressions || []}>
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(160, 100%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold">Impressions by Page</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {(stats?.impressionsByPage || []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No impression data yet</p>
                )}
                {(stats?.impressionsByPage || []).map((item, i) => (
                  <div key={item.page} className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground capitalize">{item.page}</span>
                    <span className="text-[11px] font-bold text-primary">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Affiliate Tab */}
          <TabsContent value="affiliate" className="space-y-4 mt-3">
            <Card className="bg-card border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold">Daily Affiliate Clicks (14d)</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ChartContainer config={{ count: { label: "Clicks", color: "hsl(180, 100%, 50%)" } }} className="h-48">
                  <LineChart data={stats?.dailyClicks || []}>
                    <XAxis dataKey="date" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 8 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="count" stroke="hsl(180, 100%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold">Top Products by Clicks</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {(stats?.clicksByProduct || []).length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-4">No click data yet</p>
                )}
                {(stats?.clicksByProduct || []).map((item, i) => (
                  <div key={item.product} className="flex items-center justify-between">
                    <span className="text-[11px] text-foreground truncate max-w-[200px]">{item.product}</span>
                    <span className="text-[11px] font-bold text-accent">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subs" className="space-y-4 mt-3">
            <Card className="bg-card border-border/40">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-bold">Subscriptions by Plan</CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {(stats?.subscriptionsByPlan || []).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground text-center py-8">No subscription data yet</p>
                ) : (
                  <ChartContainer config={{ count: { label: "Count" } }} className="h-48">
                    <PieChart>
                      <Pie
                        data={stats?.subscriptionsByPlan?.map((s) => ({ name: s.plan, value: s.count })) || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {stats?.subscriptionsByPlan?.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-card border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">Total Subs</p>
                  <p className="text-xl font-black text-foreground">{stats?.totalSubscriptions || 0}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-[10px] text-muted-foreground">Conversion Rate</p>
                  <p className="text-xl font-black text-neon-orange">
                    {stats?.totalImpressions ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(1) : "0.0"}%
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const KPICard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="bg-card border-border/40">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-xl bg-secondary/50 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-lg font-black text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default AdminDashboardPage;
