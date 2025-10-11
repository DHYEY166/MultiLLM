// ui.js - small helpers

export function $(sel, root=document){ return root.querySelector(sel); }
export function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

export function setActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  $all('header .nav a').forEach(a=>{
    const href = a.getAttribute('href');
    if ((href === './' && path === 'index.html') || href.endsWith(path)) a.classList.add('active');
  });
}

export function formatMs(ms){
  return `${Math.round(ms)} ms`;
}


