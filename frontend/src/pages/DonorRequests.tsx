import { useEffect, useMemo, useState } from "react";
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
import { Check, X, PackageCheck, Navigation } from "lucide-react";

export default function DonorRequests() {
  const { user, roles, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [donorLocation, setDonorLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get donor's current location once
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDonorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {} // silent fail
    );
  }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("requests")
      .select("*, foods(id, title, donor_id, latitude, longitude, address)")
      .order("created_at", { ascending: false });

    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    const mine = (data ?? []).filter((r: any) => r.foods?.donor_id === user.id);
    setRequests(mine);

    const ids = Array.from(new Set(mine.map((r: any) => r.receiver_id))).filter(Boolean);
    if (ids.length) {
      // fetch receiver profiles — grab latitude/longitude if they exist
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, name, latitude, longitude, address")
        .in("id", ids);
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    } else {
      setProfiles({});
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && !user) return;
    if (!authLoading && user && !(roles.includes("donor") || roles.includes("admin"))) return;
    if (!authLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const setStatus = async (id: string, status: "Accepted" | "Rejected" | "Completed") => {
    const { error } = await supabase.from("requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Updated", description: `Status set to ${requestStatusLabel(status)}` });
    load();
  };

  // Build Google Maps directions URL
  // Origin: donor current location (if available), else food location
  // Destination: receiver location (if available), else food location
  const buildDirectionsUrl = (request: any) => {
    const receiver = profiles[request.receiver_id];
    const food = request.foods;

    // Destination: receiver location > food location
    let dest = "";
    if (receiver?.latitude && receiver?.longitude) {
      dest = `${receiver.latitude},${receiver.longitude}`;
    } else if (food?.latitude && food?.longitude) {
      dest = `${food.latitude},${food.longitude}`;
    } else if (receiver?.address) {
      dest = encodeURIComponent(receiver.address);
    } else if (food?.address) {
      dest = encodeURIComponent(food.address);
    }

    if (!dest) return null;

    // Origin: donor GPS > food location
    let origin = "";
    if (donorLocation) {
      origin = `${donorLocation.lat},${donorLocation.lng}`;
    } else if (food?.latitude && food?.longitude) {
      origin = `${food.latitude},${food.longitude}`;
    }

    return origin
      ? `https://www.google.com/maps/dir/${origin}/${dest}`
      : `https://www.google.com/maps/dir//${dest}`;
  };

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const r of requests) {
      const k = r.foods?.title ?? "Food";
      if (!map[k]) map[k] = [];
      map[k].push(r);
    }
    return map;
  }, [requests]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Requests to my foods</h1>
            <p className="text-muted-foreground">
              One receiver can only request once per food. Approve/Reject, and mark collected when done.
            </p>
          </div>

          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                  <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([foodTitle, reqs]) => (
                <Card key={foodTitle}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">{foodTitle}</CardTitle>
                    <Badge variant="outline">{reqs.length} request(s)</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {reqs.map((r: any) => {
                      const directionsUrl = buildDirectionsUrl(r);
                      const receiver = profiles[r.receiver_id];

                      return (
                        <div
                          key={r.id}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border p-3"
                        >
                          <div className="space-y-1">
                            <div className="font-medium">
                              {receiver?.name ?? "Receiver"}{" "}
                              <span className="text-xs text-muted-foreground">
                                ({r.receiver_id.slice(0, 8)}…)
                              </span>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Badge variant="secondary">{requestStatusLabel(r.status)}</Badge>
                              <Badge variant="outline">
                                {new Date(r.created_at).toLocaleString()}
                              </Badge>
                              {/* Show receiver address if available */}
                              {receiver?.address && (
                                <Badge variant="outline" className="text-xs">
                                  📍 {receiver.address}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {/* Get Directions button — shown when Accepted */}
                            {r.status === "Accepted" && directionsUrl && (
                              <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button variant="outline" className="gap-2 border-blue-300 text-blue-600 hover:bg-blue-50">
                                  <Navigation className="h-4 w-4" /> Get Directions
                                </Button>
                              </a>
                            )}

                            <Button
                              variant="outline"
                              className="gap-2"
                              disabled={r.status !== "Pending"}
                              onClick={() => setStatus(r.id, "Accepted")}
                            >
                              <Check className="h-4 w-4" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              className="gap-2"
                              disabled={r.status !== "Pending"}
                              onClick={() => setStatus(r.id, "Rejected")}
                            >
                              <X className="h-4 w-4" /> Reject
                            </Button>
                            <Button
                              className="gap-2"
                              disabled={r.status !== "Accepted"}
                              onClick={() => setStatus(r.id, "Completed")}
                            >
                              <PackageCheck className="h-4 w-4" /> Mark collected
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {reqs.length === 0 && (
                      <div className="text-sm text-muted-foreground">No requests yet.</div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {requests.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No one has requested your foods yet.
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
