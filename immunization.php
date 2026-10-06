<?php
session_start();
require_once "db.php";

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}

function h($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}

function ageFromBirthDate($birthDate)
{
    if (!$birthDate)
        return "-";
    try {
        $birth = new DateTime($birthDate);
        $today = new DateTime();
        return $today->diff($birth)->y;
    } catch (Exception $e) {
        return "-";
    }
}

function statusClass($status)
{
    $status = strtolower(trim($status));
    if ($status === "completed")
        return "status-completed";
    if ($status === "scheduled")
        return "status-scheduled";
    if ($status === "due soon")
        return "status-due";
    if ($status === "overdue")
        return "status-overdue";
    return "status-default";
}

$conn->query("
    CREATE TABLE IF NOT EXISTS immunization_records (
        immunization_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        vaccine VARCHAR(120) NOT NULL,
        dose VARCHAR(50) NOT NULL,
        date_given DATE NULL,
        age_at_dose VARCHAR(50) NULL,
        batch_no VARCHAR(80) NULL,
        given_by VARCHAR(120) NULL,
        next_dose DATE NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$currentUserId = $_SESSION["user"]["user_id"] ?? null;
$adminName = $_SESSION["user"]["full_name"] ?? "ADMIN CYRON";

$patient = null;

if ($currentUserId) {
    $stmt = $conn->prepare("
        SELECT user_id, first_name, last_name, birth_date, address, contact_number, email
        FROM user_profile
        WHERE user_id = ?
        LIMIT 1
    ");
    if ($stmt) {
        $stmt->bind_param("i", $currentUserId);
        $stmt->execute();
        $result = $stmt->get_result();
        $patient = $result->fetch_assoc();
        $stmt->close();
    }
}

if (!$patient) {
    $result = $conn->query("
        SELECT user_id, first_name, last_name, birth_date, address, contact_number, email
        FROM user_profile
        ORDER BY user_id ASC
        LIMIT 1
    ");
    if ($result && $result->num_rows > 0) {
        $patient = $result->fetch_assoc();
    }
}

if (!$patient) {
    $patient = [
        "user_id" => 1,
        "first_name" => "Juan D.",
        "last_name" => "Dela Cruz",
        "birth_date" => "1990-05-12",
        "address" => "Labin Street, Talimundoc, Orani, Bataan",
        "contact_number" => "0917 123 4567",
        "email" => "juan@example.com"
    ];
}

$patientId = (int) $patient["user_id"];

if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["action"] ?? "") === "add_vaccination") {
    $userId = (int) ($_POST["user_id"] ?? $patientId);
    $vaccine = trim($_POST["vaccine"] ?? "");
    $dose = trim($_POST["dose"] ?? "");
    $dateGiven = trim($_POST["date_given"] ?? "");
    $ageAtDose = trim($_POST["age_at_dose"] ?? "");
    $batchNo = trim($_POST["batch_no"] ?? "");
    $givenBy = trim($_POST["given_by"] ?? "");
    $nextDose = trim($_POST["next_dose"] ?? "");
    $status = trim($_POST["status"] ?? "Completed");

    if ($vaccine !== "" && $dose !== "") {
        $stmt = $conn->prepare("
            INSERT INTO immunization_records
            (user_id, vaccine, dose, date_given, age_at_dose, batch_no, given_by, next_dose, status)
            VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''), ?)
        ");

        if ($stmt) {
            $stmt->bind_param(
                "issssssss",
                $userId,
                $vaccine,
                $dose,
                $dateGiven,
                $ageAtDose,
                $batchNo,
                $givenBy,
                $nextDose,
                $status
            );
            $stmt->execute();
            $stmt->close();
        }
    }

    header("Location: immunization.php?added=1");
    exit;
}

$countResult = $conn->query("SELECT COUNT(*) AS total FROM immunization_records");
$totalRecords = $countResult ? (int) $countResult->fetch_assoc()["total"] : 0;

if ($totalRecords === 0) {
    $sample = [
        [$patientId, "BCG", "1 of 1", "2026-01-05", "3 days", "BCG9234", "BHW Alex", "", "Completed"],
        [$patientId, "Hepatitis B", "3 of 3", "2026-02-11", "6 months", "HEP1128", "BHW Alex", "", "Completed"],
        [$patientId, "DPT Pentavalent", "3 of 3", "2026-03-08", "1 year", "DPT7321", "BHW Alex", "", "Completed"],
        [$patientId, "Polio (OPV/IPV)", "4 of 4", "2026-04-12", "1 year", "OPV9084", "BHW Alex", "", "Completed"],
        [$patientId, "Measles (MMR)", "1 of 2", "2026-05-02", "2 years", "MMR5624", "BHW Alex", "2026-11-02", "Scheduled"],
        [$patientId, "Tetanus Toxoid (TT)", "2 of 5", "2026-06-04", "34 years", "TT7635", "BHW Alex", "2026-11-04", "Due Soon"],
        [$patientId, "Influenza Vaccine", "3 of 1", "", "-", "", "", "2026-12-05", "Overdue"]
    ];

    $stmt = $conn->prepare("
        INSERT INTO immunization_records
        (user_id, vaccine, dose, date_given, age_at_dose, batch_no, given_by, next_dose, status)
        VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''), ?)
    ");

    if ($stmt) {
        foreach ($sample as $row) {
            $stmt->bind_param(
                "issssssss",
                $row[0],
                $row[1],
                $row[2],
                $row[3],
                $row[4],
                $row[5],
                $row[6],
                $row[7],
                $row[8]
            );
            $stmt->execute();
        }
        $stmt->close();
    }
}

$records = [];

$stmt = $conn->prepare("
    SELECT immunization_id, user_id, vaccine, dose, date_given, age_at_dose,
           batch_no, given_by, next_dose, status
    FROM immunization_records
    WHERE user_id = ?
    ORDER BY
        CASE status
            WHEN 'Overdue' THEN 1
            WHEN 'Due Soon' THEN 2
            WHEN 'Scheduled' THEN 3
            ELSE 4
        END,
        date_given DESC,
        immunization_id DESC
");

if ($stmt) {
    $stmt->bind_param("i", $patientId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $records[] = $row;
    }
    $stmt->close();
}

$allCount = count($records);
$completedCount = 0;
$scheduledCount = 0;
$dueSoonCount = 0;
$overdueCount = 0;

foreach ($records as $record) {
    switch (strtolower($record["status"])) {
        case "completed":
            $completedCount++;
            break;
        case "scheduled":
            $scheduledCount++;
            break;
        case "due soon":
            $dueSoonCount++;
            break;
        case "overdue":
            $overdueCount++;
            break;
    }
}

$totalPatients = $conn->query("SELECT COUNT(*) AS total FROM user_profile");
$totalPatients = $totalPatients ? (int) $totalPatients->fetch_assoc()["total"] : 423;

$fullyImmunized = max($completedCount, 0);
$dueThisMonth = $scheduledCount + $dueSoonCount;
$overdue = $overdueCount;
$vaccinesToday = 18;

$coverage = $allCount > 0 ? min(100, round(($completedCount / $allCount) * 100)) : 0;
if ($coverage === 0 && $allCount > 0)
    $coverage = 1;

$patientName = trim($patient["first_name"] . " " . $patient["last_name"]);
$patientAge = ageFromBirthDate($patient["birth_date"]);

$upcoming = [];
foreach ($records as $record) {
    if (in_array(strtolower($record["status"]), ["scheduled", "due soon", "overdue"])) {
        $upcoming[] = $record;
    }
}

$conn->close();

include "sidebar.php";

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Immunization and Vaccination</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="immunization.css">
    <script src="darkmode.js"></script>
</head>

<body>

    <main class="main-content">

        <header class="page-header">
            <div>
                <h1>Immunization and Vaccination</h1>
                <p>Track, manage, and monitor immunization records and vaccination schedules.</p>
            </div>

            <div class="header-right">
                <div class="admin-profile">
                    <div class="admin-text">
                        <small>You are logged in as</small>
                        <strong><?php echo h($adminName); ?></strong>
                    </div>

                    <div class="admin-photo">
                        <img src="icons/admin.png" alt="Admin Icon"
                            onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <i class="fa-solid fa-user" style="display:none;"></i>
                    </div>
                </div>

                <button class="ask-ai" type="button" onclick="window.location.href='ai-moto.php'">
                    <i class="fa-solid fa-plus"></i> Ask AI Moto
                </button>
            </div>
        </header>

        <?php if (isset($_GET["added"])): ?>
            <div class="success-message">
                <i class="fa-solid fa-circle-check"></i>
                Vaccination record added successfully.
            </div>
        <?php endif; ?>

        <section class="summary-cards">

            <div class="summary-card card-blue">
                <div class="summary-icon">
                    <img src="icons/immunization-patients.png" alt="Patients"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fa-solid fa-syringe" style="display:none;"></i>
                </div>
                <div>
                    <span>Total Patients</span>
                    <strong><?php echo number_format($totalPatients); ?></strong>
                    <small>Registered in program</small>
                </div>
            </div>

            <div class="summary-card card-green">
                <div class="summary-icon">
                    <img src="icons/fully-immunized.png" alt="Fully Immunized"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fa-solid fa-shield-heart" style="display:none;"></i>
                </div>
                <div>
                    <span>Fully Immunized</span>
                    <strong><?php echo $fullyImmunized; ?></strong>
                    <small><?php echo $coverage; ?>% of total patients</small>
                </div>
            </div>

            <div class="summary-card card-orange">
                <div class="summary-icon">
                    <img src="icons/due-this-month.png" alt="Due This Month"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fa-solid fa-calendar-days" style="display:none;"></i>
                </div>
                <div>
                    <span>Due This Month</span>
                    <strong><?php echo $dueThisMonth; ?></strong>
                    <small>Upcoming vaccines</small>
                </div>
            </div>

            <div class="summary-card card-red">
                <div class="summary-icon">
                    <img src="icons/overdue-vaccines.png" alt="Overdue"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fa-solid fa-triangle-exclamation" style="display:none;"></i>
                </div>
                <div>
                    <span>Overdue</span>
                    <strong><?php echo $overdue; ?></strong>
                    <small>Missed vaccines</small>
                </div>
            </div>

            <div class="summary-card card-purple">
                <div class="summary-icon">
                    <img src="icons/vaccines-today.png" alt="Vaccines Today"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <i class="fa-solid fa-syringe" style="display:none;"></i>
                </div>
                <div>
                    <span>Vaccines Today</span>
                    <strong><?php echo $vaccinesToday; ?></strong>
                    <small>Scheduled for today</small>
                </div>
            </div>

        </section>

        <section class="record-card card">

            <div class="record-tabs">
                <button class="record-tab active" type="button" data-tab="records">Patient Immunization Record</button>
                <button class="record-tab" type="button" data-tab="schedule">Vaccination Schedule</button>
                <button class="record-tab" type="button" data-tab="inventory">Vaccine Inventory</button>
                <button class="record-tab" type="button" data-tab="reports">Reports</button>
            </div>

            <div class="record-body">

                <div class="tab-panel active" id="records">

                    <div class="record-main">

                        <div class="filters">
                            <div class="search-field">
                                <i class="fa-solid fa-magnifying-glass"></i>
                                <input type="text" id="vaccineSearch" placeholder="Search vaccine name...">
                            </div>

                            <select id="ageFilter">
                                <option value="">All Age Groups</option>
                                <option value="child">Children</option>
                                <option value="adult">Adults</option>
                            </select>

                            <select id="statusFilter">
                                <option value="">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Scheduled">Scheduled</option>
                                <option value="Due Soon">Due Soon</option>
                                <option value="Overdue">Overdue</option>
                            </select>

                            <button class="filter-button" type="button" onclick="applyFilters()">
                                <i class="fa-solid fa-filter"></i> Filter
                            </button>
                        </div>

                        <div class="patient-strip">
                            <div class="patient-avatar">
                                <img src="icons/patient.png" alt="Patient Icon"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                <i class="fa-solid fa-user" style="display:none;"></i>
                            </div>

                            <div class="patient-info">
                                <h2><?php echo h($patientName); ?></h2>
                                <div class="patient-meta">
                                    <span>Patient ID: PT-<?php echo str_pad($patientId, 4, "0", STR_PAD_LEFT); ?></span>
                                    <span>|</span>
                                    <span><?php echo $patientAge; ?> yrs</span>
                                    <span>|</span>
                                    <span><?php echo h(date("M d, Y", strtotime($patient["birth_date"]))); ?></span>
                                </div>
                                <div class="patient-contact">
                                    <span><i
                                            class="fa-solid fa-phone"></i><?php echo h($patient["contact_number"]); ?></span>
                                    <span><i
                                            class="fa-solid fa-location-dot"></i><?php echo h($patient["address"]); ?></span>
                                </div>
                            </div>

                            <div class="patient-actions">
                                <a class="view-profile" href="patient-registration.php">
                                    View Profile
                                </a>
                                <button class="add-button" type="button" onclick="openModal()">
                                    <i class="fa-solid fa-plus"></i> Add Vaccination
                                </button>
                            </div>
                        </div>

                        <div class="table-title">Vaccination History</div>

                        <div class="table-wrap">
                            <table class="vaccination-table">
                                <thead>
                                    <tr>
                                        <th>Vaccine</th>
                                        <th>Dose</th>
                                        <th>Date Given</th>
                                        <th>Age at Dose</th>
                                        <th>Batch No.</th>
                                        <th>Given By</th>
                                        <th>Next Dose</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="vaccinationBody">
                                    <?php foreach ($records as $record): ?>
                                        <tr data-vaccine="<?php echo h(strtolower($record["vaccine"])); ?>"
                                            data-status="<?php echo h($record["status"]); ?>"
                                            data-age="<?php echo h(strtolower($record["age_at_dose"])); ?>">
                                            <td><span
                                                    class="dot <?php echo h(statusClass($record["status"])); ?>"></span><?php echo h($record["vaccine"]); ?>
                                            </td>
                                            <td><?php echo h($record["dose"]); ?></td>
                                            <td><?php echo $record["date_given"] ? h(date("m/d/Y", strtotime($record["date_given"]))) : "-"; ?>
                                            </td>
                                            <td><?php echo h($record["age_at_dose"] ?: "-"); ?></td>
                                            <td><?php echo h($record["batch_no"] ?: "-"); ?></td>
                                            <td><?php echo h($record["given_by"] ?: "-"); ?></td>
                                            <td><?php echo $record["next_dose"] ? h(date("m/d/Y", strtotime($record["next_dose"]))) : "-"; ?>
                                            </td>
                                            <td><span
                                                    class="status-pill <?php echo h(statusClass($record["status"])); ?>"><?php echo h($record["status"]); ?></span>
                                            </td>
                                            <td>
                                                <button class="icon-action" type="button" title="View Record"
                                                    onclick="viewRecord(this)">
                                                    <i class="fa-regular fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>

                        <div class="legend">
                            <span><i class="dot status-completed"></i> Completed</span>
                            <span><i class="dot status-scheduled"></i> Scheduled</span>
                            <span><i class="dot status-due"></i> Due Soon</span>
                            <span><i class="dot status-overdue"></i> Overdue</span>
                        </div>

                        <div class="notice">
                            <i class="fa-solid fa-circle-info"></i>
                            <span>Ensure all vaccines are given according to the National Immunization Program (NIP)
                                schedule. Click the eye icon to view detailed record of each vaccine.</span>
                        </div>

                    </div>

                    <aside class="right-column">

                        <div class="side-card card">
                            <div class="side-heading">
                                <h3>Upcoming Vaccinations</h3>
                                <a href="#">View All</a>
                            </div>

                            <?php if (count($upcoming) > 0): ?>
                                <?php foreach (array_slice($upcoming, 0, 4) as $record): ?>
                                    <div class="upcoming-item">
                                        <div class="upcoming-date">
                                            <?php
                                            $date = $record["next_dose"] ?: $record["date_given"];
                                            echo $date ? h(date("M d, Y", strtotime($date))) : "-";
                                            ?>
                                            <small><?php echo h($record["status"]); ?></small>
                                        </div>
                                        <div class="upcoming-info">
                                            <strong><?php echo h($patientName); ?></strong>
                                            <span><?php echo h($record["vaccine"]); ?></span>
                                        </div>
                                        <span class="mini-status <?php echo h(statusClass($record["status"])); ?>">
                                            <?php echo h($record["status"]); ?>
                                        </span>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <div class="empty-state">No upcoming vaccinations.</div>
                            <?php endif; ?>

                            <a class="view-schedule" href="#">View full schedule <i
                                    class="fa-solid fa-arrow-right"></i></a>
                        </div>

                        <div class="side-card card coverage-card">
                            <div class="side-heading">
                                <h3>Immunization Coverage (This Year)</h3>
                            </div>

                            <div class="coverage-content">
                                <div class="donut" style="--coverage: <?php echo $coverage; ?>%;">
                                    <div>
                                        <strong><?php echo $coverage; ?>%</strong>
                                        <span>Fully Immunized</span>
                                    </div>
                                </div>

                                <div class="coverage-legend">
                                    <div><i class="green"></i><span>Fully
                                            Immunized</span><strong><?php echo $completedCount; ?></strong></div>
                                    <div><i class="orange"></i><span>Partially
                                            Immunized</span><strong><?php echo $scheduledCount; ?></strong></div>
                                    <div><i class="red"></i><span>Not
                                            Immunized</span><strong><?php echo $overdueCount; ?></strong></div>
                                    <b>Total Registered: <?php echo $allCount; ?></b>
                                </div>
                            </div>
                        </div>

                        <div class="side-card card">
                            <div class="side-heading">
                                <h3>Alerts &amp; Reminders</h3>
                            </div>

                            <div class="alert-row warning">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <span><?php echo $overdue; ?> patients with overdue vaccines</span>
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>

                            <div class="alert-row info">
                                <i class="fa-solid fa-circle-info"></i>
                                <span><?php echo $dueThisMonth; ?> patients with vaccines due this month</span>
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>

                            <div class="alert-row success">
                                <i class="fa-solid fa-circle-check"></i>
                                <span>Vaccine inventory is up to date</span>
                                <i class="fa-solid fa-arrow-right"></i>
                            </div>
                        </div>

                    </aside>

                </div>

                <div class="tab-panel" id="schedule">
                    <div class="placeholder-panel">
                        <div class="placeholder-icon">
                            <i class="fa-solid fa-calendar-days"></i>
                        </div>
                        <h2>Vaccination Schedule</h2>
                        <p>Use this section to manage upcoming vaccination schedules and due dates.</p>
                    </div>
                </div>

                <div class="tab-panel" id="inventory">
                    <div class="placeholder-panel">
                        <div class="placeholder-icon">
                            <i class="fa-solid fa-boxes-stacked"></i>
                        </div>
                        <h2>Vaccine Inventory</h2>
                        <p>Use this section to monitor vaccine stock and availability.</p>
                    </div>
                </div>

                <div class="tab-panel" id="reports">
                    <div class="placeholder-panel">
                        <div class="placeholder-icon">
                            <i class="fa-solid fa-chart-column"></i>
                        </div>
                        <h2>Immunization Reports</h2>
                        <p>Use this section for immunization summaries and reports.</p>
                    </div>
                </div>

            </div>
        </section>

    </main>

    <div class="modal" id="vaccinationModal">
        <div class="modal-box">
            <div class="modal-header">
                <h2>Add Vaccination Record</h2>
                <button type="button" onclick="closeModal()">&times;</button>
            </div>

            <form method="POST">
                <input type="hidden" name="action" value="add_vaccination">
                <input type="hidden" name="user_id" value="<?php echo $patientId; ?>">

                <div class="form-grid">
                    <label>
                        Vaccine
                        <input type="text" name="vaccine" required placeholder="e.g. MMR">
                    </label>

                    <label>
                        Dose
                        <input type="text" name="dose" required placeholder="e.g. 1 of 2">
                    </label>

                    <label>
                        Date Given
                        <input type="date" name="date_given">
                    </label>

                    <label>
                        Age at Dose
                        <input type="text" name="age_at_dose" placeholder="e.g. 2 years">
                    </label>

                    <label>
                        Batch No.
                        <input type="text" name="batch_no" placeholder="e.g. MMR1234">
                    </label>

                    <label>
                        Given By
                        <input type="text" name="given_by" placeholder="e.g. BHW Alex">
                    </label>

                    <label>
                        Next Dose
                        <input type="date" name="next_dose">
                    </label>

                    <label>
                        Status
                        <select name="status">
                            <option value="Completed">Completed</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Due Soon">Due Soon</option>
                            <option value="Overdue">Overdue</option>
                        </select>
                    </label>
                </div>

                <div class="modal-actions">
                    <button class="cancel-button" type="button" onclick="closeModal()">Cancel</button>
                    <button class="save-button" type="submit">Save Vaccination</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        function openModal() {
            document.getElementById("vaccinationModal").classList.add("show");
        }

        function closeModal() {
            document.getElementById("vaccinationModal").classList.remove("show");
        }

        document.getElementById("vaccinationModal").addEventListener("click", function (e) {
            if (e.target === this) closeModal();
        });

        function applyFilters() {
            const search = document.getElementById("vaccineSearch").value.toLowerCase().trim();
            const status = document.getElementById("statusFilter").value.toLowerCase();
            const age = document.getElementById("ageFilter").value.toLowerCase();

            document.querySelectorAll("#vaccinationBody tr").forEach(function (row) {
                const vaccine = row.dataset.vaccine || "";
                const rowStatus = (row.dataset.status || "").toLowerCase();
                const rowAge = (row.dataset.age || "").toLowerCase();

                const matchesSearch = !search || vaccine.includes(search);
                const matchesStatus = !status || rowStatus === status;

                let matchesAge = true;
                if (age === "child") {
                    matchesAge = /day|month|year/.test(rowAge) && !/3[0-9]|4[0-9]|5[0-9]|6[0-9]/.test(rowAge);
                } else if (age === "adult") {
                    matchesAge = /3[0-9]|4[0-9]|5[0-9]|6[0-9]|adult/.test(rowAge);
                }

                row.style.display = matchesSearch && matchesStatus && matchesAge ? "" : "none";
            });
        }

        document.getElementById("vaccineSearch").addEventListener("input", applyFilters);
        document.getElementById("statusFilter").addEventListener("change", applyFilters);
        document.getElementById("ageFilter").addEventListener("change", applyFilters);

        document.querySelectorAll(".record-tab").forEach(function (tab) {
            tab.addEventListener("click", function () {
                document.querySelectorAll(".record-tab").forEach(function (item) {
                    item.classList.remove("active");
                });

                document.querySelectorAll(".tab-panel").forEach(function (panel) {
                    panel.classList.remove("active");
                });

                this.classList.add("active");
                document.getElementById(this.dataset.tab).classList.add("active");
            });
        });

        function viewRecord(button) {
            const row = button.closest("tr");
            const cells = row.querySelectorAll("td");

            alert(
                "Vaccine: " + cells[0].innerText.trim() +
                "\nDose: " + cells[1].innerText.trim() +
                "\nDate Given: " + cells[2].innerText.trim() +
                "\nAge at Dose: " + cells[3].innerText.trim() +
                "\nBatch No.: " + cells[4].innerText.trim() +
                "\nGiven By: " + cells[5].innerText.trim() +
                "\nNext Dose: " + cells[6].innerText.trim() +
                "\nStatus: " + cells[7].innerText.trim()
            );
        }
    </script>

</body>

</html>