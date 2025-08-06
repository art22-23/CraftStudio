/* =======================================================
   A. グローバル設定
======================================================= */
let products = [];
let cart     = JSON.parse(localStorage.getItem('cart') || '[]');

const DATA_SOURCES = { csv: './products.csv' };

/* ------------ Google フォーム設定 -------------- */
const FORM_BASE  = 'https://docs.google.com/forms/d/e/1FAIpQLSceg7k4qVNp-fUOf8XUvjL-Vbrsrtoxmwdw1-POPccOGk2uww/viewform?usp=dialog';
const FIELD_CART = 'entry.671326017';
const FIELD_TOTAL= 'entry.867140983';

/* =======================================================
   B. CSV パース
======================================================= */
function parseCSV(text){
  const { data } = Papa.parse(text,{header:true,skipEmptyLines:true,transformHeader:h=>h.trim()});
  return data.map(r=>({
    ...r,
    materials: r.materials ? r.materials.split('|').map(t=>t.trim()) : [],
    images   : r.images    ? r.images.split(';').map(u=>u.trim())    : (r.image?[r.image.trim()]:[])
  }));
}

/* =======================================================
   C. 初期化
======================================================= */
window.addEventListener('load',async()=>{
  fadeInBody();
  showLoading();
  try{
    const res = await fetch(DATA_SOURCES.csv);
    products  = parseCSV(await res.text());
    renderProducts();
    updateCartUI();
  }catch(e){
    console.error(e); showError('商品データの読み込みに失敗しました。');
  }
});


/* =======================================================
   E. 共通ユーティリティ
======================================================= */
function fadeInBody(){setTimeout(()=>{document.body.style.transition='opacity .8s';document.body.style.opacity='1';},50);}
function placeholderSVG(t){
  return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><rect width='200' height='200' fill='%23e9dcd7'/><text x='100' y='110' font-size='60' fill='%23b86e6e' text-anchor='middle' font-family='Arial'>${t.charAt(0)}</text></svg>`;
}
const priceInt = str => parseInt(String(str).replace(/[^0-9]/g,''),10)||0;

/* =======================================================
   F. 商品カード & フィルタ
======================================================= */
function renderProducts(filter='すべて'){
  const grid=document.querySelector('#productGrid');grid.innerHTML='';
  const list=filter==='すべて'?products:products.filter(p=>p.category===filter);
  list.forEach(p=>{
    const thumb=p.images[0]||placeholderSVG(p.name);
    const card=document.createElement('div');card.className='product-card';
    card.innerHTML=`<div class="product-image"><img src="${thumb}" alt=""></div>
                    <div class="product-info"><h3 class="product-name">${p.name}</h3>
                    <div class="product-price">${p.price||''}</div></div>`;
    card.onclick=()=>openModal(p);
    grid.appendChild(card);
  });
}
document.querySelectorAll('.filter-tab').forEach(tab=>{
  tab.onclick=()=>{
    document.querySelectorAll('.filter-tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    renderProducts(tab.textContent.trim());
  };
});

/* =======================================================
   G. モーダル：ギャラリー / 材質 / 数量
======================================================= */
let curProd=null, selMat='', selQty=1;
const mainImg=document.querySelector('#modalMainImg');
const thumbs=document.querySelector('#modalThumbs');
const qtyVal=document.querySelector('#qtyValue');

function openModal(p){
  curProd=p; selMat=''; selQty=1; qtyVal.textContent=selQty;

  /* ギャラリー */
  const gallery=p.images.length?p.images:[placeholderSVG(p.name)];
  let gidx=0;
  const update=()=>{
    mainImg.src=gallery[gidx];
    thumbs.innerHTML=gallery.map((u,i)=>`<img src="${u}" data-i="${i}" class="${i===gidx?'active':''}">`).join('');
  };
  update();
  document.querySelector('.nav-prev').onclick=()=>{gidx=(gidx-1+gallery.length)%gallery.length;update();};
  document.querySelector('.nav-next').onclick=()=>{gidx=(gidx+1)%gallery.length;update();};
  thumbs.onclick=e=>{if(e.target.tagName==='IMG'){gidx=+e.target.dataset.i;update();}};

  /* テキスト */
  document.querySelector('#modalTitle').textContent=p.name;
  document.querySelector('#modalPrice').textContent=p.price||'';

  /* 材質 */
  const matBox=document.querySelector('#materialOptions');matBox.innerHTML='';
  (p.materials.length?p.materials:['—']).forEach(m=>{
    const b=document.createElement('div');b.className='material-option';b.textContent=m;
    b.onclick=()=>{selMat=m;document.querySelectorAll('.material-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');};
    matBox.appendChild(b);
  });

  /* 数量 */
  document.getElementById('qtyPlus').onclick=()=>{selQty++;qtyVal.textContent=selQty};
  document.getElementById('qtyMinus').onclick=()=>{if(selQty>1){selQty--;qtyVal.textContent=selQty}};

  document.getElementById('addToCartBtn').onclick=addToCart;

  document.getElementById('productModal').style.display='block';
  document.body.style.overflow='hidden';
}
document.querySelector('.modal-close').onclick=()=>{document.getElementById('productModal').style.display='none';document.body.style.overflow='';};

/* =======================================================
   H. カート処理（追加・削除・クリア）
======================================================= */
function addToCart(){
  const key=`${curProd.id}_${selMat}`;
  const item=cart.find(i=>i.key===key);
  if(item){item.qty+=selQty;}else{
    cart.push({key,id:curProd.id,name:curProd.name,mat:selMat||'—',price:curProd.price||'',qty:selQty});
  }
  localStorage.setItem('cart',JSON.stringify(cart));
  updateCartUI();
  alert('カートに追加しました！');
  document.querySelector('.modal-close').click();
}

/* ▼ ミニカート UI */
function updateCartUI(){
  const mini=document.getElementById('miniCart');
  const dd=document.getElementById('cartDropdown');
  const totalQty=cart.reduce((a,c)=>a+c.qty,0);
  mini.querySelector('#cartCount').textContent=totalQty;

  if(cart.length===0){
    dd.innerHTML='<p style="text-align:center;color:var(--secondary)">カートは空です</p>';
    return;
  }

  dd.innerHTML=cart.map(i=>`
    <div class="cart-item">
      ${i.name}<br><small>${i.mat}</small> ×${i.qty}
      <span class="del" data-key="${i.key}">×</span>
    </div>`).join('');

  const totalPrice=cart.reduce((s,i)=>s+priceInt(i.price)*i.qty,0);
  dd.innerHTML+=`<div class="cart-total">合計 ¥${totalPrice.toLocaleString()}</div>
                 <button class="clear-cart-btn" id="cartClearBtn">すべて削除</button>`;
}

/* ▼ アイテム削除 & オールクリア（イベント委任） */
document.getElementById('cartDropdown').addEventListener('click',e=>{
  if(e.target.classList.contains('del')){
    const key=e.target.dataset.key;
    cart=cart.filter(i=>i.key!==key);
    localStorage.setItem('cart',JSON.stringify(cart));
    updateCartUI();
  }
  if(e.target.id==='cartClearBtn'){
    if(confirm('カートを空にしますか？')){
      cart=[]; localStorage.removeItem('cart'); updateCartUI();
    }
  }
});

/* ミニカート開閉 */
document.getElementById('miniCart').onclick=()=>document.getElementById('miniCart').classList.toggle('open');

/* =======================================================
   I. Google フォーム (新しいタブ)
======================================================= */
document.getElementById('checkoutBtn').onclick=()=>{
  if(cart.length===0){alert('カートが空です');return;}
  const lines=cart.map(i=>`${i.name} (${i.mat}) ×${i.qty}`).join('\n');
  const total=cart.reduce((s,i)=>s+priceInt(i.price)*i.qty,0);
  const url=`${FORM_BASE}&${FIELD_CART}=${encodeURIComponent(lines)}&${FIELD_TOTAL}=${encodeURIComponent(total)}`;
  window.open(url,'_blank');
};

/* =======================================================
   J. ローディング・エラー
======================================================= */
function showLoading(){
  document.querySelector('#productGrid').innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:3rem">
    <div style="width:50px;height:50px;border:3px solid var(--glass-border);
                border-top-color:var(--primary);border-radius:50%;
                animation:spin 1s linear infinite;margin:0 auto"></div>
    <p style="margin-top:1rem;color:var(--secondary)">商品データを読み込み中…</p></div>`;
}
function showError(m){
  document.querySelector('#productGrid').innerHTML=
    `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--secondary)">${m}</div>`;
}

/* =======================================================
   K. カスタムカーソル
======================================================= */
const cursor=document.createElement('div');cursor.className='cursor';
const follower=document.createElement('div');follower.className='cursor-follower';
document.body.appendChild(cursor);document.body.appendChild(follower);
document.addEventListener('mousemove',e=>{
  cursor.style.left=e.clientX-10+'px';cursor.style.top=e.clientY-10+'px';
  setTimeout(()=>{follower.style.left=e.clientX-20+'px';follower.style.top=e.clientY-20+'px';},80);
});
['a','button','.product-card','.category-card','.filter-tab'].forEach(sel=>{
  document.querySelectorAll(sel).forEach(el=>{
    el.addEventListener('mouseenter',()=>{cursor.style.transform='scale(2)';follower.style.transform='scale(1.5)'});
    el.addEventListener('mouseleave',()=>{cursor.style.transform='scale(1)';follower.style.transform='scale(1)'});
  });
});

/* =======================================================
   L. パララックス & ヘッダー自動隠し
======================================================= */
window.addEventListener('scroll',()=>{
  const y=window.pageYOffset;
  document.querySelector('.gradient-bg').style.transform=`translateY(${y*0.5}px)`;
  document.querySelector('header').style.transform=y>130?'translateY(-100%)':'translateY(0)';
});



