/**
 * Aplicación Principal Manhwa Hub
 * Enrutamiento ligero, Vistas, Búsqueda predictiva y Filtros
 */
const GENRE_DESCRIPTIONS = {
  "Acción": "Obras con batallas dinámicas, combates cuerpo a cuerpo, poderes sobrehumanos y adrenalina constante.",
  "Regresión": "Historias donde el protagonista muere o fracasa y regresa en el tiempo a su juventud conservando todos sus recuerdos para cambiar su destino.",
  "Venganza": "Protagonistas traicionados por sus amigos, sectas o amantes que regresan implacables para destruir a quienes los humillaron.",
  "Fantasía": "Mundos llenos de magia, monstruos, dragones, razas míticas y dimensiones desconocidas.",
  "Sistema": "El mundo real o de fantasía adquiere una interfaz de videojuego RPG holográfica donde el protagonista sube de nivel y desbloquea habilidades únicas.",
  "Monstruos": "Invasión de criaturas abisales, bestias mágicas y portales dimensionales que azotan a la humanidad.",
  "Magia": "Hechiceros, círculos mágicos, conjuros arcanos y academias de magia de alto rango.",
  "Comedia": "Momentos hilarantes, malentendidos graciosos y protagonistas con personalidades descaradas o únicas.",
  "Romance": "Relaciones amorosas, tensión romántica y dramas sentimentales que cautivan el corazón.",
  "Isekai": "Personajes que mueren en nuestro mundo y reencarnan o son transportados a otro universo completamente diferente.",
  "Reencarnación": "Almas que renacen en un nuevo cuerpo, ya sea en el pasado, futuro o en el mundo de una novela.",
  "Drama": "Tensión emocional profunda, conflictos morales, secretos familiares y decisiones difíciles.",
  "Realeza": "Palacios imperiales, príncipes tiranos, nobles corruptos y luchas por la corona.",
  "Artes Marciales": "Mundos Murim, cultivo de Qi, técnicas secretas de espada y honor entre sectas legendarias.",
  "Cultivo": "Ascensión espiritual mediante meditación y absorción de energía natural para alcanzar la inmortalidad.",
  "Apocalipsis": "El colapso de la civilización humana ante una catástrofe global o el inicio de escenarios de supervivencia extrema.",
  "Psicológico": "Batallas de ingenio, manipulación mental, misterio y desarrollo profundo de personajes.",
  "Supervivencia": "Luchas a muerte en entornos hostiles donde solo los más astutos y despiadados sobreviven.",
  "Aventura": "Exploración de continentes desconocidos, ruinas antiguas y tesoros olvidados."
};

const App = {
  manhwas: [],
  selectedGenre: null,
  selectedType: 'all',
  selectedStatus: 'all',
  selectedSort: 'updated',
  searchQuery: '',
  activeTab: 'updates', // 'updates', 'popular', 'bookmarks', 'history'

  init() {
    this.refreshData();
    window.Reader.init();
    window.Admin.init();
    this.bindEvents();
    this.render();
    this.checkQuickResumeBar();
  },

  refreshData() {
    this.manhwas = window.Storage.getAllManhwas();
    this.updateBookmarkCount();
  },

  bindEvents() {
    // Búsqueda en Navbar con autocompletado en vivo
    const searchInput = document.getElementById('nav-search-input');
    const searchDropdown = document.getElementById('nav-search-dropdown');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        this.searchQuery = query;

        if (query.length > 0) {
          const matches = this.manhwas.filter(m => 
            m.title.toLowerCase().includes(query) || 
            (m.altTitles && m.altTitles.toLowerCase().includes(query)) ||
            (m.genres && m.genres.some(g => g.toLowerCase().includes(query)))
          ).slice(0, 5);

          if (matches.length > 0) {
            searchDropdown.innerHTML = matches.map(m => `
              <div onclick="App.showManhwaDetail('${m.id}')" class="flex items-center gap-3 p-2.5 hover:bg-zinc-800 cursor-pointer transition border-b border-zinc-800/60 last:border-0">
                <img src="${m.cover}" class="w-10 h-14 object-cover rounded shadow" />
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-sm text-white truncate">${m.title}</div>
                  <div class="text-xs text-purple-400 font-mono">Capítulo ${m.latestChapter || 1} • ⭐ ${m.rating}</div>
                  <div class="text-[11px] text-zinc-500 truncate">${(m.genres || []).slice(0, 3).join(', ')}</div>
                </div>
              </div>
            `).join('');
            searchDropdown.classList.remove('hidden');
          } else {
            searchDropdown.innerHTML = `<div class="p-4 text-center text-xs text-zinc-500">No se encontraron resultados para "${e.target.value}"</div>`;
            searchDropdown.classList.remove('hidden');
          }
        } else {
          searchDropdown.classList.add('hidden');
        }

        // También filtrar cuadrícula si estamos en catálogo
        this.renderCatalog();
      });

      // Cerrar dropdown al hacer clic afuera
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
          searchDropdown.classList.add('hidden');
        }
      });
    }

    // Filtros de Tipo (Todos, Manhwa, Manga, Manhua)
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-filter-btn').forEach(b => {
          b.classList.remove('bg-purple-600', 'text-white');
          b.classList.add('bg-zinc-900', 'text-zinc-400');
        });
        btn.classList.add('bg-purple-600', 'text-white');
        btn.classList.remove('bg-zinc-900', 'text-zinc-400');
        this.selectedType = btn.dataset.type;
        this.renderCatalog();
      });
    });

    // Pestañas de Navegación
    document.getElementById('nav-home-btn')?.addEventListener('click', () => this.showHome());
    document.getElementById('nav-catalog-btn')?.addEventListener('click', () => this.showCatalogTab());
    document.getElementById('nav-bookmarks-btn')?.addEventListener('click', () => this.showBookmarks());
    document.getElementById('nav-history-btn')?.addEventListener('click', () => this.showHistory());
    document.getElementById('nav-admin-btn')?.addEventListener('click', () => this.showAdmin());
  },

  render() {
    this.renderHeroSpotlight();
    this.renderGenresBar();
    this.renderCatalog();
    this.renderTopRanking();
  },

  renderHeroSpotlight() {
    const heroContainer = document.getElementById('hero-spotlight');
    if (!heroContainer) return;

    const featured = this.manhwas.filter(m => m.featured)[0] || this.manhwas[0];
    if (!featured) return;

    heroContainer.innerHTML = `
      <div class="relative w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/60 shadow-2xl">
        <!-- Banner de Fondo con desenfoque suave -->
        <div class="absolute inset-0 z-0">
          <img src="${featured.banner || featured.cover}" class="w-full h-full object-cover object-top opacity-30 blur-sm scale-105" />
          <div class="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent"></div>
        </div>

        <!-- Contenido Destacado -->
        <div class="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row gap-6 md:gap-8 items-center">
          <img src="${featured.cover}" class="w-40 sm:w-52 h-60 sm:h-72 object-cover rounded-xl shadow-2xl border-2 border-purple-500/30 transform hover:scale-105 transition duration-300" />
          
          <div class="flex-1 text-center md:text-left">
            <div class="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-3">
              <span class="px-2.5 py-1 text-xs font-bold rounded-md bg-purple-600 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1">
                🔥 TOP TENDENCIA
              </span>
              <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-zinc-800 text-purple-300 border border-zinc-700">
                ${featured.type}
              </span>
              <span class="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                ${featured.status}
              </span>
              <span class="text-xs text-amber-400 font-bold flex items-center gap-1">
                ⭐ ${featured.rating}
              </span>
            </div>

            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2 hover:text-purple-400 cursor-pointer transition" onclick="App.showManhwaDetail('${featured.id}')">
              ${featured.title}
            </h1>
            
            <p class="text-xs sm:text-sm text-zinc-400 line-clamp-3 mb-4 max-w-2xl">
              ${featured.synopsis}
            </p>

            <div class="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button onclick="Reader.open(App.getManhwaById('${featured.id}'), ${featured.chapters && featured.chapters.length > 0 ? featured.chapters[featured.chapters.length - 1].number : 1})" class="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/40 flex items-center gap-2 transform active:scale-95 transition">
                <span>📖 Leer Cap. 1</span>
              </button>

              <button onclick="Reader.open(App.getManhwaById('${featured.id}'), ${featured.latestChapter || 1})" class="px-5 py-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl border border-zinc-700 flex items-center gap-2 transition">
                <span>⚡ Último Cap. ${featured.latestChapter || 1}</span>
              </button>

              <button onclick="App.showManhwaDetail('${featured.id}')" class="px-4 py-2.5 text-zinc-400 hover:text-white text-sm font-medium transition">
                Ver Detalles →
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderGenresBar() {
    const genresContainer = document.getElementById('genres-pills-container');
    if (!genresContainer) return;

    const allGenres = new Set();
    this.manhwas.forEach(m => (m.genres || []).forEach(g => allGenres.add(g)));
    const genreList = Array.from(allGenres);

    genresContainer.innerHTML = `
      <button onclick="App.filterByGenre(null)" class="genre-pill px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition ${!this.selectedGenre ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}">
        Todos los Géneros
      </button>
      ${genreList.map(genre => `
        <button onclick="App.filterByGenre('${genre}')" class="genre-pill px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${this.selectedGenre === genre ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'}">
          ${genre}
        </button>
      `).join('')}
    `;
  },

  filterByType(type) {
    this.showHome();
    this.selectedType = type;
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
      const match = btn.dataset.type && btn.dataset.type.toLowerCase() === type.toLowerCase();
      if (match) {
        btn.classList.add('bg-purple-600', 'text-white');
        btn.classList.remove('bg-zinc-900', 'text-zinc-400');
      } else {
        btn.classList.remove('bg-purple-600', 'text-white');
        btn.classList.add('bg-zinc-900', 'text-zinc-400');
      }
    });
    this.renderCatalog();
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  filterByGenre(genre) {
    this.selectedGenre = genre;
    this.renderGenresBar();
    this.renderCatalog();
    this.updateCatalogHeader();
  },

  browseByTag(genre) {
    this.showHome();
    this.selectedGenre = genre;
    this.renderGenresBar();
    this.renderCatalog();
    this.updateCatalogHeader();
    
    // Desplazar suavemente hacia el catálogo
    setTimeout(() => {
      document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  },

  updateCatalogHeader() {
    const titleEl = document.getElementById('catalog-section-title');
    const heroSpotlight = document.getElementById('hero-spotlight');
    if (!titleEl) return;

    if (this.selectedGenre) {
      const desc = GENRE_DESCRIPTIONS[this.selectedGenre] || "Explora todas las obras y capítulos pertenecientes a este género.";
      const count = this.manhwas.filter(m => m.genres && m.genres.includes(this.selectedGenre)).length;

      titleEl.innerHTML = `
        <div class="w-full bg-gradient-to-r from-purple-950/80 via-zinc-900 to-zinc-900 border border-purple-800/60 rounded-2xl p-5 mb-4 shadow-xl">
          <div class="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div class="flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              <h2 class="text-xl font-black text-white">Género: <span class="text-purple-400">${this.selectedGenre}</span></h2>
              <span class="px-2 py-0.5 text-xs font-mono font-bold rounded-md bg-purple-900 text-purple-200 border border-purple-700">${count} series</span>
            </div>
            <button onclick="App.resetFilters()" class="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1">
              ✕ Quitar Filtro
            </button>
          </div>
          <p class="text-xs text-zinc-400 mt-2.5 leading-relaxed max-w-3xl">${desc}</p>
        </div>
      `;
    } else {
      titleEl.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
          <span>Últimos Capítulos Actualizados</span>
        </div>
      `;
    }
  },

  setSort(val) {
    this.selectedSort = val;
    this.renderCatalog();
  },

  setStatusFilter(val) {
    this.selectedStatus = val;
    this.renderCatalog();
  },

  checkQuickResumeBar() {
    const bar = document.getElementById('quick-resume-bar');
    if (!bar) return;

    const history = window.Storage.getHistory();
    if (history.length === 0) {
      bar.classList.add('hidden');
      return;
    }

    const latest = history[0];
    const manhwa = this.getManhwaById(latest.manhwaId);
    if (!manhwa) {
      bar.classList.add('hidden');
      return;
    }

    document.getElementById('resume-cover').src = manhwa.cover;
    document.getElementById('resume-title').textContent = manhwa.title;
    document.getElementById('resume-chapter').textContent = `Capítulo ${latest.chapterNumber}`;
    document.getElementById('resume-btn').onclick = () => {
      window.Reader.open(manhwa, latest.chapterNumber);
    };

    bar.classList.remove('hidden');
  },

  renderCatalog() {
    const grid = document.getElementById('manhwas-grid');
    if (!grid) return;

    let filtered = [...this.manhwas];

    // Filtro Tipo
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(m => m.type.toLowerCase() === this.selectedType.toLowerCase());
    }

    // Filtro Estado
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(m => m.status === this.selectedStatus);
    }

    // Filtro Género
    if (this.selectedGenre) {
      filtered = filtered.filter(m => m.genres && m.genres.includes(this.selectedGenre));
    }

    // Filtro Búsqueda
    if (this.searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(this.searchQuery) ||
        (m.altTitles && m.altTitles.toLowerCase().includes(this.searchQuery))
      );
    }

    // Ordenamiento (Estilo MangaDex)
    if (this.selectedSort === 'views') {
      filtered.sort((a, b) => (parseFloat(b.views) || 0) - (parseFloat(a.views) || 0));
    } else if (this.selectedSort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (this.selectedSort === 'alphabetical') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    } else if (this.selectedSort === 'updated') {
      // Default / Latest chapter
      filtered.sort((a, b) => (b.latestChapter || 0) - (a.latestChapter || 0));
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-20 text-center text-zinc-500">
          <p class="text-3xl mb-2">🔍</p>
          <p class="text-lg font-medium text-zinc-300">No se encontraron títulos</p>
          <p class="text-xs text-zinc-500 mt-1">Intenta con otro término o limpia los filtros</p>
          <button onclick="App.resetFilters()" class="mt-4 px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-purple-300 rounded-lg">Limpiar Filtros</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(m => {
      const isBookmarked = window.Storage.isBookmarked(m.id);
      const lastRead = window.Storage.getLastReadChapter(m.id);
      const chapters = m.chapters || [];
      const latest2 = chapters.slice(0, 2);

      return `
        <div class="group relative bg-zinc-900/70 border border-zinc-800/80 hover:border-purple-500/50 rounded-xl overflow-hidden shadow-lg hover:shadow-purple-900/10 transition-all duration-300 flex flex-col">
          <!-- Portada con Ratio 3:4 -->
          <div class="relative w-full aspect-[3/4] overflow-hidden cursor-pointer" onclick="App.showManhwaDetail('${m.id}')">
            <img src="${m.cover}" alt="${m.title}" loading="lazy" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" />
            
            <!-- Badges superiores -->
            <div class="absolute top-2 left-2 flex flex-col gap-1 z-10">
              <span class="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-purple-600/95 text-white shadow backdrop-blur-sm">
                ${m.type}
              </span>
              ${m.status === 'Finalizado' ? `
                <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-900/90 text-zinc-300 border border-zinc-700">
                  FINALIZADO
                </span>
              ` : ''}
            </div>

            <!-- Botón Favorito Rápido -->
            <button onclick="event.stopPropagation(); App.toggleCardBookmark('${m.id}', this)" class="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 hover:bg-purple-600 text-zinc-300 hover:text-white transition shadow z-10" title="Guardar">
              ${isBookmarked ? '⭐' : '☆'}
            </button>

            <!-- Calificación flotante inferior -->
            <div class="absolute bottom-2 left-2 px-2 py-0.5 bg-zinc-950/85 backdrop-blur-sm rounded text-[11px] font-bold text-amber-400 flex items-center gap-1 border border-zinc-800">
              ⭐ ${m.rating}
            </div>
            
            ${lastRead ? `
              <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-purple-950/90 backdrop-blur-sm rounded text-[10px] font-semibold text-purple-300 border border-purple-800">
                Leído: Cap ${lastRead}
              </div>
            ` : ''}
          </div>

          <!-- Información del Manhwa -->
          <div class="p-3 flex-1 flex flex-col justify-between">
            <div>
              <h3 onclick="App.showManhwaDetail('${m.id}')" class="font-bold text-sm text-zinc-100 hover:text-purple-400 line-clamp-1 cursor-pointer transition" title="${m.title}">
                ${m.title}
              </h3>
              <div class="mt-1 flex flex-wrap gap-1">
                ${(m.genres || []).slice(0, 2).map(g => `
                  <button onclick="event.stopPropagation(); App.browseByTag('${g}')" class="px-1.5 py-0.5 rounded bg-zinc-800/80 hover:bg-purple-600 text-zinc-400 hover:text-white text-[10px] font-medium transition cursor-pointer">
                    #${g}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Últimos Capítulos -->
            <div class="mt-3 space-y-1.5 border-t border-zinc-800/80 pt-2">
              ${latest2.length > 0 ? latest2.map(c => `
                <a href="javascript:void(0)" onclick="Reader.open(App.getManhwaById('${m.id}'), ${c.number})" class="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-zinc-800/80 transition group/chap">
                  <span class="font-mono text-purple-300 group-hover/chap:text-purple-400 font-semibold truncate">
                    Cap. ${c.number}
                  </span>
                  <span class="text-[10px] text-zinc-500 whitespace-nowrap">
                    ${c.date || 'Reciente'}
                  </span>
                </a>
              `).join('') : `
                <div class="text-[11px] text-zinc-600 py-1 text-center">Sin capítulos aún</div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderTopRanking() {
    const container = document.getElementById('top-ranking-list');
    if (!container) return;

    // Ordenar por vistas aproximadas
    const top5 = [...this.manhwas].sort((a, b) => (parseFloat(b.views) || 0) - (parseFloat(a.views) || 0)).slice(0, 5);

    container.innerHTML = top5.map((m, idx) => `
      <div onclick="App.showManhwaDetail('${m.id}')" class="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/60 cursor-pointer transition border border-transparent hover:border-zinc-700/60 group">
        <div class="w-7 text-center font-black text-lg ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-zinc-300' : idx === 2 ? 'text-amber-600' : 'text-zinc-600'}">
          ${idx + 1}
        </div>
        <img src="${m.cover}" class="w-11 h-14 object-cover rounded-lg shadow group-hover:scale-105 transition" />
        <div class="flex-1 min-w-0">
          <h4 class="font-bold text-xs text-zinc-200 group-hover:text-purple-400 truncate">${m.title}</h4>
          <div class="text-[11px] text-purple-400 font-mono mt-0.5">Cap. ${m.latestChapter || 1}</div>
          <div class="text-[10px] text-zinc-500">⭐ ${m.rating} • 👁️ ${m.views}</div>
        </div>
      </div>
    `).join('');
  },

  showManhwaDetail(manhwaId) {
    const m = this.getManhwaById(manhwaId);
    if (!m) return;

    document.getElementById('main-catalog-view').classList.add('hidden');
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');

    const detailView = document.getElementById('manhwa-detail-view');
    detailView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    const isBookmarked = window.Storage.isBookmarked(m.id);
    const lastRead = window.Storage.getLastReadChapter(m.id);
    const userRating = window.Storage.getUserRating(m.id);
    const chapters = m.chapters || [];

    detailView.innerHTML = `
      <div class="max-w-6xl mx-auto px-4 py-8">
        <!-- Botón Volver -->
        <button onclick="App.showHome()" class="mb-6 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-800 flex items-center gap-2 transition">
          ← Volver al Catálogo
        </button>

        <!-- Cabecera de la Serie -->
        <div class="relative bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8">
          <div class="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            <div class="w-48 sm:w-60 flex-shrink-0 mx-auto md:mx-0">
              <img src="${m.cover}" class="w-full aspect-[3/4] object-cover rounded-xl shadow-2xl border-2 border-purple-500/20" />
              
              <!-- Botón Marcador -->
              <button onclick="App.toggleDetailBookmark('${m.id}', this)" class="mt-4 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow ${isBookmarked ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'}">
                <span>${isBookmarked ? '★ EN TUS FAVORITOS' : '☆ GUARDAR EN FAVORITOS'}</span>
              </button>
            </div>

            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2 mb-2">
                <button onclick="App.filterByType('${m.type}')" class="px-2.5 py-0.5 text-xs font-black rounded bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer" title="Ver todos los ${m.type}s">
                  ${m.type}
                </button>
                <span class="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">${m.status}</span>
                <span class="text-xs text-amber-400 font-bold bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800">
                  ⭐ ${m.rating} / 10
                </span>

                <!-- Calificación Interactiva de 1 a 10 Estrellas (Estilo TMO/MangaDex) -->
                <div class="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800 text-xs">
                  <span class="text-zinc-400 text-[10px]">Tu Voto:</span>
                  <div class="flex items-center text-amber-400 cursor-pointer select-none">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => `
                      <span onclick="App.rateManhwa('${m.id}', ${s})" title="${s} estrellas" class="hover:scale-125 transition px-0.5 text-xs ${(userRating || 0) >= s ? 'text-amber-400' : 'text-zinc-700'}">★</span>
                    `).join('')}
                  </div>
                  <span class="font-bold text-purple-400 text-[10px] ml-1 font-mono">${userRating ? userRating + '/10' : 'Votar'}</span>
                </div>
              </div>

              <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight mb-1">${m.title}</h1>
              ${m.altTitles ? `<div class="text-xs text-zinc-400 mb-4">${m.altTitles}</div>` : ''}

              <!-- Metadatos -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 my-4 border-y border-zinc-800 text-xs">
                <div><span class="text-zinc-500">Autor:</span> <span class="text-zinc-200 font-medium">${m.author || 'N/A'}</span></div>
                <div><span class="text-zinc-500">Artista:</span> <span class="text-zinc-200 font-medium">${m.artist || 'N/A'}</span></div>
                <div><span class="text-zinc-500">Vistas:</span> <span class="text-purple-400 font-bold">${m.views}</span></div>
                <div><span class="text-zinc-500">Seguidores:</span> <span class="text-zinc-200 font-bold">${m.bookmarks}</span></div>
              </div>

              <!-- Géneros Interactivos -->
              <div class="mb-5">
                <span class="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Géneros & Etiquetas (Haz clic para ver más):</span>
                <div class="flex flex-wrap gap-2">
                  ${(m.genres || []).map(g => `
                    <button onclick="App.browseByTag('${g}')" class="px-3 py-1.5 text-xs rounded-lg bg-zinc-800/90 hover:bg-purple-600 text-zinc-200 hover:text-white border border-zinc-700/80 hover:border-purple-500 font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm group">
                      <span class="text-purple-400 group-hover:text-white transition font-mono">#</span>
                      <span>${g}</span>
                      <span class="text-[10px] text-zinc-500 group-hover:text-purple-200 font-normal">→</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <!-- Sinopsis -->
              <div>
                <h3 class="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Sinopsis</h3>
                <p class="text-sm text-zinc-300 leading-relaxed">${m.synopsis}</p>
              </div>

              <!-- Botones de Acción Inmediata -->
              <div class="mt-6 flex flex-wrap gap-3">
                ${chapters.length > 0 ? `
                  <button onclick="Reader.open(App.getManhwaById('${m.id}'), ${chapters[chapters.length - 1].number})" class="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 text-sm transition">
                    📖 Primer Capítulo (${chapters[chapters.length - 1].number})
                  </button>
                  <button onclick="Reader.open(App.getManhwaById('${m.id}'), ${lastRead || chapters[0].number})" class="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl border border-zinc-700 text-sm transition">
                    ${lastRead ? `⚡ Continuar (Cap. ${lastRead})` : `Último Capítulo (${chapters[0].number})`}
                  </button>
                ` : `
                  <div class="text-sm text-zinc-500 italic">No hay capítulos publicados aún</div>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- Lista de Capítulos -->
        <div class="mt-8 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
          <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div>
              <h2 class="text-xl font-bold text-white flex items-center gap-2">
                <span>Capítulos Disponibles</span>
                <span class="text-xs font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">${chapters.length}</span>
              </h2>
            </div>
            <div class="flex items-center gap-2 w-full sm:w-auto">
              <input type="text" id="chapter-filter-input" placeholder="Buscar capítulo..." oninput="App.filterChapters('${m.id}', this.value)" class="w-full sm:w-48 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500" />
            </div>
          </div>

          <div id="chapters-list-container" class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[550px] overflow-y-auto pr-1">
            ${this.renderChapterItems(m, chapters)}
          </div>
        </div>
      </div>
    `;
  },

  rateManhwa(id, star) {
    window.Storage.saveUserRating(id, star);
    const m = this.getManhwaById(id);
    if (m) {
      // Recalcular promedio de estrellas
      m.rating = Number(((m.rating * 10 + star) / 11).toFixed(1));
      window.Storage.saveManhwa(m);
      this.showManhwaDetail(id);
    }
  },

  renderChapterItems(manhwa, chapters) {
    if (chapters.length === 0) {
      return `<div class="col-span-full py-8 text-center text-zinc-500 text-xs">No hay capítulos disponibles todavía.</div>`;
    }

    const lastRead = window.Storage.getLastReadChapter(manhwa.id);

    return chapters.map(c => `
      <div onclick="Reader.open(App.getManhwaById('${manhwa.id}'), ${c.number})" class="flex items-center justify-between p-3 rounded-xl bg-zinc-950/70 hover:bg-purple-950/40 border border-zinc-800/80 hover:border-purple-500/40 cursor-pointer transition group">
        <div class="min-w-0">
          <div class="font-bold text-sm ${lastRead === c.number ? 'text-purple-400' : 'text-zinc-200'} group-hover:text-purple-300 truncate">
            Capítulo ${c.number}
          </div>
          <div class="text-[11px] text-zinc-500 truncate">${c.title || 'Sin título'}</div>
        </div>
        <div class="text-right text-[11px] text-zinc-500">
          ${c.date || 'Reciente'}
        </div>
      </div>
    `).join('');
  },

  filterChapters(manhwaId, query) {
    const m = this.getManhwaById(manhwaId);
    if (!m) return;
    const q = query.trim().toLowerCase();
    const filtered = (m.chapters || []).filter(c => 
      c.number.toString().includes(q) || (c.title && c.title.toLowerCase().includes(q))
    );
    const container = document.getElementById('chapters-list-container');
    if (container) {
      container.innerHTML = this.renderChapterItems(m, filtered);
    }
  },

  toggleCardBookmark(manhwaId, btn) {
    const bookmarked = window.Storage.toggleBookmark(manhwaId);
    btn.innerHTML = bookmarked ? '⭐' : '☆';
    this.updateBookmarkCount();
  },

  toggleDetailBookmark(manhwaId, btn) {
    const bookmarked = window.Storage.toggleBookmark(manhwaId);
    btn.className = `mt-4 w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow ${bookmarked ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'}`;
    btn.innerHTML = `<span>${bookmarked ? '★ EN TUS FAVORITOS' : '☆ GUARDAR EN FAVORITOS'}</span>`;
    this.updateBookmarkCount();
  },

  updateBookmarkCount() {
    const count = window.Storage.getBookmarks().length;
    const badge = document.getElementById('nav-bookmarks-count');
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle('hidden', count === 0);
    }
  },

  showHome() {
    document.getElementById('main-catalog-view').classList.remove('hidden');
    document.getElementById('manhwa-detail-view').classList.add('hidden');
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    this.resetFilters();
    this.checkQuickResumeBar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  showCatalogTab() {
    this.showHome();
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  showBookmarks() {
    this.showHome();
    const bookmarks = window.Storage.getBookmarks();
    const grid = document.getElementById('manhwas-grid');
    const filtered = this.manhwas.filter(m => bookmarks.includes(m.id));

    document.getElementById('catalog-section-title').textContent = `Tus Favoritos (${filtered.length})`;

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-500">
          <p class="text-3xl mb-2">⭐</p>
          <p class="text-lg font-medium text-zinc-300">No tienes series guardadas aún</p>
          <p class="text-xs text-zinc-500 mt-1">Haz clic en la estrella de cualquier manhwa para agregarlo aquí</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(m => this.renderSingleCard(m)).join('');
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  showHistory() {
    this.showHome();
    const history = window.Storage.getHistory();
    const grid = document.getElementById('manhwas-grid');

    document.getElementById('catalog-section-title').textContent = `Historial de Lectura (${history.length})`;

    if (history.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-zinc-500">
          <p class="text-3xl mb-2">🕒</p>
          <p class="text-lg font-medium text-zinc-300">Aún no has leído ningún capítulo</p>
        </div>
      `;
      return;
    }

    const historyManhwas = history.map(h => {
      const m = this.getManhwaById(h.manhwaId);
      return m ? { ...m, lastReadChapter: h.chapterNumber, readTime: h.timestamp } : null;
    }).filter(Boolean);

    grid.innerHTML = historyManhwas.map(m => this.renderSingleCard(m)).join('');
    document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' });
  },

  renderSingleCard(m) {
    const isBookmarked = window.Storage.isBookmarked(m.id);
    const lastRead = m.lastReadChapter || window.Storage.getLastReadChapter(m.id);

    return `
      <div class="group relative bg-zinc-900/70 border border-zinc-800/80 hover:border-purple-500/50 rounded-xl overflow-hidden shadow-lg transition flex flex-col">
        <div class="relative w-full aspect-[3/4] overflow-hidden cursor-pointer" onclick="App.showManhwaDetail('${m.id}')">
          <img src="${m.cover}" alt="${m.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
          <div class="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-black uppercase rounded bg-purple-600/95 text-white shadow">
            ${m.type}
          </div>
          <button onclick="event.stopPropagation(); App.toggleCardBookmark('${m.id}', this)" class="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/80 text-zinc-300 shadow">
            ${isBookmarked ? '⭐' : '☆'}
          </button>
          ${lastRead ? `
            <div class="absolute bottom-2 right-2 px-2 py-0.5 bg-purple-950/90 rounded text-[10px] font-semibold text-purple-300 border border-purple-800">
              Leído: Cap ${lastRead}
            </div>
          ` : ''}
        </div>
        <div class="p-3 flex-1 flex flex-col justify-between">
          <h3 onclick="App.showManhwaDetail('${m.id}')" class="font-bold text-sm text-zinc-100 hover:text-purple-400 line-clamp-1 cursor-pointer transition">
            ${m.title}
          </h3>
          <button onclick="Reader.open(App.getManhwaById('${m.id}'), ${lastRead || m.latestChapter || 1})" class="mt-3 w-full py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white rounded-lg text-xs font-semibold transition">
            Continuar Leyendo
          </button>
        </div>
      </div>
    `;
  },

  showAdmin() {
    document.getElementById('main-catalog-view').classList.add('hidden');
    document.getElementById('manhwa-detail-view').classList.add('hidden');
    document.getElementById('reader-view').classList.add('hidden');
    document.getElementById('admin-view').classList.remove('hidden');
    window.Admin.renderSeriesTable();
    window.Admin.populateSeriesSelect();
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  resetFilters() {
    this.selectedGenre = null;
    this.selectedType = 'all';
    this.searchQuery = '';
    const searchInput = document.getElementById('nav-search-input');
    if (searchInput) searchInput.value = '';
    document.getElementById('catalog-section-title').textContent = 'Últimos Capítulos Actualizados';
    this.renderGenresBar();
    this.renderCatalog();
  },

  getManhwaById(id) {
    return this.manhwas.find(m => m.id === id);
  }
};

window.App = App;
