// Flip Login/Register Animation - Fixed Version with Mobile Detection
document.addEventListener('DOMContentLoaded', function() {
    const registerButton = document.getElementById('register');
    const loginButton = document.getElementById('login');
    const container = document.getElementById('container');

    // Only enable flip animations on desktop (not mobile)
    function enableFlipAnimations() {
        if (window.innerWidth > 768) {
            // Desktop: enable flip animations
            if (registerButton && container) {
                registerButton.onclick = function() {
                    container.className = 'active';
                };
            }

            if (loginButton && container) {
                loginButton.onclick = function() {
                    container.className = 'close';
                };
            }
        } else {
            // Mobile: disable flip animations and clear any flip classes
            if (registerButton) {
                registerButton.onclick = null;
            }
            if (loginButton) {
                loginButton.onclick = null;
            }
            if (container) {
                container.className = '';
            }
        }
    }

    enableFlipAnimations();

    // Re-check on window resize
    window.addEventListener('resize', function() {
        enableFlipAnimations();
    });
});
