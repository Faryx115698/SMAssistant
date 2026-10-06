<?php
session_start();
require_once 'db.php';
if (!isset($_SESSION['user'])) {
    header('Location: login.php');
    exit;
}
function h($v)
{
    return htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
}
$conn->query("CREATE TABLE IF NOT EXISTS child_records(child_id INT AUTO_INCREMENT PRIMARY KEY,child_code VARCHAR(30) UNIQUE NOT NULL,first_name VARCHAR(100) NOT NULL,middle_name VARCHAR(100),last_name VARCHAR(100) NOT NULL,birth_date DATE NOT NULL,sex VARCHAR(20) NOT NULL,contact_number VARCHAR(30),address VARCHAR(255),mother_name VARCHAR(150),mother_contact VARCHAR(30),blood_type VARCHAR(10),allergies VARCHAR(255),birth_weight VARCHAR(30),philhealth_number VARCHAR(50),status VARCHAR(30) DEFAULT 'Active',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS child_visits(visit_id INT AUTO_INCREMENT PRIMARY KEY,child_id INT NOT NULL,visit_date DATE NOT NULL,visit_type VARCHAR(100) NOT NULL,age_at_visit VARCHAR(50),bp VARCHAR(50),weight_kg VARCHAR(30),height_cm VARCHAR(30),notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(child_id) REFERENCES child_records(child_id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$message = '';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add_child') {
    $f = trim($_POST['first_name'] ?? '');
    $m = trim($_POST['middle_name'] ?? '');
    $l = trim($_POST['last_name'] ?? '');
    $b = $_POST['birth_date'] ?? '';
    $s = $_POST['sex'] ?? '';
    $c = trim($_POST['contact_number'] ?? '');
    $a = trim($_POST['address'] ?? '');
    $mn = trim($_POST['mother_name'] ?? '');
    $mc = trim($_POST['mother_contact'] ?? '');
    if (!$f || !$l || !$b || !$s)
        $error = 'Please complete the required child information.';
    else {
        $r = $conn->query("SELECT COUNT(*) total FROM child_records");
        $n = (int) $r->fetch_assoc()['total'] + 1;
        $code = 'CH-' . date('Y') . '-' . str_pad($n, 4, '0', STR_PAD_LEFT);
        $q = $conn->prepare('INSERT INTO child_records(child_code,first_name,middle_name,last_name,birth_date,sex,contact_number,address,mother_name,mother_contact) VALUES(?,?,?,?,?,?,?,?,?,?)');
        $q->bind_param('ssssssssss', $code, $f, $m, $l, $b, $s, $c, $a, $mn, $mc);
        if ($q->execute()) {
            header('Location: infant-child-health.php?child_id=' . $q->insert_id . '&saved=child');
            exit;
        }
        $error = 'Unable to save the child record.';
        $q->close();
    }
}
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'add_visit') {
    $cid = (int) ($_POST['child_id'] ?? 0);
    $d = $_POST['visit_date'] ?? '';
    $type = trim($_POST['visit_type'] ?? '');
    $age = trim($_POST['age_at_visit'] ?? '');
    $bp = trim($_POST['bp'] ?? '');
    $w = trim($_POST['weight_kg'] ?? '');
    $ht = trim($_POST['height_cm'] ?? '');
    $notes = trim($_POST['notes'] ?? '');
    if (!$cid || !$d || !$type)
        $error = 'Please complete the required visit information.';
    else {
        $q = $conn->prepare('INSERT INTO child_visits(child_id,visit_date,visit_type,age_at_visit,bp,weight_kg,height_cm,notes) VALUES(?,?,?,?,?,?,?,?)');
        $q->bind_param('isssssss', $cid, $d, $type, $age, $bp, $w, $ht, $notes);
        if ($q->execute()) {
            header('Location: infant-child-health.php?child_id=' . $cid . '&saved=visit');
            exit;
        }
        $error = 'Unable to save the visit.';
        $q->close();
    }
}
if (isset($_GET['saved']))
    $message = $_GET['saved'] === 'child' ? 'Child record added successfully.' : 'Well-child visit added successfully.';
$selectedId = (int) ($_GET['child_id'] ?? 0);
$search = trim($_GET['search'] ?? '');
$children = [];
$r = $conn->query('SELECT * FROM child_records ORDER BY child_id ASC LIMIT 50');
if ($r)
    while ($x = $r->fetch_assoc())
        $children[] = $x;
if (!$children) {
    $children = [['child_id' => 0, 'child_code' => 'CH-2026-0001', 'first_name' => 'Juanito', 'middle_name' => 'D.', 'last_name' => 'Dela Cruz', 'birth_date' => '2024-02-15', 'sex' => 'Male', 'contact_number' => '0917 123 4567', 'address' => 'Centro St., Talimundoc, Orani, Bataan', 'mother_name' => 'Maria D. Dela Cruz', 'mother_contact' => '0917 987 6543', 'blood_type' => 'O+', 'allergies' => 'None known', 'birth_weight' => '3.1 kg', 'philhealth_number' => '12-345678901-2', 'status' => 'Active'], ['child_id' => 0, 'child_code' => 'CH-2026-0002', 'first_name' => 'Maria Therese S.', 'middle_name' => '', 'last_name' => 'Reyes', 'birth_date' => '2022-09-18', 'sex' => 'Female', 'contact_number' => '0918 234 5678', 'address' => 'Talimundoc, Orani, Bataan', 'mother_name' => 'Ana Reyes', 'mother_contact' => '', 'blood_type' => 'A+', 'allergies' => 'None known', 'birth_weight' => '3.0 kg', 'philhealth_number' => '', 'status' => 'Active'], ['child_id' => 0, 'child_code' => 'CH-2026-0003', 'first_name' => 'Kyle Andrei R.', 'middle_name' => '', 'last_name' => 'Santos', 'birth_date' => '2022-12-10', 'sex' => 'Male', 'contact_number' => '0919 345 6789', 'address' => 'Talimundoc, Orani, Bataan', 'mother_name' => 'Rhea Santos', 'mother_contact' => '', 'blood_type' => 'B+', 'allergies' => 'None known', 'birth_weight' => '3.2 kg', 'philhealth_number' => '', 'status' => 'Active'], ['child_id' => 0, 'child_code' => 'CH-2026-0004', 'first_name' => 'Sophia Anne L.', 'middle_name' => '', 'last_name' => 'Flores', 'birth_date' => '2022-04-28', 'sex' => 'Female', 'contact_number' => '0920 456 7890', 'address' => 'Talimundoc, Orani, Bataan', 'mother_name' => 'Liza Flores', 'mother_contact' => '', 'blood_type' => 'O+', 'allergies' => 'None known', 'birth_weight' => '2.9 kg', 'philhealth_number' => '', 'status' => 'Active'], ['child_id' => 0, 'child_code' => 'CH-2026-0005', 'first_name' => 'Miguel Jeremy A.', 'middle_name' => '', 'last_name' => 'Garcia', 'birth_date' => '2021-03-11', 'sex' => 'Male', 'contact_number' => '0921 567 8901', 'address' => 'Talimundoc, Orani, Bataan', 'mother_name' => 'Karen Garcia', 'mother_contact' => '', 'blood_type' => 'A+', 'allergies' => 'None known', 'birth_weight' => '3.1 kg', 'philhealth_number' => '', 'status' => 'Active']];
}
if ($search !== '')
    $children = array_values(array_filter($children, function ($x) use ($search) {
        return stripos($x['first_name'] . ' ' . $x['middle_name'] . ' ' . $x['last_name'] . ' ' . $x['child_code'], $search) !== false;
    }));
$selected = $children[0] ?? null;
if ($selectedId)
    foreach ($children as $x)
        if ((int) $x['child_id'] === $selectedId)
            $selected = $x;
function ageText($d)
{
    $a = new DateTime($d);
    $t = new DateTime();
    $x = $a->diff($t);
    return $x->y > 0 ? $x->y . ' yr' . ($x->y > 1 ? 's' : '') . ', ' . $x->m . ' mo' : $x->m . ' mo' . ($x->m != 1 ? 's' : '');
}
$visits = [['2026-05-10', '1 yr, 3 mos', 'Well Child Visit', 'Normal', '9.6', '82.0'], ['2026-02-16', '1 yr, 11 mos', 'Well Child Visit', 'Normal', '11.5', '82.6'], ['2025-11-18', '1 yr, 9 mos', 'Well Child Visit', 'Normal', '10.2', '78.5'], ['2025-08-12', '1 yr, 6 mos', 'Well Child Visit', 'Normal', '8.2', '74.8'], ['2025-05-10', '1 yr, 3 mos', 'Well Child Visit', 'Normal', '8.1', '73.0'], ['2025-02-12', '1 yr', 'Well Child Visit', 'Normal', '8.5', '75.3'], ['2024-10-11', '8 mos', 'Well Child Visit', 'Normal', '7.4', '68.5']];
if ($selected && $selected['child_id'] > 0) {
    $q = $conn->prepare('SELECT visit_date,age_at_visit,visit_type,bp,weight_kg,height_cm FROM child_visits WHERE child_id=? ORDER BY visit_date DESC LIMIT 10');
    $q->bind_param('i', $selected['child_id']);
    $q->execute();
    $rr = $q->get_result();
    $dbv = [];
    while ($v = $rr->fetch_assoc())
        $dbv[] = [$v['visit_date'], $v['age_at_visit'], $v['visit_type'], $v['bp'] ?: 'Normal', $v['weight_kg'] ?: '-', $v['height_cm'] ?: '-'];
    if ($dbv)
        $visits = $dbv;
    $q->close();
}
$full = $selected ? trim($selected['first_name'] . ' ' . $selected['middle_name'] . ' ' . $selected['last_name']) : 'No Child Selected';
$icon = 'icons/';

include "sidebar.php";

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Infants and Child Health</title>
    <link rel="stylesheet" href="infant-child-health.css">
    <script src="darkmode.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>

<body>
    <main class="main-content">
        <header class="page-header">
            <div>
                <h1>Infants and Child Health</h1>
                <p>Track growth, development, nutrition and overall health of infants and children.</p>
            </div>
            <div class="header-right">
                <div class="admin-profile">
                    <div class="admin-text"><small>You are logged in
                            as</small><strong><?php echo h($_SESSION['user']['full_name'] ?? $_SESSION['user']['username'] ?? 'ADMIN CYRON'); ?></strong>
                    </div>
                    <div class="admin-photo"><img src="<?php echo $icon; ?>admin.png" alt="Admin"></div>
                </div><button class="ask-ai"><i class="fa-solid fa-wand-magic-sparkles"></i> Ask AI Moto</button>
            </div>
        </header>
        <?php if ($message): ?>
            <div class="message success"><i class="fa-solid fa-circle-check"></i><?php echo h($message); ?></div>
        <?php endif; ?><?php if ($error): ?>
            <div class="message error"><i class="fa-solid fa-circle-exclamation"></i><?php echo h($error); ?></div>
        <?php endif; ?>
        <section class="summary-cards">
            <?php $cards = [['registered-children.png', 'REGISTERED CHILDREN', 'THIS YEAR', '86', 'Total this year', 'blue'], ['well-child-visits.png', 'WELL CHILD VISITS', 'THIS MONTH', '18', 'Completed', 'green'], ['child-follow-up.png', 'DUE FOR FOLLOW-UP', '', '6', 'Next 30 days', 'orange'], ['at-risk-child.png', 'AT-RISK / UNDERWEIGHT', '', '5', 'Need Monitoring', 'red'], ['nutrition-program.png', 'NUTRITION PROGRAM', 'ENROLLEES', '15', 'Currently enrolled', 'purple']];
            foreach ($cards as $c): ?>
                <div class="summary-card <?php echo $c[5]; ?>">
                    <div class="summary-icon"><img src="<?php echo $icon . $c[0]; ?>" alt=""></div>
                    <div>
                        <span><?php echo $c[1]; ?><?php if ($c[2])
                               echo '<br>' . $c[2]; ?></span><strong><?php echo $c[3]; ?></strong><small><?php echo $c[4]; ?></small>
                    </div>
                </div><?php endforeach; ?>
        </section>
        <nav class="tabs"><button class="active" data-tab="records">Child Records</button><button
                data-tab="growth">Growth Monitoring</button><button data-tab="nutrition">Nutrition</button><button
                data-tab="milestones">Development Milestones</button><button data-tab="vitals">Health
                Vitals</button><button data-tab="reports">Reports</button></nav>
        <section id="records" class="tab active">
            <div class="layout">
                <aside class="child-list card">
                    <h2>Search Child</h2>
                    <form class="search" method="get"><input name="search" value="<?php echo h($search); ?>"
                            placeholder="Search by name or ID..."><button><i
                                class="fa-solid fa-magnifying-glass"></i></button><button type="button" class="filter"
                            onclick="alert('Filter options can be added here.')"><i class="fa-solid fa-filter"></i>
                            Filter</button></form>
                    <div class="children">
                        <?php foreach ($children as $x):
                            $sel = $selected === $x || ($selectedId && $x['child_id'] == $selectedId); ?><a
                                class="child <?php echo $sel ? 'selected' : ''; ?>"
                                href="<?php echo $x['child_id'] ? 'infant-child-health.php?child_id=' . $x['child_id'] : '#'; ?>">
                                <div class="child-avatar <?php echo strtolower($x['sex']) === 'female' ? 'female' : ''; ?>">
                                    <img src="<?php echo $icon; ?>child-avatar.png" alt="">
                                </div>
                                <div><b><?php echo h(trim($x['first_name'] . ' ' . $x['middle_name'] . ' ' . $x['last_name'])); ?>
                                        <em>Active</em></b><small>ID: <?php echo h($x['child_code']); ?> &nbsp;|&nbsp;
                                        <?php echo h(ageText($x['birth_date'])); ?> &nbsp;|&nbsp;
                                        <?php echo h($x['sex']); ?></small><small>DOB:
                                        <?php echo h(date('F d, Y', strtotime($x['birth_date']))); ?></small></div>
                            </a><?php endforeach; ?>
                    </div><button class="add" onclick="openModal('childModal')"><i class="fa-solid fa-plus"></i> Add New
                        Child</button>
                </aside>
                <div class="center">
                    <section class="profile card">
                        <div class="profile-main">
                            <div class="large-avatar"><img src="<?php echo $icon; ?>child-avatar.png" alt=""></div>
                            <div class="profile-info">
                                <div class="name">
                                    <h2><?php echo h($full); ?></h2><em>Active</em>
                                </div>
                                <p><b>ID:</b> <?php echo h($selected['child_code'] ?? '-'); ?> <i></i>
                                    <?php echo h($selected ? ageText($selected['birth_date']) : '-'); ?> <i></i>
                                    <?php echo h($selected['sex'] ?? '-'); ?></p>
                                <p>Contact: <?php echo h($selected['contact_number'] ?? 'Not provided'); ?> <i></i>
                                    Address: <?php echo h($selected['address'] ?? 'Not provided'); ?></p>
                                <p>Mother: <?php echo h($selected['mother_name'] ?? 'Not provided'); ?> <i></i> Contact:
                                    <?php echo h($selected['mother_contact'] ?? 'Not provided'); ?>
                                </p>
                            </div>
                        </div>
                        <div class="profile-actions"><button><i class="fa-solid fa-pen"></i> Edit
                                Profile</button><button class="print" onclick="window.print()"><i
                                    class="fa-solid fa-print"></i> Print Record</button></div>
                        <div class="facts">
                            <div><small>Blood Type</small><b><?php echo h($selected['blood_type'] ?? 'O+'); ?></b></div>
                            <div><small>Allergies</small><b><?php echo h($selected['allergies'] ?? 'None known'); ?></b>
                            </div>
                            <div><small>Birth
                                    Date</small><b><?php echo h($selected ? date('M d, Y', strtotime($selected['birth_date'])) : '-'); ?></b>
                            </div>
                            <div><small>Birth
                                    Weight</small><b><?php echo h($selected['birth_weight'] ?? '3.1 kg'); ?></b>
                            </div>
                            <div><small>PhilHealth
                                    No.</small><b><?php echo h($selected['philhealth_number'] ?? '12-345678901-2'); ?></b>
                            </div>
                        </div>
                    </section>
                    <section class="visits card">
                        <h2>Well-Child Visits</h2>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Age</th>
                                        <th>Visit Type</th>
                                        <th>BP (mmHg)</th>
                                        <th>Weight (kg)</th>
                                        <th>Height (cm)</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody><?php foreach ($visits as $v): ?>
                                        <tr>
                                            <td><?php echo h(date('M d, Y', strtotime($v[0]))); ?></td>
                                            <td><?php echo h($v[1]); ?></td>
                                            <td><?php echo h($v[2]); ?></td>
                                            <td><?php echo h($v[3]); ?></td>
                                            <td><?php echo h($v[4]); ?></td>
                                            <td><?php echo h($v[5]); ?></td>
                                            <td><button class="eye"><i class="fa-solid fa-eye"></i></button></td>
                                        </tr><?php endforeach; ?>
                                </tbody>
                            </table>
                        </div><button class="add visit-add" onclick="openModal('visitModal')"><i
                                class="fa-solid fa-plus"></i> Add New Visit</button>
                    </section>
                    <section class="milestones card">
                        <div class="heading">
                            <h2>Development Milestones</h2><a href="#" onclick="tab('milestones');return false;">View
                                all milestones <i class="fa-solid fa-arrow-right"></i></a>
                        </div>
                        <div class="milestone-grid">
                            <div class="m green"><i class="fa-solid fa-person-running"></i><b>Gross Motor</b><small>On
                                    Track</small></div>
                            <div class="m blue"><i class="fa-solid fa-pencil"></i><b>Fine Motor</b><small>On
                                    Track</small></div>
                            <div class="m purple"><i class="fa-solid fa-comments"></i><b>Language</b><small>On
                                    Track</small></div>
                            <div class="m yellow"><i class="fa-solid fa-people-group"></i><b>Social</b><small>On
                                    Track</small></div>
                            <div class="m pink"><i class="fa-solid fa-brain"></i><b>Cognitive</b><small>On Track</small>
                            </div>
                        </div>
                    </section>
                </div>
                <aside class="right">
                    <section class="side card">
                        <div class="heading">
                            <h2>Growth Summary</h2><small>As of May 12, 2026</small>
                        </div>
                        <div class="growth-buttons"><button
                                class="on">Weight-for-Age</button><button>Height-for-Age</button></div>
                        <div class="chart">
                            <div class="y"><span>15 kg</span><span>12 kg</span><span>9 kg</span><span>6 kg</span><span>3
                                    kg</span></div><svg viewBox="0 0 320 150" preserveAspectRatio="none">
                                <g class="grid">
                                    <line x1="30" y1="20" x2="310" y2="20" />
                                    <line x1="30" y1="50" x2="310" y2="50" />
                                    <line x1="30" y1="80" x2="310" y2="80" />
                                    <line x1="30" y1="110" x2="310" y2="110" />
                                    <line x1="30" y1="140" x2="310" y2="140" />
                                </g>
                                <polyline points="30,126 75,110 120,101 165,86 210,70 255,52 305,36" />
                                <g class="dots">
                                    <circle cx="30" cy="126" r="3" />
                                    <circle cx="75" cy="110" r="3" />
                                    <circle cx="120" cy="101" r="3" />
                                    <circle cx="165" cy="86" r="3" />
                                    <circle cx="210" cy="70" r="3" />
                                    <circle cx="255" cy="52" r="3" />
                                    <circle cx="305" cy="36" r="3" />
                                </g>
                            </svg>
                        </div>
                        <div class="legend"><span>● WHO Median</span><span>●
                                <?php echo h($selected['first_name'] ?? 'Juanito'); ?></span></div>
                    </section>
                    <section class="side card">
                        <div class="heading">
                            <h2>Growth Summary</h2><a href="#">View all →</a>
                        </div>
                        <div class="rows">
                            <div><i class="fa-solid fa-clipboard-check green-i"></i>
                                <p><b>Next Well-Child Visit</b><small>June 12, 2026 | 9:00 AM</small></p><em>In 4
                                    days</em>
                            </div>
                            <div><i class="fa-solid fa-syringe blue-i"></i>
                                <p><b>Due for Immunization</b><small>PCV 2nd Dose</small></p><em>Due in 11 days</em>
                            </div>
                            <div><i class="fa-solid fa-pills purple-i"></i>
                                <p><b>Vitamin A Supplementation</b><small>Due on June 15, 2026</small></p><em>Due in 18
                                    days</em>
                            </div>
                            <div><i class="fa-solid fa-person-running green-i"></i>
                                <p><b>Development Screening</b><small>June 15, 2026</small></p><em
                                    class="scheduled">Scheduled</em>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>
        </section>
        <?php foreach (['growth' => 'Growth Monitoring', 'nutrition' => 'Nutrition', 'milestones' => 'Development Milestones', 'vitals' => 'Health Vitals', 'reports' => 'Reports'] as $id => $title): ?>
            <section id="<?php echo $id; ?>" class="tab">
                <div class="placeholder card">
                    <h2><?php echo $title; ?></h2>
                    <p>Manage and monitor <?php echo strtolower($title); ?> information for infants and children.</p>
                </div>
            </section><?php endforeach; ?>
        <div class="disclaimer"><i class="fa-solid fa-circle-info"></i> Regular monitoring helps ensure every child
            grows healthy and reaches their full potential.</div>
    </main>
    <div class="modal" id="childModal">
        <div class="modal-box">
            <header>
                <h2>Add New Child</h2><button onclick="closeModal('childModal')">×</button>
            </header>
            <form method="post"><input type="hidden" name="action" value="add_child">
                <div class="form-grid"><label>First Name *<input name="first_name" required></label><label>Middle
                        Name<input name="middle_name"></label><label>Last Name *<input name="last_name"
                            required></label><label>Birth Date *<input type="date" name="birth_date"
                            required></label><label>Sex *<select name="sex" required>
                            <option value="">Select</option>
                            <option>Male</option>
                            <option>Female</option>
                        </select></label><label>Contact Number<input name="contact_number"></label><label
                        class="full">Address<input name="address"></label><label>Mother's Name<input
                            name="mother_name"></label><label>Mother's Contact<input name="mother_contact"></label>
                </div>
                <div class="actions"><button type="button" onclick="closeModal('childModal')">Cancel</button><button
                        class="save">Save Child</button></div>
            </form>
        </div>
    </div>
    <div class="modal" id="visitModal">
        <div class="modal-box">
            <header>
                <h2>Add New Well-Child Visit</h2><button onclick="closeModal('visitModal')">×</button>
            </header>
            <form method="post"><input type="hidden" name="action" value="add_visit"><input type="hidden"
                    name="child_id" value="<?php echo (int) ($selected['child_id'] ?? 0); ?>">
                <div class="form-grid"><label>Visit Date *<input type="date" name="visit_date"
                            required></label><label>Age at Visit<input name="age_at_visit"
                            placeholder="e.g. 2 yrs, 3 mos"></label><label>Visit Type *<select name="visit_type"
                            required>
                            <option value="">Select</option>
                            <option>Well Child Visit</option>
                            <option>Growth Monitoring</option>
                            <option>Nutrition Assessment</option>
                            <option>Development Screening</option>
                            <option>Follow-up Visit</option>
                        </select></label><label>BP (mmHg)<input name="bp" placeholder="Normal"></label><label>Weight
                        (kg)<input name="weight_kg"></label><label>Height (cm)<input name="height_cm"></label><label
                        class="full">Notes<textarea name="notes" rows="4"></textarea></label></div>
                <div class="actions"><button type="button" onclick="closeModal('visitModal')">Cancel</button><button
                        class="save">Save Visit</button></div>
            </form>
        </div>
    </div>
    <script>function openModal(id) { document.getElementById(id).classList.add('show'); document.body.classList.add('modal-open') } function closeModal(id) { document.getElementById(id).classList.remove('show'); document.body.classList.remove('modal-open') } function tab(id) { document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === id)); document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === id)) } document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => tab(b.dataset.tab)); document.querySelectorAll('.modal').forEach(m => m.onclick = e => { if (e.target === m) closeModal(m.id) }); document.onkeydown = e => { if (e.key === 'Escape') document.querySelectorAll('.modal.show').forEach(m => closeModal(m.id)) };</script>
</body>

</html>
<?php $conn->close(); ?>