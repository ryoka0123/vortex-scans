/**
 * Gestor de Almacenamiento Local (Zero Server Load)
 * Guarda bookmarks, historial de lectura y mangas personalizados sin costo de servidor
 */
const Storage = {
  KEYS: {
    MANHWAS: 'vortex_custom_manhwas',
    BOOKMARKS: 'vortex_user_bookmarks',
    HISTORY: 'vortex_reading_history',
    THEME: 'vortex_app_theme',
    READER_SETTINGS: 'vortex_reader_settings'
  },

  // Obtener todos los Manhwas (combinando iniciales con los añadidos por el usuario)
  getAllManhwas() {
    try {
      const custom = JSON.parse(localStorage.getItem(this.KEYS.MANHWAS)) || [];
      const base = window.INITIAL_MANHWAS || [];
      // Catálogo publicado (data/catalog.json): es el que ven TODOS los visitantes del dominio
      const published = Array.isArray(window.PUBLISHED_CATALOG) ? window.PUBLISHED_CATALOG : [];
      
      // Combinar sin duplicados por ID. Prioridad: local (admin) > publicado > demo
      const map = new Map();
      base.forEach(m => map.set(m.id, m));
      published.forEach(m => map.set(m.id, m));
      custom.forEach(m => map.set(m.id, m));
      
      return Array.from(map.values());
    } catch (e) {
      console.error('Error cargando catálogo:', e);
      return window.INITIAL_MANHWAS || [];
    }
  },

  // Guardar o actualizar un Manhwa
  saveManhwa(manhwa) {
    try {
      const custom = JSON.parse(localStorage.getItem(this.KEYS.MANHWAS)) || [];
      const index = custom.findIndex(m => m.id === manhwa.id);
      
      if (index >= 0) {
        custom[index] = manhwa;
      } else {
        custom.unshift(manhwa);
      }
      
      localStorage.setItem(this.KEYS.MANHWAS, JSON.stringify(custom));
      return true;
    } catch (e) {
      console.error('Error guardando manhwa:', e);
      return false;
    }
  },

  // Añadir un nuevo capítulo a un Manhwa
  addChapter(manhwaId, chapter) {
    const list = this.getAllManhwas();
    const item = list.find(m => m.id === manhwaId);
    if (!item) return false;

    if (!item.chapters) item.chapters = [];
    
    // Evitar duplicado de número
    const existingIdx = item.chapters.findIndex(c => c.number === chapter.number);
    if (existingIdx >= 0) {
      item.chapters[existingIdx] = chapter;
    } else {
      item.chapters.unshift(chapter);
    }

    // Ordenar capítulos descendente
    item.chapters.sort((a, b) => b.number - a.number);
    item.latestChapter = item.chapters[0].number;
    item.updatedAt = 'Hace un momento';

    return this.saveManhwa(item);
  },

  // Eliminar un Manhwa
  deleteManhwa(manhwaId) {
    try {
      let custom = JSON.parse(localStorage.getItem(this.KEYS.MANHWAS)) || [];
      custom = custom.filter(m => m.id !== manhwaId);
      localStorage.setItem(this.KEYS.MANHWAS, JSON.stringify(custom));
      return true;
    } catch (e) {
      return false;
    }
  },

  // Marcadores (Favoritos)
  getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.BOOKMARKS)) || [];
    } catch (e) {
      return [];
    }
  },

  isBookmarked(manhwaId) {
    const bookmarks = this.getBookmarks();
    return bookmarks.includes(manhwaId);
  },

  toggleBookmark(manhwaId) {
    let bookmarks = this.getBookmarks();
    if (bookmarks.includes(manhwaId)) {
      bookmarks = bookmarks.filter(id => id !== manhwaId);
    } else {
      bookmarks.push(manhwaId);
    }
    localStorage.setItem(this.KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    return bookmarks.includes(manhwaId);
  },

  // Historial de Lectura
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.HISTORY)) || [];
    } catch (e) {
      return [];
    }
  },

  saveReadingProgress(manhwaId, chapterNumber, page = 1) {
    try {
      let history = this.getHistory();
      // Eliminar registro previo de este manhwa
      history = history.filter(h => h.manhwaId !== manhwaId);
      
      // Agregar al inicio
      history.unshift({
        manhwaId,
        chapterNumber,
        page,
        timestamp: new Date().toISOString()
      });

      // Limitar a los últimos 50 leídos
      if (history.length > 50) history.pop();
      localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(history));
    } catch (e) {
      console.error('Error guardando historial:', e);
    }
  },

  getLastReadChapter(manhwaId) {
    const history = this.getHistory();
    const entry = history.find(h => h.manhwaId === manhwaId);
    return entry ? entry.chapterNumber : null;
  },

  // Preferencias del Lector
  getReaderSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.READER_SETTINGS)) || {
        mode: 'webtoon', // 'webtoon' (cascada) o 'paged' (paginado)
        maxWidth: 800,
        brightness: 100,
        autoScrollSpeed: 2,
        bgTheme: 'zinc' // 'zinc', 'oled', 'sepia'
      };
    } catch (e) {
      return { mode: 'webtoon', maxWidth: 800, brightness: 100, autoScrollSpeed: 2, bgTheme: 'zinc' };
    }
  },

  saveReaderSettings(settings) {
    localStorage.setItem(this.KEYS.READER_SETTINGS, JSON.stringify(settings));
  },

  // Sistema de Calificaciones de Usuario (1 a 10 estrellas)
  getUserRating(manhwaId) {
    try {
      const ratings = JSON.parse(localStorage.getItem('vortex_user_ratings')) || {};
      return ratings[manhwaId] || null;
    } catch (e) {
      return null;
    }
  },

  saveUserRating(manhwaId, rating) {
    try {
      const ratings = JSON.parse(localStorage.getItem('vortex_user_ratings')) || {};
      ratings[manhwaId] = Number(rating);
      localStorage.setItem('vortex_user_ratings', JSON.stringify(ratings));
      return true;
    } catch (e) {
      return false;
    }
  },

  // Likes en Capítulos (estilo Webtoon)
  getChapterLikes(manhwaId, chapterNum) {
    const key = `vortex_chap_likes_${manhwaId}_${chapterNum}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || { count: 142, liked: false };
    } catch (e) {
      return { count: 142, liked: false };
    }
  },

  toggleChapterLike(manhwaId, chapterNum) {
    const key = `vortex_chap_likes_${manhwaId}_${chapterNum}`;
    const data = this.getChapterLikes(manhwaId, chapterNum);
    if (data.liked) {
      data.count = Math.max(0, data.count - 1);
      data.liked = false;
    } else {
      data.count += 1;
      data.liked = true;
    }
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },

  // Sistema de Comentarios por Capítulo (100% en cliente o API)
  getComments(manhwaId, chapterNum) {
    const key = `vortex_comments_${manhwaId}_${chapterNum}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
      
      // Comentarios de prueba realistas para el primer capítulo
      return [
        {
          id: 'c1',
          user: 'ShadowMonarch_99',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          text: '¡Hermano, este capítulo estuvo increíble! El dibujo en la última viñeta es una obra de arte 🔥🔥',
          time: 'Hace 2 horas',
          likes: 24,
          liked: false
        },
        {
          id: 'c2',
          user: 'Valen_Webtoon',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
          text: 'Gracias al grupo por la traducción rápida. La calidad de imagen en esta web es superior a cualquier otra ❤️',
          time: 'Hace 45 minutos',
          likes: 15,
          liked: false
        }
      ];
    } catch (e) {
      return [];
    }
  },

  addComment(manhwaId, chapterNum, user, text) {
    const key = `vortex_comments_${manhwaId}_${chapterNum}`;
    const comments = this.getComments(manhwaId, chapterNum);
    const newComment = {
      id: 'c_' + Date.now(),
      user: user || 'Lector_Anónimo',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user || 'lector')}`,
      text,
      time: 'Hace un momento',
      likes: 1,
      liked: true
    };
    comments.unshift(newComment);
    localStorage.setItem(key, JSON.stringify(comments));
    return comments;
  },

  toggleCommentLike(manhwaId, chapterNum, commentId) {
    const key = `vortex_comments_${manhwaId}_${chapterNum}`;
    const comments = this.getComments(manhwaId, chapterNum);
    const c = comments.find(x => x.id === commentId);
    if (c) {
      if (c.liked) {
        c.likes = Math.max(0, c.likes - 1);
        c.liked = false;
      } else {
        c.likes += 1;
        c.liked = true;
      }
      localStorage.setItem(key, JSON.stringify(comments));
    }
    return comments;
  },

  // Exportar / Importar Base de Datos
  exportCatalogJSON() {
    const data = this.getAllManhwas();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manhwahub-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importCatalogJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        localStorage.setItem(this.KEYS.MANHWAS, JSON.stringify(parsed));
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
};

window.Storage = Storage;
