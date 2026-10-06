<?php

session_start();

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}

$role = strtolower($_SESSION["user"]["role"] ?? "");

if ($role !== "admin" && $role !== "super admin") {
    header("Location: login.php?error=access_denied");
    exit;
}

require_once "db.php";

$adminName = $_SESSION["user"]["full_name"] ?? "ADMIN";


function tableExists($conn, $table)
{
    $table = $conn->real_escape_string($table);

    $result = $conn->query("
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '$table'
        LIMIT 1
    ");

    return $result && $result->num_rows > 0;
}


function getTable($conn, $tables)
{
    foreach ($tables as $table) {
        if (tableExists($conn, $table)) {
            return $table;
        }
    }

    return null;
}


function columnExists($conn, $table, $column)
{
    if (!$table) {
        return false;
    }

    $table = $conn->real_escape_string($table);
    $column = $conn->real_escape_string($column);

    $result = $conn->query("
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '$table'
        AND COLUMN_NAME = '$column'
        LIMIT 1
    ");

    return $result && $result->num_rows > 0;
}


function getColumn($conn, $table, $columns)
{
    if (!$table) {
        return null;
    }

    foreach ($columns as $column) {
        if (columnExists($conn, $table, $column)) {
            return $column;
        }
    }

    return null;
}


function countRows($conn, $table)
{
    if (!$table) {
        return 0;
    }

    $result = $conn->query("SELECT COUNT(*) AS total FROM `$table`");

    if ($result) {
        $row = $result->fetch_assoc();
        return (int) $row["total"];
    }

    return 0;
}


function countToday($conn, $table, $dateColumn)
{
    if (!$table || !$dateColumn) {
        return 0;
    }

    $result = $conn->query("
        SELECT COUNT(*) AS total
        FROM `$table`
        WHERE DATE(`$dateColumn`) = CURDATE()
    ");

    if ($result) {
        $row = $result->fetch_assoc();
        return (int) $row["total"];
    }

    return 0;
}


function getRows($conn, $sql)
{
    $rows = array();

    $result = $conn->query($sql);

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
    }

    return $rows;
}


$userTable = getTable($conn, array(
    "user_profile",
    "users",
    "patients"
));

$patientCount = countRows($conn, $userTable);

$medicalTable = getTable($conn, array(
    "medical_record",
    "medical_records",
    "consultation",
    "consultations",
    "patient_records"
));

$diagnosisColumn = getColumn($conn, $medicalTable, array(
    "diagnosis",
    "diagnoses",
    "medical_condition",
    "condition",
    "case"
));

$medicalDateColumn = getColumn($conn, $medicalTable, array(
    "date",
    "date_recorded",
    "record_date",
    "consultation_date",
    "date_consulted",
    "created_at"
));


$maternalTable = getTable($conn, array(
    "maternal_health",
    "maternal_cases",
    "maternal_records",
    "maternal"
));

$maternalCount = countRows($conn, $maternalTable);


$childTable = getTable($conn, array(
    "infant_child_health",
    "infant_child_records",
    "child_health",
    "child_records",
    "infant_health"
));

$childCount = countRows($conn, $childTable);


$tbTable = getTable($conn, array(
    "tb_dots",
    "tb_dots_cases",
    "tb_records",
    "tb_cases",
    "tuberculosis"
));

$tbCount = countRows($conn, $tbTable);



$inventoryTable = getTable($conn, array(
    "medicine_inventory",
    "inventory",
    "medicines",
    "medicine"
));

$inventoryQuantityColumn = getColumn($conn, $inventoryTable, array(
    "quantity",
    "stock",
    "stock_quantity",
    "available_quantity",
    "current_stock"
));

$inventoryThresholdColumn = getColumn($conn, $inventoryTable, array(
    "reorder_level",
    "minimum_stock",
    "min_stock",
    "low_stock_level",
    "threshold"
));

$medicineTotal = 0;
$lowStockCount = 0;
$outOfStockCount = 0;
$adequateStockCount = 0;

if ($inventoryTable && $inventoryQuantityColumn) {

    $medicineTotal = countRows($conn, $inventoryTable);

    if ($inventoryThresholdColumn) {

        $result = $conn->query("
            SELECT
                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` <= 0 THEN 1
                        ELSE 0
                    END
                ) AS out_stock,

                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` > 0
                        AND `$inventoryQuantityColumn` <= `$inventoryThresholdColumn`
                        THEN 1
                        ELSE 0
                    END
                ) AS low_stock,

                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` > `$inventoryThresholdColumn`
                        THEN 1
                        ELSE 0
                    END
                ) AS adequate_stock

            FROM `$inventoryTable`
        ");

        if ($result) {
            $row = $result->fetch_assoc();

            $outOfStockCount = (int) ($row["out_stock"] ?? 0);
            $lowStockCount = (int) ($row["low_stock"] ?? 0);
            $adequateStockCount = (int) ($row["adequate_stock"] ?? 0);
        }

    } else {

        $result = $conn->query("
            SELECT
                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` <= 0 THEN 1
                        ELSE 0
                    END
                ) AS out_stock,

                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` > 0
                        AND `$inventoryQuantityColumn` <= 10
                        THEN 1
                        ELSE 0
                    END
                ) AS low_stock,

                SUM(
                    CASE
                        WHEN `$inventoryQuantityColumn` > 10
                        THEN 1
                        ELSE 0
                    END
                ) AS adequate_stock

            FROM `$inventoryTable`
        ");

        if ($result) {
            $row = $result->fetch_assoc();

            $outOfStockCount = (int) ($row["out_stock"] ?? 0);
            $lowStockCount = (int) ($row["low_stock"] ?? 0);
            $adequateStockCount = (int) ($row["adequate_stock"] ?? 0);
        }
    }
}


$appointmentTable = getTable($conn, array(
    "appointment",
    "appointments",
    "appointment_schedule",
    "appointments_schedule"
));

$appointmentDateColumn = getColumn($conn, $appointmentTable, array(
    "appointment_date",
    "date",
    "schedule_date",
    "date_appointment"
));

$appointmentTimeColumn = getColumn($conn, $appointmentTable, array(
    "appointment_time",
    "time",
    "schedule_time",
    "time_appointment"
));

$appointmentStatusColumn = getColumn($conn, $appointmentTable, array(
    "status",
    "appointment_status"
));

$appointmentNameColumn = getColumn($conn, $appointmentTable, array(
    "patient_name",
    "name",
    "full_name",
    "patient"
));

$todayAppointments = 0;

if ($appointmentTable && $appointmentDateColumn) {

    $sql = "
        SELECT COUNT(*) AS total
        FROM `$appointmentTable`
        WHERE DATE(`$appointmentDateColumn`) = CURDATE()
    ";

    if ($appointmentStatusColumn) {
        $sql .= "
            AND LOWER(`$appointmentStatusColumn`) NOT IN
            ('cancelled', 'canceled', 'rejected')
        ";
    }

    $result = $conn->query($sql);

    if ($result) {
        $row = $result->fetch_assoc();
        $todayAppointments = (int) $row["total"];
    }
}



$appointmentRows = array();

if ($appointmentTable && $appointmentDateColumn) {

    $selectName = $appointmentNameColumn
        ? "`$appointmentNameColumn` AS patient_name"
        : "'' AS patient_name";

    $selectTime = $appointmentTimeColumn
        ? "`$appointmentTimeColumn` AS appointment_time"
        : "'' AS appointment_time";

    $sql = "
        SELECT
            $selectName,
            $selectTime
        FROM `$appointmentTable`
        WHERE DATE(`$appointmentDateColumn`) = CURDATE()
    ";

    if ($appointmentStatusColumn) {
        $sql .= "
            AND LOWER(`$appointmentStatusColumn`) NOT IN
            ('cancelled', 'canceled', 'rejected')
        ";
    }

    if ($appointmentTimeColumn) {
        $sql .= " ORDER BY `$appointmentTimeColumn` ASC ";
    }

    $sql .= " LIMIT 5";

    $appointmentRows = getRows($conn, $sql);
}



$announcementRows = array();

if (tableExists($conn, "announcements")) {

    $announcementDateColumn = getColumn($conn, "announcements", array(
        "date_posted",
        "created_at",
        "date_created"
    ));

    $announcementTitleColumn = getColumn($conn, "announcements", array(
        "title",
        "announcement_title"
    ));

    $announcementMessageColumn = getColumn($conn, "announcements", array(
        "message",
        "content",
        "description"
    ));

    if ($announcementDateColumn) {

        $titleSelect = $announcementTitleColumn
            ? "`$announcementTitleColumn` AS title"
            : "'' AS title";

        $messageSelect = $announcementMessageColumn
            ? "`$announcementMessageColumn` AS message"
            : "'' AS message";

        $announcementRows = getRows($conn, "
            SELECT
                $titleSelect,
                $messageSelect,
                `$announcementDateColumn` AS date_posted
            FROM announcements
            ORDER BY `$announcementDateColumn` DESC
            LIMIT 2
        ");
    }
}


$issuanceTable = getTable($conn, array(
    "medicine_issuance",
    "medicine_issued",
    "medicine_distribution",
    "issuance",
    "medicine_issuance_records"
));

$issuanceDateColumn = getColumn($conn, $issuanceTable, array(
    "date_issued",
    "issuance_date",
    "date",
    "created_at"
));

$todayIssuance = 0;

if ($issuanceTable && $issuanceDateColumn) {
    $todayIssuance = countToday(
        $conn,
        $issuanceTable,
        $issuanceDateColumn
    );
}



$healthCases = array();

if ($medicalTable && $diagnosisColumn) {

    $healthCases = getRows($conn, "
        SELECT
            `$diagnosisColumn` AS diagnosis,
            COUNT(*) AS total
        FROM `$medicalTable`
        WHERE `$diagnosisColumn` IS NOT NULL
        AND TRIM(`$diagnosisColumn`) <> ''
        GROUP BY `$diagnosisColumn`
        ORDER BY total DESC
        LIMIT 4
    ");
}



$immunizationTable = getTable($conn, array(
    "immunization",
    "immunization_records",
    "vaccination",
    "vaccination_records"
));

$healthEducationTable = getTable($conn, array(
    "health_education_post",
    "health_education",
    "health_education_posts"
));

$immunizationCount = countRows($conn, $immunizationTable);
$healthEducationCount = countRows($conn, $healthEducationTable);


$todaySchedule = array();

if ($appointmentTable && $appointmentDateColumn) {

    $scheduleNameColumn = getColumn($conn, $appointmentTable, array(
        "service",
        "appointment_type",
        "type",
        "purpose",
        "reason"
    ));

    if ($scheduleNameColumn) {

        $selectSchedule = "`$scheduleNameColumn` AS schedule_name";

        $scheduleTime = $appointmentTimeColumn
            ? "`$appointmentTimeColumn` AS schedule_time"
            : "'' AS schedule_time";

        $todaySchedule = getRows($conn, "
            SELECT
                $scheduleTime,
                $selectSchedule
            FROM `$appointmentTable`
            WHERE DATE(`$appointmentDateColumn`) = CURDATE()
            ORDER BY " .
            ($appointmentTimeColumn
                ? "`$appointmentTimeColumn` ASC"
                : "`$appointmentDateColumn` ASC") . "
            LIMIT 6
        ");
    }
}

include "sidebar.php";

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard | Smart Assistant</title>
    <link rel="stylesheet" href="sidebar.css">
    <link rel="stylesheet" href="dashboard.css">
    <script src="darkmode.js"></script>

</head>

<body>
    <main class="main-content">


        <div class="dashboard-header">

            <div>

                <h1>
                    Welcome,
                    <?php echo htmlspecialchars(strtoupper($adminName)); ?>!
                </h1>

                <p>
                    Here's what's happening in your health center today.
                </p>

            </div>


            <div class="admin-profile">

                <div class="admin-info">

                    <span>You are logged in as:</span>

                    <strong>
                        <?php echo htmlspecialchars(strtoupper($role)); ?>
                    </strong>

                </div>


                <div class="profile-image">

                    <img src="logo.png" alt="Admin">

                </div>

            </div>

        </div>


        <div class="ai-button-container">

            <a href="ai-moto.php" class="ai-button">

                <img src="icons/ai moto.png" alt="">

                Ask AI Moto

            </a>

        </div>

        <section class="summary-cards">


            <div class="summary-card">

                <div class="summary-icon">
                    <img src="icons/total registered patients.png" alt="">
                </div>

                <div class="summary-content">

                    <h3>Total Registered</h3>
                    <h3>Patient</h3>

                    <strong>
                        <?php echo str_pad($patientCount, 3, "0", STR_PAD_LEFT); ?>
                    </strong>

                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon">
                    <img src="icons/maternal health.png" alt="">
                </div>

                <div class="summary-content">

                    <h3>Active Maternal</h3>
                    <h3>Cases (Buntis)</h3>

                    <strong>
                        <?php echo str_pad($maternalCount, 3, "0", STR_PAD_LEFT); ?>
                    </strong>

                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon">
                    <img src="icons/infants and child monitoring.png" alt="">
                </div>

                <div class="summary-content">

                    <h3>Infant and Child</h3>
                    <h3>Monitoring</h3>

                    <strong>
                        <?php echo str_pad($childCount, 3, "0", STR_PAD_LEFT); ?>
                    </strong>

                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon">
                    <img src="icons/tbdots cases.png" alt="">
                </div>

                <div class="summary-content">

                    <h3>TB DOTS</h3>
                    <h3>Cases</h3>

                    <strong>
                        <?php echo str_pad($tbCount, 3, "0", STR_PAD_LEFT); ?>
                    </strong>

                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon">
                    <img src="icons/low stock drugs alert.png" alt="">
                </div>

                <div class="summary-content">

                    <h3>Low Stock Drugs</h3>
                    <h3>Alert</h3>

                    <strong>
                        <?php echo str_pad($lowStockCount, 3, "0", STR_PAD_LEFT); ?>
                    </strong>

                </div>

            </div>


        </section>


        <section class="dashboard-grid">

            <div class="dashboard-card schedule-card">

                <div class="card-title">

                    <img src="icons/appointment.png" alt="">

                    <h2>Today's Schedule</h2>

                </div>


                <div class="schedule-list">

                    <?php if (count($todaySchedule) > 0): ?>

                        <?php foreach ($todaySchedule as $schedule): ?>

                            <div>

                                <span>
                                    <?php
                                    echo !empty($schedule["schedule_time"])
                                        ? date(
                                            "g:i a",
                                            strtotime($schedule["schedule_time"])
                                        )
                                        : "--";
                                    ?>
                                </span>

                                <p>
                                    <?php
                                    echo htmlspecialchars(
                                        $schedule["schedule_name"]
                                    );
                                    ?>
                                </p>

                            </div>

                        <?php endforeach; ?>

                    <?php else: ?>

                        <div>
                            <span>--</span>
                            <p>No schedule for today.</p>
                        </div>

                    <?php endif; ?>

                </div>


                <a href="appointment.php" class="view-link">

                    View full schedule

                    <span>→</span>

                </a>

            </div>


            <!-- TODAY'S APPOINTMENTS -->

            <div class="dashboard-card appointment-card">

                <div class="card-title">

                    <img src="icons/appointment.png" alt="">

                    <h2>Today's Appointment</h2>

                </div>


                <div class="appointment-list">

                    <?php if (count($appointmentRows) > 0): ?>

                        <?php $number = 1; ?>

                        <?php foreach ($appointmentRows as $appointment): ?>

                            <div>

                                <b>
                                    <?php echo $number++; ?>
                                </b>

                                <span>
                                    <?php
                                    echo htmlspecialchars(
                                        $appointment["patient_name"] ?: "Patient"
                                    );
                                    ?>
                                </span>

                                <small>
                                    <?php
                                    echo !empty($appointment["appointment_time"])
                                        ? date(
                                            "g:i a",
                                            strtotime(
                                                $appointment["appointment_time"]
                                            )
                                        )
                                        : "--";
                                    ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    <?php else: ?>

                        <div>

                            <b>—</b>

                            <span>No appointments today.</span>

                            <small></small>

                        </div>

                    <?php endif; ?>

                </div>


                <a href="appointment.php" class="view-link">

                    View all appointments

                    <span>→</span>

                </a>

            </div>


            <div class="dashboard-card announcements-card">

                <div class="card-title">

                    <img src="icons/announcement.png" alt="">

                    <h2>Announcements</h2>

                </div>


                <div class="announcement-columns">

                    <?php if (count($announcementRows) > 0): ?>

                        <?php foreach ($announcementRows as $announcement): ?>

                            <div>

                                <h3>
                                    <?php
                                    echo htmlspecialchars(
                                        $announcement["title"]
                                    );
                                    ?>
                                </h3>

                                <p>
                                    <?php
                                    echo htmlspecialchars(
                                        $announcement["message"]
                                    );
                                    ?>
                                </p>

                                <small>
                                    <?php
                                    echo date(
                                        "F d, Y",
                                        strtotime(
                                            $announcement["date_posted"]
                                        )
                                    );
                                    ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    <?php else: ?>

                        <div>

                            <h3>No announcements</h3>

                            <p>
                                There are currently no announcements.
                            </p>

                        </div>

                    <?php endif; ?>

                </div>


                <a href="announcement.php" class="view-link">

                    View all announcements

                    <span>→</span>

                </a>

            </div>


            <!-- QUICK ACTIONS -->

            <div class="dashboard-card quick-actions-card">

                <div class="card-title">

                    <span>⚡</span>

                    <h2>Quick Actions</h2>

                </div>


                <div class="quick-actions">

                    <a href="patient-registration.php">
                        <span>+</span>
                        <span>New Patient</span>
                    </a>

                    <a href="consultation.php">
                        <span>+</span>
                        <span>Medical Record</span>
                    </a>

                    <a href="appointment.php">
                        <span>+</span>
                        <span>Appointment</span>
                    </a>

                    <a href="inventory.php">
                        <span>+</span>
                        <span>Medicine Inventory<br>& Issuance</span>
                    </a>

                    <a href="ai-moto.php">
                        <span>✦</span>
                        <span>AI Moto</span>
                    </a>

                    <a href="sms-notifications.php">
                        <span>✉</span>
                        <span>Send SMS</span>
                    </a>

                </div>

            </div>


            <!-- MEDICINE SUMMARY -->

            <div class="dashboard-card medicine-card">

                <div class="card-title">

                    <img src="icons/medicine inventory and issuance.png" alt="">

                    <h2>
                        Medicine Inventory &amp; Issuance Summary
                    </h2>

                </div>


                <div class="medicine-summary">


                    <div>

                        <span>Total Medicine</span>

                        <strong>
                            <?php echo $medicineTotal; ?>
                        </strong>

                        <small>
                            Items in inventory
                        </small>

                    </div>


                    <div>

                        <span>Adequate Stock</span>

                        <strong>
                            <?php echo $adequateStockCount; ?>
                        </strong>

                        <small>
                            Current stock
                        </small>

                    </div>


                    <div>

                        <span>Low Stock</span>

                        <strong>
                            <?php echo $lowStockCount; ?>
                        </strong>

                        <small>
                            Needs monitoring
                        </small>

                    </div>


                    <div>

                        <span>Out of Stock</span>

                        <strong>
                            <?php echo $outOfStockCount; ?>
                        </strong>

                        <small>
                            Currently unavailable
                        </small>

                    </div>


                </div>


                <div style="margin-top:15px; font-size:13px; color:#777;">

                    Medicines issued today:
                    <strong><?php echo $todayIssuance; ?></strong>

                </div>

            </div>


            <!-- TOP HEALTH CASES -->

            <div class="dashboard-card cases-card">

                <div class="card-title">

                    <span>▥</span>

                    <h2>Top Health Cases</h2>

                </div>


                <div class="chart">

                    <?php if (count($healthCases) > 0): ?>

                        <?php

                        $maxCase = 1;

                        foreach ($healthCases as $case) {
                            if ((int) $case["total"] > $maxCase) {
                                $maxCase = (int) $case["total"];
                            }
                        }

                        ?>

                        <?php foreach ($healthCases as $case): ?>

                            <?php
                            $caseTotal = (int) $case["total"];

                            $height = ($caseTotal / $maxCase) * 100;

                            if ($height < 8) {
                                $height = 8;
                            }
                            ?>

                            <div class="bar-item"
                                style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">

                                <div class="bar" style="
                                    height:<?php echo $height; ?>px;
                                    min-height:20px;
                                    width:45px;
                                "
                                    title="<?php echo htmlspecialchars($case["diagnosis"]); ?>: <?php echo $caseTotal; ?>">
                                </div>

                                <span>
                                    <?php
                                    echo htmlspecialchars(
                                        $case["diagnosis"]
                                    );
                                    ?>
                                </span>

                            </div>

                        <?php endforeach; ?>

                    <?php else: ?>

                        <p style="text-align:center;width:100%;">
                            No medical case data available.
                        </p>

                    <?php endif; ?>

                </div>


                <a href="admin-reports.php" class="view-link">

                    View full report

                    <span>→</span>

                </a>

            </div>


        </section>


        <!-- HEALTH PROGRAMS -->

        <section class="health-programs">

            <div class="card-title">

                <span>♥</span>

                <h2>Health Programs Overview</h2>

            </div>


            <div class="program-grid">


                <div class="program-item">

                    <img src="icons/immunization and vaccination.png" alt="">

                    <div>

                        <span>
                            Immunization &amp; Vaccination
                        </span>

                        <strong>
                            <?php echo $immunizationCount; ?>
                        </strong>

                        <small>
                            Recorded entries
                        </small>

                    </div>

                </div>


                <div class="program-item">

                    <img src="icons/maternal health.png" alt="">

                    <div>

                        <span>
                            Maternal Health
                        </span>

                        <strong>
                            <?php echo $maternalCount; ?>
                        </strong>

                        <small>
                            Recorded cases
                        </small>

                    </div>

                </div>


                <div class="program-item">

                    <img src="icons/infants and child monitoring.png" alt="">

                    <div>

                        <span>
                            Infant and Child Health
                        </span>

                        <strong>
                            <?php echo $childCount; ?>
                        </strong>

                        <small>
                            Recorded entries
                        </small>

                    </div>

                </div>


                <div class="program-item">

                    <img src="icons/tbdots cases.png" alt="">

                    <div>

                        <span>
                            TB DOTS
                        </span>

                        <strong>
                            <?php echo $tbCount; ?>
                        </strong>

                        <small>
                            Recorded cases
                        </small>

                    </div>

                </div>


                <div class="program-item">

                    <img src="icons/health education.png" alt="">

                    <div>

                        <span>
                            Health Education
                        </span>

                        <strong>
                            <?php echo $healthEducationCount; ?>
                        </strong>

                        <small>
                            Published posts
                        </small>

                    </div>

                </div>


            </div>

        </section>


    </main>

</body>

</html>