<?php
session_start();
require_once "db.php";

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}

$user = $_SESSION["user"];
$role = strtolower(trim($user["role"] ?? ""));

if (!in_array($role, ["admin", "administrator"], true)) {
    header("Location: patient-home.php");
    exit;
}

function h($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}

function patientAge($birthDate)
{
    if (!$birthDate) {
        return "—";
    }

    try {
        $birth = new DateTime($birthDate);
        $today = new DateTime();
        return $birth->diff($today)->y;
    } catch (Exception $e) {
        return "—";
    }
}

function formatDate($date)
{
    if (!$date) {
        return "—";
    }

    $time = strtotime($date);

    return $time ? date("F j, Y", $time) : "—";
}

function formatTime($time)
{
    if (!$time) {
        return "—";
    }

    $timestamp = strtotime($time);

    return $timestamp ? date("h:i A", $timestamp) : "—";
}

$adminName = "Admin";

if (!empty($user["full_name"])) {
    $adminName = $user["full_name"];
} elseif (!empty($user["first_name"])) {
    $adminName = trim(
        $user["first_name"] . " " .
        ($user["last_name"] ?? "")
    );
}

$patientId = (int) ($_GET["patient_id"] ?? $_POST["patient_id"] ?? 0);
$consultationId = (int) ($_GET["consultation_id"] ?? $_POST["consultation_id"] ?? 0);

$message = "";
$messageType = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    if (isset($_POST["save_consultation"])) {

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

        if (
            $patientId <= 0 ||
            $consultationDate === "" ||
            $consultationTime === "" ||
            $visitType === ""
        ) {

            $message = "Please complete the required consultation information.";
            $messageType = "error";

        } else {

            $checkPatient = $conn->prepare("
                SELECT user_id
                FROM user_profile
                WHERE user_id = ?
                LIMIT 1
            ");

            $checkPatient->bind_param("i", $patientId);
            $checkPatient->execute();

            $patientExists = $checkPatient->get_result()->fetch_assoc();

            $checkPatient->close();

            if (!$patientExists) {

                $message = "Selected patient was not found.";
                $messageType = "error";

            } else {

                $providerName = $adminName;

                if ($consultationId > 0) {

                    $stmt = $conn->prepare("
                        UPDATE consultations
                        SET
                            consultation_date = ?,
                            consultation_time = ?,
                            visit_type = ?,
                            status = ?,
                            provider_name = ?,
                            chief_complaint = ?,
                            history_present_illness = ?,
                            physical_examination = ?,
                            primary_diagnosis = ?,
                            diagnosis_code = ?,
                            secondary_diagnosis = ?,
                            treatment_plan = ?,
                            notes = ?,
                            follow_up_date = NULLIF(?, ''),
                            follow_up_time = NULLIF(?, '')
                        WHERE consultation_id = ?
                        AND user_id = ?
                    ");

                    $stmt->bind_param(
                        "sssssssssssssssii",
                        $consultationDate,
                        $consultationTime,
                        $visitType,
                        $status,
                        $providerName,
                        $chiefComplaint,
                        $historyPresentIllness,
                        $physicalExamination,
                        $primaryDiagnosis,
                        $diagnosisCode,
                        $secondaryDiagnosis,
                        $treatmentPlan,
                        $notes,
                        $followUpDate,
                        $followUpTime,
                        $consultationId,
                        $patientId
                    );

                    $saved = $stmt->execute();
                    $stmt->close();

                } else {

                    $stmt = $conn->prepare("
                        INSERT INTO consultations
                        (
                            user_id,
                            consultation_date,
                            consultation_time,
                            visit_type,
                            status,
                            provider_name,
                            chief_complaint,
                            history_present_illness,
                            physical_examination,
                            primary_diagnosis,
                            diagnosis_code,
                            secondary_diagnosis,
                            treatment_plan,
                            notes,
                            follow_up_date,
                            follow_up_time
                        )
                        VALUES
                        (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, '')
                        )
                    ");

                    $stmt->bind_param(
                        "isssssssssssssss",
                        $patientId,
                        $consultationDate,
                        $consultationTime,
                        $visitType,
                        $status,
                        $providerName,
                        $chiefComplaint,
                        $historyPresentIllness,
                        $physicalExamination,
                        $primaryDiagnosis,
                        $diagnosisCode,
                        $secondaryDiagnosis,
                        $treatmentPlan,
                        $notes,
                        $followUpDate,
                        $followUpTime
                    );

                    $saved = $stmt->execute();

                    if ($saved) {
                        $consultationId = $stmt->insert_id;
                    }

                    $stmt->close();
                }

                if ($saved) {

                    $temperatureValue = $temperature === "" ? null : (float) $temperature;
                    $respiratoryRateValue = $respiratoryRate === "" ? null : (float) $respiratoryRate;
                    $oxygenSaturationValue = $oxygenSaturation === "" ? null : (float) $oxygenSaturation;
                    $heartRateValue = $heartRate === "" ? null : (float) $heartRate;
                    $heightValue = $height === "" ? null : (float) $height;
                    $weightValue = $weight === "" ? null : (float) $weight;

                    $checkVital = $conn->prepare("
                        SELECT vital_id
                        FROM vital_signs
                        WHERE consultation_id = ?
                        LIMIT 1
                    ");

                    $checkVital->bind_param("i", $consultationId);
                    $checkVital->execute();

                    $existingVital = $checkVital->get_result()->fetch_assoc();

                    $checkVital->close();

                    if ($existingVital) {

                        $vitalStmt = $conn->prepare("
                            UPDATE vital_signs
                            SET
                                temperature = ?,
                                respiratory_rate = ?,
                                blood_pressure = ?,
                                oxygen_saturation = ?,
                                heart_rate = ?,
                                height = ?,
                                weight = ?
                            WHERE consultation_id = ?
                        ");

                        $vitalStmt->bind_param(
                            "ddsdiddi",
                            $temperatureValue,
                            $respiratoryRateValue,
                            $bloodPressure,
                            $oxygenSaturationValue,
                            $heartRateValue,
                            $heightValue,
                            $weightValue,
                            $consultationId
                        );

                    } else {

                        $vitalStmt = $conn->prepare("
                            INSERT INTO vital_signs
                            (
                                consultation_id,
                                temperature,
                                respiratory_rate,
                                blood_pressure,
                                oxygen_saturation,
                                heart_rate,
                                height,
                                weight
                            )
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ");

                        $vitalStmt->bind_param(
                            "iddsdddd",
                            $consultationId,
                            $temperatureValue,
                            $respiratoryRateValue,
                            $bloodPressure,
                            $oxygenSaturationValue,
                            $heartRateValue,
                            $heightValue,
                            $weightValue
                        );
                    }

                    $vitalStmt->execute();
                    $vitalStmt->close();

                    $conn->query("
                        DELETE FROM prescriptions
                        WHERE consultation_id = " . (int) $consultationId
                    );

                    $medicines = $_POST["medicine"] ?? [];
                    $doses = $_POST["dose"] ?? [];
                    $frequencies = $_POST["frequency"] ?? [];
                    $durations = $_POST["duration"] ?? [];
                    $instructions = $_POST["instructions"] ?? [];

                    if (is_array($medicines)) {

                        for ($i = 0; $i < count($medicines); $i++) {

                            $medicine = trim($medicines[$i] ?? "");
                            $dose = trim($doses[$i] ?? "");
                            $frequency = trim($frequencies[$i] ?? "");
                            $duration = trim($durations[$i] ?? "");
                            $instruction = trim($instructions[$i] ?? "");

                            if ($medicine === "") {
                                continue;
                            }

                            $prescriptionStmt = $conn->prepare("
                                INSERT INTO prescriptions
                                (
                                    consultation_id,
                                    medicine,
                                    dose,
                                    frequency,
                                    duration,
                                    instructions
                                )
                                VALUES (?, ?, ?, ?, ?, ?)
                            ");

                            $prescriptionStmt->bind_param(
                                "isssss",
                                $consultationId,
                                $medicine,
                                $dose,
                                $frequency,
                                $duration,
                                $instruction
                            );

                            $prescriptionStmt->execute();
                            $prescriptionStmt->close();
                        }
                    }

                    $message = $consultationId > 0
                        ? "Consultation saved successfully."
                        : "Consultation saved successfully.";

                    $messageType = "success";
                } else {

                    $message = "Unable to save the consultation.";
                    $messageType = "error";
                }
            }
        }
    }
}

if ($patientId <= 0) {

    $result = $conn->query("
        SELECT user_id
        FROM user_profile
        ORDER BY user_id DESC
        LIMIT 1
    ");

    if ($result && ($row = $result->fetch_assoc())) {
        $patientId = (int) $row["user_id"];
    }
}

$selectedPatient = null;

if ($patientId > 0) {

    $stmt = $conn->prepare("
        SELECT
            u.user_id,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.sex,
            u.birth_date,
            u.address,
            u.contact_number,
            u.email,
            hp.blood_type,
            hp.height,
            hp.weight,
            hp.allergies,
            hp.medical_conditions
        FROM user_profile u
        LEFT JOIN health_profile hp
            ON hp.user_id = u.user_id
        WHERE u.user_id = ?
        LIMIT 1
    ");

    $stmt->bind_param("i", $patientId);
    $stmt->execute();

    $selectedPatient = $stmt->get_result()->fetch_assoc();

    $stmt->close();
}

if (!$selectedPatient) {
    $patientId = 0;
    $consultationId = 0;
}

$consultations = [];

if ($patientId > 0) {

    $stmt = $conn->prepare("
        SELECT
            consultation_id,
            consultation_date,
            consultation_time,
            visit_type,
            status,
            provider_name,
            primary_diagnosis
        FROM consultations
        WHERE user_id = ?
        ORDER BY consultation_date DESC, consultation_time DESC, consultation_id DESC
    ");

    $stmt->bind_param("i", $patientId);
    $stmt->execute();

    $result = $stmt->get_result();

    while ($row = $result->fetch_assoc()) {
        $consultations[] = $row;
    }

    $stmt->close();
}

if ($consultationId <= 0 && count($consultations) > 0) {
    $consultationId = (int) $consultations[0]["consultation_id"];
}

$selectedConsultation = null;
$vitals = null;
$prescriptions = [];
$documents = [];

if ($consultationId > 0 && $patientId > 0) {

    $stmt = $conn->prepare("
        SELECT *
        FROM consultations
        WHERE consultation_id = ?
        AND user_id = ?
        LIMIT 1
    ");

    $stmt->bind_param("ii", $consultationId, $patientId);
    $stmt->execute();

    $selectedConsultation = $stmt->get_result()->fetch_assoc();

    $stmt->close();

    if ($selectedConsultation) {

        $stmt = $conn->prepare("
            SELECT *
            FROM vital_signs
            WHERE consultation_id = ?
            LIMIT 1
        ");

        $stmt->bind_param("i", $consultationId);
        $stmt->execute();

        $vitals = $stmt->get_result()->fetch_assoc();

        $stmt->close();

        $stmt = $conn->prepare("
            SELECT *
            FROM prescriptions
            WHERE consultation_id = ?
            ORDER BY prescription_id ASC
        ");

        $stmt->bind_param("i", $consultationId);
        $stmt->execute();

        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $prescriptions[] = $row;
        }

        $stmt->close();

        $stmt = $conn->prepare("
            SELECT *
            FROM consultation_documents
            WHERE consultation_id = ?
            ORDER BY uploaded_at DESC
        ");

        $stmt->bind_param("i", $consultationId);
        $stmt->execute();

        $result = $stmt->get_result();

        while ($row = $result->fetch_assoc()) {
            $documents[] = $row;
        }

        $stmt->close();
    }
}

if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["upload_document"])) {

    $patientId = (int) ($_POST["patient_id"] ?? 0);
    $consultationId = (int) ($_POST["consultation_id"] ?? 0);

    if (
        $patientId > 0 &&
        $consultationId > 0 &&
        isset($_FILES["document"]) &&
        $_FILES["document"]["error"] === UPLOAD_ERR_OK
    ) {

        $uploadDirectory = "uploads/consultations/";

        if (!is_dir($uploadDirectory)) {
            mkdir($uploadDirectory, 0777, true);
        }

        $originalName = basename($_FILES["document"]["name"]);
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

        $allowedExtensions = [
            "pdf",
            "jpg",
            "jpeg",
            "png",
            "doc",
            "docx"
        ];

        if (in_array($extension, $allowedExtensions, true)) {

            $newFileName =
                "consultation_" .
                $consultationId .
                "_" .
                time() .
                "_" .
                preg_replace(
                    "/[^A-Za-z0-9._-]/",
                    "_",
                    $originalName
                );

            $filePath = $uploadDirectory . $newFileName;

            if (move_uploaded_file(
                $_FILES["document"]["tmp_name"],
                $filePath
            )) {

                $stmt = $conn->prepare("
                    INSERT INTO consultation_documents
                    (
                        consultation_id,
                        user_id,
                        file_name,
                        file_path
                    )
                    VALUES (?, ?, ?, ?)
                ");

                $stmt->bind_param(
                    "iiss",
                    $consultationId,
                    $patientId,
                    $originalName,
                    $filePath
                );

                $stmt->execute();
                $stmt->close();

                $message = "Document uploaded successfully.";
                $messageType = "success";
            }
        } else {

            $message = "This file type is not allowed.";
            $messageType = "error";
        }
    }
}

include "sidebar.php";
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Consultation and Medical Record</title>

    <link rel="stylesheet" href="consultation.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <script src="darkmode.js"></script>
</head>

<body>

<main class="main-content">

    <div class="page-header">

        <div>
            <h1>Consultation and Medical Record</h1>
            <p>Record, view and manage patient consultations and complete medical history.</p>
        </div>

        <div class="header-right">

            <div class="admin-text">
                <small>You are logged in as</small>
                <strong><?php echo h($adminName); ?></strong>
            </div>

            <a href="ai-moto.php" class="ask-ai">
                <i class="fa-solid fa-wand-magic-sparkles"></i>
                Ask AI Moto
            </a>

        </div>

    </div>

    <?php if ($message !== ""): ?>

        <div class="message <?php echo h($messageType); ?>">
            <i class="fa-solid <?php echo $messageType === "success" ? "fa-circle-check" : "fa-circle-exclamation"; ?>"></i>
            <?php echo h($message); ?>
        </div>

    <?php endif; ?>

    <?php if ($selectedPatient): ?>

        <section class="patient-card">

            <div class="patient-information">

                <h2>
                    <?php
                    echo h(
                        trim(
                            ($selectedPatient["first_name"] ?? "") . " " .
                            ($selectedPatient["middle_name"] ?? "") . " " .
                            ($selectedPatient["last_name"] ?? "")
                        )
                    );
                    ?>
                </h2>

                <div class="patient-details">

                    <span>
                        <strong>Patient ID:</strong>
                        PT-<?php echo date("Y"); ?>-<?php echo str_pad($patientId, 4, "0", STR_PAD_LEFT); ?>
                    </span>

                    <span>|</span>

                    <span>
                        <?php echo h($selectedPatient["sex"] ?: "Not recorded"); ?>
                    </span>

                    <span>|</span>

                    <span>
                        <?php echo h(formatDate($selectedPatient["birth_date"])); ?>
                        (<?php echo h(patientAge($selectedPatient["birth_date"])); ?> yrs)
                    </span>

                    <span>|</span>

                    <span>
                        <?php echo h($selectedPatient["blood_type"] ?: "Blood type not recorded"); ?>
                    </span>

                </div>

                <div class="patient-contact">

                    <span>
                        <i class="fa-solid fa-mobile-screen"></i>
                        <?php echo h($selectedPatient["contact_number"] ?: "No contact number"); ?>
                    </span>

                    <span>
                        <i class="fa-solid fa-location-dot"></i>
                        <?php echo h($selectedPatient["address"] ?: "No address recorded"); ?>
                    </span>

                </div>

            </div>

            <div class="patient-stat-column">

                <div class="patient-stat">
                    <i class="fa-solid fa-droplet"></i>

                    <div>
                        <small>Blood Type</small>
                        <strong>
                            <?php echo h($selectedPatient["blood_type"] ?: "Not recorded"); ?>
                        </strong>
                    </div>
                </div>

                <div class="patient-stat">
                    <i class="fa-solid fa-weight-scale"></i>

                    <div>
                        <small>Height / Weight</small>
                        <strong>
                            <?php echo h($selectedPatient["height"] ?: "—"); ?>
                            /
                            <?php echo h($selectedPatient["weight"] ?: "—"); ?>
                        </strong>
                    </div>
                </div>

            </div>

            <div class="patient-stat-column">

                <div class="patient-stat">
                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <div>
                        <small>Allergies</small>
                        <strong>
                            <?php echo h($selectedPatient["allergies"] ?: "None recorded"); ?>
                        </strong>
                    </div>
                </div>

                <div class="patient-stat">
                    <i class="fa-solid fa-heart-pulse"></i>

                    <div>
                        <small>Chronic Conditions</small>
                        <strong>
                            <?php echo h($selectedPatient["medical_conditions"] ?: "None recorded"); ?>
                        </strong>
                    </div>
                </div>

            </div>

            <a href="patient-registration.php?patient_id=<?php echo $patientId; ?>" class="profile-button">
                View Patient Record
                <i class="fa-solid fa-arrow-right"></i>
            </a>

        </section>

        <div class="record-tabs">

            <button class="record-tab active" data-tab="consultation">
                Consultation
            </button>

            <button class="record-tab" data-tab="medical">
                Medical History
            </button>

            <button class="record-tab" data-tab="laboratory">
                Laboratory Result
            </button>

            <button class="record-tab" data-tab="vitals">
                Vital Signs History
            </button>

            <button class="record-tab" data-tab="documents">
                Documents
            </button>

            <button class="record-tab" data-tab="immunization">
                Immunization
            </button>

            <button class="record-tab" data-tab="notes">
                Notes
            </button>

        </div>

        <div id="consultation" class="tab-content active">

            <div class="consultation-layout">

                <section class="history-panel card">

                    <h2 class="panel-title">
                        CONSULTATION HISTORY
                    </h2>

                    <div class="search-box">

                        <input
                            type="text"
                            id="historySearch"
                            placeholder="Search consultation..."
                        >

                        <button type="button">
                            <i class="fa-solid fa-filter"></i>
                            Filter
                        </button>

                    </div>

                    <div class="history-list" id="historyList">

                        <?php if (count($consultations) === 0): ?>

                            <div class="empty-history">
                                <i class="fa-solid fa-file-medical"></i>
                                <strong>No consultations yet.</strong>
                                <span>Create the patient's first consultation.</span>
                            </div>

                        <?php else: ?>

                            <?php foreach ($consultations as $consultation): ?>

                                <a
                                    href="consultation.php?patient_id=<?php echo $patientId; ?>&consultation_id=<?php echo (int) $consultation["consultation_id"]; ?>"
                                    class="history-item <?php echo (int) $consultation["consultation_id"] === $consultationId ? "selected" : ""; ?>"
                                >

                                    <div class="history-icon">
                                        <i class="fa-regular fa-calendar-days"></i>
                                    </div>

                                    <div class="history-info">

                                        <div class="history-date">
                                            <strong>
                                                <?php echo h(formatDate($consultation["consultation_date"])); ?>
                                            </strong>

                                            <span>
                                                <?php echo h(formatTime($consultation["consultation_time"])); ?>
                                            </span>
                                        </div>

                                        <strong>
                                            <?php echo h($consultation["visit_type"]); ?>
                                        </strong>

                                        <small>
                                            <?php echo h($consultation["provider_name"] ?: "Health Center Staff"); ?>
                                        </small>

                                    </div>

                                    <span class="status">
                                        <?php echo h($consultation["status"]); ?>
                                    </span>

                                    <i class="fa-solid fa-chevron-right"></i>

                                </a>

                            <?php endforeach; ?>

                        <?php endif; ?>

                    </div>

                    <button
                        class="new-consultation"
                        id="newConsultationButton"
                        type="button"
                    >
                        <i class="fa-solid fa-plus"></i>
                        New Consultation
                    </button>

                </section>

                <section class="details-panel card">

                    <?php if ($selectedConsultation): ?>

                        <div class="section-heading">

                            <h2>CONSULTATION DETAILS</h2>

                            <div class="section-actions">

                                <button
                                    type="button"
                                    id="editButton"
                                >
                                    <i class="fa-solid fa-pen"></i>
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    id="printButton"
                                >
                                    <i class="fa-solid fa-print"></i>
                                    Print
                                </button>

                            </div>

                        </div>

                        <div class="consultation-summary">

                            <div>
                                <i class="fa-regular fa-calendar-days"></i>
                                <span>Date &amp; Time</span>
                                <strong>
                                    <?php echo h(formatDate($selectedConsultation["consultation_date"])); ?><br>
                                    <?php echo h(formatTime($selectedConsultation["consultation_time"])); ?>
                                </strong>
                            </div>

                            <div>
                                <i class="fa-solid fa-user-doctor"></i>
                                <span>Conducted By</span>
                                <strong>
                                    <?php echo h($selectedConsultation["provider_name"] ?: "Health Center Staff"); ?>
                                </strong>
                            </div>

                            <div>
                                <i class="fa-solid fa-stethoscope"></i>
                                <span>Type of Visit</span>
                                <strong>
                                    <?php echo h($selectedConsultation["visit_type"]); ?>
                                </strong>
                            </div>

                            <div>
                                <i class="fa-regular fa-circle-check"></i>
                                <span>Status</span>
                                <strong class="completed">
                                    <?php echo h($selectedConsultation["status"]); ?>
                                </strong>
                            </div>

                        </div>

                        <div class="two-column">

                            <div>
                                <h3>CHIEF COMPLAINT</h3>

                                <div class="info-box">
                                    <?php echo nl2br(h($selectedConsultation["chief_complaint"] ?: "Not recorded")); ?>
                                </div>
                            </div>

                            <div>
                                <h3>HISTORY OF PRESENT ILLNESS</h3>

                                <div class="info-box">
                                    <?php echo nl2br(h($selectedConsultation["history_present_illness"] ?: "Not recorded")); ?>
                                </div>
                            </div>

                        </div>

                        <div class="divider"></div>

                        <div class="two-column">

                            <div>

                                <h3>VITAL SIGNS</h3>

                                <div class="vitals-grid">

                                    <div>
                                        <label>Temperature</label>
                                        <input
                                            value="<?php echo h($vitals["temperature"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Respiratory Rate</label>
                                        <input
                                            value="<?php echo h($vitals["respiratory_rate"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Blood Pressure</label>
                                        <input
                                            value="<?php echo h($vitals["blood_pressure"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Oxygen Saturation</label>
                                        <input
                                            value="<?php echo h($vitals["oxygen_saturation"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Heart Rate</label>
                                        <input
                                            value="<?php echo h($vitals["heart_rate"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Height</label>
                                        <input
                                            value="<?php echo h($vitals["height"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                    <div>
                                        <label>Weight</label>
                                        <input
                                            value="<?php echo h($vitals["weight"] ?? ""); ?>"
                                            readonly
                                        >
                                    </div>

                                </div>

                            </div>

                            <div>

                                <h3>PHYSICAL EXAMINATION</h3>

                                <div class="exam-text">
                                    <?php echo nl2br(h($selectedConsultation["physical_examination"] ?: "Not recorded")); ?>
                                </div>

                            </div>

                        </div>

                        <div class="divider"></div>

                        <div class="assessment-grid">

                            <div>

                                <h3>ASSESSMENT</h3>

                                <div class="assessment-box">

                                    <strong>
                                        <?php echo h($selectedConsultation["primary_diagnosis"] ?: "Not recorded"); ?>
                                    </strong>

                                    <?php if (!empty($selectedConsultation["diagnosis_code"])): ?>
                                        <small>
                                            <?php echo h($selectedConsultation["diagnosis_code"]); ?>
                                        </small>
                                    <?php endif; ?>

                                    <?php if (!empty($selectedConsultation["secondary_diagnosis"])): ?>
                                        <p>
                                            <?php echo h($selectedConsultation["secondary_diagnosis"]); ?>
                                        </p>
                                    <?php endif; ?>

                                </div>

                            </div>

                            <div>

                                <h3>PLAN / TREATMENT</h3>

                                <div class="assessment-box">
                                    <?php echo nl2br(h($selectedConsultation["treatment_plan"] ?: "Not recorded")); ?>
                                </div>

                            </div>

                        </div>

                        <div class="divider"></div>

                        <div class="notes-section">

                            <h3>NOTES</h3>

                            <p>
                                <?php echo nl2br(h($selectedConsultation["notes"] ?: "No notes recorded.")); ?>
                            </p>

                        </div>

                    <?php else: ?>

                        <div class="empty-details">
                            <i class="fa-solid fa-file-medical"></i>
                            <h2>No Consultation Selected</h2>
                            <p>Create a new consultation or select one from the history.</p>
                        </div>

                    <?php endif; ?>

                </section>

                <aside class="right-panel">

                    <div class="side-card card">

                        <div class="side-card-heading">
                            <h2>DIAGNOSIS</h2>
                            <i class="fa-solid fa-stethoscope"></i>
                        </div>

                        <?php if ($selectedConsultation): ?>

                            <p>
                                <strong>Primary Diagnosis</strong>
                            </p>

                            <div class="diagnosis-row">

                                <span>
                                    <?php echo h($selectedConsultation["primary_diagnosis"] ?: "Not recorded"); ?>
                                </span>

                                <small>
                                    <?php echo h($selectedConsultation["diagnosis_code"] ?: ""); ?>
                                </small>

                            </div>

                            <p>
                                <strong>Secondary Diagnosis</strong>
                            </p>

                            <div class="diagnosis-row">
                                <span>
                                    <?php echo h($selectedConsultation["secondary_diagnosis"] ?: "None"); ?>
                                </span>
                            </div>

                        <?php else: ?>

                            <p>No diagnosis recorded.</p>

                        <?php endif; ?>

                    </div>

                    <div class="side-card card">

                        <div class="side-card-heading">
                            <h2>PRESCRIPTIONS</h2>
                        </div>

                        <?php if (count($prescriptions) > 0): ?>

                            <table>

                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th>Dose</th>
                                        <th>Frequency</th>
                                        <th>Duration</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    <?php foreach ($prescriptions as $prescription): ?>

                                        <tr>

                                            <td>
                                                <?php echo h($prescription["medicine"]); ?>
                                            </td>

                                            <td>
                                                <?php echo h($prescription["dose"]); ?>
                                            </td>

                                            <td>
                                                <?php echo h($prescription["frequency"]); ?>
                                            </td>

                                            <td>
                                                <?php echo h($prescription["duration"]); ?>
                                            </td>

                                        </tr>

                                    <?php endforeach; ?>

                                </tbody>

                            </table>

                        <?php else: ?>

                            <p>No prescriptions recorded.</p>

                        <?php endif; ?>

                    </div>

                    <div class="side-card card">

                        <div class="side-card-heading">
                            <h2>FOLLOW-UP</h2>
                        </div>

                        <?php if (
                            $selectedConsultation &&
                            !empty($selectedConsultation["follow_up_date"])
                        ): ?>

                            <div class="follow-up">

                                <i class="fa-regular fa-calendar-days"></i>

                                <strong>
                                    <?php echo h(formatDate($selectedConsultation["follow_up_date"])); ?>
                                </strong>

                                <span>
                                    <?php echo h(formatTime($selectedConsultation["follow_up_time"])); ?>
                                </span>

                            </div>

                        <?php else: ?>

                            <p>No follow-up scheduled.</p>

                        <?php endif; ?>

                    </div>

                    <div class="side-card card">

                        <div class="side-card-heading">
                            <h2>ATTACHMENTS</h2>
                        </div>

                        <?php if (count($documents) > 0): ?>

                            <?php foreach ($documents as $document): ?>

                                <a
                                    href="<?php echo h($document["file_path"]); ?>"
                                    target="_blank"
                                    class="attachment"
                                >

                                    <i class="fa-regular fa-file"></i>

                                    <div>

                                        <strong>
                                            <?php echo h($document["file_name"]); ?>
                                        </strong>

                                        <small>
                                            Uploaded <?php echo h(formatDate($document["uploaded_at"])); ?>
                                        </small>

                                    </div>

                                    <i class="fa-solid fa-download"></i>

                                </a>

                            <?php endforeach; ?>

                        <?php else: ?>

                            <p>No documents uploaded.</p>

                        <?php endif; ?>

                        <?php if ($selectedConsultation): ?>

                            <form
                                method="POST"
                                enctype="multipart/form-data"
                                class="upload-form"
                            >

                                <input
                                    type="hidden"
                                    name="patient_id"
                                    value="<?php echo $patientId; ?>"
                                >

                                <input
                                    type="hidden"
                                    name="consultation_id"
                                    value="<?php echo $consultationId; ?>"
                                >

                                <label class="upload-button">

                                    <i class="fa-solid fa-upload"></i>
                                    Upload Document

                                    <input
                                        type="file"
                                        name="document"
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        required
                                        onchange="this.form.submit()"
                                    >

                                </label>

                                <input
                                    type="hidden"
                                    name="upload_document"
                                    value="1"
                                >

                            </form>

                        <?php endif; ?>

                    </div>

                </aside>

            </div>

        </div>

        <div id="medical" class="tab-content placeholder-tab">

            <div class="card placeholder-card">

                <h2>Medical History</h2>

                <?php if (count($consultations) > 0): ?>

                    <div class="history-table">

                        <?php foreach ($consultations as $consultation): ?>

                            <div>

                                <strong>
                                    <?php echo h(formatDate($consultation["consultation_date"])); ?>
                                </strong>

                                <span>
                                    <?php echo h($consultation["visit_type"]); ?>
                                </span>

                                <small>
                                    <?php echo h($consultation["primary_diagnosis"] ?: "No diagnosis"); ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    </div>

                <?php else: ?>

                    <p>No medical history recorded.</p>

                <?php endif; ?>

            </div>

        </div>

        <div id="laboratory" class="tab-content placeholder-tab">

            <div class="card placeholder-card">
                <h2>Laboratory Result</h2>
                <p>Laboratory result management can be connected to the consultation record next.</p>
            </div>

        </div>

        <div id="vitals" class="tab-content placeholder-tab">

            <div class="card placeholder-card">

                <h2>Vital Signs History</h2>

                <?php if (count($consultations) > 0): ?>

                    <div class="history-table">

                        <?php foreach ($consultations as $consultation): ?>

                            <?php
                            $vitalHistory = null;

                            $vitalHistoryStmt = $conn->prepare("
                                SELECT *
                                FROM vital_signs
                                WHERE consultation_id = ?
                                LIMIT 1
                            ");

                            $vitalHistoryStmt->bind_param(
                                "i",
                                $consultation["consultation_id"]
                            );

                            $vitalHistoryStmt->execute();

                            $vitalHistory = $vitalHistoryStmt
                                ->get_result()
                                ->fetch_assoc();

                            $vitalHistoryStmt->close();
                            ?>

                            <div>

                                <strong>
                                    <?php echo h(formatDate($consultation["consultation_date"])); ?>
                                </strong>

                                <span>
                                    BP:
                                    <?php echo h($vitalHistory["blood_pressure"] ?? "—"); ?>
                                </span>

                                <small>
                                    Temp:
                                    <?php echo h($vitalHistory["temperature"] ?? "—"); ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    </div>

                <?php else: ?>

                    <p>No vital signs recorded.</p>

                <?php endif; ?>

            </div>

        </div>

        <div id="documents" class="tab-content placeholder-tab">

            <div class="card placeholder-card">

                <h2>Documents</h2>

                <?php if (count($documents) > 0): ?>

                    <?php foreach ($documents as $document): ?>

                        <a
                            href="<?php echo h($document["file_path"]); ?>"
                            target="_blank"
                            class="document-row"
                        >
                            <i class="fa-regular fa-file"></i>

                            <span>
                                <?php echo h($document["file_name"]); ?>
                            </span>

                            <i class="fa-solid fa-download"></i>
                        </a>

                    <?php endforeach; ?>

                <?php else: ?>

                    <p>No documents uploaded for this consultation.</p>

                <?php endif; ?>

            </div>

        </div>

        <div id="immunization" class="tab-content placeholder-tab">

            <div class="card placeholder-card">

                <h2>Immunization</h2>

                <?php
                $immunizations = [];

                $stmt = $conn->prepare("
                    SELECT
                        vaccine,
                        dose,
                        date_given,
                        status
                    FROM immunization_records
                    WHERE user_id = ?
                    ORDER BY date_given DESC
                ");

                $stmt->bind_param("i", $patientId);
                $stmt->execute();

                $result = $stmt->get_result();

                while ($row = $result->fetch_assoc()) {
                    $immunizations[] = $row;
                }

                $stmt->close();
                ?>

                <?php if (count($immunizations) > 0): ?>

                    <div class="history-table">

                        <?php foreach ($immunizations as $immunization): ?>

                            <div>

                                <strong>
                                    <?php echo h($immunization["vaccine"]); ?>
                                </strong>

                                <span>
                                    <?php echo h($immunization["dose"]); ?>
                                </span>

                                <small>
                                    <?php echo h(formatDate($immunization["date_given"])); ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    </div>

                <?php else: ?>

                    <p>No immunization records found.</p>

                <?php endif; ?>

            </div>

        </div>

        <div id="notes" class="tab-content placeholder-tab">

            <div class="card placeholder-card">

                <h2>Notes</h2>

                <?php if (count($consultations) > 0): ?>

                    <div class="history-table">

                        <?php foreach ($consultations as $consultation): ?>

                            <?php
                            $noteStmt = $conn->prepare("
                                SELECT notes, consultation_date, visit_type
                                FROM consultations
                                WHERE consultation_id = ?
                                LIMIT 1
                            ");

                            $noteStmt->bind_param(
                                "i",
                                $consultation["consultation_id"]
                            );

                            $noteStmt->execute();

                            $note = $noteStmt
                                ->get_result()
                                ->fetch_assoc();

                            $noteStmt->close();
                            ?>

                            <div>

                                <strong>
                                    <?php echo h(formatDate($note["consultation_date"])); ?>
                                </strong>

                                <span>
                                    <?php echo h($note["visit_type"]); ?>
                                </span>

                                <small>
                                    <?php echo h($note["notes"] ?: "No notes recorded."); ?>
                                </small>

                            </div>

                        <?php endforeach; ?>

                    </div>

                <?php else: ?>

                    <p>No notes recorded.</p>

                <?php endif; ?>

            </div>

        </div>

        <div class="disclaimer">

            <i class="fa-solid fa-circle-info"></i>

            <span>
                This record is for health center use only and is not a substitute for professional medical advice, diagnosis or treatment.
            </span>

        </div>

    <?php else: ?>

        <section class="empty-patient">

            <i class="fa-solid fa-user-injured"></i>

            <h2>No Patient Selected</h2>

            <p>Select a patient from Patient Registration and Record before creating a consultation.</p>

            <a href="patient-registration.php">
                Go to Patient Registration
            </a>

        </section>

    <?php endif; ?>

</main>

<div class="modal" id="consultationModal">

    <div class="modal-box">

        <div class="modal-header">

            <h2>
                <?php echo $selectedConsultation ? "Edit Consultation" : "New Consultation"; ?>
            </h2>

            <button type="button" id="closeModal">
                <i class="fa-solid fa-xmark"></i>
            </button>

        </div>

        <form method="POST">

            <input
                type="hidden"
                name="save_consultation"
                value="1"
            >

            <input
                type="hidden"
                name="patient_id"
                value="<?php echo $patientId; ?>"
            >

            <input
                type="hidden"
                name="consultation_id"
                id="modalConsultationId"
                value="<?php echo $selectedConsultation["consultation_id"] ?? 0; ?>"
            >

            <div class="form-grid">

                <div>

                    <label>Date</label>

                    <input
                        type="date"
                        name="consultation_date"
                        id="consultationDate"
                        value="<?php echo h($selectedConsultation["consultation_date"] ?? date("Y-m-d")); ?>"
                        required
                    >

                </div>

                <div>

                    <label>Time</label>

                    <input
                        type="time"
                        name="consultation_time"
                        id="consultationTime"
                        value="<?php echo h($selectedConsultation["consultation_time"] ?? date("H:i")); ?>"
                        required
                    >

                </div>

                <div>

                    <label>Type of Visit</label>

                    <select name="visit_type" id="visitType">

                        <?php
                        $visitTypes = [
                            "General Consultation",
                            "Follow-up Check-up",
                            "Immunization",
                            "Maternal Health",
                            "Infant and Child Health",
                            "TB DOTS"
                        ];
                        ?>

                        <?php foreach ($visitTypes as $visitTypeOption): ?>

                            <option
                                value="<?php echo h($visitTypeOption); ?>"
                                <?php echo (($selectedConsultation["visit_type"] ?? "General Consultation") === $visitTypeOption) ? "selected" : ""; ?>
                            >
                                <?php echo h($visitTypeOption); ?>
                            </option>

                        <?php endforeach; ?>

                    </select>

                </div>

                <div>

                    <label>Status</label>

                    <select name="status" id="consultationStatus">

                        <?php
                        $statuses = [
                            "Completed",
                            "Pending",
                            "Cancelled"
                        ];
                        ?>

                        <?php foreach ($statuses as $statusOption): ?>

                            <option
                                value="<?php echo h($statusOption); ?>"
                                <?php echo (($selectedConsultation["status"] ?? "Completed") === $statusOption) ? "selected" : ""; ?>
                            >
                                <?php echo h($statusOption); ?>
                            </option>

                        <?php endforeach; ?>

                    </select>

                </div>

                <div class="full">

                    <label>Chief Complaint</label>

                    <textarea
                        name="chief_complaint"
                        rows="3"
                    ><?php echo h($selectedConsultation["chief_complaint"] ?? ""); ?></textarea>

                </div>

                <div class="full">

                    <label>History of Present Illness</label>

                    <textarea
                        name="history_present_illness"
                        rows="3"
                    ><?php echo h($selectedConsultation["history_present_illness"] ?? ""); ?></textarea>

                </div>

                <div class="full">

                    <label>Physical Examination</label>

                    <textarea
                        name="physical_examination"
                        rows="3"
                    ><?php echo h($selectedConsultation["physical_examination"] ?? ""); ?></textarea>

                </div>

                <div>

                    <label>Temperature</label>

                    <input
                        type="number"
                        step="0.01"
                        name="temperature"
                        value="<?php echo h($vitals["temperature"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Respiratory Rate</label>

                    <input
                        type="number"
                        step="0.01"
                        name="respiratory_rate"
                        value="<?php echo h($vitals["respiratory_rate"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Blood Pressure</label>

                    <input
                        type="text"
                        name="blood_pressure"
                        value="<?php echo h($vitals["blood_pressure"] ?? ""); ?>"
                        placeholder="120/80"
                    >

                </div>

                <div>

                    <label>Oxygen Saturation</label>

                    <input
                        type="number"
                        step="0.01"
                        name="oxygen_saturation"
                        value="<?php echo h($vitals["oxygen_saturation"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Heart Rate</label>

                    <input
                        type="number"
                        step="0.01"
                        name="heart_rate"
                        value="<?php echo h($vitals["heart_rate"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Height</label>

                    <input
                        type="number"
                        step="0.01"
                        name="height"
                        value="<?php echo h($vitals["height"] ?? $selectedPatient["height"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Weight</label>

                    <input
                        type="number"
                        step="0.01"
                        name="weight"
                        value="<?php echo h($vitals["weight"] ?? $selectedPatient["weight"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Primary Diagnosis</label>

                    <input
                        type="text"
                        name="primary_diagnosis"
                        value="<?php echo h($selectedConsultation["primary_diagnosis"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Diagnosis Code</label>

                    <input
                        type="text"
                        name="diagnosis_code"
                        value="<?php echo h($selectedConsultation["diagnosis_code"] ?? ""); ?>"
                    >

                </div>

                <div class="full">

                    <label>Secondary Diagnosis</label>

                    <input
                        type="text"
                        name="secondary_diagnosis"
                        value="<?php echo h($selectedConsultation["secondary_diagnosis"] ?? ""); ?>"
                    >

                </div>

                <div class="full">

                    <label>Plan / Treatment</label>

                    <textarea
                        name="treatment_plan"
                        rows="3"
                    ><?php echo h($selectedConsultation["treatment_plan"] ?? ""); ?></textarea>

                </div>

                <div class="full">

                    <label>Notes</label>

                    <textarea
                        name="notes"
                        rows="3"
                    ><?php echo h($selectedConsultation["notes"] ?? ""); ?></textarea>

                </div>

                <div>

                    <label>Follow-up Date</label>

                    <input
                        type="date"
                        name="follow_up_date"
                        value="<?php echo h($selectedConsultation["follow_up_date"] ?? ""); ?>"
                    >

                </div>

                <div>

                    <label>Follow-up Time</label>

                    <input
                        type="time"
                        name="follow_up_time"
                        value="<?php echo h($selectedConsultation["follow_up_time"] ?? ""); ?>"
                    >

                </div>

                <div class="full prescription-section">

                    <div class="prescription-header">

                        <label>Prescriptions</label>

                        <button
                            type="button"
                            id="addPrescription"
                        >
                            <i class="fa-solid fa-plus"></i>
                            Add Medicine
                        </button>

                    </div>

                    <div id="prescriptionRows">

                        <?php if (count($prescriptions) > 0): ?>

                            <?php foreach ($prescriptions as $prescription): ?>

                                <div class="prescription-row">

                                    <input
                                        type="text"
                                        name="medicine[]"
                                        placeholder="Medicine"
                                        value="<?php echo h($prescription["medicine"]); ?>"
                                    >

                                    <input
                                        type="text"
                                        name="dose[]"
                                        placeholder="Dose"
                                        value="<?php echo h($prescription["dose"]); ?>"
                                    >

                                    <input
                                        type="text"
                                        name="frequency[]"
                                        placeholder="Frequency"
                                        value="<?php echo h($prescription["frequency"]); ?>"
                                    >

                                    <input
                                        type="text"
                                        name="duration[]"
                                        placeholder="Duration"
                                        value="<?php echo h($prescription["duration"]); ?>"
                                    >

                                    <input
                                        type="text"
                                        name="instructions[]"
                                        placeholder="Instructions"
                                        value="<?php echo h($prescription["instructions"]); ?>"
                                    >

                                    <button
                                        type="button"
                                        class="remove-prescription"
                                    >
                                        <i class="fa-solid fa-trash"></i>
                                    </button>

                                </div>

                            <?php endforeach; ?>

                        <?php else: ?>

                            <div class="prescription-row">

                                <input
                                    type="text"
                                    name="medicine[]"
                                    placeholder="Medicine"
                                >

                                <input
                                    type="text"
                                    name="dose[]"
                                    placeholder="Dose"
                                >

                                <input
                                    type="text"
                                    name="frequency[]"
                                    placeholder="Frequency"
                                >

                                <input
                                    type="text"
                                    name="duration[]"
                                    placeholder="Duration"
                                >

                                <input
                                    type="text"
                                    name="instructions[]"
                                    placeholder="Instructions"
                                >

                                <button
                                    type="button"
                                    class="remove-prescription"
                                >
                                    <i class="fa-solid fa-trash"></i>
                                </button>

                            </div>

                        <?php endif; ?>

                    </div>

                </div>

            </div>

            <div class="modal-actions">

                <button
                    type="button"
                    class="cancel-button"
                    id="cancelModal"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="save-button"
                >
                    <i class="fa-solid fa-floppy-disk"></i>
                    Save Consultation
                </button>

            </div>

        </form>

    </div>

</div>

<script>
document.addEventListener("DOMContentLoaded", function () {

    const tabs = document.querySelectorAll(".record-tab");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach(function (tab) {

        tab.addEventListener("click", function () {

            const target = tab.dataset.tab;

            tabs.forEach(function (item) {
                item.classList.remove("active");
            });

            contents.forEach(function (content) {
                content.classList.remove("active");
            });

            tab.classList.add("active");

            const targetContent = document.getElementById(target);

            if (targetContent) {
                targetContent.classList.add("active");
            }

        });

    });

    const searchInput = document.getElementById("historySearch");

    if (searchInput) {

        searchInput.addEventListener("input", function () {

            const search = this.value.toLowerCase().trim();

            document.querySelectorAll(".history-item").forEach(function (item) {

                const text = item.textContent.toLowerCase();

                item.style.display =
                    text.includes(search)
                        ? "grid"
                        : "none";

            });

        });

    }

    const modal = document.getElementById("consultationModal");
    const newButton = document.getElementById("newConsultationButton");
    const closeButton = document.getElementById("closeModal");
    const cancelButton = document.getElementById("cancelModal");
    const editButton = document.getElementById("editButton");
    const printButton = document.getElementById("printButton");

    if (modal && newButton) {

        newButton.addEventListener("click", function () {

            const form = modal.querySelector("form");

            if (form) {
                form.reset();
            }

            const consultationId =
                document.getElementById("modalConsultationId");

            if (consultationId) {
                consultationId.value = "0";
            }

            const dateInput =
                document.getElementById("consultationDate");

            const timeInput =
                document.getElementById("consultationTime");

            if (dateInput) {

                const today =
                    new Date().toISOString().split("T")[0];

                dateInput.value = today;
            }

            if (timeInput) {

                const now = new Date();

                const hours =
                    String(now.getHours()).padStart(2, "0");

                const minutes =
                    String(now.getMinutes()).padStart(2, "0");

                timeInput.value =
                    hours + ":" + minutes;
            }

            modal.classList.add("show");

        });

    }

    if (modal && editButton) {

        editButton.addEventListener("click", function () {
            modal.classList.add("show");
        });

    }

    if (modal && closeButton) {

        closeButton.addEventListener("click", function () {
            modal.classList.remove("show");
        });

    }

    if (modal && cancelButton) {

        cancelButton.addEventListener("click", function () {
            modal.classList.remove("show");
        });

    }

    if (modal) {

        modal.addEventListener("click", function (event) {

            if (event.target === modal) {
                modal.classList.remove("show");
            }

        });

    }

    if (printButton) {

        printButton.addEventListener("click", function () {
            window.print();
        });

    }

    const addPrescription =
        document.getElementById("addPrescription");

    const prescriptionRows =
        document.getElementById("prescriptionRows");

    if (addPrescription && prescriptionRows) {

        addPrescription.addEventListener("click", function () {

            const row =
                document.createElement("div");

            row.className = "prescription-row";

            row.innerHTML = `
                <input type="text" name="medicine[]" placeholder="Medicine">
                <input type="text" name="dose[]" placeholder="Dose">
                <input type="text" name="frequency[]" placeholder="Frequency">
                <input type="text" name="duration[]" placeholder="Duration">
                <input type="text" name="instructions[]" placeholder="Instructions">
                <button type="button" class="remove-prescription">
                    <i class="fa-solid fa-trash"></i>
                </button>
            `;

            prescriptionRows.appendChild(row);

        });

    }

    document.addEventListener("click", function (event) {

        const button =
            event.target.closest(".remove-prescription");

        if (!button) {
            return;
        }

        const rows =
            document.querySelectorAll(".prescription-row");

        if (rows.length > 1) {
            button.closest(".prescription-row").remove();
        }

    });

});
</script>

</body>
</html>

<?php
$conn->close();
?>