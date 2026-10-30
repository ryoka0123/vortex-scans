(function(){
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const PRESET_GIFS = [
    { title: 'Jinwoo Hype', tag: '🔥 Hype', url: '/assets/gifs/hype.gif' },
    { title: 'Modo Cine Palomitas', tag: '🍿 Cine', url: '/assets/gifs/popcorn.gif' },
    { title: 'Anya Shock', tag: '😱 Shock', url: '/assets/gifs/shock.gif' },
    { title: 'Llorando de emoción', tag: '😭 Llorar', url: '/assets/gifs/crying.gif' },
    { title: 'Risa Anime', tag: '🤣 Risa', url: '/assets/gifs/laugh.gif' },
    { title: 'Fuego y Poder', tag: '⚡ Fuego', url: '/assets/gifs/fire.gif' },
    { title: 'Pulgar Arriba Like', tag: '👍 Genial', url: '/assets/gifs/like.gif' }
  ];

  const EMOJI_OPTIONS = ['👍', '❤️', '🔥', '😂', '💀', '🤯', '👏', '😭'];

  function timeAgo(dateString){
    const d = new Date(dateString);
    if(Number.isNaN(d.getTime())) return '';
    const now = new Date();
    const sec = Math.floor((now - d) / 1000);
    if(sec < 45) return 'Hace un momento';
    if(sec < 3600) return `Hace ${Math.floor(sec / 60)} min`;
    if(sec < 86400) return `Hace ${Math.floor(sec / 3600)} h`;
    if(sec < 86400 * 7) return `Hace ${Math.floor(sec / 86400)} d`;
    return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  }

  // Local storage reaction store helper
  function getStoredUserReactions(commentId){
    try{
      const all = JSON.parse(localStorage.getItem('angelscan_comment_reacts') || '{}');
      return Array.isArray(all[commentId]) ? all[commentId] : [];
    }catch{ return []; }
  }
  function setStoredUserReactions(commentId, list){
    try{
      const all = JSON.parse(localStorage.getItem('angelscan_comment_reacts') || '{}');
      if(list && list.length) all[commentId] = list;
      else delete all[commentId];
      localStorage.setItem('angelscan_comment_reacts', JSON.stringify(all));
    }catch{}
  }

  // Global Lightbox for comment images and GIFs
  window.openCommentMediaModal = function(url){
    if(!url) return;
    let modal = document.getElementById('comment-media-modal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'comment-media-modal';
      modal.className = 'comment-media-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Visualizador de imagen o GIF');
      modal.innerHTML = `
        <div class="media-modal-backdrop" id="media-modal-backdrop"></div>
        <div class="media-modal-dialog">
          <button type="button" class="media-modal-close" id="media-modal-close" aria-label="Cerrar vista previa">✕</button>
          <div class="media-modal-viewport">
            <img id="media-modal-target" src="" alt="Imagen o GIF adjunto en comentario" />
          </div>
          <div class="media-modal-footer">
            <a id="media-modal-link" href="" target="_blank" rel="noopener noreferrer" class="quiet-pill">Abrir en pestaña nueva ↗</a>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const close = () => { modal.hidden = true; document.body.style.overflow = ''; };
      modal.querySelector('#media-modal-close').onclick = close;
      modal.querySelector('#media-modal-backdrop').onclick = close;
      window.addEventListener('keydown', e => { if(e.key === 'Escape' && !modal.hidden) close(); });
    }

    const img = modal.querySelector('#media-modal-target');
    const link = modal.querySelector('#media-modal-link');
    img.src = url;
    link.href = url;
    if(url.startsWith('data:')){
      link.style.display = 'none';
    }else{
      link.style.display = 'inline-flex';
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  window.seriesCommentsMarkup = (id, title, isReader = false) => `
    <section id="series-comments" class="series-comments ${isReader ? 'in-reader' : ''}" data-series="${escape(id)}" aria-labelledby="comments-heading">
      <div class="reader-reactions-block" id="chapter-reactions-box">
        <div class="reactions-buttons-row" id="reactions-container"></div>
      </div>
      <div class="reactions-comments-divider"></div>
      <div class="section-title">
        <div>
          <p class="eyebrow">LA CONVERSACIÓN DE ESTA HISTORIA</p>
          <h2 id="comments-heading">Comentarios <span class="comments-count-pill" id="comments-count"></span></h2>
        </div>
      </div>
      <p class="muted comments-intro">Comenta sobre ${escape(title)}. Evita spoilers y respeta a los demás lectores. Puedes reaccionar y adjuntar GIFs o imágenes.</p>
      
      <form id="comment-form" class="comment-form">
        <div id="comment-user-box" class="comment-user-box"></div>
        <label for="comment-text">Tu comentario
          <textarea id="comment-text" name="text" rows="3" maxlength="2000" placeholder="¿Qué te está pareciendo esta historia? (Escribe o añade un GIF / imagen)"></textarea>
        </label>

        <!-- Media preview box -->
        <div id="comment-media-preview" class="comment-media-preview" hidden>
          <div class="media-preview-card">
            <div class="media-preview-thumb-wrap">
              <img id="comment-media-preview-img" src="" alt="Vista previa de GIF o imagen" />
            </div>
            <div class="media-preview-meta">
              <span class="media-badge" id="comment-media-badge">GIF / Imagen</span>
              <button type="button" class="media-remove-btn" id="comment-media-remove" title="Quitar archivo adjunto">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span>Quitar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Media tools toolbar -->
        <div class="comment-media-toolbar">
          <div class="comment-media-actions">
            <input type="file" id="comment-file-input" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif" style="display:none;" />
            <button type="button" class="comment-action-pill" id="comment-upload-btn" title="Subir GIF o imagen desde tu dispositivo">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span>Subir Imagen / GIF</span>
            </button>
            <button type="button" class="comment-action-pill" id="comment-url-btn" title="Adjuntar GIF o imagen mediante enlace web">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              <span>Enlace</span>
            </button>
            <button type="button" class="comment-action-pill highlight" id="comment-gif-btn" title="Elegir GIFs de reacción rápida">
              <span class="gif-tag-mini">GIF</span>
              <span>Reacciones GIF</span>
            </button>
          </div>
          <div class="comment-toolbar-tip">Puedes pegar capturas o imágenes con Ctrl+V</div>
        </div>

        <!-- URL Input drawer -->
        <div class="comment-url-drawer" id="comment-url-drawer" hidden>
          <div class="url-drawer-inner">
            <input type="url" id="comment-url-field" placeholder="Pega el enlace directo del GIF o imagen (https://...)" />
            <button type="button" class="primary-mini" id="comment-url-confirm">Adjuntar</button>
            <button type="button" class="ghost-mini" id="comment-url-cancel">Cancelar</button>
          </div>
        </div>

        <!-- Preset GIFs drawer -->
        <div class="comment-gif-drawer" id="comment-gif-drawer" hidden>
          <div class="gif-drawer-header">
            <div class="gif-drawer-header-title">
              <span class="gif-tag-mini">GIF</span>
              <strong>GIFs Populares de Reacción</strong>
            </div>
            <button type="button" class="ghost-mini" id="comment-gif-close" aria-label="Cerrar selector de GIFs">✕</button>
          </div>
          <div class="gif-drawer-grid" id="gif-drawer-grid"></div>
        </div>

        <div class="comment-form-footer">
          <div id="comment-feedback" class="comment-feedback-slot" role="status" aria-live="polite"></div>
          <span id="comment-counter" class="comment-char-counter">0 / 2000</span>
          <button type="submit" class="primary" id="post-comment">Publicar comentario →</button>
        </div>
      </form>

      <div id="comments-list" class="comments-list" aria-live="polite">
        <p class="muted comments-loading">Cargando comentarios…</p>
      </div>
      <button type="button" class="secondary comments-more" id="comments-more" hidden>Ver más comentarios</button>
    </section>
  `;

  window.mountSeriesComments = function(id, chapterNum = 'series'){
    const section = document.getElementById('series-comments');
    if(!section) return;

    if(window.renderReactions) window.renderReactions(id, chapterNum || 'series');

    const find = s => section.querySelector(s);
    const form = find('#comment-form');
    let items = [], next = null, loading = false;
    let attachedMedia = null;
    let feedbackTimer = null;

    function renderCommentUserBox(){
      const box = find('#comment-user-box');
      if(!box) return;
      const user = window.currentUser;
      if(user && user.username){
        const isAdmin = user.role === 'admin';
        box.innerHTML = `
          <div class="comment-author-badge">
            <div class="comment-author-avatar" aria-hidden="true">${escape([...user.username][0]?.toUpperCase()||'U')}</div>
            <div class="comment-author-info">
              <div class="comment-author-name">
                <strong>${escape(user.username)}</strong>
                ${isAdmin ? '<span class="comment-team">Equipo AngelScan</span>' : '<span class="comment-badge verified">✓ Verificado</span>'}
              </div>
              <span class="comment-author-meta">Comentando con tu cuenta activa</span>
            </div>
            <input id="comment-name" name="name" type="hidden" value="${escape(user.username)}">
          </div>
        `;
      }else{
        let savedName = '';
        try{ savedName = localStorage.getItem('angelscan-comment-name') || ''; }catch{}
        box.innerHTML = `
          <div class="comment-guest-wrap">
            <div class="comment-guest-label">
              <label for="comment-name">Tu nombre de lector</label>
              <span class="guest-login-invite">¿Tienes cuenta? <a href="javascript:void(0)" onclick="openAuthModal('login')">Entrar</a></span>
            </div>
            <input id="comment-name" name="name" type="text" autocomplete="nickname" minlength="2" maxlength="40" required placeholder="¿Cómo te llamas?" value="${escape(savedName)}">
          </div>
        `;
      }
    }
    window.renderCommentUserBox = renderCommentUserBox;
    renderCommentUserBox();

    // Auto-dismissing feedback notifications
    function showFeedback(msg, type = 'info'){
      const fb = find('#comment-feedback');
      if(!fb) return;
      clearTimeout(feedbackTimer);
      if(!msg){
        fb.innerHTML = '';
        return;
      }
      const icon = type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️');
      fb.innerHTML = `<span class="feedback-badge ${type}">${icon} ${escape(msg)}</span>`;
      if(type === 'success'){
        feedbackTimer = setTimeout(() => {
          if(fb) fb.innerHTML = '';
        }, 4500);
      }
    }

    // Media preview controls
    const previewContainer = find('#comment-media-preview');
    const previewImg = find('#comment-media-preview-img');
    const previewBadge = find('#comment-media-badge');
    const fileInput = find('#comment-file-input');
    const uploadBtn = find('#comment-upload-btn');
    const urlBtn = find('#comment-url-btn');
    const urlDrawer = find('#comment-url-drawer');
    const urlField = find('#comment-url-field');
    const urlConfirm = find('#comment-url-confirm');
    const urlCancel = find('#comment-url-cancel');
    const gifBtn = find('#comment-gif-btn');
    const gifDrawer = find('#comment-gif-drawer');
    const gifClose = find('#comment-gif-close');
    const gifGrid = find('#gif-drawer-grid');
    const removeMediaBtn = find('#comment-media-remove');
    const textarea = find('#comment-text');

    function setMedia(src, badgeText){
      attachedMedia = src;
      if(previewImg) previewImg.src = src;
      if(previewBadge) previewBadge.textContent = badgeText || (src.startsWith('data:image/gif') || /\.gif(\?|$)/i.test(src) ? 'GIF adjunto' : 'Imagen adjunta');
      if(previewContainer) previewContainer.hidden = false;
      showFeedback('');
    }

    function clearMedia(){
      attachedMedia = null;
      if(previewImg) previewImg.src = '';
      if(previewContainer) previewContainer.hidden = true;
      if(fileInput) fileInput.value = '';
    }

    if(removeMediaBtn) removeMediaBtn.onclick = clearMedia;

    if(uploadBtn && fileInput){
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = e => {
        const file = e.target.files && e.target.files[0];
        if(!file) return;
        if(!file.type.match(/^image\/(png|jpeg|jpg|webp|gif)$/i)){
          showFeedback('Formato no compatible. Sube una imagen en formato PNG, JPG, WEBP o GIF.', 'error');
          return;
        }
        if(file.size > 8 * 1024 * 1024){
          showFeedback('La imagen o GIF supera el límite de 8 MB.', 'error');
          return;
        }
        const reader = new FileReader();
        reader.onload = ev => {
          setMedia(ev.target.result, file.type.includes('gif') ? 'GIF subido' : 'Imagen subida');
          urlDrawer.hidden = true;
          gifDrawer.hidden = true;
        };
        reader.onerror = () => showFeedback('Error al leer el archivo seleccionado.', 'error');
        reader.readAsDataURL(file);
      };
    }

    if(urlBtn && urlDrawer){
      urlBtn.onclick = () => {
        gifDrawer.hidden = true;
        urlDrawer.hidden = !urlDrawer.hidden;
        if(!urlDrawer.hidden && urlField) urlField.focus();
      };
    }

    if(urlCancel && urlDrawer){
      urlCancel.onclick = () => { urlDrawer.hidden = true; };
    }

    if(urlConfirm && urlField){
      const handleUrlSubmit = () => {
        const val = urlField.value.trim();
        if(!/^https?:\/\//i.test(val)){
          showFeedback('Ingresa un enlace web válido que empiece con https://', 'error');
          return;
        }
        setMedia(val, /\.gif(\?|$)/i.test(val) ? 'GIF por enlace' : 'Imagen por enlace');
        urlField.value = '';
        urlDrawer.hidden = true;
      };
      urlConfirm.onclick = handleUrlSubmit;
      urlField.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); handleUrlSubmit(); } };
    }

    if(gifBtn && gifDrawer){
      gifBtn.onclick = () => {
        urlDrawer.hidden = true;
        gifDrawer.hidden = !gifDrawer.hidden;
        if(!gifDrawer.hidden && gifGrid && !gifGrid.children.length){
          gifGrid.innerHTML = PRESET_GIFS.map((g, idx) => `
            <button type="button" class="gif-drawer-item" data-idx="${idx}" title="${escape(g.title)}">
              <img src="${escape(g.url)}" alt="${escape(g.title)}" loading="lazy" />
              <span class="gif-item-tag">${escape(g.tag)}</span>
            </button>
          `).join('');
          gifGrid.querySelectorAll('.gif-drawer-item').forEach(btn => {
            btn.onclick = () => {
              const idx = Number(btn.dataset.idx);
              const item = PRESET_GIFS[idx];
              if(item){
                setMedia(item.url, 'GIF: ' + item.tag);
                gifDrawer.hidden = true;
              }
            };
          });
        }
      };
    }

    if(gifClose && gifDrawer){
      gifClose.onclick = () => { gifDrawer.hidden = true; };
    }

    // Ctrl+V paste image support on textarea
    if(textarea){
      textarea.addEventListener('paste', e => {
        const clipItems = (e.clipboardData || window.clipboardData)?.items;
        if(!clipItems) return;
        for(const item of clipItems){
          if(item.type && item.type.startsWith('image/')){
            const blob = item.getAsFile();
            if(blob){
              if(blob.size > 8 * 1024 * 1024){
                showFeedback('La imagen pegada supera el límite de 8 MB.', 'error');
                return;
              }
              const reader = new FileReader();
              reader.onload = ev => {
                setMedia(ev.target.result, blob.type.includes('gif') ? 'GIF pegado' : 'Imagen pegada');
              };
              reader.readAsDataURL(blob);
              e.preventDefault();
              break;
            }
          }
        }
      });
    }

    const endpoint = `series/${encodeURIComponent(id)}/comments`;

    async function request(path, method = 'GET', body){
      const response = await fetch('/api/' + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json();
      if(!response.ok) throw Error(data.error || 'No se pudo completar la acción');
      return data;
    }

    // Reaction handler for individual comments
    async function handleCommentReaction(commentId, emoji){
      const userList = getStoredUserReactions(commentId);
      const alreadyReacted = userList.includes(emoji);
      const action = alreadyReacted ? 'remove' : 'add';

      // Optimistic client update
      const comment = items.find(c => c.id === commentId);
      if(!comment) return;
      if(!comment.reactions || typeof comment.reactions !== 'object') comment.reactions = {};
      const current = Number(comment.reactions[emoji]) || 0;
      const nextVal = Math.max(0, current + (alreadyReacted ? -1 : 1));
      if(nextVal === 0) delete comment.reactions[emoji];
      else comment.reactions[emoji] = nextVal;

      const nextUserList = alreadyReacted ? userList.filter(e => e !== emoji) : [...userList, emoji];
      setStoredUserReactions(commentId, nextUserList);
      render();

      try{
        const res = await request(`series/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}/react`, 'POST', { emoji, action });
        if(res && res.reactions){
          comment.reactions = res.reactions;
          render();
        }
      }catch(err){
        console.error('Error reacting to comment:', err);
        setStoredUserReactions(commentId, userList);
        load(false);
      }
    }

    // Close reaction popups when clicking outside
    document.addEventListener('click', e => {
      if(!e.target.closest('.comment-react-popover-wrap')){
        section.querySelectorAll('.comment-emoji-popup').forEach(p => p.hidden = true);
      }
    });

    function render(){
      if(!section.isConnected) return;
      const list = find('#comments-list');
      if(!items.length){
        list.innerHTML = `
          <div class="comments-empty">
            <div class="comments-empty-icon">💬</div>
            <h3>Sé el primero en iniciar la conversación</h3>
            <p class="muted">Comparte tus teorías, reacciones o adjunta un GIF de este capítulo.</p>
          </div>
        `;
        find('#comments-more').hidden = true;
        return;
      }

      list.innerHTML = items.map(c => {
        const userReactions = getStoredUserReactions(c.id);
        const reactionsObj = c.reactions || {};
        const activeReactionEntries = Object.entries(reactionsObj).filter(([_, count]) => count > 0);

        return `
          <article class="comment-entry" data-comment="${escape(c.id)}">
            <div class="comment-avatar" aria-hidden="true">${escape([...c.name][0]?.toUpperCase() || 'L')}</div>
            <div class="comment-body">
              <header class="comment-header">
                <div class="comment-author-wrap">
                  <strong class="comment-author-name">${escape(c.name)}</strong>
                  ${c.team ? '<span class="comment-badge team">Equipo AngelScan</span>' : (c.registered ? '<span class="comment-badge verified" title="Lector verificado">✓ Verificado</span>' : '<span class="comment-badge guest">Lector</span>')}
                  <span class="comment-dot">·</span>
                  <time class="comment-time" datetime="${escape(c.createdAt)}" title="${escape(new Date(c.createdAt).toLocaleString())}">${escape(timeAgo(c.createdAt))}</time>
                </div>
                ${typeof authenticated !== 'undefined' && authenticated ? `
                  <button type="button" class="comment-remove" data-remove-comment="${escape(c.id)}" aria-label="Eliminar comentario de ${escape(c.name)}">Eliminar</button>
                ` : ''}
              </header>

              ${c.text ? `<p class="comment-text">${escape(c.text)}</p>` : ''}

              ${c.image ? `
                <div class="comment-media-display">
                  <div class="comment-media-frame" data-media="${escape(c.image)}" role="button" tabindex="0" title="Clic para ampliar GIF o imagen">
                    <img src="${escape(c.image)}" alt="Adjunto de ${escape(c.name)}" class="comment-attached-media" loading="lazy" onerror="this.onerror=null; this.closest('.comment-media-display').innerHTML='<span class=\\'media-broken-tag\\'>⚠️ Imagen o GIF no disponible</span>';" />
                    <span class="media-zoom-pill">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
                      Ampliar
                    </span>
                  </div>
                </div>
              ` : ''}

              <!-- Reactions Bar -->
              <footer class="comment-reactions-bar">
                <div class="comment-reaction-chips">
                  ${activeReactionEntries.map(([emoji, count]) => {
                    const hasUserReacted = userReactions.includes(emoji);
                    return `
                      <button type="button" class="comment-reaction-chip ${hasUserReacted ? 'user-reacted' : ''}" data-comment-id="${escape(c.id)}" data-emoji="${escape(emoji)}" title="${hasUserReacted ? 'Quitar tu reacción' : 'Reaccionar con ' + escape(emoji)}">
                        <span class="cr-emoji">${escape(emoji)}</span>
                        <span class="cr-count">${count}</span>
                      </button>
                    `;
                  }).join('')}
                </div>

                <div class="comment-react-popover-wrap">
                  <button type="button" class="comment-react-add-btn" data-toggle-picker="${escape(c.id)}" title="Reaccionar a este comentario">
                    <span class="react-smiley-icon">😊</span>
                    <span>Reaccionar</span>
                  </button>
                  <div class="comment-emoji-popup" id="emoji-popup-${escape(c.id)}" hidden>
                    ${EMOJI_OPTIONS.map(emoji => `
                      <button type="button" class="emoji-quick-btn ${userReactions.includes(emoji) ? 'active' : ''}" data-comment-id="${escape(c.id)}" data-emoji="${emoji}" title="${emoji}">
                        ${emoji}
                      </button>
                    `).join('')}
                  </div>
                </div>
              </footer>
            </div>
          </article>
        `;
      }).join('');

      // Bind reaction chips
      list.querySelectorAll('.comment-reaction-chip').forEach(btn => {
        btn.onclick = () => {
          handleCommentReaction(btn.dataset.commentId, btn.dataset.emoji);
        };
      });

      // Bind "+ Reaccionar" popover toggle
      list.querySelectorAll('[data-toggle-picker]').forEach(btn => {
        btn.onclick = e => {
          e.stopPropagation();
          const cid = btn.dataset.togglePicker;
          const popup = list.querySelector('#emoji-popup-' + cid);
          if(!popup) return;
          const isHidden = popup.hidden;
          // Close all open emoji popups first
          list.querySelectorAll('.comment-emoji-popup').forEach(p => p.hidden = true);
          popup.hidden = !isHidden;
        };
      });

      // Bind emoji buttons inside popover
      list.querySelectorAll('.emoji-quick-btn').forEach(btn => {
        btn.onclick = e => {
          e.stopPropagation();
          const cid = btn.dataset.commentId;
          const emoji = btn.dataset.emoji;
          const popup = list.querySelector('#emoji-popup-' + cid);
          if(popup) popup.hidden = true;
          handleCommentReaction(cid, emoji);
        };
      });

      // Click to enlarge comment media
      list.querySelectorAll('.comment-media-frame').forEach(frame => {
        const src = frame.dataset.media;
        if(src){
          frame.onclick = () => window.openCommentMediaModal(src);
          frame.onkeydown = e => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.openCommentMediaModal(src); } };
        }
      });

      // Moderator remove button
      list.querySelectorAll('[data-remove-comment]').forEach(button => {
        button.onclick = async () => {
          if(!confirm('¿Eliminar este comentario?')) return;
          button.disabled = true;
          try{
            await request(endpoint + '?commentId=' + encodeURIComponent(button.dataset.removeComment), 'DELETE');
            await load(false);
          }catch(e){
            showFeedback(e.message, 'error');
            button.disabled = false;
          }
        };
      });

      find('#comments-more').hidden = !next;
    }

    async function load(more = false){
      if(loading) return;
      loading = true;
      find('#comments-more').disabled = true;
      try{
        const data = await request(endpoint + (more && next ? '?before=' + encodeURIComponent(next) : ''));
        if(!section.isConnected) return false;
        items = more ? [...new Map([...items, ...data.items].map(c => [c.id, c])).values()] : data.items;
        next = data.next;
        const countPill = find('#comments-count');
        if(countPill) countPill.textContent = '(' + data.total + ')';
        render();
        return true;
      }catch(e){
        if(!section.isConnected) return false;
        showFeedback(e.message, 'error');
        if(!more){
          find('#comments-list').innerHTML = '<button type="button" class="secondary" id="comments-retry">Reintentar carga de comentarios</button>';
          find('#comments-retry').onclick = () => load(false);
        }
        return false;
      }finally{
        loading = false;
        if(section.isConnected) find('#comments-more').disabled = false;
      }
    }

    if(textarea){
      textarea.oninput = e => {
        find('#comment-counter').textContent = e.target.value.length + ' / 2000';
      };
    }

    find('#comments-more').onclick = () => load(true);

    form.onsubmit = async e => {
      e.preventDefault();
      const nameInput = find('#comment-name');
      const name = (window.currentUser?.username || nameInput?.value || '').trim();
      const text = textarea ? textarea.value.trim() : '';

      if(!window.currentUser && name.length < 2){
        showFeedback('Escribe tu nombre de lector antes de publicar.', 'error');
        return;
      }
      if(!text && !attachedMedia){
        showFeedback('Escribe un comentario o adjunta un GIF o imagen.', 'error');
        return;
      }

      find('#post-comment').disabled = true;
      showFeedback('Publicando comentario…', 'info');
      try{
        await request(endpoint, 'POST', { name, text, image: attachedMedia || '' });
        if(!section.isConnected) return;
        if(!window.currentUser){
          try{ localStorage.setItem('angelscan-comment-name', name); }catch{}
        }
        if(textarea) textarea.value = '';
        find('#comment-counter').textContent = '0 / 2000';
        clearMedia();
        if(urlDrawer) urlDrawer.hidden = true;
        if(gifDrawer) gifDrawer.hidden = true;
        const refreshed = await load(false);
        if(section.isConnected && refreshed) showFeedback('¡Tu comentario fue publicado con éxito!', 'success');
      }catch(e){
        if(section.isConnected) showFeedback(e.message, 'error');
      }finally{
        if(section.isConnected) find('#post-comment').disabled = false;
      }
    };

    load(false);
  };
})();
