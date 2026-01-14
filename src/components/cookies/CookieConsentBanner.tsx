import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCookieConsent } from '@/hooks/useCookieConsent';

export function CookieConsentBanner() {
  const { showBanner, acceptAll, rejectNonEssential, savePreferences } = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferencesEnabled, setPreferencesEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  if (!showBanner) return null;

  const handleSaveCustomPreferences = () => {
    savePreferences({
      preferences: preferencesEnabled,
      analytics: analyticsEnabled,
    });
    setShowCustomize(false);
  };

  return (
    <>
      {/* Main Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-in">
        <div className="mx-auto max-w-7xl p-4">
          <div className="rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-start gap-4">
                {/* Cookie Icon */}
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Cookie className="h-6 w-6 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Cookie className="h-5 w-5 text-primary sm:hidden" />
                    <h3 className="font-semibold text-foreground">Cookie Preferences</h3>
                  </div>
                  
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We use cookies to enhance your experience. Essential cookies are required for 
                    the platform to function properly. You can choose to accept or reject optional 
                    cookies for preferences and analytics.{' '}
                    <Link 
                      to="/privacy#cookies" 
                      className="text-primary hover:underline font-medium"
                    >
                      Learn more in our Privacy Policy
                    </Link>
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={rejectNonEssential}
                      className="order-3 sm:order-1"
                    >
                      Reject Non-Essential
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCustomize(true)}
                      className="order-2 gap-2"
                    >
                      <Settings2 className="h-4 w-4" />
                      Customize
                    </Button>
                    <Button
                      size="sm"
                      onClick={acceptAll}
                      className="order-1 sm:order-3"
                    >
                      Accept All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Settings
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies cannot be disabled as they are 
              required for the platform to function.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies - Always On */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 bg-muted/30">
              <div className="space-y-1">
                <Label className="font-medium">Essential Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Required for authentication, security, and core functionality.
                </p>
              </div>
              <Switch checked disabled className="data-[state=checked]:bg-primary" />
            </div>

            {/* Preference Cookies */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <Label htmlFor="preferences" className="font-medium">Preference Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Remember your settings like theme and sidebar preferences.
                </p>
              </div>
              <Switch
                id="preferences"
                checked={preferencesEnabled}
                onCheckedChange={setPreferencesEnabled}
              />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
              <div className="space-y-1">
                <Label htmlFor="analytics" className="font-medium">Analytics Cookies</Label>
                <p className="text-xs text-muted-foreground">
                  Help us understand how you use the platform to improve it.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomize(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCustomPreferences}
              className="w-full sm:w-auto"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
