import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Admin() {
  const { user, roles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = roles.includes("admin");

  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [foodsRes, reqRes] = await Promise.all([
      supabase.from("foods").select("id,status,donor_id,created_at").order("created_at", { ascending: false }).limit(1000),
      supabase.from("requests").select("id,status,food_id,receiver_id,created_at").order("created_at", { ascending: false }).limit(2000),
    ]);

    setLoading(false);

    if (foodsRes.error) toast({ title: "Foods error", description: foodsRes.error.message, variant: "destructive" });
    if (reqRes.error) toast({ title: "Requests error", description: reqRes.error.message, variant: "destructive" });

    setFoods(foodsRes.data ?? []);
    setRequests(reqRes.data ?? []);
  };

  useEffect(() => {
    if (!authLoading && user && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isAdmin]);

  const foodsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of foods) map[f.status] = (map[f.status] ?? 0) + 1;
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [foods]);

  const reqByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) map[r.status] = (map[r.status] ?? 0) + 1;
    return Object.entries(map).map(([status, count]) => ({ status, count }));
  }, [requests]);

  const topDonors = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of foods) map[f.donor_id] = (map[f.donor_id] ?? 0) + 1;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([donor_id, count]) => ({ donor_id, count }));
  }, [foods]);

  if (!user && !authLoading) {
    return null;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <section className="container py-10">
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Admin access required.
              </CardContent>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Admin analytics</h1>
            <p className="text-muted-foreground">Quick overview (last fetched: up to 1000 foods / 2000 requests).</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                  <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Total foods</CardTitle></CardHeader>
                  <CardContent className="text-3xl font-bold">{foods.length}</CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Total requests</CardTitle></CardHeader>
                  <CardContent className="text-3xl font-bold">{requests.length}</CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Top donors</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {topDonors.map((d) => (
                      <div key={d.donor_id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{d.donor_id.slice(0, 8)}…</span>
                        <Badge variant="secondary">{d.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Foods by status</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={foodsByStatus}>
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Requests by status</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reqByStatus}>
                        <XAxis dataKey="status" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
