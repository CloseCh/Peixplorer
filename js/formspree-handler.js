// formspree-handler.js - Manejo del formulario con Formspree

document.addEventListener('DOMContentLoaded', function() {
    console.log('📧 Inicializando Formspree handler...');
    
    const form = document.querySelector('.php-email-form');
    
    if (!form) {
        console.log('ℹ️ No se encontró formulario de contacto');
        return;
    }
    
    const loadingElement = form.querySelector('.loading');
    const errorElement = form.querySelector('.error-message');
    const successElement = form.querySelector('.sent-message');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('📤 Enviando formulario a Formspree...');
        
        // Mostrar loading
        loadingElement.style.display = 'block';
        errorElement.style.display = 'none';
        successElement.style.display = 'none';
        
        try {
            const formData = new FormData(form);
            
            // Enviar a Formspree
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            loadingElement.style.display = 'none';
            
            if (response.ok) {
                console.log('✅ Mensaje enviado exitosamente');
                
                successElement.innerHTML = '¡Mensaje enviado correctamente! Te responderemos pronto.';
                successElement.style.display = 'block';
                
                // Limpiar formulario
                form.reset();
                
                // Scroll al mensaje de éxito
                setTimeout(() => {
                    successElement.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }, 100);
                
            } else {
                // Error de Formspree
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al enviar el mensaje');
            }
            
        } catch (error) {
            console.error('❌ Error:', error);
            loadingElement.style.display = 'none';
            
            let errorMessage = 'Error al enviar el mensaje. ';
            
            if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Verifica tu conexión a internet.';
            } else {
                errorMessage += 'Inténtalo de nuevo más tarde.';
            }
            
            errorElement.innerHTML = errorMessage;
            errorElement.style.display = 'block';
        }
    });
    
    // Validación de email en tiempo real
    const emailInput = form.querySelector('input[name="email"]');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (email && !emailRegex.test(email)) {
                this.style.borderColor = '#dc3545';
            } else {
                this.style.borderColor = '';
            }
        });
    }
    
    console.log('✅ Formspree handler inicializado');
});