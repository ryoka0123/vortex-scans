/**
 * Sistema de Autenticación y Cuentas de Usuario (Vortex Scans)
 * Soporta Registro, Login, Conexión Rápida con Discord/Google y Perfil de Usuario
 */
const Auth = {
  currentUser: null,

  init() {
    this.loadSession();
    this.updateNavbar();
  },

  loadSession() {
    try {
      const session = localStorage.getItem('vortex_session');
      if (session) {
        this.currentUser = JSON.parse(session);
      }
    } catch (e) {
      this.currentUser = null;
    }
  },

  saveSession(user) {
    this.currentUser = user;
    localStorage.setItem('vortex_session', JSON.stringify(user));
    this.updateNavbar();
  },

  getRegisteredUsers() {
    try {
      return JSON.parse(localStorage.getItem('vortex_users')) || [];
    } catch (e) {
      return [];
    }
  },

  saveRegisteredUsers(users) {
    localStorage.setItem('vortex_users', JSON.stringify(users));
  },

  // Registro con Email y Contraseña
  register(email, username, password) {
    const users = this.getRegisteredUsers();
    
    // Verificar si el correo o usuario ya existen
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'Este correo electrónico ya está registrado.' };
    }

    const newUser = {
      id: 'u_' + Date.now(),
      email: email.trim().toLowerCase(),
      username: username.trim(),
      password: password, // En producción se hashea en el backend
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      role: 'Lector VIP',
      joinedAt: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
    };

    users.push(newUser);
    this.saveRegisteredUsers(users);
    this.saveSession(newUser);

    return { success: true, user: newUser };
  },

  // Iniciar Sesión con Correo y Contraseña
  login(email, password) {
    const users = this.getRegisteredUsers();
    const user = users.find(u => 
      (u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === email.toLowerCase()) &&
      u.password === password
    );

    if (!user) {
      return { success: false, message: 'Correo o contraseña incorrectos.' };
    }

    this.saveSession(user);
    return { success: true, user };
  },

  // Acceso Rápido con Discord (1 clic como en la imagen)
  loginWithDiscord() {
    const defaultDiscordUser = {
      id: 'discord_' + Date.now(),
      username: 'Hunter_Shadow',
      email: 'hunter@discord.gg',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=120&auto=format&fit=crop&q=80',
      role: 'Discord Fan ⭐',
      provider: 'discord',
      joinedAt: 'Hoy'
    };
    this.saveSession(defaultDiscordUser);
    this.closeModal();
    this.toast(`¡Bienvenido de nuevo, ${defaultDiscordUser.username}! (Discord en modo demo)`, defaultDiscordUser.avatar);
  },

  // ===================== GOOGLE SIGN-IN REAL (OAuth 2.0 / GIS) =====================
  googleClient: null,
  googleClientId: null,

  getGoogleClientId() {
    return (window.VORTEX_CONFIG && window.VORTEX_CONFIG.GOOGLE_CLIENT_ID) ||
      localStorage.getItem('vortex_google_client_id') || '';
  },

  loginWithGoogle() {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      this.openGoogleSetup();
      return;
    }

    if (!(window.google && google.accounts && google.accounts.oauth2)) {
      this.showAuthError('No se pudo cargar Google. Revisa tu conexión o desactiva el bloqueador de anuncios e inténtalo de nuevo.');
      return;
    }

    this.setGoogleLoading(true);
    try {
      if (!this.googleClient || this.googleClientId !== clientId) {
        this.googleClientId = clientId;
        this.googleClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (resp) => this.handleGoogleToken(resp),
          error_callback: (err) => this.handleGoogleError(err)
        });
      }
      this.googleClient.requestAccessToken({ prompt: 'select_account' });
    } catch (e) {
      this.handleGoogleError({ type: 'init_failed' });
    }
  },

  async handleGoogleToken(resp) {
    if (!resp || resp.error || !resp.access_token) {
      this.handleGoogleError({ type: resp && resp.error ? resp.error : 'unknown' });
      return;
    }
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${resp.access_token}` }
      });
      if (!r.ok) throw new Error('userinfo ' + r.status);
      this.completeGoogleLogin(await r.json());
    } catch (e) {
      this.handleGoogleError({ type: 'userinfo_failed' });
    }
  },

  completeGoogleLogin(profile) {
    if (!profile || !profile.email) {
      this.handleGoogleError({ type: 'no_email' });
      return;
    }

    const email = profile.email.toLowerCase();
    const users = this.getRegisteredUsers();
    let user = users.find(u => u.email.toLowerCase() === email);

    if (user) {
      // La cuenta ya existía: la vinculamos con Google y actualizamos la foto
      user.provider = user.provider || 'google';
      user.googleId = profile.sub;
      if (profile.picture) user.avatar = profile.picture;
    } else {
      user = {
        id: 'g_' + profile.sub,
        googleId: profile.sub,
        email,
        username: (profile.name || email.split('@')[0]).trim(),
        avatar: profile.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        role: 'Lector Verificado 🟢',
        provider: 'google',
        joinedAt: new Date().toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      };
      users.push(user);
    }

    this.saveRegisteredUsers(users);
    this.saveSession(user);
    this.setGoogleLoading(false);
    this.closeModal();
    this.toast(`¡Bienvenido, ${user.username}! Sesión iniciada con Google`, user.avatar);
  },

  handleGoogleError(err) {
    this.setGoogleLoading(false);
    const type = (err && err.type) || '';
    if (type === 'popup_closed') {
      this.showAuthError('Cerraste la ventana de Google antes de terminar. Inténtalo de nuevo cuando quieras.');
    } else if (type === 'popup_failed_to_open') {
      this.showAuthError('Tu navegador bloqueó la ventana de Google. Permite las ventanas emergentes para este sitio.');
    } else if (type === 'access_denied') {
      this.showAuthError('No diste permiso para acceder a tu perfil de Google.');
    } else {
      this.showAuthError('No se pudo iniciar sesión con Google. Revisa que el Client ID y el origen autorizado estén bien configurados.');
    }
  },

  setGoogleLoading(loading) {
    const btn = document.getElementById('google-login-btn');
    const label = document.getElementById('google-login-label');
    if (!btn || !label) return;
    btn.disabled = loading;
    btn.classList.toggle('opacity-70', loading);
    btn.classList.toggle('cursor-wait', loading);
    label.textContent = loading ? 'Conectando con Google…' : 'Continuar con Google';
  },

  showAuthError(msg) {
    const el = document.getElementById('auth-error-msg');
    if (!el) return this.toast(msg);
    el.textContent = msg;
    el.classList.remove('hidden');
  },

  // ---- Panel de configuración del Client ID ----
  openGoogleSetup() {
    const panel = document.getElementById('google-setup-panel');
    if (!panel) return;
    document.getElementById('google-setup-origin').textContent = window.location.origin;
    document.getElementById('google-setup-input').value = localStorage.getItem('vortex_google_client_id') || '';
    document.getElementById('google-setup-error').classList.add('hidden');
    panel.classList.remove('hidden');
  },

  closeGoogleSetup() {
    const panel = document.getElementById('google-setup-panel');
    if (panel) panel.classList.add('hidden');
  },

  saveGoogleClientId() {
    const input = document.getElementById('google-setup-input');
    const err = document.getElementById('google-setup-error');
    const value = input.value.trim();

    if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(value)) {
      err.textContent = 'Ese no parece un Client ID válido. Debe terminar en .apps.googleusercontent.com';
      err.classList.remove('hidden');
      return;
    }

    localStorage.setItem('vortex_google_client_id', value);
    this.googleClient = null;
    this.closeGoogleSetup();
    this.toast('Client ID guardado. Ya puedes continuar con Google');
  },

  clearGoogleClientId() {
    localStorage.removeItem('vortex_google_client_id');
    this.googleClient = null;
    this.openGoogleSetup();
  },

  // Notificación con el estilo de la página
  toast(message, avatar) {
    const old = document.getElementById('vortex-toast');
    if (old) old.remove();

    const el = document.createElement('div');
    el.id = 'vortex-toast';
    el.className = 'fixed top-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 max-w-sm w-[calc(100%-2rem)] bg-zinc-900/95 border border-red-500/40 rounded-2xl px-4 py-3 shadow-2xl shadow-red-900/30 backdrop-blur-md animate-fade-in';
    el.innerHTML = `
      ${avatar
        ? `<img src="${avatar}" class="w-9 h-9 rounded-xl object-cover border border-red-500/40 flex-shrink-0" referrerpolicy="no-referrer" />`
        : `<div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white flex-shrink-0">⚡</div>`}
      <div class="text-xs font-semibold text-zinc-100 leading-snug">${message}</div>
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  },

  // Cerrar Sesión
  logout() {
    this.currentUser = null;
    localStorage.removeItem('vortex_session');
    this.updateNavbar();
    this.toast('Has cerrado sesión correctamente');
    if (document.getElementById('profile-dropdown')) {
      document.getElementById('profile-dropdown').classList.add('hidden');
    }
  },

  // Actualizar Navbar con Perfil o Botón de Iniciar Sesión
  updateNavbar() {
    const authBtnContainer = document.getElementById('nav-auth-container');
    if (!authBtnContainer) return;

    if (this.currentUser) {
      authBtnContainer.innerHTML = `
        <div class="relative">
          <button onclick="Auth.toggleProfileDropdown()" class="flex items-center gap-2 p-1 pl-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/60 transition group">
            <span class="text-xs font-bold text-zinc-200 group-hover:text-purple-300 hidden md:inline truncate max-w-[100px]">
              ${this.currentUser.username}
            </span>
            <img src="${this.currentUser.avatar}" referrerpolicy="no-referrer" class="w-7 h-7 rounded-lg object-cover border border-purple-500/40" />
          </button>

          <!-- Dropdown del Perfil -->
          <div id="profile-dropdown" class="hidden absolute right-0 top-full mt-2 w-56 bg-zinc-900/95 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-md text-xs divide-y divide-zinc-800/80">
            <div class="p-3 bg-zinc-950/60">
              <div class="font-bold text-white text-sm truncate">${this.currentUser.username}</div>
              <div class="text-[11px] text-zinc-400 truncate">${this.currentUser.email}</div>
              <span class="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                ${this.currentUser.role || 'Miembro'}
              </span>
            </div>
            <div class="p-1">
              <button onclick="App.showBookmarks(); Auth.toggleProfileDropdown();" class="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-2">
                <span>⭐ Mis Favoritos</span>
              </button>
              <button onclick="App.showHistory(); Auth.toggleProfileDropdown();" class="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-2">
                <span>🕒 Historial de Lectura</span>
              </button>
            </div>
            <div class="p-1">
              <button onclick="Auth.logout()" class="w-full text-left px-3 py-2 rounded-lg hover:bg-red-950/40 text-red-400 hover:text-red-300 transition flex items-center gap-2 font-semibold">
                <span>🚪 Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      authBtnContainer.innerHTML = `
        <div class="relative">
          <button onclick="Auth.openModal('login')" class="px-3 sm:px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition flex items-center gap-1.5">
            <span>Iniciar sesión</span>
          </button>
        </div>
      `;
    }
  },

  toggleProfileDropdown() {
    const dd = document.getElementById('profile-dropdown');
    if (dd) dd.classList.toggle('hidden');
  },

  openModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    this.switchMode(mode);
    modal.classList.remove('hidden');
  },

  closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('hidden');
  },

  switchMode(mode) {
    const isLogin = mode === 'login';
    document.getElementById('auth-title').textContent = isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta gratis';
    document.getElementById('auth-submit-btn').textContent = isLogin ? 'Acceso' : 'Crear Cuenta';
    
    // Campo de username (solo visible en registro)
    const usernameField = document.getElementById('auth-username-field');
    if (usernameField) {
      usernameField.classList.toggle('hidden', isLogin);
      document.getElementById('auth-username-input').required = !isLogin;
    }

    // Toggle texto inferior
    const toggleText = document.getElementById('auth-toggle-text');
    if (toggleText) {
      toggleText.innerHTML = isLogin 
        ? `¿No eres miembro? <a href="javascript:void(0)" onclick="Auth.switchMode('register')" class="text-red-500 hover:underline font-bold">Crea una nueva cuenta.</a>`
        : `¿Ya tienes cuenta? <a href="javascript:void(0)" onclick="Auth.switchMode('login')" class="text-red-500 hover:underline font-bold">Inicia sesión aquí.</a>`;
    }

    document.getElementById('auth-error-msg').classList.add('hidden');
  },

  handleSubmit(e) {
    e.preventDefault();
    const isLogin = document.getElementById('auth-username-field').classList.contains('hidden');
    const email = document.getElementById('auth-email-input').value.trim();
    const password = document.getElementById('auth-password-input').value;
    const errorEl = document.getElementById('auth-error-msg');

    if (isLogin) {
      const res = this.login(email, password);
      if (res.success) {
        this.closeModal();
        this.toast(`¡Bienvenido de nuevo, ${res.user.username}!`, res.user.avatar);
      } else {
        errorEl.textContent = res.message;
        errorEl.classList.remove('hidden');
      }
    } else {
      const username = document.getElementById('auth-username-input').value.trim();
      if (!username) {
        errorEl.textContent = 'Por favor ingresa un nombre de usuario.';
        errorEl.classList.remove('hidden');
        return;
      }
      const res = this.register(email, username, password);
      if (res.success) {
        this.closeModal();
        this.toast(`¡Cuenta creada con éxito! Bienvenido, ${res.user.username}`, res.user.avatar);
      } else {
        errorEl.textContent = res.message;
        errorEl.classList.remove('hidden');
      }
    }
  },

  togglePasswordVisibility() {
    const input = document.getElementById('auth-password-input');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }
};

window.Auth = Auth;
