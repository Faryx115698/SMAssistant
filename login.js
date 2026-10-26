document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const messageEl = document.getElementById("loginMessage");
    const loginBtn = document.getElementById("loginBtn");

    if (!form || !email || !password) return;

    const setupSection = document.getElementById("patientPasswordSetup");
    if (new URLSearchParams(window.location.search).get("auth") === "setup" && setupSection) {
        form.hidden = true;
        setupSection.hidden = false;
        initializePatientPasswordSetup();
        return;
    }

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

    async function initializePatientPasswordSetup() {
        const setupForm = document.getElementById("patientPasswordSetupForm");
        const setupMessage = document.getElementById("setupMessage");
        const setupButton = document.getElementById("setupPasswordBtn");
        if (!window.sb || typeof isConfigured === "undefined" || !isConfigured || !setupForm) {
            showSetupMessage("Patient account setup is unavailable. Contact the health center.", "error");
            return;
        }

        let sessionResult;
        try {
            sessionResult = await window.sb.auth.getSession();
        } catch (sessionError) {
            showSetupMessage(sessionError.message || "Could not validate this invitation. Ask the health center for help.", "error");
            return;
        }
        const { data, error } = sessionResult;
        if (error || !data.session) {
            showSetupMessage("This invitation link is invalid or expired. Ask the health center to send a new invitation.", "error");
            return;
        }
        if (String(data.session.user?.app_metadata?.role || "").toLowerCase() !== "patient") {
            showSetupMessage("This link is not a valid patient invitation. Sign out and ask the health center to send a new link.", "error");
            return;
        }

        setupForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const newPassword = document.getElementById("newPatientPassword").value;
            const confirmPassword = document.getElementById("confirmPatientPassword").value;
            if (newPassword.length < 10) {
                showSetupMessage("Choose a password with at least 10 characters.", "error");
                return;
            }
            if (newPassword !== confirmPassword) {
                showSetupMessage("The passwords do not match.", "error");
                return;
            }

            setupButton.disabled = true;
            setupButton.textContent = "Saving...";
            let passwordError;
            try {
                ({ error: passwordError } = await window.sb.auth.updateUser({ password: newPassword }));
            } catch (updateError) {
                setupButton.disabled = false;
                setupButton.textContent = "Set Password";
                showSetupMessage(updateError.message || "Could not set your password. Please try again.", "error");
                return;
            }
            if (passwordError) {
                setupButton.disabled = false;
                setupButton.textContent = "Set Password";
                showSetupMessage(passwordError.message, "error");
                return;
            }

            let signOutError;
            try {
                ({ error: signOutError } = await window.sb.auth.signOut());
            } catch (signOutException) {
                showSetupMessage("Your password was set, but sign-out failed. Return to this page and sign in with your new password.", "error");
                return;
            }
            if (signOutError) {
                showSetupMessage("Your password was set, but sign-out failed. Return to this page and sign in with your new password.", "error");
                return;
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            setupForm.hidden = true;
            showSetupMessage("Password set successfully. You can now sign in to your patient portal.", "success");
        });

        function showSetupMessage(message, type) {
            if (!setupMessage) return;
            setupMessage.textContent = message;
            setupMessage.className = `message ${type}`;
            setupMessage.style.display = "block";
        }
    }
});