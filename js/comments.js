(function(){
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 window.seriesCommentsMarkup=(id,title)=>`<section id="series-comments" class="series-comments" data-series="${escape(id)}" aria-labelledby="comments-heading"><div class="section-title"><div><p class="eyebrow">LA CONVERSACIÓN DE ESTA HISTORIA</p><h2 id="comments-heading">Comentarios <small id="comments-count"></small></h2></div></div><p class="muted comments-intro">Comenta sobre ${escape(title)}. Evita spoilers y respeta a los demás lectores.</p><form id="comment-form" class="comment-form"><div id="comment-user-box" class="comment-user-box"></div><label for="comment-text">Tu comentario<textarea id="comment-text" name="text" rows="4" maxlength="2000" required placeholder="¿Qué te está pareciendo esta historia?"></textarea></label><div class="comment-form-footer"><p id="comment-feedback" role="status" aria-live="polite"></p><span id="comment-counter" class="muted">0 / 2000</span><button type="submit" class="primary" id="post-comment">Publicar comentario →</button></div></form><div id="comments-list" class="comments-list" aria-live="polite"><p class="muted">Cargando comentarios…</p></div><button type="button" class="secondary comments-more" id="comments-more" hidden>Ver más comentarios</button></section>`;
 window.mountSeriesComments=function(id){
  const section=document.getElementById('series-comments');if(!section)return;
  const find=s=>section.querySelector(s),form=find('#comment-form');let items=[],next=null,loading=false;

  function renderCommentUserBox(){
    const box=find('#comment-user-box');
    if(!box)return;
    const user=window.currentUser;
    if(user&&user.username){
      const isAdmin=user.role==='admin';
      box.innerHTML=`
        <div class="comment-author-badge">
          <div class="comment-author-avatar" aria-hidden="true">${escape([...user.username][0]?.toUpperCase()||'U')}</div>
          <div class="comment-author-info">
            <div class="comment-author-name">
              <strong>${escape(user.username)}</strong>
              ${isAdmin?'<span class="comment-team">Equipo AngelScan</span>':''}
            </div>
            <span class="comment-author-meta">Comentando con tu cuenta verificada</span>
          </div>
          <input id="comment-name" name="name" type="hidden" value="${escape(user.username)}">
        </div>
      `;
    }else{
      let savedName='';
      try{savedName=localStorage.getItem('angelscan-comment-name')||'';}catch{}
      box.innerHTML=`
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
  window.renderCommentUserBox=renderCommentUserBox;
  renderCommentUserBox();

  const endpoint=`series/${encodeURIComponent(id)}/comments`;
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(d);};
  async function request(path,method='GET',body){const response=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo completar la acción');return data;}
  function render(){if(!section.isConnected)return;find('#comments-list').innerHTML=items.length?items.map(c=>`<article class="comment-entry" data-comment="${escape(c.id)}"><div class="comment-avatar" aria-hidden="true">${escape([...c.name][0]?.toUpperCase()||'L')}</div><div class="comment-content"><header><strong>${escape(c.name)}</strong>${c.team?'<span class="comment-team">Equipo AngelScan</span>':''}<time datetime="${escape(c.createdAt)}">${escape(date(c.createdAt))}</time>${typeof authenticated!=='undefined'&&authenticated?`<button type="button" class="quiet comment-remove" data-remove-comment="${escape(c.id)}" aria-label="Eliminar comentario de ${escape(c.name)}">Eliminar</button>`:''}</header><p class="comment-text">${escape(c.text)}</p></div></article>`).join(''):'<div class="comments-empty"><h3>La conversación empieza contigo.</h3><p class="muted">Todavía no hay comentarios en esta serie.</p></div>';section.querySelectorAll('[data-remove-comment]').forEach(button=>button.onclick=async()=>{if(!confirm('¿Eliminar este comentario?'))return;button.disabled=true;try{await request(endpoint+'?commentId='+encodeURIComponent(button.dataset.removeComment),'DELETE');await load(false);}catch(e){find('#comment-feedback').textContent=e.message;button.disabled=false;}});find('#comments-more').hidden=!next;}
  async function load(more=false){if(loading)return;loading=true;find('#comments-more').disabled=true;try{const data=await request(endpoint+(more&&next?'?before='+encodeURIComponent(next):''));if(!section.isConnected)return false;items=more?[...new Map([...items,...data.items].map(c=>[c.id,c])).values()]:data.items;next=data.next;find('#comments-count').textContent='('+data.total+')';render();return true;}catch(e){if(!section.isConnected)return false;find('#comment-feedback').textContent=e.message;if(!more){find('#comments-list').innerHTML='<button type="button" class="secondary" id="comments-retry">Reintentar carga de comentarios</button>';find('#comments-retry').onclick=()=>load(false);}return false;}finally{loading=false;if(section.isConnected)find('#comments-more').disabled=false;}}
  find('#comment-text').oninput=e=>{find('#comment-counter').textContent=e.target.value.length+' / 2000';};
  find('#comments-more').onclick=()=>load(true);
  form.onsubmit=async e=>{
    e.preventDefault();
    const nameInput=find('#comment-name');
    const name=(window.currentUser?.username || nameInput?.value || '').trim();
    const text=find('#comment-text').value.trim();
    if(!window.currentUser && name.length<2){
      find('#comment-feedback').textContent='Escribe tu nombre antes de publicar.';
      return;
    }
    if(!text){
      find('#comment-feedback').textContent='Escribe un comentario antes de publicar.';
      return;
    }
    find('#post-comment').disabled=true;
    find('#comment-feedback').textContent='Publicando…';
    try{
      await request(endpoint,'POST',{name,text});
      if(!section.isConnected)return;
      if(!window.currentUser){
        try{localStorage.setItem('angelscan-comment-name',name);}catch{}
      }
      find('#comment-text').value='';
      find('#comment-counter').textContent='0 / 2000';
      const refreshed=await load(false);
      if(section.isConnected&&refreshed)find('#comment-feedback').textContent='Tu comentario ya está publicado.';
    }catch(e){
      if(section.isConnected)find('#comment-feedback').textContent=e.message;
    }finally{
      if(section.isConnected)find('#post-comment').disabled=false;
    }
  };
  load(false);
 };
})();
