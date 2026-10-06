<?php
session_start();

$message = "";
$messageType = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $fullname = trim($_POST["fullname"] ?? "");
    $email = trim($_POST["email"] ?? "");
    $password = $_POST["password"] ?? "";
    $confirmPassword = $_POST["confirm_password"] ?? "";

    if ($fullname === "" || $email === "" || $password === "" || $confirmPassword === "") {

        $message = "Please complete all fields.";
        $messageType = "error";

    }

    elseif ($password !== $confirmPassword) {

        $message = "Passwords do not match.";
        $messageType = "error";

    }

    elseif (strlen($password) < 6) {

        $message = "Password must be at least 6 characters.";
        $messageType = "warning";

    }

    else {

        /*
         * For now, save registered accounts in a JSON file.
         * This is for your local/demo version.
         */

        $usersFile = "users.json";

        if (!file_exists($usersFile)) {
            file_put_contents($usersFile, json_encode([]));
        }

        $users = json_decode(file_get_contents($usersFile), true);

        if (!is_array($users)) {
            $users = [];
        }

        $emailExists = false;

        foreach ($users as $user) {

            if (strtolower($user["email"]) === strtolower($email)) {
                $emailExists = true;
                break;
            }
        }

        if ($emailExists) {

            $message = "An account with this email already exists.";
            $messageType = "error";

        } else {

            // Create new account
            $users[] = [
                "email" => $email,
                "password" => password_hash($password, PASSWORD_DEFAULT),
                "full_name" => $fullname,
                "role" => "Patient"
            ];

            // Save account
            file_put_contents(
                $usersFile,
                json_encode($users, JSON_PRETTY_PRINT)
            );

            $message = "Account created successfully! You can now login.";
            $messageType = "success";
        }
    }
}
?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Join Smart Assistant</title>

    <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
    >

    <link rel="stylesheet" href="signup.css">

</head>

<body>

    <div class="signup-box">

        <div class="signup-topbar">

            <div class="brand">

                <img
                    src="logo.png"
                    alt="Logo"
                    class="brand-logo"
                >

                <h4>Join Smart Assistant</h4>

            </div>

        </div>


        <div class="signup-body">

            <p class="terms">

                By clicking <strong>'Sign up'</strong>, you are agreeing
                to our <strong>terms of service</strong> and acknowledge
                that you have read our <strong>privacy policy</strong>.

            </p>


            <div class="google-signup">

                <button
                    type="button"
                    class="google-btn"
                    onclick="googleSignup()"
                >

                    <span class="google-icon">

                        <svg viewBox="0 0 24 24">

                            <path
                                fill="#4285F4"
                                d="M21.35 12.27c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.95 2.94v2.45h3.16c1.85-1.7 2.9-4.2 2.9-7.22z"
                            />

                            <path
                                fill="#34A853"
                                d="M12 21.75c2.64 0 4.86-.87 6.48-2.36l-3.16-2.45c-.87.58-1.98.92-3.32.92-2.55 0-4.71-1.72-5.49-4.04H3.25v2.53A9.79 9.79 0 0 0 12 21.75z"
                            />

                            <path
                                fill="#FBBC05"
                                d="M6.51 13.82A5.87 5.87 0 0 1 6.2 12c0-.63.11-1.24.31-1.82V7.65H3.25A9.77 9.77 0 0 0 2.2 12c0 1.57.38 3.05 1.05 4.35l3.26-2.53z"
                            />

                            <path
                                fill="#EA4335"
                                d="M12 6.14c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.85 3.25 14.64 2.25 12 2.25a9.79 9.79 0 0 0-8.75 5.4l3.26 2.53C7.29 7.86 9.45 6.14 12 6.14z"
                            />

                        </svg>

                    </span>

                    <span class="google-btn-text">
                        Sign up with Google
                    </span>

                </button>

            </div>


            <div class="or-divider">

                <span></span>

                <p>or</p>

                <span></span>

            </div>


            <form method="POST" action="signup.php">

                <div class="form-group">

                    <label for="fullname">
                        Full Name
                    </label>

                    <input
                        type="text"
                        id="fullname"
                        name="fullname"
                        placeholder="Enter your full name"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="email">
                        Email
                    </label>

                    <input
                        type="email"
                        id="email"
                        name="email"
                        placeholder="you@example.com"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="password">
                        Password
                    </label>

                    <input
                        type="password"
                        id="password"
                        name="password"
                        placeholder="••••••••"
                        required
                    >

                </div>


                <div class="form-group">

                    <label for="confirm-password">
                        Confirm Password
                    </label>

                    <input
                        type="password"
                        id="confirm-password"
                        name="confirm_password"
                        placeholder="••••••••"
                        required
                    >

                </div>


                <button
                    type="submit"
                    class="signup-btn"
                >
                    Sign Up
                </button>

            </form>


            <?php if ($message !== ""): ?>

                <div class="message <?php echo $messageType; ?>">

                    <?php echo htmlspecialchars($message); ?>

                </div>

            <?php endif; ?>


            <div class="links">

                <p class="signup-text">

                    Already have an account?

                    <a href="login.php">
                        Login here
                    </a>

                </p>

            </div>

        </div>

    </div>


    <script
        src="https://accounts.google.com/gsi/client"
        async
        defer
    ></script>

    <script src="signup.js"></script>

</body>

</html>