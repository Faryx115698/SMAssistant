<?php
// api/infant.php - Infant and Child Health REST API

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

// Ensure tables exist
$conn->query("CREATE TABLE IF NOT EXISTS child_records(child_id INT AUTO_INCREMENT PRIMARY KEY,child_code VARCHAR(30) UNIQUE NOT NULL,first_name VARCHAR(100) NOT NULL,middle_name VARCHAR(100),last_name VARCHAR(100) NOT NULL,birth_date DATE NOT NULL,sex VARCHAR(20) NOT NULL,contact_number VARCHAR(30),address VARCHAR(255),mother_name VARCHAR(150),mother_contact VARCHAR(30),blood_type VARCHAR(10),allergies VARCHAR(255),birth_weight VARCHAR(30),philhealth_number VARCHAR(50),status VARCHAR(30) DEFAULT 'Active',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS child_visits(visit_id INT AUTO_INCREMENT PRIMARY KEY,child_id INT NOT NULL,visit_date DATE NOT NULL,visit_type VARCHAR(100) NOT NULL,age_at_visit VARCHAR(50),bp VARCHAR(50),weight_kg VARCHAR(30),height_cm VARCHAR(30),notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(child_id) REFERENCES child_records(child_id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$action = $_GET['action'] ?? $_POST['action'] ?? '';

// 1. POST Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = json_decode(file_get_contents('php://input'), true);
    $data = !empty($raw) ? $raw : $_POST;
    $postAction = $data['action'] ?? $action;

    if ($postAction === 'add_child') {
        $f = trim($data['first_name'] ?? '');
        $m = trim($data['middle_name'] ?? '');
        $l = trim($data['last_name'] ?? '');
        $b = $data['birth_date'] ?? '';
        $s = $data['sex'] ?? '';
        $c = trim($data['contact_number'] ?? '');
        $a = trim($data['address'] ?? '');
        $mn = trim($data['mother_name'] ?? '');
        $mc = trim($data['mother_contact'] ?? '');

        if (!$f || !$l || !$b || !$s) {
            jsonError("Please complete the required child information.");
        }

        $r = $conn->query("SELECT COUNT(*) total FROM child_records");
        $n = (int) $r->fetch_assoc()['total'] + 1;
        $code = 'CH-' . date('Y') . '-' . str_pad($n, 4, '0', STR_PAD_LEFT);

        $q = $conn->prepare('INSERT INTO child_records(child_code,first_name,middle_name,last_name,birth_date,sex,contact_number,address,mother_name,mother_contact) VALUES(?,?,?,?,?,?,?,?,?,?)');
        $q->bind_param('ssssssssss', $code, $f, $m, $l, $b, $s, $c, $a, $mn, $mc);

        if ($q->execute()) {
            $newId = $q->insert_id;
            $q->close();
            jsonSuccess(['child_id' => $newId, 'child_code' => $code], "Child record added successfully.");
        } else {
            $err = $q->error;
            $q->close();
            jsonError("Unable to save child record: " . $err);
        }
    }

    if ($postAction === 'add_visit') {
        $cid = (int) ($data['child_id'] ?? 0);
        $d = $data['visit_date'] ?? '';
        $type = trim($data['visit_type'] ?? '');
        $age = trim($data['age_at_visit'] ?? '');
        $bp = trim($data['bp'] ?? '');
        $w = trim($data['weight_kg'] ?? '');
        $ht = trim($data['height_cm'] ?? '');
        $notes = trim($data['notes'] ?? '');

        if (!$cid || !$d || !$type) {
            jsonError("Please complete required visit information.");
        }

        $q = $conn->prepare('INSERT INTO child_visits(child_id,visit_date,visit_type,age_at_visit,bp,weight_kg,height_cm,notes) VALUES(?,?,?,?,?,?,?,?)');
        $q->bind_param('isssssss', $cid, $d, $type, $age, $bp, $w, $ht, $notes);

        if ($q->execute()) {
            $q->close();
            jsonSuccess([], "Well-child visit added successfully.");
        } else {
            $err = $q->error;
            $q->close();
            jsonError("Unable to save visit: " . $err);
        }
    }
}

// 2. GET Data
$search = trim($_GET['search'] ?? '');
$selectedId = (int) ($_GET['child_id'] ?? 0);

$children = [];
$r = $conn->query('SELECT * FROM child_records ORDER BY child_id ASC LIMIT 50');
if ($r) {
    while ($x = $r->fetch_assoc()) $children[] = $x;
}

if (!$children) {
    $children = [
        ['child_id' => 1, 'child_code' => 'CH-2026-0001', 'first_name' => 'Juanito', 'middle_name' => 'D.', 'last_name' => 'Dela Cruz', 'birth_date' => '2024-02-15', 'sex' => 'Male', 'contact_number' => '0917 123 4567', 'address' => 'Centro St., Talimundoc, Orani, Bataan', 'mother_name' => 'Maria D. Dela Cruz', 'mother_contact' => '0917 987 6543', 'blood_type' => 'O+', 'allergies' => 'None known', 'birth_weight' => '3.1 kg', 'philhealth_number' => '12-345678901-2', 'status' => 'Active'],
        ['child_id' => 2, 'child_code' => 'CH-2026-0002', 'first_name' => 'Maria Therese S.', 'middle_name' => '', 'last_name' => 'Reyes', 'birth_date' => '2022-09-18', 'sex' => 'Female', 'contact_number' => '0918 234 5678', 'address' => 'Talimundoc, Orani, Bataan', 'mother_name' => 'Ana Reyes', 'mother_contact' => '', 'blood_type' => 'A+', 'allergies' => 'None known', 'birth_weight' => '3.0 kg', 'philhealth_number' => '', 'status' => 'Active']
    ];
}

if ($search !== '') {
    $children = array_values(array_filter($children, function ($x) use ($search) {
        return stripos($x['first_name'] . ' ' . ($x['middle_name'] ?? '') . ' ' . $x['last_name'] . ' ' . $x['child_code'], $search) !== false;
    }));
}

$selected = $children[0] ?? null;
if ($selectedId) {
    foreach ($children as $x) {
        if ((int) $x['child_id'] === $selectedId) {
            $selected = $x;
        }
    }
}

$visits = [];
if ($selected && $selected['child_id'] > 0) {
    $q = $conn->prepare('SELECT visit_id, visit_date, age_at_visit, visit_type, bp, weight_kg, height_cm, notes FROM child_visits WHERE child_id=? ORDER BY visit_date DESC LIMIT 10');
    $q->bind_param('i', $selected['child_id']);
    $q->execute();
    $rr = $q->get_result();
    while ($v = $rr->fetch_assoc()) {
        $visits[] = $v;
    }
    $q->close();
}

if (empty($visits)) {
    $visits = [
        ['visit_date' => '2026-05-10', 'age_at_visit' => '1 yr, 3 mos', 'visit_type' => 'Well Child Visit', 'bp' => 'Normal', 'weight_kg' => '9.6', 'height_cm' => '82.0'],
        ['visit_date' => '2026-02-16', 'age_at_visit' => '1 yr, 11 mos', 'visit_type' => 'Well Child Visit', 'bp' => 'Normal', 'weight_kg' => '11.5', 'height_cm' => '82.6']
    ];
}

jsonResponse([
    "success" => true,
    "children" => $children,
    "selected" => $selected,
    "visits" => $visits
]);
