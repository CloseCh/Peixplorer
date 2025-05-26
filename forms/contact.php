<?php
// Habilitar reporte de errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Configurar headers para respuestas JSON
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Log de debugging (opcional)
function logDebug($message) {
    error_log(date('[Y-m-d H:i:s] ') . $message . PHP_EOL, 3, 'debug.log');
}

// Verificar que el formulario se envió por POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido', 'method' => $_SERVER["REQUEST_METHOD"]]);
    exit;
}

// Función para sanitizar datos
function sanitizeInput($data) {
    return htmlspecialchars(trim($data), ENT_QUOTES, 'UTF-8');
}

try {
    // Log de datos recibidos para debugging
    logDebug("POST data received: " . json_encode($_POST));
    
    // Verificar que existen los campos requeridos
    $requiredFields = ['name', 'email', 'subject', 'message'];
    $missingFields = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($_POST[$field]) || empty(trim($_POST[$field]))) {
            $missingFields[] = $field;
        }
    }
    
    if (!empty($missingFields)) {
        throw new Exception("Campos requeridos faltantes: " . implode(', ', $missingFields));
    }
    
    // Sanitizar datos
    $name = sanitizeInput($_POST["name"]);
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $subject = sanitizeInput($_POST["subject"]);
    $message = sanitizeInput($_POST["message"]);
    
    // Log de datos sanitizados
    logDebug("Sanitized data - Name: $name, Email: $email, Subject: $subject");
    
    // Validar email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception("Email inválido: $email");
    }
    
    // Validar longitud de campos
    if (strlen($name) > 100) {
        throw new Exception("El nombre es demasiado largo (" . strlen($name) . " caracteres)");
    }
    
    if (strlen($subject) > 200) {
        throw new Exception("El asunto es demasiado largo (" . strlen($subject) . " caracteres)");
    }
    
    if (strlen($message) > 2000) {
        throw new Exception("El mensaje es demasiado largo (" . strlen($message) . " caracteres)");
    }
    
    // Configuración del correo
    $to = "peixplorer.external533@passmail.net";
    $email_subject = "Contacto desde Peixplorer: " . $subject;
    
    // Cuerpo del mensaje en formato HTML
    $email_body = "
    <html>
    <head>
        <title>Nuevo mensaje de contacto - Peixplorer</title>
        <meta charset='UTF-8'>
    </head>
    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
        <div style='max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;'>
            <h2 style='color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;'>
                Nuevo mensaje desde Peixplorer
            </h2>
            
            <div style='margin: 20px 0;'>
                <p><strong>Nombre:</strong> $name</p>
                <p><strong>Email:</strong> $email</p>
                <p><strong>Asunto:</strong> $subject</p>
            </div>
            
            <div style='margin: 20px 0;'>
                <h3 style='color: #2c3e50;'>Mensaje:</h3>
                <div style='background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; border-radius: 3px;'>
                    " . nl2br($message) . "
                </div>
            </div>
            
            <hr style='margin: 20px 0; border: none; border-top: 1px solid #eee;'>
            <p style='font-size: 12px; color: #666; text-align: center;'>
                Este mensaje fue enviado desde el formulario de contacto de Peixplorer
                <br>Fecha: " . date('d/m/Y H:i:s') . "
                <br>IP: " . $_SERVER['REMOTE_ADDR'] . "
            </p>
        </div>
    </body>
    </html>";
    
    // Headers para email HTML
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        "From: Peixplorer <noreply@peixplorer.com>",
        "Reply-To: $name <$email>",
        'X-Mailer: PHP/' . phpversion()
    ];
    
    // Intentar enviar email
    logDebug("Attempting to send email to: $to");
    
    $mailResult = mail($to, $email_subject, $email_body, implode("\r\n", $headers));
    
    if ($mailResult) {
        logDebug("Email sent successfully");
        echo json_encode([
            'success' => true,
            'message' => 'Mensaje enviado correctamente. Te responderemos pronto.',
            'debug' => [
                'name' => $name,
                'email' => $email,
                'subject' => $subject,
                'timestamp' => date('Y-m-d H:i:s')
            ]
        ]);
    } else {
        logDebug("Mail function returned false");
        
        // En desarrollo local, simular envío exitoso
        if (in_array($_SERVER['HTTP_HOST'], ['localhost', '127.0.0.1', 'localhost:8000'])) {
            logDebug("Development mode - simulating successful email");
            echo json_encode([
                'success' => true,
                'message' => 'Mensaje procesado correctamente (modo desarrollo).',
                'debug' => [
                    'mode' => 'development',
                    'name' => $name,
                    'email' => $email,
                    'subject' => $subject,
                    'timestamp' => date('Y-m-d H:i:s'),
                    'note' => 'Email no enviado en modo desarrollo'
                ]
            ]);
        } else {
            throw new Exception("Error del servidor al enviar el email");
        }
    }
    
} catch (Exception $e) {
    logDebug("Error: " . $e->getMessage());
    
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'debug' => [
            'timestamp' => date('Y-m-d H:i:s'),
            'post_data' => $_POST,
            'server_info' => [
                'method' => $_SERVER['REQUEST_METHOD'],
                'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
                'host' => $_SERVER['HTTP_HOST'] ?? 'not set'
            ]
        ]
    ]);
}
?>