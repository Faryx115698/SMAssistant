// auth-guard.js - Protects pages via Supabase Auth (with local fallback)

window.currentUser = null;

async function checkAuthGuard() {
    try {
        // 1. If Supabase is configured, use real Supabase session
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            const { data: { session }, error } = await window.sb.auth.getSession();

            if (!session || error) {
                window.location.href = "login.html";
                return;
            }

            const user = session.user;
            const profileName = user.user_metadata?.full_name || user.email.split("@")[0] || "ADMIN";
            const profileRole = user.user_metadata?.role || "ADMINISTRATOR";

            window.currentUser = {
                id: user.id,
                name: profileName,
                email: user.email,
                role: profileRole
            };

            populateUserData(window.currentUser);
            return;
        }

        // 2. Fallback for local development if Supabase keys not set yet
        const localSession = localStorage.getItem("sm_user_session");
        if (localSession) {
            window.currentUser = JSON.parse(localSession);
            populateUserData(window.currentUser);
            return;
        }

        // If not logged in locally and not configured, set default admin for preview
        window.currentUser = {
            name: "ADMIN CYRON",
            role: "ADMINISTRATOR"
        };
        populateUserData(window.currentUser);

    } catch (e) {
        console.error("Auth guard error:", e);
    }
}

function populateUserData(user) {
    if (!user) return;
    const nameElements = document.querySelectorAll("#adminName, [data-user-name]");
    nameElements.forEach(el => {
        el.textContent = user.name;
    });

    const role = String(user.role || "ADMINISTRATOR").trim().toUpperCase();
    const displayRole = role === "ADMINISTRATOR" ? "ADMIN" : role;
    const roleElements = document.querySelectorAll(
        "#adminRole, .admin-name, .admin-role, [data-user-role]"
    );
    roleElements.forEach(el => {
        el.textContent = displayRole;
    });

    window.dispatchEvent(new CustomEvent("user-authenticated", { detail: user }));
}

checkAuthGuard();
