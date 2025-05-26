// form-handler.js - Versión final sin errores

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Cargando form-handler.js v2.0');
    
    const form = document.querySelector('.php-email-form');
    
    if (!form) {
        console.log('ℹ️ No se encontró formulario de contacto en esta página');
        return;
    }
    
    console.log('✅ Formulario de contacto encontrado');
    
    const loadingElement = form.querySelector('.loading');
    const errorElement = form.querySelector('.error-message');
    const successElement = form.querySelector('.sent-message');
    
    // Verificar que existen todos los elementos
    if (!loadingElement || !errorElement || !successElement) {
        console.error('❌ Faltan elementos del formulario (loading, error-message, sent-message)');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📤 Enviando formulario...');
        
        // Limpiar estados previos
        hideAllMessages();
        showLoading();
        
        try {
            const formData = new FormData(form);
            
            // Enviar datos
            const response = await fetch('forms/contact.php', {
                method: 'POST',
                body: formData
            });
            
            const responseText = await response.text();
            console.log('📥 Respuesta recibida:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Error al parsear JSON:', parseError);
                throw new Error('Respuesta del servidor inválida');
            }
            
            console.log('📊 Datos parseados:', result);
            
            hideLoading();
            
            // CLAVE: Verificar explícitamente el campo success
            if (result && result.success === true) {
                console.log('✅ Éxito confirmado');
                
                // Mensaje de éxito personalizado según el modo
                let message = result.message || 'Mensaje enviado correctamente';
                
                if (isLocalhost() && result.debug && result.debug.mode === 'development') {
                    message = 'Mensaje enviado correctamente (modo desarrollo). En producción se enviará por email.';
                }
                
                showSuccess(message);
                form.reset();
                
            } else {
                console.log('❌ Error del servidor');
                const errorMsg = (result && result.error) ? result.error : 'Error desconocido';
                showError(errorMsg);
            }
            
        } catch (error) {
            console.error('❌ Error en el envío:', error);
            hideLoading();
            showError('Error de conexión. Inténtalo de nuevo.');
        }
    });
    
    // Funciones auxiliares
    function hideAllMessages() {
        loadingElement.style.display = 'none';
        errorElement.style.display = 'none';
        successElement.style.display = 'none';
        errorElement.textContent = '';
        successElement.textContent = '';
    }
    
    function showLoading() {
        loadingElement.style.display = 'block';
    }
    
    function hideLoading() {
        loadingElement.style.display = 'none';
    }
    
    function showSuccess(message) {
        successElement.textContent = message;
        successElement.style.display = 'block';
        
        // Scroll suave hacia el mensaje
        setTimeout(() => {
            successElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }, 100);
    }
    
    function showError(message) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    function isLocalhost() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('localhost');
    }
    
    // Validación de email en tiempo real
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && !isValidEmail(email)) {
                this.style.borderColor = '#dc3545';
                showFieldError(this, 'Email inválido');
            } else {
                this.style.borderColor = '';
                hideFieldError(this);
            }
        });
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function showFieldError(field, message) {
        hideFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.style.color = '#dc3545';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }
    
    function hideFieldError(field) {
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }
    
    console.log('✅ Form handler inicializado correctamente');
});