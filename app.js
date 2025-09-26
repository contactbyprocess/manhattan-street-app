/* ===== Helpers ===== */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
function showToast(msg,dur=1800){
  const t=qs('#toast'); if(!t) return;
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

/* ===== Données profil / points (démo) ===== */
const KEY={PROFILE:'ms_profile',USERS:'ms_users'};
function getUsers(){return get(KEY.USERS,{});} function setUsers(u){set(KEY.USERS,u);}
function getProfile(){return get(KEY.PROFILE,{firstName:'',email:'',phone:''});}
function setProfile(p){set(KEY.PROFILE,p);}
function getPoints(email){const u=getUsers();return u[email]?.points||0;}

/* ===== Bannière carousel ===== */
function initBannerCarousel(){
  const track = document.querySelector('#bannerTrack');
  const dots  = document.querySelector('#bannerDots');
  if(!track || !dots) return;

  const slides = [...track.children];
  dots.innerHTML = slides.map((_,i)=>`<span class="dot ${i===0?'active':''}" data-i="${i}"></span>`).join('');

  let i = 0;
  const slideW = () => track.getBoundingClientRect().width;

  const go = n => {
    i = (n + slides.length) % slides.length;
    track.scrollTo({ left: i * slideW(), behavior: 'smooth' });
    dots.querySelectorAll('.dot').forEach((d,di)=> d.classList.toggle('active', di===i));
  };

  let timer = setInterval(()=>go(i+1), 4000);
  dots.querySelectorAll('.dot').forEach(d=>{
    d.addEventListener('click', ()=>{
      clearInterval(timer);
      go(+d.dataset.i);
      timer = setInterval(()=>go(i+1), 4000);
    });
  });

  window.addEventListener('resize', ()=> { track.scrollLeft = i * slideW(); });
}

/* ===== Featured (neutralisé) ===== */
function renderFeatured(){
  const el = document.getElementById('featured');
  if (!el) return;
  el.innerHTML = '';
  el.style.display = 'none';
}

/* ===== Tabs ===== */
function switchTab(tab){
  // activer boutons
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  // activer sections
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  // Bannière uniquement sur l’accueil
  const hb = document.getElementById('homeBanner');
  if (hb) hb.style.display = (tab === 'home' ? 'block' : 'none');

  // Mode commande : on cache juste le CTA (les colonnes/tailles restent identiques)
  if (tab === 'order') {
    document.body.classList.add('ordering');
    setMode('takeaway'); // par défaut
  } else {
    document.body.classList.remove('ordering');
  }

  window.scrollTo({top:0, behavior:'smooth'});
}
function bindTabbar(){
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tabbar [data-tab]');
    if(!btn) return;
    e.preventDefault();
    switchTab(btn.dataset.tab);
  });
}

/* ===== Commande : modes et adresse ===== */
const RESTO_ADDR = 'Petite rue 10, Mouscron 7700, Belgique';
const RESTO_FALLBACK = { lat: 50.744, lng: 3.214 };
const DELIVERY_RADIUS_M = 5000;

function requestGeolocationAuth(){
  if(!navigator.geolocation) return;
  // simple “poke” pour demander l’autorisation en amont
  navigator.geolocation.getCurrentPosition(
    _=>{}, _=>{}, { enableHighAccuracy:true, timeout:5000, maximumAge:0 }
  );
}

function setMode(mode){
  // toggle visuel du segmented
  qsa('#orderModes .seg-btn').forEach(b=> b.classList.toggle('active', b.dataset.mode===mode));

  // textes et blocs
  const title=qs('#orderModeTitle'), info=qs('#orderInfo');
  const addrWrap=qs('#deliveryAddressWrap');
  const dineWrap=qs('#dineInBlock');
  const mapWrap=qs('#mapWrap');

  if(mode==='takeaway'){
    title.textContent='Click & Collect';
    info.textContent="Passe ta commande et viens la récupérer au restaurant.";
    addrWrap.style.display='none';
    dineWrap.style.display='none';
    mapWrap.style.display='block';
  }
  else if(mode==='delivery'){
    title.textContent='Livraison';
    info.textContent="Entre ton adresse pour vérifier la zone de livraison.";
    addrWrap.style.display='block';
    dineWrap.style.display='none';
    mapWrap.style.display='block';
    requestGeolocationAuth();
  }
  else{ // dinein
    title.textContent='Sur place';
    info.textContent="Indique ton numéro de table.";
    addrWrap.style.display='none';
    dineWrap.style.display='block';
    mapWrap.style.display='none';     // <<< pas de carte en Sur place
  }
}

function haversine(a, b){
  const R=6371000, toRad = d=>d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s1 = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s1));
}

async function geocode(query){
  const cacheKey = 'geo:'+query.toLowerCase().trim();
  const cached = get(cacheKey, null);
  if(cached) return cached;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'MSApp/1.0 (demo)' }
  });
  if(!res.ok) throw new Error('geo http '+res.status);
  const arr = await res.json();
  if(!arr.length) throw new Error('Adresse introuvable');
  return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
}

async function validateAddress(){
  const input = qs('#deliveryAddress');
  const q = (input?.value || '').trim();
  if(!q){ showToast('Entre une adresse'); return; }

  try{
    const pt = await geocode(q);
    const resto = RESTO_FALLBACK; // pour l’instant on garde le centre fixe de l’iframe
    const d = haversine(resto, pt);

    if(d > DELIVERY_RADIUS_M){
      showToast('Désolé, adresse hors zone (5 km) ❌');
      return;
    }
    showToast('Adresse OK ✅');
    // NOTE: on ne bouge pas la carte (iframe) pour l’instant → design plus tard
  }catch(_){
    showToast('Adresse introuvable');
  }
}

/* ===== CTA ===== */
function bindCTA(){
  const openOrder = ()=> switchTab('order');

  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrder();
  });

  // Segmented control
  qs('#orderModes')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.seg-btn');
    if(!b) return;
    setMode(b.dataset.mode);
  });

  // Adresse : bouton + Enter
  qs('#checkAddressBtn')?.addEventListener('click', validateAddress);
  qs('#deliveryAddress')?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); validateAddress(); }
  });

  // Raccourcis espace client
  qs('#tileOrders')?.addEventListener('click', ()=> switchTab('orders'));
  qs('#tileProfile')?.addEventListener('click', ()=> switchTab('profile'));
}

/* ===== Profil / Fidélité ===== */
function bindProfile(){
  qs('#saveProfileBtn')?.addEventListener('click',()=>{
    const p={...getProfile(),
      firstName:(qs('#profileName').value||'').trim(),
      email:(qs('#profileEmail').value||'').trim(),
      phone:(qs('#profilePhone').value||'').trim()
    };
    setProfile(p); renderLoyalty(); showToast('Profil enregistré ✅');
  });
}
function renderLoyalty(){
  const p=getProfile();
  qs('#pointsCountTop')&&(qs('#pointsCountTop').textContent=getPoints(p.email));
  qs('#lcName')&&(qs('#lcName').textContent=p.firstName||'Client');
  const id='MS-'+(p.email?p.email.split('@')[0].slice(0,4).toUpperCase():'XXXX');
  qs('#lcId')&&(qs('#lcId').textContent='ID — '+id);
  renderQR(p.email);
}
function renderQR(email){
  const el=qs('#qrCanvas'); if(!el) return; el.innerHTML='';
  if(!email){el.textContent='Pas de compte'; return;}
  const size=200,c=document.createElement('canvas');c.width=size;c.height=size;el.appendChild(c);
  const ctx=c.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,size,size);ctx.fillStyle='#fff';
  const hash=Array.from(email).reduce((a,c)=>a+c.charCodeAt(0),0);
  for(let y=0;y<20;y++){for(let x=0;x<20;x++){if(((x*y+hash)%7)<3)ctx.fillRect(x*10,y*10,10,10);}}
  qs('#qrCodeText').textContent=email;
}

/* ===== Splash 5s min ===== */
(function(){
  const MIN_MS = 5000, MAX_MS = 9000;
  const minDelayP = new Promise(res=> setTimeout(res, MIN_MS));
  const maxTimeoutP = new Promise(res=> setTimeout(res, MAX_MS));

  window.addEventListener('load', async ()=>{
    const splash = document.getElementById('splash');
    if(!splash) return;
    await Promise.race([minDelayP, maxTimeoutP]);
    splash.style.opacity = 0;
    setTimeout(()=> splash.remove(), 600);
  });
})();

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded',()=>{
  renderFeatured();         // neutralisé
  bindTabbar();
  bindCTA();
  bindProfile();
  renderLoyalty();
  initBannerCarousel();

  // Onglet par défaut : Accueil
  switchTab('home');
});

/* ===== PWA: keep SW fresh ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
