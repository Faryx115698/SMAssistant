async function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const messageEl = document.getElementById('message');

    if (!email || !password) {
        messageEl.textContent = 'Please fill in both fields.';
        messageEl.className = 'message error';
        return;
    }

    try {
        const response = await fetch('backend.php?action=login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const result = await response.json();

        if (result.success) {
            messageEl.textContent = `Welcome, ${result.fullname}! Redirecting...`;
            messageEl.className = 'message success';

            setTimeout(() => {
                window.location.href = 'homepage.php';
            }, 1000);
        } else {
            messageEl.textContent = 'Invalid: ' + result.message;
            messageEl.className = 'message error';
        }

    } catch (error) {
        messageEl.textContent = 'Server error. Please try again.';
        messageEl.className = 'message error';
        console.error(error);
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const active = document.activeElement;

        if (
            active &&
            (active.id === 'email' || active.id === 'password')
        ) {
            handleLogin();
        }
    }
});