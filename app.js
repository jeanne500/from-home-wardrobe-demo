'use strict';
const W = window.Wardrobe;
const $ = id => document.getElementById(id);
const KEY = 'from-home-wardrobe-v1';
let state = W.initial(), history = [], seen = [], started = false, selected = null, mode = 'hang', helpLevel = 0, finishShown = false, storageOK = true;
let message = '先点一件物品看看，再点空位放下。常穿上衣可以先试一试。';
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !W.valid(data.state) || !Array.isArray(data.history) || !data.history.every(W.valid) || !Array.isArray(data.seen)) throw new Error('invalid save');
    state = data.state; history = data.history; seen = data.seen.filter(id => W.items[id]); started = Boolean(data.started); finishShown = W.complete(state);
    message = '已接回上次的整理。点物品可以重新查看说明。';
  }
} catch { message = '之前的进度无法读取，这次从最初布局开始。'; }
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version:1, state, history, seen, started })); storageOK = true; }
  catch { storageOK = false; }
}
function announce(text) { message = text; $('notice').textContent = text; }
function select(id) {
  selected = id; mode = id === 'C' && state.C?.zone === 'U' ? 'fold' : 'hang';
  if (!seen.includes(id)) seen.push(id);
  message = W.items[id].note + ' 选好后，点目标位置放下。'; save(); render();
}
function commit(next, text) {
  if (JSON.stringify(state) === JSON.stringify(next)) { announce('它已经在这个位置了。'); return; }
  history.push(W.copy(state)); state = next; message = text;
  selected = null; save(); render();
  if (W.complete(state) && !finishShown) { finishShown = true; $('finish').showModal(); }
  if (!W.complete(state)) finishShown = false;
}
function put(zone, start = 0) {
  const result = W.place(state, selected, zone, start, mode);
  if (!result.ok) { announce(result.message); return; }
  const name = W.items[selected].name;
  commit(result.state, zone === 'mat' ? `${name}已退回整理垫。` : `${name}已安排好。也可以随时再调整。`);
}
function itemButton(id, className) {
  const b = document.createElement('button'); b.type = 'button'; b.className = className + (selected === id ? ' selected' : '');
  b.setAttribute('aria-label', `查看${W.items[id].name}`); b.setAttribute('aria-pressed', String(selected === id));
  const glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.textContent = W.items[id].icon; glyph.setAttribute('aria-hidden','true');
  const label = document.createElement('span'); label.textContent = W.items[id].name;
  b.append(glyph,label); b.onclick = () => select(id); return b;
}
function shelf(el, zone) {
  el.replaceChildren();
  for(let n=0;n<W.caps[zone];n++) {
    const b = document.createElement('button'); b.className='cell'; b.style.gridColumn = String(n+1); b.textContent = `空位 ${n+1}`;
    b.setAttribute('aria-label', `${zone==='U'?'上层':'下层'}第${n+1}格，放置选中物品`); b.onclick=()=>put(zone,n);
    const occupied = Object.values(state).some(p=>p && p.zone===zone && n>=p.start && n<p.start+p.width);
    if (occupied) { b.disabled=true; b.style.visibility='hidden'; }
    el.append(b);
  }
  for(const [id,p] of Object.entries(state)) if(p?.zone===zone) {
    const b = itemButton(id,'piece'); b.style.gridColumn=`${p.start+1} / span ${p.width}`;
    if(id==='C') { const extra=document.createElement('small'); extra.textContent=p.zone==='U'?'折好 · 1格':'挂放 · 2格'; b.append(extra); }
    el.append(b);
  }
}
function render() {
  $('intro').hidden=started; $('play').hidden=!started;
  $('start').textContent=W.complete(state)?'返回整理好的衣柜':history.length?'继续整理':'开始整理';
  const goals=[['常穿衣物放下层',state.A?.zone==='L'&&state.B?.zone==='L'],['换季盒放回上层',state.BOX?.zone==='U'],['其余衣物各有去处',['C','D','E','F'].every(id=>Boolean(state[id]))]];
  $('goals').replaceChildren(...goals.map(([text,done])=>{const li=document.createElement('li');li.className=done?'done':'';li.textContent=(done?'✓ ':'○ ')+text;return li;}));
  $('progress').textContent=`${goals.filter(g=>g[1]).length} / 3`;
  $('notice').textContent=message;
  shelf($('upper'),'U');shelf($('lower'),'L');
  for (const z of ['repair','donate']) {
    const entry=Object.entries(state).find(([,p])=>p?.zone===z);
    $(z).textContent=entry?W.items[entry[0]].name:'点选衣物后，放到这里';
    const parent=$(z).parentElement;
    parent.onclick=()=>{if(entry && (!selected || selected===entry[0]))select(entry[0]);else put(z);};
    parent.setAttribute('aria-label',`${z==='repair'?'修补篮':'待转赠'}：${entry?W.items[entry[0]].name:'空'}`);
  }
  const remaining=Object.keys(W.items).filter(id=>!state[id]); $('mat-count').textContent=`${remaining.length}件待安排`;
  $('mat').replaceChildren(...remaining.map(id=>itemButton(id,'item')));
  if(!remaining.length){const p=document.createElement('p');p.className='empty';p.textContent='整理垫收空了。';$('mat').append(p);}
  $('detail').replaceChildren();$('modes').replaceChildren();
  const h=document.createElement('h2'),p=document.createElement('p');h.textContent=selected?W.items[selected].name:'点一件物品，看看它的故事';p.textContent=selected?W.items[selected].note:'不用着急。可以先查看，也可以把已有物品退回整理垫再安排。';$('detail').append(h,p);
  if(selected==='C')for(const [value,label] of [['hang','挂放 · 下层2格'],['fold','折好 · 上层1格']]){const b=document.createElement('button');b.textContent=label;b.className=mode===value?'active':'';b.setAttribute('aria-pressed',String(mode===value));b.onclick=()=>{mode=value;message=`已选择${label}，再点空位放置；原位置暂时保留。`;render();};$('modes').append(b);}
  $('return').hidden=!selected || !state[selected];$('undo').disabled=!history.length;
  $('saved').textContent=storageOK?'进度保存在本机，可随时停下来。':'当前无法保存到本机，请保持此页面打开。';
}
function reset(){state=W.initial();history=[];seen=[];selected=null;mode='hang';helpLevel=0;finishShown=false;started=true;message='重新开始了。先看物品信息，再决定怎么放。';save();render();}
$('start').onclick=()=>{started=true;save();render();};
$('return').onclick=()=>put('mat');
$('undo').onclick=()=>{if(!history.length)return;state=history.pop();selected=null;finishShown=W.complete(state);message='已撤销上一步。';save();render();};
const tips=['常穿的放下层，换季盒放上层。点物品可以查看占位和合适的去处。所有物品都能退回整理垫。','上层需要给换季盒留出两个连续位置。纪念围巾可以换位置；换季开衫也可以选择“折好”放上层。','有两条路：开衫挂下层、围巾放上层；或者开衫折好放上层、围巾放下层。两种都合理。'];
function showHelp(){ $('help-text').textContent=tips[helpLevel];$('help-next').hidden=helpLevel===2;$('demo').hidden=helpLevel<2;$('demo-preview').hidden=true; }
$('help').onclick=()=>{helpLevel=0;showHelp();$('guide').showModal();};
$('help-next').onclick=()=>{helpLevel=Math.min(helpLevel+1,2);showHelp();};
$('guide-close').onclick=()=>$('guide').close();
$('demo').onclick=()=>{$('demo-preview').hidden=false;};
$('demo-cancel').onclick=()=>{$('demo-preview').hidden=true;};
$('demo-confirm').onclick=()=>{$('guide').close();commit(W.example(),'已采用示范方案。可以撤销，或者查看每件物品。');};
$('reset').onclick=()=>$('confirm').showModal();
$('reset-cancel').onclick=()=>$('confirm').close();
$('reset-confirm').onclick=()=>{$('confirm').close();reset();};
$('finish-view').onclick=()=>$('finish').close();
$('finish-reset').onclick=()=>{$('finish').close();$('confirm').showModal();};
$('finish-end').onclick=()=>{$('finish').close();started=false;save();render();$('start').textContent='返回整理好的衣柜';};
save(); render();
