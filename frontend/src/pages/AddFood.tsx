import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, ArrowRight, ArrowLeft, MapPin, Clock, Package, Crosshair, Search,
  Upload, Trash2, Calendar, AlertCircle, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DRAFT_KEY = "leftoverlove_addfood_draft";

const CATEGORY_OPTIONS = ["Veg", "Non-Veg", "Mixed", "Bakery", "Beverages", "Other"];
const UNIT_OPTIONS = ["servings", "kg", "g", "boxes", "pieces", "liters", "plates"];

// Resize/compress an image client-side before upload
async function compressImage(file: File, maxWidth = 1280, quality = 0.75): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxWidth / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const AddFood = () => {
  const { user, activeRole, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [quantityNumber, setQuantityNumber] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("servings");
  const [expiryTime, setExpiryTime] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const expiryInputRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<{ title?: string; quantity?: string; description?: string }>({});
  const [draftRestored, setDraftRestored] = useState(false);

  const DESCRIPTION_MAX = 500;

  // ---- Draft autosave / restore ----
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        setTitle(d.title || "");
        setDescription(d.description || "");
        setCategory(d.category || "");
        setQuantityNumber(d.quantityNumber || "");
        setQuantityUnit(d.quantityUnit || "servings");
        setExpiryTime(d.expiryTime || "");
        setAddress(d.address || "");
        if (d.title || d.description || d.quantityNumber) {
          setDraftRestored(true);
          toast({ title: "Draft restored", description: "Your unsaved listing was restored." });
        }
      } catch {
        /* ignore corrupt draft */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const draft = { title, description, category, quantityNumber, quantityUnit, expiryTime, address };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [title, description, category, quantityNumber, quantityUnit, expiryTime, address]);

  const clearDraft = () => localStorage.removeItem(DRAFT_KEY);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (!authLoading && user && !(roles.includes("donor") || roles.includes("admin"))) {
      navigate("/dashboard");
    }
  }, [authLoading, user, roles, navigate]);

  // ---- Map helpers ----
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
        toast({ title: "Location access denied", description: "Please enable location in your browser.", variant: "destructive" });
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
      if (data.length === 0) {
        toast({ title: "No results", description: "Try a different search term.", variant: "destructive" });
      }
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

      const container = document.getElementById("add-food-map");
      if (!container || (container as any)._leaflet_id) return;

      const map = L.map(container).setView([40.7128, -74.006], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);
      mapRef.current = map;

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

  // ---- Image handling (compression + drag&drop) ----
  const addFiles = async (files: File[]) => {
    if (!files.length) return;
    setCompressing(true);
    const compressed = await Promise.all(files.map((f) => compressImage(f)));
    setCompressing(false);
    setImageFiles((prev) => [...prev, ...compressed].slice(0, 5));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    addFiles(files);
  };

  // ---- Expiry quick-select ----
  const setExpiryFromNow = (hoursFromNow: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setExpiryTime(d.toISOString().slice(0, 16));
  };

  const setExpiryTodayEvening = () => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setExpiryTime(d.toISOString().slice(0, 16));
  };

  const setExpiryTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setExpiryTime(d.toISOString().slice(0, 16));
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  // ---- Validation ----
  const validateStep1 = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required.";
    else if (title.trim().length < 3) e.title = "Title must be at least 3 characters.";

    if (!quantityNumber.trim()) e.quantity = "Quantity is required.";
    else if (isNaN(Number(quantityNumber)) || Number(quantityNumber) <= 0) e.quantity = "Enter a valid positive number.";

    if (description.length > DESCRIPTION_MAX) e.description = `Description must be under ${DESCRIPTION_MAX} characters.`;

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => {
    if (validateStep1()) setStep(2);
  };

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
        throw new Error(err?.message ?? "Upload failed");
      }
    }

    if (uploadedPaths.length) {
      await supabase.from("food_images").insert(uploadedPaths.map((p) => ({ food_id: foodId, path: p })));
    }

    return { primary: uploadedPaths[0] ?? null };
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!lat || !lng) {
      toast({ title: "Select location", description: "Click on the map to set the food location.", variant: "destructive" });
      return;
    }

    const combinedQuantity = `${quantityNumber} ${quantityUnit}`;

    setSubmitting(true);
    const { data: created, error } = await supabase
      .from("foods")
      .insert({
        title,
        description,
        category: category || null,
        quantity: combinedQuantity,
        expiry_time: expiryTime || null,
        address,
        latitude: lat,
        longitude: lng,
        status: "Available",
        donor_id: user.id,
      })
      .select("id")
      .single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      try {
        const foodId = created?.id as string;
        if (foodId) {
          const { primary } = await uploadFoodImages(foodId);
          if (primary) await supabase.from("foods").update({ primary_image_path: primary }).eq("id", foodId);
        }
      } catch (e: any) {
        toast({ title: "Uploaded without images", description: e?.message ?? "Image upload failed.", variant: "destructive" });
      }

      clearDraft();
      toast({ title: "Food listed!", description: "Your food donation is now visible on the map." });
      navigate("/dashboard");
    }
  };

  if (authLoading || (user && roles.length === 0)) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-display font-bold">Add Food Listing</h1>
          {draftRestored && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Save className="h-3 w-3" /> Draft restored
            </span>
          )}
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>1</div>
            <span className="text-sm font-medium">Details</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className={`flex items-center gap-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>2</div>
            <span className="text-sm font-medium">Location</span>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Form */}
          <div className="md:col-span-3">
            {step === 1 && (
              <Card>
                <CardHeader><CardTitle className="font-display">Food Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 20 boxed lunches"
                      className={errors.title ? "border-destructive" : ""}
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.title}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Description</Label>
                      <span className={`text-xs ${description.length > DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                        {description.length}/{DESCRIPTION_MAX}
                      </span>
                    </div>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the food, packaging, dietary info…"
                      rows={3}
                      className={errors.description ? "border-destructive" : ""}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {errors.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">Select category (optional)</option>
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={quantityNumber}
                          onChange={(e) => setQuantityNumber(e.target.value)}
                          placeholder="e.g. 20"
                          className={errors.quantity ? "border-destructive flex-1" : "flex-1"}
                        />
                        <select
                          value={quantityUnit}
                          onChange={(e) => setQuantityUnit(e.target.value)}
                          className="rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                      {errors.quantity && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {errors.quantity}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Expiry Time</Label>
                      <div className="relative">
                        <Input
                          ref={expiryInputRef}
                          type="datetime-local"
                          value={expiryTime}
                          min={getMinDateTime()}
                          onChange={(e) => setExpiryTime(e.target.value)}
                          className="pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => expiryInputRef.current?.showPicker?.()}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button type="button" onClick={() => setExpiryFromNow(2)} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 transition">
                          +2 hours
                        </button>
                        <button type="button" onClick={setExpiryTodayEvening} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 transition">
                          Today evening
                        </button>
                        <button type="button" onClick={setExpiryTomorrow} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/70 transition">
                          Tomorrow noon
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address (optional)</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
                  </div>

                  <div className="space-y-2">
                    <Label>Images</Label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition cursor-pointer relative ${
                        isDragging ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.currentTarget.files || []);
                          addFiles(files);
                          e.currentTarget.value = "";
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      {compressing ? (
                        <Loader2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground animate-spin" />
                      ) : (
                        <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium">
                        {isDragging ? "Drop images here" : "Click or drag images to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground">Up to 5 images, JPG/PNG — auto-compressed</p>
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

                  <Button onClick={goToStep2} className="w-full">
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
                        placeholder="Search address or place (e.g. 123 Main St, Hoboken)"
                        className="pl-9"
                      />
                      {searchResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                          {searchResults.map((r, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full px-3 py-2 text-left text-sm hover:bg-muted truncate"
                              onClick={() => selectSearchResult(r)}
                            >
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

                  <Button variant="outline" size="sm" onClick={locateMe} disabled={locating} className="w-full sm:w-auto">
                    <Crosshair className="h-4 w-4 mr-2" />
                    {locating ? "Getting location..." : "Use my current location"}
                  </Button>

                  <p className="text-sm text-muted-foreground">Or click on the map to set the pickup location.</p>
                  <div id="add-food-map" className="h-80 rounded-lg border" />
                  {lat && lng && (
                    <p className="text-xs text-muted-foreground">
                      📍 {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || !lat} className="flex-1">
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Listing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Preview */}
          <div className="md:col-span-2">
            <Card className="sticky top-24">
              <CardHeader><CardTitle className="text-sm font-sans text-muted-foreground">Preview</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-lg font-display font-bold">{title || "Food Title"}</h3>
                {category && (
                  <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">{category}</span>
                )}
                <p className="text-sm text-muted-foreground">{description || "Description will appear here…"}</p>
                <div className="flex flex-wrap gap-2">
                  {quantityNumber && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                      <Package className="h-3 w-3" /> {quantityNumber} {quantityUnit}
                    </span>
                  )}
                  {expiryTime && (
                    <span className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md">
                      <Clock className="h-3 w-3" /> {new Date(expiryTime).toLocaleString()}
                    </span>
                  )}
                  {lat && (
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

export default AddFood;
