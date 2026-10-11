<?php
// api/sms.php - SMS & Notifications REST endpoint

session_start();
require_once __DIR__ . '/db.php';

if (!isset($_SESSION["user"])) {
    jsonError("Unauthorized", 401);
}

$notifications = [
    [
        "title" => "Free Flu Vaccination Day",
        "message" => "Free flu vaccination services on May 15, 2026 at the Talimundoc Health Center.",
        "date" => "May 8, 2026",
        "time" => "2:15 AM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Appointment Reminder",
        "message" => "Reminder: You have an appointment on May 10, 2026 at 9:00 AM.",
        "date" => "May 8, 2026",
        "time" => "6:30 PM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Medicine Availability",
        "message" => "Your requested medicine is now available at the Talimundoc Health Center.",
        "date" => "May 7, 2026",
        "time" => "2:13 PM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Heat Index Advisory",
        "message" => "High heat index expected this week. Stay hydrated and avoid prolonged exposure.",
        "date" => "May 7, 2026",
        "time" => "11:01 AM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Dental Mission - May 22",
        "message" => "Free dental check-up, cleaning, and fluoride application on May 22, 2026.",
        "date" => "May 6, 2026",
        "time" => "4:45 PM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "TB DOTS Reminder",
        "message" => "This is a reminder to take your TB medicine and follow your treatment schedule.",
        "date" => "May 6, 2026",
        "time" => "8:30 AM",
        "status" => "Delivered",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Prenatal Check-up",
        "message" => "You are due for your prenatal check-up. Please visit the health center.",
        "date" => "May 5, 2026",
        "time" => "10:20 AM",
        "status" => "Scheduled",
        "type" => "SMS",
        "icon" => ""
    ],
    [
        "title" => "Follow Us on Facebook",
        "message" => "Stay updated with health information, announcements, and community programs.",
        "date" => "May 4, 2026",
        "time" => "8:30 AM",
        "status" => "Delivered",
        "type" => "Facebook",
        "icon" => ""
    ]
];

$recipientGroups = [
    ["name" => "All Patients", "count" => "1,482"],
    ["name" => "Pregnant Women", "count" => "187"],
    ["name" => "Infant & Child", "count" => "315"],
    ["name" => "TB DOTS Patients", "count" => "285"],
    ["name" => "Senior Citizens", "count" => "617"],
    ["name" => "Custom List", "count" => "128"]
];

jsonResponse([
    "success" => true,
    "notifications" => $notifications,
    "recipientGroups" => $recipientGroups
]);
