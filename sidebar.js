// sidebar.js - Loads and initializes the sidebar component

(async function () {
    async function initSidebar() {
        let container = document.getElementById("sidebar-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "sidebar-container";
            document.body.insertBefore(container, document.body.firstChild);
        }

        try {
            const resp = await fetch("sidebar.html");
            if (resp.ok) {
                container.innerHTML = await resp.text();
            }
        } catch (e) {
            console.error("Failed to load sidebar.html", e);
            return;
        }

        const sidebar = document.getElementById("sidebar");
        const menuButton = document.getElementById("mobileMenuButton");
        const closeButton = document.getElementById("mobileCloseButton");
        const overlay = document.getElementById("sidebarOverlay");
        const logoutBtn = document.getElementById("sidebarLogoutBtn");

        if (!sidebar) return;

        // Restore scroll position
        const savedScroll = sessionStorage.getItem("sidebarScrollTop");
        if (savedScroll !== null) {
            sidebar.scrollTop = parseInt(savedScroll, 10);
        }

        function saveSidebarPosition() {
            sessionStorage.setItem("sidebarScrollTop", sidebar.scrollTop);
        }

        function openSidebar() {
            sidebar.classList.add("mobile-open");
            if (overlay) overlay.classList.add("active");
            document.body.classList.add("sidebar-open");
        }

        function closeSidebar() {
            sidebar.classList.remove("mobile-open");
            if (overlay) overlay.classList.remove("active");
            document.body.classList.remove("sidebar-open");
        }

        if (menuButton) menuButton.addEventListener("click", openSidebar);
        if (closeButton) closeButton.addEventListener("click", closeSidebar);
        if (overlay) overlay.addEventListener("click", closeSidebar);

        // Highlight active link
        let currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
        if (currentPath.endsWith(".php")) {
            currentPath = currentPath.replace(".php", ".html");
        }
        const navLinks = sidebar.querySelectorAll(".nav-link");
        navLinks.forEach(function (link) {
            const page = link.getAttribute("data-page");
            if (page === currentPath || link.getAttribute("href") === currentPath) {
                link.classList.add("active");
            } else {
                link.classList.remove("active");
            }
            link.addEventListener("click", function () {
                saveSidebarPosition();
                if (window.innerWidth <= 900) closeSidebar();
            });
        });

        // Logout handler
        if (logoutBtn) {
            logoutBtn.addEventListener("click", async function () {
                sessionStorage.removeItem("sidebarScrollTop");
                localStorage.removeItem("sm_user_session");
                if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
                    try { await window.sb.auth.signOut(); } catch (e) {}
                }
                window.location.href = "login.html";
            });
        }

        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) closeSidebar();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSidebar);
    } else {
        initSidebar();
    }
})();
