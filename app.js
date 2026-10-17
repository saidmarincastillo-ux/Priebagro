const app = {
    currentUser: null,
    isLoginMode: true,
    viewHistory: [],
    currentRecoveryCode: null,
    currentRecoveryEmail: null,

    init: async function() {
        console.log("Inicializando AgroGestor...");
        
        // Setup initial view
        this.navigate('dashboard');
        
        // Initialize database
        await dbManager.init();

        // Apply official website palette set by administrator
        this.applyPalette();
        
        // Check if user is logged in
        const savedUser = localStorage.getItem('agro_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateAuthUI();
        }

        // Load theme preference
        if (localStorage.getItem('theme') === 'dark') {
            this.toggleTheme(true);
        }

        // Setup service worker for PWA (skip if just running local files without server)
        if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
            navigator.serviceWorker.register('sw.js').then(() => {
                console.log("Service Worker registrado");
            });
        }
    },

    navigate: function(viewId, isBack = false) {
        // Track history for back button
        if (!isBack) {
            const currentActive = document.querySelector('.view.active');
            if (currentActive) {
                const currentId = currentActive.id.replace('view-', '');
                if (currentId !== viewId) {
                    this.viewHistory.push(currentId);
                }
            }
        }
        
        // Manage back button visibility
        const backBtn = document.getElementById('btn-back');
        if (backBtn) {
            backBtn.style.display = (viewId === 'dashboard') ? 'none' : 'flex';
        }
        
        // Hide all views
        document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
        // Show target view
        document.getElementById(`view-${viewId}`).classList.add('active');
        
        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navBtn = document.querySelector(`.nav-item[onclick="app.navigate('${viewId}')"]`);
        if(navBtn) navBtn.classList.add('active');

        // View specific logic
        if(viewId === 'catalogo') catalogo.render();
        if(viewId === 'calculadora-abono') calculadores.loadAbonos();
        if(viewId === 'calculadora-liquido') calculadores.loadLiquidos();
        if(viewId === 'calculadora-costos') { 
            calculadores.loadCostos(); 
            calculadores.renderCostosList(); 
        }
        if(viewId === 'calculadora-riego') {
            const resCard = document.getElementById('calc-riego-resultado');
            if(resCard) resCard.style.display = 'none';
        }
        if(viewId === 'dashboard') {
            this.viewHistory = []; // clear history when on dashboard
            this.renderHistorial();
        }
    },

    goBack: function() {
        if (this.viewHistory.length > 0) {
            const prevView = this.viewHistory.pop();
            this.navigate(prevView, true);
        } else {
            this.navigate('dashboard', true);
        }
    },

    toggleSidebar: function() {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('open');
    },

    openModal: function() {
        document.getElementById('auth-modal').style.display = 'flex';
    },

    closeModal: function() {
        document.getElementById('auth-modal').style.display = 'none';
        document.getElementById('auth-user').value = '';
        document.getElementById('auth-pass').value = '';
    },

    openRecoveryModal: function() {
        this.closeModal();
        // Cargar correo si el usuario ya lo había escrito en el login
        document.getElementById('recovery-email').value = document.getElementById('auth-user').value;
        document.getElementById('recovery-code').value = '';
        document.getElementById('recovery-new-pass').value = '';
        document.getElementById('recovery-step-1').style.display = 'block';
        document.getElementById('recovery-step-2').style.display = 'none';
        document.getElementById('recovery-modal').style.display = 'flex';
    },

    closeRecoveryModal: function() {
        document.getElementById('recovery-modal').style.display = 'none';
        this.currentRecoveryCode = null;
        this.currentRecoveryEmail = null;
    },

    sendRecoveryCode: function() {
        const email = document.getElementById('recovery-email').value;
        if (!email) {
            this.showAlert("Error", "Por favor ingresa tu correo electrónico.", true);
            return;
        }

        if (!dbManager.checkEmailExists(email)) {
            this.showAlert("Error", "No existe ninguna cuenta registrada con este correo.", true);
            return;
        }

        // Generate a random 6 digit code
        this.currentRecoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.currentRecoveryEmail = email;

        document.getElementById('recovery-step-1').style.display = 'none';
        document.getElementById('recovery-step-2').style.display = 'block';

        // Simulate sending email by showing it in an alert
        this.showAlert("Código Enviado", `Hemos enviado un código a tu correo (SIMULACIÓN):\n\nTu código es: ${this.currentRecoveryCode}`);
    },

    verifyAndChangePassword: function() {
        const code = document.getElementById('recovery-code').value;
        const newPass = document.getElementById('recovery-new-pass').value;

        if (!code || !newPass) {
            this.showAlert("Error", "Por favor llena todos los campos.", true);
            return;
        }

        if (code !== this.currentRecoveryCode) {
            this.showAlert("Código Incorrecto", "El código ingresado no es válido.", true);
            return;
        }

        if (dbManager.updatePassword(this.currentRecoveryEmail, newPass)) {
            this.showAlert("¡Éxito!", "Tu contraseña ha sido actualizada correctamente. Inicia sesión con tu nueva contraseña.");
            this.closeRecoveryModal();
            this.openModal();
        } else {
            this.showAlert("Error", "Hubo un problema al actualizar la contraseña.", true);
        }
    },

    showAlert: function(title, message, isError = false) {
        const modal = document.getElementById('custom-alert-modal');
        const icon = document.getElementById('custom-alert-icon');
        document.getElementById('custom-alert-title').innerText = title;
        document.getElementById('custom-alert-message').innerText = message;
        
        if(isError) {
            icon.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color: var(--danger);"></i>';
        } else {
            icon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--primary-color);"></i>';
        }
        
        modal.style.display = 'flex';
    },

    closeAlert: function() {
        document.getElementById('custom-alert-modal').style.display = 'none';
    },

    toggleAuthMode: function() {
        this.isLoginMode = !this.isLoginMode;
        document.getElementById('auth-title').innerText = this.isLoginMode ? 'Iniciar Sesión' : 'Crear Cuenta';
        document.getElementById('btn-auth-action').innerText = this.isLoginMode ? 'Entrar' : 'Registrarse';
        document.querySelector('.switch-auth').innerText = this.isLoginMode ? '¿No tienes cuenta? Regístrate aquí.' : '¿Ya tienes cuenta? Inicia sesión aquí.';
    },

    togglePasswordVisibility: function() {
        const passInput = document.getElementById('auth-pass');
        const icon = document.getElementById('toggle-pass-visibility');
        if (passInput.type === 'password') {
            passInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    },

    toggleTheme: function(forceDark = false) {
        const isDark = forceDark || document.documentElement.getAttribute('data-theme') !== 'dark';
        const btn = document.getElementById('btn-theme-toggle');
        
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-sun"></i> Modo Claro';
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-moon"></i> Modo Oscuro';
        }
    },

    applyPalette: function() {
        const pal = dbManager.getConfig('paleta_web', 'verde');
        document.documentElement.setAttribute('data-palette', pal);
    },

    authenticate: function() {
        const email = document.getElementById('auth-user').value;
        const pass = document.getElementById('auth-pass').value;
        
        if(!email || !pass) {
            this.showAlert("Error", "Por favor ingrese todos los datos.", true);
            return;
        }

        if(this.isLoginMode) {
            const user = dbManager.loginUser(email, pass);
            if(user) {
                this.currentUser = user;
                localStorage.setItem('agro_user', JSON.stringify(user));
                this.updateAuthUI();
                this.closeModal();
                this.showAlert("¡Éxito!", "Bienvenido " + user.nombre);
            } else {
                this.showAlert("Error de Autenticación", "Credenciales incorrectas.", true);
            }
        } else {
            // Register
            const nombre = email.split('@')[0]; // Simple name extraction
            if(dbManager.registerUser(nombre, email, pass)) {
                this.showAlert("¡Cuenta Creada!", "Cuenta creada exitosamente. Iniciando sesión...");
                this.isLoginMode = true;
                this.authenticate();
            } else {
                this.showAlert("Error de Registro", "El correo ya está registrado.", true);
            }
        }
    },

    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('agro_user');
        this.updateAuthUI();
        this.renderHistorial();
        this.navigate('dashboard');
        this.showAlert("Sesión Cerrada", "Has cerrado sesión correctamente.");
    },

    updateAuthUI: function() {
        const btn = document.getElementById('btn-login');
        const adminBtn = document.getElementById('btn-admin-extras');
        
        if (this.currentUser && this.currentUser.email === 'admin@gmail.com') {
            if (adminBtn) adminBtn.style.display = 'block';
        } else {
            if (adminBtn) adminBtn.style.display = 'none';
        }

        if(this.currentUser) {
            btn.innerHTML = "<i class='fa-solid fa-right-from-bracket'></i> Salir (" + this.currentUser.nombre + ")";
            btn.onclick = () => { this.logout(); this.toggleSidebar(); };
            document.getElementById('recent-activity-container').style.display = 'block';
            this.renderHistorial();
        } else {
            btn.innerHTML = "<i class='fa-solid fa-user'></i> Ingresar";
            btn.onclick = () => { this.openModal(); this.toggleSidebar(); };
            document.getElementById('recent-activity-container').style.display = 'none';
        }
    },

    renderHistorial: function() {
        if(!this.currentUser) return;
        const list = document.getElementById('historial-list');
        const historial = dbManager.getHistorial(this.currentUser.id);
        
        if(historial.length === 0) {
            list.innerHTML = "<p>No hay cálculos recientes.</p>";
            return;
        }

        list.innerHTML = historial.slice(0, 5).map(h => `
            <li style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
                <strong style="color:var(--primary-dark);">${h.tipo_calculo}:</strong> ${h.resultado} <br>
                <small style="color: var(--text-muted); font-weight: 500;">${new Date(h.fecha).toLocaleString()}</small>
            </li>
        `).join('');
    }
};

// Event Listeners
document.getElementById('btn-login').onclick = () => app.openModal();
window.onload = () => app.init();
