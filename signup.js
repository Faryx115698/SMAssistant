function googleSignup() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        scope: "openid email profile",
        callback: async function(response) {
            if (response.error) {
                showMessage("Google sign up was cancelled.", "error");
                return;
            }

            try {
                const result = await fetch("backend.php?action=google_signup", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        access_token: response.access_token
                    })
                });

                const data = await result.json();

                if (data.success) {
                    showMessage(data.message, "success");

                    setTimeout(() => {
                        window.location.href = "home.php";
                    }, 800);
                } else {
                    showMessage(data.message, "error");
                }
            } catch (error) {
                console.error(error);
                showMessage("Google sign up failed.", "error");
            }
        }
    });

    client.requestAccessToken();
}

function showMessage(message, type) {
    let messageEl = document.getElementById("message");

    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.id = "message";

        const form = document.querySelector("form");

        if (form) {
            form.parentNode.insertBefore(messageEl, form);
        }
    }

    messageEl.textContent = message;
    messageEl.className = "message " + type;
}