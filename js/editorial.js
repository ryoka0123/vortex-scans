const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let series=[], authenticated=false, currentUser=null, current=null, draft=null, chapterIndex=-1, filter='Todos', query='', order='updated', adminQuery='';
const favorites=()=>JSON.parse(localStorage.getItem('vortex-favorites')||'[]');
const image=s=>/^(https?:\/\/|data:image\/(png|jpeg|webp|gif);base64,|\/assets\/[a-z0-9-]+\.(?:svg|webp|png|jpg)$)/.test(s||'')?esc(s):'';
const newestFirst=(a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0);
const count=n=>new Intl.NumberFormat('es',{notation:'compact'}).format(Number(n)||0);
const cover=(m,cls='')=>`<img class="${cls}" src="${image(m.cover)}" alt="Portada de ${esc(m.title)}" style="object-position:${m.id==='solo-leveling-ragnarok'?'78% center':'center'}" loading="lazy" onerror="this.style.opacity='.15'">`;
async function api(url,method='GET',body){const r=await fetch('/api/'+url,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok){if(r.status===401)authenticated=false;throw Error(data.error);}return data;}
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');setTimeout(()=>$('#toast').classList.remove('visible'),3500);}
function bind(selector,event,fn){document.querySelectorAll(selector).forEach(el=>el.addEventListener(event,fn));}
function cards(list){return list.map(m=>`<article class="series-card"><a class="series-card-link" href="#series/${m.id}"><div class="cover-wrap">${cover(m)}<span class="type-tag">${esc(m.type)}</span><span class="cover-arrow">↗</span></div><p class="card-meta">${esc(m.genres?.[0]||m.type)} <span>★ ${esc(m.rating||'—')}</span></p><h3>${esc(m.title)}</h3><p class="muted">${m.chapters.length?`Capítulo ${m.latestChapter}`:'Próximamente'} <span class="status-dot"></span></p></a><div class="card-chapters">${[...m.chapters].sort((a,b)=>b.number-a.number).slice(0,2).map(c=>`<a href="#read/${m.id}/${c.number}"><span>Capítulo ${c.number}</span><span>Leer ↗</span></a>`).join('')}</div></article>`).join('')||'<div class="empty"><h3>Aún no hay historias aquí.</h3><p>Prueba otra búsqueda o explora todos los títulos.</p></div>';}
function detail(id){const m=series.find(m=>m.id===id);if(!m)return missing();current=m;api(`series/${id}/view`,'POST',{}).then(v=>m.views=v.views).catch(()=>{});const history=JSON.parse(localStorage.getItem('vortex-progress')||'{}')[id];$('#app').innerHTML=`<a class="back" href="#home">← Volver a explorar</a><section class="detail"><div>${cover(m,'detail-cover')}</div><div><p class="eyebrow"><a class="type-link" href="#catalog?type=${encodeURIComponent(m.type)}">${esc(m.type)}</a> / ${esc(m.status)}</p><h1>${esc(m.title)}</h1><p class="muted">${esc(m.altTitles||'')}</p><div class="tags">${genreTags(m.genres)}</div><p class="synopsis">${esc(m.synopsis)}</p><p class="muted">${esc(m.author||'Autor por confirmar')} · ★ ${esc(m.rating||'—')} · ${count(m.views)} visitas</p>${m.demo?'<p class="demo-note">Ficha de demostración. Las páginas de muestra no son capítulos reales.</p>':''}<div class="actions">${m.chapters.length?`<a class="primary" href="#read/${id}/${history??Math.min(...m.chapters.map(c=>c.number))}">${history!=null?'Continuar lectura':'Empezar a leer'} →</a>`:''}<button id="bookmark" class="secondary">${favorites().includes(id)?'✓ En tu biblioteca':'+ Guardar en biblioteca'}</button></div></div></section><section class="chapters"><div class="section-title"><h2>Capítulos <small>${m.chapters.length}</small></h2><input id="chapter-search" type="search" placeholder="Buscar capítulo" aria-label="Buscar capítulo"></div><div id="chapter-list"></div></section>${window.seriesCommentsMarkup(id,m.title)}`;const list=q=>$('#chapter-list').innerHTML=[...m.chapters].sort((a,b)=>b.number-a.number).filter(c=>`${c.number} ${c.title}`.toLowerCase().includes(q.toLowerCase())).map(c=>`<a class="chapter-row" href="#read/${id}/${c.number}"><span><b>Capítulo ${c.number}</b> ${esc(c.title)}</span><span>Leer →</span></a>`).join('')||'<p class="empty">No hay capítulos disponibles.</p>';list('');window.mountSeriesComments(id);$('#chapter-search').oninput=e=>list(e.target.value);$('#bookmark').onclick=()=>{let f=favorites();f=f.includes(id)?f.filter(x=>x!==id):[...f,id];localStorage.setItem('vortex-favorites',JSON.stringify(f));$('#bookmark').textContent=f.includes(id)?'✓ En tu biblioteca':'+ Guardar en biblioteca';};}
function reader(id,number){const m=series.find(m=>m.id===id),c=m?.chapters.find(c=>c.number===Number(number));if(!c)return missing();let progress=JSON.parse(localStorage.getItem('vortex-progress')||'{}');progress[id]=c.number;localStorage.setItem('vortex-progress',JSON.stringify(progress));const chapters=[...m.chapters].sort((a,b)=>a.number-b.number),i=chapters.findIndex(x=>x.number===c.number);$('#app').innerHTML=`<section class="reader"><div class="reader-tools"><a href="#series/${id}">← ${esc(m.title)}</a><select id="chapter-select" aria-label="Cambiar capítulo">${chapters.map(ch=>`<option value="${ch.number}" ${ch.number===c.number?'selected':''}>Capítulo ${ch.number}</option>`).join('')}</select><select id="reader-width" aria-label="Ancho de lectura"><option value="800">Ancho normal</option><option value="600">Compacto</option><option value="1100">Amplio</option></select></div>${m.demo?'<p class="demo-note">Páginas de demostración</p>':''}<div class="reader-pages">${c.pages.map((p,i)=>`<img src="${image(p)}" alt="Página ${i+1} de ${esc(c.title)}" loading="${i<2?'eager':'lazy'}" onerror="this.alt='No se pudo cargar la página ${i+1}'">`).join('')}</div><div class="reader-nav">${i>0?`<a class="secondary" href="#read/${id}/${chapters[i-1].number}">← Anterior</a>`:'<span></span>'}<a href="#series/${id}">Todos los capítulos</a>${i<chapters.length-1?`<a class="primary" href="#read/${id}/${chapters[i+1].number}">Siguiente →</a>`:'<span>Estás al día ✓</span>'}</div></section>`;$('#chapter-select').onchange=e=>location.hash=`read/${id}/${e.target.value}`;$('#reader-width').onchange=e=>$('.reader-pages').style.maxWidth=e.target.value+'px';}
function missing(){$('#app').innerHTML='<div class="empty"><h1>No encontramos esta página.</h1><a href="#home">Volver a la biblioteca →</a></div>';}
function renderAdminLogin(){
  $('#app').innerHTML=`
    <section class="olympus-login-wrapper">
      <div class="olympus-login-box">
        <div class="olympus-logo-circle">
          <img src="/assets/angelscan-logo.png" alt="AngelScan" width="52" height="52">
        </div>
        <p class="olympus-eyebrow">Panel</p>
        <h1 class="olympus-title">Entrar al panel</h1>
        <p class="olympus-subtitle">Con la misma cuenta que usas en el sitio.</p>

        <form id="olympus-form" class="olympus-form-card">
          <div class="olympus-field">
            <label for="olympus-email">Correo</label>
            <input type="text" id="olympus-email" name="email" placeholder="jonathan28703@gmail.com" autocomplete="username" required>
          </div>

          <p id="olympus-error" class="olympus-error-msg" style="display:none;"></p>

          <div class="olympus-field">
            <label for="olympus-pass">Contraseña</label>
            <input type="password" id="olympus-pass" name="password" placeholder="••••••••" autocomplete="current-password" required>
          </div>

          <button type="submit" id="olympus-submit-btn" class="olympus-submit-btn">Entrar</button>
        </form>

        <a href="#home" class="olympus-back-link">Volver al sitio</a>
      </div>
    </section>
  `;

  const form=$('#olympus-form');
  if(form){
    form.onsubmit=async(e)=>{
      e.preventDefault();
      const errEl=$('#olympus-error');
      const btn=$('#olympus-submit-btn');
      errEl.style.display='none';
      btn.disabled=true;
      btn.textContent='Verificando...';

      try{
        const res=await api('login','POST',{
          email:form.elements.email.value,
          password:form.elements.password.value
        });
        currentUser=res.user;
        authenticated=!!res.authenticated;
        renderUserSlot();
        if(authenticated){
          admin();
          toast('Bienvenido al panel, '+currentUser.username);
        } else {
          errEl.textContent='Tu cuenta no tiene permisos de administrador.';
          errEl.style.display='block';
        }
      }catch(err){
        errEl.textContent='El correo o la contraseña no son correctos.';
        errEl.style.display='block';
      }finally{
        btn.disabled=false;
        btn.textContent='Entrar';
      }
    };
  }
}

function admin(){if(!authenticated||!currentUser||currentUser.role!=='admin'){renderAdminLogin();return;}$('#app').innerHTML=`<div class="admin-top"><div><p class="eyebrow">ANGELSCAN / ESTUDIO EDITORIAL</p><h1>Todo bajo control<span class="accent">.</span></h1><p class="muted">Tu catálogo, tus historias y lo que está leyendo la comunidad.</p></div><button id="logout" class="secondary">Cerrar sesión</button></div><div class="stats">${[['Series publicadas',series.length],['Capítulos disponibles',series.reduce((n,m)=>n+m.chapters.length,0)],['Visitas registradas',count(series.reduce((n,m)=>n+(Number(m.views)||0),0))],['En emisión',series.filter(m=>m.status==='En emisión').length]].map(([l,v])=>`<div><p>${l}</p><strong>${v}</strong></div>`).join('')}</div><div class="admin-toolbar"><div class="tabs"><button id="all-series" class="active">Catálogo</button><button id="most-viewed">Más vistos</button></div><button class="primary" id="new-series">+ Nueva serie</button></div><input id="admin-search" type="search" placeholder="Buscar por título o tipo…" aria-label="Buscar en administración"><div class="admin-grid" id="admin-grid"></div>`;let popular=false;const render=()=>{$('#admin-grid').innerHTML=[...series].filter(m=>`${m.title} ${m.type}`.toLowerCase().includes(adminQuery.toLowerCase())).sort((a,b)=>popular?b.views-a.views:0).map(m=>`<button class="admin-card" data-edit="${m.id}">${cover(m)}<div><p class="eyebrow">${esc(m.type)} · ${esc(m.status)}</p><h3>${esc(m.title)}</h3><p>${m.chapters.length} capítulos · ${count(m.views)} visitas</p><span>Editar serie y capítulos ↗</span></div></button>`).join('')||'<p class="empty">No hay series. Crea la primera.</p>';bind('[data-edit]','click',e=>editor(e.currentTarget.dataset.edit));};render();$('#admin-search').value=adminQuery;$('#admin-search').oninput=e=>{adminQuery=e.target.value;render();};$('#most-viewed').onclick=()=>{popular=true;$('#most-viewed').classList.add('active');$('#all-series').classList.remove('active');render();};$('#all-series').onclick=()=>{popular=false;$('#all-series').classList.add('active');$('#most-viewed').classList.remove('active');render();};$('#new-series').onclick=()=>editor();$('#logout').onclick=async()=>{await api('logout','POST',{});authenticated=false;location.hash='home';};}
function editor(id){draft=id?structuredClone(series.find(m=>m.id===id)):{id:crypto.randomUUID(),title:'',type:'Manhwa',status:'En emisión',cover:'',banner:'',author:'',artist:'',synopsis:'',genres:[],rating:0,chapters:[],views:0};chapterIndex=-1;$('#app').innerHTML=`<button class="back quiet" id="editor-back">← Volver al panel</button><div class="editor-title"><div><p class="eyebrow">${id?'EDITANDO SERIE / '+esc(draft.id):'AMPLÍA TU BIBLIOTECA'}</p><h1 id="editing-title">${esc(draft.title||'Una nueva historia')}</h1></div><button class="primary" id="save-series">Guardar cambios →</button></div><div class="editor-layout"><div><form id="series-form" class="panel"><h2>Información de la serie</h2><div class="form-grid">${field('title','Título',draft.title,'text',true)}${field('altTitles','Títulos alternativos',draft.altTitles)}<label>Tipo<select name="type">${['Manhwa','Manhua','Manga'].map(x=>`<option ${draft.type===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Estado<select name="status">${['En emisión','Finalizado','En pausa'].map(x=>`<option ${draft.status===x?'selected':''}>${x}</option>`).join('')}</select></label>${field('author','Autor',draft.author)}${field('artist','Artista',draft.artist)}${field('cover','URL de portada',draft.cover,'text',true)}<label>Subir portada<input id="cover-file" type="file" accept="image/png,image/jpeg,image/webp"></label>${field('banner','URL del banner',draft.banner,'text')}${field('genres','Géneros separados por comas',draft.genres.join(', '))}${field('rating','Puntuación (0–10)',draft.rating,'number')}</div><label>Sinopsis<textarea name="synopsis" rows="5">${esc(draft.synopsis)}</textarea></label><label class="checkbox"><input type="checkbox" name="featured" ${draft.featured?'checked':''}> Destacar en la portada del sitio</label><label class="checkbox"><input type="checkbox" name="demo" ${draft.demo?'checked':''}> Contenido de demostración</label></form><section class="panel"><div class="section-title"><h2>Capítulos de esta serie</h2><button id="new-chapter" class="secondary">+ Capítulo</button></div><div id="editor-chapters"></div><form id="chapter-form" class="chapter-form"><h3 id="chapter-heading">Añadir capítulo</h3><div class="form-grid">${field('number','Número de capítulo','','number',true)}${field('title','Título del capítulo','','text',true)}</div><label>Páginas: una URL por línea, en orden de lectura<textarea name="pages" rows="5" required placeholder="https://tu-cdn.com/01.webp"></textarea></label><label>O subir imágenes (ordenadas por nombre)<input id="page-files" type="file" accept="image/png,image/jpeg,image/webp" multiple></label><p class="muted">Máximo 30 MB por guardado. Para capítulos grandes, utiliza URLs de tu almacenamiento de imágenes.</p><div class="page-previews" id="page-previews"></div><button class="secondary">Aplicar capítulo al borrador</button><button type="button" id="cancel-chapter" class="quiet">Cancelar edición</button></form></section>${id?'<button class="danger" id="delete-series">Eliminar esta serie y sus capítulos</button>':''}</div><aside class="preview-panel"><p class="eyebrow">VISTA PREVIA DE LA FICHA</p><div id="live-preview"></div><p class="muted">Los cambios se publican al pulsar Guardar cambios. Los capítulos aplicados permanecen en el borrador hasta entonces.</p><p id="save-status" role="status"></p></aside></div>`;
const f=$('#series-form');f.elements.rating.min=0;f.elements.rating.max=10;f.elements.rating.step='.1';f.addEventListener('input',preview);$('#editor-back').onclick=()=>{if(confirm('¿Volver al panel? Los cambios sin guardar se perderán.'))admin();};$('#save-series').onclick=saveSeries;$('#cover-file').onchange=async e=>{try{const values=await readFiles(e.target.files);f.elements.cover.type='text';f.elements.cover.value=values[0]||'';preview();}catch(e){toast(e.message);}};$('#page-files').onchange=async e=>{try{$('#chapter-form').elements.pages.value=(await readFiles(e.target.files)).join('\n');pagePreview();}catch(e){toast(e.message);}};$('#chapter-form').elements.pages.oninput=pagePreview;$('#chapter-form').elements.number.min=0;$('#chapter-form').elements.number.step='.1';$('#chapter-form').onsubmit=e=>{e.preventDefault();const cf=e.currentTarget;const number=Number(cf.elements.number.value),pages=cf.elements.pages.value.split('\n').map(x=>x.trim()).filter(Boolean);if(!pages.length||pages.some(p=>!image(p)))return toast('Usa imágenes HTTPS, HTTP o archivos de imagen.');if(draft.chapters.some((c,i)=>c.number===number&&i!==chapterIndex))return toast('Este número de capítulo ya existe. Edita el capítulo correspondiente.');const c={id:draft.id+'-cap-'+number,number,title:cf.elements.title.value,pages,date:new Date().toISOString()};if(chapterIndex<0)draft.chapters.push(c);else draft.chapters[chapterIndex]=c;resetChapter();renderChapters();toast('Capítulo aplicado al borrador. Guarda los cambios para publicarlo.');};$('#new-chapter').onclick=()=>{resetChapter();$('#chapter-form').scrollIntoView({behavior:'smooth'});};$('#cancel-chapter').onclick=resetChapter;if(id)$('#delete-series').onclick=async()=>{if(confirm(`¿Eliminar «${draft.title}» y todos sus capítulos? Esta acción no se puede deshacer.`)){try{await api('series/'+draft.id,'DELETE');series=await api('catalog');admin();toast('Serie eliminada');}catch(e){toast(e.message);}}};renderChapters();preview();}
function field(name,label,value,type='text',required=false){return `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''}></label>`;}
function preview(){const f=$('#series-form');$('#live-preview').innerHTML=`<div class="cover-wrap">${cover({cover:f.elements.cover.value,title:f.elements.title.value})}</div><p class="eyebrow">${esc(f.elements.type.value)} · ${esc(f.elements.status.value)}</p><h2>${esc(f.elements.title.value||'Título de la serie')}</h2><p class="muted">${esc(f.elements.author.value||'Autor')}</p><div class="tags">${f.elements.genres.value.split(',').filter(Boolean).map(g=>`<span>${esc(g.trim())}</span>`).join('')}</div><p class="preview-synopsis">${esc(f.elements.synopsis.value||'La sinopsis de tu historia aparecerá aquí.')}</p><p>${draft.chapters.length} capítulos · ${count(draft.views)} visitas</p>`;}
function resetChapter(){chapterIndex=-1;$('#chapter-form').reset();$('#chapter-heading').textContent='Añadir capítulo';$('#page-previews').innerHTML='';}
function pagePreview(){$('#page-previews').innerHTML=$('#chapter-form').elements.pages.value.split('\n').filter(p=>image(p)).map((p,i)=>`<figure><img src="${image(p)}" alt="Página ${i+1}"><figcaption>${i+1}</figcaption></figure>`).join('');}
function renderChapters(){$('#editor-chapters').innerHTML=draft.chapters.map((c,i)=>`<div class="chapter-row"><span><b>Cap. ${c.number}</b> ${esc(c.title)} <small>${c.pages.length} páginas</small></span><div><button class="quiet" data-chapter="${i}">Editar</button><button class="quiet danger-text" data-remove="${i}">Eliminar</button></div></div>`).join('')||'<p class="empty">Esta serie todavía no tiene capítulos.</p>';bind('[data-chapter]','click',e=>{chapterIndex=Number(e.currentTarget.dataset.chapter);const c=draft.chapters[chapterIndex],f=$('#chapter-form');f.elements.number.value=c.number;f.elements.title.value=c.title;f.elements.pages.value=c.pages.join('\n');$('#chapter-heading').textContent='Editando capítulo '+c.number;pagePreview();f.scrollIntoView({behavior:'smooth'});});bind('[data-remove]','click',e=>{if(confirm('¿Quitar este capítulo del borrador?')){draft.chapters.splice(Number(e.currentTarget.dataset.remove),1);resetChapter();renderChapters();preview();}});}
async function readFiles(files){const list=[...files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));if(list.some(f=>!['image/png','image/jpeg','image/webp'].includes(f.type)))throw Error('Selecciona imágenes PNG, JPG o WebP.');if(list.reduce((n,f)=>n+f.size,0)>20*1024*1024)throw Error('Las imágenes superan 20 MB. Utiliza URLs para capítulos grandes.');return Promise.all(list.map(f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('No se pudo leer '+f.name));r.readAsDataURL(f);})));}
async function saveSeries(){const f=$('#series-form');if(!f.reportValidity())return;const values=Object.fromEntries(new FormData(f));const item={...draft,...values,genres:values.genres.split(',').map(g=>g.trim()).filter(Boolean),featured:f.elements.featured.checked,demo:f.elements.demo.checked,rating:Number(values.rating)};if(item.rating<0||item.rating>10)return toast('La puntuación debe estar entre 0 y 10.');$('#save-series').disabled=true;try{const saved=await api('series/'+item.id,'PUT',item);series=await api('catalog');draft=saved;editor(saved.id);$('#save-status').textContent='✓ Guardado y publicado';toast('Serie publicada correctamente');}catch(e){toast(e.message);}finally{$('#save-series').disabled=false;}}
const genreHref=g=>'#catalog?genre='+encodeURIComponent(g);
const genreTags=genres=>(genres||[]).map(g=>`<a class="genre-tag" href="${genreHref(g)}">${esc(g)}</a>`).join('');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
let catalogMode={favorite:false,genre:'',status:'Todos'};let catalogFiltersOpen=false;
function popularSection(){const ranked=[...series].sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0));return `<section class="popular-section" aria-labelledby="popular-heading"><div class="section-title"><div><p class="eyebrow">LO MÁS LEÍDO EN ANGELSCAN</p><h2 id="popular-heading">Populares</h2><p class="muted">Las historias más visitadas de nuestra biblioteca.</p></div><div class="popular-actions"><a class="text-link" href="#popular">Ver todos ↗</a><button class="carousel-control" id="popular-prev" aria-label="Ver populares anteriores">←</button><button class="carousel-control" id="popular-next" aria-label="Ver siguientes populares">→</button></div></div><div class="popular-track" id="popular-track">${ranked.map((m,i)=>`<a class="popular-card" href="#series/${m.id}" data-views="${Number(m.views)||0}"><div class="cover-wrap">${cover(m)}<span class="popular-number">${String(i+1).padStart(2,'0')}</span><span class="popular-status"><i class="status-dot"></i>${esc(m.status)}</span></div><h3>${esc(m.title)}</h3><p class="muted">${count(m.views)} visitas · ${esc(m.type)}</p></a>`).join('')||'<p class="empty">Las historias aparecerán aquí cuando se publiquen.</p>'}</div></section>`;}
function bindCarousel(){const track=$('#popular-track');if(!track)return;const update=()=>{$('#popular-prev').disabled=track.scrollLeft<=2;$('#popular-next').disabled=track.scrollLeft+track.clientWidth>=track.scrollWidth-2;};const step=direction=>track.scrollBy({left:direction*Math.max(190,track.clientWidth*.7),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#popular-prev').onclick=()=>step(-1);$('#popular-next').onclick=()=>step(1);track.addEventListener('scroll',update,{passive:true});const observer=new ResizeObserver(()=>{if(!track.isConnected)return observer.disconnect();update();});observer.observe(track);requestAnimationFrame(update);}
function home(){const hero=series.find(m=>m.featured)||series[0];const recent=[...series].sort(newestFirst);$('#app').innerHTML=`<div class="home-page">${hero?`<section class="hero"><div class="hero-art" role="img" aria-label="Ilustración de fantasía de la serie destacada" style="background-image:url('${image(hero.banner||hero.cover)}')"></div><div class="hero-content"><p class="eyebrow"><span class="status-dot"></span> LA ELECCIÓN DEL EQUIPO</p><p class="hero-kicker">Tu próxima obsesión.</p><h1>${esc(hero.title)}</h1><p class="hero-description">${esc(hero.synopsis)}</p><div class="tags">${genreTags(hero.genres.slice(0,3))}</div><a class="primary" href="#series/${hero.id}">Descubrir la historia <span>→</span></a></div><div class="hero-number">01 <span>/ ANGELSCAN SELECT</span></div></section>`:''}${popularSection()}<section class="recent-section"><div class="section-title"><div><p class="eyebrow">SIGUE LA HISTORIA</p><h2>Últimas actualizaciones</h2></div><a class="text-link" href="#catalog">Ver todas las series ↗</a></div><div class="card-grid recent-grid">${cards(recent)}</div></section></div>`;bindCarousel();}
function catalogCards(list){return list.map(m=>`<article class="series-card catalog-card"><a class="series-card-link catalog-cover" href="#series/${m.id}"><div class="cover-wrap">${cover(m)}<span class="type-tag">${esc(m.type)}</span></div></a><div class="catalog-card-info"><a class="series-title" href="#series/${m.id}"><h3>${esc(m.title)}</h3></a><div class="catalog-card-meta"><span class="rating">★ ${esc(m.rating||'—')}</span><span class="series-state"><i class="status-dot"></i>${esc(m.status)}</span></div><div class="catalog-genres">${genreTags(m.genres.slice(0,2))}</div><div class="card-chapters">${[...m.chapters].sort((a,b)=>b.number-a.number).slice(0,3).map(c=>`<a href="#read/${m.id}/${c.number}"><span>Capítulo ${c.number}</span><span>Leer ↗</span></a>`).join('')||'<p class="muted">Próximamente</p>'}</div></div></article>`).join('')||'<div class="empty"><h3>No encontramos series con estos filtros.</h3><p>Prueba otro género o modifica la búsqueda.</p><a href="#catalog">Ver todas las series →</a></div>';}
function catalogPage(favorite=false,params=new URLSearchParams()){catalogMode={favorite,genre:params.get('genre')||'',status:params.get('status')||'Todos'};filter=['Manhwa','Manhua','Manga'].includes(params.get('type'))?params.get('type'):'Todos';query=params.get('q')||'';const genres=[...new Set(series.flatMap(m=>m.genres||[]))].sort((a,b)=>a.localeCompare(b,'es'));$('#app').innerHTML=`<section class="catalog-page"><div class="series-page-heading"><p class="eyebrow">${favorite?'TU COLECCIÓN PERSONAL':'LA BIBLIOTECA DE ANGELSCAN'}</p><h1>${favorite?'Mi biblioteca':catalogMode.genre?esc(catalogMode.genre):'Catálogo'}</h1><p class="muted">${favorite?'Tus historias guardadas, listas para continuar.':catalogMode.genre?'Todas las historias del género '+esc(catalogMode.genre)+'.':'Explora manhwa, manhua y manga. Encuentra una historia para ti.'}</p></div><div class="catalog-search"><input id="search" type="search" placeholder="Buscar una historia, autor o género…" aria-label="Buscar historias" value="${esc(query)}"></div><div class="series-controls"><p id="results-count" class="muted" aria-live="polite"></p><div class="series-control-actions"><select id="sort" aria-label="Ordenar catálogo"><option value="updated">Últimas actualizaciones</option><option value="views">Más leídos</option><option value="title">Nombre: A–Z</option></select><button class="secondary filter-toggle" id="filter-toggle" aria-expanded="${catalogFiltersOpen}" aria-controls="filters-panel">☷ Filtros</button></div></div><section id="filters-panel" class="filters-panel" ${catalogFiltersOpen?'':'hidden'}><div><span class="filter-label">Tipo de serie</span><div class="tabs">${['Todos','Manhwa','Manhua','Manga'].map(t=>`<button data-filter="${t}" class="${filter===t?'active':''}">${t}</button>`).join('')}</div></div><label>Género<select id="genre-filter"><option value="">Todos los géneros</option>${genres.map(g=>`<option value="${esc(g)}" ${normalize(g)===normalize(catalogMode.genre)?'selected':''}>${esc(g)}</option>`).join('')}</select></label><label>Estado<select id="status-filter">${['Todos','En emisión','Finalizado','En pausa'].map(s=>`<option ${catalogMode.status===s?'selected':''}>${s}</option>`).join('')}</select></label><a class="text-link reset-filters" href="${favorite?'#favorites':'#catalog'}">Limpiar filtros</a></section><div class="active-filters" id="active-filters"></div><div class="card-grid series-directory" id="catalog-grid"></div></section>`;$('#sort').value=order;$('#sort').onchange=e=>{order=e.target.value;renderGrid();};$('#search').oninput=e=>{query=e.target.value;renderGrid();};$('#filter-toggle').onclick=()=>{const open=$('#filters-panel').hidden;catalogFiltersOpen=open;$('#filters-panel').hidden=!open;$('#filter-toggle').setAttribute('aria-expanded',String(open));};const updateFilter=(key,value)=>{const p=new URLSearchParams(location.hash.split('?')[1]||'');if(value&&value!=='Todos')p.set(key,value);else p.delete(key);if(query)p.set('q',query);location.hash=(favorite?'favorites':'catalog')+(p.size?'?'+p:'');};bind('[data-filter]','click',e=>updateFilter('type',e.currentTarget.dataset.filter));$('#genre-filter').onchange=e=>updateFilter('genre',e.target.value);$('#status-filter').onchange=e=>updateFilter('status',e.target.value);renderGrid();}
function renderGrid(){let list=series.filter(m=>(!catalogMode.favorite||favorites().includes(m.id))&&(filter==='Todos'||m.type===filter)&&(!catalogMode.genre||(m.genres||[]).some(g=>normalize(g)===normalize(catalogMode.genre)))&&(catalogMode.status==='Todos'||m.status===catalogMode.status)&&normalize(`${m.title} ${m.author} ${(m.genres||[]).join(' ')}`).includes(normalize(query)));list.sort((a,b)=>order==='views'?(Number(b.views)||0)-(Number(a.views)||0):order==='title'?a.title.localeCompare(b.title,'es'):newestFirst(a,b));$('#catalog-grid').innerHTML=catalogCards(list);$('#results-count').textContent=list.length+(list.length===1?' serie encontrada':' series encontradas');$('#active-filters').innerHTML=[catalogMode.genre,filter!=='Todos'?filter:'',catalogMode.status!=='Todos'?catalogMode.status:''].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join('')+((catalogMode.genre||filter!=='Todos'||catalogMode.status!=='Todos')?`<a class="text-link" href="${catalogMode.favorite?'#favorites':'#catalog'}">Quitar filtros ×</a>`:'');}
function popularPage(){$('#app').innerHTML=`<section class="popular-page"><div class="series-page-heading"><p class="eyebrow">EL RANKING DE ANGELSCAN</p><h1>Populares</h1><p class="muted">Las historias más visitadas, ordenadas por sus lecturas en el sitio.</p></div><div class="card-grid recent-grid">${cards([...series].sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0)))}</div></section>`;}
function route(){const hash=location.hash.slice(1)||'home';const [path,search='']=hash.split('?');const [view,id,num]=path.split('/');const params=new URLSearchParams(search);if(view==='admin')admin();else if(view==='series')detail(id);else if(view==='read')reader(id,num);else if(view==='catalog')catalogPage(false,params);else if(view==='favorites')catalogPage(true,params);else if(view==='popular')popularPage();else home();document.querySelectorAll('.site-header nav a').forEach(a=>{const active=a.getAttribute('href')==='#'+(view==='series'||view==='read'?'catalog':view);a.classList.toggle('current',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});window.scrollTo(0,0);}

function renderUserSlot(){
  const slot=$('#user-auth-slot');
  if(!slot)return;
  if(!currentUser){
    slot.innerHTML=`<button class="auth-pill-btn" onclick="openAuthModal('login')"><span>👤</span> <span>Entrar</span></button>`;
  }else{
    const isAdmin=currentUser.role==='admin';
    slot.innerHTML=`
      <div class="user-profile-menu">
        <button class="user-pill-btn" onclick="toggleUserDropdown()" aria-expanded="false">
          <span style="font-size:15px">👤</span>
          <span class="user-name-text">${esc(currentUser.username)}</span>
          ${isAdmin?'<span class="admin-badge">ADMIN</span>':''}
          <span style="font-size:9px;color:#8b9298">▼</span>
        </button>
        <div id="user-dropdown" class="user-dropdown-panel" style="display:none;">
          <div class="user-dropdown-header">
            <strong style="color:#fff">${esc(currentUser.username)}</strong>
            <div style="font-size:11px;color:#8b9298;margin-top:2px">${esc(currentUser.email)}</div>
            <div style="font-size:10px;color:#c89647;margin-top:4px">${isAdmin?'⭐ Administrador':'✨ Lector VIP'}</div>
          </div>
          <hr class="dropdown-sep">
          ${isAdmin?'<a href="#admin" class="dropdown-item admin-highlight">⚙️ Panel de Control</a>':''}
          <a href="#favorites" class="dropdown-item">⭐ Mi biblioteca</a>
          <button onclick="handleLogout()" class="dropdown-item logout-btn">Cerrar sesión</button>
        </div>
      </div>
    `;
  }
}

window.toggleUserDropdown=function(){
  const dd=$('#user-dropdown');
  if(dd)dd.style.display=dd.style.display==='none'?'block':'none';
};

window.addEventListener('click',e=>{
  if(!e.target.closest('.user-profile-menu')){
    const dd=$('#user-dropdown');
    if(dd)dd.style.display='none';
  }
});

window.openAuthModal=function(tab='login'){
  const modal=$('#auth-modal');
  if(!modal)return;
  switchAuthTab(tab);
  const err=$('#auth-modal-error');
  if(err)err.style.display='none';
  modal.showModal();
};

window.closeAuthModal=function(){
  $('#auth-modal')?.close();
};

window.switchAuthTab=function(tab){
  const title=$('#auth-modal-title');
  const desc=$('#auth-modal-desc');
  const tabLogin=$('#tab-login');
  const tabReg=$('#tab-register');
  const formLogin=$('#form-login');
  const formReg=$('#form-register');
  const err=$('#auth-modal-error');
  if(err)err.style.display='none';

  if(tab==='register'){
    if(title)title.textContent='Crea tu cuenta';
    if(desc)desc.textContent='Regístrate para guardar tu progreso y favoritos.';
    tabLogin?.classList.remove('active');
    tabReg?.classList.add('active');
    if(formLogin)formLogin.style.display='none';
    if(formReg)formReg.style.display='block';
  }else{
    if(title)title.textContent='Bienvenido de nuevo';
    if(desc)desc.textContent='Entra con tu correo para seguir donde lo dejaste.';
    tabLogin?.classList.add('active');
    tabReg?.classList.remove('active');
    if(formLogin)formLogin.style.display='block';
    if(formReg)formReg.style.display='none';
  }
};

window.handleLogout=async function(){
  await api('logout','POST',{});
  authenticated=false;
  currentUser=null;
  renderUserSlot();
  toast('Sesión cerrada');
  if(location.hash==='#admin')location.hash='home';
};

function bindAuthForms(){
  const formLogin=$('#form-login');
  if(formLogin){
    formLogin.onsubmit=async e=>{
      e.preventDefault();
      const err=$('#auth-modal-error'), btn=$('#btn-login');
      if(err)err.style.display='none';
      if(btn){btn.disabled=true;btn.textContent='Verificando...';}
      try{
        const res=await api('login','POST',{
          email:formLogin.elements.email.value,
          password:formLogin.elements.password.value
        });
        currentUser=res.user;
        authenticated=!!res.authenticated;
        renderUserSlot();
        closeAuthModal();
        toast('¡Bienvenido, '+currentUser.username+'!');
        if(location.hash==='#admin'&&authenticated)admin();
      }catch(errRes){
        if(err){
          err.textContent=errRes.message||'El correo o la contraseña no son correctos.';
          err.style.display='block';
        }
      }finally{
        if(btn){btn.disabled=false;btn.textContent='Entrar';}
      }
    };
  }

  const formReg=$('#form-register');
  if(formReg){
    formReg.onsubmit=async e=>{
      e.preventDefault();
      const err=$('#auth-modal-error'), btn=$('#btn-register');
      if(err)err.style.display='none';
      if(btn){btn.disabled=true;btn.textContent='Creando cuenta...';}
      try{
        const res=await api('register','POST',{
          username:formReg.elements.username.value,
          email:formReg.elements.email.value,
          password:formReg.elements.password.value
        });
        currentUser=res.user;
        authenticated=!!res.authenticated;
        renderUserSlot();
        closeAuthModal();
        toast('¡Cuenta creada con éxito! Bienvenido, '+currentUser.username);
      }catch(errRes){
        if(err){
          err.textContent=errRes.message||'Error al registrar la cuenta.';
          err.style.display='block';
        }
      }finally{
        if(btn){btn.disabled=false;btn.textContent='Crear mi cuenta';}
      }
    };
  }
}

window.addEventListener('hashchange',route);
window.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.shiftKey&&(e.key==='A'||e.key==='a')){
    location.hash='#admin';
  }
});
Promise.all([api('catalog'),api('session')]).then(([data,session])=>{
  series=data;
  authenticated=session.authenticated;
  currentUser=session.user;
  renderUserSlot();
  bindAuthForms();
  route();
}).catch(e=>{
  $('#app').innerHTML='<div class="empty"><h1>No se pudo abrir la biblioteca.</h1><p>Comprueba que el servidor esté en marcha y recarga la página.</p></div>';
  toast(e.message);
});


