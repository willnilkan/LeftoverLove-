import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, roles, activeRole, setActiveRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setProfile(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name, phone }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed" });
      setNewPassword("");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-8 max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-display font-bold">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-3">
              Profile Info
              {roles.length > 0 && (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="secondary">Mode:</Badge>
    <div className="flex gap-2 flex-wrap">
      {roles.map((r) => (
        <Button
          key={r}
          type="button"
          variant={activeRole === r ? "default" : "outline"}
          size="sm"
          className="capitalize"
          onClick={() => setActiveRole(r)}
        >
          {r}
        </Button>
      ))}
    </div>
  </div>
)}
              {profile?.is_active !== undefined && (
                <Badge className={profile.is_active ? "bg-success text-primary-foreground" : "bg-destructive text-destructive-foreground"}>
                  {profile.is_active ? "Active" : "Inactive"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">Change Password</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button onClick={handlePasswordChange} disabled={changingPw} variant="outline">
              {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;