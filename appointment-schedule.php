<?php
session_start();

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit();
}

$appointments = [
    [
        "name" => "Juan D. Dela Cruz",
        "id" => "PT-2026-0001",
        "age" => 34,
        "gender" => "Male",
        "visit" => "Pediatric Check Up",
        "date" => "April 10, 2026",
        "time" => "09:00 AM",
        "status" => "Scheduled",
        "color" => "blue"
    ],
    [
        "name" => "Maria S. Esparza",
        "id" => "PT-2026-0002",
        "age" => 37,
        "gender" => "Female",
        "visit" => "Prenatal Check Up",
        "date" => "April 10, 2026",
        "time" => "10:00 AM",
        "status" => "Scheduled",
        "color" => "pink"
    ],
    [
        "name" => "Leandro D. Garcia",
        "id" => "PT-2026-0003",
        "age" => 40,
        "gender" => "Male",
        "visit" => "General Consultation",
        "date" => "April 10, 2026",
        "time" => "11:00 AM",
        "status" => "Scheduled",
        "color" => "blue"
    ],
    [
        "name" => "Georgina F. Williams",
        "id" => "PT-2026-0004",
        "age" => 38,
        "gender" => "Female",
        "visit" => "TB Dots Follow-up",
        "date" => "April 10, 2026",
        "time" => "01:00 PM",
        "status" => "Scheduled",
        "color" => "green"
    ],
    [
        "name" => "Pedro O. Pendulo",
        "id" => "PT-2026-0005",
        "age" => 41,
        "gender" => "Male",
        "visit" => "General Consultation",
        "date" => "April 10, 2026",
        "time" => "02:00 PM",
        "status" => "Scheduled",
        "color" => "purple"
    ],
    [
        "name" => "Ramon K. Garcia",
        "id" => "PT-2026-0006",
        "age" => 35,
        "gender" => "Male",
        "visit" => "Hypertension Check Up",
        "date" => "April 10, 2026",
        "time" => "03:00 PM",
        "status" => "Scheduled",
        "color" => "blue"
    ],
    [
        "name" => "Cyrus John R. Talaga",
        "id" => "PT-2026-0007",
        "age" => 17,
        "gender" => "Male",
        "visit" => "Pediatric Check Up",
        "date" => "April 10, 2026",
        "time" => "04:00 PM",
        "status" => "Scheduled",
        "color" => "orange"
    ]
];

$selected = $appointments[0];


?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment and Schedule</title>

    <link rel="stylesheet" href="appointment-schedule.css">
    <script src="darkmode.js"></script>

</head>

<body>
 <?php include 'sidebar.php'; ?>
    <main class="main-content">

        <header class="page-header">

            <div>
                <h1>Appointment and Schedule</h1>
                <p>Manage patient appointments, schedule and availability.</p>
            </div>

            <div class="header-right">

                <div class="admin-profile">

                    <div class="admin-text">
                        <small>You are logged in as</small>

                        <strong>
                            <?php
                            echo htmlspecialchars(
                                $_SESSION["user"]["full_name"]
                                ?? "ADMIN CYRON"
                            );
                            ?>
                        </strong>
                    </div>

                    <img src="icons/admin-profile.png" alt="Admin" class="admin-photo"
                        onerror="this.style.display='none'">

                </div>

                <button class="ask-ai">
                    <span>+</span>
                    Ask AI Moto
                </button>

            </div>

        </header>

        <section class="summary-cards">

            <div class="summary-card">

                <div class="summary-icon blue">
                    <img src="icons/todays appointments.png" alt="Appointments">
                </div>

                <div>
                    <span>Today's Appointments</span>
                    <strong>32</strong>
                    <small>Schedule for today</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon green">
                    <img src="icons/completed appointments.png" alt="Completed">
                </div>

                <div>
                    <span>Completed Today</span>
                    <strong>18</strong>
                    <small>Completed appointments</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon orange">
                    <img src="icons/pending appointments.png" alt="Pending">
                </div>

                <div>
                    <span>Pending</span>
                    <strong>12</strong>
                    <small>Upcoming appointments</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon red">
                    <img src="icons/cancelled appointments.png" alt="Cancelled">
                </div>

                <div>
                    <span>Cancelled</span>
                    <strong>2</strong>
                    <small>Cancelled appointments</small>
                </div>

            </div>


            <div class="summary-card">

                <div class="summary-icon purple">
                    <img src="icons/no show.png" alt="No Show">
                </div>

                <div>
                    <span>No-Show</span>
                    <strong>1</strong>
                    <small>Did not attend</small>
                </div>

            </div>

        </section>

        <section class="appointment-grid">

            <div class="left-column">

                <div class="card calendar-card">

                    <div class="card-title">
                        <h2>Calendar</h2>

                        <button class="today-button">
                            Today
                        </button>
                    </div>


                    <div class="calendar-header">

                        <button>‹</button>

                        <strong>August 2026</strong>

                        <button>›</button>

                    </div>


                    <div class="calendar-days">

                        <span>SUN</span>
                        <span>MON</span>
                        <span>TUE</span>
                        <span>WED</span>
                        <span>THU</span>
                        <span>FRI</span>
                        <span>SAT</span>

                    </div>


                    <div class="calendar-grid">

                        <span class="muted">26</span>
                        <span class="muted">27</span>
                        <span class="muted">28</span>
                        <span class="muted">29</span>
                        <span class="muted">30</span>
                        <span class="muted">31</span>
                        <span>1</span>

                        <span>2</span>
                        <span>3</span>
                        <span>4</span>
                        <span>5</span>
                        <span>6</span>
                        <span>7</span>
                        <span>8</span>

                        <span>9</span>
                        <span>10</span>
                        <span>11</span>
                        <span>12</span>
                        <span>13</span>
                        <span>14</span>
                        <span>15</span>

                        <span>16</span>
                        <span>17</span>
                        <span>18</span>
                        <span class="today">19</span>
                        <span>20</span>
                        <span>21</span>
                        <span>22</span>

                        <span>23</span>
                        <span>24</span>
                        <span>25</span>
                        <span>26</span>
                        <span>27</span>
                        <span>28</span>
                        <span>29</span>

                        <span>30</span>
                        <span>31</span>
                        <span class="muted">1</span>
                        <span class="muted">2</span>
                        <span class="muted">3</span>
                        <span class="muted">4</span>
                        <span class="muted">5</span>

                    </div>


                    <div class="calendar-legend">

                        <strong>Calendar Legend</strong>

                        <div>
                            <span><i class="dot blue-dot"></i> New Appointment</span>
                            <span><i class="dot green-dot"></i> Completed</span>
                            <span><i class="dot red-dot"></i> Cancelled</span>
                            <span><i class="dot purple-dot"></i> No-show</span>
                        </div>

                    </div>

                </div>


                <div class="card quick-actions">

                    <h2>Quick Actions</h2>

                    <button class="primary-action" onclick="openAppointmentModal()">
                        + &nbsp; New Appointment
                    </button>

                    <button>
                        👤 &nbsp; Appointment Walk-in
                    </button>

                    <button>
                        ◷ &nbsp; Manage Time Slots
                    </button>

                </div>

            </div>

            <div class="card appointment-list">

                <div class="list-header">

                    <h2>Appointment List</h2>

                    <div class="search-row">

                        <div class="search-input">
                            <input type="text" id="appointmentSearch" placeholder="Search name or appointment..."
                                onkeyup="searchAppointments()">
                            <span>⌕</span>
                        </div>

                        <button class="filter-button">
                            ⚑ Filter
                        </button>

                    </div>

                    <button class="new-patient-button" onclick="openAppointmentModal()">
                        + New Patient
                    </button>

                </div>


                <div class="appointment-items" id="appointmentItems">

                    <?php foreach ($appointments as $index => $appointment): ?>

                        <div class="appointment-item <?php echo $index === 0 ? 'selected' : ''; ?>"
                            data-name="<?php echo strtolower($appointment['name']); ?>"
                            onclick="selectAppointment(<?php echo $index; ?>)">

                            <div class="patient-icon <?php echo $appointment['color']; ?>">

                                <img src="icons/patient.png" alt="Patient" onerror="this.style.display='none'">
                            </div>


                            <div class="appointment-person">

                                <strong>
                                    <?php echo htmlspecialchars($appointment["name"]); ?>
                                </strong>

                                <small>
                                    <?php echo htmlspecialchars($appointment["id"]); ?>
                                    ·
                                    <?php echo $appointment["age"]; ?> yrs
                                    ·
                                    <?php echo htmlspecialchars($appointment["gender"]); ?>
                                </small>

                                <small>
                                    <?php echo htmlspecialchars($appointment["visit"]); ?>
                                </small>

                            </div>


                            <span class="appointment-status">
                                <?php echo htmlspecialchars($appointment["status"]); ?>
                            </span>

                            <span class="arrow">›</span>

                        </div>

                    <?php endforeach; ?>

                </div>


                <div class="pagination">

                    <span>Showing 1 to 7 of 32 appointments</span>

                    <div>
                        <button>‹</button>
                        <button class="active">1</button>
                        <button>2</button>
                        <button>3</button>
                        <button>4</button>
                        <button>...</button>
                        <button>12</button>
                        <button>›</button>
                    </div>

                </div>

            </div>

            <div class="right-column">

                <div class="card appointment-details">

                    <div class="card-title">

                        <h2>Appointment Details</h2>

                        <button class="edit-button">
                            ✎ Edit
                        </button>

                    </div>


                    <div class="selected-patient">

                        <div class="large-patient-icon">
                            <img src="icons/patient.png" alt="Patient" onerror="this.style.display='none'">
                        </div>

                        <div>
                            <strong id="selectedName">
                                <?php echo htmlspecialchars($selected["name"]); ?>
                            </strong>

                            <span id="selectedId">
                                <?php echo htmlspecialchars($selected["id"]); ?>
                            </span>
                        </div>

                        <span class="scheduled-label">
                            Scheduled
                        </span>

                    </div>


                    <div class="details-list">

                        <div>
                            <span>▣</span>
                            <strong>Date & Time</strong>
                            <p id="selectedDate">
                                <?php echo htmlspecialchars($selected["date"]); ?>
                                ·
                                <?php echo htmlspecialchars($selected["time"]); ?>
                            </p>
                        </div>

                        <div>
                            <span>♧</span>
                            <strong>Type of Visit</strong>
                            <p id="selectedVisit">
                                <?php echo htmlspecialchars($selected["visit"]); ?>
                            </p>
                        </div>

                        <div>
                            <span>▣</span>
                            <strong>Reason</strong>
                            <p>Routine health center consultation.</p>
                        </div>

                        <div>
                            <span>♟</span>
                            <strong>Healthcare Worker</strong>
                            <p>Midwife Cyron</p>
                        </div>

                        <div>
                            <span>⌖</span>
                            <strong>Location / Room</strong>
                            <p>Consultation Room 1</p>
                        </div>

                        <div>
                            <span>▣</span>
                            <strong>Notes</strong>
                            <p>Bring previous lab results if available.</p>
                        </div>

                    </div>

                </div>


                <div class="card schedule-card">

                    <div class="card-title">
                        <h2>Today's Schedule (August 12, 2026)</h2>
                    </div>

                    <?php foreach ($appointments as $appointment): ?>

                        <div class="schedule-item">

                            <span class="schedule-dot"></span>

                            <strong>
                                <?php echo $appointment["time"]; ?>
                            </strong>

                            <div>
                                <b><?php echo htmlspecialchars($appointment["name"]); ?></b>
                                <small><?php echo htmlspecialchars($appointment["visit"]); ?></small>
                            </div>

                            <span class="schedule-status">
                                Scheduled
                            </span>

                        </div>

                    <?php endforeach; ?>

                    <a href="#" class="view-all">
                        View Full Schedule →
                    </a>

                </div>

            </div>

        </section>


        <div class="disclaimer">
            <span>●</span>
            Please arrive 15 minutes before your scheduled appointment. Thank you.
        </div>

    </main>


    <!-- MODAL -->

    <div class="modal" id="appointmentModal">

        <div class="modal-box">

            <div class="modal-header">

                <h2>New Appointment</h2>

                <button onclick="closeAppointmentModal()">×</button>

            </div>

            <form onsubmit="saveAppointment(event)">

                <div class="form-grid">

                    <div>
                        <label>Patient Name</label>
                        <input type="text" required>
                    </div>

                    <div>
                        <label>Patient ID</label>
                        <input type="text" required>
                    </div>

                    <div>
                        <label>Date</label>
                        <input type="date" required>
                    </div>

                    <div>
                        <label>Time</label>
                        <input type="time" required>
                    </div>

                    <div class="full">
                        <label>Type of Visit</label>
                        <select required>
                            <option value="">Select visit type</option>
                            <option>General Consultation</option>
                            <option>Follow-up Check Up</option>
                            <option>Maternal Check Up</option>
                            <option>Pediatric Check Up</option>
                            <option>TB Dots Follow-up</option>
                        </select>
                    </div>

                    <div class="full">
                        <label>Reason / Notes</label>
                        <textarea rows="4"></textarea>
                    </div>

                </div>

                <div class="modal-actions">

                    <button type="button" class="cancel-button" onclick="closeAppointmentModal()">
                        Cancel
                    </button>

                    <button type="submit" class="save-button">
                        Save Appointment
                    </button>

                </div>

            </form>

        </div>

    </div>


    <script>

        function openAppointmentModal() {
            document.getElementById("appointmentModal").classList.add("show");
        }

        function closeAppointmentModal() {
            document.getElementById("appointmentModal").classList.remove("show");
        }

        function saveAppointment(event) {
            event.preventDefault();

            alert("Appointment saved successfully.");

            closeAppointmentModal();
        }

        function searchAppointments() {

            const input =
                document.getElementById("appointmentSearch")
                    .value
                    .toLowerCase();

            const items =
                document.querySelectorAll(".appointment-item");

            items.forEach(function (item) {

                const name =
                    item.getAttribute("data-name");

                if (name.includes(input)) {
                    item.style.display = "grid";
                } else {
                    item.style.display = "none";
                }

            });

        }

        const appointmentData = <?php echo json_encode($appointments); ?>;

        function selectAppointment(index) {

            const appointment = appointmentData[index];

            document
                .querySelectorAll(".appointment-item")
                .forEach(function (item) {
                    item.classList.remove("selected");
                });

            document
                .querySelectorAll(".appointment-item")[index]
                .classList.add("selected");

            document.getElementById("selectedName").textContent =
                appointment.name;

            document.getElementById("selectedId").textContent =
                appointment.id;

            document.getElementById("selectedDate").textContent =
                appointment.date + " · " + appointment.time;

            document.getElementById("selectedVisit").textContent =
                appointment.visit;
        }

        window.addEventListener("click", function (event) {

            const modal =
                document.getElementById("appointmentModal");

            if (event.target === modal) {
                closeAppointmentModal();
            }

        });

    </script>

</body>

</html>