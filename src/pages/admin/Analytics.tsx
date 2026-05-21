import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const FUEL_COLORS = ["#7C3AED", "#6366F1", "#06B6D4", "#EC4899"];

export default function AdminAnalytics() {
  const [dau, setDau] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [reportsByDay, setReportsByDay] = useState<any[]>([]);
  const [regByDay, setRegByDay] = useState<any[]>([]);
  const [fuelDist, setFuelDist] = useState<any[]>([]);
  const [days, setDays] = useState<number>(30);

  useEffect(() => { (async () => {
    const [{ data: d }, { data: t }] = await Promise.all([
      supabase.rpc("get_daily_active_users", { _days: days }),
      supabase.rpc("get_top_viewed_stations", { _limit: 15 }),
    ]);
    setDau((d as any[] || []).map(r => ({ day: r.day, users: Number(r.users) })));
    setTop((t as any[] || []).map(r => ({ name: r.name, views: Number(r.views) })));

    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: reports } = await supabase.from("reported_prices").select("created_at, fuel_type").gte("created_at", since).limit(5000);
    const byDay: Record<string, number> = {};
    const fuelMap: Record<string, number> = {};
    (reports ?? []).forEach((r: any) => {
      const k = r.created_at.slice(0, 10);
      byDay[k] = (byDay[k] || 0) + 1;
      fuelMap[r.fuel_type] = (fuelMap[r.fuel_type] || 0) + 1;
    });
    setReportsByDay(Object.entries(byDay).sort().map(([day, n]) => ({ day, n })));
    setFuelDist(Object.entries(fuelMap).map(([k, v]) => ({ name: k.replace("gasoline", ""), value: v })));

    // registrations per day (last N days)
    const { data: prefs } = await supabase.from("user_preferences").select("created_at").gte("created_at", since).limit(5000);
    const reg: Record<string, number> = {};
    (prefs ?? []).forEach((r: any) => { const k = r.created_at.slice(0, 10); reg[k] = (reg[k] || 0) + 1; });
    setRegByDay(Object.entries(reg).sort().map(([day, n]) => ({ day, n })));
  })(); }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[7, 30, 90].map(n => (
          <button key={n} onClick={() => setDays(n)}
            className={`px-3 py-1.5 text-sm rounded-md ${days === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {n}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Usuarios activos diarios</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dau}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} fontSize={11} />
                <YAxis fontSize={11} /><Tooltip />
                <Line type="monotone" dataKey="users" stroke="#7C3AED" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Nuevos registros</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={regByDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} fontSize={11} />
                <YAxis fontSize={11} /><Tooltip />
                <Bar dataKey="n" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reportes por día</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={reportsByDay}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" tickFormatter={d => d?.slice(5)} fontSize={11} />
                <YAxis fontSize={11} /><Tooltip />
                <Line type="monotone" dataKey="n" stroke="#EC4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Distribución de combustible en reportes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={fuelDist} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                  {fuelDist.map((_, i) => <Cell key={i} fill={FUEL_COLORS[i % FUEL_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top 15 estaciones vistas</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? <p className="text-sm text-muted-foreground">Sin visitas registradas.</p> : (
              <ResponsiveContainer width="100%" height={Math.max(260, top.length * 28)}>
                <BarChart data={top} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={140} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="views" fill="#06B6D4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
