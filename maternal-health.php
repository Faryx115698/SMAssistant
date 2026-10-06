<?php
session_start();
require_once "db.php";
if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}
$conn->set_charset("utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS maternal_records (maternal_id INT AUTO_INCREMENT PRIMARY KEY, patient_name VARCHAR(150) NOT NULL, patient_id VARCHAR(50) NOT NULL, age INT DEFAULT 0, gravida VARCHAR(30), para VARCHAR(30), edd DATE NULL, gestational_age VARCHAR(50), contact VARCHAR(40), address VARCHAR(255), blood_type VARCHAR(10), allergies VARCHAR(150), lmp DATE NULL, philhealth VARCHAR(50), civil_status VARCHAR(50), risk_level VARCHAR(30) DEFAULT 'Low Risk', status VARCHAR(30) DEFAULT 'Active', notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS maternal_anc_visits (visit_id INT AUTO_INCREMENT PRIMARY KEY, maternal_id INT NOT NULL, visit_no VARCHAR(30), visit_date DATE, gestational_age VARCHAR(50), weight VARCHAR(30), bp VARCHAR(30), fetal_age VARCHAR(30), next_visit DATE NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, INDEX(maternal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
$conn->query("CREATE TABLE IF NOT EXISTS maternal_appointments (appointment_id INT AUTO_INCREMENT PRIMARY KEY, maternal_id INT NOT NULL, appointment_date DATE, appointment_time TIME, appointment_type VARCHAR(80), status VARCHAR(30) DEFAULT 'Scheduled', INDEX(maternal_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$success = '';
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'patient') {
        $stmt = $conn->prepare("INSERT INTO maternal_records(patient_name,patient_id,age,gravida,para,edd,gestational_age,contact,address,blood_type,allergies,risk_level) VALUES(?,?,?,?,?,NULLIF(?,''),?,?,?,?,?,?)");
        $name = trim($_POST['patient_name'] ?? '');
        $pid = trim($_POST['patient_id'] ?? '');
        $age = (int) ($_POST['age'] ?? 0);
        $gravida = trim($_POST['gravida'] ?? '');
        $para = trim($_POST['para'] ?? '');
        $edd = $_POST['edd'] ?? '';
        $ga = trim($_POST['gestational_age'] ?? '');
        $contact = trim($_POST['contact'] ?? '');
        $address = trim($_POST['address'] ?? '');
        $blood = $_POST['blood_type'] ?? 'O+';
        $allergies = trim($_POST['allergies'] ?? 'None known');
        $risk = $_POST['risk_level'] ?? 'Low Risk';
        $stmt->bind_param('ssisssssssss', $name, $pid, $age, $gravida, $para, $edd, $ga, $contact, $address, $blood, $allergies, $risk);
        if ($name && $pid && $stmt->execute())
            $success = 'New maternal patient added successfully.';
        else
            $error = 'Patient name and patient ID are required.';
        $stmt->close();
    }
    if ($action === 'visit') {
        $stmt = $conn->prepare("INSERT INTO maternal_anc_visits(maternal_id,visit_no,visit_date,gestational_age,weight,bp,fetal_age,next_visit) VALUES(?,?,?,?,?,?,?,NULLIF(?,''))");
        $mid = (int) $_POST['maternal_id'];
        $vn = trim($_POST['visit_no'] ?? '');
        $vd = $_POST['visit_date'] ?? '';
        $ga = trim($_POST['gestational_age'] ?? '');
        $weight = trim($_POST['weight'] ?? '');
        $bp = trim($_POST['bp'] ?? '');
        $fetal = trim($_POST['fetal_age'] ?? '');
        $next = $_POST['next_visit'] ?? '';
        $stmt->bind_param('isssssss', $mid, $vn, $vd, $ga, $weight, $bp, $fetal, $next);
        if ($mid && $vn && $vd && $stmt->execute())
            $success = 'ANC visit added successfully.';
        $stmt->close();
    }
    if ($action === 'appointment') {
        $stmt = $conn->prepare("INSERT INTO maternal_appointments(maternal_id,appointment_date,appointment_time,appointment_type) VALUES(?,?,?,?)");
        $mid = (int) $_POST['maternal_id'];
        $date = $_POST['appointment_date'] ?? '';
        $time = $_POST['appointment_time'] ?? '';
        $type = $_POST['appointment_type'] ?? 'ANC Visit';
        $stmt->bind_param('isss', $mid, $date, $time, $type);
        if ($mid && $date && $time && $stmt->execute())
            $success = 'Appointment scheduled successfully.';
        $stmt->close();
    }
}
function fd($d)
{
    return $d && $d !== '0000-00-00' ? date('M d, Y', strtotime($d)) : '—';
}
$search = trim($_GET['search'] ?? '');
$selectedId = (int) ($_GET['patient'] ?? 0);
if ($search) {
    $stmt = $conn->prepare("SELECT * FROM maternal_records WHERE patient_name LIKE CONCAT('%',?,'%') OR patient_id LIKE CONCAT('%',?,'%') ORDER BY patient_name");
    $stmt->bind_param('ss', $search, $search);
    $stmt->execute();
    $patients = $stmt->get_result();
} else {
    $patients = $conn->query('SELECT * FROM maternal_records ORDER BY patient_name');
}
if ($selectedId <= 0) {
    $q = $conn->query('SELECT maternal_id FROM maternal_records ORDER BY maternal_id LIMIT 1');
    if ($q && $q->num_rows)
        $selectedId = (int) $q->fetch_assoc()['maternal_id'];
}
$selected = null;
if ($selectedId) {
    $stmt = $conn->prepare('SELECT * FROM maternal_records WHERE maternal_id=?');
    $stmt->bind_param('i', $selectedId);
    $stmt->execute();
    $selected = $stmt->get_result()->fetch_assoc();
    $stmt->close();
}
if (!$selected)
    $selected = ['maternal_id' => 0, 'patient_name' => 'No Maternal Patient', 'patient_id' => '—', 'age' => 0, 'gravida' => '—', 'para' => '—', 'edd' => null, 'gestational_age' => '—', 'contact' => '—', 'address' => '—', 'blood_type' => 'O+', 'allergies' => 'None known', 'lmp' => null, 'philhealth' => '—', 'civil_status' => '—', 'risk_level' => 'Low Risk', 'status' => 'Active', 'notes' => 'No maternal record is available yet.'];
$visits = $conn->query("SELECT * FROM maternal_anc_visits WHERE maternal_id=" . (int) $selected['maternal_id'] . " ORDER BY visit_date DESC");
$appointments = $conn->query("SELECT a.*,m.patient_name FROM maternal_appointments a JOIN maternal_records m ON m.maternal_id=a.maternal_id WHERE a.maternal_id=" . (int) $selected['maternal_id'] . " AND a.appointment_date>=CURDATE() ORDER BY a.appointment_date,a.appointment_time LIMIT 4");
$total = (int) $conn->query('SELECT COUNT(*) c FROM maternal_records')->fetch_assoc()['c'];
$complete = (int) $conn->query('SELECT COUNT(*) c FROM maternal_records m WHERE (SELECT COUNT(*) FROM maternal_anc_visits v WHERE v.maternal_id=m.maternal_id)>=4')->fetch_assoc()['c'];
$due = (int) $conn->query("SELECT COUNT(*) c FROM maternal_records WHERE edd IS NOT NULL AND MONTH(edd)=MONTH(CURDATE()) AND YEAR(edd)=YEAR(CURDATE())")->fetch_assoc()['c'];
$risk = (int) $conn->query("SELECT COUNT(*) c FROM maternal_records WHERE risk_level='High Risk'")->fetch_assoc()['c'];

include "sidebar.php";

?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Maternal Health</title>
    <link rel="stylesheet" href="maternal-health.css">
    <script src="darkmode.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>

<body>
    <main class="main-content">
        <header class="page-header">
            <div>
                <h1>Maternal Health</h1>
                <p>Manage and monitor maternal health records, prenatal care, and postnatal follow-up.</p>
            </div>
            <div class="header-right">
                <div class="admin-profile">
                    <div class="admin-text"><small>You are logged in
                            as</small><strong><?= htmlspecialchars($_SESSION['user']['full_name'] ?? $_SESSION['user']['username'] ?? 'ADMIN CYRON') ?></strong>
                    </div>
                    <div class="admin-photo"><img src="icons/admin.png" alt="Admin"></div>
                </div><button class="ask-ai" onclick="location.href='ai-moto.php'"><i
                        class="fa-solid fa-wand-magic-sparkles"></i> Ask AI Moto</button>
            </div>
        </header>
        <?php if ($success): ?>
            <div class="message success"><i class="fa-solid fa-circle-check"></i><?= htmlspecialchars($success) ?></div>
        <?php endif; ?><?php if ($error): ?>
            <div class="message error"><i class="fa-solid fa-circle-exclamation"></i><?= htmlspecialchars($error) ?></div>
        <?php endif; ?>
        <section class="summary-grid">
            <?php $cards = [['maternal-registered.png', 'fa-person-pregnant', 'REGISTERED PREGNANT', $total, 'Total this year', 'purple'], ['anc-complete.png', 'fa-circle-check', 'ANC COMPLETE (4+ VISITS)', $complete, ($total ? round($complete / $total * 100) : 0) . '% of registered', 'green'], ['due-this-month.png', 'fa-calendar-days', 'DUE THIS MONTH', $due, 'Check-ups / Follow-ups', 'orange'], ['high-risk.png', 'fa-heart-pulse', 'HIGH RISK CASES', $risk, 'Requiring close monitoring', 'red'], ['deliveries.png', 'fa-baby', 'DELIVERIES THIS YEAR', 0, 'Total deliveries recorded', 'blue']];
            foreach ($cards as $c): ?>
                <div class="summary-card <?= $c[5] ?>">
                    <div class="summary-icon"><img src="icons/<?= $c[0] ?>" alt=""><i
                            class="fa-solid <?= $c[1] ?> fallback"></i></div>
                    <div><span><?= $c[2] ?></span><strong><?= $c[3] ?></strong><small><?= $c[4] ?></small></div>
                </div><?php endforeach; ?>
        </section>
        <nav class="record-tabs"><button class="record-tab active" data-tab="pregnant">Pregnant Women</button><button
                class="record-tab" data-tab="anc">Antenatal Care (ANC)</button><button class="record-tab"
                data-tab="pnc">Postnatal Care (PNC)</button><button class="record-tab" data-tab="birth">Birth
                Records</button><button class="record-tab" data-tab="report">Report</button></nav>
        <section class="tab-content active" id="pregnant">
            <div class="maternal-layout">
                <aside class="patient-list card">
                    <form class="patient-search"><input name="search" value="<?= htmlspecialchars($search) ?>"
                            placeholder="Search by name or ID..."><button><i
                                class="fa-solid fa-magnifying-glass"></i></button></form><button class="filter-btn"><i
                            class="fa-solid fa-filter"></i> Filter</button>
                    <div class="patients-scroll">
                        <?php if ($patients && $patients->num_rows):
                            while ($p = $patients->fetch_assoc()): ?><a
                                    class="patient-list-item <?= $p['maternal_id'] == $selected['maternal_id'] ? 'selected' : '' ?>"
                                    href="?patient=<?= $p['maternal_id'] ?>">
                                    <div class="patient-list-icon"><img src="icons/maternal-patient.png" alt=""><i
                                            class="fa-solid fa-person-pregnant fallback"></i></div>
                                    <div><strong><?= htmlspecialchars($p['patient_name']) ?></strong><small><?= htmlspecialchars($p['patient_id']) ?>
                                            • <?= htmlspecialchars($p['gravida']) ?></small><small>EDD: <?= fd($p['edd']) ?> •
                                            <?= htmlspecialchars($p['gestational_age'] ?: '—') ?></small></div><span><?= $p['age'] ?>
                                        yrs</span>
                                </a><?php endwhile; else: ?>
                            <div class="empty">No maternal records found.</div><?php endif; ?>
                    </div><button class="add-patient-btn" onclick="openModal('patientModal')"><i
                            class="fa-solid fa-plus"></i> Add New Patient</button>
                </aside>
                <section class="center-column">
                    <div class="patient-profile card">
                        <div class="profile-main">
                            <div class="large-patient-icon"><img src="icons/maternal-patient.png" alt=""><i
                                    class="fa-solid fa-person-pregnant fallback"></i></div>
                            <div class="profile-info">
                                <div class="name-row">
                                    <h2><?= htmlspecialchars($selected['patient_name']) ?></h2><span
                                        class="active-badge"><?= htmlspecialchars($selected['status']) ?></span>
                                </div>
                                <p>Patient ID: <b><?= htmlspecialchars($selected['patient_id']) ?></b> &nbsp; | &nbsp;
                                    <?= htmlspecialchars($selected['age']) ?> yrs &nbsp; | &nbsp;
                                    <?= htmlspecialchars($selected['gravida']) ?></p>
                                <p>Contact: <?= htmlspecialchars($selected['contact']) ?> &nbsp; | &nbsp; Address:
                                    <?= htmlspecialchars($selected['address']) ?></p>
                                <p>EDD: <?= fd($selected['edd']) ?> &nbsp; | &nbsp;
                                    <?= htmlspecialchars($selected['gestational_age'] ?: '—') ?></p>
                            </div>
                            <div class="profile-actions"><button><i class="fa-solid fa-pen"></i> Edit
                                    Profile</button><button onclick="window.print()"><i class="fa-solid fa-print"></i>
                                    Print Record</button></div>
                        </div>
                        <div class="profile-strip">
                            <div><small>Blood Type</small><b><?= htmlspecialchars($selected['blood_type']) ?></b></div>
                            <div><small>Allergies</small><b><?= htmlspecialchars($selected['allergies']) ?></b></div>
                            <div><small>Last Menstrual Period</small><b><?= fd($selected['lmp']) ?></b></div>
                            <div><small>PhilHealth</small><b><?= htmlspecialchars($selected['philhealth']) ?></b></div>
                            <div><small>Civil Status</small><b><?= htmlspecialchars($selected['civil_status']) ?></b>
                            </div>
                        </div>
                    </div>
                    <div class="card anc-card">
                        <h2>Antenatal Care (ANC) Visits</h2>
                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Visit No.</th>
                                        <th>Date</th>
                                        <th>Gestational Age</th>
                                        <th>Weight (kg)</th>
                                        <th>BP (mmHg)</th>
                                        <th>Fetal Age</th>
                                        <th>Next Visit</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody><?php if ($visits && $visits->num_rows):
                                    while ($v = $visits->fetch_assoc()): ?>
                                            <tr>
                                                <td><i class="dot"></i><?= htmlspecialchars($v['visit_no']) ?></td>
                                                <td><?= fd($v['visit_date']) ?></td>
                                                <td><?= htmlspecialchars($v['gestational_age']) ?></td>
                                                <td><?= htmlspecialchars($v['weight']) ?></td>
                                                <td><?= htmlspecialchars($v['bp']) ?></td>
                                                <td><?= htmlspecialchars($v['fetal_age']) ?></td>
                                                <td><?= fd($v['next_visit']) ?></td>
                                                <td><button class="view"><i class="fa-solid fa-eye"></i></button></td>
                                            </tr><?php endwhile; else: ?>
                                        <tr>
                                            <td colspan="8" class="empty">No ANC visits recorded.</td>
                                        </tr><?php endif; ?>
                                </tbody>
                            </table>
                        </div><?php if ($selected['maternal_id']): ?><button class="add-visit"
                                onclick="openModal('visitModal')"><i class="fa-solid fa-plus"></i> Add ANC
                                Visit</button><?php endif; ?>
                    </div>
                    <div class="card notes">
                        <h2>Notes</h2>
                        <div>
                            <p><?= nl2br(htmlspecialchars($selected['notes'])) ?></p><small>Last updated by:
                                BHW/Admin<br><?= date('M d, Y • h:i A') ?></small>
                        </div>
                    </div>
                </section>
                <aside class="right-column">
                    <div class="card side-card">
                        <div class="side-title">
                            <h2>Upcoming Appointment</h2><a href="appointment.php">View Calendar</a>
                        </div><?php if ($appointments && $appointments->num_rows):
                            while ($a = $appointments->fetch_assoc()): ?>
                                <div class="appointment"><i class="fa-regular fa-calendar-days"></i>
                                    <div><b><?= fd($a['appointment_date']) ?> •
                                            <?= date('g:i A', strtotime($a['appointment_time'])) ?></b><span><?= htmlspecialchars($a['appointment_type']) ?></span>
                                    </div><em><?= htmlspecialchars($a['status']) ?></em>
                                </div><?php endwhile; else: ?>
                            <div class="empty">No upcoming appointments.</div>
                        <?php endif; ?><?php if ($selected['maternal_id']): ?><button class="schedule"
                                onclick="openModal('appointmentModal')"><i class="fa-solid fa-plus"></i> Schedule
                                Appointment</button><?php endif; ?>
                    </div>
                    <div class="card side-card">
                        <h2>Pregnancy Overview</h2>
                        <div class="pregnancy">
                            <div class="ring">
                                <strong><?= htmlspecialchars($selected['gestational_age'] ?: '31') ?></strong><small>weeks</small>
                            </div>
                            <div class="preg-data">
                                <p><span>Trimester</span><b>2nd Trimester</b></p>
                                <p><span>EDD</span><b><?= fd($selected['edd']) ?></b></p>
                                <p><span>Days to go</span><b>61 days</b></p>
                                <p><span>Gravida / Para</span><b><?= htmlspecialchars($selected['gravida']) ?> /
                                        <?= htmlspecialchars($selected['para']) ?></b></p>
                                <p><span>Risk level</span><b
                                        class="low-risk"><?= htmlspecialchars($selected['risk_level']) ?></b></p>
                            </div>
                        </div>
                    </div>
                    <div class="card side-card">
                        <div class="side-title">
                            <h2>Health Reminders</h2><a href="#">View all</a>
                        </div>
                        <div class="reminder"><i class="fa-solid fa-circle-check"></i>Take iron supplements
                            daily<b>✓</b></div>
                        <div class="reminder"><i class="fa-solid fa-circle-check"></i>Eat nutritious food<b>✓</b></div>
                        <div class="reminder"><i class="fa-solid fa-circle-check"></i>Get enough rest and avoid heavy
                            lifting<b>✓</b></div>
                        <div class="reminder warning"><i class="fa-solid fa-circle-exclamation"></i>Attend scheduled ANC
                            visit<b>!</b></div>
                    </div>
                </aside>
            </div>
        </section>
        <?php foreach (['anc' => 'Antenatal Care (ANC)', 'pnc' => 'Postnatal Care (PNC)', 'birth' => 'Birth Records', 'report' => 'Maternal Health Report'] as $id => $title): ?>
            <section class="tab-content" id="<?= $id ?>">
                <div class="placeholder card">
                    <h2><?= $title ?></h2>
                    <p>This section is ready for additional records and reports.</p>
                </div>
            </section><?php endforeach; ?>
        <div class="disclaimer"><i class="fa-solid fa-circle-info"></i>Maternal health services should follow applicable
            DOH maternal health guidelines.</div>
    </main>
    <div class="modal" id="patientModal">
        <div class="modal-box">
            <div class="modal-head">
                <h2>Add New Maternal Patient</h2><button onclick="closeModal('patientModal')">&times;</button>
            </div>
            <form method="POST"><input type="hidden" name="action" value="patient">
                <div class="form-grid"><label>Patient Name<input name="patient_name" required></label><label>Patient
                        ID<input name="patient_id" placeholder="PT-MAT-2026-0001" required></label><label>Age<input
                            type="number" name="age" required></label><label>Gravida<input name="gravida"
                            placeholder="G1P0"></label><label>Para<input name="para"
                            placeholder="P0"></label><label>EDD<input type="date" name="edd"></label><label>Gestational
                        Age<input name="gestational_age" placeholder="20 weeks, 2 days"></label><label>Contact<input
                            name="contact"></label><label class="full">Address<input name="address"></label><label>Blood
                        Type<select name="blood_type">
                            <option>O+</option>
                            <option>O-</option>
                            <option>A+</option>
                            <option>A-</option>
                            <option>B+</option>
                            <option>B-</option>
                            <option>AB+</option>
                            <option>AB-</option>
                        </select></label><label>Allergies<input name="allergies" value="None known"></label><label>Risk
                        Level<select name="risk_level">
                            <option>Low Risk</option>
                            <option>High Risk</option>
                        </select></label></div>
                <div class="modal-actions"><button type="button"
                        onclick="closeModal('patientModal')">Cancel</button><button class="save">Save Patient</button>
                </div>
            </form>
        </div>
    </div>
    <div class="modal" id="visitModal">
        <div class="modal-box">
            <div class="modal-head">
                <h2>Add ANC Visit</h2><button onclick="closeModal('visitModal')">&times;</button>
            </div>
            <form method="POST"><input type="hidden" name="action" value="visit"><input type="hidden" name="maternal_id"
                    value="<?= $selected['maternal_id'] ?>">
                <div class="form-grid"><label>Visit No.<input name="visit_no" placeholder="1st Visit"
                            required></label><label>Date<input type="date" name="visit_date" value="<?= date('Y-m-d') ?>"
                            required></label><label>Gestational Age<input name="gestational_age"></label><label>Weight
                        (kg)<input name="weight"></label><label>BP (mmHg)<input name="bp"
                            placeholder="120/80"></label><label>Fetal Age<input name="fetal_age"></label><label>Next
                        Visit<input type="date" name="next_visit"></label></div>
                <div class="modal-actions"><button type="button"
                        onclick="closeModal('visitModal')">Cancel</button><button class="save">Save Visit</button></div>
            </form>
        </div>
    </div>
    <div class="modal" id="appointmentModal">
        <div class="modal-box">
            <div class="modal-head">
                <h2>Schedule Appointment</h2><button onclick="closeModal('appointmentModal')">&times;</button>
            </div>
            <form method="POST"><input type="hidden" name="action" value="appointment"><input type="hidden"
                    name="maternal_id" value="<?= $selected['maternal_id'] ?>">
                <div class="form-grid"><label>Date<input type="date" name="appointment_date"
                            required></label><label>Time<input type="time" name="appointment_time"
                            required></label><label class="full">Type<select name="appointment_type">
                            <option>ANC Visit</option>
                            <option>Follow-up</option>
                            <option>Laboratory Check-up</option>
                            <option>Postnatal Follow-up</option>
                        </select></label></div>
                <div class="modal-actions"><button type="button"
                        onclick="closeModal('appointmentModal')">Cancel</button><button class="save">Schedule</button>
                </div>
            </form>
        </div>
    </div>
    <script>function openModal(id) { document.getElementById(id).classList.add('show') } function closeModal(id) { document.getElementById(id).classList.remove('show') } document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('show') })); document.querySelectorAll('.record-tab').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.record-tab').forEach(x => x.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active')); b.classList.add('active'); document.getElementById(b.dataset.tab).classList.add('active') }));</script>
</body>

</html>
<?php $conn->close(); ?>