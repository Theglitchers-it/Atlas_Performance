// Flip Login/Register Animation
document.addEventListener('DOMContentLoaded', function() {
    const registerButton = document.getElementById('flip-register-btn');
    const loginButton = document.getElementById('flip-login-btn');
    const mobileRegisterButton = document.getElementById('mobile-register-btn');
    const mobileLoginButton = document.getElementById('mobile-login-btn');
    const container = document.getElementById('flip-container');

    if (container) {
        // Desktop flip buttons
        if (registerButton) {
            registerButton.onclick = function(e) {
                e.preventDefault();
                container.className = 'flip-active';
            };
        }

        if (loginButton) {
            loginButton.onclick = function(e) {
                e.preventDefault();
                container.className = 'flip-close';
            };
        }

        // Mobile toggle buttons
        if (mobileRegisterButton) {
            mobileRegisterButton.onclick = function(e) {
                e.preventDefault();
                container.className = 'flip-active';
            };
        }

        if (mobileLoginButton) {
            mobileLoginButton.onclick = function(e) {
                e.preventDefault();
                container.className = 'flip-close';
            };
        }
    }
});
