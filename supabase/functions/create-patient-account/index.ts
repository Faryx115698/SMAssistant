const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
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
        return jsonResponse(401, { error: "Sign in with an authorized staff account first." });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        console.error("Patient account creation is missing Supabase server configuration.");
        return jsonResponse(503, { error: "Patient account creation is not configured. Contact the Supabase project owner." });
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
        console.error("Could not validate patient account creator:", error);
        return jsonResponse(503, { error: "Could not verify your session. Please try again." });
    }
    if (!hasStaffAppMetadata(caller.app_metadata)) {
        return jsonResponse(403, { error: "Only staff authorized in Supabase app metadata can create patient accounts." });
    }

    let rawBody: string;
    try {
        rawBody = await request.text();
    } catch {
        return jsonResponse(400, { error: "Patient record ID and password are required." });
    }
    if (new TextEncoder().encode(rawBody).length > 4096) {
        return jsonResponse(413, { error: "Patient account request is too large." });
    }

    let body: unknown;
    try {
        body = JSON.parse(rawBody);
    } catch {
        return jsonResponse(400, { error: "Request body must be valid JSON." });
    }
    if (!body || typeof body !== "object") {
        return jsonResponse(400, { error: "Patient record ID and password are required." });
    }
    const patientId = "patientId" in body && typeof body.patientId === "number" ? body.patientId : 0;
    const password = "password" in body && typeof body.password === "string" ? body.password : "";
    if (!Number.isSafeInteger(patientId) || patientId < 1) {
        return jsonResponse(400, { error: "The patient record ID is invalid." });
    }
    if (password.length < 8 || password.length > 128) {
        return jsonResponse(400, { error: "Choose a password between 8 and 128 characters." });
    }

    const serviceHeaders = {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json"
    };
    try {
        const patientQuery = new URL(`${supabaseUrl}/rest/v1/patients`);
        patientQuery.searchParams.set("id", `eq.${patientId}`);
        patientQuery.searchParams.set("select", "id,email,portal_account_created_at,first_name,middle_name,last_name,suffix");
        const patientResponse = await fetch(patientQuery, { headers: serviceHeaders });
        if (!patientResponse.ok) {
            console.error("Could not verify patient record for account creation. HTTP status:", patientResponse.status);
            return jsonResponse(503, { error: "Could not verify the patient record. Run the latest patient-portal-migration.sql migration." });
        }
        const patients = await patientResponse.json();
        if (!Array.isArray(patients) || patients.length !== 1) {
            return jsonResponse(404, { error: "The patient record could not be found." });
        }
        const patient = patients[0];
        const email = typeof patient.email === "string" ? patient.email.trim().toLowerCase() : "";
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return jsonResponse(400, { error: "Add a valid email address to the patient record first." });
        }
        if (patient.portal_account_created_at) {
            return jsonResponse(409, { error: "This patient already has a portal account." });
        }

        const emailQuery = new URL(`${supabaseUrl}/rest/v1/patients`);
        emailQuery.searchParams.set("email", `ilike.${email.replace(/[\\%_]/g, "\\$&")}`);
        emailQuery.searchParams.set("select", "id");
        emailQuery.searchParams.set("limit", "2");
        const emailResponse = await fetch(emailQuery, { headers: serviceHeaders });
        if (!emailResponse.ok) {
            console.error("Could not check patient email uniqueness. HTTP status:", emailResponse.status);
            return jsonResponse(503, { error: "Could not verify that this email belongs to one patient record." });
        }
        const emailMatches = await emailResponse.json();
        if (!Array.isArray(emailMatches) || emailMatches.length !== 1 || Number(emailMatches[0].id) !== patientId) {
            return jsonResponse(409, { error: "This email must belong to exactly one patient record before portal access can be created." });
        }

        const fullName = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
            .filter((part) => typeof part === "string" && part.trim())
            .join(" ");
        const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
            method: "POST",
            headers: serviceHeaders,
            body: JSON.stringify({
                email,
                password,
                email_confirm: true,
                app_metadata: {
                    role: "patient",
                    patient_id: String(patientId)
                },
                user_metadata: { full_name: fullName }
            })
        });
        if (!createResponse.ok) {
            console.error("Supabase patient account creation failed with HTTP status:", createResponse.status);
            if (createResponse.status === 422) {
                return jsonResponse(409, { error: "An account already exists for this email. Contact the health center administrator." });
            }
            return jsonResponse(502, { error: "Supabase could not create the patient account. Please try again or contact the administrator." });
        }

        const createdUser = await createResponse.json();
        if (!createdUser || typeof createdUser.id !== "string") {
            console.error("Supabase created a patient account without returning a user ID.");
            return jsonResponse(502, { error: "The account may have been created, but its status could not be confirmed. Contact the administrator before retrying." });
        }

        const updateUrl = new URL(`${supabaseUrl}/rest/v1/patients`);
        updateUrl.searchParams.set("id", `eq.${patientId}`);
        const updateResponse = await fetch(updateUrl, {
            method: "PATCH",
            headers: { ...serviceHeaders, Prefer: "return=representation" },
            body: JSON.stringify({ portal_account_created_at: new Date().toISOString() })
        });
        const updatedPatients = updateResponse.ok ? await updateResponse.json() : [];
        if (!updateResponse.ok || !Array.isArray(updatedPatients) || updatedPatients.length !== 1) {
            console.error("Patient Auth account was created but its patient record could not be updated. HTTP status:", updateResponse.status);
            const deleteResponse = await fetch(
                `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(createdUser.id)}`,
                { method: "DELETE", headers: serviceHeaders }
            );
            if (!deleteResponse.ok) {
                console.error("Could not roll back patient Auth account after patient record update failed. HTTP status:", deleteResponse.status);
                return jsonResponse(502, { error: "Account creation could not be completed safely. Do not retry; contact the health center administrator." });
            }
            return jsonResponse(502, { error: "Account creation was rolled back because the patient record could not be updated. Please try again." });
        }

        return jsonResponse(200, { created: true });
    } catch (error) {
        console.error("Could not create patient portal account:", error);
        return jsonResponse(502, { error: "Could not reach Supabase to create the patient account. Please try again." });
    }
});

function hasStaffAppMetadata(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    const metadata = value as Record<string, unknown>;
    const role = typeof metadata.role === "string" ? metadata.role.toLowerCase().replace(/ /g, "_") : "";
    const roles = Array.isArray(metadata.roles) ? metadata.roles : [];
    return metadata.staff_admin === true ||
        ["admin", "administrator", "staff", "nurse", "doctor", "health_worker", "midwife", "records_staff"].includes(role) ||
        roles.some((item) => typeof item === "string" && ["admin", "administrator"].includes(item.toLowerCase()));
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
