import { useState, useEffect, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  BarChart3,
  Globe,
  Music4,
  DollarSign,
  Calendar,
  Target,
  Award,
} from "lucide-react";
import { fmtPlays } from "@/lib/store";
import { fmtNaira } from "@/lib/currency";
import { getBeatPlays } from "@/lib/plays-store";
import { supabase } from "@/integrations/supabase/client";
import type { Beat } from "@/data/beats";
import type { ProducerOrderRecord } from "@/lib/purchase-service";

interface AnalyticsProps {
  beats: Beat[];
  orders: ProducerOrderRecord[];
  revenue: number;
}

export function ProducerAnalytics({ beats, orders, revenue }: AnalyticsProps) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dailyPlayData, setDailyPlayData] = useState<any[]>([]);
  const [loadingPlays, setLoadingPlays] = useState(true);

  // Calculate analytics data
  const analytics = useMemo(() => {
    const totalPlays = beats.reduce((s, b) => s + getBeatPlays(b.id, b.plays), 0);
    const conversionRate = totalPlays > 0 ? ((orders.length / totalPlays) * 100).toFixed(2) : "0.00";
    const avgOrderValue = orders.length > 0 ? revenue / orders.length : 0;

    // Best selling beats
    const beatSales = new Map<string, { beat: Beat; sales: number; revenue: number }>();
    orders.forEach((order) => {
      const beat = beats.find((b) => b.id === order.beatId);
      if (beat) {
        const existing = beatSales.get(beat.id) || { beat, sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += order.price;
        beatSales.set(beat.id, existing);
      }
    });

    const topBeats = Array.from(beatSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Revenue by license type
    const licenseRevenue = orders.reduce((acc, order) => {
      const type = order.licenseType || "basic";
      acc[type] = (acc[type] || 0) + order.price;
      return acc;
    }, {} as Record<string, number>);

    // Geographic data (extract from buyer info if available)
    const countries = orders.reduce((acc, order) => {
      // For now, we'll use a placeholder - in production you'd extract from buyer location
      const country = "Nigeria"; // You can enhance this with real location data
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPlays,
      conversionRate,
      avgOrderValue,
      topBeats,
      licenseRevenue,
      countries,
    };
  }, [beats, orders, revenue]);

  // Generate daily revenue/plays data for charts - REAL DATA ONLY
  useEffect(() => {
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
    const data: any[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      // Filter orders for this day
      const dayOrders = orders.filter((o) => {
        const orderDate = new Date(o.createdAt).toISOString().split("T")[0];
        return orderDate === dateStr;
      });

      const dayRevenue = dayOrders.reduce((sum, o) => sum + o.price, 0);
      const dayLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

      data.push({
        date: dayLabel,
        revenue: dayRevenue,
        sales: dayOrders.length,
        plays: 0, // Will be filled by separate play data fetch
      });
    }

    setDailyData(data);
  }, [orders, timeframe]);

  // Load REAL daily play data from beat_plays_log table
  useEffect(() => {
    async function loadDailyPlays() {
      if (beats.length === 0) {
        setDailyPlayData([]);
        setLoadingPlays(false);
        return;
      }

      setLoadingPlays(true);
      try {
        const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 365;
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const beatIds = beats.map((b) => b.id);

        // Fetch play logs for all producer's beats within timeframe
        const { data: playLogs, error } = await supabase
          .from("beat_plays_log")
          .select("beat_id, played_at")
          .in("beat_id", beatIds)
          .gte("played_at", startDate.toISOString());

        if (error) throw error;

        // Group plays by date
        const playsByDate: Record<string, { total: number; beats: Map<string, number> }> = {};
        
        playLogs?.forEach((log) => {
          const dateStr = new Date(log.played_at).toISOString().split("T")[0];
          if (!playsByDate[dateStr]) {
            playsByDate[dateStr] = { total: 0, beats: new Map() };
          }
          playsByDate[dateStr].total += 1;
          
          const beatCount = playsByDate[dateStr].beats.get(log.beat_id) || 0;
          playsByDate[dateStr].beats.set(log.beat_id, beatCount + 1);
        });

        // Build daily data array
        const dailyPlays: any[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          const dayData = playsByDate[dateStr];
          const totalPlays = dayData?.total || 0;

          // Find top beat for this day
          let topBeat = "";
          let topBeatPlays = 0;
          if (dayData?.beats) {
            dayData.beats.forEach((count, beatId) => {
              if (count > topBeatPlays) {
                topBeatPlays = count;
                const beat = beats.find((b) => b.id === beatId);
                topBeat = beat?.title || "";
              }
            });
          }

          dailyPlays.push({
            date: dayLabel,
            plays: totalPlays,
            topBeat: topBeat || "-",
            topBeatPlays,
          });
        }

        setDailyPlayData(dailyPlays);
      } catch (error) {
        console.error("Error loading daily plays:", error);
        setDailyPlayData([]);
      } finally {
        setLoadingPlays(false);
      }
    }

    loadDailyPlays();
  }, [beats, timeframe]);

  // Chart colors
  const COLORS = {
    gold: "oklch(0.88 0.15 78)",
    teal: "oklch(0.7 0.15 180)",
    purple: "oklch(0.65 0.18 290)",
    crimson: "oklch(0.6 0.22 15)",
    blue: "oklch(0.6 0.18 240)",
  };

  const licenseColors: Record<string, string> = {
    basic: COLORS.teal,
    professional: COLORS.gold,
    premium: COLORS.purple,
    unlimited: COLORS.blue,
    exclusive: COLORS.crimson,
  };

  // Prepare license revenue chart data
  const licenseChartData = Object.entries(analytics.licenseRevenue).map(([type, rev]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: rev,
    percentage: ((rev / revenue) * 100).toFixed(1),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Real-time insights into your beats performance, revenue, and audience
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-surface/60 p-1 rounded-xl border border-white/8">
          {(["7d", "30d", "90d", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`h-8 rounded-lg px-3 text-xs font-semibold transition ${
                timeframe === t
                  ? "bg-red-500 text-black shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "all" ? "ALL" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Music4 className="h-3.5 w-3.5" />
            <span>Total Plays</span>
          </div>
          <div className="font-display text-2xl font-bold">{fmtPlays(analytics.totalPlays)}</div>
          <div className="mt-1 text-xs text-teal font-semibold">Live data</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Total Revenue</span>
          </div>
          <div className="font-display text-2xl font-bold text-red-500">{fmtNaira(revenue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{orders.length} sales</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Target className="h-3.5 w-3.5" />
            <span>Conversion</span>
          </div>
          <div className="font-display text-2xl font-bold text-teal">{analytics.conversionRate}%</div>
          <div className="mt-1 text-xs text-muted-foreground">Play → Sale</div>
        </div>

        <div className="rounded-2xl border border-white/8 bg-surface/50 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Award className="h-3.5 w-3.5" />
            <span>Avg Order</span>
          </div>
          <div className="font-display text-2xl font-bold">{fmtNaira(analytics.avgOrderValue)}</div>
          <div className="mt-1 text-xs text-muted-foreground">Per sale</div>
        </div>
      </div>

      {/* Revenue & Plays Chart */}
      <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-red-500" />
              Revenue & Sales Trend
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Daily breakdown over selected period</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={dailyData}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis 
              dataKey="date" 
              stroke="rgba(255,255,255,0.3)" 
              style={{ fontSize: "11px" }}
            />
            <YAxis 
              stroke="rgba(255,255,255,0.3)" 
              style={{ fontSize: "11px" }}
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: any, name: string) => [
                name === "revenue" ? fmtNaira(value) : value,
                name === "revenue" ? "Revenue" : "Sales",
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={COLORS.gold}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke={COLORS.teal}
              strokeWidth={2}
              dot={{ fill: COLORS.teal, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Beats */}
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-red-500" />
            Best Selling Beats
          </h3>
          <div className="space-y-3">
            {analytics.topBeats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No sales yet. Your top beats will appear here.
              </p>
            ) : (
              analytics.topBeats.map((item, index) => (
                <div
                  key={item.beat.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:bg-white/5 transition"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/5 flex items-center justify-center font-display font-bold text-red-500">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{item.beat.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.sales} sale{item.sales !== 1 ? "s" : ""} · {fmtPlays(getBeatPlays(item.beat.id, item.beat.plays))} plays
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-bold text-red-500">{fmtNaira(item.revenue)}</div>
                    <div className="text-xs text-muted-foreground">revenue</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Revenue by License Type */}
        <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
          <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-teal" />
            Revenue by License
          </h3>
          {licenseChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No license data yet. Revenue breakdown will appear here.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={licenseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {licenseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={licenseColors[entry.name.toLowerCase()] || COLORS.blue} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#ffffff",
                    }}
                    itemStyle={{
                      color: "#ffffff",
                    }}
                    formatter={(value: any) => fmtNaira(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {licenseChartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: licenseColors[item.name.toLowerCase()] || COLORS.blue }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.percentage}%</span>
                      <span className="font-semibold text-red-500">{fmtNaira(item.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Daily Plays Chart - Real data from beat_plays_log */}
      <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
          <Music4 className="h-5 w-5 text-teal" />
          Daily Beat Plays Tracking
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Real-time play tracking by date</p>
        {loadingPlays ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Loading play data...</div>
          </div>
        ) : dailyPlayData.length === 0 || dailyPlayData.every((d) => d.plays === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-teal/10 flex items-center justify-center mb-4">
              <Music4 className="h-8 w-8 text-teal" />
            </div>
            <h4 className="font-semibold text-lg mb-2">No Plays Recorded Yet</h4>
            <p className="text-sm text-muted-foreground max-w-md">
              When people play your beats, daily play data will appear here. Share your profile to get more plays!
            </p>
            <div className="mt-6 text-xs text-muted-foreground">
              Current total plays: {fmtPlays(analytics.totalPlays)}
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyPlayData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontSize: "11px" }}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.3)" 
                  style={{ fontSize: "11px" }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#ffffff",
                  }}
                  itemStyle={{
                    color: "#ffffff",
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === "plays") return [value, "Total Plays"];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Bar 
                  dataKey="plays" 
                  fill={COLORS.teal} 
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>

            {/* Top Beat Each Day */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-red-500" />
                Most Played Beat by Day
              </h4>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                {dailyPlayData
                  .filter((d) => d.topBeatPlays > 0)
                  .slice()
                  .reverse()
                  .map((d, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-white/3 p-3 hover:bg-white/5 transition"
                    >
                      <div className="text-[10px] text-muted-foreground mb-1">{d.date}</div>
                      <div className="text-sm font-semibold truncate">{d.topBeat}</div>
                      <div className="text-xs text-teal">{d.topBeatPlays} plays</div>
                    </div>
                  ))}
              </div>
              {dailyPlayData.every((d) => d.topBeatPlays === 0) && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No plays recorded in selected timeframe
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Geographic Distribution */}
      <div className="rounded-2xl border border-white/8 bg-surface/50 p-6">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-red-500" />
          Top Audience Regions
        </h3>
        <p className="text-xs text-muted-foreground mb-4">Based on buyer locations</p>
        {Object.keys(analytics.countries).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No geographic data yet. Buyer locations will appear here after sales.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {Object.entries(analytics.countries)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([country, count]) => {
                const percentage = ((count / orders.length) * 100).toFixed(1);
                return (
                  <div
                    key={country}
                    className="rounded-xl border border-white/5 bg-white/3 p-4 text-center hover:bg-white/5 transition"
                  >
                    <div className="text-2xl mb-2">🌍</div>
                    <div className="text-xs text-muted-foreground mb-1">{country}</div>
                    <div className="font-display text-xl font-bold">{percentage}%</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{count} buyer{count !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Insights & Recommendations - REAL DATA ONLY */}
      <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/5 p-6">
        <h3 className="font-display text-lg font-bold flex items-center gap-2 mb-3">
          💡 Producer Insights
        </h3>
        <div className="space-y-2 text-sm">
          {analytics.topBeats.length > 0 ? (
            <>
              <p className="text-foreground/90">
                <span className="font-semibold text-red-500">"{analytics.topBeats[0].beat.title}"</span> is your best seller with{" "}
                {fmtNaira(analytics.topBeats[0].revenue)} in revenue from {analytics.topBeats[0].sales} sale{analytics.topBeats[0].sales !== 1 ? 's' : ''}. Consider producing similar {analytics.topBeats[0].beat.genre} beats.
              </p>
              {parseFloat(analytics.conversionRate) > 3 && (
                <p className="text-foreground/90">
                  Your {analytics.conversionRate}% conversion rate is excellent! Keep engaging with your audience.
                </p>
              )}
              {analytics.avgOrderValue > 30000 && (
                <p className="text-foreground/90">
                  Your average order value of {fmtNaira(analytics.avgOrderValue)} shows customers value premium licenses.
                </p>
              )}
            </>
          ) : (
            <p className="text-foreground/90">
              Upload and publish beats to start seeing analytics. Focus on quality production and promote on social media to drive your first sales.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
