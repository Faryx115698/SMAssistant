<?php
session_start();
require_once "db.php";

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}

$role = strtolower(trim($_SESSION["user"]["role"] ?? ""));

if (!in_array($role, ["admin", "administrator"], true)) {
    header("Location: dashboard.php");
    exit;
}

function h($value)
{
    return htmlspecialchars((string)$value, ENT_QUOTES, "UTF-8");
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

function formatDateTime($date, $time = "")
{
    if (!$date) {
        return "—";
    }

    $value = $date;

    if ($time !== "") {
        $value .= " " . $time;
    }

    $timestamp = strtotime($value);

    return $timestamp ? date("F j, Y • g:i A", $timestamp) : "—";
}

function tableExists($conn, $table)
{
    $safeTable = $conn->real_escape_string($table);
    $result = $conn->query("SHOW TABLES LIKE '{$safeTable}'");

    return $result && $result->num_rows > 0;
}

function columnExists($conn, $table, $column)
{
    $safeTable = $conn->real_escape_string($table);
    $safeColumn = $conn->real_escape_string($column);

    $result = $conn->query("SHOW COLUMNS FROM `{$safeTable}` LIKE '{$safeColumn}'");

    return $result && $result->num_rows > 0;
}

function patientName($patient)
{
    $name = trim(
        ($patient["first_name"] ?? "") . " " .
        ($patient["middle_name"] ?? "") . " " .
        ($patient["last_name"] ?? "")
    );

    if (!empty($patient["suffix"])) {
        $name .= " " . $patient["suffix"];
    }

    return trim($name);
}

function bindDynamic($stmt, $types, &$values)
{
    $params = [];
    $params[] = $types;

    foreach ($values as $key => &$value) {
        $params[] = &$value;
    }

    call_user_func_array([$stmt, "bind_param"], $params);
}

$userOptionalColumns = [
    "middle_name",
    "suffix",
    "civil_status",
    "nationality",
    "religion",
    "occupation",
    "telephone"
];

$existingOptionalColumns = [];

foreach ($userOptionalColumns as $column) {
    if (columnExists($conn, "user_profile", $column)) {
        $existingOptionalColumns[] = $column;
    }
}

$message = "";
$messageType = "";

$selectedId = (int)($_GET["patient_id"] ?? 0);
$newPatientMode = isset($_GET["new_patient"]);

if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["save_new_patient"])) {

    $firstName = trim($_POST["first_name"] ?? "");
    $middleName = trim($_POST["middle_name"] ?? "");
    $lastName = trim($_POST["last_name"] ?? "");
    $suffix = trim($_POST["suffix"] ?? "");
    $birthDate = trim($_POST["birth_date"] ?? "");
    $sex = trim($_POST["sex"] ?? "");
    $civilStatus = trim($_POST["civil_status"] ?? "");
    $nationality = trim($_POST["nationality"] ?? "");
    $religion = trim($_POST["religion"] ?? "");
    $occupation = trim($_POST["occupation"] ?? "");
    $contactNumber = trim($_POST["contact_number"] ?? "");
    $telephone = trim($_POST["telephone"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $address = trim($_POST["address"] ?? "");

    $bloodType = trim($_POST["blood_type"] ?? "");
    $height = trim($_POST["height"] ?? "");
    $weight = trim($_POST["weight"] ?? "");
    $allergies = trim($_POST["allergies"] ?? "");
    $medicalConditions = trim($_POST["medical_conditions"] ?? "");

    if ($firstName === "" || $lastName === "") {

        $message = "First name and last name are required.";
        $messageType = "error";
        $newPatientMode = true;

    } else {

        $duplicateEmail = false;

        if ($email !== "") {

            $stmt = $conn->prepare("
                SELECT user_id
                FROM user_profile
                WHERE email = ?
                LIMIT 1
            ");

            if ($stmt) {
                $stmt->bind_param("s", $email);
                $stmt->execute();

                $existingUser = $stmt->get_result()->fetch_assoc();

                if ($existingUser) {
                    $duplicateEmail = true;
                }

                $stmt->close();
            }
        }

        if ($duplicateEmail) {

            $message = "That email address is already registered.";
            $messageType = "error";
            $newPatientMode = true;

        } else {

            try {

                $conn->begin_transaction();

                $fields = [
                    "first_name",
                    "last_name",
                    "sex",
                    "birth_date",
                    "address",
                    "contact_number",
                    "email",
                    "password"
                ];

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

                foreach ($existingOptionalColumns as $column) {

                    $fields[] = $column;

                    $value = $optionalValues[$column] ?? "";

                    $values[] = $value !== "" ? $value : null;
                }

                $fieldList = implode(", ", array_map(function ($field) {
                    return "`" . $field . "`";
                }, $fields));

                $placeholders = implode(", ", array_fill(0, count($fields), "?"));

                $stmt = $conn->prepare("
                    INSERT INTO user_profile
                    ({$fieldList})
                    VALUES ({$placeholders})
                ");

                if (!$stmt) {
                    throw new Exception("Unable to prepare patient account.");
                }

                $types = str_repeat("s", count($values));

                bindDynamic($stmt, $types, $values);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $newPatientId = $conn->insert_id;

                $stmt->close();

                $stmt = $conn->prepare("
                    INSERT INTO health_profile
                    (
                        user_id,
                        blood_type,
                        height,
                        weight,
                        allergies,
                        medical_conditions
                    )
                    VALUES (
                        ?,
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, '')
                    )
                ");

                if (!$stmt) {
                    throw new Exception("Unable to prepare health profile.");
                }

                $stmt->bind_param(
                    "isssss",
                    $newPatientId,
                    $bloodType,
                    $height,
                    $weight,
                    $allergies,
                    $medicalConditions
                );

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                $conn->commit();

                header(
                    "Location: patient-registration.php?patient_id=" .
                    $newPatientId .
                    "&saved=1"
                );

                exit;

            } catch (Exception $e) {

                $conn->rollback();

                $message = "Unable to add patient. Please check the information and try again.";
                $messageType = "error";
                $newPatientMode = true;
            }
        }
    }
}

if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["save_patient"])) {

    $userId = (int)($_POST["user_id"] ?? 0);

    $firstName = trim($_POST["first_name"] ?? "");
    $middleName = trim($_POST["middle_name"] ?? "");
    $lastName = trim($_POST["last_name"] ?? "");
    $suffix = trim($_POST["suffix"] ?? "");
    $birthDate = trim($_POST["birth_date"] ?? "");
    $sex = trim($_POST["sex"] ?? "");
    $civilStatus = trim($_POST["civil_status"] ?? "");
    $nationality = trim($_POST["nationality"] ?? "");
    $religion = trim($_POST["religion"] ?? "");
    $occupation = trim($_POST["occupation"] ?? "");
    $contactNumber = trim($_POST["contact_number"] ?? "");
    $telephone = trim($_POST["telephone"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $address = trim($_POST["address"] ?? "");

    $bloodType = trim($_POST["blood_type"] ?? "");
    $height = trim($_POST["height"] ?? "");
    $weight = trim($_POST["weight"] ?? "");
    $allergies = trim($_POST["allergies"] ?? "");
    $medicalConditions = trim($_POST["medical_conditions"] ?? "");

    if ($firstName === "" || $lastName === "") {

        $message = "First name and last name are required.";
        $messageType = "error";

    } elseif ($userId > 0) {

        $duplicateEmail = false;

        if ($email !== "") {

            $stmt = $conn->prepare("
                SELECT user_id
                FROM user_profile
                WHERE email = ?
                AND user_id <> ?
                LIMIT 1
            ");

            if ($stmt) {

                $stmt->bind_param("si", $email, $userId);
                $stmt->execute();

                $existingUser = $stmt->get_result()->fetch_assoc();

                if ($existingUser) {
                    $duplicateEmail = true;
                }

                $stmt->close();
            }
        }

        if ($duplicateEmail) {

            $message = "That email address is already registered to another patient.";
            $messageType = "error";

        } else {

            try {

                $conn->begin_transaction();

                $fields = [
                    "first_name",
                    "last_name",
                    "sex",
                    "birth_date",
                    "address",
                    "contact_number",
                    "email"
                ];

                $values = [
                    $firstName,
                    $lastName,
                    $sex !== "" ? $sex : null,
                    $birthDate !== "" ? $birthDate : null,
                    $address !== "" ? $address : null,
                    $contactNumber !== "" ? $contactNumber : null,
                    $email !== "" ? $email : null
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

                foreach ($existingOptionalColumns as $column) {

                    $fields[] = $column;

                    $value = $optionalValues[$column] ?? "";

                    $values[] = $value !== "" ? $value : null;
                }

                $setParts = [];

                foreach ($fields as $field) {
                    $setParts[] = "`{$field}` = ?";
                }

                $values[] = $userId;

                $stmt = $conn->prepare("
                    UPDATE user_profile
                    SET " . implode(", ", $setParts) . "
                    WHERE user_id = ?
                ");

                if (!$stmt) {
                    throw new Exception("Unable to prepare update.");
                }

                $types = str_repeat("s", count($fields)) . "i";

                bindDynamic($stmt, $types, $values);

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                $stmt = $conn->prepare("
                    INSERT INTO health_profile
                    (
                        user_id,
                        blood_type,
                        height,
                        weight,
                        allergies,
                        medical_conditions
                    )
                    VALUES (
                        ?,
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, ''),
                        NULLIF(?, '')
                    )
                    ON DUPLICATE KEY UPDATE
                        blood_type = VALUES(blood_type),
                        height = VALUES(height),
                        weight = VALUES(weight),
                        allergies = VALUES(allergies),
                        medical_conditions = VALUES(medical_conditions)
                ");

                if (!$stmt) {
                    throw new Exception("Unable to prepare health profile.");
                }

                $stmt->bind_param(
                    "isssss",
                    $userId,
                    $bloodType,
                    $height,
                    $weight,
                    $allergies,
                    $medicalConditions
                );

                if (!$stmt->execute()) {
                    throw new Exception($stmt->error);
                }

                $stmt->close();

                $conn->commit();

                $message = "Patient information saved successfully.";
                $messageType = "success";

                $selectedId = $userId;

            } catch (Exception $e) {

                $conn->rollback();

                $message = "Unable to save patient information.";
                $messageType = "error";
            }
        }
    }
}

if (isset($_GET["saved"]) && $_GET["saved"] === "1") {

    $message = "New patient added successfully.";
    $messageType = "success";
}

$search = trim($_GET["search"] ?? "");

$patients = [];

$selectColumns = [
    "user_id",
    "first_name",
    "last_name",
    "sex",
    "birth_date",
    "address",
    "contact_number",
    "email",
    "date_registered"
];

foreach ($existingOptionalColumns as $column) {
    $selectColumns[] = $column;
}

$selectList = implode(", ", array_map(function ($column) {
    return "`" . $column . "`";
}, $selectColumns));

if ($search !== "") {

    $stmt = $conn->prepare("
        SELECT {$selectList}
        FROM user_profile
        WHERE first_name LIKE ?
           OR last_name LIKE ?
           OR email LIKE ?
           OR contact_number LIKE ?
           OR CAST(user_id AS CHAR) LIKE ?
        ORDER BY user_id DESC
    ");

    $like = "%" . $search . "%";

    $stmt->bind_param(
        "sssss",
        $like,
        $like,
        $like,
        $like,
        $like
    );

} else {

    $stmt = $conn->prepare("
        SELECT {$selectList}
        FROM user_profile
        ORDER BY user_id DESC
    ");
}

$patientsResult = null;

if ($stmt) {
    $stmt->execute();
    $patientsResult = $stmt->get_result();

    while ($row = $patientsResult->fetch_assoc()) {
        $patients[] = $row;
    }

    $stmt->close();
}

$totalPatients = 0;
$newThisMonth = 0;
$activePatients = 0;
$archiveRecords = 0;
$pendingProfiles = 0;

$result = $conn->query("
    SELECT COUNT(*) AS total
    FROM user_profile
");

if ($result) {
    $totalPatients = (int)$result->fetch_assoc()["total"];
}

$result = $conn->query("
    SELECT COUNT(*) AS total
    FROM user_profile
    WHERE LOWER(status) = 'active'
");

if ($result) {
    $activePatients = (int)$result->fetch_assoc()["total"];
}

$result = $conn->query("
    SELECT COUNT(*) AS total
    FROM user_profile
    WHERE LOWER(COALESCE(status, '')) IN ('inactive', 'archived', 'archive')
");

if ($result) {
    $archiveRecords = (int)$result->fetch_assoc()["total"];
}

$result = $conn->query("
    SELECT COUNT(*) AS total
    FROM user_profile
    WHERE YEAR(date_registered) = YEAR(CURDATE())
    AND MONTH(date_registered) = MONTH(CURDATE())
");

if ($result) {
    $newThisMonth = (int)$result->fetch_assoc()["total"];
}

$result = $conn->query("
    SELECT COUNT(*) AS total
    FROM user_profile
    WHERE LOWER(COALESCE(status, '')) IN ('pending', 'pending verification')
");

if ($result) {
    $pendingProfiles = (int)$result->fetch_assoc()["total"];
}

if ($selectedId === 0 && !$newPatientMode && count($patients) > 0) {
    $selectedId = (int)$patients[0]["user_id"];
}

$selectedPatient = null;
$healthProfile = null;

if ($selectedId > 0) {

    $stmt = $conn->prepare("
        SELECT {$selectList}
        FROM user_profile
        WHERE user_id = ?
        LIMIT 1
    ");

    if ($stmt) {

        $stmt->bind_param("i", $selectedId);
        $stmt->execute();

        $selectedPatient = $stmt->get_result()->fetch_assoc();

        $stmt->close();
    }

    if ($selectedPatient) {

        $stmt = $conn->prepare("
            SELECT
                profile_id,
                blood_type,
                height,
                weight,
                allergies,
                medical_conditions
            FROM health_profile
            WHERE user_id = ?
            LIMIT 1
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $healthProfile = $stmt->get_result()->fetch_assoc();

            $stmt->close();
        }
    }
}

$lastConsultation = null;
$nextAppointment = null;

if ($selectedId > 0) {

    if (tableExists($conn, "consultations")) {

        $stmt = $conn->prepare("
            SELECT *
            FROM consultations
            WHERE user_id = ?
            ORDER BY consultation_date DESC, consultation_id DESC
            LIMIT 1
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $lastConsultation = $stmt->get_result()->fetch_assoc();

            $stmt->close();
        }
    }

    if (tableExists($conn, "appointment")) {

        $stmt = $conn->prepare("
            SELECT
                appointment_date,
                appointment_time,
                purpose,
                status
            FROM appointment
            WHERE user_id = ?
              AND appointment_date >= CURDATE()
              AND LOWER(COALESCE(status, '')) NOT IN (
                  'cancelled',
                  'canceled',
                  'completed'
              )
            ORDER BY appointment_date ASC, appointment_time ASC
            LIMIT 1
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $nextAppointment = $stmt->get_result()->fetch_assoc();

            $stmt->close();
        }
    }
}

$totalConsultations = 0;
$laboratoryResults = 0;
$documents = 0;
$prescriptions = 0;

if ($selectedId > 0) {

    if (tableExists($conn, "consultations")) {

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS total
            FROM consultations
            WHERE user_id = ?
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $row = $stmt->get_result()->fetch_assoc();

            $totalConsultations = (int)($row["total"] ?? 0);

            $stmt->close();
        }
    }

    if (
        tableExists($conn, "laboratory_results") &&
        tableExists($conn, "consultations")
    ) {

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS total
            FROM laboratory_results lr
            INNER JOIN consultations c
                ON c.consultation_id = lr.consultation_id
            WHERE c.user_id = ?
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $row = $stmt->get_result()->fetch_assoc();

            $laboratoryResults = (int)($row["total"] ?? 0);

            $stmt->close();
        }
    }

    if (tableExists($conn, "documents")) {

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS total
            FROM documents
            WHERE user_id = ?
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $row = $stmt->get_result()->fetch_assoc();

            $documents = (int)($row["total"] ?? 0);

            $stmt->close();
        }
    }

    if (
        tableExists($conn, "prescriptions") &&
        tableExists($conn, "consultations")
    ) {

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS total
            FROM prescriptions p
            INNER JOIN consultations c
                ON c.consultation_id = p.consultation_id
            WHERE c.user_id = ?
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $row = $stmt->get_result()->fetch_assoc();

            $prescriptions = (int)($row["total"] ?? 0);

            $stmt->close();
        }
    }
}

$activePrograms = [];

if ($selectedId > 0) {

    if (tableExists($conn, "immunization_records")) {

        $stmt = $conn->prepare("
            SELECT COUNT(*) AS total
            FROM immunization_records
            WHERE user_id = ?
              AND LOWER(COALESCE(status, '')) <> 'completed'
        ");

        if ($stmt) {

            $stmt->bind_param("i", $selectedId);
            $stmt->execute();

            $immunizationActive =
                (int)$stmt->get_result()->fetch_assoc()["total"];

            if ($immunizationActive > 0) {
                $activePrograms[] = "Immunization";
            }

            $stmt->close();
        }
    }

    if (tableExists($conn, "maternal_records") && $selectedPatient) {

        $fullName = patientName($selectedPatient);

        $patientCode =
            "PT-" .
            date("Y") .
            "-" .
            str_pad($selectedId, 4, "0", STR_PAD_LEFT);

        $stmt = $conn->prepare("
            SELECT maternal_id
            FROM maternal_records
            WHERE user_id = ?
               OR patient_id = ?
               OR patient_name = ?
            LIMIT 1
        ");

        if ($stmt) {

            $stmt->bind_param(
                "iss",
                $selectedId,
                $patientCode,
                $fullName
            );

            $stmt->execute();

            if ($stmt->get_result()->fetch_assoc()) {
                $activePrograms[] = "Maternal Health";
            }

            $stmt->close();
        }
    }
}

$adminName = "Admin";

if (isset($_SESSION["user"]["full_name"])) {

    $adminName = $_SESSION["user"]["full_name"];

} elseif (isset($_SESSION["user"]["first_name"])) {

    $adminName =
        $_SESSION["user"]["first_name"] .
        " " .
        ($_SESSION["user"]["last_name"] ?? "");
}
?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Patient Registration and Record</title>

    <link rel="stylesheet" href="patient-registration.css">

    <script src="darkmode.js"></script>

</head>

<body>

<?php include "sidebar.php"; ?>

<main class="main-content">

    <header class="page-header">

        <div>

            <h1>
                Patient Registration and Record
            </h1>

            <p>
                Register new patient, manage patient information and view their health record.
            </p>

        </div>

        <div class="header-right">

            <div class="logged-admin">

                <span>
                    You are logged in as:
                </span>

                <strong>
                    <?php echo h($adminName); ?>
                </strong>

            </div>

            <div class="admin-photo">
                <img src="logo.png" alt="Admin">
            </div>

        </div>

    </header>

    <div class="ai-row">

        <a href="ai-moto.php" class="ask-ai">

            <img src="icons/ai moto.png" alt="AI Moto">

            Ask AI Moto

        </a>

    </div>

    <section class="stats-grid">

        <div class="stat-card">

            <div class="stat-icon blue">
                <img src="icons/total registered patients.png" alt="Total Patients">
            </div>

            <div>
                <span>Total Patients</span>
                <strong><?php echo number_format($totalPatients); ?></strong>
                <small>Registered in system</small>
            </div>

        </div>

        <div class="stat-card">

            <div class="stat-icon green">
                <img src="icons/new this months.png" alt="New Patients">
            </div>

            <div>
                <span>New This Month</span>
                <strong><?php echo number_format($newThisMonth); ?></strong>
                <small>Newly registered</small>
            </div>

        </div>

        <div class="stat-card">

            <div class="stat-icon purple">
                <img src="icons/active patient.png" alt="Active Patients">
            </div>

            <div>
                <span>Active Patients</span>
                <strong><?php echo number_format($activePatients); ?></strong>
                <small>Currently active</small>
            </div>

        </div>

        <div class="stat-card">

            <div class="stat-icon orange">
                <img src="icons/archive records.png" alt="Archive Records">
            </div>

            <div>
                <span>Archive Records</span>
                <strong><?php echo number_format($archiveRecords); ?></strong>
                <small>Inactive / Archive</small>
            </div>

        </div>

        <div class="stat-card">

            <div class="stat-icon navy">
                <img src="icons/pending profiles.png" alt="Pending Profiles">
            </div>

            <div>
                <span>Pending Profiles</span>
                <strong><?php echo number_format($pendingProfiles); ?></strong>
                <small>For verification</small>
            </div>

        </div>

    </section>

    <?php if ($message !== ""): ?>

        <div class="alert <?php echo h($messageType); ?>">

            <i class="fa-solid <?php echo $messageType === "success" ? "fa-circle-check" : "fa-circle-exclamation"; ?>"></i>

            <?php echo h($message); ?>

        </div>

    <?php endif; ?>

    <section class="patient-layout">

        <aside class="patient-list-card">

            <div class="patient-list-header">

                <h2>
                    Patient List
                </h2>

                <form method="GET" class="patient-search">

                    <input
                        type="text"
                        name="search"
                        value="<?php echo h($search); ?>"
                        placeholder="Search name, ID or contact number..."
                    >

                    <button type="submit">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </button>

                </form>

                <a href="patient-registration.php?new_patient=1" class="new-patient-btn">

                    <i class="fa-solid fa-plus"></i>

                    New Patient

                </a>

            </div>

            <div class="patient-list">

                <?php if (count($patients) === 0): ?>

                    <div class="empty-patients">

                        <i class="fa-solid fa-user-slash"></i>

                        <p>
                            No patients found.
                        </p>

                    </div>

                <?php else: ?>

                    <?php foreach ($patients as $patient): ?>

                        <?php
                        $patientId = (int)$patient["user_id"];
                        $isSelected = $patientId === $selectedId;
                        $age = patientAge($patient["birth_date"]);
                        $patientStatus = trim($patient["status"] ?? "Active");
                        ?>

                        <a
                            href="patient-registration.php?patient_id=<?php echo $patientId; ?><?php echo $search !== "" ? "&search=" . urlencode($search) : ""; ?>"
                            class="patient-item <?php echo $isSelected ? "selected" : ""; ?>"
                        >

                            <div class="patient-item-info">

                                <strong>
                                    <?php echo h(patientName($patient)); ?>
                                </strong>

                                <span>
                                    PT-<?php echo date("Y"); ?>-<?php echo str_pad($patientId, 4, "0", STR_PAD_LEFT); ?>
                                </span>

                                <small>
                                    <?php echo h($age); ?> yrs

                                    <?php if (!empty($patient["sex"])): ?>

                                        • <?php echo h($patient["sex"]); ?>

                                    <?php endif; ?>

                                </small>

                            </div>

                            <span class="status active">
                                <?php echo h($patientStatus); ?>
                            </span>

                            <i class="fa-solid fa-chevron-right patient-arrow"></i>

                        </a>

                    <?php endforeach; ?>

                <?php endif; ?>

            </div>

            <div class="patient-list-footer">

                Showing
                <?php echo count($patients); ?>
                patient<?php echo count($patients) !== 1 ? "s" : ""; ?>

            </div>

        </aside>

        <section class="record-card">

            <?php if ($newPatientMode): ?>

                <div class="new-patient-header">

                    <div>

                        <h2>
                            New Patient
                        </h2>

                        <p>
                            Add a new patient and create their health profile.
                        </p>

                    </div>

                    <a href="patient-registration.php" class="cancel-new-patient">
                        Cancel
                    </a>

                </div>

                <form method="POST" class="new-patient-form">

                    <input type="hidden" name="save_new_patient" value="1">

                    <section class="form-section">

                        <h3>
                            Personal Information
                        </h3>

                        <div class="form-grid">

                            <label>
                                First Name
                                <input
                                    type="text"
                                    name="first_name"
                                    value="<?php echo h($_POST["first_name"] ?? ""); ?>"
                                    required
                                >
                            </label>

                            <label>
                                Middle Name
                                <input
                                    type="text"
                                    name="middle_name"
                                    value="<?php echo h($_POST["middle_name"] ?? ""); ?>"
                                >
                            </label>

                            <label>
                                Last Name
                                <input
                                    type="text"
                                    name="last_name"
                                    value="<?php echo h($_POST["last_name"] ?? ""); ?>"
                                    required
                                >
                            </label>

                            <label>
                                Suffix
                                <input
                                    type="text"
                                    name="suffix"
                                    value="<?php echo h($_POST["suffix"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label>
                                Date of Birth
                                <input
                                    type="date"
                                    name="birth_date"
                                    value="<?php echo h($_POST["birth_date"] ?? ""); ?>"
                                >
                            </label>

                            <label>
                                Sex
                                <select name="sex">
                                    <option value="">Select Sex</option>
                                    <option value="Male" <?php echo ($_POST["sex"] ?? "") === "Male" ? "selected" : ""; ?>>Male</option>
                                    <option value="Female" <?php echo ($_POST["sex"] ?? "") === "Female" ? "selected" : ""; ?>>Female</option>
                                </select>
                            </label>

                            <label>
                                Civil Status
                                <select name="civil_status">
                                    <option value="">Select Civil Status</option>
                                    <option value="Single" <?php echo ($_POST["civil_status"] ?? "") === "Single" ? "selected" : ""; ?>>Single</option>
                                    <option value="Married" <?php echo ($_POST["civil_status"] ?? "") === "Married" ? "selected" : ""; ?>>Married</option>
                                    <option value="Widowed" <?php echo ($_POST["civil_status"] ?? "") === "Widowed" ? "selected" : ""; ?>>Widowed</option>
                                    <option value="Separated" <?php echo ($_POST["civil_status"] ?? "") === "Separated" ? "selected" : ""; ?>>Separated</option>
                                </select>
                            </label>

                            <label>
                                Nationality
                                <input
                                    type="text"
                                    name="nationality"
                                    value="<?php echo h($_POST["nationality"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label>
                                Religion
                                <input
                                    type="text"
                                    name="religion"
                                    value="<?php echo h($_POST["religion"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label>
                                Occupation
                                <input
                                    type="text"
                                    name="occupation"
                                    value="<?php echo h($_POST["occupation"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label>
                                Mobile Number
                                <input
                                    type="text"
                                    name="contact_number"
                                    value="<?php echo h($_POST["contact_number"] ?? ""); ?>"
                                >
                            </label>

                            <label>
                                Telephone
                                <input
                                    type="text"
                                    name="telephone"
                                    value="<?php echo h($_POST["telephone"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label>
                                Email Address
                                <input
                                    type="email"
                                    name="email"
                                    value="<?php echo h($_POST["email"] ?? ""); ?>"
                                    placeholder="Optional"
                                >
                            </label>

                            <label class="span-2">
                                Complete Address
                                <input
                                    type="text"
                                    name="address"
                                    value="<?php echo h($_POST["address"] ?? ""); ?>"
                                >
                            </label>

                        </div>

                    </section>

                    <section class="form-section health-form-section">

                        <h3>
                            Health Profile
                        </h3>

                        <div class="form-grid">

                            <label>
                                Blood Type
                                <select name="blood_type">
                                    <option value="">Select Blood Type</option>
                                    <?php
                                    $bloodTypes = [
                                        "A+",
                                        "A-",
                                        "B+",
                                        "B-",
                                        "AB+",
                                        "AB-",
                                        "O+",
                                        "O-"
                                    ];

                                    foreach ($bloodTypes as $type):
                                    ?>
                                        <option
                                            value="<?php echo $type; ?>"
                                            <?php echo ($_POST["blood_type"] ?? "") === $type ? "selected" : ""; ?>
                                        >
                                            <?php echo $type; ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            </label>

                            <label>
                                Height
                                <input
                                    type="number"
                                    step="0.01"
                                    name="height"
                                    value="<?php echo h($_POST["height"] ?? ""); ?>"
                                    placeholder="cm"
                                >
                            </label>

                            <label>
                                Weight
                                <input
                                    type="number"
                                    step="0.01"
                                    name="weight"
                                    value="<?php echo h($_POST["weight"] ?? ""); ?>"
                                    placeholder="kg"
                                >
                            </label>

                            <label class="span-2">
                                Allergies
                                <textarea
                                    name="allergies"
                                    placeholder="Enter known allergies"
                                ><?php echo h($_POST["allergies"] ?? ""); ?></textarea>
                            </label>

                            <label class="span-2">
                                Chronic Conditions
                                <textarea
                                    name="medical_conditions"
                                    placeholder="Enter existing medical conditions"
                                ><?php echo h($_POST["medical_conditions"] ?? ""); ?></textarea>
                            </label>

                        </div>

                    </section>

                    <div class="new-patient-actions">

                        <a href="patient-registration.php" class="cancel-button">
                            Cancel
                        </a>

                        <button type="submit" class="save-button">

                            <i class="fa-solid fa-user-plus"></i>

                            Save Patient

                        </button>

                    </div>

                </form>

            <?php elseif ($selectedPatient): ?>

                <div class="record-header">

                    <div class="record-person">

                        <div class="record-name-information">

                            <div class="record-name-row">

                                <h2>
                                    <?php echo h(patientName($selectedPatient)); ?>
                                </h2>

                                <span class="status active">
                                    <?php echo h($selectedPatient["status"] ?? "Active"); ?>
                                </span>

                            </div>

                            <p class="patient-id">

                                Patient ID:

                                <strong>
                                    PT-<?php echo date("Y"); ?>-<?php echo str_pad($selectedId, 4, "0", STR_PAD_LEFT); ?>
                                </strong>

                            </p>

                            <div class="patient-meta">

                                <span>
                                    <i class="fa-regular fa-calendar"></i>
                                    <?php echo formatDate($selectedPatient["birth_date"]); ?>
                                </span>

                                <span>
                                    <i class="fa-solid fa-cake-candles"></i>
                                    <?php echo patientAge($selectedPatient["birth_date"]); ?> years old
                                </span>

                                <span>
                                    <i class="fa-solid fa-venus-mars"></i>
                                    <?php echo h($selectedPatient["sex"] ?: "Not recorded"); ?>
                                </span>

                                <span>
                                    <i class="fa-solid fa-phone"></i>
                                    <?php echo h($selectedPatient["contact_number"] ?: "No contact number"); ?>
                                </span>

                            </div>

                            <div class="patient-address">

                                <i class="fa-solid fa-location-dot"></i>

                                <?php echo h($selectedPatient["address"] ?: "No address recorded"); ?>

                            </div>

                        </div>

                    </div>

                    <div class="record-actions">

                        <button type="button" onclick="focusPersonalForm()">
                            <i class="fa-solid fa-pen"></i>
                            Edit
                        </button>

                        <button type="button" onclick="window.print()">
                            <i class="fa-solid fa-print"></i>
                            Print
                        </button>

                    </div>

                </div>

                <nav class="record-tabs">

                    <button class="tab-button active" data-tab="personal">
                        Personal Information
                    </button>

                    <button class="tab-button" data-tab="health">
                        Health Profile
                    </button>

                    <button class="tab-button" data-tab="history">
                        Medical History
                    </button>

                    <button class="tab-button" data-tab="records">
                        Records
                    </button>

                    <button class="tab-button" data-tab="appointment">
                        Appointment
                    </button>

                    <button class="tab-button" data-tab="documents">
                        Documents
                    </button>

                </nav>

                <div class="tab-content active" id="tab-personal">

                    <div class="record-main">

                        <form method="POST" class="personal-form" id="personalForm">

                            <input type="hidden" name="save_patient" value="1">

                            <input
                                type="hidden"
                                name="user_id"
                                value="<?php echo $selectedId; ?>"
                            >

                            <h3>
                                Personal Information
                            </h3>

                            <div class="form-grid">

                                <label>
                                    First Name
                                    <input
                                        type="text"
                                        name="first_name"
                                        value="<?php echo h($selectedPatient["first_name"]); ?>"
                                        required
                                    >
                                </label>

                                <label>
                                    Middle Name
                                    <input
                                        type="text"
                                        name="middle_name"
                                        value="<?php echo h($selectedPatient["middle_name"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Last Name
                                    <input
                                        type="text"
                                        name="last_name"
                                        value="<?php echo h($selectedPatient["last_name"]); ?>"
                                        required
                                    >
                                </label>

                                <label>
                                    Suffix
                                    <input
                                        type="text"
                                        name="suffix"
                                        value="<?php echo h($selectedPatient["suffix"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Date of Birth
                                    <input
                                        type="date"
                                        name="birth_date"
                                        value="<?php echo h($selectedPatient["birth_date"]); ?>"
                                    >
                                </label>

                                <label>
                                    Age
                                    <input
                                        type="text"
                                        value="<?php echo h(patientAge($selectedPatient["birth_date"])); ?>"
                                        readonly
                                    >
                                </label>

                                <label>
                                    Sex
                                    <select name="sex">
                                        <option value="">Select Sex</option>
                                        <option value="Male" <?php echo ($selectedPatient["sex"] ?? "") === "Male" ? "selected" : ""; ?>>Male</option>
                                        <option value="Female" <?php echo ($selectedPatient["sex"] ?? "") === "Female" ? "selected" : ""; ?>>Female</option>
                                    </select>
                                </label>

                                <label>
                                    Civil Status
                                    <input
                                        type="text"
                                        name="civil_status"
                                        value="<?php echo h($selectedPatient["civil_status"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Nationality
                                    <input
                                        type="text"
                                        name="nationality"
                                        value="<?php echo h($selectedPatient["nationality"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Religion
                                    <input
                                        type="text"
                                        name="religion"
                                        value="<?php echo h($selectedPatient["religion"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Occupation
                                    <input
                                        type="text"
                                        name="occupation"
                                        value="<?php echo h($selectedPatient["occupation"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label>
                                    Mobile Number
                                    <input
                                        type="text"
                                        name="contact_number"
                                        value="<?php echo h($selectedPatient["contact_number"]); ?>"
                                    >
                                </label>

                                <label>
                                    Telephone
                                    <input
                                        type="text"
                                        name="telephone"
                                        value="<?php echo h($selectedPatient["telephone"] ?? ""); ?>"
                                        placeholder="Optional"
                                    >
                                </label>

                                <label class="span-2">
                                    Email Address
                                    <input
                                        type="email"
                                        name="email"
                                        value="<?php echo h($selectedPatient["email"]); ?>"
                                    >
                                </label>

                                <label class="span-4">
                                    Complete Address
                                    <input
                                        type="text"
                                        name="address"
                                        value="<?php echo h($selectedPatient["address"]); ?>"
                                    >
                                </label>

                            </div>

                            <div class="form-actions">

                                <button type="reset" class="cancel-button">
                                    Cancel
                                </button>

                                <button type="submit" class="save-button">
                                    <i class="fa-solid fa-floppy-disk"></i>
                                    Save Information
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

                <div class="tab-content" id="tab-health">

                    <div class="health-profile-content">

                        <div class="health-profile-header">

                            <div>

                                <h3>
                                    Health Profile
                                </h3>

                                <p>
                                    Medical and health information for this patient.
                                </p>

                            </div>

                        </div>

                        <form method="POST" class="health-profile-form">

                            <input type="hidden" name="save_patient" value="1">

                            <input type="hidden" name="user_id" value="<?php echo $selectedId; ?>">

                            <input type="hidden" name="first_name" value="<?php echo h($selectedPatient["first_name"]); ?>">

                            <input type="hidden" name="middle_name" value="<?php echo h($selectedPatient["middle_name"] ?? ""); ?>">

                            <input type="hidden" name="last_name" value="<?php echo h($selectedPatient["last_name"]); ?>">

                            <input type="hidden" name="suffix" value="<?php echo h($selectedPatient["suffix"] ?? ""); ?>">

                            <input type="hidden" name="birth_date" value="<?php echo h($selectedPatient["birth_date"]); ?>">

                            <input type="hidden" name="sex" value="<?php echo h($selectedPatient["sex"]); ?>">

                            <input type="hidden" name="civil_status" value="<?php echo h($selectedPatient["civil_status"] ?? ""); ?>">

                            <input type="hidden" name="nationality" value="<?php echo h($selectedPatient["nationality"] ?? ""); ?>">

                            <input type="hidden" name="religion" value="<?php echo h($selectedPatient["religion"] ?? ""); ?>">

                            <input type="hidden" name="occupation" value="<?php echo h($selectedPatient["occupation"] ?? ""); ?>">

                            <input type="hidden" name="contact_number" value="<?php echo h($selectedPatient["contact_number"]); ?>">

                            <input type="hidden" name="telephone" value="<?php echo h($selectedPatient["telephone"] ?? ""); ?>">

                            <input type="hidden" name="email" value="<?php echo h($selectedPatient["email"]); ?>">

                            <input type="hidden" name="address" value="<?php echo h($selectedPatient["address"]); ?>">

                            <div class="health-grid">

                                <label>
                                    Blood Type
                                    <select name="blood_type">

                                        <option value="">Select Blood Type</option>

                                        <?php foreach ($bloodTypes as $type): ?>

                                            <option
                                                value="<?php echo $type; ?>"
                                                <?php echo ($healthProfile["blood_type"] ?? "") === $type ? "selected" : ""; ?>
                                            >
                                                <?php echo $type; ?>
                                            </option>

                                        <?php endforeach; ?>

                                    </select>
                                </label>

                                <label>
                                    Height
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="height"
                                        value="<?php echo h($healthProfile["height"] ?? ""); ?>"
                                        placeholder="cm"
                                    >
                                </label>

                                <label>
                                    Weight
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="weight"
                                        value="<?php echo h($healthProfile["weight"] ?? ""); ?>"
                                        placeholder="kg"
                                    >
                                </label>

                                <label class="wide-health-field">
                                    Allergies
                                    <textarea
                                        name="allergies"
                                        placeholder="No known allergies"
                                    ><?php echo h($healthProfile["allergies"] ?? ""); ?></textarea>
                                </label>

                                <label class="wide-health-field">
                                    Chronic Conditions
                                    <textarea
                                        name="medical_conditions"
                                        placeholder="No chronic conditions recorded"
                                    ><?php echo h($healthProfile["medical_conditions"] ?? ""); ?></textarea>
                                </label>

                            </div>

                            <div class="form-actions">

                                <span></span>

                                <button type="submit" class="save-button">
                                    <i class="fa-solid fa-floppy-disk"></i>
                                    Save Health Profile
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

                <div class="tab-content" id="tab-history">

                    <div class="placeholder-tab">

                        <i class="fa-solid fa-file-medical"></i>

                        <h3>
                            Medical History
                        </h3>

                        <p>
                            Consultation history will appear here once the consultation records are connected.
                        </p>

                    </div>

                </div>

                <div class="tab-content" id="tab-records">

                    <div class="record-summary-section">

                        <h3>
                            Record Summary
                        </h3>

                        <div class="record-summary-grid">

                            <div class="record-summary-card">

                                <span>
                                    Total Consultations
                                </span>

                                <strong>
                                    <?php echo number_format($totalConsultations); ?>
                                </strong>

                            </div>

                            <div class="record-summary-card">

                                <span>
                                    Laboratory Results
                                </span>

                                <strong>
                                    <?php echo number_format($laboratoryResults); ?>
                                </strong>

                            </div>

                            <div class="record-summary-card">

                                <span>
                                    Documents
                                </span>

                                <strong>
                                    <?php echo number_format($documents); ?>
                                </strong>

                            </div>

                            <div class="record-summary-card">

                                <span>
                                    Prescriptions
                                </span>

                                <strong>
                                    <?php echo number_format($prescriptions); ?>
                                </strong>

                            </div>

                        </div>

                    </div>

                </div>

                <div class="tab-content" id="tab-appointment">

                    <div class="placeholder-tab">

                        <i class="fa-solid fa-calendar-days"></i>

                        <h3>
                            Appointment
                        </h3>

                        <p>

                            <?php if ($nextAppointment): ?>

                                Next appointment:
                                <?php echo formatDateTime(
                                    $nextAppointment["appointment_date"],
                                    $nextAppointment["appointment_time"]
                                ); ?>

                            <?php else: ?>

                                No upcoming appointment recorded.

                            <?php endif; ?>

                        </p>

                    </div>

                </div>

                <div class="tab-content" id="tab-documents">

                    <div class="placeholder-tab">

                        <i class="fa-solid fa-file-lines"></i>

                        <h3>
                            Documents
                        </h3>

                        <p>
                            <?php echo number_format($documents); ?> document record(s) found for this patient.
                        </p>

                    </div>

                </div>

                <div class="quick-record-area">

                    <aside class="quick-summary">

                        <h3>
                            Quick Summary
                        </h3>

                        <div class="summary-section">

                            <strong>
                                <img src="icons/last consultation.png" alt="">
                                Last Consultation
                            </strong>

                            <?php if ($lastConsultation): ?>

                                <p>
                                    <?php
                                    echo h(
                                        formatDate(
                                            $lastConsultation["consultation_date"] ?? null
                                        )
                                    );
                                    ?>
                                </p>

                                <p>
                                    <?php
                                    echo h(
                                        $lastConsultation["visit_type"] ??
                                        "General Consultation"
                                    );
                                    ?>
                                </p>

                            <?php else: ?>

                                <p>
                                    No consultation recorded.
                                </p>

                            <?php endif; ?>

                        </div>

                        <div class="summary-section">

                            <strong>
                                <img src="icons/appointment.png" alt="">
                                Next Appointment
                            </strong>

                            <?php if ($nextAppointment): ?>

                                <p>

                                    <?php echo formatDate($nextAppointment["appointment_date"]); ?>

                                    <?php if (!empty($nextAppointment["appointment_time"])): ?>

                                        •
                                        <?php echo date(
                                            "g:i A",
                                            strtotime($nextAppointment["appointment_time"])
                                        ); ?>

                                    <?php endif; ?>

                                </p>

                                <p>
                                    <?php echo h(
                                        $nextAppointment["purpose"] ?: "General Consultation"
                                    ); ?>
                                </p>

                            <?php else: ?>

                                <p>
                                    No upcoming appointment.
                                </p>

                            <?php endif; ?>

                        </div>

                        <div class="summary-section">

                            <strong>
                                <img src="icons/health programs.png" alt="">
                                Active Health Programs
                            </strong>

                            <?php if (count($activePrograms) > 0): ?>

                                <ul>

                                    <?php foreach ($activePrograms as $program): ?>

                                        <li>
                                            <?php echo h($program); ?>
                                        </li>

                                    <?php endforeach; ?>

                                </ul>

                            <?php else: ?>

                                <p>
                                    None recorded.
                                </p>

                            <?php endif; ?>

                        </div>

                        <div class="summary-section">

                            <strong>
                                <img src="icons/allergies.png" alt="">
                                Allergies
                            </strong>

                            <p>
                                <?php echo h(
                                    !empty($healthProfile["allergies"])
                                        ? $healthProfile["allergies"]
                                        : "None recorded"
                                ); ?>
                            </p>

                        </div>

                        <div class="summary-section">

                            <strong>
                                <i class="fa-solid fa-heart-pulse"></i>
                                Chronic Conditions
                            </strong>

                            <p>
                                <?php echo h(
                                    !empty($healthProfile["medical_conditions"])
                                        ? $healthProfile["medical_conditions"]
                                        : "None recorded"
                                ); ?>
                            </p>

                        </div>

                    </aside>

                </div>

            <?php else: ?>

                <div class="no-selected-patient">

                    <i class="fa-solid fa-user-plus"></i>

                    <h2>
                        No Patient Selected
                    </h2>

                    <p>
                        Register a patient or select a patient from the list.
                    </p>

                    <a href="patient-registration.php?new_patient=1">
                        Add New Patient
                    </a>

                </div>

            <?php endif; ?>

        </section>

    </section>

</main>

<script>

document.addEventListener("DOMContentLoaded", function () {

    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const tabName = button.getAttribute("data-tab");

            tabButtons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            tabContents.forEach(function (content) {
                content.classList.remove("active");
            });

            button.classList.add("active");

            const target = document.getElementById("tab-" + tabName);

            if (target) {
                target.classList.add("active");
            }

        });

    });

});

function focusPersonalForm() {

    const personalTab = document.querySelector('[data-tab="personal"]');
    const form = document.getElementById("personalForm");

    if (personalTab) {
        personalTab.click();
    }

    if (form) {

        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        const firstInput = form.querySelector('input[name="first_name"]');

        if (firstInput) {

            setTimeout(function () {
                firstInput.focus();
            }, 400);

        }

    }

}

</script>

</body>
</html>

<?php
$conn->close();
?>