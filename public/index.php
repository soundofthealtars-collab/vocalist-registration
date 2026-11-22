<?php
require dirname(__DIR__) . '/registration.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars("$eventTitle | $eventEdition") ?></title>
    <style>
        :root {
            --navy-dark: #040d33;
            --navy-main: #061348;
            --flame-orange: #ff5e00;
            --flame-gold: #ffb800;
            --white: #ffffff;
        }
        * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
        body {
            margin: 0;
            min-height: 100vh;
            background: radial-gradient(circle at top, #0c2175 0%, var(--navy-dark) 100%);
            color: var(--white);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .card {
            width: 100%;
            max-width: 480px;
            background: rgba(6, 19, 72, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 28px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45);
        }
        .logo { width: 100%; max-height: 180px; object-fit: contain; margin-bottom: 12px; border-radius: 8px; }
        .badge {
            display: inline-block;
            background: rgba(255, 94, 0, 0.18);
            border: 1px solid var(--flame-orange);
            color: var(--flame-gold);
            font-weight: 700;
            font-size: 0.8rem;
            padding: 5px 12px;
            border-radius: 999px;
            letter-spacing: 0.5px;
            margin-bottom: 14px;
        }
        h1 { margin: 0 0 6px; font-size: 1.6rem; }
        p.sub { margin: 0 0 22px; color: #cbd5e1; font-size: 0.95rem; line-height: 1.4; }
        label { display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; color: #e2e8f0; }
        input[type="text"], input[type="tel"], select {
            width: 100%;
            padding: 12px 14px;
            margin-bottom: 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(4, 13, 51, 0.8);
            color: var(--white);
            font-size: 1rem;
        }
        input:focus, select:focus { outline: none; border-color: var(--flame-gold); }
        .check-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 20px; font-size: 0.88rem; color: #cbd5e1; }
        .check-row input { margin-top: 3px; accent-color: var(--flame-orange); }
        button {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 999px;
            background: linear-gradient(90deg, var(--flame-gold), var(--flame-orange));
            color: #040d33;
            font-weight: 800;
            font-size: 1rem;
            letter-spacing: 0.5px;
            cursor: pointer;
            transition: transform 0.15s ease;
        }
        button:hover { transform: translateY(-1px); }
        .alert { padding: 14px; border-radius: 8px; margin-bottom: 16px; font-size: 0.92rem; }
        .alert-success { background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; }
        .alert-error { background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; }
    </style>
</head>
<body>
<div class="card">
    <header style="border-bottom:1px solid #52628a;padding-bottom:20px;margin-bottom:20px"><small style="letter-spacing:.18em;color:#ffb800">LIVE RECORDING / THE 120 EDITION</small><p style="font:italic 2.5rem Georgia,serif;margin:8px 0">Sound of the Altar</p></header>
    <?php if ($remaining !== null): ?><div class="badge">LIMITED SLOTS • <?= $remaining ?> OF <?= $maxSlots ?> REMAINING</div><?php endif; ?>
    <h1>Vocalist Registration</h1>
    <p class="sub">Register below to secure your spot for the live recording.</p>

    <?php if ($success): ?>
        <div class="alert alert-success">
            <strong>Spot Reserved!</strong> Welcome to <?= htmlspecialchars($eventTitle) ?>.
            <?php if ($whatsappLink): ?>
                <br><br><a href="<?= htmlspecialchars($whatsappLink) ?>" style="color: #ffb800; font-weight: bold;">Tap here to join the Vocalists WhatsApp Group &rarr;</a>
            <?php endif; ?>
        </div>
    <?php elseif ($remaining === null): ?>
        <p role="alert">Registration is temporarily unavailable. Please try again later.</p>
    <?php elseif ($remaining <= 0): ?>
        <div class="alert alert-error">
            <strong>Registration Closed:</strong> All <?= $maxSlots ?> vocalist slots have been filled.
        </div>
    <?php else: ?>
        <?php if ($error): ?><div class="alert alert-error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <form method="POST">
            <input type="hidden" name="token" value="<?= htmlspecialchars($_SESSION['token']) ?>">
            <label>Full Name *</label>
            <input type="text" name="full_name" placeholder="e.g. Brian Mwangi" required>

            <label>WhatsApp Phone Number *</label>
            <input type="tel" name="whatsapp_number" placeholder="e.g. 0712 345 678" required>

            <label>Vocal Part *</label>
            <select name="vocal_part" required>
                <option value="">-- Select Vocal Part --</option>
                <option value="Soprano">Soprano</option>
                <option value="Alto">Alto</option>
                <option value="Tenor">Tenor</option>
                <option value="Bass">Bass</option>
                <option value="Unsure">Not Sure (Vocal Placement)</option>
            </select>

            <label>Church / Ministry (Optional)</label>
            <input type="text" name="church_ministry" placeholder="Your local church">

            <label class="check-row">
                <input type="checkbox" name="committed" required>
                <span>I confirm I am available for the scheduled rehearsals and the live recording.</span>
            </label>

            <button type="submit">REGISTER NOW</button>
        </form>
    <?php endif; ?>
</div>
</body>
</html>
