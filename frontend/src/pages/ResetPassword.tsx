import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── Extract token from URL hash and set session ─────────────────────────────
  useEffect(() => {
    const initSession = async () => {
      // Check if a session already exists (e.g. user is already logged in)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // Parse #access_token=...&type=recovery from the URL
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token") ?? "";
        const type = params.get("type");

        if (access_token && type === "recovery") {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) {
            setSessionError("Reset link is invalid or has expired. Please request a new one.");
            return;
          }
          // Clean up the URL so the token isn't visible
          window.history.replaceState(null, "", window.location.pathname);
          setSessionReady(true);
          return;
        }
      }

      // No token found at all
      setSessionError("No reset token found. Please use the link from your email.");
    };

    initSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      toast({
        title: "Couldn't update password",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Password updated!",
      description: "You can now sign in with your new password.",
    });

    // Sign out so user logs in fresh with the new password
    await supabase.auth.signOut();
    navigate("/login");
  };

  // ── Session error state ─────────────────────────────────────────────────────
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-display text-destructive">Link expired</CardTitle>
            <CardDescription>{sessionError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/login")}>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Loading session ─────────────────────────────────────────────────────────
  if (!sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display">Set a new password</CardTitle>
          <CardDescription>Choose a new password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
