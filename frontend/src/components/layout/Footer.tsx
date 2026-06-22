import { Heart } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-card/50">
    <div className="container py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <img src="/assets/LeftoverLove.png" alt="Logo" className="h-10 w-10 object-contain block" />
            <span className="text-lg font-bold font-display">LeftoverLove</span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Connect LeftoverLove food with people who need it. Reduce waste, feed communities.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Get Started</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/register" className="hover:text-foreground transition-colors">Register</Link></li>
            <li><Link to="/login" className="hover:text-foreground transition-colors">Login</Link></li>
            <li><Link to="/food-map" className="hover:text-foreground transition-colors">Browse Food Map</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Learn</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
            <li><Link to="/#faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Connect</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link></li>
            <li><Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} LeftoverLove. Fighting food waste, one meal at a time.
      </div>
    </div>
  </footer>
);

export default Footer;
