import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MapPin, Crosshair, Clock, Package, Search, RefreshCw, AlertTriangle, Utensils, Radio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rankFoodsByPriority, isExpiringSoon } from "@/lib/algorithms/foodPriority";

const RADIUS_OPTIONS = [1, 3, 5, 10, 20, 50];
const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds

const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Returns a colored SVG pin as a Leaflet DivIcon */
const createColoredMarker = (color: string, L: any) =>
  L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });

const markerColor = (food: any): string => {
  if (isExpiringSoon(food)) return "#ef4444"; // red  — expiring soon
  const created = new Date(food.created_at).getTime();
  const ageHours = (Date.now() - created) / 36e5;
  if (ageHours < 6) return "#22c55e";  // green — very fresh
  return "#f97316";                     // orange — normal
};

const FoodMap = () => {
  const { user, activeRole } = useAuth();
  const { toast } = useToast();

  const [foods, setFoods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState("10");
  const [search, setSearch] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);

  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // ── Fetch & rank foods ──────────────────────────────────────────────────────
  const fetchFoods = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .eq("status", "Available")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading foods", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    let items = data ?? [];
    if (userLat && userLng) {
      const r = Number(radius);
      items = items
        .map((f) => ({ ...f, distance_km: haversine(userLat, userLng, f.latitude, f.longitude) }))
        .filter((f) => f.distance_km <= r);
    }

    items = rankFoodsByPriority(items);
    setFoods(items);
    setLastRefreshed(new Date());
    setLoading(false);
  }, [userLat, userLng, radius, toast]);

  useEffect(() => { fetchFoods(); }, [fetchFoods]);

  // ── Auto-refresh every 30 s ─────────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefreshActive) return;
    const id = setInterval(() => { fetchFoods(); }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [autoRefreshActive, fetchFoods]);

  // ── Init Leaflet map ────────────────────────────────────────────────────────
  useEffect(() => {
    const loadMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      const container = document.getElementById("food-map-main");
      if (!container || (container as any)._leaflet_id) return;
      const map = L.map(container).setView([40.7128, -74.006], 11);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
    };
    loadMap();
  }, []);

  // ── Update map markers whenever foods change ────────────────────────────────
  useEffect(() => {
    const updateMarkers = async () => {
      const L = await import("leaflet");
      if (!mapRef.current) return;

      markersRef.current.forEach((m) => mapRef.current.removeLayer(m));
      markersRef.current = [];

      foods.forEach((f) => {
        if (!f.latitude || !f.longitude) return;
        const color = markerColor(f);
        const icon = createColoredMarker(color, L);
        const marker = L.marker([f.latitude, f.longitude], { icon }).addTo(mapRef.current);
        const dist = f.distance_km ? `${f.distance_km.toFixed(1)} km away` : "";
        const expiryLabel = isExpiringSoon(f) ? "⚠️ Expiring soon!" : "";
        marker.bindPopup(`
          <div style="min-width:190px;font-family:sans-serif">
            <strong style="font-size:14px">${f.title}</strong>
            ${expiryLabel ? `<div style="color:#ef4444;font-size:12px;margin-top:2px">${expiryLabel}</div>` : ""}
            <hr style="margin:6px 0;border-color:#e5e7eb"/>
            ${f.quantity ? `<div style="font-size:12px">📦 ${f.quantity}</div>` : ""}
            ${f.expiry_time ? `<div style="font-size:12px">🕐 Expires: ${new Date(f.expiry_time).toLocaleString()}</div>` : ""}
            ${dist ? `<div style="font-size:12px">📍 ${dist}</div>` : ""}
          </div>
        `);
        markersRef.current.push(marker);
      });

      // Fit bounds
      const points: [number, number][] = foods
        .filter((f) => f.latitude && f.longitude)
        .map((f) => [f.latitude, f.longitude]);
      if (userLat != null && userLng != null) points.push([userLat, userLng]);
      if (points.length === 1) {
        mapRef.current.setView(points[0], 14);
      } else if (points.length > 1) {
        mapRef.current.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
      }
    };
    updateMarkers();
  }, [foods, userLat, userLng]);

  // ── Locate me ───────────────────────────────────────────────────────────────
  const locateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    toast({ title: "Getting your location…", description: "Please allow location access." });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        const L = await import("leaflet");
        if (mapRef.current) {
          mapRef.current.setView([lat, lng], 14);
          if (userMarkerRef.current) {
            mapRef.current.removeLayer(userMarkerRef.current);
            userMarkerRef.current = null;
          }
          const userCircle = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: "#6366f1",
            color: "#4338ca",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.85,
          }).addTo(mapRef.current);
          userCircle.bindPopup("📍 You are here");
          userMarkerRef.current = userCircle;
          toast({ title: "Location found!", description: "Your position is shown on the map." });
        }
      },
      () =>
        toast({
          title: "Location access denied",
          description: "Please enable location in your browser settings.",
          variant: "destructive",
        })
    );
  };

  const clearLocation = () => {
    setUserLat(null);
    setUserLng(null);
    if (userMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    toast({ title: "Location cleared", description: "Showing all available food." });
  };

  // ── Zoom to a food card ─────────────────────────────────────────────────────
  const zoomToFood = (f: any) => {
    if (mapRef.current && f.latitude) {
      mapRef.current.setView([f.latitude, f.longitude], 16);
      const marker = markersRef.current.find((m) => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - f.latitude) < 0.0001 && Math.abs(ll.lng - f.longitude) < 0.0001;
      });
      if (marker) marker.openPopup();
    }
  };

  // ── Request food ────────────────────────────────────────────────────────────
  const handleRequest = async (foodId: string) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to request food.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("requests")
      .insert({ food_id: foodId, receiver_id: user.id, status: "Pending" });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("unique")) {
        toast({ title: "Already requested", description: "You already sent a request for this food.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Request sent!", description: "The donor will review your request." });
    }
  };

  // ── Derived / filtered list ─────────────────────────────────────────────────
  const filteredFoods = foods.filter((f) =>
    f.title?.toLowerCase().includes(search.toLowerCase())
  );

  const statsTotal = foods.length;
  const statsExpiring = foods.filter(isExpiringSoon).length;
  const statsNearby = foods.filter((f) => f.distance_km != null && f.distance_km <= 3).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Stats bar ── */}
      <div className="bg-muted/50 border-b px-4 py-2 flex flex-wrap gap-4 items-center text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Utensils className="h-4 w-4" />
          <span><strong className="text-foreground">{statsTotal}</strong> available</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-500">
          <AlertTriangle className="h-4 w-4" />
          <span><strong>{statsExpiring}</strong> expiring soon</span>
        </div>
        {userLat && (
          <div className="flex items-center gap-1.5 text-green-600">
            <MapPin className="h-4 w-4" />
            <span><strong>{statsNearby}</strong> within 3 km</span>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 text-muted-foreground">
          <Radio className={`h-3.5 w-3.5 ${autoRefreshActive ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
          <span className="text-xs">
            Refreshed {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => setAutoRefreshActive((v) => !v)}
            className="text-xs underline hover:no-underline"
          >
            {autoRefreshActive ? "Pause" : "Resume"} auto-refresh
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── Left panel ── */}
        <div className="w-full md:w-96 border-r bg-card flex flex-col max-h-[calc(100vh-8rem)]">
          {/* Controls */}
          <div className="p-4 space-y-3 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold">Available Food</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchFoods}
                title="Refresh now"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search food…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Radius + Locate */}
            <div className="flex gap-2">
              <Select value={radius} onValueChange={setRadius}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>{r} km</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={locateMe}>
                  <Crosshair className="h-4 w-4 mr-1" /> Locate Me
                </Button>
                {userLat != null && userLng != null && (
                  <Button variant="ghost" size="sm" onClick={clearLocation}>
                    ✕ Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Marker legend */}
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Fresh</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Normal</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Expiring</span>
            </div>
          </div>

          {/* Food list */}
          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredFoods.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                {search ? `No results for "${search}".` : "No food available in this area."}
              </p>
            ) : (
              filteredFoods.map((f) => (
                <Card
                  key={f.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                    isExpiringSoon(f) ? "border-l-red-500" : "border-l-green-500"
                  }`}
                  onClick={() => zoomToFood(f)}
                >
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {f.quantity && (
                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                          <Package className="h-3 w-3" /> {f.quantity}
                        </span>
                      )}
                      {f.expiry_time && (
                        <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded">
                          <Clock className="h-3 w-3" /> {new Date(f.expiry_time).toLocaleDateString()}
                        </span>
                      )}
                      {f.distance_km != null && (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-0.5" /> {f.distance_km.toFixed(1)} km
                        </Badge>
                      )}
                      {isExpiringSoon(f) && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-0.5" /> Expiring soon
                        </Badge>
                      )}
                    </div>
                    {user && activeRole === "receiver" && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => { e.stopPropagation(); handleRequest(f.id); }}
                      >
                        Request Food
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* ── Map ── */}
        <div className="flex-1 min-h-[400px] md:min-h-0">
          <div id="food-map-main" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
};

export default FoodMap;
