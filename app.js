/* ================== Helpers ================== */
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];
const get = (k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}};
const set = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
function showToast(msg,dur=1500){const t=qs('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),dur);}

/* ================== Onglets (100% fiables) ================== */
function hardSwitchTab(tab){
  // activer le bouton
  qsa('.tabbar [data-tab]').forEach(b=> b.classList.toggle('active', b.dataset.tab===tab));
  // activer la section
  qsa('.tab').forEach(s=> s.classList.toggle('active', s.id === `tab-${tab}`));
  // remonter en haut
  window.scrollTo({top:0, behavior:'smooth'});
}
function bindTabs(){
  // délégation globale : capte tous les clics sur la tabbar (icône, img, etc.)
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.tabbar [data-tab]');
    if(!btn) return;
    e.preventDefault();
    hardSwitchTab(btn.dataset.tab);
  });
}

/* ================== Modals (robustes) ================== */
function openModal(sel){
  const m = qs(sel);
  if(!m) return;
  m.classList.add('show');
  m.style.display = 'block';
  m.setAttribute('aria-hidden','false');
}
function closeModal(sel){
  const m = qs(sel);
  if(!m) return;
  m.classList.remove('show');
  m.style.display = '';
  m.setAttribute('aria-hidden','true');
}

/* ================== CTA & Commande ================== */
function bindCTA(){
  const openSelector = ()=> openModal('#orderTypeModal');

  // 1) écouteur direct sur le bouton CTA
  qs('#ctaOrder')?.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    openSelector();
  });

  // 2) délégation globale en secours (clic sur l'image interne, etc.)
  document.addEventListener('click', (e)=>{
    const cta   = e.target.closest('#ctaOrder');
    const goTop = e.target.closest('#goOrderTop');
    if(!cta && !goTop) return;
    e.preventDefault();
    openSelector();
  });

  // Choix des modes (ouvre l’onglet Commande)
  qs('#otClickCollect')?.addEventListener('click', ()=>{
    closeModal('#orderTypeModal');
    openOrderTab('takeaway');
  });
  qs('#otDelivery')?.addEventListener('click', ()=>{
    closeModal('#orderTypeModal');
    openOrderTab('delivery');
  });
  qs('#otDineIn')?.addEventListener('click', ()=>{
    const n=(qs('#tableNumberModal')?.value||'').trim();
    if(n && !/^\d{1,4}$/.test(n)){ showToast('Numéro de table invalide'); return; }
    closeModal('#orderTypeModal');
    openOrderTab('dinein', n || null);
  });
  qs('#orderTypeClose')?.addEventListener('click', ()=> closeModal('#orderTypeModal'));

  // Entrée => valider “Sur place”
  qs('#tableNumberModal')?.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      qs('#otDineIn')?.click();
    }
  });

  // Raccourcis espace client
  qs('#tileOrders')?.addEventListener('click', ()=> hardSwitchTab('orders'));
  qs('#tileProfile')?.addEventListener('click', ()=> hardSwitchTab('profile'));

  // Fallback debug utile : ouvre le modal depuis la console
  window.openOrderModal = ()=> openSelector();
}

function openOrderTab(mode, tableNo=null){
  hardSwitchTab('order');
  const title=qs('#orderModeTitle');
  const info =qs('#orderInfo');
  const dine =qs('#dineInBlock');

  const fn='chef'; // on simplifie pour le moment

  if(mode==='takeaway'){
    title.textContent='Click & Collect';
    info.textContent=`${fn}, passe ta commande et viens la récupérer.`;
    dine.style.display='none';
  }else if(mode==='delivery'){
    title.textContent='Livraison';
    info.textContent=`${fn}, la livraison arrive bientôt.`;
    dine.style.display='none';
  }else{
    title.textContent='Sur place';
    info.textContent=`${fn}, indique ton numéro de table.`;
    dine.style.display='grid';
    if(tableNo) qs('#tableNumber').value=tableNo;
  }

  qs('#orderStart').onclick=()=>showToast(`Flux commande (${mode}) à brancher`);
}

/* ================== Bannière (inchangée, safe) ================== */
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

/* ================== Featured (neutralisé) ================== */
function renderFeatured(){
  const el = document.getElementById('featured');
  if(!el) return;
  el.innerHTML = '';
  el.style.display = 'none';
}

/* ================== Splash : 5s min, et ne bloque pas ================== */
(function(){
  const MIN_MS = 5000;          // 5s minimum
  const MAX_WAIT_MS = 9000;     // sécurité

  const minDelayP = new Promise(res=> setTimeout(res, MIN_MS));
  const maxTimeoutP = new Promise(res=> setTimeout(res, MAX_WAIT_MS));

  window.addEventListener('load', async ()=>{
    const splash = document.getElementById('splash');
    if(!splash) return;

    // pendant l’attente, on n’empêche pas les clics sous le splash si CSS est malmèné
    splash.style.pointerEvents = 'none';

    await Promise.race([minDelayP, maxTimeoutP]);

    splash.style.opacity = 0;
    setTimeout(()=> splash.remove(), 600);
  });
})();

/* ================== INIT ================== */
document.addEventListener('DOMContentLoaded', ()=>{
  // Onglet par défaut
  hardSwitchTab('home');

  // Brancher onglets + CTA
  bindTabs();
  bindCTA();

  // Divers
  renderFeatured();     // neutralisé
  initBannerCarousel();
});
