<?php
// api/setup.php - Automatic Database & Default Admin Initializer

header('Content-Type: application/json; charset=utf-8');

try {
    // 1. Connect without database first
    $conn = new mysqli("localhost", "root", "");
    if ($conn->connect_error) {
        throw new Exception("MySQL connection failed: " . $conn->connect_error . ". Please make sure MySQL is running in XAMPP.");
    }

    $conn->set_charset("utf8mb4");

    // 2. Create Database
    $conn->query("CREATE DATABASE IF NOT EXISTS talimundoc_smart_assistant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $conn->select_db("talimundoc_smart_assistant");

    // 3. Admin Table & Default User
    $conn->query("
        CREATE TABLE IF NOT EXISTS admin (
            admin_id INT AUTO_INCREMENT PRIMARY KEY,
            full_name VARCHAR(150) NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'Admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $checkAdmin = $conn->query("SELECT admin_id FROM admin WHERE username = 'admin' LIMIT 1");
    if ($checkAdmin && $checkAdmin->num_rows === 0) {
        $hash = password_hash('admin123', PASSWORD_DEFAULT);
        $conn->query("
            INSERT INTO admin (full_name, username, password, role)
            VALUES ('Admin Cyron', 'admin', '$hash', 'Administrator')
        ");
    }

    // 4. User Profile Table & Sample Patient
    $conn->query("
        CREATE TABLE IF NOT EXISTS user_profile (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            middle_name VARCHAR(100) NULL,
            last_name VARCHAR(100) NOT NULL,
            suffix VARCHAR(20) NULL,
            sex VARCHAR(20) NULL,
            birth_date DATE NULL,
            civil_status VARCHAR(50) NULL,
            nationality VARCHAR(50) NULL,
            religion VARCHAR(50) NULL,
            occupation VARCHAR(100) NULL,
            address VARCHAR(255) NULL,
            contact_number VARCHAR(50) NULL,
            telephone VARCHAR(50) NULL,
            email VARCHAR(150) NULL,
            password VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'Active',
            date_registered TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $checkUser = $conn->query("SELECT user_id FROM user_profile LIMIT 1");
    if ($checkUser && $checkUser->num_rows === 0) {
        $userHash = password_hash('patient123', PASSWORD_DEFAULT);
        $conn->query("
            INSERT INTO user_profile (first_name, middle_name, last_name, sex, birth_date, address, contact_number, email, password, status)
            VALUES
            ('Juan', 'D.', 'Dela Cruz', 'Male', '1990-05-12', 'Labin Street, Talimundoc, Orani, Bataan', '0917 123 4567', 'juan@example.com', '$userHash', 'Active'),
            ('Maria', 'Clara', 'Santos', 'Female', '1998-08-20', 'Centro Street, Talimundoc, Orani, Bataan', '0918 234 5678', 'maria@example.com', '$userHash', 'Active')
        ");
    }

    // 5. Health Profile Table
    $conn->query("
        CREATE TABLE IF NOT EXISTS health_profile (
            profile_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            blood_type VARCHAR(10) NULL,
            height VARCHAR(30) NULL,
            weight VARCHAR(30) NULL,
            allergies TEXT NULL,
            medical_conditions TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX(user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // 6. Announcements Table
    $conn->query("
        CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            date_posted DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $checkAnn = $conn->query("SELECT announcement_id FROM announcements LIMIT 1");
    if ($checkAnn && $checkAnn->num_rows === 0) {
        $conn->query("
            INSERT INTO announcements (title, message, date_posted)
            VALUES
            ('Free Flu Vaccination Day', 'Free flu vaccination services will be held on May 15, 2026 at the Talimundoc Health Center from 8:00 AM to 4:00 PM.', CURDATE()),
            ('Heat Index Advisory', 'High heat index expected this week. Stay hydrated, drink water, and avoid prolonged outdoor exposure between 10 AM and 3 PM.', CURDATE())
        ");
    }

    // 7. Appointments Table
    $conn->query("
        CREATE TABLE IF NOT EXISTS appointment (
            appointment_id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NULL,
            patient_name VARCHAR(150) NULL,
            service VARCHAR(100) NULL,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            purpose VARCHAR(255) NULL,
            status VARCHAR(50) DEFAULT 'Scheduled',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    $checkAppt = $conn->query("SELECT appointment_id FROM appointment WHERE appointment_date = CURDATE() LIMIT 1");
    if ($checkAppt && $checkAppt->num_rows === 0) {
        $conn->query("
            INSERT INTO appointment (user_id, patient_name, service, appointment_date, appointment_time, purpose, status)
            VALUES
            (1, 'Juan D. Dela Cruz', 'General Consultation', CURDATE(), '09:00:00', 'Routine check-up', 'Scheduled'),
            (2, 'Maria Clara Santos', 'Prenatal Check Up', CURDATE(), '10:30:00', 'ANC 4th visit', 'Scheduled')
        ");
    }

    echo json_encode([
        "success" => true,
        "message" => "Database talimundoc_smart_assistant initialized successfully!",
        "credentials" => [
            "admin_username" => "admin",
            "admin_password" => "admin123"
        ],
        "tables_created" => [
            "admin",
            "user_profile",
            "health_profile",
            "announcements",
            "appointment"
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
