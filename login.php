<?php
session_start();

$error = "";

$usersFile = "users.json";

$users = [];

if (file_exists($usersFile)) {
    $users = json_decode(file_get_contents($usersFile), true);

    if (!is_array($users)) {
        $users = [];
    }
}

$loggedInUser = null;
$message = "";
$messageType = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $email = $_POST["email"] ?? "";
    $password = $_POST["password"] ?? "";

    if ($loggedInUser === null) {

        foreach ($users as $user) {

            if (
                strtolower($user["email"]) === strtolower($email) &&
                password_verify($password, $user["password"])
            ) {

                $loggedInUser = $user;
                break;
            }
        }
    }


    if ($loggedInUser !== null) {

        $_SESSION["user"] = [
            "email" => $loggedInUser["email"],
            "first_name" => $loggedInUser["first_name"],
            "last_name" => $loggedInUser["last_name"],
            "role" => $loggedInUser["role"]
        ];

        header("Location: home.php");
        exit;

    } else {

        $error = "Invalid email or password.";
        $message = $error;
        $messageType = "error";
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

    <link rel="stylesheet" href="login.css">

</head>

<body>

    <div class="login-box">

        <div class="login-topbar">

            <div class="brand">

                <img
                    src="logo.png"
                    alt="Smart Assistant Logo"
                    class="brand-logo"
                >

                <h4>Join Smart Assistant</h4>

            </div>

        </div>

        <div class="login-body">

            <p class="terms">

                By clicking <strong>'Login'</strong>, you are agreeing
                to our <strong>terms of service</strong> and acknowledging
                that you have read our <strong>privacy policy</strong>.

            </p>

            <form method="POST" action="login.php">

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
                        value="<?php echo htmlspecialchars($_POST["email"] ?? ""); ?>"
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

                <button
                    type="submit"
                    class="login-btn"
                >
                    <p>Login</p>
                </button>

            </form>


            <div
                class="message <?php echo $messageType; ?>"
                <?php if ($message === "") echo 'style="display:none;"'; ?>
            >
                <?php echo htmlspecialchars($message); ?>
            </div>

            <div class="links">

                <a
                    href="#"
                    class="forgot-link"
                >
                    Forgot Password?
                </a>

                <p class="signup-text">

                    Don't have an account?

                    <a href="signup.php">
                        Sign up here
                    </a>

                </p>

            </div>

        </div>

    </div>

</body>

</html>