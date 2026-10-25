const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
};

const maxMessageLength = 1000;
const maxMessages = 9;
const piiPatterns = [
    /\b(?:patient|client|resident)\b[\s\S]{0,80}\b(?:name|named|called|id|code|phone|contact|record|dob|date of birth|diagnosis|diagnosed|address|test result|medication|dose)\b/i,
    /\b(?:my|this|that)\s+patient\b/i,
    /\b(?:dob|date of birth|medical record number|health record number)\b/i,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    /(?:\+?63|0)[-\s]?9(?:[\s-]?\d){9}\b/,
    /\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/,
    /\bPT[-\s]?\d{4,}\b/i
];

const systemPrompt = `You are AI Moto, a helpful assistant for staff at a community health center.
Answer only general health-center workflow questions and general health-education questions.
Do not access, infer, request, or claim to know any clinic records or patient-specific information.
Do not diagnose, triage, recommend an individual treatment or medication dose, or interpret a person's symptoms or test results.
If asked for patient-specific medical advice, explain that you cannot provide it and recommend consulting a qualified health professional. For a possible emergency, advise contacting local emergency services immediately.
Never ask the user to provide names, IDs, contact information, dates of birth, diagnoses, or other identifying health information.
Be concise, use plain language, and distinguish general information from verified facts. Do not claim that you performed an action or checked the clinic database.`;

Deno.serve(async (request: Request) => {
    if (request.method === "OPTIONS") {
        const headers = new Headers(corsHeaders);
        const requestedHeaders = request.headers.get("Access-Control-Request-Headers");
        if (requestedHeaders) headers.set("Access-Control-Allow-Headers", requestedHeaders);
        headers.set("Vary", "Access-Control-Request-Headers");
        return new Response("ok", { headers });
    }
    if (request.method !== "POST") {
        return jsonResponse(405, { error: "Only POST requests are supported." });
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
        return jsonResponse(401, { error: "Sign in to use AI Moto." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error("AI Moto is missing Supabase authentication configuration.");
        return jsonResponse(503, { error: "AI Moto is not configured. Contact your administrator." });
    }

    try {
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                apikey: supabaseAnonKey,
                Authorization: authorization
            }
        });
        if (!authResponse.ok) {
            return jsonResponse(401, { error: "Your session is invalid or expired. Sign in again." });
        }
    } catch (error) {
        console.error("AI Moto could not verify the signed-in user:", error);
        return jsonResponse(503, { error: "Could not verify your session. Please try again." });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse(400, { error: "Request body must be valid JSON." });
    }

    if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages)) {
        return jsonResponse(400, { error: "Enter a general question to continue." });
    }
    const messages = body.messages as unknown[];
    if (messages.length === 0 || messages.length > maxMessages) {
        return jsonResponse(400, { error: "Start a new chat or shorten the conversation before trying again." });
    }
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
    let totalLength = 0;
    for (let index = 0; index < messages.length; index++) {
        const item = messages[index];
        if (!item || typeof item !== "object" || !("role" in item) || !("text" in item) ||
            (item.role !== "user" && item.role !== "model") || typeof item.text !== "string") {
            return jsonResponse(400, { error: "Conversation format is invalid. Clear the chat and try again." });
        }
        const text = item.text.trim();
        const expectedRole = index % 2 === 0 ? "user" : "model";
        if (!text || text.length > maxMessageLength || item.role !== expectedRole) {
            return jsonResponse(400, { error: "Conversation is too long or out of order. Clear the chat and try again." });
        }
        totalLength += text.length;
        if (totalLength > 6000) {
            return jsonResponse(400, { error: "Conversation is too long. Clear the chat and start a new question." });
        }
        if (piiPatterns.some((pattern) => pattern.test(text))) {
            return jsonResponse(400, {
                error: "This looks like it may contain personal or patient information. Clear the chat, remove identifying details, and ask a general question instead."
            });
        }
        contents.push({ role: item.role, parts: [{ text }] });
    }
    if (contents[contents.length - 1].role !== "user") {
        return jsonResponse(400, {
            error: "Your latest message must be a general question."
        });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
        console.error("AI Moto is missing the GEMINI_API_KEY secret.");
        return jsonResponse(503, { error: "Gemini is not configured. Add the server-side API key and try again." });
    }

    const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
    if (!/^[a-zA-Z0-9.-]{1,80}$/.test(model)) {
        console.error("AI Moto has an invalid GEMINI_MODEL secret.");
        return jsonResponse(503, { error: "Gemini is incorrectly configured. Contact your administrator." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    contents,
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 256,
                        thinkingConfig: { thinkingLevel: "LOW" }
                    }
                }),
                signal: controller.signal
            }
        );

        if (!geminiResponse.ok) {
            console.error("Gemini request failed with HTTP status:", geminiResponse.status);
            if (geminiResponse.status === 429) {
                return jsonResponse(429, { error: "Gemini's free usage limit was reached. Wait a little and try again." });
            }
            return jsonResponse(502, { error: "Gemini could not answer right now. Please try again later." });
        }

        const result = await geminiResponse.json();
        const reply = result?.candidates?.[0]?.content?.parts
            ?.map((part: { text?: unknown }) => typeof part.text === "string" ? part.text : "")
            .join("")
            .trim();
        if (!reply) {
            return jsonResponse(502, { error: "Gemini returned no answer. Rephrase the question and try again." });
        }
        return jsonResponse(200, { reply });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            console.warn(`Gemini request timed out for model ${model}.`);
            return jsonResponse(504, { error: "Gemini took too long to respond. Please try again." });
        }
        console.error("AI Moto could not reach Gemini:", error);
        return jsonResponse(502, { error: "Could not reach Gemini. Check the function configuration and try again." });
    } finally {
        clearTimeout(timeout);
    }
});

function jsonResponse(status: number, body: Record<string, string>): Response {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
