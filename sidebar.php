<?php

$currentPage = basename($_SERVER["PHP_SELF"]);

if (!function_exists("navClass")) {
    function navClass($page, $currentPage)
    {
        return "nav-link" . ($page === $currentPage ? " active" : "");
    }
}

?>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="sidebar.css">

<button class="mobile-menu-button" id="mobileMenuButton" type="button">
    <i class="fa-solid fa-bars"></i>
</button>

<div class="sidebar-overlay" id="sidebarOverlay"></div>

<aside class="sidebar" id="sidebar">

    <button class="mobile-close-button" id="mobileCloseButton" type="button">
        <i class="fa-solid fa-xmark"></i>
    </button>

    <div class="sidebar-brand">
        <img src="logo.png" alt="Barangay Talimundoc Logo">

        <div>
            <h1>Smart Assistant</h1>
            <p>Barangay Talimundoc,<br>Health Center</p>
        </div>
    </div>

    <nav class="sidebar-nav">

        <p class="nav-section-title">Core Features</p>

        <a href="dashboard.php" class="<?php echo navClass('dashboard.php', $currentPage); ?>">
            <i class="fa-solid fa-house"></i>
            <span>Dashboard</span>
        </a>

        <a href="patient-registration.php" class="<?php echo navClass('patient-registration.php', $currentPage); ?>">
            <i class="fa-solid fa-user"></i>
            <span>Patient Registration &amp; Record</span>
        </a>

        <a href="consultation.php" class="<?php echo navClass('consultation.php', $currentPage); ?>">
            <i class="fa-solid fa-notes-medical"></i>
            <span>Consultation &amp; Medical Record</span>
        </a>

        <a href="appointment-schedule.php" class="<?php echo navClass('appointment-schedule.php', $currentPage); ?>">
            <i class="fa-solid fa-calendar-days"></i>
            <span>Appointment &amp; Schedule</span>
        </a>

        <a href="inventory.php" class="<?php echo navClass('inventory.php', $currentPage); ?>">
            <i class="fa-solid fa-box"></i>
            <span>Medical Inventory &amp; Issuance</span>
        </a>

        <p class="nav-section-title">Health Programs</p>

        <a href="immunization.php" class="<?php echo navClass('immunization.php', $currentPage); ?>">
            <i class="fa-solid fa-syringe"></i>
            <span>Immunization &amp; Vaccination</span>
        </a>

        <a href="maternal-health.php" class="<?php echo navClass('maternal-health.php', $currentPage); ?>">
            <i class="fa-solid fa-person-pregnant"></i>
            <span>Maternal Health</span>
        </a>

        <a href="infant-child-health.php" class="<?php echo navClass('infant-child-health.php', $currentPage); ?>">
            <i class="fa-solid fa-child-reaching"></i>
            <span>Infants &amp; Child Health</span>
        </a>

        <a href="tb-dots.php" class="<?php echo navClass('tb-dots.php', $currentPage); ?>">
            <i class="fa-solid fa-lungs"></i>
            <span>TB Dots</span>
        </a>

        <a href="health-education.php" class="<?php echo navClass('health-education.php', $currentPage); ?>">
            <i class="fa-solid fa-book-open"></i>
            <span>Health Education</span>
        </a>

        <p class="nav-section-title">Smart Assistant</p>

        <a href="ai-moto.php" class="<?php echo navClass('ai-moto.php', $currentPage); ?>">
            <i class="fa-solid fa-wand-magic-sparkles"></i>
            <span>AI Moto</span>
        </a>

        <p class="nav-section-title">Communications</p>

        <a href="announcements.php" class="<?php echo navClass('announcements.php', $currentPage); ?>">
            <i class="fa-solid fa-bullhorn"></i>
            <span>Announcements</span>
        </a>

        <a href="sms-notifications.php" class="<?php echo navClass('sms-notifications.php', $currentPage); ?>">
            <i class="fa-solid fa-comment-sms"></i>
            <span>SMS &amp; Notifications</span>
        </a>

        <a href="feedback.php" class="<?php echo navClass('feedback.php', $currentPage); ?>">
            <i class="fa-solid fa-comment-medical"></i>
            <span>Feedback &amp; Messages</span>
        </a>

        <p class="nav-section-title">Operations</p>

        <a href="admin-reports.php" class="<?php echo navClass('admin-reports.php', $currentPage); ?>">
            <i class="fa-solid fa-chart-column"></i>
            <span>Admin &amp; Reports</span>
        </a>

        <a href="settings.php" class="<?php echo navClass('settings.php', $currentPage); ?>">
            <i class="fa-solid fa-gear"></i>
            <span>Settings</span>
        </a>

    </nav>

    <form action="logout.php" method="POST" class="sidebar-logout">
        <button type="submit">
            <i class="fa-solid fa-right-from-bracket"></i>
            <span>Log Out</span>
        </button>
    </form>

</aside>

<script>
    document.addEventListener("DOMContentLoaded", function () {

        const sidebar = document.getElementById("sidebar");
        const menuButton = document.getElementById("mobileMenuButton");
        const closeButton = document.getElementById("mobileCloseButton");
        const overlay = document.getElementById("sidebarOverlay");

        if (!sidebar) {
            return;
        }

        const savedScrollPosition = sessionStorage.getItem("sidebarScrollTop");

        if (savedScrollPosition !== null) {
            sidebar.scrollTop = parseInt(savedScrollPosition, 10);
        }

        function saveSidebarPosition() {
            sessionStorage.setItem("sidebarScrollTop", sidebar.scrollTop);
        }

        function openSidebar() {
            sidebar.classList.add("mobile-open");

            if (overlay) {
                overlay.classList.add("active");
            }

            document.body.classList.add("sidebar-open");
        }

        function closeSidebar() {
            sidebar.classList.remove("mobile-open");

            if (overlay) {
                overlay.classList.remove("active");
            }

            document.body.classList.remove("sidebar-open");
        }

        if (menuButton) {
            menuButton.addEventListener("click", openSidebar);
        }

        if (closeButton) {
            closeButton.addEventListener("click", closeSidebar);
        }

        if (overlay) {
            overlay.addEventListener("click", closeSidebar);
        }

        const navLinks = sidebar.querySelectorAll(".nav-link");

        navLinks.forEach(function (link) {
            link.addEventListener("click", function () {

                saveSidebarPosition();

                if (window.innerWidth <= 900) {
                    closeSidebar();
                }

            });
        });

        const logoutForm = document.querySelector(".sidebar-logout");

        if (logoutForm) {
            logoutForm.addEventListener("submit", function () {
                sessionStorage.removeItem("sidebarScrollTop");
            });
        }

        window.addEventListener("resize", function () {
            if (window.innerWidth > 900) {
                closeSidebar();
            }
        });

    });
</script>