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
                    showMessage("Login successful! Redirecting...", "success");
                    setTimeout(() => {
                        window.location.href = "dashboard.html";
                    }, 500);
                    return;
                }

                // If user not in Supabase yet, allow local admin preview
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
});