/* ===== Helpers ===== */
const qs = s => document.querySelector(s);
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

/* ===== Tabs ===== */
function switchTab(tab){
  // activer boutons
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  // activer sections
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id===`tab-${tab}`));

  // Bannière uniquement sur l’accueil
  const hb = document.getElementById('homeBanner');
  if (hb) hb.style.display = (tab === 'home' ? 'block' : 'none');

  // Mode commande : CTA fade (gap inchangé)
  if (tab === 'order') {
    document.body.classList.add('ordering');
  } else {
    document.body.classList.remove('ordering');
  }

  // hotfix reflow
  document.body.getBoundingClientRect();
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(0, 0);
  requestAnimationFrame(() => { html.style.scrollBehavior = prev || ''; });
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
  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault(); e.stopPropagation();
    openOrder();
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

/* ===== === MENU v1 === ===== */

/* état du mode (lié aux boutons de l’onglet Commande) */
let orderMode = 'takeaway'; // 'takeaway' | 'delivery' | 'dinein'

document.getElementById('orderModes')?.addEventListener('click', (e)=>{
  const b = e.target.closest('.seg-btn'); if(!b) return;
  orderMode = b.dataset.mode;
  document.querySelectorAll('#orderModes .seg-btn')
    .forEach(x=> x.classList.toggle('active', x===b));
});

/* Données démo */
const MENU = {
  categories: [
    { id:'combos', name:'Formules Combo', emoji:'✌️🍔' },
    { id:'pullup', name:'Pull Up', emoji:'🍗' },
    { id:'burgers', name:'Burgers', emoji:'🍔' },
    { id:'sides', name:'Accompagnements', emoji:'🍟' },
    { id:'drinks', name:'Boissons', emoji:'🥤' },
  ],
  products: [
    { id:'c1', cat:'combos',  name:'Combo Crush',   desc:"Menu + bread + chili cheese", price:18.9, img:'' },
    { id:'c2', cat:'combos',  name:'Combo Bangers', desc:"Pour ceux qui aiment quand ça tape", price:19.9, img:'' },
    { id:'c3', cat:'combos',  name:"Combo Chick's", desc:"100% poulet: burger + tenders", price:23.9, img:'' },
    { id:'p1', cat:'pullup',  name:'Grrrr',         desc:"Poulet crousti + sauce secrète", price:10.9, img:'' },
    { id:'b1', cat:'burgers', name:'Classic Manhattan', desc:"Steak, cheddar, sauce MS", price:7.9, img:'' },
    { id:'s1', cat:'sides',   name:'Frites Maison', desc:"Pommes de terre fraîches", price:2.8, img:'' },
    { id:'d1', cat:'drinks',  name:'Cola 33cl',     desc:"Bien frais", price:2.2, img:'' },
  ]
};
const EURO = n => n.toFixed(2).replace('.', ',')+' €';

function setMenuModePill(){
  const emoji = (orderMode==='delivery') ? '🚚' : (orderMode==='dinein' ? '🍽️' : '🏃‍♂️');
  const label = (orderMode==='delivery') ? 'En livraison' : (orderMode==='dinein' ? 'Sur place' : 'À emporter');
  const e = document.getElementById('menuModeEmoji');
  const t = document.getElementById('menuModeText');
  if(e) e.textContent = emoji;
  if(t) t.textContent = label;
}

function renderMenuSections(){
  const wrap = document.getElementById('menuSections'); if(!wrap) return;
  wrap.innerHTML = MENU.categories.map(cat=>{
    const items = MENU.products.filter(p=>p.cat===cat.id);
    return `
      <section class="menu-section" id="sec-${cat.id}">
        <div class="sec-header">${cat.name} ${cat.emoji||''}</div>
        ${items.map(p=>`
          <article class="item-card">
            <div class="meta">
              <div class="name">${p.name}</div>
              <div class="desc">${p.desc||''}</div>
              <div class="price">${EURO(p.price)}</div>
            </div>
            <div class="thumb">${p.img?`<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover">`:'Image'}</div>
          </article>
        `).join('')}
      </section>
    `;
  }).join('');
}

function renderMenuChips(){
  const chips = document.getElementById('menuChips'); if(!chips) return;
  chips.innerHTML = MENU.categories.map((c,i)=>`
    <button class="chip ${i===0?'active':''}" data-target="sec-${c.id}">
      ${c.emoji?`<span>${c.emoji}</span>`:''}<span>${c.name}</span>
    </button>
  `).join('');

  chips.querySelectorAll('.chip').forEach(ch=>{
    ch.addEventListener('click', ()=>{
      const id = ch.dataset.target;
      const el = document.getElementById(id);
      if(!el) return;
      el.scrollIntoView({ behavior:'smooth', block:'start' });
      chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c===ch));
    });
  });
}

function observeSectionsForChips(){
  const chips = document.getElementById('menuChips'); if(!chips) return;
  const map = new Map();
  chips.querySelectorAll('.chip').forEach(ch => map.set(ch.dataset.target, ch));

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(ent=>{
      if(ent.isIntersecting){
        const ch = map.get(ent.target.id);
        if(ch){
          chips.querySelectorAll('.chip').forEach(c=>c.classList.toggle('active', c===ch));
        }
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });

  document.querySelectorAll('.menu-section').forEach(sec=> io.observe(sec));
}

function openMenu(){
  switchTab('menu');
  setMenuModePill();
  renderMenuChips();
  renderMenuSections();
  observeSectionsForChips();
}

/* Lancer le menu depuis l’onglet commande */
document.getElementById('orderStart')?.addEventListener('click', (e)=>{
  e.preventDefault();
  openMenu();
});

/* ===== INIT ===== */
document.addEventListener('DOMContentLoaded',()=>{
  renderFeatured();
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
