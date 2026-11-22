<?php
declare(strict_types=1);
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
session_start(['cookie_httponly'=>true,'cookie_samesite'=>'Lax','cookie_secure'=>!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off','use_strict_mode'=>true]);
$_SESSION['token'] ??= bin2hex(random_bytes(32));
$eventTitle = 'Sound of the Altar';
$eventEdition = 'The 120 Edition';
$link = getenv('WHATSAPP_INVITE') ?: '';
$whatsappLink = preg_match('~^https://chat\.whatsapp\.com/[a-zA-Z0-9_-]+$~D', $link) ? $link : '';
$remaining = null;
$success = !empty($_SESSION['reserved']);
unset($_SESSION['reserved']);
$error = '';
function field(string $key): string { return isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : ''; }
try {
    $pdo = new PDO(getenv('DB_DSN') ?: '', getenv('DB_USER') ?: '', getenv('DB_PASSWORD') ?: '', [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
    $posting = $_SERVER['REQUEST_METHOD'] === 'POST';
    if ($posting) $pdo->beginTransaction();
    // Serialize signups for this event before reading the number already registered.
    $capacity = $pdo->query('SELECT capacity FROM vocalist_events WHERE id=1' . ($posting ? ' FOR UPDATE' : ''))->fetchColumn();
    if ($capacity === false) throw new RuntimeException('Missing event');
    $maxSlots = (int)$capacity;
    $remaining = max(0, $maxSlots - (int)$pdo->query('SELECT COUNT(*) FROM vocalist_registrations WHERE event_id=1')->fetchColumn());
    if ($posting && $remaining > 0) {
        $name = field('full_name'); $phone = preg_replace('/[\s().-]+/', '', field('whatsapp_number')); $part = field('vocal_part'); $church = field('church_ministry');
        if (preg_match('/^0([17][0-9]{8})$/D', $phone, $m)) $phone = '+254' . $m[1];
        if (!hash_equals($_SESSION['token'], field('token'))) $error = 'Your form expired. Please try again.';
        elseif (!$name || strlen($name)>160 || strlen($church)>200 || !in_array($part,['Soprano','Alto','Tenor','Bass','Unsure'], true) || field('committed') !== 'on') $error = 'Check your details and confirm your rehearsal commitment.';
        elseif (!preg_match('/^\+[1-9][0-9]{7,14}$/D', $phone)) $error = 'Use an international number with + and country code, or a Kenyan mobile number.';
        else {
            $pdo->prepare('INSERT INTO vocalist_registrations(event_id,full_name,whatsapp_number,vocal_part,church_ministry,committed) VALUES(1,?,?,?,?,1)')->execute([$name,$phone,$part,$church]);
            $pdo->commit();
            $_SESSION['reserved'] = true;
            $_SESSION['token'] = bin2hex(random_bytes(32));
            header('Location: ./',true,303); exit;
        }
    }
    if ($posting) $pdo->rollBack();
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) $error = 'This number has already been registered.';
    else { $remaining = null; http_response_code(503); }
}
