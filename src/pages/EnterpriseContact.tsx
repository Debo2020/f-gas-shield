import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Building2, 
  Check, 
  Loader2, 
  Phone, 
  Shield, 
  Users, 
  Zap,
  Server,
  Plug,
  Headphones,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const enterpriseContactSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
  contactName: z.string().trim().min(1, "Contact name is required").max(100, "Contact name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(10, "Please enter a valid phone number").max(20, "Phone number too long"),
  numberOfSites: z.coerce.number().min(1, "At least 1 site required").max(10000, "Please contact us directly for very large deployments"),
  numberOfEngineers: z.coerce.number().min(1, "At least 1 engineer required").max(10000, "Please contact us directly for very large teams"),
  preferredCallbackTime: z.string().optional(),
  integrationInterests: z.array(z.string()).optional(),
  additionalNotes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
});

type EnterpriseContactFormValues = z.infer<typeof enterpriseContactSchema>;

const integrationOptions = [
  { id: "bms-trend", label: "BMS - Trend" },
  { id: "bms-honeywell", label: "BMS - Honeywell" },
  { id: "bms-siemens", label: "BMS - Siemens" },
  { id: "erp-sap", label: "ERP - SAP" },
  { id: "erp-oracle", label: "ERP - Oracle" },
  { id: "erp-sage", label: "ERP - Sage" },
  { id: "custom-branding", label: "Custom Branding / White-label" },
  { id: "volume-licensing", label: "Volume Licensing" },
];

const callbackTimeOptions = [
  { value: "morning", label: "Morning (9am - 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 5pm)" },
  { value: "evening", label: "Evening (5pm - 7pm)" },
  { value: "any", label: "Any time" },
];

const benefits = [
  { icon: Server, title: "BMS Integration", description: "Trend, Honeywell, Siemens connectivity" },
  { icon: Plug, title: "ERP Connectivity", description: "SAP, Oracle, Sage integration" },
  { icon: Shield, title: "SLA Guarantee", description: "99.9% uptime commitment" },
  { icon: Headphones, title: "Dedicated Support", description: "Personal account manager" },
  { icon: GraduationCap, title: "On-site Training", description: "Comprehensive onboarding" },
  { icon: Building2, title: "White-label", description: "Custom branding options" },
];

export default function EnterpriseContact() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<EnterpriseContactFormValues>({
    resolver: zodResolver(enterpriseContactSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      numberOfSites: undefined,
      numberOfEngineers: undefined,
      preferredCallbackTime: "",
      integrationInterests: [],
      additionalNotes: "",
    },
  });

  const onSubmit = async (data: EnterpriseContactFormValues) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("enterprise-contact", {
        body: data,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Thank you for your inquiry!", {
        description: "Our team will contact you within 24 business hours.",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit inquiry", {
        description: "Please try again or email us directly at sales@ftrack.uk",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="h-20 w-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-accent" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Thank You!</h1>
            <p className="text-lg text-muted-foreground mb-8">
              We've received your enterprise inquiry. Our sales team will contact you within 24 business hours to discuss your requirements.
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate("/pricing")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Pricing
              </Button>
              <Button onClick={() => navigate("/")}>
                Go to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/ftrack-logo.png" 
              alt="F-Gas Comply" 
              className="h-8 w-auto"
            />
          </Link>
          <Button variant="ghost" onClick={() => navigate("/pricing")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pricing
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Enterprise Solutions
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get a tailored F-Gas compliance solution for your organisation with BMS & ERP integrations, dedicated support, and volume licensing.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form - Takes 3 columns */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Request a Call-back
                  </CardTitle>
                  <CardDescription>
                    Fill in your details and our enterprise team will contact you within 24 business hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Company & Contact Info */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Acme Refrigeration Ltd" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Your Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John Smith" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@acme.co.uk" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+44 7700 900000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Organisation Size */}
                      <div className="grid sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="numberOfSites"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Sites *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="e.g. 50" 
                                  min={1}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="numberOfEngineers"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Engineers *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="e.g. 25" 
                                  min={1}
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Preferred Callback Time */}
                      <FormField
                        control={form.control}
                        name="preferredCallbackTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Callback Time</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a time slot" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {callbackTimeOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Integration Interests */}
                      <FormField
                        control={form.control}
                        name="integrationInterests"
                        render={() => (
                          <FormItem>
                            <FormLabel>Integration Interests</FormLabel>
                            <div className="grid sm:grid-cols-2 gap-3 mt-2">
                              {integrationOptions.map((option) => (
                                <FormField
                                  key={option.id}
                                  control={form.control}
                                  name="integrationInterests"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(option.id)}
                                          onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            if (checked) {
                                              field.onChange([...current, option.id]);
                                            } else {
                                              field.onChange(current.filter((v) => v !== option.id));
                                            }
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {option.label}
                                      </FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Additional Notes */}
                      <FormField
                        control={form.control}
                        name="additionalNotes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Requirements</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell us about any specific requirements, existing systems, or challenges you're facing..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Phone className="h-4 w-4 mr-2" />
                            Request Call-back
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Benefits Sidebar - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Enterprise Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <benefit.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{benefit.title}</h4>
                        <p className="text-sm text-muted-foreground">{benefit.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <Users className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium">Volume Discounts</h4>
                      <p className="text-sm text-muted-foreground">Available for 50+ users</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Our enterprise pricing scales with your team size. The more engineers you have, the better the per-user rate.
                  </p>
                </CardContent>
              </Card>

              <div className="text-center text-sm text-muted-foreground">
                <p>Prefer to email directly?</p>
                <a 
                  href="mailto:hello@build-iq.co.uk" 
                  className="text-primary hover:underline"
>
                  hello@build-iq.co.uk
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
