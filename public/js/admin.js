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
    if(preview){ if(preview.tagName==='IMG') preview.src=url; else preview.innerHTML=`<img src="${url}" alt="Pré-visualização">`; }
  }));

  document.querySelectorAll('[data-gallery-input]').forEach(input=>input.addEventListener('change',()=>{
    const preview=input.closest('.form-section')?.querySelector('[data-gallery-preview]'); if(!preview)return; preview.innerHTML='';
    [...(input.files||[])].slice(0,8).forEach(file=>{const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=file.name;preview.appendChild(img)});
  }));

  let activeIconField=null;
  const iconModal=document.querySelector('[data-icon-picker-modal]');
  const setIcon=(field,value)=>{if(!field)return;const input=field.querySelector('[data-icon-value]');const icon=field.querySelector('.icon-live-preview i');if(input)input.value=value;if(icon)icon.className=`bi bi-${value}`};
  document.querySelectorAll('[data-icon-picker-open]').forEach(btn=>btn.addEventListener('click',()=>{activeIconField=btn.closest('.icon-picker-field');iconModal?.classList.add('open');iconModal?.setAttribute('aria-hidden','false');const search=iconModal?.querySelector('[data-icon-search]');if(search){search.value='';search.dispatchEvent(new Event('input'));setTimeout(()=>search.focus(),20)}}));
  document.querySelectorAll('[data-icon-picker-close]').forEach(btn=>btn.addEventListener('click',()=>{iconModal?.classList.remove('open');iconModal?.setAttribute('aria-hidden','true')}));
  document.querySelectorAll('[data-icon-option]').forEach(btn=>btn.addEventListener('click',()=>{setIcon(activeIconField,btn.dataset.iconOption);iconModal?.classList.remove('open');iconModal?.setAttribute('aria-hidden','true')}));
  const iconSearch=document.querySelector('[data-icon-search]');
  iconSearch?.addEventListener('input',()=>{const q=iconSearch.value.trim().toLowerCase();document.querySelectorAll('[data-icon-option]').forEach(btn=>btn.hidden=q&&!btn.dataset.iconLabel.includes(q))});
  document.querySelectorAll('[data-inline-confirm]').forEach(btn=>btn.addEventListener('click',e=>{if(!confirm(btn.dataset.inlineConfirm||'Confirmar esta ação?'))e.preventDefault()}));

  document.querySelectorAll('.settings-nav a').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}));
})();
