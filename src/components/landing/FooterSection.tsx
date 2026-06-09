import { Link } from "react-router-dom";

export function FooterSection() {
  return (
    <footer className="py-12 bg-muted/50 border-t">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src="/favicon.png" 
                alt="FTrack Logo" 
                className="w-10 h-10 rounded-xl"
              />
              <span className="text-xl font-bold">FTrack</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              The complete F-Gas compliance management platform for UK HVAC professionals.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="#features"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Features
                </a>
              </li>
              <li>
                <a 
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a 
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  How It Works
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                  Help & FAQ
                </Link>
              </li>
              <li>
                <a href="mailto:hello@build-iq.co.uk" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="mailto:hello@build-iq.co.uk" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sales Enquiries
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Build IQ Tech Ltd. All rights reserved.</p>
          <p className="mt-1">Company No. 15883295 | Registered in England and Wales</p>
          <p className="mt-1">4th Floor, Silverstream House, 45 Fitzroy Street, Fitzrovia, London, W1T 6EB, United Kingdom</p>
        </div>
      </div>
    </footer>
  );
}
