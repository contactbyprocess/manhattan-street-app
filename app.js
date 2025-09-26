/* ===== Helpers ===== */
const qs  = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
function showToast(msg,dur=1500){const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

/* ===== Notifs “bannière message” ===== */
function showNotif(message, type='info', ms=3500){
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  // entrée
  requestAnimationFrame(()=> el.classList.add('show'));
  // sortie
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=> el.remove(), 300);
  }, ms);
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

  // Mode commande : on cache juste le CTA (CSS via body.ordering)
  if (tab === 'order') {
    document.body.classList.add('ordering');
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

/* ===== CTA ===== */
function bindCTA(){
  const openOrder = ()=> switchTab('order');
  document.getElementById('ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrder();
  });

  // Raccourcis espace client
  document.getElementById('tileOrders')?.addEventListener('click', ()=> switchTab('orders'));
  document.getElementById('tileProfile')?.addEventListener('click', ()=> switchTab('profile'));
}

/* ===== Modes de commande + Start ===== */
let CURRENT_MODE = 'takeaway'; // défaut

function bindOrderModes(){
  const wrap = document.getElementById('orderModes');
  if(!wrap) return;

  wrap.addEventListener('click', (e)=>{
    const b = e.target.closest('.seg-btn');
    if(!b) return;
    CURRENT_MODE = b.dataset.mode;

    // état visuel
    document.querySelectorAll('#orderModes .seg-btn')
      .forEach(x=> x.classList.toggle('active', x === b));

    // afficher/masquer champs selon le mode
    const del  = document.getElementById('deliveryAddressWrap');
    const dine = document.getElementById('dineInBlock');
    if(del)  del.style.display  = (CURRENT_MODE === 'delivery') ? 'block' : 'none';
    if(dine) dine.style.display = (CURRENT_MODE === 'dinein')   ? 'block' : 'none';

    // Titre / hint
    const title=qs('#orderModeTitle'), info=qs('#orderInfo');
    if(CURRENT_MODE==='takeaway'){
      title.textContent='Click & Collect';
      info.textContent='Passe ta commande et viens la récupérer.';
    }else if(CURRENT_MODE==='delivery'){
      title.textContent='Livraison';
      info.textContent='Entre ton adresse pour vérifier la zone.';
    }else{
      title.textContent='Sur place';
      info.textContent='Indique ton numéro de table.';
    }
  });

  // Active “À emporter” par défaut (déclenche tout l’état visuel)
  wrap.querySelector('[data-mode="takeaway"]')?.click();
}

function bindStartOrder(){
  const btn = document.getElementById('orderStart');
  if(!btn) return;

  btn.addEventListener('click', ()=>{
    if(CURRENT_MODE === 'delivery'){
      const val = (document.getElementById('deliveryAddress')?.value || '').trim();
      if(!val){
        showNotif('Entre une adresse de livraison avant de continuer.', 'info', 4000);
        return;
      }
      // Ici on pourrait valider la zone ensuite (plus tard)
      showNotif('Ouverture du menu… (livraison) ✅', 'success', 4000);
      return;
    }

    if(CURRENT_MODE === 'dinein'){
      const table = (document.getElementById('tableNumber')?.value || '').trim();
      if(!table){
        showNotif('Indique ton numéro de table 🙂', 'info', 3500);
        return;
      }
      showNotif('Ouverture du menu… (sur place) ✅', 'success', 4000);
      return;
    }

    // takeaway
    showNotif('Ouverture du menu… (à emporter) ✅', 'success', 4000);
  });
}

/* ===== Profil / Fidélité ===== */
function bindProfile(){
  qs('#saveProfileBtn')?.addEventListener('click',()=>{
    const p={...getProfile(),
      firstName:(qs('#profileName').value||'').trim(),
      email:(qs('#profileEmail').value||'').trim(),
      phone:(qs('#profilePhone').value||'').trim()
    };
    setProfile(p); renderLoyalty(); showNotif('Profil enregistré ✅', 'success', 2500);
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
  bindOrderModes();         // <<< modes “delivery/takeaway/dinein”
  bindStartOrder();         // <<< bouton “Commencer ma commande”
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
