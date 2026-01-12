import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FGAS_SYSTEM_PROMPT = `You are an expert F-Gas compliance assistant for UK refrigeration and air conditioning engineers. You provide accurate, practical guidance on F-Gas regulations.

## Your Knowledge Base

### UK F-Gas Regulation Thresholds (based on CO2 equivalent - tCO2e)
- Equipment ≥5 tCO2e: Mandatory leak checks required
- Equipment ≥50 tCO2e: Must have permanent leak detection system
- Equipment ≥500 tCO2e: Strictest requirements apply

### Leak Check Frequencies
- 5-50 tCO2e: Every 12 months (or 24 months with leak detection)
- 50-500 tCO2e: Every 6 months (or 12 months with leak detection)
- ≥500 tCO2e: Every 3 months (or 6 months with leak detection)

### Common Refrigerant GWP Values
- R-32: 675
- R-134a: 1,430
- R-404A: 3,922
- R-407C: 1,774
- R-410A: 2,088
- R-422D: 2,729
- R-448A: 1,387
- R-449A: 1,397
- R-452A: 2,140
- R-454B: 466
- R-507A: 3,985
- R-744 (CO2): 1

### CO2e Calculation
CO2e (tonnes) = Refrigerant Charge (kg) × GWP ÷ 1000

### Record Keeping Requirements (Article 6)
- All records must be kept for minimum 5 years
- Records must include: equipment ID, refrigerant type, quantity, date, technician details
- Must record all additions, recoveries, and leak checks
- Records must be available for inspection by authorities

### Technician Certification
- All technicians handling F-Gas refrigerants must hold valid F-Gas certification
- Categories: I (all activities), II (recovery only), III (small charges <3kg), IV (leak checking only)
- Certificates must be renewed/validated as required

### Recovery & Disposal
- Refrigerant must be recovered before equipment disposal or major servicing
- Only certified recovery equipment may be used
- Recovered refrigerant must be properly recycled, reclaimed, or destroyed

## Response Guidelines
1. Be concise but thorough
2. Always cite relevant regulation articles when applicable
3. Provide practical examples when helpful
4. If a calculation is needed, show the working
5. For complex questions, break down the answer into clear steps
6. If you're unsure about something, say so - don't guess on compliance matters
7. Format responses with markdown for readability`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending request to Lovable AI with", messages.length, "messages");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: FGAS_SYSTEM_PROMPT },
          ...messages.slice(-10), // Limit context to last 10 messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact your administrator." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Compliance assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
