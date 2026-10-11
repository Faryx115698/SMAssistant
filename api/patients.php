<?php
// api/patients.php - Patient Registration & Records REST API

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

function tableExists($conn, $table) {
    $safeTable = $conn->real_escape_string($table);
    $result = $conn->query("SHOW TABLES LIKE '{$safeTable}'");
    return $result && $result->num_rows > 0;
}

function columnExists($conn, $table, $column) {
    $safeTable = $conn->real_escape_string($table);
    $safeColumn = $conn->real_escape_string($column);
    $result = $conn->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");
    return $result && $result->num_rows > 0;
}

$userOptionalColumns = [
    "middle_name", "suffix", "civil_status", "nationality", "religion", "occupation", "telephone"
];
$existingOptionalColumns = [];
foreach ($userOptionalColumns as $column) {
    if (columnExists($conn, "user_profile", $column)) {
        $existingOptionalColumns[] = $column;
    }
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// 1. CREATE NEW PATIENT (POST ?action=create)
if ($action === 'create' || ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_new_patient']))) {
    $raw = json_decode(file_get_contents('php://input'), true);
    $data = !empty($raw) ? $raw : $_POST;

    $firstName = trim($data["first_name"] ?? "");
    $middleName = trim($data["middle_name"] ?? "");
    $lastName = trim($data["last_name"] ?? "");
    $suffix = trim($data["suffix"] ?? "");
    $birthDate = trim($data["birth_date"] ?? "");
    $sex = trim($data["sex"] ?? "");
    $civilStatus = trim($data["civil_status"] ?? "");
    $nationality = trim($data["nationality"] ?? "");
    $religion = trim($data["religion"] ?? "");
    $occupation = trim($data["occupation"] ?? "");
    $contactNumber = trim($data["contact_number"] ?? "");
    $telephone = trim($data["telephone"] ?? "");
    $email = trim($data["email"] ?? "");
    $address = trim($data["address"] ?? "");

    $bloodType = trim($data["blood_type"] ?? "");
    $height = trim($data["height"] ?? "");
    $weight = trim($data["weight"] ?? "");
    $allergies = trim($data["allergies"] ?? "");
    $medicalConditions = trim($data["medical_conditions"] ?? "");

    if ($firstName === "" || $lastName === "") {
        jsonError("First name and last name are required.");
    }

    if ($email !== "") {
        $stmt = $conn->prepare("SELECT user_id FROM user_profile WHERE email = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param("s", $email);
            $stmt->execute();
            if ($stmt->get_result()->fetch_assoc()) {
                $stmt->close();
                jsonError("That email address is already registered.");
            }
            $stmt->close();
        }
    }

    try {
        $conn->begin_transaction();

        $fields = ["first_name", "last_name", "sex", "birth_date", "address", "contact_number", "email", "password"];
        $values = [
            $firstName,
            $lastName,
            $sex !== "" ? $sex : null,
            $birthDate !== "" ? $birthDate : null,
            $address !== "" ? $address : null,
            $contactNumber !== "" ? $contactNumber : null,
            $email !== "" ? $email : null,
            password_hash(bin2hex(random_bytes(8)), PASSWORD_DEFAULT)
        ];

        $optionalValues = [
            "middle_name" => $middleName,
            "suffix" => $suffix,
            "civil_status" => $civilStatus,
            "nationality" => $nationality,
            "religion" => $religion,
            "occupation" => $occupation,
            "telephone" => $telephone
        ];

        foreach ($existingOptionalColumns as $col) {
            $fields[] = $col;
            $val = $optionalValues[$col] ?? "";
            $values[] = $val !== "" ? $val : null;
        }

        $fieldList = implode(", ", array_map(fn($f) => "`$f`", $fields));
        $placeholders = implode(", ", array_fill(0, count($fields), "?"));

        $stmt = $conn->prepare("INSERT INTO user_profile ({$fieldList}) VALUES ({$placeholders})");
        $types = str_repeat("s", count($values));
        $stmt->bind_param($types, ...$values);
        $stmt->execute();
        $newUserId = $stmt->insert_id;
        $stmt->close();

        // Health profile
        if (tableExists($conn, "health_profile")) {
            $hStmt = $conn->prepare("
                INSERT INTO health_profile (user_id, blood_type, height, weight, allergies, medical_conditions)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            if ($hStmt) {
                $hStmt->bind_param("isssss", $newUserId, $bloodType, $height, $weight, $allergies, $medicalConditions);
                $hStmt->execute();
                $hStmt->close();
            }
        }

        $conn->commit();
        jsonSuccess(['patient_id' => $newUserId], "New patient added successfully.");
    } catch (Exception $e) {
        $conn->rollback();
        jsonError("Unable to create patient: " . $e->getMessage());
    }
}

// 2. UPDATE PATIENT (POST ?action=update)
if ($action === 'update' || ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['save_patient']))) {
    $raw = json_decode(file_get_contents('php://input'), true);
    $data = !empty($raw) ? $raw : $_POST;

    $userId = (int) ($data["user_id"] ?? 0);
    $firstName = trim($data["first_name"] ?? "");
    $middleName = trim($data["middle_name"] ?? "");
    $lastName = trim($data["last_name"] ?? "");
    $suffix = trim($data["suffix"] ?? "");
    $birthDate = trim($data["birth_date"] ?? "");
    $sex = trim($data["sex"] ?? "");
    $civilStatus = trim($data["civil_status"] ?? "");
    $nationality = trim($data["nationality"] ?? "");
    $religion = trim($data["religion"] ?? "");
    $occupation = trim($data["occupation"] ?? "");
    $contactNumber = trim($data["contact_number"] ?? "");
    $telephone = trim($data["telephone"] ?? "");
    $email = trim($data["email"] ?? "");
    $address = trim($data["address"] ?? "");

    $bloodType = trim($data["blood_type"] ?? "");
    $height = trim($data["height"] ?? "");
    $weight = trim($data["weight"] ?? "");
    $allergies = trim($data["allergies"] ?? "");
    $medicalConditions = trim($data["medical_conditions"] ?? "");

    if ($userId <= 0 || $firstName === "" || $lastName === "") {
        jsonError("Valid patient ID, first name, and last name are required.");
    }

    try {
        $conn->begin_transaction();

        $updateSql = "
            UPDATE user_profile
            SET first_name = ?, last_name = ?, sex = ?, birth_date = ?,
                address = ?, contact_number = ?, email = ?
        ";
        $updateValues = [
            $firstName,
            $lastName,
            $sex !== "" ? $sex : null,
            $birthDate !== "" ? $birthDate : null,
            $address !== "" ? $address : null,
            $contactNumber !== "" ? $contactNumber : null,
            $email !== "" ? $email : null
        ];

        $optUpdates = [
            "middle_name" => $middleName,
            "suffix" => $suffix,
            "civil_status" => $civilStatus,
            "nationality" => $nationality,
            "religion" => $religion,
            "occupation" => $occupation,
            "telephone" => $telephone
        ];

        foreach ($existingOptionalColumns as $col) {
            $updateSql .= ", `{$col}` = ?";
            $val = $optUpdates[$col] ?? "";
            $updateValues[] = $val !== "" ? $val : null;
        }

        $updateSql .= " WHERE user_id = ?";
        $updateValues[] = $userId;

        $types = str_repeat("s", count($updateValues) - 1) . "i";
        $stmt = $conn->prepare($updateSql);
        $stmt->bind_param($types, ...$updateValues);
        $stmt->execute();
        $stmt->close();

        // Update or insert health profile
        if (tableExists($conn, "health_profile")) {
            $hCheck = $conn->query("SELECT profile_id FROM health_profile WHERE user_id = $userId LIMIT 1");
            if ($hCheck && $hCheck->num_rows > 0) {
                $hStmt = $conn->prepare("
                    UPDATE health_profile
                    SET blood_type = ?, height = ?, weight = ?, allergies = ?, medical_conditions = ?
                    WHERE user_id = ?
                ");
                $hStmt->bind_param("sssssi", $bloodType, $height, $weight, $allergies, $medicalConditions, $userId);
            } else {
                $hStmt = $conn->prepare("
                    INSERT INTO health_profile (blood_type, height, weight, allergies, medical_conditions, user_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                $hStmt->bind_param("sssssi", $bloodType, $height, $weight, $allergies, $medicalConditions, $userId);
            }
            if ($hStmt) {
                $hStmt->execute();
                $hStmt->close();
            }
        }

        $conn->commit();
        jsonSuccess(['patient_id' => $userId], "Patient information saved successfully.");
    } catch (Exception $e) {
        $conn->rollback();
        jsonError("Unable to save patient: " . $e->getMessage());
    }
}

// 3. GET PATIENT LIST & DETAILS
$search = trim($_GET["search"] ?? "");
$selectedId = (int) ($_GET["patient_id"] ?? 0);

$selectColumns = [
    "user_id", "first_name", "last_name", "sex", "birth_date",
    "address", "contact_number", "email", "date_registered"
];
foreach ($existingOptionalColumns as $col) {
    $selectColumns[] = $col;
}
$selectList = implode(", ", array_map(fn($c) => "`$c`", $selectColumns));

$patients = [];
if ($search !== "") {
    $stmt = $conn->prepare("
        SELECT {$selectList}
        FROM user_profile
        WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR contact_number LIKE ? OR CAST(user_id AS CHAR) LIKE ?
        ORDER BY user_id DESC
    ");
    $like = "%" . $search . "%";
    $stmt->bind_param("sssss", $like, $like, $like, $like, $like);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $patients[] = $r;
    $stmt->close();
} else {
    $res = $conn->query("SELECT {$selectList} FROM user_profile ORDER BY user_id DESC LIMIT 100");
    if ($res) while ($r = $res->fetch_assoc()) $patients[] = $r;
}

if ($selectedId === 0 && count($patients) > 0) {
    $selectedId = (int) $patients[0]["user_id"];
}

$selectedPatient = null;
$healthProfile = null;
$lastConsultation = null;
$nextAppointment = null;

if ($selectedId > 0) {
    $stmt = $conn->prepare("SELECT {$selectList} FROM user_profile WHERE user_id = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param("i", $selectedId);
        $stmt->execute();
        $selectedPatient = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    if ($selectedPatient && tableExists($conn, "health_profile")) {
        $hStmt = $conn->prepare("SELECT profile_id, blood_type, height, weight, allergies, medical_conditions FROM health_profile WHERE user_id = ? LIMIT 1");
        if ($hStmt) {
            $hStmt->bind_param("i", $selectedId);
            $hStmt->execute();
            $healthProfile = $hStmt->get_result()->fetch_assoc();
            $hStmt->close();
        }
    }

    if (tableExists($conn, "consultations")) {
        $cStmt = $conn->prepare("SELECT * FROM consultations WHERE user_id = ? ORDER BY consultation_date DESC, consultation_id DESC LIMIT 1");
        if ($cStmt) {
            $cStmt->bind_param("i", $selectedId);
            $cStmt->execute();
            $lastConsultation = $cStmt->get_result()->fetch_assoc();
            $cStmt->close();
        }
    }

    if (tableExists($conn, "appointment")) {
        $aStmt = $conn->prepare("SELECT appointment_date, appointment_time, purpose, status FROM appointment WHERE user_id = ? AND appointment_date >= CURDATE() AND LOWER(COALESCE(status, '')) NOT IN ('cancelled', 'canceled', 'completed') ORDER BY appointment_date ASC, appointment_time ASC LIMIT 1");
        if ($aStmt) {
            $aStmt->bind_param("i", $selectedId);
            $aStmt->execute();
            $nextAppointment = $aStmt->get_result()->fetch_assoc();
            $aStmt->close();
        }
    }
}

// Counts
$totalPatients = (int) ($conn->query("SELECT COUNT(*) AS total FROM user_profile")->fetch_assoc()["total"] ?? 0);
$activePatients = (int) ($conn->query("SELECT COUNT(*) AS total FROM user_profile WHERE LOWER(COALESCE(status, '')) = 'active'")->fetch_assoc()["total"] ?? $totalPatients);

jsonResponse([
    "success" => true,
    "patients" => $patients,
    "selected" => $selectedPatient,
    "healthProfile" => $healthProfile,
    "lastConsultation" => $lastConsultation,
    "nextAppointment" => $nextAppointment,
    "counts" => [
        "total" => $totalPatients,
        "active" => $activePatients
    ]
]);
