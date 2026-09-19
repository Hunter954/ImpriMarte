(()=>{
const KEY='imprimarte_cart_v1', FAV='imprimarte_favs_v1';
const parse=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const getCart=()=>parse(KEY,[]); const setCart=c=>{save(KEY,c);updateCount();};
const updateCount=()=>{const n=getCart().reduce((s,i)=>s+(i.qty||1),0);document.querySelectorAll('[data-cart-count]').forEach(el=>el.textContent=n)};
const add=(p,qty=1,note='')=>{const c=getCart();const found=c.find(i=>String(i.id)===String(p.id)&&i.note===note);if(found)found.qty+=qty;else c.push({...p,qty,note});setCart(c);toast('Produto adicionado ao carrinho')};
const toast=t=>{const el=document.createElement('div');el.className='toast';el.innerHTML=`<i class="bi bi-check-circle-fill"></i><span>${t}</span>`;document.body.appendChild(el);setTimeout(()=>el.remove(),1800)};

document.getElementById('menuToggle')?.addEventListener('click',()=>document.getElementById('mainNav')?.classList.toggle('open'));
document.querySelectorAll('.add-cart').forEach(b=>b.addEventListener('click',()=>add(JSON.parse(b.dataset.product))));
document.getElementById('addProduct')?.addEventListener('click',e=>{add(JSON.parse(e.currentTarget.dataset.product),Math.max(1,parseInt(document.getElementById('qty')?.value||'1')),document.getElementById('note')?.value||'')});
const productPage=document.querySelector('[data-product-page]');
const qtyInput=document.getElementById('qty');
if(productPage&&qtyInput){
  const unitPrice=Number(productPage.dataset.unitPrice||0);
  const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const syncProductPrice=()=>{const qty=Math.max(1,parseInt(qtyInput.value||'1',10)||1);qtyInput.value=qty;document.querySelectorAll('[data-selected-qty]').forEach(el=>el.textContent=qty);const total=document.querySelector('[data-price-total]');if(total&&unitPrice>0)total.textContent=money.format(unitPrice*qty);const qtyText=document.querySelector('.estimated-total b');if(qtyText)qtyText.innerHTML=`<span data-selected-qty>${qty}</span> ${qty===1?'unidade':'unidades'}`};
  document.querySelector('[data-qty-minus]')?.addEventListener('click',()=>{qtyInput.value=Math.max(1,(parseInt(qtyInput.value||'1',10)||1)-1);syncProductPrice()});
  document.querySelector('[data-qty-plus]')?.addEventListener('click',()=>{qtyInput.value=(parseInt(qtyInput.value||'1',10)||1)+1;syncProductPrice()});
  qtyInput.addEventListener('input',syncProductPrice);qtyInput.addEventListener('change',syncProductPrice);syncProductPrice();
}
const wa=window.IMPRIMARTE_WHATSAPP||'';
const waOpen=msg=>window.open(`https://wa.me/${wa.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`,'_blank');
document.querySelectorAll('[data-whatsapp]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();waOpen('Olá! Vim pelo site da ImpriMarte e gostaria de fazer um orçamento.') }));
document.getElementById('quoteProduct')?.addEventListener('click',e=>{const q=document.getElementById('qty')?.value||1;const n=document.getElementById('note')?.value||'';waOpen(`Olá! Gostaria de um orçamento para: ${e.currentTarget.dataset.name}. Quantidade estimada: ${q}.${n?` Observação: ${n}`:''}`)});

let favs=parse(FAV,[]);
const paintFav=()=>document.querySelectorAll('[data-favorite]').forEach(b=>{const active=favs.includes(String(b.dataset.favorite));b.classList.toggle('active',active);const i=b.querySelector('i');if(i)i.className=active?'bi bi-heart-fill':'bi bi-heart'});
paintFav();
document.querySelectorAll('[data-favorite]').forEach(b=>b.addEventListener('click',()=>{const id=String(b.dataset.favorite);favs=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id];save(FAV,favs);paintFav()}));


const catalogPage=document.querySelector('[data-catalog-page]');
if(catalogPage){
  const items=[...catalogPage.querySelectorAll('[data-catalog-product]')];
  const search=catalogPage.querySelector('[data-catalog-search]');
  const specGroups=catalogPage.querySelector('[data-spec-filter-groups]');
  const panel=catalogPage.querySelector('[data-filter-panel]');
  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const productSpecs=new Map();
  const facets=new Map();

  items.forEach(item=>{
    let specs=[];
    try{specs=JSON.parse(decodeURIComponent(item.dataset.specs||'%5B%5D'))||[]}catch{}
    const clean=specs.filter(x=>x&&x.label&&x.value).map(x=>({label:String(x.label).trim(),value:String(x.value).trim()}));
    productSpecs.set(item,clean);
    clean.forEach(({label,value})=>{
      const key=normalize(label);
      if(!key)return;
      if(!facets.has(key))facets.set(key,{label,values:new Map()});
      const facet=facets.get(key);
      const valueKey=normalize(value);
      if(!facet.values.has(valueKey))facet.values.set(valueKey,{label:value,count:0});
      facet.values.get(valueKey).count++;
    });
  });

  if(specGroups){
    [...facets.entries()].forEach(([key,facet])=>{
      const section=document.createElement('section');
      section.className='filter-group';
      const options=[...facet.values.entries()].sort((a,b)=>a[1].label.localeCompare(b[1].label,'pt-BR'));
      section.innerHTML=`<button type="button" class="filter-group-title" data-filter-toggle><span>${facet.label}</span><i class="bi bi-chevron-up"></i></button><div class="filter-options">${options.map(([valueKey,value])=>`<label class="filter-check"><input type="checkbox" data-spec-filter data-spec-key="${encodeURIComponent(key)}" value="${encodeURIComponent(valueKey)}"><span class="filter-box"><i class="bi bi-check"></i></span><span>${value.label.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span><small>${value.count}</small></label>`).join('')}</div>`;
      specGroups.appendChild(section);
    });
  }

  const allFilters=()=>[...catalogPage.querySelectorAll('[data-category-filter],[data-spec-filter]')];
  const activeCount=()=>allFilters().filter(x=>x.checked).length;
  const syncCounts=()=>{
    const counts=new Map();
    items.forEach(item=>counts.set(item.dataset.categoryId,(counts.get(item.dataset.categoryId)||0)+1));
    catalogPage.querySelectorAll('[data-category-count]').forEach(el=>el.textContent=counts.get(el.dataset.categoryCount)||0);
  };
  const filter=()=>{
    const term=normalize(search?.value);
    const cats=[...catalogPage.querySelectorAll('[data-category-filter]:checked')].map(x=>x.value);
    const selectedSpecs={};
    catalogPage.querySelectorAll('[data-spec-filter]:checked').forEach(input=>{
      const key=decodeURIComponent(input.dataset.specKey||'');
      const value=decodeURIComponent(input.value||'');
      (selectedSpecs[key]||(selectedSpecs[key]=[])).push(value);
    });
    let visible=0;
    items.forEach(item=>{
      const text=normalize(item.dataset.search);
      const specs=productSpecs.get(item)||[];
      const specMap={};
      specs.forEach(x=>(specMap[normalize(x.label)]||(specMap[normalize(x.label)]=[])).push(normalize(x.value)));
      const matchSearch=!term||text.includes(term)||specs.some(x=>normalize(`${x.label} ${x.value}`).includes(term));
      const matchCategory=!cats.length||cats.includes(item.dataset.categoryId);
      const matchSpecs=Object.entries(selectedSpecs).every(([key,values])=>{
        const owned=specMap[key]||[];
        return values.some(v=>owned.includes(v));
      });
      const show=matchSearch&&matchCategory&&matchSpecs;
      item.hidden=!show;
      if(show)visible++;
    });
    catalogPage.querySelectorAll('[data-catalog-count]').forEach(el=>el.textContent=visible);
    const empty=catalogPage.querySelector('[data-catalog-empty]');
    if(empty)empty.hidden=visible!==0;
    const grid=catalogPage.querySelector('[data-catalog-grid]');
    if(grid)grid.hidden=visible===0;
    const count=activeCount();
    catalogPage.querySelectorAll('[data-active-filter-count]').forEach(el=>{el.hidden=!count;el.textContent=count});
    const summary=catalogPage.querySelector('[data-filter-summary]');
    if(summary)summary.textContent=count?`${count} filtro${count===1?'':'s'} ativo${count===1?'':'s'}`:'';
  };
  const clear=()=>{allFilters().forEach(x=>x.checked=false);if(search)search.value='';filter()};
  catalogPage.addEventListener('change',e=>{if(e.target.matches('[data-category-filter],[data-spec-filter]'))filter()});
  search?.addEventListener('input',filter);
  catalogPage.querySelectorAll('[data-filter-clear]').forEach(btn=>btn.addEventListener('click',clear));
  catalogPage.querySelectorAll('[data-filter-toggle]').forEach(btn=>btn.addEventListener('click',()=>{btn.closest('.filter-group')?.classList.toggle('collapsed')}));
  catalogPage.querySelector('[data-filter-open]')?.addEventListener('click',()=>document.body.classList.add('catalog-filters-open'));
  catalogPage.querySelectorAll('[data-filter-close]').forEach(btn=>btn.addEventListener('click',()=>document.body.classList.remove('catalog-filters-open')));
  syncCounts();
  filter();
}

const fallbackLogo=`<div class="image-placeholder"><img class="placeholder-logo" src="${window.IMPRIMARTE_LOGO||'/img/logo.png'}" alt="ImpriMarte"></div>`;
const renderCart=()=>{const root=document.getElementById('cartPage');if(!root)return;const c=getCart();if(!c.length){root.innerHTML='<div class="empty-state"><i class="bi bi-bag-x"></i><h2>Seu carrinho está vazio.</h2><p>Adicione produtos para montar um pedido de orçamento.</p><a class="btn" href="/produtos"><i class="bi bi-grid"></i> Ver produtos</a></div>';return;}root.innerHTML=c.map((i,idx)=>`<div class="cart-item"><div class="cart-thumb">${i.image?`<img src="${i.image}" alt="">`:fallbackLogo}</div><div><strong>${i.name}</strong>${i.note?`<small>${i.note}</small>`:''}<small class="cart-price">${i.price?`A partir de R$ ${Number(i.price).toFixed(2).replace('.',',')}`:'Sob consulta'}</small></div><div class="cart-qty"><button data-dec="${idx}" aria-label="Diminuir">−</button><b>${i.qty}</b><button data-inc="${idx}" aria-label="Aumentar">+</button></div><button class="cart-remove" data-rm="${idx}"><i class="bi bi-trash3"></i> Remover</button></div>`).join('')+`<div class="cart-summary"><div><strong>${c.reduce((s,i)=>s+i.qty,0)} item(ns)</strong><p>O valor final será confirmado no atendimento.</p></div><button id="sendCart" class="btn"><i class="bi bi-whatsapp"></i> Enviar pedido pelo WhatsApp</button></div>`;root.querySelectorAll('[data-inc]').forEach(b=>b.onclick=()=>{const x=getCart();x[b.dataset.inc].qty++;setCart(x);renderCart()});root.querySelectorAll('[data-dec]').forEach(b=>b.onclick=()=>{const x=getCart();x[b.dataset.dec].qty=Math.max(1,x[b.dataset.dec].qty-1);setCart(x);renderCart()});root.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{const x=getCart();x.splice(b.dataset.rm,1);setCart(x);renderCart()});document.getElementById('sendCart').onclick=()=>{const lines=getCart().map(i=>`• ${i.name} — qtd. ${i.qty}${i.note?` — ${i.note}`:''}`);waOpen(`Olá! Montei um pedido no site da ImpriMarte e gostaria de orçamento:\n\n${lines.join('\n')}\n\nPode me ajudar?`)};};
renderCart();updateCount();
})();
