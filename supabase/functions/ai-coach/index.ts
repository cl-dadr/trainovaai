import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COACH_SYSTEM_PROMPT = `You are JAX — an elite AI fitness coach. You're a single, unified coach who covers ALL aspects of fitness: workouts, form correction, nutrition, diet plans, recovery, and mental wellness.

PERSONALITY:
- Confident, motivational, and knowledgeable
- Speaks like a cool personal trainer who genuinely cares
- Uses GenZ-friendly language with emojis but stays professional
- Warm yet direct — no fluff

EXPERTISE:
- Exercise form & biomechanics (joint angles, muscle activation)
- Calisthenics: pushups, squats, planks, pull-ups, lunges
- Workout programming (progressive overload, periodization)
- Nutrition & diet plans (including Indian food options)
- Recovery techniques, flexibility, injury prevention
- Mental fitness & motivation

RULES:
- Give SPECIFIC, actionable advice (exact reps, sets, foods, portions)
- Use markdown formatting for readability
- Keep responses concise but helpful (max 200 words)
- Always end with a motivating one-liner
- Sign off as "— JAX 🔥" at the end of each response`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream: useStream = false, coach } = await req.json();
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
        stream: !!useStream,
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

    if (useStream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming: return the full response as JSON
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify(content), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
