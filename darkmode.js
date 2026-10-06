(function () {

    const darkMode = localStorage.getItem("darkMode") === "true";

    if (darkMode) {
        document.documentElement.classList.add("dark-mode");
    } else {
        document.documentElement.classList.remove("dark-mode");
    }

})();


document.addEventListener("DOMContentLoaded", function () {

    const isDark = localStorage.getItem("darkMode") === "true";

    if (isDark) {
        document.documentElement.classList.add("dark-mode");
        document.body.classList.add("dark-mode");
    } else {
        document.documentElement.classList.remove("dark-mode");
        document.body.classList.remove("dark-mode");
    }


    const darkModeToggle = document.getElementById("darkModeToggle");

    if (darkModeToggle) {

        darkModeToggle.checked = isDark;

        darkModeToggle.addEventListener("change", function () {

            if (this.checked) {

                localStorage.setItem("darkMode", "true");

                document.documentElement.classList.add("dark-mode");
                document.body.classList.add("dark-mode");

            } else {

                localStorage.setItem("darkMode", "false");

                document.documentElement.classList.remove("dark-mode");
                document.body.classList.remove("dark-mode");

            }

        });

    }

});