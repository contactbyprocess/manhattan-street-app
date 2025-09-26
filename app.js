/* ===== Helpers ===== */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

function showToast(msg, dur=1500, pos='top'){
  const t=qs('#toast'); if(!t) return;
  t.textContent = msg;
  t.classList.toggle('bottom', pos==='bottom');
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), dur);
}

/* ===== Données démo ===== */
const KEY={PROFILE:'ms_profile',USERS:'ms_users',PRODUCTS:'ms_products'};
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

  // Mode commande : CTA fade uniquement (tabbar inchangée)
  if (tab === 'order') {
    document.body.classList.add('ordering'); // → CSS cache le CTA, ne change pas le gap
    setMode(currentMode || 'takeaway');      // met à jour panneaux & carte
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

/* ===== Commande (iframe OSM) ===== */
const RESTO_ADDR = 'Petite rue 10, Mouscron 7700, Belgique';
const RESTO_FALLBACK = { lat: 50.744, lng: 3.214 };
const DELIVERY_RADIUS_M = 5000;

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
  const pt = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
  set(cacheKey, pt);
  return pt;
}

/* Carte (iframe) helpers */
function centerIframeTo(lat, lng, zoom=16){
  const iframe = document.getElementById('mapFrame');
  if(!iframe) return;
  const delta = zoom >= 16 ? 0.01 : 0.02;
  const bbox=`${lng-delta},${lat-delta},${lng+delta},${lat+delta}`;
  iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

/* Demande d’autorisation de géoloc (pas d’usage immédiat, mais déclenche le prompt) */
function requestGeolocationAuth(){
  if(!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    _pos => {},
    _err => {},
    { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
  );
}

let currentMode = 'takeaway';

function setMode(mode){
  currentMode = mode;
  document.querySelectorAll('#orderModes .seg-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  const deliveryPanel = document.getElementById('deliveryAddressWrap');
  const dineinPanel   = document.getElementById('dineInBlock');
  const mapWrap       = document.querySelector('.map-wrap');

  if(mode === 'delivery'){
    deliveryPanel.style.display = 'block';
    dineinPanel.style.display   = 'none';
    if(mapWrap){
      mapWrap.style.display = 'block';
      mapWrap.classList.add('fullscreen');       // plein écran
    }
    requestGeolocationAuth();
  } else if(mode === 'takeaway'){
    deliveryPanel.style.display = 'none';
    dineinPanel.style.display   = 'none';
    if(mapWrap){
      mapWrap.style.display = 'block';
      mapWrap.classList.add('fullscreen');       // plein écran
    }
  } else { // sur place
    deliveryPanel.style.display = 'none';
    dineinPanel.style.display   = 'block';
    if(mapWrap){
      mapWrap.classList.remove('fullscreen');
      mapWrap.style.display = 'none';            // pas de carte
    }
  }

  // titre / info
  const title=qs('#orderModeTitle'), info=qs('#orderInfo');
  const fn=(getProfile().firstName||'chef');
  if(mode==='takeaway'){
    title.textContent='Click & Collect';
    info.textContent=`${fn}, passe ta commande et viens la récupérer.`;
  } else if(mode==='delivery'){
    title.textContent='Livraison';
    info.textContent=`${fn}, indique ton adresse de livraison.`;
  } else {
    title.textContent='Sur place';
    info.textContent=`${fn}, indique ton numéro de table.`;
  }

  window.scrollTo({top:0, behavior:'smooth'});
}

/* Vérif / centrage adresse */
async function handleAddressSubmit(){
  const input = document.getElementById('deliveryAddress');
  if(!input) return;
  const q = input.value.trim();
  if(!q){ showToast('Entre une adresse', 1400, 'bottom'); return; }

  try{
    const pt = await geocode(q);
    centerIframeTo(pt.lat, pt.lng, 16);

    // distance par rapport au resto
    let resto = RESTO_FALLBACK;
    try{ resto = await geocode(RESTO_ADDR); }catch(_){}
    const d = haversine(resto, pt);
    if(d > DELIVERY_RADIUS_M){
      showToast('Adresse hors zone (5 km)', 1800, 'bottom');
      return;
    }
    showToast('Adresse OK ✅', 1500, 'bottom');
  }catch(_err){
    showToast('Adresse introuvable', 1500, 'bottom');
  }
}

/* Auto-complétion adresse (Nominatim) */
function debounce(fn, delay=250){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), delay); };
}
async function fetchAddressSuggest(q){
  if(!q || q.length < 3) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'be,fr');
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json', 'User-Agent': 'MSApp/1.0 (demo)' }
  });
  if(!res.ok) return [];
  return await res.json();
}
function bindAddressAutocomplete(){
  const input = document.getElementById('deliveryAddress');
  const box   = document.getElementById('addrSuggest');
  if(!input || !box) return;

  const render = (items)=>{
    if(!items.length){ box.style.display='none'; box.innerHTML=''; return; }
    box.innerHTML = items.map(it=>`<div class="item" data-lat="${it.lat}" data-lng="${it.lon}">
      ${it.display_name}
    </div>`).join('');
    box.style.display='block';
  };

  const onInput = debounce(async ()=>{
    const q = input.value.trim();
    const res = await fetchAddressSuggest(q);
    render(res);
  }, 250);

  input.addEventListener('input', onInput);
  input.addEventListener('focus', onInput);
  input.addEventListener('blur', ()=> setTimeout(()=>{ box.style.display='none'; }, 180));

  box.addEventListener('click', (e)=>{
    const it = e.target.closest('.item'); if(!it) return;
    input.value = e.target.textContent.trim();
    box.style.display='none';
    centerIframeTo(parseFloat(it.dataset.lat), parseFloat(it.dataset.lng), 16);
    showToast('Adresse sélectionnée ✅', 1400, 'bottom');
  });
}

/* ===== CTA ===== */
function bindCTA(){
  const openOrder = ()=>{
    switchTab('order'); // -> body.ordering + setMode()
  };
  document.getElementById('ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrder();
  });

  // Raccourcis espace client
  document.getElementById('tileOrders')?.addEventListener('click', ()=> switchTab('orders'));
  document.getElementById('tileProfile')?.addEventListener('click', ()=> switchTab('profile'));

  // Modes
  document.getElementById('orderModes')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.seg-btn');
    if(!b) return;
    setMode(b.dataset.mode);
  });

  // Adresse
  document.getElementById('checkAddressBtn')?.addEventListener('click', handleAddressSubmit);
}

/* ===== Profil / Fidélité ===== */
function bindProfile(){
  qs('#saveProfileBtn')?.addEventListener('click',()=>{
    const p={...getProfile(),
      firstName:(qs('#profileName').value||'').trim(),
      email:(qs('#profileEmail').value||'').trim(),
      phone:(qs('#profilePhone').value||'').trim()
    };
    setProfile(p); renderLoyalty(); showToast('Profil enregistré ✅', 1400, 'bottom');
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
  bindAddressAutocomplete();

  // Onglet par défaut : Accueil
  switchTab('home');
});

/* ===== PWA: keep SW fresh ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
