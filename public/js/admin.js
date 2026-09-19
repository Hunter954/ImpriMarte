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

  const categorySelect=document.querySelector('[data-category-select]');
  const subcategorySelect=document.querySelector('[data-subcategory-select]');
  const filterSubcategories=()=>{
    if(!categorySelect||!subcategorySelect)return;
    const categoryId=categorySelect.value;
    let selectedVisible=false;
    [...subcategorySelect.options].forEach((option,index)=>{
      if(index===0){option.hidden=false;return;}
      const visible=!!categoryId&&option.dataset.categoryId===categoryId;
      option.hidden=!visible; option.disabled=!visible;
      if(visible&&option.selected)selectedVisible=true;
    });
    if(!selectedVisible&&subcategorySelect.selectedIndex>0)subcategorySelect.value='';
    subcategorySelect.disabled=!categoryId;
  };
  categorySelect?.addEventListener('change',filterSubcategories);
  filterSubcategories();
  document.querySelectorAll('[data-inline-confirm]').forEach(btn=>btn.addEventListener('click',e=>{if(!confirm(btn.dataset.inlineConfirm||'Confirmar esta ação?'))e.preventDefault()}));

  const specList=document.querySelector('[data-spec-list]');
  const specRow=()=>{const row=document.createElement('div');row.className='spec-editor-row';row.dataset.specRow='';row.innerHTML=`<label><span class="mobile-field-label">Informação</span><input type="text" name="spec_label" placeholder="Ex.: Material" maxlength="80"></label><label><span class="mobile-field-label">Valor</span><input type="text" name="spec_value" placeholder="Ex.: Premium 210g" maxlength="180"></label><button type="button" class="icon-action danger spec-remove" data-spec-remove title="Remover linha" aria-label="Remover especificação"><i class="bi bi-trash3"></i></button>`;return row};
  const bindSpecRemove=root=>root.querySelectorAll('[data-spec-remove]').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',()=>{const rows=specList?.querySelectorAll('[data-spec-row]')||[];const row=btn.closest('[data-spec-row]');if(rows.length<=1){row?.querySelectorAll('input').forEach(input=>input.value='');row?.querySelector('input')?.focus();return}row?.remove()})});
  bindSpecRemove(document);
  document.querySelector('[data-spec-add]')?.addEventListener('click',()=>{if(!specList||specList.querySelectorAll('[data-spec-row]').length>=30)return;const row=specRow();specList.appendChild(row);bindSpecRemove(row);row.querySelector('input')?.focus()});

  document.querySelectorAll('[data-rich-editor]').forEach(editor=>{
    const area=editor.querySelector('[data-editor-area]');
    const input=editor.querySelector('[data-editor-input]');
    if(!area||!input)return;
    const sync=()=>{input.value=area.innerHTML.trim()};
    const focus=()=>{area.focus()};
    editor.querySelectorAll('[data-editor-command]').forEach(btn=>btn.addEventListener('click',()=>{focus();document.execCommand(btn.dataset.editorCommand,false,null);sync()}));
    editor.querySelectorAll('[data-editor-block]').forEach(btn=>btn.addEventListener('click',()=>{focus();document.execCommand('formatBlock',false,btn.dataset.editorBlock);sync()}));
    editor.querySelector('[data-editor-link]')?.addEventListener('click',()=>{const url=prompt('Cole o link que deseja inserir:','https://');if(!url)return;focus();document.execCommand('createLink',false,url);sync()});
    area.addEventListener('input',sync);
    area.addEventListener('blur',sync);
    area.closest('form')?.addEventListener('submit',sync);
  });

  document.querySelectorAll('.settings-nav a').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth',block:'start'})}}));
})();
