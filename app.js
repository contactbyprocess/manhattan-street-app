/* ===== Helpers ===== */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
const euro = n => n.toFixed(2).replace('.',',')+' €';
function showToast(msg,dur=1500){const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

/* ===== Données démo ===== */
const KEY={PROFILE:'ms_profile',USERS:'ms_users',PRODUCTS:'ms_products'};
const DEFAULT_PRODUCTS=[
  {id:'b1',name:'Classic Manhattan Burger',price:7.9,img:'https://picsum.photos/seed/b1/900/600',tags:['featured']},
  {id:'b2',name:'Cheese Lover Burger',price:8.5,img:'https://picsum.photos/seed/b2/900/600',tags:['featured']},
  {id:'h1',name:'NY Hot-Dog',price:5.9,img:'https://picsum.photos/seed/h1/900/600'},
  {id:'f1',name:'Frites Maison',price:2.8,img:'https://picsum.photos/seed/f1/900/600'}
];
function getProducts(){const p=get(KEY.PRODUCTS,null);if(p)return p;set(KEY.PRODUCTS,DEFAULT_PRODUCTS);return DEFAULT_PRODUCTS;}
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
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  // bannière visible uniquement sur Home
  const hb = document.getElementById('homeBanner');
  if(hb) hb.style.display = (tab === 'home' ? 'block' : 'none');

  // si on ouvre commande, on s'assure que la map est initialisée
  if(tab === 'order') {
    initOrderMapOnce().catch(()=>{ /* ignore */ });
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

/* ===== Commande / Cartographie ===== */
/* Resto : adresse & fallback coords */
const RESTO_ADDR = 'Petite rue 10, Mouscron 7700, Belgique';
const RESTO_FALLBACK = { lat: 50.744, lng: 3.214 };
const DELIVERY_RADIUS_M = 5000;

let map, restoMarker, clientMarker, radiusCircle;
let mapReady = false;
let currentMode = 'takeaway';

/* Haversine (mètres) */
function haversine(a, b){
  const R=6371000, toRad = d=>d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s1 = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s1));
}

/* Geocoding simple via Nominatim */
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

/* Init carte Leaflet (une fois) */
async function initOrderMapOnce(){
  if(mapReady) return;
  // s'assurer que Leaflet est chargé
  if(typeof L === 'undefined') return;

  let resto = RESTO_FALLBACK;
  try { resto = await geocode(RESTO_ADDR); } catch(e){ /* fallback accepté */ }

  map = L.map('orderMap', { zoomControl: true, attributionControl: false }).setView([resto.lat, resto.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  restoMarker = L.marker([resto.lat, resto.lng]).addTo(map).bindPopup('Restaurant');
  radiusCircle = L.circle([resto.lat, resto.lng], { radius: DELIVERY_RADIUS_M, fillOpacity: 0.04, color: '#A64027' }).addTo(map);

  // tenter la géolocalisation — déclenche la permission navigateur
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if(!clientMarker) clientMarker = L.marker([p.lat, p.lng]).addTo(map);
        else clientMarker.setLatLng([p.lat, p.lng]);
        map.setView([p.lat, p.lng], 15);
      },
      ()=>{ /* ignore si refus */ },
      { enableHighAccuracy:true, timeout:8000, maximumAge:0 }
    );
  }

  mapReady = true;
}

/* Appliquer mode sélectionné */
function setMode(mode){
  currentMode = mode;
  document.querySelectorAll('#orderModes .seg-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  const deliveryPanel = document.getElementById('deliveryPanel');
  const dineinPanel = document.getElementById('dineinPanel');
  deliveryPanel && (deliveryPanel.style.display = (mode==='delivery' ? 'block' : 'none'));
  dineinPanel && (dineinPanel.style.display = (mode==='dinein' ? 'block' : 'none'));

  if(mapReady){
    if(mode === 'takeaway' || mode === 'dinein'){
      const c = restoMarker.getLatLng();
      map.setView([c.lat, c.lng], 15);
    }
  }
}

/* traiter soumission adresse livraison */
async function handleAddressSubmit(e){
  e && e.preventDefault();
  const q = document.getElementById('deliveryAddress').value.trim();
  if(!q){ showToast('Entre une adresse'); return; }
  try{
    const pt = await geocode(q);
    if(!mapReady) await initOrderMapOnce();
    if(!clientMarker) clientMarker = L.marker([pt.lat, pt.lng]).addTo(map);
    else clientMarker.setLatLng([pt.lat, pt.lng]);

    const restoPos = restoMarker.getLatLng();
    const d = haversine({lat: restoPos.lat, lng: restoPos.lng}, pt);
    if(d > DELIVERY_RADIUS_M){
      showToast('Adresse hors zone (5 km)');
      map.setView([pt.lat, pt.lng], 14);
      return;
    }
    map.setView([pt.lat, pt.lng], 16);
    showToast('Adresse OK ✅', 2000);
    // ici tu peux enregistrer l'adresse / permettre la suite de commande
  }catch(err){
    showToast('Adresse introuvable');
  }
}

/* ===== CTA & commandes (liaison) ===== */
function bindCTA(){
  const openOrderPage = async ()=>{
    switchTab('order');
    await initOrderMapOnce();
    setMode(currentMode || 'takeaway');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.getElementById('ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrderPage();
  });
  document.getElementById('goOrderTop')?.addEventListener('click', (e)=>{
    e.preventDefault();
    openOrderPage();
  });

  // segmented control
  document.getElementById('orderModes')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.seg-btn');
    if(!b) return;
    setMode(b.dataset.mode);
  });

  // form adresse
  document.getElementById('addressForm')?.addEventListener('submit', handleAddressSubmit);

  // table inline ENTER
  document.getElementById('tableNumberInline')?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ e.preventDefault(); showToast('Table enregistrée ✅'); }
  });

  // raccourcis espace client
  document.getElementById('tileOrders')?.addEventListener('click', ()=> switchTab('orders'));
  document.getElementById('tileProfile')?.addEventListener('click', ()=> switchTab('profile'));
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

/* ===== Splash simple (5s mini) ===== */
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
  renderFeatured();
  bindTabbar();
  bindCTA();
  bindProfile();
  renderLoyalty();
  initBannerCarousel();

  // Onglet par défaut
  switchTab('home');
});

/* ===== PWA: keep SW fresh ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
