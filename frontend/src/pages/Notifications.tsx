import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, CheckCheck } from "lucide-react";

export default function Notifications() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems(data ?? []);
  };

  useEffect(() => {
    if (!authLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Done", description: "All notifications marked as read." });
    load();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2"><Bell className="h-6 w-6" /> Notifications</h1>
              <p className="text-muted-foreground">Updates for requests and status changes.</p>
            </div>
            <Button variant="outline" className="gap-2" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}><CardContent className="py-6"><Skeleton className="h-4 w-2/3" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <Card key={n.id} className={n.is_read ? "opacity-80" : ""}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{n.title}</CardTitle>
                      <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={n.is_read ? "secondary" : "destructive"}>{n.is_read ? "Read" : "New"}</Badge>
                      {!n.is_read ? (
                        <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {n.body}
                  </CardContent>
                </Card>
              ))}

              {items.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No notifications yet.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
