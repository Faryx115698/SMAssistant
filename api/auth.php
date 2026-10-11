<?php
// api/auth.php - Authentication API (Session check, Login, Signup, Logout)

session_start();
require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. Session Check (GET ?action=me)
if ($action === 'me' || ($method === 'GET' && empty($action))) {
    if (!isset($_SESSION['user'])) {
        jsonResponse([
            'authenticated' => false,
            'user' => null
        ]);
    }

    $u = $_SESSION['user'];
    $role = $u['role'] ?? 'User';
    $name = $u['full_name'] ?? trim(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? ''));
    if (empty($name)) {
        $name = $u['username'] ?? 'User';
    }

    jsonResponse([
        'authenticated' => true,
        'user' => [
            'id' => $u['admin_id'] ?? $u['user_id'] ?? 0,
            'name' => $name,
            'username' => $u['username'] ?? $u['email'] ?? '',
            'role' => $role
        ]
    ]);
}

// 2. Logout (POST/GET ?action=logout)
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }
    session_destroy();
    jsonSuccess([], 'Logged out successfully.');
}

// 3. Login (POST ?action=login or default POST)
if ($action === 'login' || ($method === 'POST' && $action !== 'signup')) {
    // Read input from either standard POST or raw JSON body
    $rawInput = json_decode(file_get_contents('php://input'), true);
    $emailOrUsername = trim($_POST['email'] ?? $rawInput['email'] ?? $rawInput['username'] ?? '');
    $password = $_POST['password'] ?? $rawInput['password'] ?? '';

    if ($emailOrUsername === '' || $password === '') {
        jsonError('Please enter your username/email and password.');
    }

    // Check admin table
    $adminStmt = $conn->prepare("
        SELECT admin_id, full_name, username, password, role
        FROM admin
        WHERE username = ?
        LIMIT 1
    ");

    if ($adminStmt) {
        $adminStmt->bind_param("s", $emailOrUsername);
        $adminStmt->execute();
        $adminResult = $adminStmt->get_result();

        if ($adminResult->num_rows === 1) {
            $admin = $adminResult->fetch_assoc();
            if (password_verify($password, $admin["password"])) {
                session_regenerate_id(true);
                $_SESSION["user"] = [
                    "admin_id" => $admin["admin_id"],
                    "full_name" => $admin["full_name"],
                    "username" => $admin["username"],
                    "role" => $admin["role"]
                ];

                jsonResponse([
                    'success' => true,
                    'message' => 'Login successful.',
                    'redirect' => 'dashboard.html',
                    'user' => [
                        'id' => $admin['admin_id'],
                        'name' => $admin['full_name'],
                        'role' => $admin['role']
                    ]
                ]);
            } else {
                jsonError('Invalid password.');
            }
        }
        $adminStmt->close();
    }

    // Check users table
    $userStmt = $conn->prepare("
        SELECT user_id, first_name, last_name, email, password
        FROM users
        WHERE email = ?
        LIMIT 1
    ");

    if ($userStmt) {
        $userStmt->bind_param("s", $emailOrUsername);
        $userStmt->execute();
        $userResult = $userStmt->get_result();

        if ($userResult->num_rows === 1) {
            $user = $userResult->fetch_assoc();
            if (password_verify($password, $user["password"])) {
                session_regenerate_id(true);
                $_SESSION["user"] = [
                    "user_id" => $user["user_id"],
                    "first_name" => $user["first_name"],
                    "last_name" => $user["last_name"],
                    "email" => $user["email"],
                    "role" => "Patient"
                ];

                jsonResponse([
                    'success' => true,
                    'message' => 'Login successful.',
                    'redirect' => 'patient-home.html',
                    'user' => [
                        'id' => $user['user_id'],
                        'name' => $user['first_name'] . ' ' . $user['last_name'],
                        'role' => 'Patient'
                    ]
                ]);
            } else {
                jsonError('Invalid email or password.');
            }
        }
        $userStmt->close();
    }

    jsonError('Invalid username/email or password.');
}

// 4. Signup (POST ?action=signup)
if ($action === 'signup') {
    $rawInput = json_decode(file_get_contents('php://input'), true);
    $data = !empty($rawInput) ? $rawInput : $_POST;

    $fullname = trim($data["fullname"] ?? "");
    $email = trim($data["email"] ?? "");
    $userPassword = $data["password"] ?? "";
    $confirmPassword = $data["confirm_password"] ?? "";
    $sex = trim($data["sex"] ?? "");
    $birthDate = trim($data["birth_date"] ?? "");
    $address = trim($data["address"] ?? "");
    $contactNumber = trim($data["contact_number"] ?? "");

    if ($fullname === "" || $email === "" || $userPassword === "" || $confirmPassword === "") {
        jsonError("Please complete all fields.");
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonError("Please enter a valid email address.");
    }
    if ($userPassword !== $confirmPassword) {
        jsonError("Passwords do not match.");
    }

    $check = $conn->prepare("SELECT user_id FROM user_profile WHERE email = ?");
    $check->bind_param("s", $email);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        $check->close();
        jsonError("An account with this email already exists.");
    }
    $check->close();

    $nameParts = preg_split('/\s+/', $fullname);
    if (count($nameParts) === 1) {
        $firstName = $nameParts[0];
        $lastName = $nameParts[0];
    } else {
        $lastName = array_pop($nameParts);
        $firstName = implode(" ", $nameParts);
    }

    $hashedPassword = password_hash($userPassword, PASSWORD_DEFAULT);
    $sexVal = $sex !== "" ? $sex : null;
    $birthVal = $birthDate !== "" ? $birthDate : null;
    $addressVal = $address !== "" ? $address : null;
    $contactVal = $contactNumber !== "" ? $contactNumber : null;

    $insert = $conn->prepare("
        INSERT INTO user_profile (first_name, last_name, sex, birth_date, address, contact_number, email, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $insert->bind_param(
        "ssssssss",
        $firstName,
        $lastName,
        $sexVal,
        $birthVal,
        $addressVal,
        $contactVal,
        $email,
        $hashedPassword
    );

    if ($insert->execute()) {
        $insert->close();
        jsonResponse([
            'success' => true,
            'message' => 'Account created successfully. Redirecting to login...',
            'redirect' => 'login.html'
        ]);
    } else {
        $insert->close();
        jsonError("Unable to create account.");
    }
}

jsonError('Invalid action requested.');
