<?php
// api/immunization.php - Immunization REST endpoint

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

// Ensure table exists
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

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Handle Add Vaccination POST
if ($action === 'add_vaccination' || ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['vaccine']))) {
    $raw = json_decode(file_get_contents('php://input'), true);
    $data = !empty($raw) ? $raw : $_POST;

    $userId = (int) ($data["user_id"] ?? 1);
    $vaccine = trim($data["vaccine"] ?? "");
    $dose = trim($data["dose"] ?? "");
    $dateGiven = trim($data["date_given"] ?? "");
    $ageAtDose = trim($data["age_at_dose"] ?? "");
    $batchNo = trim($data["batch_no"] ?? "");
    $givenBy = trim($data["given_by"] ?? "");
    $nextDose = trim($data["next_dose"] ?? "");
    $status = trim($data["status"] ?? "Completed");

    if ($vaccine === "" || $dose === "") {
        jsonError("Vaccine name and dose are required.");
    }

    $stmt = $conn->prepare("
        INSERT INTO immunization_records
        (user_id, vaccine, dose, date_given, age_at_dose, batch_no, given_by, next_dose, status)
        VALUES (?, ?, ?, NULLIF(?, ''), ?, ?, ?, NULLIF(?, ''), ?)
    ");

    if (!$stmt) {
        jsonError("Database error preparing query.");
    }

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

    if ($stmt->execute()) {
        $stmt->close();
        jsonSuccess([], "Vaccination record saved successfully.");
    } else {
        $err = $stmt->error;
        $stmt->close();
        jsonError("Failed to save: " . $err);
    }
}

// GET Data
$currentUserId = (int) ($_GET['user_id'] ?? $_SESSION["user"]["user_id"] ?? 0);
$patient = null;

if ($currentUserId > 0) {
    $stmt = $conn->prepare("
        SELECT user_id, first_name, last_name, birth_date, address, contact_number, email
        FROM user_profile
        WHERE user_id = ?
        LIMIT 1
    ");
    if ($stmt) {
        $stmt->bind_param("i", $currentUserId);
        $stmt->execute();
        $patient = $stmt->get_result()->fetch_assoc();
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

// Seed sample if empty
$countResult = $conn->query("SELECT COUNT(*) AS total FROM immunization_records WHERE user_id = $patientId");
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
            $stmt->bind_param("issssssss", $row[0], $row[1], $row[2], $row[3], $row[4], $row[5], $row[6], $row[7], $row[8]);
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
        case "completed": $completedCount++; break;
        case "scheduled": $scheduledCount++; break;
        case "due soon": $dueSoonCount++; break;
        case "overdue": $overdueCount++; break;
    }
}

$coverage = $allCount > 0 ? min(100, round(($completedCount / $allCount) * 100)) : 0;
if ($coverage === 0 && $allCount > 0) $coverage = 1;

$upcoming = [];
foreach ($records as $record) {
    if (in_array(strtolower($record["status"]), ["scheduled", "due soon", "overdue"])) {
        $upcoming[] = $record;
    }
}

jsonResponse([
    "success" => true,
    "patient" => $patient,
    "records" => $records,
    "upcoming" => $upcoming,
    "stats" => [
        "total" => $allCount,
        "completed" => $completedCount,
        "dueThisMonth" => $scheduledCount + $dueSoonCount,
        "overdue" => $overdueCount,
        "coverage" => $coverage
    ]
]);
