<?php
session_start();

if (!isset($_SESSION["user"])) {
    header("Location: login.php");
    exit;
}

$user = $_SESSION["user"];

$adminName = "ADMIN CYRON";

if (isset($user["full_name"]) && $user["full_name"] !== "") {
    $adminName = strtoupper($user["full_name"]);
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

include "sidebar.php";

?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMS and Notifications</title>
    <script src="darkmode.js"></script>
    <link rel="stylesheet" href="sms-notifications.css">
</head>

<body>

<main class="main-content">

    <header class="page-header">

        <div class="page-title">
            <h1>SMS and Notifications</h1>
            <p>Send SMS and manage notifications to keep patients and the community informed.</p>
        </div>

        <div class="header-right">

            <div class="admin-profile">

                <div class="admin-text">
                    <small>You are logged in as</small>
                    <strong><?php echo htmlspecialchars($adminName); ?></strong>
                </div>

                <div class="admin-photo">
                    <img src="icons/admin.png" alt="Admin Icon">
                </div>

            </div>

            <button class="ask-ai">
                <span>+</span>
                Ask AI Moto
            </button>

        </div>

    </header>


    <!-- SUMMARY CARDS -->

    <section class="summary-cards">

        <div class="summary-card">
            <div class="summary-icon purple">
                <div class="icon-slot">
                    <!-- PUT YOUR SMS ICON HERE -->
                </div>
            </div>

            <div class="summary-info">
                <span>SMS SENT THIS MONTH</span>
                <strong>1,256</strong>
                <small>This month</small>
            </div>
        </div>


        <div class="summary-card">
            <div class="summary-icon green">
                <div class="icon-slot">
                    <!-- PUT YOUR DELIVERED ICON HERE -->
                </div>
            </div>

            <div class="summary-info">
                <span>DELIVERED</span>
                <strong>1,198</strong>
                <small>95.4% delivery rate</small>
            </div>
        </div>


        <div class="summary-card">
            <div class="summary-icon orange">
                <div class="icon-slot">
                    <!-- PUT YOUR SCHEDULED ICON HERE -->
                </div>
            </div>

            <div class="summary-info">
                <span>SCHEDULED</span>
                <strong>18</strong>
                <small>Upcoming messages</small>
            </div>
        </div>


        <div class="summary-card">
            <div class="summary-icon red">
                <div class="icon-slot">
                    <!-- PUT YOUR FAILED ICON HERE -->
                </div>
            </div>

            <div class="summary-info">
                <span>FAILED</span>
                <strong>58</strong>
                <small>4.6% failed</small>
            </div>
        </div>


        <div class="summary-card">
            <div class="summary-icon blue">
                <div class="icon-slot">
                    <!-- PUT YOUR RECIPIENT ICON HERE -->
                </div>
            </div>

            <div class="summary-info">
                <span>TOTAL RECIPIENTS</span>
                <strong>3,482</strong>
                <small>Active contacts</small>
            </div>
        </div>

    </section>


    <!-- TABS -->

    <div class="notification-tabs">

        <button class="notification-tab active" data-tab="send">
            Send SMS
        </button>

        <button class="notification-tab" data-tab="history">
            SMS History
        </button>

        <button class="notification-tab" data-tab="scheduled">
            Scheduled
        </button>

        <button class="notification-tab" data-tab="templates">
            Templates
        </button>

        <button class="notification-tab" data-tab="alerts">
            Auto-Alerts
        </button>

        <button class="notification-tab" data-tab="settings">
            Notification Settings
        </button>

    </div>


    <div class="tab-content active" id="send-tab">

        <div class="sms-layout">


            <!-- SEND SMS -->

            <section class="card send-card">

                <h2>Send New SMS</h2>

                <label class="field-label">
                    Recipient Group / Type
                </label>

                <select id="recipientSelect">
                    <option value="">Select recipient group or type</option>
                    <option>All Patients</option>
                    <option>Pregnant Women</option>
                    <option>Infant & Child</option>
                    <option>TB DOTS Patients</option>
                    <option>Senior Citizens</option>
                    <option>Custom List</option>
                </select>


                <div class="recipient-icons">

                    <button type="button" class="recipient-type active">
                        <div class="small-icon purple-icon">
                            <!-- PUT YOUR ICON HERE -->
                        </div>
                        <span>All Patients</span>
                    </button>

                    <button type="button" class="recipient-type">
                        <div class="small-icon red-icon">
                            <!-- PUT YOUR ICON HERE -->
                        </div>
                        <span>Pregnant</span>
                    </button>

                    <button type="button" class="recipient-type">
                        <div class="small-icon blue-icon">
                            <!-- PUT YOUR ICON HERE -->
                        </div>
                        <span>Infant/Child</span>
                    </button>

                    <button type="button" class="recipient-type">
                        <div class="small-icon gray-icon">
                            <!-- PUT YOUR ICON HERE -->
                        </div>
                        <span>Custom List</span>
                    </button>

                </div>


                <label class="field-label message-label">
                    Message
                </label>

                <textarea
                    id="smsMessage"
                    maxlength="160"
                    placeholder="Type your message here..."
                ></textarea>

                <div class="character-counter">
                    <span id="charCount">0</span>/160 Characters
                </div>


                <div class="message-buttons">

                    <button type="button" class="template-button">
                        Insert Template
                    </button>

                    <button type="button" class="template-button">
                        Characters: <span id="remainingChars">160</span>
                    </button>

                </div>


                <label class="field-label">
                    Insert Template
                </label>

                <select>
                    <option>Select template or category</option>
                    <option>Appointment Reminder</option>
                    <option>Medicine Availability</option>
                    <option>Health Advisory</option>
                    <option>Health Program Announcement</option>
                </select>


                <div class="send-options">

                    <label>
                        <input type="radio" name="sendOption" checked>
                        Send Now
                    </label>

                    <label>
                        <input type="radio" name="sendOption">
                        Schedule for Later
                    </label>

                </div>


                <div class="schedule-input">

                    <input type="date" value="2026-05-10">

                    <input type="time" value="13:30">

                    <button type="button">📅</button>

                </div>


                <div class="form-actions">

                    <button type="button" class="send-button" id="sendSmsButton">
                        <span>➤</span>
                        Send SMS Now
                    </button>

                    <button type="button" class="clear-button" id="clearButton">
                        Clear
                    </button>

                </div>

            </section>


            <!-- RECENT NOTIFICATIONS -->

            <section class="card recent-card">

                <div class="card-heading">
                    <h2>Recent Notifications</h2>
                    <a href="#">View All</a>
                </div>


                <div class="notification-list">

                    <?php foreach ($notifications as $notification): ?>

                    <div class="notification-item">

                        <div class="notification-icon">

                            <?php if ($notification["icon"] !== ""): ?>

                                <img
                                    src="<?php echo htmlspecialchars($notification["icon"]); ?>"
                                    alt=""
                                >

                            <?php endif; ?>

                        </div>


                        <div class="notification-information">

                            <strong>
                                <?php echo htmlspecialchars($notification["title"]); ?>
                            </strong>

                            <p>
                                <?php echo htmlspecialchars($notification["message"]); ?>
                            </p>

                        </div>


                        <div class="notification-date">

                            <strong>
                                <?php echo htmlspecialchars($notification["date"]); ?>
                            </strong>

                            <span>
                                <?php echo htmlspecialchars($notification["time"]); ?>
                            </span>

                        </div>


                        <div class="notification-status">

                            <span class="status-delivered">
                                <?php echo htmlspecialchars($notification["status"]); ?>
                            </span>

                            <small>
                                <?php echo htmlspecialchars($notification["type"]); ?>
                            </small>

                        </div>

                    </div>

                    <?php endforeach; ?>

                </div>


                <button class="load-more">
                    Load More ↓
                </button>

            </section>


            <!-- RIGHT SIDE -->

            <aside class="right-column">


                <!-- DELIVERY OVERVIEW -->

                <section class="card side-card delivery-card">

                    <div class="card-heading">
                        <h2>Delivery Overview (This Month)</h2>
                        <a href="#">View Report</a>
                    </div>


                    <div class="delivery-chart">

                        <div class="donut">
                            <div class="donut-center">
                                <strong>95.4%</strong>
                                <span>Delivered</span>
                            </div>
                        </div>

                    </div>


                    <div class="delivery-legend">

                        <div>
                            <span class="legend-dot delivered-dot"></span>
                            <span>Delivered</span>
                            <strong>1,198 (95.4%)</strong>
                        </div>

                        <div>
                            <span class="legend-dot failed-dot"></span>
                            <span>Failed</span>
                            <strong>58 (4.6%)</strong>
                        </div>

                    </div>


                    <div class="delivery-footer">
                        <span>Average Response Rate</span>
                        <strong>12.3%</strong>
                        <a href="#">View Details →</a>
                    </div>

                </section>


                <!-- RECIPIENT GROUPS -->

                <section class="card side-card">

                    <div class="card-heading">
                        <h2>Recipients Groups</h2>
                        <a href="#">Manage Groups</a>
                    </div>


                    <div class="recipient-group-list">

                        <?php foreach ($recipientGroups as $group): ?>

                        <div class="recipient-group">

                            <div class="group-icon">
                                <!-- PUT YOUR ICON HERE -->
                            </div>

                            <div class="group-information">
                                <strong>
                                    <?php echo htmlspecialchars($group["name"]); ?>
                                </strong>

                                <span>
                                    <?php echo htmlspecialchars($group["count"]); ?> users
                                </span>
                            </div>

                            <span class="group-arrow">›</span>

                        </div>

                        <?php endforeach; ?>

                    </div>

                </section>


                <!-- CHANNELS -->

                <section class="card side-card">

                    <div class="card-heading">
                        <h2>Notification Channels</h2>
                        <a href="#">Manage</a>
                    </div>


                    <div class="channel-list">

                        <div class="channel-item">

                            <div class="channel-icon">
                                <!-- PUT YOUR SMS ICON HERE -->
                            </div>

                            <div>
                                <strong>SMS</strong>
                                <span class="active-label">Active</span>
                                <p>Primary channel for notifications</p>
                            </div>

                        </div>


                        <div class="channel-item">

                            <div class="channel-icon">
                                <!-- PUT YOUR FACEBOOK ICON HERE -->
                            </div>

                            <div>
                                <strong>Facebook</strong>
                                <span class="active-label">Active</span>
                                <p>For announcements and updates</p>
                            </div>

                        </div>


                        <div class="channel-item">

                            <div class="channel-icon">
                                <!-- PUT YOUR EMAIL ICON HERE -->
                            </div>

                            <div>
                                <strong>Email</strong>
                                <span class="inactive-label">Inactive</span>
                                <p>For detailed reports and alerts</p>
                            </div>

                        </div>

                    </div>

                </section>

            </aside>

        </div>

    </div>


    <!-- OTHER TABS -->

    <div class="tab-content" id="history-tab">

        <section class="card placeholder-card">
            <h2>SMS History</h2>
            <p>Previously sent SMS messages will appear here.</p>
        </section>

    </div>


    <div class="tab-content" id="scheduled-tab">

        <section class="card placeholder-card">
            <h2>Scheduled Messages</h2>
            <p>Scheduled SMS notifications will appear here.</p>
        </section>

    </div>


    <div class="tab-content" id="templates-tab">

        <section class="card placeholder-card">
            <h2>SMS Templates</h2>
            <p>Create and manage reusable notification templates.</p>
        </section>

    </div>


    <div class="tab-content" id="alerts-tab">

        <section class="card placeholder-card">
            <h2>Auto-Alerts</h2>
            <p>Manage automatic appointment, medicine, and health alerts.</p>
        </section>

    </div>


    <div class="tab-content" id="settings-tab">

        <section class="card placeholder-card">
            <h2>Notification Settings</h2>
            <p>Configure SMS and notification preferences.</p>
        </section>

    </div>


    <div class="disclaimer">
        <span>ⓘ</span>
        <p>
            Ensure that the mobile number is correct and consent is available before sending SMS notifications.
        </p>
    </div>

</main>


<script>

document.addEventListener("DOMContentLoaded", function () {

    const tabs = document.querySelectorAll(".notification-tab");
    const tabContents = document.querySelectorAll(".tab-content");

    tabs.forEach(function (tab) {

        tab.addEventListener("click", function () {

            tabs.forEach(function (item) {
                item.classList.remove("active");
            });

            tabContents.forEach(function (content) {
                content.classList.remove("active");
            });

            tab.classList.add("active");

            const target = tab.getAttribute("data-tab");

            const targetContent = document.getElementById(target + "-tab");

            if (targetContent) {
                targetContent.classList.add("active");
            }

        });

    });


    const smsMessage = document.getElementById("smsMessage");
    const charCount = document.getElementById("charCount");
    const remainingChars = document.getElementById("remainingChars");

    smsMessage.addEventListener("input", function () {

        const length = smsMessage.value.length;

        charCount.textContent = length;
        remainingChars.textContent = 160 - length;

    });


    const clearButton = document.getElementById("clearButton");

    clearButton.addEventListener("click", function () {

        smsMessage.value = "";

        charCount.textContent = "0";
        remainingChars.textContent = "160";

        document.getElementById("recipientSelect").value = "";

    });


    const recipientButtons = document.querySelectorAll(".recipient-type");

    recipientButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            recipientButtons.forEach(function (item) {
                item.classList.remove("active");
            });

            button.classList.add("active");

            const text = button.querySelector("span").textContent;

            const select = document.getElementById("recipientSelect");

            for (let i = 0; i < select.options.length; i++) {

                if (select.options[i].text === text) {
                    select.selectedIndex = i;
                    break;
                }

            }

        });

    });


    const sendButton = document.getElementById("sendSmsButton");

    sendButton.addEventListener("click", function () {

        const recipient = document.getElementById("recipientSelect").value;
        const message = smsMessage.value.trim();

        if (recipient === "") {
            alert("Please select a recipient group.");
            return;
        }

        if (message === "") {
            alert("Please enter your message.");
            return;
        }

        alert("SMS is ready to be sent.");

    });

});

</script>

</body>
</html>