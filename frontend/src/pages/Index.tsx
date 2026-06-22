import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Heart,
  HandHeart,
  MapPin,
  Truck,
  Utensils,
  Leaf,
  ArrowRight,
  Shield,
  Zap,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/* ───── Page ───── */
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-24 md:py-36">
        <div className="container text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Leaf className="h-4 w-4" /> Fighting food waste together
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold leading-tight text-foreground text-balance">
            Rescue Food.<br />Feed Communities.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Connect surplus food with people who need it. Whether you're donating, receiving, or delivering — every meal matters.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button size="lg" asChild>
              <Link to="/register">
                <HandHeart className="mr-2 h-5 w-5" /> Donate Food
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/food-map">
                <MapPin className="mr-2 h-5 w-5" /> Find Food
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                <Truck className="mr-2 h-5 w-5" /> Volunteer
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-background">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            How It Works
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            Three simple steps to rescue food and feed communities.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: HandHeart, title: "1. Donors Share", desc: "List surplus food with title, quantity, expiry, and pickup location. Search or use your GPS to set the address.", color: "text-primary" },
              { icon: Utensils, title: "2. Receivers Request", desc: "Browse the map, filter by distance, and request food you need. Donors review and accept or reject requests.", color: "text-secondary" },
              { icon: Truck, title: "3. Volunteers Deliver", desc: "Claim accepted deliveries, pick up food, and drop it off. Update status as you go—assigned, picked up, delivered.", color: "text-info" },
            ].map((item) => (
              <Card key={item.title} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <item.icon className={`h-7 w-7 ${item.color}`} />
                  </div>
                  <h3 className="text-lg font-bold font-display">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why LeftoverLove ── */}
      <section className="py-20 bg-muted/30">
        <div className="container max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Why LeftoverLove?
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
            A simple platform built to connect surplus food with people who need it.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: MapPin, title: "Interactive Map", desc: "Browse available food near you. Search by address or use your current location to find donations in your area.", color: "text-primary" },
              { icon: Shield, title: "Safe & Simple", desc: "Free for everyone. Donors list food with expiry details. Receivers request. Volunteers deliver. No middleman.", color: "text-secondary" },
              { icon: Zap, title: "Easy to Use", desc: "Sign up in minutes. Add listings, request food, or claim deliveries. Works on desktop and mobile.", color: "text-info" },
            ].map((item) => (
              <Card key={item.title} className="border-0 shadow-sm hover:shadow-md transition-shadow bg-background">
                <CardContent className="p-6 space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <h3 className="font-semibold font-display">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 bg-background">
        <div className="container max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-center text-muted-foreground mb-12">Common questions about how the platform works.</p>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "Is it free to use?", a: "Yes. LeftoverLove is free for donors, receivers, and volunteers." },
              { q: "How do I know the food is safe?", a: "Listings include expiry information. Donors list food that is safe to consume within the stated timeframe." },
              { q: "Can organizations sign up?", a: "Yes. Restaurants, grocery stores, food banks, and community groups are welcome." },
              { q: "How does delivery work?", a: "After a donor accepts a request, volunteers can claim the delivery, pick up the food, and deliver it to the receiver." },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-sans font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 text-primary-foreground">
        <div className="container text-center max-w-2xl mx-auto space-y-6">
          <img src="/assets/LeftoverLove.png" alt="Logo" className="h-12 w-12 object-contain block mx-auto" />
          <h2 className="text-3xl md:text-4xl font-display font-bold text-primary">
            Ready to Make a Difference?
          </h2>
          <p className="text-primary text-lg">
            Sign up as a donor, receiver, or volunteer. Every meal shared helps reduce waste and feed communities.
          </p>
          <Button size="lg" variant="secondary" asChild className="text-base px-8">
            <Link to="/register">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
