import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MapPin, RefreshCw, Navigation, Image as ImageIcon, XCircle } from "lucide-react";
import { haversineKm } from "@/lib/utils";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Food = any;

const PAGE_SIZE = 6;

export default function BrowseFoods() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<Food[]>([]);
  const [total, setTotal] = useState(0);

  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [maxKm, setMaxKm] = useState(25);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const fetchFoods = async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("foods")
      .select("*, food_images(path)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`);

    const { data, error, count } = await query.range(from, to);

    setLoading(false);

    if (error) {
      toast({ title: "Error loading foods", description: error.message, variant: "destructive" });
      return;
    }

    setFoods(data ?? []);
    setTotal(count ?? 0);
  };

  useEffect(() => {
    fetchFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    getLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!loc) return foods;
    return foods
      .map((f) => {
        const d = haversineKm(loc.lat, loc.lng, f.latitude, f.longitude);
        return { ...f, _distanceKm: d };
      })
      .filter((f) => f._distanceKm <= maxKm)
      .sort((a, b) => (a._distanceKm ?? 0) - (b._distanceKm ?? 0));
  }, [foods, loc, maxKm]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const getLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Location not supported", description: "Your browser can't access GPS.", variant: "destructive" });
      setLocationError("Your browser does not support location.");
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast({ title: "Location set", description: "Distance filter is now enabled." });
      },
      (err) => {
        setLocating(false);
        const message = err.message || "Enable location permission in your browser settings.";
        setLocationError(message);
        toast({ title: "Location blocked", description: message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Clear location — no refresh needed, useMemo re-runs automatically ──
  const clearLocation = () => {
    setLoc(null);
    setLocationError(null);
    toast({ title: "Location cleared", description: "Now showing all available food." });
  };

  const requestFood = async (foodId: string) => {
    if (!user) {
      toast({ title: "Please log in", description: "You must be logged in to request food.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("requests").insert({ food_id: foodId, receiver_id: user.id });
    if (error) {
      toast({ title: "Already requested", description: "You already sent a request for this food." });
      return;
    }
    toast({ title: "Request sent", description: "Donor will review your request." });
  };

  const getImageUrls = (f: Food) => {
    const imgs: string[] = [];
    if (f.primary_image_path) imgs.push(supabase.storage.from("food-images").getPublicUrl(f.primary_image_path).data.publicUrl);
    if (Array.isArray(f.food_images)) {
      for (const x of f.food_images.slice(0, 5)) {
        if (x?.path) imgs.push(supabase.storage.from("food-images").getPublicUrl(x.path).data.publicUrl);
      }
    }
    return imgs;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="container py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Browse foods</h1>
              <p className="text-muted-foreground">Search, filter by distance, and request food in one click.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or description..."
                className="sm:w-[320px]"
              />
              <Button onClick={() => { setPage(1); fetchFoods(); }} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Search
              </Button>

              {/* Location toggle — shows Clear when active */}
              {loc ? (
                <Button
                  variant="outline"
                  onClick={clearLocation}
                  className="gap-2 text-destructive border-destructive/50 hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4" /> Clear location
                </Button>
              ) : (
                <Button variant="outline" onClick={getLocation} className="gap-2" disabled={locating}>
                  <Navigation className="h-4 w-4" />
                  {locating ? "Finding location..." : "Use my location"}
                </Button>
              )}
            </div>

            {locationError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {locationError}
              </div>
            ) : null}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Distance filter{" "}
                {loc ? (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive/20"
                    onClick={clearLocation}
                    title="Click to disable"
                  >
                    Enabled ✕
                  </Badge>
                ) : (
                  <Badge variant="outline">Off</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Max distance: <span className="font-medium text-foreground">{maxKm} km</span>
                </div>
              </div>
              <Slider value={[maxKm]} min={1} max={100} step={1} onValueChange={(v) => setMaxKm(v[0])} />
              {!loc ? (
                <p className="text-xs text-muted-foreground">Enable location to activate distance filtering.</p>
              ) : (
                <p className="text-xs text-green-600">📍 Showing food within {maxKm} km of your location.</p>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((f) => (
                <Card key={f.id} className="overflow-hidden">
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{f.status}</Badge>
                      {typeof f._distanceKm === "number" ? (
                        <Badge variant="outline">{f._distanceKm.toFixed(1)} km</Badge>
                      ) : null}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {((f.food_images?.length ?? 0) > 0 || f.primary_image_path) ? (
                      <div onClick={() => setSelectedFood(f)} className="cursor-pointer">
                        <Carousel className="w-full">
                          <CarouselContent>
                            {[
                              ...(f.primary_image_path ? [f.primary_image_path] : []),
                              ...((f.food_images ?? []).map((x: any) => x.path) as string[]),
                            ]
                              .filter(Boolean)
                              .slice(0, 5)
                              .map((p: string, idx: number) => (
                                <CarouselItem key={idx}>
                                  <div className="h-40 w-full overflow-hidden rounded-xl border bg-muted flex items-center justify-center">
                                    <img
                                      src={supabase.storage.from("food-images").getPublicUrl(p).data.publicUrl}
                                      alt="Food"
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                </CarouselItem>
                              ))}
                          </CarouselContent>
                          <CarouselPrevious />
                          <CarouselNext />
                        </Carousel>
                      </div>
                    ) : (
                      <div className="h-40 w-full rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-2">{f.description || "No description provided."}</p>
                    <div className="text-xs text-muted-foreground line-clamp-1">{f.address}</div>

                    <Button className="w-full" onClick={() => requestFood(f.id)}>
                      Receive food
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {filtered.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    No foods match your filters.
                  </CardContent>
                </Card>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">
              Page <span className="font-medium text-foreground">{page}</span> of{" "}
              <span className="font-medium text-foreground">{pages}</span>
            </div>
            <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              Next
            </Button>
          </div>

          {/* Details dialog */}
          <Dialog open={!!selectedFood} onOpenChange={(open) => { if (!open) setSelectedFood(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedFood?.title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {selectedFood?.address}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid gap-4">
                  {selectedFood && (
                    <Carousel>
                      <CarouselContent>
                        {getImageUrls(selectedFood).map((u, i) => (
                          <CarouselItem key={i}>
                            <div className="h-64 w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                              <img src={u} alt={`Food ${i + 1}`} className="h-full w-full object-cover" />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Status</div>
                        <div className="font-medium">{selectedFood?.status}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Quantity</div>
                        <div className="font-medium">{selectedFood?.quantity ?? "—"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Expiry</div>
                        <div className="font-medium">
                          {selectedFood?.expiry_time ? new Date(selectedFood.expiry_time).toLocaleString() : "—"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      {selectedFood?.description || "No additional details provided."}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <div className="w-full flex gap-2">
                  <Button className="flex-1" onClick={() => { if (selectedFood) requestFood(selectedFood.id); }}>
                    Request
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedFood(null)}>Close</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>

      <Footer />
    </div>
  );
}
