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

/* ===== Bannière ===== */
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
  // Liste retirée du HTML → no-op
  const el = document.getElementById('featured');
  if (!el) return;
  el.innerHTML = '';
  el.style.display = 'none';
}

/* ===== Tabs ===== */
function switchTab(tab){
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));
  window.scrollTo({top:0, behavior:'smooth'});
}
function bindTabbar(){
  qsa('.tabbar [data-tab]').forEach(btn=>{
    btn.addEventListener('click',()=> switchTab(btn.dataset.tab));
  });
}

/* ===== CTA & commandes ===== */
function bindCTA(){
  const openSel=()=>openModal('#orderTypeModal');

  // CTA “Commander” dans la home
  qs('#goOrderTop')?.addEventListener('click', openSel);

  // Choix du mode de commande
  qs('#otClickCollect')?.addEventListener('click',()=>{closeModal('#orderTypeModal');openOrderTab('takeaway');});
  qs('#otDelivery')?.addEventListener('click',()=>{closeModal('#orderTypeModal');openOrderTab('delivery');});
  qs('#otDineIn')?.addEventListener('click',()=>{
    const n=(qs('#tableNumberModal')?.value||'').trim();
    closeModal('#orderTypeModal');
    openOrderTab('dinein',n);
  });
  qs('#orderTypeClose')?.addEventListener('click',()=>closeModal('#orderTypeModal'));

  // Raccourcis espace client
  qs('#tileOrders')?.addEventListener('click',()=>switchTab('orders'));
  qs('#tileProfile')?.addEventListener('click',()=>switchTab('profile'));
}

function openOrderTab(mode, tableNo=null){
  switchTab('order');
  const title=qs('#orderModeTitle'), info=qs('#orderInfo'), dine=qs('#dineInBlock');
  const fn=(getProfile().firstName||'chef');
  if(mode==='takeaway'){
    title.textContent='Click & Collect';
    info.textContent=`${fn}, passe ta commande et viens la récupérer.`;
    dine.style.display='none';
  } else if(mode==='delivery'){
    title.textContent='Livraison';
    info.textContent=`${fn}, la livraison arrive bientôt.`;
    dine.style.display='none';
  } else {
    title.textContent='Sur place';
    info.textContent=`${fn}, indique ton numéro de table.`;
    dine.style.display='grid';
    if(tableNo) qs('#tableNumber').value=tableNo;
  }
  qs('#orderStart').onclick=()=>showToast(`Flux commande (${mode}) à brancher`);
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

/* ===== Modals ===== */
function openModal(sel){qs(sel)?.classList.add('show');}
function closeModal(sel){qs(sel)?.classList.remove('show');}

/* ===== Splash “smart” : 5s min + prêt applicatif ===== */
(function(){
  const MIN_MS = 5000;             // 5s minimum
  const MAX_WAIT_MS = 9000;        // sécurité : au plus ~9s
  const startTs = Date.now();

  // Promesse: “app prête” (évènement custom)
  const appReadyP = new Promise(resolve => {
    document.addEventListener('app:ready', resolve, { once:true });
  });

  // Promesse: bannières chargées (ou résolues si erreur)
  function waitForBannerImages() {
    const imgs = [...document.querySelectorAll('.banner-track img')];
    if (imgs.length === 0) return Promise.resolve();
    return Promise.all(imgs.map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(res => {
        const done = () => res();
        img.addEventListener('load', done, { once:true });
        img.addEventListener('error', done, { once:true });
      });
    }));
  }

  // Promesse: min 5s écoulées
  const minDelayP = new Promise(res => {
    const left = Math.max(0, MIN_MS - (Date.now() - startTs));
    setTimeout(res, left);
  });

  // Promesse: timeout sécurité
  const maxTimeoutP = new Promise(res => setTimeout(res, MAX_WAIT_MS));

  window.addEventListener("load", async () => {
    const splash = document.getElementById("splash");
    if (!splash) return;

    await Promise.race([
      Promise.all([minDelayP, appReadyP, waitForBannerImages()]),
      maxTimeoutP
    ]);

    splash.style.opacity = 0;
    setTimeout(() => splash.remove(), 600);
  });
})();

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded',()=>{
  renderFeatured();     // no-op (liste retirée)
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
