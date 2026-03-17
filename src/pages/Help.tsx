import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, HelpCircle, Mail, MessageSquare, BookOpen, Shield, Users, Wrench, FileText, ChevronRight, LifeBuoy } from "lucide-react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { FooterSection } from "@/components/landing/FooterSection";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer: "Click 'Get Started' on the homepage, choose your plan, and complete the checkout process. You'll then be prompted to set up your company details and invite team members."
  },
  {
    category: "Getting Started",
     question: "How do I add my first F-Gas system?",
     answer: "Navigate to Sites, create a site first, then go to F-Gas Systems and click 'Register System'. Fill in the system details including refrigerant type and charge weight."
   },
  {
    category: "Getting Started",
     question: "Can I import existing F-Gas system data?",
     answer: "Currently, systems must be added manually. Bulk import functionality is on our roadmap. Contact support if you have a large dataset to migrate."
   },
  {
    category: "Getting Started",
    question: "How do I invite team members?",
    answer: "Go to Team in the navigation, click 'Invite Member', enter their email and select their role. They'll receive an email invitation to join your company."
  },
  
  // Equipment & Inspections
   {
     category: "F-Gas Systems & Inspections",
     question: "How often do I need to perform leak checks?",
     answer: "Leak check frequency depends on the CO₂ equivalent of the system: 5-50 tCO₂e requires annual checks, 50-500 tCO₂e requires checks every 6 months, and above 500 tCO₂e requires quarterly checks. FTrack automatically calculates this and sets reminders."
   },
  {
     category: "F-Gas Systems & Inspections",
     question: "What happens when an inspection is due?",
     answer: "You'll see alerts in your dashboard and receive email notifications (if enabled). The system will be flagged as overdue if the inspection date passes without a recorded inspection."
   },
  {
     category: "F-Gas Systems & Inspections",
     question: "How do I record an inspection result?",
     answer: "Go to Inspections, click 'Add Inspection', select the system, and fill in the inspection details including result, any leaks found, and refrigerant added or recovered."
   },
  {
     category: "F-Gas Systems & Inspections",
     question: "Can I attach photos to inspections?",
     answer: "Yes! When recording an inspection, you can upload photos and documents. You can also add documents from the Documents section and link them to specific systems."
   },
  
  // Gas Logging
  {
    category: "Gas Logging",
    question: "How do I record a refrigerant top-up?",
    answer: "Go to Gas Log, click 'Add Movement', select 'Book Out' as the movement type, choose the cylinder and equipment, then enter the weight added. The cylinder stock is automatically updated."
  },
  {
    category: "Gas Logging",
    question: "How do I manage refrigerant cylinders?",
    answer: "In the Gas Log section, you can view and manage all your cylinders. Add new cylinders with their initial weight, track check-in/check-out to engineers, and monitor current stock levels."
  },
  {
    category: "Gas Logging",
    question: "What's the difference between book out, book in, and recovered?",
    answer: "Book Out: Refrigerant dispensed from a cylinder (e.g., top-up). Book In: Refrigerant returned to stock. Recovered: Refrigerant recovered from equipment into a recovery cylinder."
  },
  {
    category: "Gas Logging",
    question: "How do I track cylinder assignments to engineers?",
    answer: "Each cylinder can be checked out to an engineer. Go to Gas Log, find the cylinder, and use the check-out function. When the engineer returns it, check it back in."
  },
  
  // Compliance
  {
    category: "Compliance",
     question: "What reports are required for F-Gas regulations?",
     answer: "UK F-Gas regulations require records of: systems containing 5 tCO₂e or more, all leak checks performed, quantities of refrigerant added/recovered, and technician certifications. FTrack tracks all of this automatically."
   },
  {
    category: "Compliance",
    question: "How long must I keep F-Gas records?",
    answer: "Records must be kept for at least 5 years and made available to enforcement authorities on request. FTrack stores all your records securely in the cloud."
  },
  {
    category: "Compliance",
     question: "How do I generate a compliance report?",
     answer: "Go to Reports and select the report type you need. You can generate system registers, inspection histories, gas movement logs, and more. Reports can be exported as PDF."
   },
  {
    category: "Compliance",
    question: "What is the AI Compliance Assistant?",
    answer: "The AI Compliance Assistant can answer questions about F-Gas regulations, help you understand compliance requirements, and provide guidance on best practices. Access it via the chat button in the app."
  },
  
  // Account & Billing
  {
    category: "Account & Billing",
    question: "How do I add more user licenses?",
    answer: "Go to Settings > Licenses to manage your license count. You can increase or decrease licenses, and billing will be adjusted automatically."
  },
  {
    category: "Account & Billing",
     question: "What's included in each plan?",
     answer: "Solo: 1 user, 10 systems, basic features. Team: 5 users, 50 systems, full features. Business: Unlimited users and systems, priority support, API access. Visit our Pricing page for full details."
   },
  {
    category: "Account & Billing",
    question: "Can I change my plan?",
    answer: "Yes, you can upgrade or downgrade your plan at any time from Settings > Licenses. Changes take effect on your next billing cycle."
  },
  {
    category: "Account & Billing",
    question: "How do I update my payment method?",
    answer: "Go to Settings > Company, then click 'Manage Billing' to access the customer portal where you can update your payment method and view invoices."
  },
];

const categories = [
  { name: "Getting Started", icon: BookOpen, color: "text-blue-500" },
  { name: "F-Gas Systems & Inspections", icon: Wrench, color: "text-orange-500" },
  { name: "Gas Logging", icon: FileText, color: "text-green-500" },
  { name: "Compliance", icon: Shield, color: "text-purple-500" },
  { name: "Account & Billing", icon: Users, color: "text-pink-500" },
];

export default function Help() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFAQs = useMemo(() => {
    return faqData.filter((faq) => {
      const matchesSearch =
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory =
        selectedCategory === null || faq.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const groupedFAQs = useMemo(() => {
    const groups: Record<string, FAQItem[]> = {};
    filteredFAQs.forEach((faq) => {
      if (!groups[faq.category]) {
        groups[faq.category] = [];
      }
      groups[faq.category].push(faq);
    });
    return groups;
  }, [filteredFAQs]);

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      <main className="pt-24 pb-16">
        {/* Hero Section */}
        <section className="container mx-auto px-4 mb-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <HelpCircle className="w-4 h-4" />
              Help Center
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              How can we help you?
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Find answers to common questions about FTrack and F-Gas compliance
            </p>
            
            {/* Search */}
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg"
              />
            </div>
          </div>
        </section>

        {/* Category Cards */}
        <section className="container mx-auto px-4 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.name;
              return (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(isSelected ? null : category.name)}
                  className={`p-4 rounded-xl border text-center transition-all hover:shadow-md ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${category.color}`} />
                  <span className="text-sm font-medium">{category.name}</span>
                </button>
              );
            })}
          </div>
          {selectedCategory && (
            <div className="text-center mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Clear filter
              </Button>
            </div>
          )}
        </section>

        {/* FAQ Accordion */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            {Object.keys(groupedFAQs).length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or browse all categories
                  </p>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedFAQs).map(([category, faqs]) => (
                <div key={category} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    {categories.find((c) => c.name === category)?.icon && (
                      <span className={categories.find((c) => c.name === category)?.color}>
                        {(() => {
                          const Icon = categories.find((c) => c.name === category)?.icon;
                          return Icon ? <Icon className="w-5 h-5" /> : null;
                        })()}
                      </span>
                    )}
                    {category}
                  </h2>
                  <Accordion type="single" collapsible className="space-y-2">
                    {faqs.map((faq, index) => (
                      <AccordionItem
                        key={index}
                        value={`${category}-${index}`}
                        className="border rounded-lg px-4"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Contact Section */}
        <section className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Still need help?</CardTitle>
                <CardDescription>
                  Our support team is here to assist you with any questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <a
                    href="mailto:support@ftrack.uk"
                    className="flex items-center gap-4 p-4 rounded-lg border bg-background hover:shadow-md transition-shadow"
                  >
                    <div className="p-3 rounded-full bg-primary/10">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Email Support</h3>
                      <p className="text-sm text-muted-foreground">support@ftrack.uk</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                  </a>
                  <Link
                    to="/auth"
                    className="flex items-center gap-4 p-4 rounded-lg border bg-background hover:shadow-md transition-shadow"
                  >
                    <div className="p-3 rounded-full bg-primary/10">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">AI Assistant</h3>
                      <p className="text-sm text-muted-foreground">Get instant answers</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}
