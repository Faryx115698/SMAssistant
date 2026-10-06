function googleSignup() {
    const client = google.accounts.oauth2.initTokenClient({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
        scope: 'openid email profile',
        callback: async function(response) {
            if (response.error) {
                const messageEl = document.getElementById('message');
                messageEl.textContent = 'Google sign up was cancelled.';
                messageEl.className = 'message error';
                return;
            }

            try {
                const result = await fetch('backend.php?action=google_signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        access_token: response.access_token
                    })
                });

                const data = await result.json();

                const messageEl = document.getElementById('message');

                if (data.success) {
                    messageEl.textContent = data.message;
                    messageEl.className = 'message success';

                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 800);
                } else {
                    messageEl.textContent = data.message;
                    messageEl.className = 'message error';
                }

            } catch (error) {
                console.error(error);

                const messageEl = document.getElementById('message');
                messageEl.textContent = 'Google sign up failed.';
                messageEl.className = 'message error';
            }
        }
    });

    client.requestAccessToken();
}