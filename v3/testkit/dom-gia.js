// DOM GIẢ + CHẠY SCRIPT THẬT CỦA MỘT TRANG — dùng chung cho các ca «chạy thật» (VE2b, VE7b…). Phần tử dựng từ chuỗi HTML (tĩnh
// của trang + mọi innerHTML) để bấm được NÚT THẬT mà script vẽ ra; `ui.js` THẬT, chỉ thay `toast` + `confirmDialog`; fetch đi sang
// máy chủ THẬT (thường là `dungPhanB` + CSDL giả) với cookie của vai.
import fs from 'node:fs';
import vm from 'node:vm';

const DOC = (p) => fs.readFileSync(new URL(`../src/ui/${p}`, import.meta.url), 'utf8');
const RONG = new Set(['input', 'br', 'img', 'meta', 'link', 'hr', 'source', 'wbr']);
export const giaiMa = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const chuTron = (h) => giaiMa(String(h).replace(/<[^>]*>/g, ''));
const maHoa = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const camel = (k) => k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
export function taoDom(than) {
  const song = new Set();
  // `textContent` / `innerHTML` SỐNG theo cây (VE7b · 30/09): mỗi phần tử giữ `_mau` = dãy «đoạn HTML chữ · phần tử con · {chu}»,
  // getter tính lại MỖI lần đọc. Bản đầu chụp chuỗi lúc dựng ⇒ con bị gán innerHTML mà tổ tiên vẫn đọc chữ CŨ (thước sai, màn đúng).
  class PT {
    constructor(tag, attrs, cha) {
      Object.assign(this, { tagName: tag.toUpperCase(), attrs, cha, con: [], nghe: {}, _mau: [], _mo: `<${tag}>`, dataset: {} });
      for (const [k, v] of Object.entries(attrs)) if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = giaiMa(v);
      this.id = attrs.id || '';
      this.value = attrs.value != null ? giaiMa(attrs.value) : '';
      this.checked = 'checked' in attrs; this.disabled = 'disabled' in attrs; this.hidden = 'hidden' in attrs;
      this.title = giaiMa(attrs.title || ''); this.href = giaiMa(attrs.href || '');
      song.add(this);
    }
    get innerHTML() { return this._mau.map((x) => (typeof x === 'string' ? x : x instanceof PT ? x.outerHTML : maHoa(x.chu))).join(''); }
    set innerHTML(h) { this.boCon(); phanTich(String(h ?? ''), this); }
    get outerHTML() { return this._rong ? this._mo : `${this._mo}${this.innerHTML}</${this.tagName.toLowerCase()}>`; }
    get textContent() { return this._mau.map((x) => (typeof x === 'string' ? chuTron(x) : x instanceof PT ? x.textContent : x.chu)).join(''); }
    set textContent(v) { this.boCon(); this._mau = [{ chu: String(v ?? '') }]; }
    boCon() { for (const c of this.hauDue()) song.delete(c); this.con = []; this._mau = []; }
    hauDue() { return this.con.flatMap((c) => [c, ...c.hauDue()]); }
    addEventListener(t, f) { (this.nghe[t] ||= []).push(f); }
    set onclick(f) { this.nghe.click = [f]; }
    // Sự kiện NỔI BỌT từ phần tử bấm lên các tổ tiên (như trình duyệt) — handler ủy quyền trên khung cha mới bắt được.
    async phat(t, e = {}) {
      let dung = false;
      const su = { target: this, preventDefault() {}, stopPropagation() { dung = true; }, ...e };
      for (let p = this; p && !dung; p = p.cha) for (const f of p.nghe[t] || []) await f({ ...su, currentTarget: p });
    }
    click() { return this.phat('click'); }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k.startsWith('data-')) this.dataset[camel(k.slice(5))] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(c) { c.cha = this; this.con.push(c); this._mau.push(c); return c; }
    querySelectorAll(s) { return this.hauDue().filter((p) => song.has(p) && khop(p, s)); }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
    closest(s) { for (let p = this; p; p = p.cha) if (khop(p, s)) return p; return null; }
    insertAdjacentHTML(_v, h) { this.innerHTML = h + this.innerHTML; }
    scrollIntoView() {} focus() {} showModal() { this.open = true; } close() { this.open = false; }
  }
  // Bộ chọn: `tag#id.lop[thuoc="gt"]`, nhiều bộ cách bằng dấu phẩy, và quan hệ HẬU DUỆ bằng dấu cách (`#dsPage a`).
  function khopMot(p, x) {
    const m = x.match(/^([a-z0-9]*)(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/i);
    if (!m) throw new Error(`DOM giả chưa hiểu bộ chọn «${x}»`);
    const [, tag, id, lop, thuoc, gt] = m;
    if (tag && p.tagName !== tag.toUpperCase()) return false;
    if (id && p.id !== id) return false;
    if (lop && !String(p.attrs.class || '').split(/\s+/).includes(lop)) return false;
    if (thuoc && !(thuoc in p.attrs)) return false;
    if (thuoc && gt != null && giaiMa(p.attrs[thuoc]) !== gt) return false;
    return true;
  }
  function khop(p, s) {
    return s.split(',').some((x) => {
      const bac = x.trim().split(/\s+/);
      if (!khopMot(p, bac[bac.length - 1])) return false;
      let i = bac.length - 2;
      for (let a = p.cha; a && i >= 0; a = a.cha) if (khopMot(a, bac[i])) i -= 1;
      return i < 0;
    });
  }
  // Mỗi tầng ngăn xếp giữ `cuoi` = chỗ đoạn chữ kế tiếp của nó bắt đầu, và `mau` đang dựng. Phần tử chưa đóng (vd. `<li>` thiếu
  // `</li>`) kết thúc ở thẻ đóng của tổ tiên gần nhất, hoặc ở cuối chuỗi.
  function phanTich(html, goc) {
    const re = /<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*(\/?)>/g;
    const ngan = [{ pt: goc, cuoi: 0, mau: [] }];
    const khep = (f, den) => { f.mau.push(html.slice(f.cuoi, den)); f.pt._mau = f.mau; };
    let m;
    while ((m = re.exec(html))) {
      const [toan, dong, tag, chuoi, tuDong] = m;
      const t = tag.toLowerCase();
      if (dong) {
        for (let i = ngan.length - 1; i > 0; i--) {
          if (ngan[i].pt.tagName !== t.toUpperCase()) continue;
          for (let j = ngan.length - 1; j > i; j--) { khep(ngan[j], m.index); ngan[j - 1].cuoi = m.index; }
          const f = ngan[i];
          if (t === 'textarea') f.pt.value = giaiMa(html.slice(f.dauTrong, m.index));
          khep(f, m.index);
          ngan[i - 1].cuoi = m.index + toan.length;
          ngan.length = i; break;
        }
        continue;
      }
      const attrs = {};
      for (const a of chuoi.matchAll(/([^\s=>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
      const f = ngan[ngan.length - 1];
      const pt = new PT(t, attrs, f.pt);
      pt._mo = toan;
      f.pt.con.push(pt);
      f.mau.push(html.slice(f.cuoi, m.index), pt);
      if (!RONG.has(t) && !tuDong) ngan.push({ pt, cuoi: m.index + toan.length, dauTrong: m.index + toan.length, mau: [] });
      else { pt._rong = true; f.cuoi = m.index + toan.length; }
    }
    for (let j = ngan.length - 1; j > 0; j--) { khep(ngan[j], html.length); ngan[j - 1].cuoi = html.length; }
    khep(ngan[0], html.length);
    for (const s of goc.hauDue().filter((x) => x.tagName === 'SELECT')) {
      const op = s.hauDue().filter((x) => x.tagName === 'OPTION');
      s.value = giaiMa((op.find((o) => 'selected' in o.attrs) || op[0] || { attrs: {} }).attrs.value ?? '');
    }
  }
  const body = new PT('body', {}, null);
  body.innerHTML = than.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  return { body, document: { body, title: '', querySelector: (s) => body.querySelector(s), querySelectorAll: (s) => body.querySelectorAll(s),
    createElement: (t) => new PT(t, {}, null) } };
}

const UI_JS = DOC('chung/ui.js');
/** Chạy script THẬT của một trang: `duong` = đường trình duyệt đang mở; fetch đi sang máy chủ thật với cookie của vai. */
export async function moTrang(tep, { goc, cookie, duong, xacNhan = true, tep: tepChon = null }) {
  const html = DOC(tep);
  const than = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));
  const { document } = taoDom(than);
  const u = new URL(duong, 'http://may.local');
  const location = { pathname: u.pathname, search: u.search, get href() { return `http://may.local${this.pathname}${this.search}`; }, set href(v) { this.di = v; } };
  const goi = [];
  const hoi = [];
  const loa = [];
  const ctx = vm.createContext({
    document, location, console, URL, URLSearchParams, setTimeout, clearTimeout, Promise, JSON, Date, Math, Number, String, Object, Array,
    history: { replaceState(_a, _b, x) { const n = new URL(String(x), 'http://may.local'); location.pathname = n.pathname; location.search = n.search; } },
    FileReader: class { readAsDataURL(f) { setTimeout(() => { this.result = `data:application/octet-stream;base64,${Buffer.from(f.noiDung).toString('base64')}`; this.onload(); }, 0); } },
    fetch: async (duongGoi, o = {}) => {
      const { credentials: _c, ...con } = o;
      goi.push({ duong: String(duongGoi), phuongThuc: o.method || 'GET', than: o.body ? JSON.parse(o.body) : null });
      return fetch(goc + duongGoi, { ...con, headers: { ...(o.headers || {}), cookie } });
    },
  });
  ctx.window = ctx;
  vm.runInContext(UI_JS, ctx);
  const that = ctx.window.UI;
  ctx.window.UI = { ...that, toast: (x) => { loa.push(String(x)); }, confirmDialog: async (x) => { hoi.push(x); return xacNhan; } };
  vm.runInContext(script, ctx);
  const cho = async () => { for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 15)); };
  await cho();
  return { document, $: (s) => document.querySelector(s), goi, hoi, loa, location, cho, ctx, tepChon };
}

