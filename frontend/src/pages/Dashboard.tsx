import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, MapPin, Truck, Users, Utensils, Check, X, Pencil, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColor: Record<string, string> = {
  Available: "bg-success text-primary-foreground",
  Reserved: "bg-warning text-primary-foreground",
  Collected: "bg-info text-primary-foreground",
  Expired: "bg-destructive text-destructive-foreground",
  Pending: "bg-warning text-primary-foreground",
  Accepted: "bg-success text-primary-foreground",
  Rejected: "bg-destructive text-destructive-foreground",
  Completed: "bg-info text-primary-foreground",
  Assigned: "bg-warning text-primary-foreground",
  PickedUp: "bg-info text-primary-foreground",
  Delivered: "bg-success text-primary-foreground",
};

const Dashboard = () => {
  const { user, roles, activeRole, setActiveRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [foods, setFoods] = useState<any[]>([]);
  const [requesterProfiles, setRequesterProfiles] = useState<Record<string, any>>({});
  const [requests, setRequests] = useState<any[]>([]);
  const [availableForDelivery, setAvailableForDelivery] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !activeRole) return;
    const fetchData = async () => {
      setLoading(true);
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(myProfile ?? null);

      if (activeRole === "donor" || activeRole === "admin") {
        const { data } = await supabase.from("foods").select("*").order("created_at", { ascending: false }).limit(20);
        setFoods(data ?? []);
      }
      if (activeRole === "receiver" || activeRole === "admin" || activeRole === "donor") {
        const { data } = await supabase.from("requests").select("*, foods(title)").order("created_at", { ascending: false }).limit(20);
        const reqs = (data ?? []) as any[];
        setRequests(reqs);
        const receiverIds = Array.from(new Set(reqs.map((r) => r.receiver_id).filter(Boolean)));
        if (receiverIds.length > 0 && (activeRole === "donor" || activeRole === "admin")) {
          const { data: profs } = await supabase.from("profiles").select("id, name").in("id", receiverIds);
          const map: Record<string, any> = {};
          (profs ?? []).forEach((p: any) => { map[p.id] = p; });
          setRequesterProfiles(map);
        } else {
          setRequesterProfiles({});
        }
      }
      if (activeRole === "volunteer" || activeRole === "admin") {
        const [deliveriesRes, acceptedRequestsRes] = await Promise.all([
          supabase.from("deliveries").select("*, requests(*, foods(title, latitude, longitude, address))").order("created_at", { ascending: false }).limit(20),
          supabase.from("requests").select("*, foods(title, latitude, longitude, address)").eq("status", "Accepted").order("created_at", { ascending: false }),
        ]);
        setDeliveries(deliveriesRes.data ?? []);
        const claimedIds = new Set((deliveriesRes.data ?? []).map((d) => d.request_id));
        setAvailableForDelivery((acceptedRequestsRes.data ?? []).filter((r) => !claimedIds.has(r.id)));
      }
      setLoading(false);
    };
    fetchData();
  }, [user, activeRole]);

  const handleRequestAction = async (requestId: string, action: "Accepted" | "Rejected") => {
    const { error } = await supabase.from("requests").update({ status: action }).eq("id", requestId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (action === "Accepted") {
      const req = requests.find((r) => r.id === requestId);
      if (req) await supabase.from("foods").update({ status: "Reserved" }).eq("id", req.food_id);
    }
    toast({ title: `Request ${action.toLowerCase()}` });
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: action } : r)));
  };

  const handleClaimDelivery = async (requestId: string) => {
    if (!user) return;
    const { error } = await supabase.from("deliveries").insert({ request_id: requestId, volunteer_id: user.id, delivery_status: "Assigned" });
    if (error) {
      const isDuplicate = error.code === "23505";
      toast({ title: isDuplicate ? "Already claimed" : "Error", description: isDuplicate ? "Another volunteer already claimed this delivery." : error.message, variant: "destructive" });
      if (isDuplicate) setAvailableForDelivery((prev) => prev.filter((r) => r.id !== requestId));
      return;
    }
    toast({ title: "Delivery claimed!" });
    const [deliveriesRes, acceptedRes] = await Promise.all([
      supabase.from("deliveries").select("*, requests(*, foods(title, latitude, longitude, address))").order("created_at", { ascending: false }).limit(20),
      supabase.from("requests").select("*, foods(title, latitude, longitude, address)").eq("status", "Accepted").order("created_at", { ascending: false }),
    ]);
    setDeliveries(deliveriesRes.data ?? []);
    const claimedIds = new Set((deliveriesRes.data ?? []).map((d) => d.request_id));
    setAvailableForDelivery((acceptedRes.data ?? []).filter((r) => !claimedIds.has(r.id)));
  };

  const handleDeleteFood = async () => {
    if (!foodToDelete) return;
    const { error } = await supabase.from("foods").delete().eq("id", foodToDelete.id);
    setDeleteDialogOpen(false);
    setFoodToDelete(null);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFoods((prev) => prev.filter((f) => f.id !== foodToDelete.id));
    toast({ title: "Food deleted", description: "The listing has been removed." });
  };

  const handleMarkExpired = async (food: any) => {
    const { error } = await supabase.from("foods").update({ status: "Expired" }).eq("id", food.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setFoods((prev) => prev.map((f) => (f.id === food.id ? { ...f, status: "Expired" } : f)));
    toast({ title: "Marked as expired" });
  };

  const handleDeliveryStatus = async (deliveryId: string, status: "Assigned" | "PickedUp" | "Delivered" | "Cancelled") => {
    const { error } = await supabase.from("deliveries").update({ delivery_status: status, ...(status === "Delivered" ? { delivered_at: new Date().toISOString() } : {}) }).eq("id", deliveryId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (status === "Delivered") {
      const del = deliveries.find((d) => d.id === deliveryId);
      if (del) {
        await supabase.from("requests").update({ status: "Completed" }).eq("id", del.request_id);
        const req = requests.find((r) => r.id === del.request_id) ?? del.requests;
        if (req?.food_id) await supabase.from("foods").update({ status: "Collected" }).eq("id", req.food_id);
      }
    }
    toast({ title: `Status updated to ${status}` });
    setDeliveries((prev) => prev.map((d) => (d.id === deliveryId ? { ...d, delivery_status: status } : d)));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8 space-y-8">

        {/* ── Header (single, clean) ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Signed in as <span className="font-medium">{profile?.name ?? "User"}</span>
              {user?.email ? <span> • {user.email}</span> : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Role switcher */}
            {roles.length > 0 && roles.map((r) => (
              <Button
                key={r}
                type="button"
                variant={activeRole === r ? "default" : "outline"}
                size="sm"
                className="capitalize"
                onClick={() => setActiveRole(r as any)}
              >
                {r}
              </Button>
            ))}
            {/* Quick actions */}
            {(activeRole === "donor" || activeRole === "admin") && (
              <Button asChild size="sm">
                <Link to="/add-food"><Plus className="mr-1.5 h-4 w-4" /> Add Food</Link>
              </Button>
            )}
            {activeRole === "volunteer" && (
              <Button asChild size="sm" variant="outline">
                <Link to="/volunteer"><Truck className="mr-1.5 h-4 w-4" /> Volunteer Dashboard</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/food-map"><MapPin className="mr-1.5 h-4 w-4" /> Food Map</Link>
            </Button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-4 md:grid-cols-4">
          {(activeRole === "donor" || activeRole === "admin") && (
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <Utensils className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{foods.length}</p>
                  <p className="text-xs text-muted-foreground">Food Listings</p>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Users className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-2xl font-bold">{requests.length}</p>
                <p className="text-xs text-muted-foreground">Requests</p>
              </div>
            </CardContent>
          </Card>
          {(activeRole === "volunteer" || activeRole === "admin") && (
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <Truck className="h-8 w-8 text-info" />
                <div>
                  <p className="text-2xl font-bold">{deliveries.length}</p>
                  <p className="text-xs text-muted-foreground">Deliveries</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Donor: My Foods ── */}
        {(activeRole === "donor" || activeRole === "admin") && (
          <Card>
            <CardHeader><CardTitle className="font-display">My Food Listings</CardTitle></CardHeader>
            <CardContent>
              {foods.length === 0 ? (
                <p className="text-sm text-muted-foreground">No listings yet. <Link to="/add-food" className="text-primary underline">Add your first food listing</Link>.</p>
              ) : (
                <div className="space-y-4">
                  {foods.map((f) => (
                    <div key={f.id} className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold">{f.title}</h4>
                          {f.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{f.description}</p>}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {f.quantity && <span className="text-xs bg-muted px-2 py-0.5 rounded">{f.quantity}</span>}
                            <Badge className={statusColor[f.status] ?? ""}>{f.status}</Badge>
                            {f.expiry_time && <span className="text-xs text-muted-foreground">Expires {new Date(f.expiry_time).toLocaleDateString()}</span>}
                            {f.address && <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={f.address}>📍 {f.address}</span>}
                          </div>
                          <Link to="/food-map" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                            <MapPin className="h-3 w-3" /> View on map
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/edit-food/${f.id}`}><Pencil className="h-4 w-4 mr-1" /> Edit</Link>
                          </Button>
                          {(f.status === "Available" || f.status === "Reserved") && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkExpired(f)}>
                              <AlertCircle className="h-4 w-4 mr-1" /> Mark Expired
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => { setFoodToDelete(f); setDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete food listing?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove &quot;{foodToDelete?.title}&quot;. Any pending requests for this item will be affected. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteFood} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Donor: Incoming Requests ── */}
        {(activeRole === "donor" || activeRole === "admin") && (
          <Card>
            <CardHeader><CardTitle className="font-display">Incoming Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.filter((r) => r.status === "Pending").length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                <div className="space-y-3">
                  {requests.filter((r) => r.status === "Pending").map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium">{r.foods?.title ?? "Food item"}</p>
                        <p className="text-xs text-muted-foreground">Request #{r.id.slice(0, 8)} • From: {requesterProfiles[r.receiver_id]?.name ?? r.receiver_id?.slice(0, 8)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleRequestAction(r.id, "Accepted")}><Check className="h-4 w-4 mr-1" /> Accept</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleRequestAction(r.id, "Rejected")}><X className="h-4 w-4 mr-1" /> Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Receiver: My Requests ── */}
        {activeRole === "receiver" && (
          <Card>
            <CardHeader><CardTitle className="font-display">My Requests</CardTitle></CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requests yet. <Link to="/food-map" className="text-primary underline">Browse the food map</Link>.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2">Food</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Requested</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 font-medium">{r.foods?.title ?? "—"}</td>
                          <td className="py-2"><Badge className={statusColor[r.status] ?? ""}>{r.status}</Badge></td>
                          <td className="py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Volunteer: My Deliveries ── */}
        {(activeRole === "volunteer" || activeRole === "admin") && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display">My Deliveries</CardTitle>
              <Button size="sm" variant="outline" asChild>
                <Link to="/volunteer"><Truck className="h-4 w-4 mr-1" /> Full Volunteer View</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deliveries yet.</p>
              ) : (
                <div className="space-y-3">
                  {deliveries.map((d) => (
                    <div key={d.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{d.requests?.foods?.title ?? "Delivery"}</p>
                        <Badge className={statusColor[d.delivery_status] ?? ""}>{d.delivery_status}</Badge>
                      </div>
                      {d.requests?.foods?.address && (
                        <p className="text-xs text-muted-foreground">{d.requests.foods.address}</p>
                      )}
                      <div className="flex gap-2">
                        {d.delivery_status === "Assigned" && (
                          <Button size="sm" variant="outline" onClick={() => handleDeliveryStatus(d.id, "PickedUp")}>Mark Picked Up</Button>
                        )}
                        {d.delivery_status === "PickedUp" && (
                          <Button size="sm" onClick={() => handleDeliveryStatus(d.id, "Delivered")}>Mark Delivered</Button>
                        )}
                        {d.requests?.foods?.latitude && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${d.requests.foods.latitude},${d.requests.foods.longitude}`} target="_blank" rel="noopener noreferrer">
                              <MapPin className="h-4 w-4 mr-1" /> Navigate
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Volunteer: Available to claim ── */}
        {(activeRole === "volunteer" || activeRole === "admin") && (
          <Card>
            <CardHeader><CardTitle className="font-display">Available for Delivery</CardTitle></CardHeader>
            <CardContent>
              {availableForDelivery.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accepted requests available for delivery.</p>
              ) : (
                <div className="space-y-3">
                  {availableForDelivery.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                      <p className="font-medium">{r.foods?.title ?? "Food item"}</p>
                      <Button size="sm" onClick={() => handleClaimDelivery(r.id)}>
                        <Truck className="h-4 w-4 mr-1" /> Claim Delivery
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
