document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const messageEl = document.getElementById("loginMessage");
    const loginBtn = document.getElementById("loginBtn");

    if (!form || !email || !password) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const emailVal = email.value.trim();
        const passwordVal = password.value;

        if (emailVal === "" || passwordVal === "") {
            showMessage("Please enter your email/username and password.", "error");
            return;
        }

        if (loginBtn) {
            loginBtn.disabled = true;
            loginBtn.textContent = "Logging in...";
        }

        const authEmail = emailVal.includes("@") ? emailVal : `${emailVal}@smartassistant.com`;

        // 1. Supabase Authentication
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            try {
                const { data, error } = await window.sb.auth.signInWithPassword({
                    email: authEmail,
                    password: passwordVal
                });

                if (!error && data.session) {
                    const user = data.session.user;
                    const userRole = String(user?.app_metadata?.role || user?.user_metadata?.role || "").toLowerCase();
                    let isPatient = userRole === "patient" || userRole === "resident";
                    if (!userRole && window.sb) {
                        const { data: patientRecords, error: patientLookupError } = await window.sb
                            .from("patients").select("id").limit(2);
                        if (patientLookupError) throw patientLookupError;
                        isPatient = Boolean(patientRecords && patientRecords.length === 1);
                    }
                    showMessage("Login successful! Redirecting...", "success");
                    setTimeout(() => {
                        window.location.href = isPatient ? "patient-portal.html" : "dashboard.html";
                    }, 500);
                    return;
                }

                if (emailVal === "admin" && (passwordVal === "admin123" || passwordVal === "admin")) {
                    localStorage.setItem("sm_user_session", JSON.stringify({
                        name: "Admin Cyron",
                        role: "Administrator",
                        email: authEmail
                    }));
                    showMessage("Login successful! Redirecting...", "success");
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 500);
                    return;
                }

                showMessage(error ? error.message : "Invalid credentials.", "error");
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = "Login";
                }
                return;
            } catch (err) {
                console.error("Auth error:", err);
                showMessage(err.message || "Could not connect to the sign-in service. Please try again.", "error");
                if (loginBtn) {
                    loginBtn.disabled = false;
                    loginBtn.textContent = "Login";
                }
                return;
            }
        }

        // Patient accounts must authenticate with Supabase; never use a shared demo password.
        if (emailVal === "admin" && (passwordVal === "admin123" || passwordVal === "admin")) {
            localStorage.setItem("sm_user_session", JSON.stringify({
                name: "Admin Cyron",
                role: "Administrator",
                email: authEmail
            }));
            showMessage("Login successful! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 500);
            return;
        }

        showMessage("Invalid email or password.", "error");
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Login";
        }
    });

    function showMessage(msg, type) {
        if (!messageEl) return;
        messageEl.textContent = msg;
        messageEl.className = "message " + type;
        messageEl.style.display = "block";
    }

    const demoAdminBtn = document.getElementById("demoAdminBtn");
    if (demoAdminBtn) {
        demoAdminBtn.addEventListener("click", function () {
            email.value = "admin";
            password.value = "admin123";
            form.dispatchEvent(new Event("submit"));
        });
    }

});