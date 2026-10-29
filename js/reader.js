/**
 * Lector de Manhwa y Manga Ultra Rápido
 * Soporta Modo Cascada (Webtoon sin espacios) y Paginado clásico
 */
const Reader = {
  currentManhwa: null,
  currentChapter: null,
  currentPageIndex: 0,
  settings: null,
  autoScrollInterval: null,
  lastScrollTop: 0,

  init() {
    this.settings = window.Storage.getReaderSettings();
    this.bindEvents();
  },

  bindEvents() {
    // Teclado para navegación
    window.addEventListener('keydown', (e) => {
      const readerModal = document.getElementById('reader-view');
      if (!readerModal || readerModal.classList.contains('hidden')) return;

      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.nextPageOrChapter();
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.prevPageOrChapter();
      } else if (e.key === 'Escape') {
        this.close();
      } else if (e.key === 'f' || e.key === 'F') {
        this.toggleFullscreen();
      }
    });

    // Barra flotante inteligente (ocultar al bajar, mostrar al subir)
    window.addEventListener('scroll', () => {
      const readerModal = document.getElementById('reader-view');
      if (!readerModal || readerModal.classList.contains('hidden')) return;

      const topBar = document.getElementById('reader-top-bar');
      const bottomBar = document.getElementById('reader-bottom-bar');
      const progressBar = document.getElementById('reader-progress-fill');
      
      const st = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      
      // Actualizar barra de progreso
      if (docHeight > 0 && progressBar) {
        const progress = Math.min(100, Math.max(0, (st / docHeight) * 100));
        progressBar.style.width = `${progress}%`;
        const percentText = document.getElementById('reader-progress-text');
        if (percentText) percentText.textContent = `${Math.round(progress)}%`;
      }

      // Ocultar / Mostrar barras
      if (st > this.lastScrollTop && st > 100) {
        // Bajando
        topBar?.classList.add('-translate-y-full');
        bottomBar?.classList.add('translate-y-full');
      } else {
        // Subiendo
        topBar?.classList.remove('-translate-y-full');
        bottomBar?.classList.remove('translate-y-full');
      }
      this.lastScrollTop = st <= 0 ? 0 : st;
    }, { passive: true });
  },

  open(manhwa, chapterNumber) {
    this.currentManhwa = manhwa;
    const chap = manhwa.chapters.find(c => c.number === Number(chapterNumber));
    if (!chap) {
      alert('Capítulo no encontrado');
      return;
    }
    this.currentChapter = chap;
    this.currentPageIndex = 0;

    // Guardar en historial
    window.Storage.saveReadingProgress(manhwa.id, chap.number, 1);

    // Ocultar app y mostrar lector
    document.getElementById('main-catalog-view').classList.add('hidden');
    document.getElementById('manhwa-detail-view').classList.add('hidden');
    document.getElementById('admin-view').classList.add('hidden');
    
    const readerView = document.getElementById('reader-view');
    readerView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });

    this.render();
  },

  render() {
    const manhwa = this.currentManhwa;
    const chapter = this.currentChapter;

    // Actualizar encabezados
    document.getElementById('reader-series-title').textContent = manhwa.title;
    document.getElementById('reader-chapter-title').textContent = `Capítulo ${chapter.number}${chapter.title ? ' - ' + chapter.title : ''}`;

    // Llenar selector de capítulos
    const select = document.getElementById('reader-chapter-select');
    select.innerHTML = manhwa.chapters.map(c => `
      <option value="${c.number}" ${c.number === chapter.number ? 'selected' : ''}>
        Capítulo ${c.number}: ${c.title || 'Sin título'}
      </option>
    `).join('');

    select.onchange = (e) => {
      this.open(manhwa, Number(e.target.value));
    };

    // Renderizar contenedor de imágenes según modo
    const container = document.getElementById('reader-images-container');
    container.innerHTML = '';

    if (this.settings.mode === 'webtoon') {
      this.renderWebtoonMode(container);
    } else {
      this.renderPagedMode(container);
    }

    // Configurar botones de anterior / siguiente
    this.updateNavigationButtons();

    // Renderizar barra de interacción (Likes estilo Webtoon + Descarga)
    this.renderChapterActions();

    // Renderizar sección de comentarios al final del capítulo
    this.renderCommentsSection();

    // Aplicar ajustes visuales (ancho, brillo y fondo)
    this.applyVisualSettings();
  },

  applyVisualSettings() {
    const readerView = document.getElementById('reader-view');
    const container = document.getElementById('reader-images-container');
    
    // Tema de fondo
    const bgTheme = this.settings.bgTheme || 'zinc';
    if (readerView) {
      if (bgTheme === 'oled') {
        readerView.style.backgroundColor = '#000000';
      } else if (bgTheme === 'sepia') {
        readerView.style.backgroundColor = '#181411';
      } else {
        readerView.style.backgroundColor = '#09090b';
      }
    }

    if (container) {
      container.style.maxWidth = `${this.settings.maxWidth || 800}px`;
      container.style.filter = `brightness(${this.settings.brightness || 100}%)`;
    }
    const widthSlider = document.getElementById('reader-setting-width');
    const brightSlider = document.getElementById('reader-setting-bright');
    if (widthSlider) widthSlider.value = this.settings.maxWidth || 800;
    if (brightSlider) brightSlider.value = this.settings.brightness || 100;
  },

  changeBgTheme(theme) {
    this.settings.bgTheme = theme;
    window.Storage.saveReaderSettings(this.settings);
    this.applyVisualSettings();
  },

  renderChapterActions() {
    const actionContainer = document.getElementById('reader-chapter-actions');
    if (!actionContainer) return;

    const manhwaId = this.currentManhwa.id;
    const chapNum = this.currentChapter.number;
    const likeData = window.Storage.getChapterLikes(manhwaId, chapNum);

    actionContainer.innerHTML = `
      <div class="max-w-[800px] mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl my-6">
        <div class="flex items-center gap-3">
          <button onclick="Reader.toggleLike()" class="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition transform active:scale-95 shadow ${likeData.liked ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'}">
            <span>${likeData.liked ? '❤️' : '🤍'}</span>
            <span>${likeData.count} Me gusta</span>
          </button>
          <span class="text-xs text-zinc-400">¿Te gustó el capítulo? ¡Apóyalo!</span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="Reader.downloadChapter()" class="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition">
            <span>📥 Descargar Cap.</span>
          </button>
          <button onclick="window.scrollTo({ top: 0, behavior: 'smooth' })" class="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs transition" title="Volver arriba">
            ▲ Inicio
          </button>
        </div>
      </div>
    `;
  },

  toggleLike() {
    window.Storage.toggleChapterLike(this.currentManhwa.id, this.currentChapter.number);
    this.renderChapterActions();
  },

  downloadChapter() {
    const pages = this.currentChapter.pages || [];
    if (pages.length === 0) return alert('No hay páginas para descargar');
    
    // Crear un archivo descargable con los links de las páginas para ver offline
    const content = `Capítulo ${this.currentChapter.number} - ${this.currentManhwa.title}\n\nPáginas:\n${pages.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentManhwa.id}-cap-${this.currentChapter.number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    alert('📥 Lista de páginas del capítulo guardada para lectura offline.');
  },

  changeWidth(val) {
    this.settings.maxWidth = Number(val);
    window.Storage.saveReaderSettings(this.settings);
    this.applyVisualSettings();
  },

  changeBrightness(val) {
    this.settings.brightness = Number(val);
    window.Storage.saveReaderSettings(this.settings);
    this.applyVisualSettings();
  },

  toggleSettingsPanel() {
    const panel = document.getElementById('reader-settings-panel');
    if (panel) panel.classList.toggle('hidden');
  },

  renderCommentsSection() {
    const container = document.getElementById('reader-comments-section');
    if (!container) return;

    const manhwaId = this.currentManhwa.id;
    const chapNum = this.currentChapter.number;
    const comments = window.Storage.getComments(manhwaId, chapNum);

    container.innerHTML = `
      <div class="max-w-[800px] mx-auto px-4 py-8 border-t border-zinc-800/80 mt-12 bg-zinc-900/40 rounded-2xl">
        <div class="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h3 class="font-black text-base text-white flex items-center gap-2">
            <span>💬 Comentarios del Capítulo ${chapNum}</span>
            <span class="px-2 py-0.5 text-xs font-mono rounded bg-purple-950 text-purple-300 border border-purple-800">${comments.length}</span>
          </h3>
          <span class="text-xs text-zinc-500">Comunidad en vivo</span>
        </div>

        <!-- Formulario para agregar comentario -->
        <div class="my-4 space-y-2">
          <div class="flex gap-2">
            <input type="text" id="comment-username-input" placeholder="Tu Apodo / Nickname" class="w-1/3 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
            <input type="text" id="comment-text-input" placeholder="¿Qué opinas de este capítulo? (No spoilers sin avisar)..." class="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
            <button onclick="Reader.postComment()" class="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs transition">
              Comentar
            </button>
          </div>
        </div>

        <!-- Lista de Comentarios -->
        <div class="space-y-3 mt-4">
          ${comments.map(c => `
            <div class="flex items-start gap-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80">
              <img src="${c.avatar}" class="w-8 h-8 rounded-full border border-purple-500/30 object-cover" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-xs text-purple-300">${c.user}</span>
                  <span class="text-[10px] text-zinc-500">${c.time}</span>
                </div>
                <p class="text-xs text-zinc-300 mt-1 leading-relaxed">${c.text}</p>
                <div class="mt-2 flex items-center gap-3">
                  <button onclick="Reader.likeComment('${c.id}')" class="text-[11px] text-zinc-400 hover:text-purple-400 flex items-center gap-1 transition ${c.liked ? 'text-purple-400 font-bold' : ''}">
                    👍 <span>${c.likes}</span>
                  </button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  postComment() {
    const user = document.getElementById('comment-username-input').value.trim();
    const text = document.getElementById('comment-text-input').value.trim();
    if (!text) return alert('Por favor escribe tu comentario');

    window.Storage.addComment(this.currentManhwa.id, this.currentChapter.number, user, text);
    this.renderCommentsSection();
  },

  likeComment(commentId) {
    window.Storage.toggleCommentLike(this.currentManhwa.id, this.currentChapter.number, commentId);
    this.renderCommentsSection();
  },

  renderWebtoonMode(container) {
    container.className = "flex flex-col items-center mx-auto transition-all duration-200 select-none";
    container.style.maxWidth = `${this.settings.maxWidth || 800}px`;

    const pages = this.currentChapter.pages || [];
    if (pages.length === 0) {
      container.innerHTML = `
        <div class="py-24 text-center text-zinc-400">
          <p class="text-xl font-medium">Este capítulo no tiene imágenes cargadas aún.</p>
          <button onclick="Reader.close()" class="mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg">Volver</button>
        </div>
      `;
      return;
    }

    pages.forEach((src, idx) => {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = "relative w-full bg-zinc-950 flex justify-center items-center overflow-hidden";
      imgWrapper.style.minHeight = "400px";

      // Skeleton loader
      const skeleton = document.createElement('div');
      skeleton.className = "absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center text-zinc-600 text-sm";
      skeleton.textContent = `Cargando página ${idx + 1}...`;
      imgWrapper.appendChild(skeleton);

      const img = document.createElement('img');
      img.src = src;
      img.alt = `${this.currentManhwa.title} - Cap ${this.currentChapter.number} - Pág ${idx + 1}`;
      img.loading = idx < 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.className = "w-full h-auto block align-middle opacity-0 transition-opacity duration-300 relative z-10";
      
      img.onload = () => {
        img.classList.remove('opacity-0');
        skeleton.remove();
        imgWrapper.style.minHeight = 'auto';
      };

      img.onerror = () => {
        skeleton.innerHTML = `<span class="text-red-400">⚠️ Error al cargar imagen ${idx + 1}</span>`;
      };

      imgWrapper.appendChild(img);
      container.appendChild(imgWrapper);
    });
  },

  renderPagedMode(container) {
    const pages = this.currentChapter.pages || [];
    container.className = "flex flex-col items-center justify-center min-h-[70vh] mx-auto";
    container.style.maxWidth = "800px";

    if (pages.length === 0) return;

    const currentSrc = pages[this.currentPageIndex];
    container.innerHTML = `
      <div class="relative w-full flex flex-col items-center cursor-pointer" onclick="Reader.nextPageOrChapter()">
        <img src="${currentSrc}" class="max-h-[85vh] w-auto object-contain rounded-md shadow-2xl" />
        <div class="mt-4 px-4 py-1.5 bg-zinc-800/80 rounded-full text-xs text-zinc-300 border border-zinc-700">
          Página ${this.currentPageIndex + 1} de ${pages.length} (Haz clic o usa flechas para avanzar)
        </div>
      </div>
    `;
  },

  updateNavigationButtons() {
    const chapters = this.currentManhwa.chapters;
    const currentNum = this.currentChapter.number;
    
    // Lista ordenada descendente
    const currentIndex = chapters.findIndex(c => c.number === currentNum);
    const hasNext = currentIndex > 0; // Porque el más nuevo está en index 0
    const hasPrev = currentIndex < chapters.length - 1;

    const prevBtn = document.getElementById('reader-prev-chapter-btn');
    const nextBtn = document.getElementById('reader-next-chapter-btn');

    if (prevBtn) {
      prevBtn.disabled = !hasPrev;
      prevBtn.onclick = () => {
        if (hasPrev) this.open(this.currentManhwa, chapters[currentIndex + 1].number);
      };
    }

    if (nextBtn) {
      nextBtn.disabled = !hasNext;
      nextBtn.onclick = () => {
        if (hasNext) this.open(this.currentManhwa, chapters[currentIndex - 1].number);
      };
    }
  },

  nextPageOrChapter() {
    if (this.settings.mode === 'paged') {
      const pages = this.currentChapter.pages || [];
      if (this.currentPageIndex < pages.length - 1) {
        this.currentPageIndex++;
        const container = document.getElementById('reader-images-container');
        this.renderPagedMode(container);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    // Siguiente capítulo
    const chapters = this.currentManhwa.chapters;
    const currentIndex = chapters.findIndex(c => c.number === this.currentChapter.number);
    if (currentIndex > 0) {
      this.open(this.currentManhwa, chapters[currentIndex - 1].number);
    }
  },

  prevPageOrChapter() {
    if (this.settings.mode === 'paged') {
      if (this.currentPageIndex > 0) {
        this.currentPageIndex--;
        const container = document.getElementById('reader-images-container');
        this.renderPagedMode(container);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }
    // Capítulo anterior
    const chapters = this.currentManhwa.chapters;
    const currentIndex = chapters.findIndex(c => c.number === this.currentChapter.number);
    if (currentIndex < chapters.length - 1) {
      this.open(this.currentManhwa, chapters[currentIndex + 1].number);
    }
  },

  toggleMode() {
    this.settings.mode = this.settings.mode === 'webtoon' ? 'paged' : 'webtoon';
    window.Storage.saveReaderSettings(this.settings);
    this.render();
  },

  toggleAutoScroll() {
    const btn = document.getElementById('reader-autoscroll-btn');
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
      if (btn) btn.classList.remove('bg-purple-600', 'text-white');
    } else {
      if (btn) btn.classList.add('bg-purple-600', 'text-white');
      this.autoScrollInterval = setInterval(() => {
        window.scrollBy({ top: 2, behavior: 'auto' });
      }, 20);
    }
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  },

  close() {
    if (this.autoScrollInterval) {
      clearInterval(this.autoScrollInterval);
      this.autoScrollInterval = null;
    }
    document.getElementById('reader-view').classList.add('hidden');
    // Volver a detalle
    window.App.showManhwaDetail(this.currentManhwa.id);
  }
};

window.Reader = Reader;
