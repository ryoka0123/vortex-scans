/**
 * Panel de Administración y CMS para Subir Manhwas y Capítulos
 */
const Admin = {
  editingManhwaId: null,

  init() {
    this.renderSeriesTable();
    this.populateSeriesSelect();
    this.bindEvents();
  },

  bindEvents() {
    // Formulario de Crear / Editar Manhwa
    const manhwaForm = document.getElementById('admin-manhwa-form');
    if (manhwaForm) {
      manhwaForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveManhwaFromForm();
      };
    }

    // Formulario de Subir Capítulo
    const chapterForm = document.getElementById('admin-chapter-form');
    if (chapterForm) {
      chapterForm.onsubmit = (e) => {
        e.preventDefault();
        this.saveChapterFromForm();
      };
    }

    // Preview de portada
    const coverInput = document.getElementById('admin-manhwa-cover');
    const coverPreview = document.getElementById('admin-cover-preview');
    if (coverInput && coverPreview) {
      coverInput.oninput = () => {
        coverPreview.src = coverInput.value || 'https://via.placeholder.com/300x450?text=Portada';
      };
    }

    // Auto-completar siguiente número de capítulo al seleccionar serie
    const seriesSelect = document.getElementById('admin-chapter-series-select');
    if (seriesSelect) {
      seriesSelect.onchange = () => {
        const manhwaId = seriesSelect.value;
        const manhwas = window.Storage.getAllManhwas();
        const m = manhwas.find(x => x.id === manhwaId);
        if (m && m.chapters && m.chapters.length > 0) {
          const maxNum = Math.max(...m.chapters.map(c => c.number));
          document.getElementById('admin-chapter-number').value = maxNum + 1;
        } else {
          document.getElementById('admin-chapter-number').value = 1;
        }
      };
    }

    // Manejo de carga de archivos locales para capítulo
    const fileInput = document.getElementById('admin-chapter-files');
    if (fileInput) {
      fileInput.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        // Ordenar archivos por nombre natural (ej. 01.jpg, 02.jpg)
        files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const statusText = document.getElementById('admin-upload-status');
        statusText.textContent = `Procesando ${files.length} imágenes locales...`;

        const promises = files.map(file => {
          return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
          });
        });

        Promise.all(promises).then(dataUrls => {
          const textArea = document.getElementById('admin-chapter-pages-text');
          textArea.value = dataUrls.join('\n');
          statusText.textContent = `✅ ${files.length} imágenes cargadas con éxito.`;
        });
      };
    }
  },

  populateSeriesSelect() {
    const select = document.getElementById('admin-chapter-series-select');
    if (!select) return;
    const manhwas = window.Storage.getAllManhwas();
    select.innerHTML = '<option value="">-- Selecciona una serie --</option>' + manhwas.map(m => `
      <option value="${m.id}">${m.title} (${m.type}) - Cap. Actual: ${m.latestChapter || 0}</option>
    `).join('');
  },

  renderSeriesTable() {
    const tbody = document.getElementById('admin-series-tbody');
    if (!tbody) return;
    const manhwas = window.Storage.getAllManhwas();

    if (manhwas.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-zinc-500">No hay series registradas</td></tr>`;
      return;
    }

    tbody.innerHTML = manhwas.map(m => `
      <tr class="border-b border-zinc-800 hover:bg-zinc-800/40 transition">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            <img src="${m.cover}" class="w-10 h-14 object-cover rounded shadow" />
            <div>
              <div class="font-bold text-white">${m.title}</div>
              <div class="text-xs text-zinc-400">${m.altTitles || ''}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 text-xs font-semibold rounded bg-purple-950 text-purple-300 border border-purple-800">
            ${m.type}
          </span>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 text-xs rounded ${m.status === 'En emisión' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-300'}">
            ${m.status}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-xs">
          <div class="text-purple-400 font-bold">${m.chapters ? m.chapters.length : 0} caps</div>
          ${m.chapters && m.chapters.filter(c => c.status === 'draft').length > 0 ? `
            <div class="text-[10px] text-amber-400 font-semibold flex items-center gap-1 mt-0.5">
              <span>🟡</span> ${m.chapters.filter(c => c.status === 'draft').length} oculto(s)
            </div>
          ` : ''}
          ${m.chapters && m.chapters.filter(c => c.status === 'scheduled').length > 0 ? `
            <div class="text-[10px] text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
              <span>⏰</span> ${m.chapters.filter(c => c.status === 'scheduled').length} prog.
            </div>
          ` : ''}
        </td>
        <td class="py-3 px-4 text-xs text-zinc-400">
          ${m.updatedAt || 'Reciente'}
        </td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button onclick="Admin.prepareAddChapter('${m.id}')" class="p-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white rounded text-xs transition" title="Subir Capítulo">
              + Cap
            </button>
            <button onclick="Admin.editManhwa('${m.id}')" class="p-1.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white rounded text-xs transition" title="Editar">
              ✏️
            </button>
            <button onclick="Admin.deleteManhwa('${m.id}')" class="p-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded text-xs transition" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  saveManhwaFromForm() {
    const title = document.getElementById('admin-manhwa-title').value.trim();
    if (!title) return alert('El título es obligatorio');

    const id = this.editingManhwaId || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const altTitles = document.getElementById('admin-manhwa-alt').value.trim();
    const type = document.getElementById('admin-manhwa-type').value;
    const status = document.getElementById('admin-manhwa-status').value;
    const author = document.getElementById('admin-manhwa-author').value.trim() || 'Desconocido';
    const artist = document.getElementById('admin-manhwa-artist').value.trim() || 'Desconocido';
    const rating = parseFloat(document.getElementById('admin-manhwa-rating').value) || 9.5;
    const cover = document.getElementById('admin-manhwa-cover').value.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80';
    const banner = document.getElementById('admin-manhwa-banner').value.trim() || cover;
    const synopsis = document.getElementById('admin-manhwa-synopsis').value.trim() || 'Sin sinopsis disponible.';
    const genresStr = document.getElementById('admin-manhwa-genres').value.trim();
    const genres = genresStr ? genresStr.split(',').map(g => g.trim()).filter(Boolean) : ["Acción", "Fantasía"];

    // Obtener existente para preservar capítulos
    const list = window.Storage.getAllManhwas();
    const existing = list.find(m => m.id === id);

    const manhwa = {
      id,
      title,
      altTitles,
      slug: id,
      type,
      status,
      author,
      artist,
      rating,
      views: existing ? existing.views : '1.2K',
      bookmarks: existing ? existing.bookmarks : '150',
      cover,
      banner,
      synopsis,
      genres,
      featured: document.getElementById('admin-manhwa-featured').checked,
      latestChapter: existing ? existing.latestChapter : 0,
      updatedAt: 'Hace un momento',
      chapters: existing ? existing.chapters : []
    };

    window.Storage.saveManhwa(manhwa);
    alert(this.editingManhwaId ? '¡Serie actualizada con éxito!' : '¡Nueva serie creada con éxito!');
    this.resetManhwaForm();
    this.renderSeriesTable();
    this.populateSeriesSelect();
    window.App.refreshData();
  },

  editManhwa(id) {
    const list = window.Storage.getAllManhwas();
    const m = list.find(x => x.id === id);
    if (!m) return;

    this.editingManhwaId = m.id;
    document.getElementById('admin-manhwa-title').value = m.title;
    document.getElementById('admin-manhwa-alt').value = m.altTitles || '';
    document.getElementById('admin-manhwa-type').value = m.type;
    document.getElementById('admin-manhwa-status').value = m.status;
    document.getElementById('admin-manhwa-author').value = m.author || '';
    document.getElementById('admin-manhwa-artist').value = m.artist || '';
    document.getElementById('admin-manhwa-rating').value = m.rating || 9.5;
    document.getElementById('admin-manhwa-cover').value = m.cover || '';
    document.getElementById('admin-manhwa-banner').value = m.banner || '';
    document.getElementById('admin-manhwa-synopsis').value = m.synopsis || '';
    document.getElementById('admin-manhwa-genres').value = (m.genres || []).join(', ');
    document.getElementById('admin-manhwa-featured').checked = !!m.featured;

    const preview = document.getElementById('admin-cover-preview');
    if (preview) preview.src = m.cover;

    document.getElementById('admin-manhwa-submit-btn').textContent = '💾 Actualizar Serie';
    document.getElementById('admin-manhwa-cancel-btn').classList.remove('hidden');

    // Desplazar suavemente al formulario
    document.getElementById('admin-manhwa-form').scrollIntoView({ behavior: 'smooth' });
  },

  resetManhwaForm() {
    this.editingManhwaId = null;
    document.getElementById('admin-manhwa-form').reset();
    document.getElementById('admin-manhwa-submit-btn').textContent = '+ Guardar Nueva Serie';
    document.getElementById('admin-manhwa-cancel-btn').classList.add('hidden');
    document.getElementById('admin-cover-preview').src = 'https://via.placeholder.com/300x450?text=Portada';
  },

  prepareAddChapter(manhwaId) {
    const select = document.getElementById('admin-chapter-series-select');
    if (select) {
      select.value = manhwaId;
      select.dispatchEvent(new Event('change'));
    }
    document.getElementById('admin-chapter-form').scrollIntoView({ behavior: 'smooth' });
  },

  toggleScheduleField(show) {
    const container = document.getElementById('admin-schedule-container');
    if (!container) return;
    if (show) {
      container.classList.remove('hidden');
    } else {
      container.classList.add('hidden');
    }
  },

  publishDraft(seriesId, chapterNumber) {
    const list = window.Storage.getAllManhwas();
    const item = list.find(m => m.id === seriesId);
    if (!item || !item.chapters) return;
    const chap = item.chapters.find(c => c.number === Number(chapterNumber));
    if (!chap) return;

    chap.status = 'published';
    chap.date = 'Hace un momento';
    chap.scheduledAt = null;

    // Actualizar latestChapter con los publicados
    const published = item.chapters.filter(c => c.status !== 'draft');
    if (published.length > 0) {
      item.latestChapter = Math.max(...published.map(c => c.number));
    }
    item.updatedAt = 'Hace un momento';

    window.Storage.saveManhwa(item);
    alert(`🎉 ¡El Capítulo ${chapterNumber} ahora es público y visible para todos los lectores!`);
    this.renderSeriesTable();
    window.App.refreshData();
    if (window.App.currentManhwa && window.App.currentManhwa.id === seriesId) {
      window.App.showManhwaDetail(seriesId);
    }
  },

  saveChapterFromForm() {
    const seriesId = document.getElementById('admin-chapter-series-select').value;
    if (!seriesId) return alert('Por favor selecciona una serie');

    const number = parseFloat(document.getElementById('admin-chapter-number').value);
    if (isNaN(number)) return alert('Ingresa un número de capítulo válido');

    const title = document.getElementById('admin-chapter-title').value.trim();
    const pagesText = document.getElementById('admin-chapter-pages-text').value.trim();

    if (!pagesText) return alert('Debes agregar al menos una URL de imagen o subir archivos');

    // Dividir URLs por línea
    const pages = pagesText.split('\n').map(l => l.trim()).filter(l => l.length > 5);

    if (pages.length === 0) return alert('No se encontraron imágenes válidas');

    // Estado de visibilidad (Public, Draft, Scheduled)
    const visibilityRadio = document.querySelector('input[name="chapter-visibility"]:checked');
    const visibility = visibilityRadio ? visibilityRadio.value : 'published';
    const scheduleDate = document.getElementById('admin-chapter-schedule-date')?.value || null;

    if (visibility === 'scheduled' && !scheduleDate) {
      return alert('Por favor selecciona la fecha y hora para el estreno automático programado.');
    }

    const chapter = {
      id: `${seriesId}-cap-${number}`,
      number,
      title: title || `Capítulo ${number}`,
      date: visibility === 'scheduled' ? `⏰ Estreno: ${new Date(scheduleDate).toLocaleDateString()}` : (visibility === 'draft' ? '🟡 Borrador' : 'Hace un momento'),
      status: visibility, // 'published' | 'draft' | 'scheduled'
      scheduledAt: visibility === 'scheduled' ? scheduleDate : null,
      pages
    };

    const success = window.Storage.addChapter(seriesId, chapter);
    if (success) {
      const msg = visibility === 'draft' 
        ? `🟡 ¡Capítulo ${number} guardado como BORRADOR OCULTO!\n\nLos visitantes normales NO lo verán. Solo tú como Administrador puedes verlo y revisarlo.`
        : (visibility === 'scheduled' 
            ? `⏰ ¡Capítulo ${number} PROGRAMADO con éxito!\n\nSe estrenará automáticamente el ${new Date(scheduleDate).toLocaleString()}.`
            : `✅ ¡Capítulo ${number} publicado con éxito (${pages.length} páginas)! Ya es visible para todo el público.`);
      alert(msg);

      document.getElementById('admin-chapter-form').reset();
      this.toggleScheduleField(false);
      document.getElementById('admin-upload-status').textContent = '';
      this.renderSeriesTable();
      this.populateSeriesSelect();
      window.App.refreshData();
    } else {
      alert('Error al guardar el capítulo');
    }
  },

  deleteManhwa(id) {
    if (confirm('¿Estás seguro de que deseas eliminar esta serie y todos sus capítulos?')) {
      window.Storage.deleteManhwa(id);
      this.renderSeriesTable();
      this.populateSeriesSelect();
      window.App.refreshData();
    }
  },

  // Generador de Secuencias Masivas ({01..50}.webp)
  openSequenceGenerator() {
    const pattern = prompt(
      "Ingresa el patrón de URL de las imágenes.\nUsa {num} donde va el número.\n\nEjemplo:\nhttps://mi-servidor.com/cap35/{num}.webp",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?page={num}"
    );
    if (!pattern) return;

    const start = parseInt(prompt("Número de inicio:", "1")) || 1;
    const end = parseInt(prompt("Número final (ej. 30 páginas):", "30")) || 30;
    const padWithZero = confirm("¿Quieres que los números menores a 10 tengan cero a la izquierda? (ej. 01, 02...)");

    const urls = [];
    for (let i = start; i <= end; i++) {
      const numStr = padWithZero && i < 10 ? `0${i}` : `${i}`;
      urls.push(pattern.replace('{num}', numStr));
    }

    const textarea = document.getElementById('admin-chapter-pages-text');
    if (textarea) {
      textarea.value = urls.join('\n');
      alert(`⚡ ¡${urls.length} URLs de imágenes generadas y listas en el formulario!`);
    }
  }
};

window.Admin = Admin;
