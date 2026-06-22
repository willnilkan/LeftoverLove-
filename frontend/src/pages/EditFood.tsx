import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight, ArrowLeft, MapPin, Clock, Package, Crosshair, Search, Save, Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FOOD_STATUSES = ["Available", "Reserved", "Collected", "Expired"] as const;

const EditFood = () => {
  const { id } = useParams<{ id: string }>();
  const { user, activeRole, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryTime, setExpiryTime] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<string>("Available");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (!authLoading && user && !(roles.includes("donor") || roles.includes("admin"))) {
      navigate("/dashboard");
      return;
    }
  }, [authLoading, user, roles, navigate]);

  // Load existing food
  useEffect(() => {
    if (!id || !user) return;
    const fetchFood = async () => {
      const { data, error } = await supabase.from("foods").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast({ title: "Food not found", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      if (data.donor_id !== user.id && activeRole !== "admin") {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setTitle(data.title);
      setDescription(data.description ?? "");
      setQuantity(data.quantity ?? "");
      setExpiryTime(data.expiry_time ? data.expiry_time.slice(0, 16) : "");
      setAddress(data.address ?? "");
      setStatus(data.status);
      setLat(data.latitude);
      setLng(data.longitude);
      setSearchQuery(data.address ?? "");
      setLoading(false);
    };
    fetchFood();
  }, [id, user, activeRole, navigate, toast]);

  const updateMarker = (la: number, ln: number) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    import("leaflet").then((L) => {
      markerRef.current = L.marker([la, ln]).addTo(map);
      map.setView([la, ln], 14);
    });
  };

  const locateMe = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const ln = pos.coords.longitude;
        setLat(la);
        setLng(ln);
        updateMarker(la, ln);
        setLocating(false);
        toast({ title: "Location found!", description: "Your current position has been set." });
      },
      () => {
        setLocating(false);
        toast({ title: "Location access denied", variant: "destructive" });
      }
    );
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`,
        { headers: { "Accept-Language": "en", "User-Agent": "LeftoverLove/1.0" } }
      );
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) toast({ title: "No results", variant: "destructive" });
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    }
    setSearching(false);
  };

  const selectSearchResult = (r: { lat: string; lon: string; display_name: string }) => {
    const la = parseFloat(r.lat);
    const ln = parseFloat(r.lon);
    setLat(la);
    setLng(ln);
    setAddress(r.display_name);
    setSearchQuery(r.display_name);
    setSearchResults([]);
    updateMarker(la, ln);
  };

  useEffect(() => {
    if (step !== 2) return;
    const loadMap = async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      const container = document.getElementById("edit-food-map");
      if (!container || (container as any)._leaflet_id) return;

      const initLat = lat ?? 40.7128;
      const initLng = lng ?? -74.006;
      const map = L.map(container).setView([initLat, initLng], lat && lng ? 14 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;

      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng]).addTo(map);
      }

      map.on("click", (e: any) => {
        const { lat: la, lng: ln } = e.latlng;
        setLat(la);
        setLng(ln);
        if (markerRef.current) map.removeLayer(markerRef.current);
        markerRef.current = L.marker([la, ln]).addTo(map);
      });
    };
    loadMap();
  }, [step]);

const uploadFoodImages = async (foodId: string) => {
  if (!user) return { primary: null as string | null };
  if (!imageFiles.length) return { primary: null as string | null };

  const uploadedPaths: string[] = [];
  for (const file of imageFiles.slice(0, 5)) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${foodId}/${crypto.randomUUID()}-${safeName}`;
    try {
      const res = await supabase.storage.from("food-images").upload(path, file, { upsert: false });
      if (res.error) {
        console.error("Supabase upload error:", res.error, res);
        throw new Error(res.error.message || JSON.stringify(res.error));
      }
      uploadedPaths.push(path);
    } catch (err: any) {
      console.error("Failed uploading file to storage", { path, err });
      throw new Error(err?.message ?? 'Upload failed');
    }
  }

  if (uploadedPaths.length) {
    await supabase.from("food_images").insert(uploadedPaths.map((p) => ({ food_id: foodId, path: p })));
  }

  return { primary: uploadedPaths[0] ?? null };
};

const handleSubmit = async () => {

    if (!user || !id) return;
    if (!lat || !lng) {
      toast({ title: "Select location", description: "Set the pickup location on the map.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("foods")
      .update({
        title,
        description,
        quantity,
        expiry_time: expiryTime || null,
        address,
        latitude: lat,
        longitude: lng,
        status: status as "Available" | "Reserved" | "Collected" | "Expired",
      })
      .eq("id", id);
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      try {
        const { primary } = await uploadFoodImages(id);
        if (primary) await supabase.from("foods").update({ primary_image_path: primary }).eq("id", id);
      } catch (e: any) {
        toast({ title: "Saved without images", description: e?.message ?? "Image upload failed.", variant: "destructive" });
      }
      toast({ title: "Food updated!", description: "Your listing has been saved." });
      navigate("/dashboard");
    }
  };

  if (authLoading || loading || (user && activeRole == null)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8 max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">Edit Food Listing</h1>

        <div className="flex gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
            <span className="text-sm font-medium">Details</span>
          </div>
          <div className="h-px flex-1 bg-border self-center" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
            <span className="text-sm font-medium">Location</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle className="font-display">Food Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 20 boxed lunches" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the food…" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 20 servings" />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Time</Label>
                      <Input type="datetime-local" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
                  </div>
                  <div className="space-y-2">
                    <Label>Images</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition cursor-pointer relative">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.currentTarget.files || []);
                          setImageFiles((prev) => [...prev, ...files].slice(0, 5));
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Click to upload images</p>
                      <p className="text-xs text-muted-foreground">Up to 5 images, JPG/PNG</p>
                    </div>
                    {imageFiles.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {imageFiles.map((file, idx) => (
                          <div key={idx} className="relative group border rounded-lg overflow-hidden">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${idx}`}
                              className="w-full h-24 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                            >
                              <Trash2 className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">📸 {imageFiles.length}/5 selected</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FOOD_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Mark as Expired if the food is no longer available.</p>
                  </div>
                  <Button onClick={() => setStep(2)} disabled={!title || !quantity} className="w-full">
                    Next: Pick Location <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader><CardTitle className="font-display">Pick Location</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Search address or place"
                        className="pl-9"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                          {searchResults.map((r, i) => (
                            <button key={i} type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate" onClick={() => selectSearchResult(r)}>
                              {r.display_name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="outline" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                      {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={locateMe} disabled={locating}>
                    <Crosshair className="h-4 w-4 mr-2" />
                    {locating ? "Getting location..." : "Use my current location"}
                  </Button>
                  <p className="text-sm text-muted-foreground">Or click on the map to change the pickup location.</p>
                  <div id="edit-food-map" className="h-80 rounded-lg border" />
                  {lat != null && lng != null && (
                    <p className="text-xs text-muted-foreground">📍 {lat.toFixed(5)}, {lng.toFixed(5)}</p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || lat == null} className="flex-1">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="md:col-span-2">
            <Card className="sticky top-24">
              <CardHeader><CardTitle className="text-sm font-sans text-muted-foreground">Preview</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-lg font-display font-bold">{title || "Food Title"}</h3>
                <p className="text-sm text-muted-foreground">{description || "Description…"}</p>
                <div className="flex flex-wrap gap-2">
                  {quantity && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                      <Package className="h-3 w-3" /> {quantity}
                    </span>
                  )}
                  {expiryTime && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                      <Clock className="h-3 w-3" /> {new Date(expiryTime).toLocaleString()}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md capitalize">{status}</span>
                  {(lat != null && lng != null) && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                      <MapPin className="h-3 w-3" /> Location set
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EditFood;