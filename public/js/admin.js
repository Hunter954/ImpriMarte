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

// Calculadora de orçamento de adesivos
(()=>{
  const root=document.querySelector('[data-quote-calculator]');
  if(!root)return;
  const n=(v,f=0)=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:f};
  const cfg={sheetWidth:n(root.dataset.sheetWidth,29.7),sheetHeight:n(root.dataset.sheetHeight,42),maxPrintWidth:n(root.dataset.maxPrintWidth,48),spacing:n(root.dataset.spacing,0),cutPrice:n(root.dataset.cutPrice,40),noCutPrice:n(root.dataset.noCutPrice,36),cutThree:n(root.dataset.cutThree,140),noCutThree:n(root.dataset.noCutThree,120)};
  const $=s=>root.querySelector(s);
  const fields={width:$('[data-quote-width]'),height:$('[data-quote-height]'),qty:$('[data-quote-quantity]'),cut:$('[data-quote-cut]')};
  const outputs={total:$('[data-quote-total]'),unit:$('[data-quote-unit]'),capacity:$('[data-quote-capacity]'),sheets:$('[data-quote-sheets]'),cutLabel:$('[data-quote-cut-label]'),production:$('[data-quote-production]'),method:$('[data-quote-method]'),note:$('[data-price-rule-note]')};
  const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  function rect(W,H,w,h,g){const c=(A,B,a,b)=>a>0&&b>0&&A>=a&&B>=b?Math.floor((A+g)/(a+g))*Math.floor((B+g)/(b+g)):0;return Math.max(c(W,H,w,h),c(W,H,h,w))}
  function circleOne(W,H,d,g){if(W<d||H<d)return 0;const step=d+g,pitch=Math.sqrt(3)/2*step;const rows=1+Math.floor((H-d)/pitch);let total=0;for(let r=0;r<rows;r++){const off=r%2?step/2:0,usable=W-off;if(usable>=d)total+=1+Math.floor((usable-d)/step)}return total}
  function circle(W,H,d,g){return Math.max(circleOne(W,H,d,g),circleOne(H,W,d,g))}
  function triOne(W,H,b,h,g){if(W<b||H<h)return 0;const rows=1+Math.floor((H-h)/(h+g));const per=1+Math.floor((W-b)/(b/2+g));return rows*per}
  function tri(W,H,b,h,g){return Math.max(triOne(W,H,b,h,g),triOne(W,H,h,b,g))}
  function capacity(shape,w,h){const W=Math.min(cfg.sheetWidth,cfg.maxPrintWidth),H=cfg.sheetHeight,g=Math.max(0,cfg.spacing);if(shape==='circle')return Math.max(1,circle(W,H,w,g));if(shape==='triangle')return Math.max(1,tri(W,H,w,h,g));return Math.max(1,rect(W,H,w,h,g))}
  function price(sheets,cut){const unit=cut?cfg.cutPrice:cfg.noCutPrice,third=cut?cfg.cutThree:cfg.noCutThree;if(sheets<=2)return sheets*unit;return third+(sheets-3)*unit}
  function shape(){return root.querySelector('input[name="shape"]:checked')?.value||'rectangle'}
  function labels(sh){const wl=root.querySelector('[data-width-label]'),hl=root.querySelector('[data-height-label]'),hf=root.querySelector('[data-height-field]');if(sh==='circle'){wl.textContent='Diâmetro';hf.style.display='none';fields.height.value=fields.width.value}else{hf.style.display='grid';wl.textContent=sh==='triangle'?'Base':'Largura';hl.textContent=sh==='triangle'?'Altura do triângulo':'Altura'}}
  function drawPreview(sh,w,h,cap){const canvas=$('[data-packing-canvas]');if(!canvas)return;const dpr=window.devicePixelRatio||1,cssW=canvas.clientWidth||520,cssH=canvas.clientHeight||205;canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cssW,cssH);const g=cfg.spacing;let logicalW=cfg.sheetWidth,logicalH=cfg.sheetHeight,itemW=w,itemH=h;
    if(sh==='circle'&&circleOne(cfg.sheetHeight,cfg.sheetWidth,w,g)>circleOne(cfg.sheetWidth,cfg.sheetHeight,w,g)){logicalW=cfg.sheetHeight;logicalH=cfg.sheetWidth}
    if((sh==='rectangle'||sh==='custom')&&rect(logicalW,logicalH,h,w,g)>rect(logicalW,logicalH,w,h,g)){itemW=h;itemH=w}
    if(sh==='triangle'&&triOne(logicalW,logicalH,h,w,g)>triOne(logicalW,logicalH,w,h,g)){itemW=h;itemH=w}
    const pad=15,W=cssW-pad*2,H=cssH-pad*2,sheetRatio=logicalW/logicalH;let sw=W,shh=sw/sheetRatio;if(shh>H){shh=H;sw=shh*sheetRatio}const ox=(cssW-sw)/2,oy=(cssH-shh)/2;c.strokeStyle='#d7cfc9';c.lineWidth=1;c.strokeRect(ox,oy,sw,shh);c.fillStyle='#fcfbfa';c.fillRect(ox+.5,oy+.5,sw-1,shh-1);c.strokeStyle='#e66914';c.lineWidth=.8;const sx=sw/logicalW,sy=shh/logicalH;let drawn=0,max=Math.min(cap,120);
    if(sh==='circle'){const d=w,step=d+g,pitch=Math.sqrt(3)/2*step;for(let y=d/2;y+d/2<=logicalH+.001&&drawn<max;y+=pitch){const row=Math.round((y-d/2)/pitch),off=row%2?step/2:0;for(let x=d/2+off;x+d/2<=logicalW+.001&&drawn<max;x+=step){c.beginPath();c.arc(ox+x*sx,oy+y*sy,Math.min(d*sx,d*sy)/2,0,Math.PI*2);c.stroke();drawn++}}}
    else if(sh==='triangle'){const b=itemW,hh=itemH,rowStep=hh+g,pitch=b/2+g;for(let y=0;y+hh<=logicalH+.001&&drawn<max;y+=rowStep){let i=0;for(let x=0;x+b<=logicalW+b/2+.001&&drawn<max;x+=pitch,i++){const left=ox+x*sx,top=oy+y*sy,bw=b*sx,bh=hh*sy;c.beginPath();if(i%2===0){c.moveTo(left,top+bh);c.lineTo(left+bw/2,top);c.lineTo(left+bw,top+bh)}else{c.moveTo(left,top);c.lineTo(left+bw/2,top+bh);c.lineTo(left+bw,top)}c.closePath();c.stroke();drawn++}}}
    else{const cols=Math.max(1,Math.floor((logicalW+g)/(itemW+g))),rows=Math.max(1,Math.floor((logicalH+g)/(itemH+g)));for(let r=0;r<rows&&drawn<max;r++)for(let col=0;col<cols&&drawn<max;col++){c.strokeRect(ox+col*(itemW+g)*sx,oy+r*(itemH+g)*sy,itemW*sx,itemH*sy);drawn++}}
  }
  function update(){const sh=shape();labels(sh);const w=Math.max(.1,n(fields.width.value,5));if(sh==='circle')fields.height.value=w;const h=Math.max(.1,n(fields.height.value,w)),qty=Math.max(1,Math.ceil(n(fields.qty.value,1))),cut=fields.cut.checked,cap=capacity(sh,w,h),sheets=Math.max(1,Math.ceil(qty/cap)),total=price(sheets,cut),method=sh==='circle'?'Encaixe intercalado (hexagonal)':sh==='triangle'?'Triângulos alternados (em pé / invertido)':sh==='custom'?'Caixa delimitadora conservadora':'Grade otimizada com rotação';outputs.total.textContent=money(total);outputs.unit.textContent=`${money(total/qty)} por unidade`;outputs.capacity.textContent=cap;outputs.sheets.textContent=sheets;outputs.cutLabel.textContent=cut?'Com recorte':'Sem recorte';outputs.production.textContent=`${cap*sheets} un.`;outputs.method.textContent=method;const unit=cut?cfg.cutPrice:cfg.noCutPrice,third=cut?cfg.cutThree:cfg.noCutThree;outputs.note.innerHTML=sheets<=2?`Regra aplicada: <strong>${sheets} folha(s) × ${money(unit)}</strong>.`:`Regra aplicada: pacote de 3 folhas = <strong>${money(third)}</strong>${sheets>3?` + ${sheets-3} folha(s) extra(s) × ${money(unit)}`:''}.`;drawPreview(sh,w,h,cap)}
  root.querySelectorAll('input').forEach(el=>el.addEventListener('input',update));root.querySelectorAll('input[name="shape"]').forEach(el=>el.addEventListener('change',update));window.addEventListener('resize',update);update();
})();
