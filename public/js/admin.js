(()=>{
  const body=document.body;
  const shell=document.getElementById('adminShell');
  document.querySelectorAll('[data-sidebar-open]').forEach(b=>b.addEventListener('click',()=>shell?.classList.add('sidebar-open')));
  document.querySelectorAll('[data-sidebar-close]').forEach(b=>b.addEventListener('click',()=>shell?.classList.remove('sidebar-open')));

  document.querySelectorAll('[data-alert-close]').forEach(b=>b.addEventListener('click',()=>b.closest('.alert')?.remove()));
  setTimeout(()=>document.querySelectorAll('.alert.auto-dismiss').forEach(a=>a.classList.add('fade-out')),3800);
  setTimeout(()=>document.querySelectorAll('.alert.fade-out').forEach(a=>a.remove()),4300);

  const closeMenus=()=>document.querySelectorAll('.action-menu.open').forEach(m=>m.classList.remove('open'));
  document.querySelectorAll('[data-menu-button]').forEach(btn=>btn.addEventListener('click',e=>{
    e.stopPropagation(); const menu=document.getElementById(btn.dataset.menuButton); const open=menu?.classList.contains('open'); closeMenus(); if(menu&&!open) menu.classList.add('open');
  }));
  document.addEventListener('click',closeMenus);
  document.querySelectorAll('.action-menu').forEach(m=>m.addEventListener('click',e=>e.stopPropagation()));

  document.querySelectorAll('form[data-confirm]').forEach(form=>form.addEventListener('submit',e=>{if(!confirm(form.dataset.confirm||'Confirmar esta ação?'))e.preventDefault()}));
  document.querySelectorAll('[data-submit-confirm]').forEach(btn=>btn.addEventListener('click',()=>{const form=document.getElementById(btn.dataset.submitConfirm);if(form&&confirm(form.dataset.confirm||'Confirmar esta ação?'))form.submit()}));

  document.querySelectorAll('[data-image-input]').forEach(input=>input.addEventListener('change',()=>{
    const file=input.files?.[0]; if(!file)return; const url=URL.createObjectURL(file); const preview=input.closest('form')?.querySelector('[data-image-preview]');
    if(preview){ preview.innerHTML=`<img src="${url}" alt="Pré-visualização">`; }
  }));

  document.querySelectorAll('.settings-nav a').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}));
})();
