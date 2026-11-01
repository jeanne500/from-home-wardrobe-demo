(function (root) {
  'use strict';
  const items = {
    A: { name: '常穿上衣', icon: '衫', note: '这件经常穿，放下层方便拿。', options: [['L', 1]] },
    B: { name: '常穿长裤', icon: '裤', note: '这条经常穿，也放下层。', options: [['L', 1]] },
    C: { name: '换季开衫', icon: '衣', note: '可以挂在下层占两格，也可以折好放上层占一格。', options: [['L', 2], ['U', 1]] },
    D: { name: '纪念围巾', icon: '巾', note: '想好好留下，放上层或下层都可以，占一格。', options: [['L', 1], ['U', 1]] },
    E: { name: '待修补外套', icon: '补', note: '先安排进修补篮，之后再修。', options: [['repair', 1]] },
    F: { name: '待转赠外套', icon: '赠', note: '已经想好了，先放到待转赠处。这里只是暂放，随时可以撤回。', options: [['donate', 1]] },
    BOX: { name: '换季盒', icon: '盒', note: '封好的换季盒放回上层，需要两个连着的位置。本关不打开盒子。', options: [['U', 2]] }
  };
  const caps = { U: 3, L: 4, repair: 1, donate: 1 };
  const initial = () => ({ A: null, B: null, C: { zone: 'L', start: 0, width: 2 }, D: { zone: 'U', start: 1, width: 1 }, E: null, F: null, BOX: null });
  const copy = s => JSON.parse(JSON.stringify(s));
  function place(state, id, zone, start = 0, mode = 'hang') {
    if (!items[id]) return { ok: false, message: '请先选择一件物品。' };
    if (zone === 'mat') return { ok: true, state: { ...copy(state), [id]: null } };
    if ((id === 'C') && zone !== (mode === 'fold' ? 'U' : 'L')) return { ok: false, message: mode === 'fold' ? '这次折好放上层；也可以改成挂放。' : '挂放用下层的两个位置；也可以改成折好。' };
    const opt = items[id].options.find(o => o[0] === zone);
    if (!opt) return { ok: false, message: items[id].note };
    const width = opt[1];
    if (!Number.isInteger(start) || start < 0 || start + width > caps[zone]) return { ok: false, message: '这里剩的位置不够，试试另一个起点。' };
    const clashes = Object.entries(state).some(([other, p]) => other !== id && p && p.zone === zone && p.start < start + width && p.start + p.width > start);
    if (clashes) return { ok: false, message: id === 'BOX' ? '盒子需要两个连着的空位，可以先挪动上层的物品。' : '这个位置已经放了东西，可以先把它移开。' };
    return { ok: true, state: { ...copy(state), [id]: { zone, start, width } } };
  }
  function valid(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state) || Object.keys(state).length !== Object.keys(items).length) return false;
    const used = {};
    for (const id of Object.keys(items)) {
      if (!Object.prototype.hasOwnProperty.call(state, id)) return false;
      const p = state[id]; if (p === null) continue;
      if (!p || !items[id].options.some(([z,w]) => z === p.zone && w === p.width) || !Number.isInteger(p.start) || p.start < 0 || p.start + p.width > caps[p.zone]) return false;
      for (let n = p.start; n < p.start + p.width; n++) { const key = p.zone + n; if (used[key]) return false; used[key] = true; }
    }
    return true;
  }
  const complete = s => valid(s) && Object.values(s).every(Boolean);
  const example = () => ({ A: { zone:'L',start:0,width:1 }, B:{zone:'L',start:1,width:1}, C:{zone:'L',start:2,width:2}, D:{zone:'U',start:0,width:1}, E:{zone:'repair',start:0,width:1}, F:{zone:'donate',start:0,width:1}, BOX:{zone:'U',start:1,width:2} });
  const api = { items, caps, initial, copy, place, valid, complete, example };
  root.Wardrobe = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
