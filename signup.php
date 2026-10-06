<?php
session_start();

$host = "localhost";
$username = "root";
$password = "";
$database = "talimundoc_smart_assistant";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    die("Database connection failed.");
}

$message = "";
$messageClass = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $fullname = trim($_POST["fullname"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $userPassword = $_POST["password"] ?? "";
    $confirmPassword = $_POST["confirm_password"] ?? "";
    $sex = trim($_POST["sex"] ?? "");
    $birthDate = trim($_POST["birth_date"] ?? "");
    $address = trim($_POST["address"] ?? "");
    $contactNumber = trim($_POST["contact_number"] ?? "");

    if ($fullname === "" || $email === "" || $userPassword === "" || $confirmPassword === "") {
        $message = "Please complete all fields.";
        $messageClass = "error";
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $message = "Please enter a valid email address.";
        $messageClass = "error";
    } elseif ($userPassword !== $confirmPassword) {
        $message = "Passwords do not match.";
        $messageClass = "error";
    } else {
        $check = $conn->prepare("SELECT user_id FROM user_profile WHERE email = ?");
        $check->bind_param("s", $email);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            $message = "An account with this email already exists.";
            $messageClass = "error";
        } else {
            $nameParts = preg_split('/\s+/', $fullname);

            if (count($nameParts) === 1) {
                $firstName = $nameParts[0];
                $lastName = $nameParts[0];
            } else {
                $lastName = array_pop($nameParts);
                $firstName = implode(" ", $nameParts);
            }

            $hashedPassword = password_hash($userPassword, PASSWORD_DEFAULT);

            $sexValue = $sex !== "" ? $sex : null;
            $birthDateValue = $birthDate !== "" ? $birthDate : null;
            $addressValue = $address !== "" ? $address : null;
            $contactNumberValue = $contactNumber !== "" ? $contactNumber : null;

            $insert = $conn->prepare(
                "INSERT INTO user_profile (first_name, last_name, sex, birth_date, address, contact_number, email, password) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );

            $insert->bind_param(
                "ssssssss",
                $firstName,
                $lastName,
                $sexValue,
                $birthDateValue,
                $addressValue,
                $contactNumberValue,
                $email,
                $hashedPassword
            );

            if ($insert->execute()) {
                $message = "Account created successfully.";
                $messageClass = "success";

                header("refresh:1.5;url=login.php");
            } else {
                $message = "Unable to create account.";
                $messageClass = "error";
            }

            $insert->close();
        }

        $check->close();
    }
}

$conn->close();

?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Join Smart Assistant</title>
    <link rel="stylesheet" href="signup.css">
    <script src="darkmode.js"></script>
</head>

<body>

    <header class="navbar">
        <div class="navbar-brand">
            <img src="logo.png" alt="Smart Assistant Logo">
            <span>SMART ASSISTANT</span>
        </div>

        <nav>
            <a href="home.php ">Home</a>
            <a href="home.php#about">About</a>
            <a href="home.php#services">Services</a>
            <a href="login.php">Login</a>
            <a href="signup.php" class="register-btn">Register</a>
        </nav>
    </header>

    <main class="signup-section">

        <div class="signup-left">
            <div class="signup-title">
                <span>Join</span>
                <h1>SMART ASSISTANT</h1>
                <p>
                    <span>BARANGAY</span>
                    <span>TALIMUNDOC</span>
                    <span>HEALTH</span>
                    <span>CENTER</span>
                </p>
            </div>
        </div>

        <div class="signup-right">
            <div class="signup-box">

                <div class="signup-form">

                    <div class="terms">
                        By clicking 'Sign up', you are agree to our
                        <a href="#">terms of service</a> and acknowledge you have read our
                        <a href="#">privacy policy</a>
                    </div>

                    <button type="button" class="google-btn" onclick="googleSignup()">
                        <svg class="google-icon" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4"
                                d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
                            <path fill="#34A853"
                                d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
                            <path fill="#FBBC05"
                                d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
                            <path fill="#EA4335"
                                d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
                        </svg>
                        <span>Sign up with Google</span>
                    </button>

                    <div class="divider">
                        <span></span>
                        <p>or</p>
                        <span></span>
                    </div>

                    <?php if ($message !== ""): ?>
                        <div class="message <?php echo $messageClass; ?>">
                            <?php echo htmlspecialchars($message); ?>
                        </div>
                    <?php endif; ?>

                    <form method="POST" action="signup.php">

                        <input type="text" name="fullname" placeholder="Fullname" autocomplete="name" required>

                        <select name="sex">
                            <option value="" disabled selected>Sex</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>

                        <input type="date" name="birth_date" placeholder="Birth Date">

                        <input type="text" name="address" placeholder="Address" autocomplete="street-address">

                        <input type="tel" name="contact_number" placeholder="Contact Number" autocomplete="tel">

                        <input type="email" name="email" placeholder="Email" autocomplete="email" required>

                        <input type="password" name="password" placeholder="Password" autocomplete="new-password"
                            required>

                        <input type="password" name="confirm_password" placeholder="Confirm Password"
                            autocomplete="new-password" required>

                        <button type="submit" class="signup-btn">
                            Sign up
                        </button>

                    </form>

                    <div class="login-link">
                        Already have an account?
                        <a href="login.php">Login</a>
                    </div>

                </div>

            </div>
        </div>

    </main>

    <script src="signup.js"></script>

</body>

</html>