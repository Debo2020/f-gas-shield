import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <img 
            src="/favicon.png" 
            alt="FTrack Logo" 
            className="w-10 h-10 rounded-xl"
          />
          <span className="text-xl font-bold text-foreground">FTrack</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/#features" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Features
          </Link>
          <Link 
            to="/#pricing" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Pricing
          </Link>
          <Link 
            to="/#how-it-works" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            How It Works
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button onClick={() => navigate("/onboarding")}>
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}
