<?php

$conn = new mysqli("localhost", "root", "", "talimundoc_smart_assistant");

if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");

?>