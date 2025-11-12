// Smooth scroll + resaltado de sección actual
const links = [...document.querySelectorAll('.menu a')];
const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);

links.forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const id = a.getAttribute('href');
    document.querySelector(id)?.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

const spy = () => {
  const pos = window.scrollY + 120;
  let current = links[0];
  sections.forEach((sec,i)=>{
    if (pos >= sec.offsetTop) current = links[i];
  });
  links.forEach(l=>l.classList.remove('is-active'));
  current?.classList.add('is-active');
};
spy();
window.addEventListener('scroll', spy);

// Menú móvil
const hamb = document.getElementById('hamb');
const menu = document.getElementById('menu');
hamb?.addEventListener('click', ()=>{
  if (menu.style.display === 'flex') {
    menu.style.display = '';
  } else {
    menu.style.display = 'flex';
    menu.style.flexDirection = 'column';
    menu.style.gap = '12px';
    menu.style.position = 'absolute';
    menu.style.right = '20px';
    menu.style.top = '60px';
    menu.style.background = '#ffffff';
    menu.style.border = '1px solid #e5edf5';
    menu.style.borderRadius = '12px';
    menu.style.padding = '12px';
    menu.style.boxShadow = '0 15px 30px rgba(0,0,0,.12)';
  }
});

// Micro-animación en los slots (brillito al pasar)
document.querySelectorAll('.slot').forEach(slot=>{
  slot.addEventListener('mousemove', (e)=>{
    const r = slot.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    slot.style.setProperty('--mx', `${x}px`);
    slot.style.setProperty('--my', `${y}px`);
    slot.style.background =
      `radial-gradient(220px 160px at var(--mx) var(--my), rgba(34,211,238,.10), transparent 60%), #fff`;
  });
  slot.addEventListener('mouseleave', ()=>{
    slot.style.background = '#fff';
  });
});

// Placeholder: si quieres inyectar luego tarjetas reales, usa este ancla:
window.ECOVOLT_PANEL_MOUNT = function mount(htmlByKey){
  // htmlByKey: { temperature: '<div>…</div>', power:'…', ... }
  Object.entries(htmlByKey).forEach(([key,html])=>{
    const cell = document.querySelector(`.slot[data-key="${key}"] .slot__body`);
    if (cell) cell.innerHTML = html;
  });
};
