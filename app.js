/* ===== Helpers ===== */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
const euro = n => n.toFixed(2).replace('.',',')+' €';
function showToast(msg,dur=1500){const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

/* ===== Données démo (inchangées) ===== */
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

/* ===== Bannière carousel (inchangé) ===== */
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

/* ===== Tabs ===== */
function toggleBannerFor(tab){
  const banner = document.querySelector('.banner');
  if(!banner) return;
  banner.style.display = (tab === 'home') ? 'block' : 'none';
}
function switchTab(tab){
  // active bouton
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  // active section
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  toggleBannerFor(tab);

  // Mode commande = CTA fade out (géré par CSS via body.ordering)
  if(tab === 'order'){
    document.body.classList.add('ordering');
    window.scrollTo({top:0, behavior:'smooth'});
  }else{
    document.body.classList.remove('ordering');
  }
}
function bindTabbar(){
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tabbar [data-tab]');
    if(!btn) return;
    e.preventDefault();
    switchTab(btn.dataset.tab);
  });
}

/* ===== CTA & ouverture "Commande" ===== */
function bindCTA(){
  const openOrderPage = ()=>{
    switchTab('order');                 // → ajoute body.ordering
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrderPage();
  });

  qs('#goOrderTop')?.addEventListener('click', (e)=>{
    e.preventDefault();
    openOrderPage();
  });

  // Choix mode commande (si présent dans ton HTML actuel)
  document.getElementById('orderModes')?.addEventListener('click', (e)=>{
    const b = e.target.closest('.mode-btn');
    if(!b) return;
    // visuel actif
    qsa('#orderModes .mode-btn').forEach(x=> x.classList.toggle('active', x===b));
    const title=qs('#orderModeTitle'), info=qs('#orderInfo');
    const fn=(getProfile().firstName||'chef');

    if(b.dataset.mode==='takeaway'){
      title.textContent='Click & Collect';
      info.textContent=`${fn}, passe ta commande et viens la récupérer.`;
      qs('#deliveryAddressWrap')?.setAttribute('style','display:none;margin-top:12px;');
      qs('#dineInBlock')?.setAttribute('style','display:none;margin-top:12px;');
    }else if(b.dataset.mode==='delivery'){
      title.textContent='Livraison';
      info.textContent=`${fn}, saisis ton adresse de livraison.`;
      qs('#deliveryAddressWrap')?.setAttribute('style','display:block;margin-top:12px;');
      qs('#dineInBlock')?.setAttribute('style','display:none;margin-top:12px;');
    }else{
      title.textContent='Sur place';
      info.textContent=`${fn}, indique ton numéro de table.`;
      qs('#deliveryAddressWrap')?.setAttribute('style','display:none;margin-top:12px;');
      qs('#dineInBlock')?.setAttribute('style','display:block;margin-top:12px;');
    }
  });

  // Valider l’adresse (placeholder pour plus tard)
  document.getElementById('checkAddressBtn')?.addEventListener('click', ()=>{
    const v = (qs('#deliveryAddress')?.value||'').trim();
    if(!v) return showToast('Entre une adresse');
    showToast('Adresse OK ✅', 1500);
  });

  // ENTER sur table
  qs('#tableNumber')?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){ e.preventDefault(); showToast('Table enregistrée ✅'); }
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
  renderFeatured();          // neutralisé (au cas où)
  bindTabbar();
  bindCTA();
  bindProfile();
  renderLoyalty();
  initBannerCarousel();

  // Onglet par défaut
  switchTab('home');         // => affiche la bannière
});

/* ===== PWA: keep SW fresh ===== */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(list => list.forEach(reg => reg.update()));
}
