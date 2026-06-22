import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, Heart, LogIn, UserPlus, LayoutDashboard, MapPin, PlusCircle, User, Bell, List, ClipboardList, Shield, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { label: string; href: string; icon?: any; show?: boolean };

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, roles, activeRole, setActiveRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [unread, setUnread] = useState(0);

  const canDonor = roles.includes("donor") || roles.includes("admin");
  const canReceiver = roles.includes("receiver") || roles.includes("admin");
  const isAdmin = roles.includes("admin");

  // Keep UI "mode" focused on donor/receiver for normal users
  useEffect(() => {
    if (!user) return;
    if (!activeRole) return;
    if (activeRole === "volunteer") return; // allow if user has it
    if (activeRole === "admin") return;
    // If somehow role is not donor/receiver, fall back
    if (activeRole !== "donor" && activeRole !== "receiver") {
      if (canDonor) setActiveRole("donor");
      else if (canReceiver) setActiveRole("receiver");
    }
  }, [user, activeRole, canDonor, canReceiver, setActiveRole]);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false)
        .eq("user_id", user.id);

      if (!cancelled) setUnread(count ?? 0);
    };
    load();

    // lightweight realtime-ish refresh on route changes
    // (for full realtime, use supabase channels)
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  const publicLinks: NavItem[] = [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "FAQ", href: "/#faq" },
    { label: "Browse Foods", href: "/foods", icon: List },
    { label: "Food Map", href: "/food-map", icon: MapPin },
  ];

  const authedLinks: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, show: true },
    { label: "Browse Foods", href: "/foods", icon: List, show: true },
    { label: "Food Map", href: "/food-map", icon: MapPin, show: true },

    { label: "Add Food", href: "/add-food", icon: PlusCircle, show: canDonor && (activeRole === "donor" || isAdmin) },
    { label: "My Foods", href: "/my-foods", icon: ClipboardList, show: canDonor && (activeRole === "donor" || isAdmin) },
    { label: "Requests", href: "/donor-requests", icon: ClipboardList, show: canDonor && (activeRole === "donor" || isAdmin) },

    { label: "My Requests", href: "/my-requests", icon: ClipboardList, show: canReceiver && (activeRole === "receiver" || isAdmin) },

    { label: "Admin", href: "/admin", icon: Shield, show: isAdmin },
  ].filter((l) => l.show !== false);

  const links = user ? authedLinks : publicLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const UserMenu = () => {
    if (!user) return null;

    const initial = (user.email && user.email[0]) ? user.email[0].toUpperCase() : "U";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full p-0">
            <Avatar>
              {/* If you have an avatar image URL, put it in AvatarImage src prop */}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="text-sm font-medium">{user.email}</div>
          </DropdownMenuLabel>

          <DropdownMenuItem onSelect={() => navigate("/profile")}>Profile</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setActiveRole("donor")}>Donor Mode</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActiveRole("receiver")}>Receiver Mode</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              handleSignOut();
            }}
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    const isDark = theme === "dark" || (theme === "system" && document.documentElement.classList.contains("dark"));

    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    );
  };

  const ModeButtons = () => {
    if (!user) return null;
    // Show only donor/receiver toggle for clarity (admins can still access admin page)
    const showToggle = canDonor && canReceiver;
    if (!showToggle) return null;

   
  };

  const NotificationButton = () => {
    if (!user) return null;
    return (
      <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/notifications")}>
        <Bell className="h-4 w-4" />
        <span className="hidden lg:inline"></span>
        {unread > 0 ? <Badge variant="destructive">{unread}</Badge> : null}
      </Button>
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="container flex items-center justify-between py-3">
        <Link to="/" className="flex items-center gap-3 font-display font-bold text-xl leading-none">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden">
            <img src="/assets/LeftoverLove.png" alt="Logo" className="h-12 w-12 object-contain block" />
          </span>
          <span className="align-middle">LeftoverLove</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-4">
          {links.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm" className="gap-2">
              <Link to={l.href}>
                {l.icon ? <l.icon className="h-4 w-4" /> : null}
                {l.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <ModeButtons />
          <NotificationButton />
          <ThemeToggle />

          {!user ? (
            <>
              <Button variant="ghost" onClick={() => navigate("/login")} className="gap-2">
                <LogIn className="h-4 w-4" /> Login
              </Button>
              <Button onClick={() => navigate("/register")} className="gap-2">
                <UserPlus className="h-4 w-4" /> Register
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <UserMenu />
            </div>
          )}
        </div>

        {/* Mobile */}
        <Button className="md:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen((s) => !s)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container py-4 space-y-2">
            {user ? (
              <>
                <ModeButtons />
                <NotificationButton />
              </>
            ) : null}

            {links.map((l) => (
              <Button
                key={l.href}
                asChild
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => setMobileOpen(false)}
              >
                <Link to={l.href}>
                  {l.icon ? <l.icon className="h-4 w-4" /> : null}
                  {l.label}
                </Link>
              </Button>
            ))}

            {!user ? (
              <div className="pt-2 flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => navigate("/login")}>
                  Login
                </Button>
                <Button className="flex-1" onClick={() => navigate("/register")}>
                  Register
                </Button>
              </div>
            ) : (
              <Button className="w-full" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
