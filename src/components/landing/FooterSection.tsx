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
                <Link to="/#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="mailto:support@ftrack.uk" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact Support
                </a>
              </li>
              <li>
                <a href="mailto:sales@ftrack.uk" className="text-muted-foreground hover:text-foreground transition-colors">
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
          <p>© {new Date().getFullYear()} FTrack. All rights reserved.</p>
          <p className="mt-1">Built for UK F-Gas Regulation Compliance</p>
        </div>
      </div>
    </footer>
  );
}
