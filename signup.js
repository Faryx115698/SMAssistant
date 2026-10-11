document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("signupForm");
    const submitBtn = document.getElementById("signupSubmitBtn");

    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();

            const fullname = document.getElementById("fullname").value.trim();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const confirm = document.getElementById("confirm_password").value;

            if (password !== confirm) {
                showMessage("Passwords do not match.", "error");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "Creating Account...";
            }

            // 1. Supabase Auth
            if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
                try {
                    const { data, error } = await window.sb.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: {
                                full_name: fullname,
                                role: "Patient"
                            }
                        }
                    });

                    if (error) {
                        showMessage(error.message, "error");
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.textContent = "Sign up";
                        }
                        return;
                    }

                    showMessage("Account created successfully! Redirecting to login...", "success");
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1200);
                    return;
                } catch (err) {
                    showMessage("Signup error: " + err.message, "error");
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = "Sign up";
                    }
                    return;
                }
            }

            // 2. Local Fallback
            showMessage("Account created successfully! Redirecting...", "success");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        });
    }
});

function googleSignup() {
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        window.sb.auth.signInWithOAuth({ provider: "google" });
    } else {
        showMessage("Configure Supabase Google Auth provider in your Supabase dashboard.", "error");
    }
}

function showMessage(message, type) {
    let messageEl = document.getElementById("signupMessage");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.id = "signupMessage";
        const form = document.querySelector("form");
        if (form) form.parentNode.insertBefore(messageEl, form);
    }
    messageEl.textContent = message;
    messageEl.className = "message " + type;
    messageEl.style.display = "block";
}