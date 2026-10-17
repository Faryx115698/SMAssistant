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
                    const userRole = data.session.user?.user_metadata?.role || "Administrator";
                    const isPatient = userRole.toLowerCase() === "patient" || userRole.toLowerCase() === "resident";
                    showMessage("Login successful! Redirecting...", "success");
                    setTimeout(() => {
                        window.location.href = isPatient ? "patient-portal.html" : "dashboard.html";
                    }, 500);
                    return;
                }

                // If user not in Supabase yet, allow local admin & resident preview
                const isPatientLogin = (emailVal.toLowerCase() === "patient" || emailVal.toLowerCase() === "resident" || emailVal.toLowerCase() === "juan");
                if (isPatientLogin && (passwordVal === "patient123" || passwordVal === "resident123" || passwordVal === "patient" || passwordVal === "resident" || passwordVal === "123456" || passwordVal === "admin")) {
                    localStorage.setItem("sm_user_session", JSON.stringify({
                        name: "Juan D. Dela Cruz",
                        role: "Patient",
                        email: "juandelacruz@example.com",
                        residentId: "PT-2026-0001"
                    }));
                    showMessage("Resident login successful! Redirecting to Resident Portal...", "success");
                    setTimeout(() => {
                        window.location.href = "patient-portal.html";
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
            }
        }

        // 2. Local Fallback
        const isPatientLocal = (emailVal.toLowerCase() === "patient" || emailVal.toLowerCase() === "resident" || emailVal.toLowerCase() === "juan");
        if (isPatientLocal && (passwordVal === "patient123" || passwordVal === "resident123" || passwordVal === "patient" || passwordVal === "resident" || passwordVal === "123456" || passwordVal === "admin")) {
            localStorage.setItem("sm_user_session", JSON.stringify({
                name: "Juan D. Dela Cruz",
                role: "Patient",
                email: "juandelacruz@example.com",
                residentId: "PT-2026-0001"
            }));
            showMessage("Resident login successful! Redirecting to Resident Portal...", "success");
            setTimeout(() => {
                window.location.href = "patient-portal.html";
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

    const demoPatientBtn = document.getElementById("demoPatientBtn");
    if (demoPatientBtn) {
        demoPatientBtn.addEventListener("click", function () {
            email.value = "patient";
            password.value = "patient123";
            form.dispatchEvent(new Event("submit"));
        });
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