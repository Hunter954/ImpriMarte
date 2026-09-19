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
  const cfg={
    sheetWidth:n(root.dataset.sheetWidth,29.7),sheetHeight:n(root.dataset.sheetHeight,42),maxPrintWidth:n(root.dataset.maxPrintWidth,48),spacing:n(root.dataset.spacing,0),
    cutPrice:n(root.dataset.cutPrice,40),noCutPrice:n(root.dataset.noCutPrice,36),cutThree:n(root.dataset.cutThree,140),noCutThree:n(root.dataset.noCutThree,120),
    cutMeter:n(root.dataset.cutMeter,120),noCutMeter:n(root.dataset.noCutMeter,108),minCut:n(root.dataset.minCut,40),minNoCut:n(root.dataset.minNoCut,36)
  };
  const $=s=>root.querySelector(s);
  const fields={width:$('[data-quote-width]'),height:$('[data-quote-height]'),qty:$('[data-quote-quantity]'),cut:$('[data-quote-cut]')};
  const outputs={total:$('[data-quote-total]'),unit:$('[data-quote-unit]'),across:$('[data-quote-across]'),length:$('[data-quote-length]'),sheets:$('[data-quote-sheets]'),cutLabel:$('[data-quote-cut-label]'),method:$('[data-quote-method]'),note:$('[data-price-rule-note]')};
  const money=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const ceil=v=>Math.max(1,Math.ceil(v-1e-9));
  function shape(){return root.querySelector('input[name="shape"]:checked')?.value||'rectangle'}
  function rectLayout(W,w,h,qty,g){
    const opt=(iw,ih)=>{if(iw<=0||ih<=0||W<iw)return null;const across=Math.max(1,Math.floor((W+g)/(iw+g))),rows=ceil(qty/across),length=rows*ih+Math.max(0,rows-1)*g;return{across,rows,length,itemW:iw,itemH:ih}};
    const a=opt(w,h),b=opt(h,w);if(!a)return b;if(!b)return a;if(a.length!==b.length)return a.length<b.length?a:b;return a.across>=b.across?a:b;
  }
  function circleLayout(W,d,qty,g){if(d<=0||W<d)return null;const step=d+g,normal=Math.max(1,Math.floor((W+g)/step)),shift=Math.max(1,Math.floor((W-step/2+g)/step)),pitch=Math.sqrt(3)/2*step;let rem=qty,rows=0;while(rem>0){rem-=rows%2===0?normal:shift;rows++}return{across:normal,shiftedAcross:shift,rows,length:d+Math.max(0,rows-1)*pitch,itemW:d,itemH:d}}
  function triLayout(W,b,h,qty,g){
    const opt=(base,height)=>{if(base<=0||height<=0||W<base)return null;const pitch=base/2+g,across=Math.max(1,1+Math.floor((W-base)/pitch)),rows=ceil(qty/across),length=rows*height+Math.max(0,rows-1)*g;return{across,rows,length,itemW:base,itemH:height}};
    const a=opt(b,h),c=opt(h,b);if(!a)return c;if(!c)return a;return a.length<=c.length?a:c;
  }
  function layout(sh,w,h,qty){if(sh==='circle')return circleLayout(cfg.maxPrintWidth,w,qty,cfg.spacing);if(sh==='triangle')return triLayout(cfg.maxPrintWidth,w,h,qty,cfg.spacing);return rectLayout(cfg.maxPrintWidth,w,h,qty,cfg.spacing)}
  function labels(sh){const wl=root.querySelector('[data-width-label]'),hl=root.querySelector('[data-height-label]'),hf=root.querySelector('[data-height-field]');if(sh==='circle'){wl.textContent='Diâmetro';hf.style.display='none';fields.height.value=fields.width.value}else{hf.style.display='grid';wl.textContent=sh==='triangle'?'Base':'Largura';hl.textContent=sh==='triangle'?'Altura do triângulo':'Altura'}}
  function isFive(sh,w,h){return (sh==='rectangle'||sh==='square')&&Math.abs(w-5)<.001&&Math.abs(h-5)<.001}
  function calcPrice(sh,w,h,qty,cut,L){
    if(isFive(sh,w,h)){
      const unit=cut?cfg.cutPrice:cfg.noCutPrice,third=cut?cfg.cutThree:cfg.noCutThree;
      if(qty<=40)return{total:unit,note:`Tabela especial 5×5: até 40 unidades = <strong>${money(unit)}</strong>.`};
      if(qty<=80)return{total:unit*2,note:`Tabela especial 5×5: 41–80 unidades = <strong>${money(unit*2)}</strong>.`};
      const extras=Math.max(0,Math.ceil((qty-120)/40)),total=third+extras*unit;
      return{total,note:`Tabela especial 5×5: 81–120 unidades = <strong>${money(third)}</strong>${extras?` + ${extras} lote(s) extra(s)`:''}.`};
    }
    const meter=cut?cfg.cutMeter:cfg.noCutMeter,min=cut?cfg.minCut:cfg.minNoCut,raw=L/100*meter,total=Math.max(min,raw);
    return{total:Math.round((total+Number.EPSILON)*100)/100,note:`Cálculo por comprimento: <strong>${L.toFixed(1)} cm × ${money(meter)}/m</strong>${raw<min?` · mínimo ${money(min)}`:''}.`};
  }
  function drawPreview(sh,w,h,lay){const canvas=$('[data-packing-canvas]');if(!canvas||!lay)return;const dpr=window.devicePixelRatio||1,cssW=canvas.clientWidth||520,cssH=canvas.clientHeight||205;canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,cssW,cssH);const pad=16,W=cssW-pad*2,H=cssH-pad*2,logicalW=cfg.maxPrintWidth,logicalH=Math.max(lay.length,10),scale=Math.min(W/logicalW,H/logicalH),sw=logicalW*scale,shh=logicalH*scale,ox=(cssW-sw)/2,oy=(cssH-shh)/2;c.fillStyle='#fcfbfa';c.fillRect(ox,oy,sw,shh);c.strokeStyle='#d7cfc9';c.strokeRect(ox,oy,sw,shh);c.strokeStyle='#e66914';c.lineWidth=.8;const g=cfg.spacing;let drawn=0,max=Math.min(Math.max(1,Math.ceil(n(fields.qty.value,1))),160);
    if(sh==='circle'){const d=w,step=d+g,pitch=Math.sqrt(3)/2*step;for(let r=0;drawn<max;r++){const y=d/2+r*pitch;if(y+d/2>logicalH+.01)break;const off=r%2?step/2:0;for(let x=d/2+off;x+d/2<=logicalW+.01&&drawn<max;x+=step){c.beginPath();c.arc(ox+x*scale,oy+y*scale,d*scale/2,0,Math.PI*2);c.stroke();drawn++}}}
    else if(sh==='triangle'){const b=lay.itemW,hh=lay.itemH,pitch=b/2+g;for(let r=0;r<lay.rows&&drawn<max;r++){const y=r*(hh+g);for(let i=0;i<lay.across&&drawn<max;i++){const x=i*pitch,left=ox+x*scale,top=oy+y*scale,bw=b*scale,bh=hh*scale;c.beginPath();if(i%2===0){c.moveTo(left,top+bh);c.lineTo(left+bw/2,top);c.lineTo(left+bw,top+bh)}else{c.moveTo(left,top);c.lineTo(left+bw/2,top+bh);c.lineTo(left+bw,top)}c.closePath();c.stroke();drawn++}}}
    else{for(let r=0;r<lay.rows&&drawn<max;r++)for(let col=0;col<lay.across&&drawn<max;col++){c.strokeRect(ox+col*(lay.itemW+g)*scale,oy+r*(lay.itemH+g)*scale,lay.itemW*scale,lay.itemH*scale);drawn++}}
  }
  function update(){const sh=shape();labels(sh);const w=Math.max(.1,n(fields.width.value,5));if(sh==='circle')fields.height.value=w;const h=Math.max(.1,n(fields.height.value,w)),qty=Math.max(1,Math.ceil(n(fields.qty.value,1))),cut=fields.cut.checked,lay=layout(sh,w,h,qty);if(!lay){outputs.total.textContent='Medida inválida';return}const priced=calcPrice(sh,w,h,qty,cut,lay.length),method=sh==='circle'?'Encaixe intercalado (hexagonal)':sh==='triangle'?'Triângulos alternados (em pé / invertido)':sh==='custom'?'Caixa delimitadora conservadora':'Grade otimizada na largura de 48 cm';outputs.total.textContent=money(priced.total);outputs.unit.textContent=`${money(priced.total/qty)} por unidade`;outputs.across.textContent=lay.across;outputs.length.textContent=`${lay.length.toFixed(1)} cm`;outputs.sheets.textContent=Math.max(1,Math.ceil(lay.length/cfg.sheetHeight));outputs.cutLabel.textContent=cut?'Com recorte':'Sem recorte';outputs.method.textContent=method;outputs.note.innerHTML=priced.note;drawPreview(sh,w,h,lay)}
  root.querySelectorAll('input').forEach(el=>el.addEventListener('input',update));root.querySelectorAll('input[name="shape"]').forEach(el=>el.addEventListener('change',update));window.addEventListener('resize',update);update();
})();
