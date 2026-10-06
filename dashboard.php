<?php
session_start();

if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true) {
    header("Location: login.php");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>Smart Assistant Dashboard</title>

    <link rel="stylesheet" href="dashboard.css" />

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
    >
</head>

<body>
    <div class="app">
        <aside class="sidebar">
            <div class="sidebar-scroll">
                
             <div class="brand">

    <img src="logo.png" alt="Smart Assistant Logo" class="logo">

    <div class="brand-text">
        <h1>SMART</h1>
        <h2>ASSISTANT</h2>
    </div>

</div>

                <div class="menu">
                    <div class="menu-title">CORE FEATURES</div>
                    <a class="active" href="#">Dashboard</a>
                    <a href="#">Patient Registration &amp; Record</a>
                    <a href="#">Consultation &amp; Medical Record</a>
                    <a href="#">Inventory &amp; Medicine Tracking</a>
                    <a href="#">Medicine Issuance</a>
                    <a href="#">AI Assistant</a>

                    <div class="menu-title">HEALTH PROGRAMS</div>
                    <a href="#">Immunization &amp; Vaccination</a>
                    <a href="#">Maternal &amp; Child Health</a>
                    <a href="#">TB DOTS</a>
                    <a href="#">Health Education Post</a>

                    <div class="menu-title">OPERATIONS</div>
                    <a href="#">Reports</a>
                    <a href="#">Settings</a>
                </div>
            </div>

            <a class="logout-btn" href="logout.php">Log Out</a>
        </aside>

        <main class="main">
            <header class="topbar">Dashboard</header>

            <section class="content">
                <div class="stats-row">
                    <div class="stat-card"></div>
                    <div class="stat-card"></div>
                    <div class="stat-card"></div>
                    <div class="stat-card"></div>
                </div>

                <div class="middle-row">
                    <div class="left-stack">
                        <div class="info-card"></div>
                        <div class="info-card"></div>
                        <div class="info-card"></div>
                    </div>

                    <div class="calendar-card">
                        <div class="calendar-header">
                            <button id="prevMonth" class="cal-btn">&#9664;</button>
                            <h3 id="monthYear"></h3>
                            <button id="nextMonth" class="cal-btn">&#9654;</button>
                        </div>

                        <div class="calendar-grid" id="calendarDays"></div>
                    </div>

                    <div class="right-panel"></div>
                </div>
            </section>
        </main>
    </div>

    <script>
        const monthYear = document.getElementById("monthYear");
        const calendarDays = document.getElementById("calendarDays");
        const prevMonth = document.getElementById("prevMonth");
        const nextMonth = document.getElementById("nextMonth");

        const months = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        let currentDate = new Date();

        function renderCalendar(date) {
            const year = date.getFullYear();
            const month = date.getMonth();

            monthYear.textContent = `${months[month]} ${year}`;
            calendarDays.innerHTML = "";

            const daysHeader = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

            daysHeader.forEach(day => {
                const div = document.createElement("div");
                div.className = "day-name";
                div.textContent = day;
                calendarDays.appendChild(div);
            });

            const firstDayIndex = new Date(year, month, 1).getDay();
            const lastDate = new Date(year, month + 1, 0).getDate();
            const prevLastDate = new Date(year, month, 0).getDate();

            for (let i = firstDayIndex - 1; i >= 0; i--) {
                const div = document.createElement("div");
                div.className = "date muted";
                div.textContent = prevLastDate - i;
                calendarDays.appendChild(div);
            }

            for (let i = 1; i <= lastDate; i++) {
                const div = document.createElement("div");
                div.className = "date";
                div.textContent = i;

                const today = new Date();
                if (
                    i === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()
                ) {
                    div.classList.add("today");
                }

                calendarDays.appendChild(div);
            }

            const currentCells = calendarDays.children.length;
            const remaining = 42 - currentCells;

            for (let i = 1; i <= remaining; i++) {
                const div = document.createElement("div");
                div.className = "date muted";
                div.textContent = i;
                calendarDays.appendChild(div);
            }
        }

        prevMonth.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendar(currentDate);
        });

        nextMonth.addEventListener("click", () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendar(currentDate);
        });

        renderCalendar(currentDate);
    </script>
</body>

</html>