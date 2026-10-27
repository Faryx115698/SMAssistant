<?php
// api/consultations.php - Consultations & Medical Records REST API

session_start();
require_once __DIR__ . '/db.php';

function isConsultationStaffRole($role) {
    $role = str_replace(' ', '_', strtolower(trim((string) $role)));
    return in_array($role, [
        'admin', 'administrator', 'staff', 'nurse', 'doctor',
        'health_worker', 'midwife', 'records_staff'
    ], true);
}

function requireConsultationStaff() {
    if (isset($_SESSION["user"])) {
        $user = $_SESSION["user"];
        $role = $user["role"] ?? "";
        if (isConsultationStaffRole($role)) {
            return $user["full_name"] ?? $user["name"] ?? "Health Center Staff";
        }
        jsonError("Your account is not authorized to save consultations.", 403);
    }

    $headers = function_exists('getallheaders')
        ? array_change_key_case(getallheaders(), CASE_LOWER)
        : [];
    $authorization = $_SERVER["HTTP_AUTHORIZATION"] ?? $headers["authorization"] ?? "";
    $apiKey = $_SERVER["HTTP_APIKEY"] ?? $headers["apikey"] ?? "";
    if (!preg_match('/^Bearer\s+(.+)$/i', $authorization, $matches) || $apiKey === "") {
        jsonError("Sign in with an authorized staff account to save consultations.", 401);
    }

    $context = stream_context_create([
        "http" => [
            "method" => "GET",
            "header" => "apikey: " . $apiKey . "\r\nAuthorization: " . $authorization . "\r\n",
            "timeout" => 10,
            "ignore_errors" => true
        ]
    ]);

    set_error_handler(function ($severity, $message, $file, $line) {
        throw new ErrorException($message, 0, $severity, $file, $line);
    });
    try {
        $authResponse = file_get_contents(
            "https://xlsmuakkcicxwdllyrou.supabase.co/auth/v1/user",
            false,
            $context
        );
        $responseStatus = $http_response_header[0] ?? "";
    } catch (Throwable $error) {
        error_log("Consultation auth verification failed: " . $error->getMessage());
        jsonError("Could not verify your staff session. Please try again.", 503);
    } finally {
        restore_error_handler();
    }

    if ($authResponse === false || !preg_match('/\s200\s/', $responseStatus)) {
        jsonError("Your session is invalid or expired. Sign in again.", 401);
    }

    $user = json_decode($authResponse, true);
    $metadata = $user["app_metadata"] ?? [];
    $role = $metadata["role"] ?? "";
    $roles = is_array($metadata["roles"] ?? null) ? $metadata["roles"] : [];
    $roles = array_map(
        static fn($metadataRole) => is_string($metadataRole) ? strtolower($metadataRole) : "",
        $roles
    );
    $isStaffAdmin = ($metadata["staff_admin"] ?? false) === true
        || ($metadata["staff_admin"] ?? "") === "true";
    $isStaff = $isStaffAdmin
        || isConsultationStaffRole($role)
        || in_array("admin", $roles, true)
        || in_array("administrator", $roles, true);

    if (!$isStaff) {
        jsonError("Your account is not authorized to save consultations.", 403);
    }

    return $user["user_metadata"]["full_name"] ?? $user["email"] ?? "Health Center Staff";
}

$adminName = requireConsultationStaff();

// Ensure tables exist
$conn->query("
    CREATE TABLE IF NOT EXISTS consultations (
        consultation_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        consultation_date DATE NOT NULL,
        consultation_time TIME NOT NULL,
        visit_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'Completed',
        provider_name VARCHAR(150) NULL,
        chief_complaint TEXT NULL,
        history_present_illness TEXT NULL,
        physical_examination TEXT NULL,
        primary_diagnosis VARCHAR(255) NULL,
        diagnosis_code VARCHAR(50) NULL,
        secondary_diagnosis VARCHAR(255) NULL,
        treatment_plan TEXT NULL,
        notes TEXT NULL,
        follow_up_date DATE NULL,
        follow_up_time TIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$conn->query("
    CREATE TABLE IF NOT EXISTS vital_signs (
        vital_id INT AUTO_INCREMENT PRIMARY KEY,
        consultation_id INT NOT NULL,
        temperature DECIMAL(4,1) NULL,
        respiratory_rate DECIMAL(4,1) NULL,
        blood_pressure VARCHAR(50) NULL,
        oxygen_saturation DECIMAL(4,1) NULL,
        heart_rate INT NULL,
        height DECIMAL(5,1) NULL,
        weight DECIMAL(5,1) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(consultation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$conn->query("
    CREATE TABLE IF NOT EXISTS prescriptions (
        prescription_id INT AUTO_INCREMENT PRIMARY KEY,
        consultation_id INT NOT NULL,
        medicine VARCHAR(150) NOT NULL,
        dose VARCHAR(100) NULL,
        frequency VARCHAR(100) NULL,
        duration VARCHAR(100) NULL,
        instructions TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(consultation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$conn->query("
    CREATE TABLE IF NOT EXISTS consultation_documents (
        document_id INT AUTO_INCREMENT PRIMARY KEY,
        consultation_id INT NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(consultation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// 1. SAVE CONSULTATION (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $action === 'save_consultation') {
    $patientId = (int) ($_POST["patient_id"] ?? 0);
    $consultationId = (int) ($_POST["consultation_id"] ?? 0);

    $consultationDate = trim($_POST["consultation_date"] ?? "");
    $consultationTime = trim($_POST["consultation_time"] ?? "");
    $visitType = trim($_POST["visit_type"] ?? "");
    $status = trim($_POST["status"] ?? "Completed");

    $chiefComplaint = trim($_POST["chief_complaint"] ?? "");
    $historyPresentIllness = trim($_POST["history_present_illness"] ?? "");
    $physicalExamination = trim($_POST["physical_examination"] ?? "");
    $primaryDiagnosis = trim($_POST["primary_diagnosis"] ?? "");
    $diagnosisCode = trim($_POST["diagnosis_code"] ?? "");
    $secondaryDiagnosis = trim($_POST["secondary_diagnosis"] ?? "");
    $treatmentPlan = trim($_POST["treatment_plan"] ?? "");
    $notes = trim($_POST["notes"] ?? "");
    $followUpDate = trim($_POST["follow_up_date"] ?? "");
    $followUpTime = trim($_POST["follow_up_time"] ?? "");

    $temperature = trim($_POST["temperature"] ?? "");
    $respiratoryRate = trim($_POST["respiratory_rate"] ?? "");
    $bloodPressure = trim($_POST["blood_pressure"] ?? "");
    $oxygenSaturation = trim($_POST["oxygen_saturation"] ?? "");
    $heartRate = trim($_POST["heart_rate"] ?? "");
    $height = trim($_POST["height"] ?? "");
    $weight = trim($_POST["weight"] ?? "");

    if ($patientId <= 0 || $consultationDate === "" || $consultationTime === "" || $visitType === "") {
        jsonError("Please complete the required consultation information (Patient, Date, Time, Visit Type).");
    }

    $providerName = $adminName;
    $saved = false;

    if ($consultationId > 0) {
        $stmt = $conn->prepare("
            UPDATE consultations
            SET consultation_date = ?, consultation_time = ?, visit_type = ?, status = ?, provider_name = ?,
                chief_complaint = ?, history_present_illness = ?, physical_examination = ?, primary_diagnosis = ?,
                diagnosis_code = ?, secondary_diagnosis = ?, treatment_plan = ?, notes = ?,
                follow_up_date = NULLIF(?, ''), follow_up_time = NULLIF(?, '')
            WHERE consultation_id = ? AND user_id = ?
        ");
        $stmt->bind_param("sssssssssssssssii",
            $consultationDate, $consultationTime, $visitType, $status, $providerName,
            $chiefComplaint, $historyPresentIllness, $physicalExamination, $primaryDiagnosis,
            $diagnosisCode, $secondaryDiagnosis, $treatmentPlan, $notes,
            $followUpDate, $followUpTime, $consultationId, $patientId
        );
        $saved = $stmt->execute();
        $stmt->close();
    } else {
        $stmt = $conn->prepare("
            INSERT INTO consultations
            (user_id, consultation_date, consultation_time, visit_type, status, provider_name,
             chief_complaint, history_present_illness, physical_examination, primary_diagnosis,
             diagnosis_code, secondary_diagnosis, treatment_plan, notes, follow_up_date, follow_up_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''))
        ");
        $stmt->bind_param("isssssssssssssss",
            $patientId, $consultationDate, $consultationTime, $visitType, $status, $providerName,
            $chiefComplaint, $historyPresentIllness, $physicalExamination, $primaryDiagnosis,
            $diagnosisCode, $secondaryDiagnosis, $treatmentPlan, $notes,
            $followUpDate, $followUpTime
        );
        $saved = $stmt->execute();
        if ($saved) {
            $consultationId = $stmt->insert_id;
        }
        $stmt->close();
    }

    if (!$saved) {
        jsonError("Failed to save consultation.");
    }

    // Save vital signs
    $temperatureValue = $temperature === "" ? null : (float) $temperature;
    $respiratoryRateValue = $respiratoryRate === "" ? null : (float) $respiratoryRate;
    $oxygenSaturationValue = $oxygenSaturation === "" ? null : (float) $oxygenSaturation;
    $heartRateValue = $heartRate === "" ? null : (int) $heartRate;
    $heightValue = $height === "" ? null : (float) $height;
    $weightValue = $weight === "" ? null : (float) $weight;

    $checkVital = $conn->query("SELECT vital_id FROM vital_signs WHERE consultation_id = $consultationId LIMIT 1");
    if ($checkVital && $checkVital->num_rows > 0) {
        $vitalStmt = $conn->prepare("
            UPDATE vital_signs
            SET temperature = ?, respiratory_rate = ?, blood_pressure = ?, oxygen_saturation = ?,
                heart_rate = ?, height = ?, weight = ?
            WHERE consultation_id = ?
        ");
        $vitalStmt->bind_param("ddsdiddi", $temperatureValue, $respiratoryRateValue, $bloodPressure, $oxygenSaturationValue, $heartRateValue, $heightValue, $weightValue, $consultationId);
    } else {
        $vitalStmt = $conn->prepare("
            INSERT INTO vital_signs (consultation_id, temperature, respiratory_rate, blood_pressure, oxygen_saturation, heart_rate, height, weight)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $vitalStmt->bind_param("iddsdddd", $consultationId, $temperatureValue, $respiratoryRateValue, $bloodPressure, $oxygenSaturationValue, $heartRateValue, $heightValue, $weightValue);
    }
    if ($vitalStmt) {
        $vitalStmt->execute();
        $vitalStmt->close();
    }

    // Save prescriptions
    $conn->query("DELETE FROM prescriptions WHERE consultation_id = $consultationId");
    $medicines = $_POST["medicine"] ?? [];
    $doses = $_POST["dose"] ?? [];
    $frequencies = $_POST["frequency"] ?? [];
    $durations = $_POST["duration"] ?? [];
    $instructions = $_POST["instructions"] ?? [];

    if (is_array($medicines)) {
        for ($i = 0; $i < count($medicines); $i++) {
            $med = trim($medicines[$i] ?? "");
            if ($med === "") continue;
            $d = trim($doses[$i] ?? "");
            $f = trim($frequencies[$i] ?? "");
            $dur = trim($durations[$i] ?? "");
            $ins = trim($instructions[$i] ?? "");
            $pStmt = $conn->prepare("INSERT INTO prescriptions (consultation_id, medicine, dose, frequency, duration, instructions) VALUES (?, ?, ?, ?, ?, ?)");
            $pStmt->bind_param("isssss", $consultationId, $med, $d, $f, $dur, $ins);
            $pStmt->execute();
            $pStmt->close();
        }
    }

    jsonSuccess([
        "consultation_id" => $consultationId,
        "patient_id" => $patientId
    ], "Consultation record saved successfully.");
}

// 2. GET CONSULTATIONS DATA
$patientId = (int) ($_GET["patient_id"] ?? 0);
$consultationId = (int) ($_GET["consultation_id"] ?? 0);

// Get patient list
$patients = [];
$res = $conn->query("SELECT user_id, first_name, last_name, birth_date, sex, contact_number, address FROM user_profile ORDER BY user_id DESC LIMIT 50");
if ($res) while ($r = $res->fetch_assoc()) $patients[] = $r;

if ($patientId <= 0 && count($patients) > 0) {
    $patientId = (int) $patients[0]["user_id"];
}

$patient = null;
if ($patientId > 0) {
    $stmt = $conn->prepare("SELECT user_id, first_name, last_name, birth_date, sex, contact_number, address FROM user_profile WHERE user_id = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $patient = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }
}

// Consultations for this patient
$consultations = [];
if ($patientId > 0) {
    $stmt = $conn->prepare("SELECT * FROM consultations WHERE user_id = ? ORDER BY consultation_date DESC, consultation_time DESC");
    if ($stmt) {
        $stmt->bind_param("i", $patientId);
        $stmt->execute();
        $cRes = $stmt->get_result();
        while ($r = $cRes->fetch_assoc()) $consultations[] = $r;
        $stmt->close();
    }
}

if ($consultationId <= 0 && count($consultations) > 0) {
    $consultationId = (int) $consultations[0]["consultation_id"];
}

$selectedConsultation = null;
$vitalSigns = null;
$prescriptions = [];

if ($consultationId > 0) {
    $stmt = $conn->prepare("SELECT * FROM consultations WHERE consultation_id = ? AND user_id = ? LIMIT 1");
    if ($stmt) {
        $stmt->bind_param("ii", $consultationId, $patientId);
        $stmt->execute();
        $selectedConsultation = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    $vStmt = $conn->prepare("SELECT * FROM vital_signs WHERE consultation_id = ? LIMIT 1");
    if ($vStmt) {
        $vStmt->bind_param("i", $consultationId);
        $vStmt->execute();
        $vitalSigns = $vStmt->get_result()->fetch_assoc();
        $vStmt->close();
    }

    $pStmt = $conn->prepare("SELECT * FROM prescriptions WHERE consultation_id = ? ORDER BY prescription_id ASC");
    if ($pStmt) {
        $pStmt->bind_param("i", $consultationId);
        $pStmt->execute();
        $pRes = $pStmt->get_result();
        while ($r = $pRes->fetch_assoc()) $prescriptions[] = $r;
        $pStmt->close();
    }
}

jsonResponse([
    "success" => true,
    "patients" => $patients,
    "selectedPatient" => $patient,
    "consultations" => $consultations,
    "selectedConsultation" => $selectedConsultation,
    "vitalSigns" => $vitalSigns,
    "prescriptions" => $prescriptions
]);
