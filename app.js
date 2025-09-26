<script>
// ===== Helpers =====
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

// ===== Notifs (style “message” en haut) =====
function showNotif(msg, type='info', dur=2200){
  let box = qs('#notifBar');
  if(!box){
    box = document.createElement('div');
    box.id = 'notifBar';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.className = `notif ${type} show`;
  clearTimeout(showNotif._t);
  showNotif._t = setTimeout(()=> box.classList.remove('show'), dur);
}

// ===== Données démo (inchangées) =====
const KEY={PROFILE:'ms_profile',USERS:'ms_users',PRODUCTS:'ms_products'};
function getUsers(){return get(KEY.USERS,{});} function setUsers(u){set(KEY.USERS,u);}
function getProfile(){return get(KEY.PROFILE,{firstName:'',email:'',phone:''});}
function setProfile(p){set(KEY.PROFILE,p);}
function getPoints(email){const u=getUsers();return u[email]?.points||0;}

// ===== Bannière carousel =====
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

// ===== Featured neutralisé =====
function renderFeatured(){
  const el = document.getElementById('featured');
  if (!el) return;
  el.innerHTML = '';
  el.style.display = 'none';
}

// ===== Tabs =====
function switchTab(tab){
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  // Bannière uniquement sur l’accueil
  const hb = document.getElementById('homeBanner');
  if (hb) hb.style.display = (tab === 'home' ? 'block' : 'none');

  // Mode commande : on conserve la tabbar identique (pas de changement de gap/tailles)
  if (tab === 'order') {
    document.body.classList.add('ordering'); // cache juste le CTA via CSS
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

// ===== Autocomplete Nominatim (livraison) =====
let acAbort = null;
async function fetchAddrSuggestions(q){
  if(acAbort) acAbort.abort();
  acAbort = new AbortController();
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '5');
  const res = await fetch(url.toString(), {
    headers:{'Accept':'application/json','User-Agent':'MSApp/1.0 (demo)'},
    signal: acAbort.signal
  });
  if(!res.ok) return [];
  const data = await res.json();
  return data.map(r=>({label:r.display_name, lat:+r.lat, lng:+r.lon}));
}
function ensureSuggestBox(){
  let box = qs('#addrSuggest');
  if(!box){
    box = document.createElement('div');
    box.id = 'addrSuggest';
    document.body.appendChild(box);
  }
  return box;
}
function positionSuggestBox(input){
  const box = ensureSuggestBox();
  const r = input.getBoundingClientRect();
  box.style.position='fixed';
  box.style.left = (r.left) + 'px';
  box.style.top  = (r.bottom + 6) + 'px';
  box.style.width= (r.width) + 'px';
}

// ===== Commande (fonctionnel simple) =====
const RESTO_ADDR = 'Petite rue 10, Mouscron 7700, Belgique';
const RESTO_POS  = { lat:50.744, lng:3.214 }; // fallback
const DELIVERY_RADIUS_M = 5000;

function haversine(a, b){
  const R=6371000, toRad = d=>d*Math.PI/180;
  const dLat = toRad(b.lat-a.lat), dLng = toRad(b.lng-a.lng);
  const s1 = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s1));
}

let currentMode = 'takeaway';
let lastValidDelivery = null;

function setMode(mode){
  currentMode = mode;
  // Segmented visuel
  document.querySelectorAll('#orderModes .seg-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  const deliveryWrap = qs('#deliveryAddressWrap');
  const dineBlock    = qs('#dineInBlock');
  const mapWrap      = qs('#tab-order .map-wrap');

  // Panneaux
  if(deliveryWrap) deliveryWrap.style.display = (mode==='delivery' ? 'block' : 'none');
  if(dineBlock)    dineBlock.style.display    = (mode==='dinein'   ? 'block' : 'none');

  // Map visible uniquement en “livraison” ou “à emporter”
  if(mapWrap) mapWrap.style.display = (mode==='dinein' ? 'none' : 'block');

  // Titre / info
  const title=qs('#orderModeTitle'), info=qs('#orderInfo');
  const fn=(getProfile().firstName||'chef');
  if(mode==='delivery'){
    title.textContent='Livraison';
    info.textContent=`${fn}, indique ton adresse.`;
  }else if(mode==='dinein'){
    title.textContent='Sur place';
    info.textContent=`${fn}, indique ton numéro de table.`;
  }else{
    title.textContent='Click & Collect';
    info.textContent=`${fn}, passe ta commande et viens la récupérer.`;
  }
}

async function validateDeliveryAddress(q){
  if(!q || q.length<5){ showNotif('Entre une adresse complète', 'error', 2600); return; }
  // on prend la première suggestion comme “géocodage” simple
  const list = await fetchAddrSuggestions(q);
  if(!list.length){ showNotif('Adresse introuvable', 'error', 2600); return; }
  const pt = list[0];
  const d = haversine(RESTO_POS, pt);
  if(d > DELIVERY_RADIUS_M){
    showNotif('Désolé, hors zone de livraison (5 km)', 'error', 3200);
    lastValidDelivery = null;
    return;
  }
  lastValidDelivery = pt;
  showNotif('Adresse OK ✅', 'success', 2400);
}

function openMenuFlow(){
  // Ici on branchera l’écran du menu réel.
  // Pour l’instant : aucun toast, pas de popup — on log juste.
  // Tu peux remplacer par: window.location.href = 'menu.html';
  console.log('[menu] ouverture du menu…');
}

// ===== CTA & interactions =====
function bindCTA(){
  // Ouvrir l’onglet commande
  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    switchTab('order');
  });

  // Segmented control
  qs('#orderModes')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.seg-btn');
    if(!b) return;
    setMode(b.dataset.mode);
  });

  // Valider l’adresse (bouton)
  qs('#checkAddressBtn')?.addEventListener('click', async ()=>{
    const q = (qs('#deliveryAddress')?.value||'').trim();
    await validateDeliveryAddress(q);
  });

  // Autocomplete : au fil de la frappe
  const addr = qs('#deliveryAddress');
  if(addr){
    addr.addEventListener('input', async()=>{
      const q = addr.value.trim();
      const box = ensureSuggestBox();
      if(q.length < 3){ box.innerHTML=''; box.className='addr-suggest'; return; }
      positionSuggestBox(addr);
      box.className='addr-suggest open';
      box.innerHTML = '<div class="s-item muted">Recherche…</div>';
      try{
        const list = await fetchAddrSuggestions(q);
        if(!list.length){ box.innerHTML = '<div class="s-item muted">Aucune suggestion</div>'; return; }
        box.innerHTML = list.map(it=>`<div class="s-item" data-lat="${it.lat}" data-lng="${it.lng}" data-label="${it.label.replace(/"/g,'&quot;')}">${it.label}</div>`).join('');
      }catch{
        box.innerHTML = '<div class="s-item muted">Erreur réseau</div>';
      }
    });

    // choix d’une suggestion
    document.addEventListener('click', (e)=>{
      const item = e.target.closest('#addrSuggest .s-item');
      if(!item || item.classList.contains('muted')) return;
      const label = item.dataset.label;
      const lat   = +item.dataset.lat;
      const lng   = +item.dataset.lng;
      qs('#deliveryAddress').value = label;
      ensureSuggestBox().className='addr-suggest'; // ferme
      const d = haversine(RESTO_POS, {lat, lng});
      if(d > DELIVERY_RADIUS_M){
        showNotif('Désolé, hors zone de livraison (5 km)', 'error', 3200);
        lastValidDelivery = null;
      }else{
        lastValidDelivery = {lat,lng,label};
        showNotif('Adresse OK ✅', 'success', 2400);
      }
    });

    // clique à l’extérieur → ferme
    document.addEventListener('click', (e)=>{
      if(!e.target.closest('#addrSuggest') && e.target !== addr){
        ensureSuggestBox().className='addr-suggest';
      }
    });
  }

  // “Commencer ma commande” → ouvre le menu (pas de notif)
  qs('#orderStart')?.addEventListener('click', ()=>{
    if(currentMode==='delivery' && !lastValidDelivery){
      showNotif('Valide d’abord une adresse de livraison', 'error', 2600);
      return;
    }
    openMenuFlow();
  });

  // Raccourcis espace client
  qs('#tileOrders')?.addEventListener('click', ()=> switchTab('orders'));
  qs('#tileProfile')?.addEventListener('click', ()=> switchTab('profile'));
}

// ===== Profil / Fidélité =====
function bindProfile(){
  qs('#saveProfileBtn')?.addEventListener('click',()=>{
    const p={...getProfile(),
      firstName:(qs('#profileName').value||'').trim(),
      email:(qs('#profileEmail').value||'').trim(),
      phone:(qs('#profilePhone').value||'').trim()
    };
    setProfile(p); renderLoyalty(); showNotif('Profil enregistré ✅','success',1800);
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

// ===== Splash 5s min =====
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

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  renderFeatured();
  bindTabbar();
  bindCTA();
  bindProfile();
  renderLoyalty();
  initBannerCarousel();
  switchTab('home'); // onglet par défaut
});

// ===== SW refresh =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
</script>
