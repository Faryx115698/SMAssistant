<?php
// api/maternal.php - Maternal Health REST API

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

// Ensure tables exist
$conn->query("CREATE TABLE IF NOT EXISTS maternal_records (maternal_id INT AUTO_INCREMENT PRIMARY KEY, patient_name VARCHAR(150) NOT NULL, patient_id VARCHAR(50) NOT NULL, age INT DEFAULT 0, gravida VARCHAR(30), para VARCHAR(30), edd DATE NULL, gestational_age VARCHAR(50), contact VARCHAR(40), address VARCHAR(255), blood_type VARCHAR(10), allergies VARCHAR(150), lmp DATE NULL, philhealth VARCHAR(50), civil_status VARCHAR(50), risk_level VARCHAR(30) DEFAULT 'Low Risk', status VARCHAR(30) DEFAULT 'Active', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS maternal_anc_visits (visit_id INT AUTO_INCREMENT PRIMARY KEY, maternal_id INT NOT NULL, visit_no VARCHAR(30), visit_date DATE, gestational_age VARCHAR(50), weight VARCHAR(30), bp VARCHAR(30), fetal_age VARCHAR(30), next_visit DATE NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(maternal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS maternal_appointments (appointment_id INT AUTO_INCREMENT PRIMARY KEY, maternal_id INT NOT NULL, appointment_date DATE, appointment_time TIME, appointment_type VARCHAR(80), status VARCHAR(30) DEFAULT 'Scheduled', INDEX(maternal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// 1. POST Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = json_decode(file_get_contents('php://input'), true);
    $data = !empty($raw) ? $raw : $_POST;
    $postAction = $data['action'] ?? $action;

    if ($postAction === 'patient' || $postAction === 'add_patient') {
        $stmt = $conn->prepare("INSERT INTO maternal_records(patient_name,patient_id,age,gravida,para,edd,gestational_age,contact,address,blood_type,allergies,risk_level) VALUES(?,?,?,?,?,NULLIF(?,''),?,?,?,?,?,?)");
        $name = trim($data['patient_name'] ?? '');
        $pid = trim($data['patient_id'] ?? '');
        $age = (int) ($data['age'] ?? 0);
        $gravida = trim($data['gravida'] ?? '');
        $para = trim($data['para'] ?? '');
        $edd = $data['edd'] ?? '';
        $ga = trim($data['gestational_age'] ?? '');
        $contact = trim($data['contact'] ?? '');
        $address = trim($data['address'] ?? '');
        $blood = $data['blood_type'] ?? 'O+';
        $allergies = trim($data['allergies'] ?? 'None known');
        $risk = $data['risk_level'] ?? 'Low Risk';

        if (!$name || !$pid) {
            jsonError("Patient name and patient ID are required.");
        }

        $stmt->bind_param('ssisssssssss', $name, $pid, $age, $gravida, $para, $edd, $ga, $contact, $address, $blood, $allergies, $risk);
        if ($stmt->execute()) {
            $newId = $stmt->insert_id;
            $stmt->close();
            jsonSuccess(['maternal_id' => $newId], "New maternal patient added successfully.");
        } else {
            $err = $stmt->error;
            $stmt->close();
            jsonError("Failed to add patient: " . $err);
        }
    }

    if ($postAction === 'visit' || $postAction === 'add_visit') {
        $stmt = $conn->prepare("INSERT INTO maternal_anc_visits(maternal_id,visit_no,visit_date,gestational_age,weight,bp,fetal_age,next_visit) VALUES(?,?,?,?,?,?,?,NULLIF(?,''))");
        $mid = (int) ($data['maternal_id'] ?? 0);
        $vn = trim($data['visit_no'] ?? '');
        $vd = $data['visit_date'] ?? '';
        $ga = trim($data['gestational_age'] ?? '');
        $weight = trim($data['weight'] ?? '');
        $bp = trim($data['bp'] ?? '');
        $fetal = trim($data['fetal_age'] ?? '');
        $next = $data['next_visit'] ?? '';

        if (!$mid || !$vn || !$vd) {
            jsonError("Maternal ID, visit number, and visit date are required.");
        }

        $stmt->bind_param('isssssss', $mid, $vn, $vd, $ga, $weight, $bp, $fetal, $next);
        if ($stmt->execute()) {
            $stmt->close();
            jsonSuccess([], "ANC visit added successfully.");
        } else {
            $err = $stmt->error;
            $stmt->close();
            jsonError("Failed to save visit: " . $err);
        }
    }

    if ($postAction === 'appointment' || $postAction === 'add_appointment') {
        $stmt = $conn->prepare("INSERT INTO maternal_appointments(maternal_id,appointment_date,appointment_time,appointment_type) VALUES(?,?,?,?)");
        $mid = (int) ($data['maternal_id'] ?? 0);
        $date = $data['appointment_date'] ?? '';
        $time = $data['appointment_time'] ?? '';
        $type = $data['appointment_type'] ?? 'ANC Visit';

        if (!$mid || !$date || !$time) {
            jsonError("Maternal ID, appointment date, and time are required.");
        }

        $stmt->bind_param('isss', $mid, $date, $time, $type);
        if ($stmt->execute()) {
            $stmt->close();
            jsonSuccess([], "Appointment scheduled successfully.");
        } else {
            $err = $stmt->error;
            $stmt->close();
            jsonError("Failed to schedule appointment: " . $err);
        }
    }
}

// 2. GET Data
$search = trim($_GET['search'] ?? '');
$selectedId = (int) ($_GET['patient_id'] ?? $_GET['patient'] ?? 0);

$patients = [];
if ($search) {
    $stmt = $conn->prepare("SELECT * FROM maternal_records WHERE patient_name LIKE CONCAT('%',?,'%') OR patient_id LIKE CONCAT('%',?,'%') ORDER BY patient_name");
    $stmt->bind_param('ss', $search, $search);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) $patients[] = $r;
    $stmt->close();
} else {
    $res = $conn->query('SELECT * FROM maternal_records ORDER BY patient_name');
    if ($res) while ($r = $res->fetch_assoc()) $patients[] = $r;
}

if ($selectedId <= 0 && count($patients) > 0) {
    $selectedId = (int) $patients[0]['maternal_id'];
}

$selected = null;
if ($selectedId > 0) {
    $stmt = $conn->prepare('SELECT * FROM maternal_records WHERE maternal_id=?');
    $stmt->bind_param('i', $selectedId);
    $stmt->execute();
    $selected = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}

$visits = [];
$appointments = [];
if ($selected && $selected['maternal_id'] > 0) {
    $mid = (int) $selected['maternal_id'];
    $vres = $conn->query("SELECT * FROM maternal_anc_visits WHERE maternal_id=$mid ORDER BY visit_date DESC");
    if ($vres) while ($r = $vres->fetch_assoc()) $visits[] = $r;

    $ares = $conn->query("SELECT a.*,m.patient_name FROM maternal_appointments a JOIN maternal_records m ON m.maternal_id=a.maternal_id WHERE a.maternal_id=$mid AND a.appointment_date>=CURDATE() ORDER BY a.appointment_date,a.appointment_time LIMIT 4");
    if ($ares) while ($r = $ares->fetch_assoc()) $appointments[] = $r;
}

$total = (int) $conn->query('SELECT COUNT(*) c FROM maternal_records')->fetch_assoc()['c'];
$complete = (int) $conn->query('SELECT COUNT(*) c FROM maternal_records m WHERE (SELECT COUNT(*) FROM maternal_anc_visits v WHERE v.maternal_id=m.maternal_id)>=4')->fetch_assoc()['c'];
$due = (int) $conn->query("SELECT COUNT(*) c FROM maternal_records WHERE edd IS NOT NULL AND MONTH(edd)=MONTH(CURDATE()) AND YEAR(edd)=YEAR(CURDATE())")->fetch_assoc()['c'];
$risk = (int) $conn->query("SELECT COUNT(*) c FROM maternal_records WHERE risk_level='High Risk'")->fetch_assoc()['c'];

jsonResponse([
    "success" => true,
    "patients" => $patients,
    "selected" => $selected,
    "visits" => $visits,
    "appointments" => $appointments,
    "stats" => [
        "total" => $total,
        "complete" => $complete,
        "due" => $due,
        "highRisk" => $risk
    ]
]);
