const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
};

const staffRoles = new Set([
    "Health Worker",
    "Nurse",
    "Midwife",
    "Records Staff",
    "Inventory Staff"
]);

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
    if (!authorization?.startsWith("Bearer ")) {
        return jsonResponse(401, { error: "Sign in with an administrator account to invite staff." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error("Staff invitation is missing Supabase server configuration.");
        return jsonResponse(503, { error: "Staff invitations are not configured. Contact the Supabase project owner." });
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 4096) {
        return jsonResponse(413, { error: "Invitation request is too large." });
    }

    let caller: Record<string, unknown>;
    try {
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                apikey: anonKey,
                Authorization: authorization
            }
        });
        if (!authResponse.ok) {
            return jsonResponse(401, { error: "Your session is invalid or expired. Sign in again." });
        }
        caller = await authResponse.json();
    } catch (error) {
        console.error("Could not validate staff invitation caller:", error);
        return jsonResponse(503, { error: "Could not verify your session. Please try again." });
    }

    if (!hasAdminAppMetadata(caller.app_metadata)) {
        return jsonResponse(403, {
            error: "Only an administrator authorized in Supabase app metadata can invite staff. Ask the project owner to grant administrator access."
        });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse(400, { error: "Request body must be valid JSON." });
    }
    if (!body || typeof body !== "object") {
        return jsonResponse(400, { error: "Enter the staff member's name, email, and designation." });
    }

    const fullName = "fullName" in body && typeof body.fullName === "string" ? body.fullName.trim() : "";
    const email = "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = "role" in body && typeof body.role === "string" ? body.role : "";
    if (!fullName || fullName.length > 100 || /[\u0000-\u001f\u007f]/.test(fullName)) {
        return jsonResponse(400, { error: "Enter a staff name of 1 to 100 characters without control characters." });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse(400, { error: "Enter a valid work email address." });
    }
    if (!staffRoles.has(role)) {
        return jsonResponse(400, { error: "Choose a valid staff designation." });
    }

    try {
        const inviteResponse = await fetch(`${supabaseUrl}/auth/v1/invite`, {
            method: "POST",
            headers: {
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                data: {
                    full_name: fullName,
                    role
                }
            })
        });
        if (!inviteResponse.ok) {
            console.error("Supabase staff invitation failed with HTTP status:", inviteResponse.status);
            if (inviteResponse.status === 422) {
                return jsonResponse(409, { error: "This email may already belong to an account or have a pending invitation. Check Supabase Auth users." });
            }
            if (inviteResponse.status === 429) {
                return jsonResponse(429, { error: "Too many invitations were sent recently. Wait and try again." });
            }
            return jsonResponse(502, { error: "Supabase could not send the invitation. Check the project's email/SMTP configuration and function logs." });
        }

        return jsonResponse(200, { invited: true, email, fullName, role });
    } catch (error) {
        console.error("Could not reach Supabase Auth to invite staff:", error);
        return jsonResponse(502, { error: "Could not reach Supabase Auth. Please try again." });
    }
});

function hasAdminAppMetadata(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    const metadata = value as Record<string, unknown>;
    const role = typeof metadata.role === "string" ? metadata.role.toLowerCase() : "";
    const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
    return metadata.staff_admin === true ||
        role === "admin" ||
        role === "administrator" ||
        roles.some((item) => typeof item === "string" && ["admin", "administrator"].includes(item.toLowerCase()));
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
