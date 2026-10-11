<?php
// api/dashboard.php - Dashboard Analytics & Stats REST endpoint

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

$role = strtolower($_SESSION["user"]["role"] ?? "");
if ($role !== "admin" && $role !== "super admin") {
    jsonError("Access denied", 403);
}

$adminName = $_SESSION["user"]["full_name"] ?? "ADMIN";

function tableExists($conn, $table) {
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

function getTable($conn, $tables) {
    foreach ($tables as $table) {
        if (tableExists($conn, $table)) {
            return $table;
        }
    }
    return null;
}

function columnExists($conn, $table, $column) {
    if (!$table) return false;
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

function getColumn($conn, $table, $columns) {
    if (!$table) return null;
    foreach ($columns as $column) {
        if (columnExists($conn, $table, $column)) {
            return $column;
        }
    }
    return null;
}

function countRows($conn, $table) {
    if (!$table) return 0;
    $result = $conn->query("SELECT COUNT(*) AS total FROM `$table`");
    if ($result) {
        $row = $result->fetch_assoc();
        return (int) $row["total"];
    }
    return 0;
}

function countToday($conn, $table, $dateColumn) {
    if (!$table || !$dateColumn) return 0;
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

function getRows($conn, $sql) {
    $rows = [];
    $result = $conn->query($sql);
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }
    }
    return $rows;
}

$userTable = getTable($conn, ["user_profile", "users", "patients"]);
$patientCount = countRows($conn, $userTable);

$medicalTable = getTable($conn, ["medical_record", "medical_records", "consultation", "consultations", "patient_records"]);
$diagnosisColumn = getColumn($conn, $medicalTable, ["diagnosis", "diagnoses", "medical_condition", "condition", "case"]);
$medicalDateColumn = getColumn($conn, $medicalTable, ["date", "date_recorded", "record_date", "consultation_date", "date_consulted", "created_at"]);

$maternalTable = getTable($conn, ["maternal_health", "maternal_cases", "maternal_records", "maternal"]);
$maternalCount = countRows($conn, $maternalTable);

$childTable = getTable($conn, ["infant_child_health", "infant_child_records", "child_health", "child_records", "infant_health"]);
$childCount = countRows($conn, $childTable);

$tbTable = getTable($conn, ["tb_dots", "tb_dots_cases", "tb_records", "tb_cases", "tuberculosis"]);
$tbCount = countRows($conn, $tbTable);

$inventoryTable = getTable($conn, ["medicine_inventory", "inventory", "medicines", "medicine"]);
$inventoryQuantityColumn = getColumn($conn, $inventoryTable, ["quantity", "stock", "stock_quantity", "available_quantity", "current_stock"]);
$inventoryThresholdColumn = getColumn($conn, $inventoryTable, ["reorder_level", "minimum_stock", "min_stock", "low_stock_level", "threshold"]);

$medicineTotal = 0;
$lowStockCount = 0;
$outOfStockCount = 0;
$adequateStockCount = 0;

if ($inventoryTable && $inventoryQuantityColumn) {
    $medicineTotal = countRows($conn, $inventoryTable);
    $thresh = $inventoryThresholdColumn ? "`$inventoryThresholdColumn`" : "10";
    $result = $conn->query("
        SELECT
            SUM(CASE WHEN `$inventoryQuantityColumn` <= 0 THEN 1 ELSE 0 END) AS out_stock,
            SUM(CASE WHEN `$inventoryQuantityColumn` > 0 AND `$inventoryQuantityColumn` <= $thresh THEN 1 ELSE 0 END) AS low_stock,
            SUM(CASE WHEN `$inventoryQuantityColumn` > $thresh THEN 1 ELSE 0 END) AS adequate_stock
        FROM `$inventoryTable`
    ");
    if ($result) {
        $row = $result->fetch_assoc();
        $outOfStockCount = (int) ($row["out_stock"] ?? 0);
        $lowStockCount = (int) ($row["low_stock"] ?? 0);
        $adequateStockCount = (int) ($row["adequate_stock"] ?? 0);
    }
}

$appointmentTable = getTable($conn, ["appointment", "appointments", "appointment_schedule", "appointments_schedule"]);
$appointmentDateColumn = getColumn($conn, $appointmentTable, ["appointment_date", "date", "schedule_date", "date_appointment"]);
$appointmentTimeColumn = getColumn($conn, $appointmentTable, ["appointment_time", "time", "schedule_time", "time_appointment"]);
$appointmentStatusColumn = getColumn($conn, $appointmentTable, ["status", "appointment_status"]);
$appointmentNameColumn = getColumn($conn, $appointmentTable, ["patient_name", "name", "full_name", "patient"]);

$todayAppointments = 0;
$appointmentRows = [];

if ($appointmentTable && $appointmentDateColumn) {
    $sql = "SELECT COUNT(*) AS total FROM `$appointmentTable` WHERE DATE(`$appointmentDateColumn`) = CURDATE()";
    if ($appointmentStatusColumn) {
        $sql .= " AND LOWER(`$appointmentStatusColumn`) NOT IN ('cancelled', 'canceled', 'rejected')";
    }
    $res = $conn->query($sql);
    if ($res) {
        $r = $res->fetch_assoc();
        $todayAppointments = (int) $r["total"];
    }

    $selectName = $appointmentNameColumn ? "`$appointmentNameColumn` AS patient_name" : "'' AS patient_name";
    $selectTime = $appointmentTimeColumn ? "`$appointmentTimeColumn` AS appointment_time" : "'' AS appointment_time";
    $appSql = "SELECT $selectName, $selectTime FROM `$appointmentTable` WHERE DATE(`$appointmentDateColumn`) = CURDATE()";
    if ($appointmentStatusColumn) {
        $appSql .= " AND LOWER(`$appointmentStatusColumn`) NOT IN ('cancelled', 'canceled', 'rejected')";
    }
    if ($appointmentTimeColumn) {
        $appSql .= " ORDER BY `$appointmentTimeColumn` ASC ";
    }
    $appSql .= " LIMIT 5";
    $appointmentRows = getRows($conn, $appSql);
}

$announcementRows = [];
if (tableExists($conn, "announcements")) {
    $announcementDateColumn = getColumn($conn, "announcements", ["date_posted", "created_at", "date_created"]);
    $announcementTitleColumn = getColumn($conn, "announcements", ["title", "announcement_title"]);
    $announcementMessageColumn = getColumn($conn, "announcements", ["message", "content", "description"]);
    if ($announcementDateColumn) {
        $titleSelect = $announcementTitleColumn ? "`$announcementTitleColumn` AS title" : "'' AS title";
        $messageSelect = $announcementMessageColumn ? "`$announcementMessageColumn` AS message" : "'' AS message";
        $announcementRows = getRows($conn, "
            SELECT $titleSelect, $messageSelect, `$announcementDateColumn` AS date_posted
            FROM announcements
            ORDER BY `$announcementDateColumn` DESC
            LIMIT 2
        ");
    }
}

$issuanceTable = getTable($conn, ["medicine_issuance", "medicine_issued", "medicine_distribution", "issuance", "medicine_issuance_records"]);
$issuanceDateColumn = getColumn($conn, $issuanceTable, ["date_issued", "issuance_date", "date", "created_at"]);
$todayIssuance = 0;
if ($issuanceTable && $issuanceDateColumn) {
    $todayIssuance = countToday($conn, $issuanceTable, $issuanceDateColumn);
}

$healthCases = [];
if ($medicalTable && $diagnosisColumn) {
    $healthCases = getRows($conn, "
        SELECT `$diagnosisColumn` AS diagnosis, COUNT(*) AS total
        FROM `$medicalTable`
        WHERE `$diagnosisColumn` IS NOT NULL AND TRIM(`$diagnosisColumn`) <> ''
        GROUP BY `$diagnosisColumn`
        ORDER BY total DESC
        LIMIT 4
    ");
}

$immunizationTable = getTable($conn, ["immunization", "immunization_records", "vaccination", "vaccination_records"]);
$healthEducationTable = getTable($conn, ["health_education_post", "health_education", "health_education_posts"]);
$immunizationCount = countRows($conn, $immunizationTable);
$healthEducationCount = countRows($conn, $healthEducationTable);

$todaySchedule = [];
if ($appointmentTable && $appointmentDateColumn) {
    $scheduleNameColumn = getColumn($conn, $appointmentTable, ["service", "appointment_type", "type", "purpose", "reason"]);
    if ($scheduleNameColumn) {
        $selectSchedule = "`$scheduleNameColumn` AS schedule_name";
        $scheduleTime = $appointmentTimeColumn ? "`$appointmentTimeColumn` AS schedule_time" : "'' AS schedule_time";
        $todaySchedule = getRows($conn, "
            SELECT $scheduleTime, $selectSchedule
            FROM `$appointmentTable`
            WHERE DATE(`$appointmentDateColumn`) = CURDATE()
            ORDER BY " . ($appointmentTimeColumn ? "`$appointmentTimeColumn` ASC" : "`$appointmentDateColumn` ASC") . "
            LIMIT 6
        ");
    }
}

jsonResponse([
    'success' => true,
    'user' => [
        'name' => $adminName,
        'role' => $_SESSION["user"]["role"] ?? "Admin"
    ],
    'stats' => [
        'patientCount' => $patientCount,
        'maternalCount' => $maternalCount,
        'childCount' => $childCount,
        'tbCount' => $tbCount,
        'immunizationCount' => $immunizationCount,
        'healthEducationCount' => $healthEducationCount,
        'medicineTotal' => $medicineTotal,
        'lowStockCount' => $lowStockCount,
        'outOfStockCount' => $outOfStockCount,
        'adequateStockCount' => $adequateStockCount,
        'todayAppointments' => $todayAppointments,
        'todayIssuance' => $todayIssuance
    ],
    'appointments' => $appointmentRows,
    'announcements' => $announcementRows,
    'healthCases' => $healthCases,
    'todaySchedule' => $todaySchedule
]);
