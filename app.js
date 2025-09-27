/* ===== Helpers ===== */
const qs  = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
function showToast(msg,dur=1500){const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

/* ===== Données démo ===== */
const KEY={PROFILE:'ms_profile',USERS:'ms_users'};
function getUsers(){return get(KEY.USERS,{});} function setUsers(u){set(KEY.USERS,u);}
function getProfile(){return get(KEY.PROFILE,{firstName:'',email:'',phone:''});}
function setProfile(p){set(KEY.PROFILE,p);}
function getPoints(email){const u=getUsers();return u[email]?.points||0;}

/* ===== Bannière carousel ===== */
function initBannerCarousel(){
  const track = qs('#bannerTrack');
  const dots  = qs('#bannerDots');
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

/* ===== MODE COMMANDE (segmented) ===== */
let currentMode = 'takeaway';
function setMode(mode){
  currentMode = mode;

  // visuel : bouton actif
  document.querySelectorAll('#orderModes .seg-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.mode === mode);
  });

  // zones conditionnelles
  const deliveryWrap = qs('#deliveryAddressWrap');
  const dineinBlock  = qs('#dineInBlock');
  const mapWrap      = qs('#tab-order .map-wrap');
  const titleEl      = qs('#orderModeTitle');
  const infoEl       = qs('#orderInfo');

  if(mode === 'delivery'){
    if(deliveryWrap) deliveryWrap.style.display = 'block';
    if(dineinBlock)  dineinBlock.style.display  = 'none';
    if(mapWrap)      mapWrap.style.display      = 'block';
    if(titleEl) titleEl.textContent = 'Livraison';
    if(infoEl)  infoEl.textContent  = 'Entre ton adresse pour vérifier la zone.';
  } else if(mode === 'takeaway'){
    if(deliveryWrap) deliveryWrap.style.display = 'none';
    if(dineinBlock)  dineinBlock.style.display  = 'none';
    if(mapWrap)      mapWrap.style.display      = 'block';
    if(titleEl) titleEl.textContent = 'À emporter';
    if(infoEl)  infoEl.textContent  = 'Passe ta commande et viens la récupérer.';
  } else { // dinein
    if(deliveryWrap) deliveryWrap.style.display = 'none';
    if(dineinBlock)  dineinBlock.style.display  = 'block';
    if(mapWrap)      mapWrap.style.display      = 'none'; // pas de carte sur place
    if(titleEl) titleEl.textContent = 'Sur place';
    if(infoEl)  infoEl.textContent  = 'Indique ton numéro de table.';
  }
}
function bindOrderModes(){
  qs('#orderModes')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.seg-btn');
    if(!btn) return;
    setMode(btn.dataset.mode);
  });
}

// --- Validation avant d'aller au menu ---
function canProceedToMenu() {
  const mode = (typeof currentMode === 'string' && currentMode) ? currentMode : 'takeaway';

  if (mode === 'delivery') {
    const addr = (qs('#deliveryAddress')?.value || '').trim();
    if (!addr) {
      showToast('Entre ton adresse de livraison 📍');
      qs('#deliveryAddress')?.focus();
      return false;
    }
  }

  if (mode === 'dinein') {
    const table = (qs('#tableNumber')?.value || '').trim();
    if (!table) {
      showToast('Indique ton numéro de table 🪑');
      qs('#tableNumber')?.focus();
      return false;
    }
  }

  return true;
}

function bindOrderStart() {
  qs('#orderStart')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!canProceedToMenu()) return;
    // OK → on affiche la vitrine (menu)
    switchTab('menu');
  });
}



/* ===== Tabs ===== */
function switchTab(tab){
  // activer boutons tabbar
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  // activer sections
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  // Flags de page
  document.body.classList.toggle('is-home',  tab === 'home');
  document.body.classList.toggle('ordering', tab === 'order'); // masque le CTA seulement

  // Repli/affichage bannière via CSS, et reset scroll propre
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  document.body.getBoundingClientRect(); // reflow
  const forceTop = ()=>{ try{window.scrollTo(0,0);}catch{} try{document.scrollingElement&&(document.scrollingElement.scrollTop=0);}catch{} };
  forceTop();
  requestAnimationFrame(()=>{ forceTop(); setTimeout(()=>{ forceTop(); html.style.scrollBehavior = prev || ''; }, 0); });

  // Remettre l'état visuel des modes quand on arrive sur "Commande"
  if (tab === 'order') setMode(currentMode || 'takeaway');
}
function bindTabbar(){
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tabbar [data-tab]');
    if(!btn) return;
    e.preventDefault();
    switchTab(btn.dataset.tab);
  });
}

/* ===== CTA ===== */
function bindCTA(){
  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    switchTab('order');
  });
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

/* ===== MENU (vitrine) ===== */
function bindMenuScreen(){
  // Bouton "Je commande" → onglet Commande
  document.getElementById('menuGoOrder')?.addEventListener('click', ()=> switchTab('order'));

  // Pilule visuelle (juste l'état actif)
  document.querySelector('#tab-menu .menu-mode-pill')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('.pill-btn'); if(!btn) return;
    document.querySelectorAll('#tab-menu .pill-btn').forEach(b=> b.classList.toggle('active', b===btn));
  });
}

/* ===== Splash (5–9s max) ===== */
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
  bindOrderModes();
  bindProfile();
  bindMenuScreen();         // ← ajout
  renderLoyalty();
  initBannerCarousel();

  // Onglet par défaut : Accueil
  switchTab('home');
});

/* ===== PWA: keep SW fresh ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
