<?php
session_start();

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit();
}

require_once "db.php";

$user = $_SESSION["user"];

$adminName = "ADMIN CYRON";

if (isset($user["full_name"]) && $user["full_name"] !== "") {
    $adminName = $user["full_name"];
}

include "sidebar.php";

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Settings - Smart Assistant</title>

    <link rel="stylesheet" href="settings.css">
    
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

    <script>
        (function () {
            const darkMode = localStorage.getItem("darkMode");

            if (darkMode === "true") {
                document.documentElement.classList.add("dark-mode");
            }
        })();
    </script>
</head>

<body>

    <?php include "sidebar.php"; ?>

    <main class="main-content">

        <header class="page-header">

            <div class="page-title">
                <h1>Settings</h1>
                <p>Manage system preferences and configurations.</p>
            </div>

            <div class="header-right">

                <div class="admin-profile">

                    <div class="admin-text">
                        <small>You are logged in as</small>
                        <strong><?php echo htmlspecialchars($adminName); ?></strong>
                    </div>

                    <div class="admin-photo">
                        <i class="fa-solid fa-user"></i>
                    </div>

                </div>

                <a href="ai-moto.php" class="ask-ai">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                    Ask AI Moto
                </a>

            </div>

        </header>


        <div class="settings-tabs">

            <button class="settings-tab active" data-tab="general">
                General Settings
            </button>

            <button class="settings-tab" data-tab="users">
                User Management
            </button>

            <button class="settings-tab" data-tab="roles">
                Role & Permissions
            </button>

            <button class="settings-tab" data-tab="notifications">
                Notifications
            </button>

            <button class="settings-tab" data-tab="preferences">
                System Preferences
            </button>

            <button class="settings-tab" data-tab="integrations">
                Integrations
            </button>

            <button class="settings-tab" data-tab="backup">
                Backup & Restore
            </button>

            <button class="settings-tab" data-tab="audit">
                Audit Logs
            </button>

        </div>


        <section class="settings-page active-tab" id="general">


            <div class="settings-column left-column">

                <div class="settings-card">

                    <div class="card-title">
                        <div class="title-icon blue">
                            <i class="fa-solid fa-gear"></i>
                        </div>

                        <div>
                            <h2>General Settings</h2>
                            <p>Basic information about the health center.</p>
                        </div>
                    </div>


                    <form id="generalSettingsForm">

                        <div class="form-group">
                            <label>Health Center Name</label>
                            <input type="text" id="healthCenterName" placeholder="Barangay Talimundoc Health Center">
                        </div>

                        <div class="form-group">
                            <label>Short Name</label>
                            <input type="text" id="shortName" placeholder="Talimundoc Health Center">
                        </div>

                        <div class="form-group">
                            <label>Address</label>
                            <input type="text" id="address" placeholder="Barangay Talimundoc, Orani, Bataan">
                        </div>

                        <div class="form-group">
                            <label>Contact Number</label>
                            <input type="text" id="contactNumber" placeholder="09XXXXXXXXX">
                        </div>

                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="email" placeholder="healthcenter@example.com">
                        </div>

                        <div class="form-row">

                            <div class="form-group">
                                <label>Timezone</label>

                                <select id="timezone">
                                    <option value="Asia/Manila">
                                        Asia/Manila (GMT+8)
                                    </option>

                                    <option value="UTC">
                                        UTC
                                    </option>
                                </select>

                            </div>

                            <div class="form-group">
                                <label>Language</label>

                                <select id="language">
                                    <option value="English">English</option>
                                    <option value="Filipino">Filipino</option>
                                </select>

                            </div>

                        </div>

                        <button type="submit" class="save-button">
                            <i class="fa-solid fa-floppy-disk"></i>
                            Save Changes
                        </button>

                        <div id="saveMessage" class="save-message">
                            <i class="fa-solid fa-circle-check"></i>
                            Settings saved successfully.
                        </div>

                    </form>

                </div>


                <div class="settings-card logo-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-image"></i>
                        </div>

                        <div>
                            <h2>Health Center Logo</h2>
                            <p>Upload your own health center logo.</p>
                        </div>

                    </div>


                    <div class="logo-upload-area">

                        <div class="logo-preview" id="logoPreview">
                            <i class="fa-solid fa-hospital"></i>
                        </div>

                        <div class="logo-upload-content">

                            <strong>Your Health Center Logo</strong>

                            <span>
                                Recommended size: 200 × 200 pixels
                            </span>

                            <label class="change-logo-button">

                                <i class="fa-solid fa-upload"></i>
                                Change Logo

                                <input type="file" id="logoInput" accept="image/*">

                            </label>

                            <button type="button" class="remove-logo-button" id="removeLogo">
                                Remove
                            </button>

                        </div>

                    </div>

                </div>

            </div>



            <div class="settings-column middle-column">

                <div class="settings-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-sliders"></i>
                        </div>

                        <div>
                            <h2>System Preferences</h2>
                            <p>Configure system behavior.</p>
                        </div>

                    </div>


                    <div class="preference-list">


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-user"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Enable Patient ID Auto-Generation</strong>
                                <span>Automatically generate patient IDs.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" id="autoPatientId" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-lock"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Enable Data Encryption</strong>
                                <span>Encrypt sensitive patient data.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-file-shield"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Enable Audit Trail</strong>
                                <span>Track user activities and changes.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-clock"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Session Timeout</strong>
                                <span>Automatically log out inactive users.</span>
                            </div>

                            <select class="small-select" id="sessionTimeout">
                                <option value="15">15</option>
                                <option value="30" selected>30</option>
                                <option value="60">60</option>
                            </select>

                            <span class="minutes">min</span>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-list"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Items Per Page</strong>
                                <span>Number of records displayed per page.</span>
                            </div>

                            <select class="small-select" id="itemsPerPage">
                                <option value="10" selected>10</option>
                                <option value="25">25</option>
                                <option value="50">50</option>
                            </select>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-moon"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Enable Dark Mode</strong>
                                <span>Use dark theme throughout the system.</span>
                            </div>

                            <label class="switch">

                                <input type="checkbox" id="darkModeToggle">

                                <span class="slider"></span>

                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-screwdriver-wrench"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Maintenance Mode</strong>
                                <span>Temporarily disable system access.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" id="maintenanceMode">
                                <span class="slider"></span>
                            </label>

                        </div>

                    </div>

                </div>


                <div class="settings-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-bell"></i>
                        </div>

                        <div>
                            <h2>Notification Preferences</h2>
                            <p>Manage notification behavior.</p>
                        </div>

                    </div>


                    <div class="preference-list">


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-envelope"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Email Notifications</strong>
                                <span>Receive system notifications by email.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" id="emailNotifications" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-comment-sms"></i>
                            </div>

                            <div class="preference-text">
                                <strong>SMS Notifications</strong>
                                <span>Receive patient alerts through SMS.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" id="smsNotifications" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                            </div>

                            <div class="preference-text">
                                <strong>System Alerts</strong>
                                <span>Receive important system alerts.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-calendar-check"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Appointment Reminders</strong>
                                <span>Send automatic appointment reminders.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox" checked>
                                <span class="slider"></span>
                            </label>

                        </div>


                        <div class="preference-item">

                            <div class="preference-icon">
                                <i class="fa-solid fa-book-medical"></i>
                            </div>

                            <div class="preference-text">
                                <strong>Health Program Reminders</strong>
                                <span>Send reminders for health programs.</span>
                            </div>

                            <label class="switch">
                                <input type="checkbox">
                                <span class="slider"></span>
                            </label>

                        </div>

                    </div>

                </div>

            </div>



            <div class="settings-column right-column">


                <div class="settings-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-shield-halved"></i>
                        </div>

                        <div>
                            <h2>Password Policy</h2>
                            <p>Account password requirements.</p>
                        </div>

                    </div>


                    <div class="policy-list">

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Maximum Password Length
                            </span>
                            <strong>8 characters</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Require Uppercase
                            </span>
                            <strong>Enabled</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Require Lowercase
                            </span>
                            <strong>Enabled</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Require Numbers
                            </span>
                            <strong>Enabled</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Require Special Characters
                            </span>
                            <strong>Enabled</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Password Expiry
                            </span>
                            <strong>90 days</strong>
                        </div>

                        <div class="policy-row">
                            <span>
                                <i class="fa-solid fa-check"></i>
                                Prevent Password Reuse
                            </span>
                            <strong>5 passwords</strong>
                        </div>

                    </div>


                    <button class="outline-button" type="button">
                        <i class="fa-solid fa-pen"></i>
                        Edit Policy
                    </button>

                </div>



                <div class="settings-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-database"></i>
                        </div>

                        <div>
                            <h2>Data Backup</h2>
                            <p>Protect system information.</p>
                        </div>

                    </div>


                    <div class="backup-info">

                        <div>
                            <span>Last Backup</span>
                            <strong id="lastBackup">May 12, 2026 · 3:00 AM</strong>
                        </div>

                        <div>
                            <span>Backup Frequency</span>
                            <strong>Daily</strong>
                        </div>

                        <div>
                            <span>Backup Destination</span>
                            <strong>Local Storage</strong>
                        </div>

                    </div>


                    <div class="backup-actions">

                        <button type="button" class="primary-button" id="backupNow">
                            Back Up Now
                        </button>

                        <button type="button" class="outline-button" id="backupHistory">
                            View Backup History
                        </button>

                    </div>

                </div>



                <div class="settings-card">

                    <div class="card-title">

                        <div class="title-icon blue">
                            <i class="fa-solid fa-circle-info"></i>
                        </div>

                        <div>
                            <h2>System Information</h2>
                            <p>Current system environment.</p>
                        </div>

                    </div>


                    <div class="system-info">

                        <div>
                            <span>System Version</span>
                            <strong>v2.3.1</strong>
                        </div>

                        <div>
                            <span>Database Version</span>
                            <strong>MySQL 8.0.32</strong>
                        </div>

                        <div>
                            <span>Server</span>
                            <strong>localhost</strong>
                        </div>

                        <div>
                            <span>PHP Version</span>
                            <strong><?php echo PHP_VERSION; ?></strong>
                        </div>

                        <div>
                            <span>Environment</span>
                            <strong>Development</strong>
                        </div>

                    </div>

                </div>


            </div>

        </section>



        <section class="placeholder-section" id="users">

            <div class="placeholder-card">
                <i class="fa-solid fa-users"></i>
                <h2>User Management</h2>
                <p>Manage system users and account information.</p>
            </div>

        </section>


        <section class="placeholder-section" id="roles">

            <div class="placeholder-card">
                <i class="fa-solid fa-user-shield"></i>
                <h2>Role & Permissions</h2>
                <p>Manage administrator and user permissions.</p>
            </div>

        </section>


        <section class="placeholder-section" id="notifications">

            <div class="placeholder-card">
                <i class="fa-solid fa-bell"></i>
                <h2>Notifications</h2>
                <p>Configure notification settings.</p>
            </div>

        </section>


        <section class="placeholder-section" id="preferences">

            <div class="placeholder-card">
                <i class="fa-solid fa-sliders"></i>
                <h2>System Preferences</h2>
                <p>Configure system preferences.</p>
            </div>

        </section>


        <section class="placeholder-section" id="integrations">

            <div class="placeholder-card">
                <i class="fa-solid fa-plug"></i>
                <h2>Integrations</h2>
                <p>Manage API and external service integrations.</p>
            </div>

        </section>


        <section class="placeholder-section" id="backup">

            <div class="placeholder-card">
                <i class="fa-solid fa-database"></i>
                <h2>Backup & Restore</h2>
                <p>Manage database backup and restoration.</p>
            </div>

        </section>


        <section class="placeholder-section" id="audit">

            <div class="placeholder-card">
                <i class="fa-solid fa-file-shield"></i>
                <h2>Audit Logs</h2>
                <p>Review system activities and changes.</p>
            </div>

        </section>


        <div class="bottom-disclaimer">

            <i class="fa-solid fa-circle-info"></i>

            <span>
                You can manage all system settings and preferences here.
                Please save your changes to apply updates.
            </span>

        </div>

    </main>


    <script>

        document.addEventListener("DOMContentLoaded", function () {

            const darkModeToggle = document.getElementById("darkModeToggle");

            const savedDarkMode = localStorage.getItem("darkMode");

            if (savedDarkMode === "true") {
                darkModeToggle.checked = true;
                document.documentElement.classList.add("dark-mode");
                document.body.classList.add("dark-mode");
            } else {
                darkModeToggle.checked = false;
                document.documentElement.classList.remove("dark-mode");
                document.body.classList.remove("dark-mode");
            }


            darkModeToggle.addEventListener("change", function () {

                if (this.checked) {

                    document.documentElement.classList.add("dark-mode");
                    document.body.classList.add("dark-mode");

                    localStorage.setItem("darkMode", "true");

                } else {

                    document.documentElement.classList.remove("dark-mode");
                    document.body.classList.remove("dark-mode");

                    localStorage.setItem("darkMode", "false");

                }

            });


            const tabs = document.querySelectorAll(".settings-tab");
            const sections = document.querySelectorAll(
                ".settings-page, .placeholder-section"
            );


            tabs.forEach(function (tab) {

                tab.addEventListener("click", function () {

                    const target = this.dataset.tab;

                    tabs.forEach(function (item) {
                        item.classList.remove("active");
                    });

                    this.classList.add("active");


                    sections.forEach(function (section) {
                        section.classList.remove("active-tab");
                    });


                    const targetSection = document.getElementById(target);

                    if (targetSection) {
                        targetSection.classList.add("active-tab");
                    }

                });

            });


            const generalForm = document.getElementById("generalSettingsForm");

            const fields = [
                "healthCenterName",
                "shortName",
                "address",
                "contactNumber",
                "email",
                "timezone",
                "language"
            ];


            fields.forEach(function (field) {

                const element = document.getElementById(field);
                const saved = localStorage.getItem("settings_" + field);

                if (saved !== null) {
                    element.value = saved;
                }

            });


            generalForm.addEventListener("submit", function (event) {

                event.preventDefault();

                fields.forEach(function (field) {

                    const element = document.getElementById(field);

                    localStorage.setItem(
                        "settings_" + field,
                        element.value
                    );

                });


                const message = document.getElementById("saveMessage");

                message.classList.add("show");

                setTimeout(function () {
                    message.classList.remove("show");
                }, 3000);

            });


            const logoInput = document.getElementById("logoInput");
            const logoPreview = document.getElementById("logoPreview");
            const removeLogo = document.getElementById("removeLogo");


            const savedLogo = localStorage.getItem("healthCenterLogo");

            if (savedLogo) {

                logoPreview.innerHTML =
                    '<img src="' + savedLogo + '" alt="Health Center Logo">';

            }


            logoInput.addEventListener("change", function () {

                const file = this.files[0];

                if (!file) {
                    return;
                }

                const reader = new FileReader();

                reader.onload = function (event) {

                    const imageData = event.target.result;

                    logoPreview.innerHTML =
                        '<img src="' + imageData + '" alt="Health Center Logo">';

                    localStorage.setItem(
                        "healthCenterLogo",
                        imageData
                    );

                };

                reader.readAsDataURL(file);

            });


            removeLogo.addEventListener("click", function () {

                localStorage.removeItem("healthCenterLogo");

                logoPreview.innerHTML =
                    '<i class="fa-solid fa-hospital"></i>';

                logoInput.value = "";

            });


            const preferenceCheckboxes = document.querySelectorAll(
                ".preference-item input[type='checkbox']"
            );


            preferenceCheckboxes.forEach(function (checkbox, index) {

                if (checkbox.id === "darkModeToggle") {
                    return;
                }

                const key = "preference_" + (
                    checkbox.id || "checkbox_" + index
                );

                const saved = localStorage.getItem(key);

                if (saved !== null) {
                    checkbox.checked = saved === "true";
                }


                checkbox.addEventListener("change", function () {

                    localStorage.setItem(
                        key,
                        this.checked
                    );

                });

            });


            const selectElements = document.querySelectorAll(
                ".small-select"
            );


            selectElements.forEach(function (select) {

                const key = "select_" + select.id;

                const saved = localStorage.getItem(key);

                if (saved !== null) {
                    select.value = saved;
                }


                select.addEventListener("change", function () {

                    localStorage.setItem(
                        key,
                        this.value
                    );

                });

            });


            const backupButton = document.getElementById("backupNow");

            backupButton.addEventListener("click", function () {

                const now = new Date();

                const formatted =
                    now.toLocaleDateString() +
                    " · " +
                    now.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    });

                localStorage.setItem(
                    "lastBackup",
                    formatted
                );

                document.getElementById("lastBackup").textContent =
                    formatted;

                alert("Backup process completed successfully.");

            });


            const savedBackup = localStorage.getItem("lastBackup");

            if (savedBackup) {

                document.getElementById("lastBackup").textContent =
                    savedBackup;

            }


            document
                .getElementById("backupHistory")
                .addEventListener("click", function () {

                    alert(
                        "Backup History\n\n" +
                        "No previous backup records available."
                    );

                });


            const maintenanceMode =
                document.getElementById("maintenanceMode");


            maintenanceMode.addEventListener("change", function () {

                if (this.checked) {

                    const confirmMode = confirm(
                        "Enable Maintenance Mode?"
                    );

                    if (!confirmMode) {
                        this.checked = false;
                        return;
                    }

                    localStorage.setItem(
                        "maintenanceMode",
                        "true"
                    );

                } else {

                    localStorage.setItem(
                        "maintenanceMode",
                        "false"
                    );

                }

            });


            const savedMaintenance =
                localStorage.getItem("maintenanceMode");

            if (savedMaintenance === "true") {
                maintenanceMode.checked = true;
            }

        });

    </script>

</body>

</html>