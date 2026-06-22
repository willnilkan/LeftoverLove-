import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Heart, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthSlider from "@/components/ui/AuthSlider";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter your name.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name }, // roles are assigned automatically in DB trigger (donor + receiver)
      },
    });
    setLoading(false);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Check your email",
      description: "We sent you a verification link. Please confirm your email to sign in.",
    });
    navigate("/login");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Branding / slider panel */}
      <div className="hidden md:flex relative h-full">
        <AuthSlider />
        <div className="absolute inset-0 p-10 flex flex-col justify-between text-primary-foreground bg-black/30">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <img src="/assets/LeftoverLove.png" alt="Logo" className="h-6 w-6 object-contain block" />  
            </span>
            <div>
              <p className="text-2xl font-display font-bold leading-tight text-white">LeftoverLove</p>
              <p className="text-sm opacity-90 text-white/90">Donate & receive food with dignity</p>
            </div>
          </div>

          <div className="space-y-3 text-white">
            <p className="text-lg font-semibold">One account. Two modes.</p>
            <p className="text-sm opacity-90 max-w-md">
              Every account can act as a <span className="font-semibold">Donor</span> and a <span className="font-semibold">Receiver</span>.
              After you sign in, you can switch modes anytime from the dashboard/navbar.
            </p>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Create account</CardTitle>
            <CardDescription>Sign up to donate and receive food.</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    type={showPw ? "text" : "password"}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => setShowPw((s) => !s)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create account
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
