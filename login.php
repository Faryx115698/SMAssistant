<?php

session_start();

require_once "db.php";

if (isset($_SESSION["user"])) {
    $role = strtolower(trim($_SESSION["user"]["role"] ?? ""));

    if (in_array($role, ["admin", "administrator"], true)) {
        header("Location: dashboard.php");
        exit;
    }

    if ($role === "patient") {
        header("Location: patient-home.php");
        exit;
    }
}

$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $emailOrUsername = trim($_POST["email"] ?? "");
    $password = $_POST["password"] ?? "";

    if ($emailOrUsername === "" || $password === "") {

        $message = "Please enter your username/email and password.";

    } else {

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

                    header("Location: dashboard.php");
                    exit;

                } else {

                    $message = "Invalid username or password.";
                }

            } else {

                $userStmt = $conn->prepare("
                    SELECT
                        user_id,
                        first_name,
                        last_name,
                        email,
                        password
                    FROM user_profile
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

                            header("Location: patient-home.php");
                            exit;

                        } else {

                            $message = "Invalid email or password.";
                        }

                    } else {

                        $message = "Invalid username/email or password.";
                    }

                    $userStmt->close();

                } else {

                    $message = "Unable to process the login request.";
                }
            }

            $adminStmt->close();

        } else {

            $message = "Unable to process the login request.";
        }
    }
}

$conn->close();

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Smart Assistant</title>
    <link rel="stylesheet" href="login.css">
    <script src="darkmode.js"></script>
</head>

<body>

    <header class="navbar">

        <a href="home.php" class="brand">
            <img src="logo.png" alt="Barangay Talimundoc Logo">
            <span>SMART ASSISTANT</span>
        </a>

        <nav>
            <a href="home.php">Home</a>
            <a href="home.php#about">About</a>
            <a href="home.php#services">Services</a>
            <a href="login.php" class="active">Login</a>
            <a href="signup.php" class="register-btn">Register</a>
        </nav>

    </header>

    <main class="login-page">

        <div class="decor decor-top"></div>
        <div class="decor decor-bottom"></div>

        <section class="intro">

            <div class="intro-small">
                BARANGAY TALIMUNDOC HEALTH CENTER
            </div>

            <h1>
                <span>Join</span> SMART<br>ASSISTANT
            </h1>

        </section>

        <section class="login-container">

            <div class="login-card">

                <p class="terms">
                    By clicking ‘Log in’, you are agree to our
                    <a href="#">terms of service</a> and acknowledge you have
                    read our <a href="#">privacy policy</a>
                </p>

                <div class="line"></div>

                <form method="POST" action="login.php" id="loginForm">

                    <div class="input-group">
                        <input
                            type="text"
                            name="email"
                            id="email"
                            placeholder="Username or Email"
                            autocomplete="username"
                            required
                        >
                    </div>

                    <div class="input-group">
                        <input
                            type="password"
                            name="password"
                            id="password"
                            placeholder="Password"
                            autocomplete="current-password"
                            required
                        >
                    </div>

                    <?php if ($message !== ""): ?>

                        <div class="message error">
                            <?php echo htmlspecialchars($message); ?>
                        </div>

                    <?php endif; ?>

                    <button type="submit" class="login-button">
                        Login
                    </button>

                </form>

                <p class="signup-text">
                    Don’t have an account?
                    <a href="signup.php">Sign up here</a>
                </p>

            </div>

        </section>

    </main>

    <script src="login.js"></script>

</body>

</html>