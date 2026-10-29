const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = __dirname, file = path.resolve(root, process.env.CATALOG_PATH || 'data/catalog.json');
let catalog = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
if (!catalog.length) {
  const ctx = {window:{}}; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root,'js/data.js'),'utf8'), ctx);
  catalog = ctx.window.INITIAL_MANHWAS.map(m => ({...m, views:0, demo:true}));
  fs.writeFileSync(file, JSON.stringify(catalog,null,2));
}
function persist(){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(catalog,null,2));fs.renameSync(temp,file);}
const sessions=new Map(), attempts=new Map(), visits=new Map(), commentRates=new Map();
const commentsFile=file.replace(/\.json$/, '')+'.comments.json';
let comments=fs.existsSync(commentsFile)?JSON.parse(fs.readFileSync(commentsFile,'utf8')):{};
function persistComments(){fs.writeFileSync(commentsFile+'.tmp',JSON.stringify(comments,null,2));fs.renameSync(commentsFile+'.tmp',commentsFile);}
const password=process.env.ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
if(!process.env.ADMIN_PASSWORD) console.log('Clave temporal de administrador: '+password);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const safeImage=s=>typeof s==='string' && (/^\/assets\/[a-z0-9-]+\.(?:svg|webp|png|jpg)$/.test(s)||/^https?:\/\//.test(s)||/^data:image\/(png|jpeg|webp|gif);base64,/.test(s));
const valid=m=>m && typeof m.id==='string' && /^[a-z0-9-]{1,100}$/.test(m.id) && typeof m.title==='string' && m.title.trim().length>0 && m.title.length<=200 && safeImage(m.cover) && ['Manhwa','Manhua','Manga'].includes(m.type) && Array.isArray(m.genres) && m.genres.every(g=>typeof g==='string') && Array.isArray(m.chapters) && m.chapters.every(c=>Number.isFinite(c.number)&&c.number>=0&&typeof c.title==='string'&&Array.isArray(c.pages)&&c.pages.length>0&&c.pages.every(safeImage)) && new Set(m.chapters.map(c=>c.number)).size===m.chapters.length;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 try{
 if(url.pathname.startsWith('/api/')){
  if(!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin!==`http://${req.headers.host}` && req.headers.origin!==`https://${req.headers.host}`) return send(403,{error:'Origen no permitido'});
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('vortex_session='))?.slice(15);
  const authorized=sessions.get(token)>Date.now();
  let body={};
  if(['POST','PUT'].includes(req.method)){let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>30*1024*1024)return send(413,{error:'Máximo 30 MB por envío'});chunks.push(chunk);}try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{return send(400,{error:'JSON inválido'});}}
  if(url.pathname==='/api/session'&&req.method==='GET')return send(200,{authenticated:authorized});
  if(url.pathname==='/api/login'&&req.method==='POST'){
   const ip=req.socket.remoteAddress; const a=attempts.get(ip)||{count:0,until:Date.now()+600000};if(a.until<Date.now()){a.count=0;a.until=Date.now()+600000;}if(a.count>=10)return send(429,{error:'Demasiados intentos. Espera diez minutos.'});
   const input=crypto.createHash('sha256').update(String(body.password)).digest(), expected=crypto.createHash('sha256').update(password).digest();
   if(!crypto.timingSafeEqual(input,expected)){a.count++;attempts.set(ip,a);return send(401,{error:'Contraseña incorrecta'});}
   const t=crypto.randomBytes(32).toString('hex');sessions.set(t,Date.now()+8*3600000);attempts.delete(ip);res.setHeader('Set-Cookie',`vortex_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return send(200,{ok:true});
  }
  if(url.pathname==='/api/logout'&&req.method==='POST'){sessions.delete(token);res.setHeader('Set-Cookie','vortex_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
  if(url.pathname==='/api/catalog'&&req.method==='GET')return send(200,catalog);
  const commentMatch=url.pathname.match(/^\/api\/series\/([a-z0-9-]+)\/comments$/);
  if(commentMatch){const id=commentMatch[1];if(!catalog.some(m=>m.id===id))return send(404,{error:'Serie no encontrada'});const items=comments[id]||[];
   if(req.method==='GET'){let start=0;const before=url.searchParams.get('before');if(before){const index=items.findIndex(c=>c.id===before);if(index<0)return send(409,{error:'La lista cambió. Actualiza los comentarios.'});start=index+1;}const page=items.slice(start,start+20);return send(200,{items:page,total:items.length,next:start+page.length<items.length?page.at(-1).id:null});}
   if(req.method==='POST'){const name=typeof body.name==='string'?body.name.trim():'',text=typeof body.text==='string'?body.text.trim():'';if(name.length<2||name.length>40||!text||text.length>2000)return send(400,{error:'Usa un nombre de 2 a 40 caracteres y un comentario de hasta 2000 caracteres.'});const ip=req.socket.remoteAddress;const rate=commentRates.get(ip)||{count:0,until:Date.now()+60000};if(rate.until<=Date.now()){rate.count=0;rate.until=Date.now()+60000;}if(rate.count>=3)return send(429,{error:'Has comentado varias veces seguidas. Espera un minuto e inténtalo de nuevo.'});rate.count++;commentRates.set(ip,rate);const comment={id:crypto.randomUUID(),name,text,createdAt:new Date().toISOString(),team:authorized};items.unshift(comment);comments[id]=items;persistComments();return send(201,{comment});}
   if(req.method==='DELETE'){if(!authorized)return send(401,{error:'Solo el equipo puede moderar comentarios'});const index=items.findIndex(c=>c.id===url.searchParams.get('commentId'));if(index<0)return send(404,{error:'Comentario no encontrado'});items.splice(index,1);comments[id]=items;persistComments();return send(200,{ok:true});}return send(405,{error:'Método no permitido'});
  }
  const match=url.pathname.match(/^\/api\/series\/([a-z0-9-]+)(\/view)?$/);
  if(match){const id=match[1], i=catalog.findIndex(m=>m.id===id);
   if(match[2]&&req.method==='POST'){if(i<0)return send(404,{error:'Serie no encontrada'});const key=req.socket.remoteAddress+id;if((visits.get(key)||0)<Date.now()){catalog[i].views=(Number(catalog[i].views)||0)+1;visits.set(key,Date.now()+1800000);persist();}return send(200,{views:catalog[i].views});}
   if(!authorized)return send(401,{error:'Inicia sesión para administrar'});
   if(req.method==='PUT'){if(body.id!==id||!valid(body))return send(400,{error:'Revisa título, portada, tipo y páginas. No repitas números de capítulo.'});const item={...body,views:i>=0?catalog[i].views:0,updatedAt:new Date().toISOString(),latestChapter:Math.max(0,...body.chapters.map(c=>c.number))};if(i>=0)catalog[i]=item;else catalog.unshift(item);persist();return send(200,item);}
   if(req.method==='DELETE'){if(i<0)return send(404,{error:'Serie no encontrada'});catalog.splice(i,1);persist();return send(200,{ok:true});}
  }
  return send(404,{error:'Ruta no encontrada'});
 }
 if(url.pathname==='/admin'||url.pathname==='/admin/login'||url.pathname==='/admin/'){
  res.writeHead(302,{'Location':'/#admin'});
  return res.end();
 }
 const pathname=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname);
 if(!/^\/(index\.html|css\/[\w.-]+|js\/[\w.-]+|assets\/[\w./-]+)$/.test(pathname))return send(404,{error:'No encontrado'});
 const target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep))return send(403,{error:'Acceso denegado'});
 if(!fs.existsSync(target)||!fs.statSync(target).isFile())return send(404,{error:'No encontrado'});
 res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});fs.createReadStream(target).pipe(res);
 }catch(e){console.error(e.message);if(!res.headersSent)send(500,{error:'No se pudo guardar. Intenta de nuevo.'});else res.end();}
});
server.listen(process.env.PORT||3000,()=>console.log('Vortex Scans: http://localhost:'+(process.env.PORT||3000)));


