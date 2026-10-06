<?php
session_start();

if (!isset($_SESSION['user'])) {
    header("Location: login.php");
    exit;
}

$firstName = $_SESSION['user']['first_name'];
$lastName = $_SESSION['user']['last_name'];
$email = $_SESSION['user']['email'];
$role = $_SESSION['user']['role'];
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Assistant</title>
    <link rel="stylesheet" href="home.css">
</head>

    <body>

        <aside class="sidebar">

            <div class="brand">
                <img src="logo.png" alt="Smart Assistant Logo" class="logo">

                <div class="brand-text">
                    <h1>SMART</h1>
                    <h2>ASSISTANT</h2>
                </div>
            </div>

            <div class="menu">

                <div class="menu-section">

                    <button class="menu-title"
                        onclick="toggleMenu('coreFeatures')">
                        CORE FEATURES
                    </button>

                    <div class="submenu" id="coreFeatures">
                        <a href="dashboard.php">Dashboard</a>
                        <a href="patient_records.php">Patient Registration &amp;
                            Record</a>
                        <a href="consultation.php">Consultation &amp; Medical
                            Record</a>
                        <a href="inventory.php">Inventory &amp; Medicine
                            Tracking</a>
                        <a href="medicine_issuance.php">Medicine Issuance</a>
                        <a href="ai_assistant.php">AI Assistant</a>
                    </div>

                </div>

                <div class="menu-section">

                    <button class="menu-title"
                        onclick="toggleMenu('healthPrograms')">
                        HEALTH PROGRAMS
                    </button>

                    <div class="submenu" id="healthPrograms">
                        <a href="immunization.php">Immunization &amp;
                            Vaccination</a>
                        <a href="maternal_child.php">Maternal &amp; Child
                            Health</a>
                        <a href="tb_dots.php">TB DOTS</a>
                        <a href="health_education.php">Health Education Post</a>
                    </div>

                </div>

                <div class="menu-section">

                    <button class="menu-title"
                        onclick="toggleMenu('operations')">
                        OPERATIONS
                    </button>

                    <div class="submenu" id="operations">
                        <a href="reports.php">Reports</a>
                        <a href="settings.php">Settings</a>
                    </div>

                </div>

            </div>

            <a class="logout-btn" href="logout.php">
                Log Out
            </a>

        </aside>

        <main class="main">

            <header class="topbar">
                Home
            </header>

            <section class="home-content">

                <div class="home-card">

                    <div class="home-logo">
                        <img src="logo.png" alt="Smart Assistant Logo">
                    </div>

                    <div class="home-text">

                        <h1>Smart Assistant</h1>

                        <h3>
                            Welcome, <?php echo htmlspecialchars($firstName .
                            ' ' . $lastName); ?>
                        </h3>

                        <p>
                            Smart Assistant is a web-based healthcare system
                            developed for Barangay Talimundoc Health Center.
                        </p>

                        <p>
                            The system provides an organized platform for
                            managing patient information, medical records,
                            healthcare programs, medicine tracking, and
                            health-related information.
                        </p>

                        <p>
                            Smart Assistant is designed to support healthcare
                            personnel in managing daily health center activities
                            and providing accessible healthcare information.
                        </p>

                    </div>

                </div>

                <div class="welcome-card">

                    <h2>Welcome to Smart Assistant</h2>

                    <p>
                        Use the menu on the left to access the different
                        features, health programs, and operations of the
                        Barangay Talimundoc Health Center system.
                    </p>

                </div>

            </section>

        </main>

        <script>
function toggleMenu(menuId) {
const menu = document.getElementById(menuId);
menu.classList.toggle("active");
}
</script>

    </body>
</html>