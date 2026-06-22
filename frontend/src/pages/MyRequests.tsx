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
import { requestStatusLabel } from "@/lib/utils";
import { Navigation } from "lucide-react";

export default function MyRequests() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [receiverLocation, setReceiverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get receiver's current GPS location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setReceiverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fail — directions still work without origin
    );
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("requests")
      .select("*, foods(title, address, status, latitude, longitude)")
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setRequests(data ?? []);
  };

  useEffect(() => {
    if (!authLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const cancel = async (id: string) => {
    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) {
      toast({ title: "Can't cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cancelled", description: "Request removed." });
    load();
  };

  // Build Google Maps URL: receiver location → food location
  const buildDirectionsUrl = (food: any) => {
    // Destination: food lat/lng or address
    let dest = "";
    if (food?.latitude && food?.longitude) {
      dest = `${food.latitude},${food.longitude}`;
    } else if (food?.address) {
      dest = encodeURIComponent(food.address);
    }

    if (!dest) return null;

    // Origin: receiver current GPS location
    const origin = receiverLocation
      ? `${receiverLocation.lat},${receiverLocation.lng}`
      : "";

    return origin
      ? `https://www.google.com/maps/dir/${origin}/${dest}`
      : `https://www.google.com/maps/dir//${dest}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">My requests</h1>
            <p className="text-muted-foreground">Track your receive requests and their status.</p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-9 w-28" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {requests.map((r) => {
                const directionsUrl = buildDirectionsUrl(r.foods);

                return (
                  <Card key={r.id}>
                    <CardHeader className="space-y-2">
                      <CardTitle className="text-lg">{r.foods?.title ?? "Food"}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary">{requestStatusLabel(r.status)}</Badge>
                        <Badge variant="outline">{new Date(r.created_at).toLocaleString()}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {r.foods?.address && (
                        <div className="text-sm text-muted-foreground">
                          📍 {r.foods.address}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {/* Get Directions — only when Accepted */}
                        {r.status === "Accepted" && directionsUrl && (
                          <a
                            href={directionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                              <Navigation className="h-4 w-4" /> Get Directions
                            </Button>
                          </a>
                        )}

                        {r.status === "Pending" ? (
                          <Button variant="outline" onClick={() => cancel(r.id)}>
                            Cancel request
                          </Button>
                        ) : r.status !== "Accepted" ? (
                          <p className="text-xs text-muted-foreground self-center">
                            You can cancel only while Pending.
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {requests.length === 0 && (
                <Card className="md:col-span-2">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No requests yet. Browse foods and click "Receive food"
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
