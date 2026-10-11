<?php
// api/appointments.php - Appointments REST endpoint

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

// Sample appointment data matching the application
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

jsonResponse([
    "success" => true,
    "appointments" => $appointments,
    "selected" => $appointments[0]
]);
