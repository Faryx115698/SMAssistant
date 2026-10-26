const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
};

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
        return jsonResponse(401, { error: "Sign in with an administrator account to invite a patient." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error("Patient invitations are missing Supabase server configuration.");
        return jsonResponse(503, { error: "Patient invitations are not configured. Contact the Supabase project owner." });
    }

    let caller: Record<string, unknown>;
    try {
        const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: { apikey: anonKey, Authorization: authorization }
        });
        if (!authResponse.ok) {
            return jsonResponse(401, { error: "Your session is invalid or expired. Sign in again." });
        }
        caller = await authResponse.json();
    } catch (error) {
        console.error("Could not validate patient invitation caller:", error);
        return jsonResponse(503, { error: "Could not verify your session. Please try again." });
    }

    if (!hasAdminAppMetadata(caller.app_metadata)) {
        return jsonResponse(403, { error: "Only an administrator authorized in Supabase app metadata can invite patients." });
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > 4096) {
        return jsonResponse(413, { error: "Invitation request is too large." });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return jsonResponse(400, { error: "Request body must be valid JSON." });
    }
    if (!body || typeof body !== "object") {
        return jsonResponse(400, { error: "Patient ID, email, birth date, and setup redirect are required." });
    }

    const patientId = "patientId" in body && typeof body.patientId === "number" ? body.patientId : 0;
    const email = "email" in body && typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const birthDate = "birthDate" in body && typeof body.birthDate === "string" ? body.birthDate : "";
    const redirectTo = "redirectTo" in body && typeof body.redirectTo === "string" ? body.redirectTo : "";
    if (!Number.isSafeInteger(patientId) || patientId < 1) {
        return jsonResponse(400, { error: "The patient record ID is invalid." });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse(400, { error: "Enter a valid patient email address." });
    }
    const parsedBirthDate = new Date(`${birthDate}T00:00:00Z`);
    const clinicDateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());
    const clinicToday = `${clinicDateParts.find((part) => part.type === "year")?.value}-${clinicDateParts.find((part) => part.type === "month")?.value}-${clinicDateParts.find((part) => part.type === "day")?.value}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) ||
        Number.isNaN(parsedBirthDate.getTime()) ||
        parsedBirthDate.toISOString().slice(0, 10) !== birthDate ||
        birthDate > clinicToday) {
        return jsonResponse(400, { error: "Enter a valid patient date of birth." });
    }

    const origin = request.headers.get("Origin");
    let setupRedirect: URL;
    try {
        if (!origin) throw new Error("Missing origin");
        const originUrl = new URL(origin);
        setupRedirect = new URL(redirectTo);
        if (setupRedirect.origin !== originUrl.origin ||
            !setupRedirect.pathname.endsWith("/login.html") ||
            setupRedirect.searchParams.get("auth") !== "setup" ||
            setupRedirect.hash ||
            (originUrl.protocol !== "https:" &&
                !(originUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(originUrl.hostname)))) {
            throw new Error("Invalid redirect");
        }
    } catch {
        return jsonResponse(400, { error: "The patient password-setup redirect is invalid. Open the registration page from the configured website and try again." });
    }

    const adminHeaders = {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
    };
    try {
        const patientQuery = new URL(`${supabaseUrl}/rest/v1/patients`);
        patientQuery.searchParams.set("id", `eq.${patientId}`);
        patientQuery.searchParams.set("select", "id,email,birth_date,portal_invited_at,first_name,middle_name,last_name,suffix");
        const patientResponse = await fetch(patientQuery, { headers: adminHeaders });
        if (!patientResponse.ok) {
            console.error("Could not verify the patient record for invitation. HTTP status:", patientResponse.status);
            return jsonResponse(503, { error: "Could not verify the patient record. Check that patient-portal-migration.sql has been applied." });
        }
        const patients = await patientResponse.json();
        if (!Array.isArray(patients) || patients.length !== 1) {
            return jsonResponse(404, { error: "The patient record could not be found. Save the patient record and try again." });
        }

        const patient = patients[0];
        if (!patient.email || patient.email.trim().toLowerCase() !== email || patient.birth_date !== birthDate) {
            return jsonResponse(409, { error: "The supplied email and birth date do not match this patient record. Verify the record before sending an invitation." });
        }
        if (patient.portal_invited_at) {
            return jsonResponse(409, { error: "A portal invitation has already been sent to this patient. Ask them to check their email or contact the health center." });
        }

        const emailQuery = new URL(`${supabaseUrl}/rest/v1/patients`);
        emailQuery.searchParams.set("email", `ilike.${email}`);
        emailQuery.searchParams.set("select", "id");
        emailQuery.searchParams.set("limit", "2");
        const emailResponse = await fetch(emailQuery, { headers: adminHeaders });
        if (!emailResponse.ok) {
            console.error("Could not check for duplicate patient emails. HTTP status:", emailResponse.status);
            return jsonResponse(503, { error: "Could not verify that this email belongs to one patient record." });
        }
        const matches = await emailResponse.json();
        if (!Array.isArray(matches) || matches.length !== 1 || Number(matches[0].id) !== patientId) {
            return jsonResponse(409, { error: "This email must belong to exactly one patient record before portal access can be created." });
        }

        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
            .filter((part) => typeof part === "string" && part.trim())
            .join(" ");
        const inviteUrl = new URL(`${supabaseUrl}/auth/v1/invite`);
        inviteUrl.searchParams.set("redirect_to", setupRedirect.href);
        const inviteResponse = await fetch(inviteUrl, {
            method: "POST",
            headers: adminHeaders,
            body: JSON.stringify({
                email,
                data: { full_name: fullName, role: "patient" }
            })
        });
        if (!inviteResponse.ok) {
            console.error("Supabase patient invitation failed with HTTP status:", inviteResponse.status);
            if (inviteResponse.status === 422) {
                return jsonResponse(409, { error: "An account or pending invitation already exists for this email. Do not create a second account; contact the health center for access assistance." });
            }
            if (inviteResponse.status === 429) {
                return jsonResponse(429, { error: "Too many invitations were sent recently. Wait and try again." });
            }
            return jsonResponse(502, { error: "Supabase could not send the invitation. Check the project's email/SMTP configuration and function logs." });
        }

        const invitedUser = await inviteResponse.json();
        if (!invitedUser || typeof invitedUser.id !== "string") {
            console.error("Supabase created a patient invitation without returning a user ID.");
            return jsonResponse(502, { error: "The invitation was sent, but patient access could not be configured. Contact the project owner." });
        }

        let warning = "";
        const metadataResponse = await fetch(
            `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(invitedUser.id)}`,
            {
                method: "PUT",
                headers: adminHeaders,
                body: JSON.stringify({ app_metadata: { role: "patient" } })
            }
        );
        if (!metadataResponse.ok) {
            console.error("Supabase invited the patient but could not assign trusted patient metadata. HTTP status:", metadataResponse.status);
            warning = "The invitation was sent, but patient role metadata could not be updated. Contact the project owner.";
        }

        const invitedAt = new Date().toISOString();
        const updateUrl = new URL(`${supabaseUrl}/rest/v1/patients`);
        updateUrl.searchParams.set("id", `eq.${patientId}`);
        const updateResponse = await fetch(updateUrl, {
            method: "PATCH",
            headers: { ...adminHeaders, Prefer: "return=minimal" },
            body: JSON.stringify({ portal_invited_at: invitedAt })
        });
        if (!updateResponse.ok) {
            console.error("Patient invitation was sent but its record could not be updated. HTTP status:", updateResponse.status);
            warning = [warning, "The invitation was sent, but the record could not be marked as invited. Contact the project owner before retrying."]
                .filter(Boolean)
                .join(" ");
        }

        return jsonResponse(200, { invited: true, invitedAt, warning: warning || undefined });
    } catch (error) {
        console.error("Could not complete patient invitation:", error);
        return jsonResponse(502, { error: "Could not reach Supabase to send the patient invitation. Please try again." });
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
