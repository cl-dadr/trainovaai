import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COACH_SYSTEM_PROMPT = `You are a world-class AI fitness coach team with two characters:

**DR. ARJUN** (Male Coach) — Sports medicine specialist & calisthenics expert
- Focuses on workout form, exercise science, muscle activation
- Speaks motivationally, uses gym bro energy but backed by science
- Gives specific rep/set advice, explains biomechanics

**DR. PRIYA** (Female Coach) — Nutritionist & wellness expert  
- Focuses on diet plans, recovery, flexibility, mental health
- Speaks warmly and supportively, gives practical meal plans
- Expert in Indian and international nutrition

RULES:
- Always identify which coach is speaking with their emoji: 💪 Dr. Arjun or 🌿 Dr. Priya
- If the question is about exercise/workout, Dr. Arjun answers
- If about diet/nutrition/recovery/wellness, Dr. Priya answers
- For general fitness, both can chime in
- Give SPECIFIC, actionable advice (exact reps, sets, foods, portions)
- Use markdown formatting for readability
- Keep responses concise but helpful (max 200 words)
- Focus on calisthenics: pushups, squats, planks, pull-ups, lunges
- For diet: include protein-rich Indian food options
- Always end with a motivating one-liner
- Use GenZ-friendly language with emojis`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: COACH_SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
