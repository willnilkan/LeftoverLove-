import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function MyFoods() {
  const { user, roles, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [foods, setFoods] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("foods")
      .select("*, food_images(path)")
      .eq("donor_id", user.id)
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setFoods(data ?? []);
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && user && !(roles.includes("donor") || roles.includes("admin"))) navigate("/dashboard");
    if (!authLoading && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const del = async (id: string) => {
    const { error } = await supabase.from("foods").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Deleted", description: "Food listing removed." });
    load();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="container py-8 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold">My foods</h1>
              <p className="text-muted-foreground">Manage your listings. Only you can edit/delete them.</p>
            </div>
            <Button asChild>
              <Link to="/add-food">Add food</Link>
            </Button>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {foods.map((f) => (
                <Card key={f.id} className="overflow-hidden">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                    <Badge variant="secondary">{f.status}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {((f.food_images?.length ?? 0) > 0 || f.primary_image_path) ? (
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
                    ) : (
                      <div className="h-40 w-full rounded-xl border bg-muted flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button asChild variant="outline" className="flex-1 gap-2">
                        <Link to={`/edit-food/${f.id}`}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Link>
                      </Button>
                      <Button variant="destructive" className="flex-1 gap-2" onClick={() => del(f.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {foods.length === 0 ? (
                <Card className="md:col-span-2 lg:col-span-3">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    You have no food listings yet. Click “Add food”.
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
