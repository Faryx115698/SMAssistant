document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    const email = document.getElementById("email");
    const password = document.getElementById("password");

    if (!form || !email || !password) {
        return;
    }

    form.addEventListener("submit", function (event) {

        if (email.value.trim() === "" || password.value.trim() === "") {
            event.preventDefault();
            alert("Please enter your username/email and password.");
            return;
        }

    });
});