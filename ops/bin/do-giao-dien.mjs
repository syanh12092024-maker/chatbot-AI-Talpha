#!/usr/bin/env node
// ĐO GIAO DIỆN v3 — mở LẦN LƯỢT mọi màn trong menu của người đăng nhập, rồi trả lời hai câu:
//
//   ① MÀN NÀO VỠ?  — lỗi JS (`pageerror`) hay cửa trả 5xx. Một lỗi là cả mô-đun dừng, và
//      màn ra trắng mà trông vẫn "bình thường": có thanh bên, có tiêu đề, chỉ không có nội
//      dung. Ngày 17/09 màn «Vận hành chat V3» vỡ đúng kiểu ấy và không ai thấy tới 22/09 —
//      bộ ca không mở màn bằng trình duyệt thật nên không bài nào đỏ.
//   ② MÀN NẶNG CỠ NÀO? — số chữ, số hộp cảnh báo, số chỗ lộ mã kỹ thuật (`<code>`), số nút
//      và ô nhập. Đây là thước của kế hoạch `docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 6: chữ
//      trên toàn bộ màn ≤ 5.500, mỗi màn ≤ 1 hộp cảnh báo, 0 mã kỹ thuật trên mặt màn.
//
// ⚠️ CHỈ ĐỌC. Script mở màn và đọc DOM; không bấm nút nào, không gọi cửa ghi nào. Nó vẫn
//    đăng nhập thật, nên chạy trên bản dev — đừng trỏ vào máy chủ đang phục vụ khách.
//
// Chạy:
//   BROWSER_DRIVER=<đường dẫn tới entrypoint puppeteer-core> \
//   BROWSER_BINARY=/Applications/Brave\ Browser.app/Contents/MacOS/Brave\ Browser \
//   node ops/bin/do-giao-dien.mjs --goc http://127.0.0.1:3202 --dang-nhap <tệp login.json>
//
// `login.json` là tệp `{ "email": "...", "password": "..." }` — bản dev sạch tự sinh ra nó ở
// `.local-dev/<tên database>/login.json`. Không có BROWSER_DRIVER thì script dừng với mã 2
// (chưa đo được), KHÔNG phải mã 1 (đo được và đỏ) — hai chuyện đó không được lẫn.
//
// Mã thoát: 0 mọi màn mở được · 1 có màn vỡ · 2 chưa đo được (thiếu trình duyệt, không đăng
// nhập được, máy chủ không chạy).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

function thamSo(ten, mac) {
  const i = process.argv.indexOf(ten);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : mac;
}

const GOC = thamSo('--goc', 'http://127.0.0.1:3202').replace(/\/$/, '');
const TEP_DN = thamSo('--dang-nhap', '');
const CHO_MS = Number(thamSo('--cho', '1500'));

function dung(ma, ...loi) {
  console.error(...loi);
  process.exit(ma);
}

if (!process.env.BROWSER_DRIVER) {
  dung(2, 'Thiếu BROWSER_DRIVER (đường dẫn tới entrypoint của puppeteer-core).',
    'Không có trình duyệt thì KHÔNG đo được — đừng coi là đã đo và đạt.');
}
if (!TEP_DN) dung(2, 'Thiếu --dang-nhap <tệp login.json>.');

let dangNhap;
try { dangNhap = JSON.parse(fs.readFileSync(TEP_DN, 'utf8')); }
catch (e) { dung(2, `Không đọc được ${TEP_DN}: ${e.message}`); }
if (!dangNhap.email || !dangNhap.password) dung(2, `${TEP_DN} phải có \`email\` và \`password\`.`);

const { default: puppeteer } = await import(pathToFileURL(process.env.BROWSER_DRIVER));
const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_BINARY
    || '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu'],
});

try {
  const trang = await browser.newPage();
  await trang.setViewport({ width: 1440, height: 900 });

  // Chặn mọi lượt ra ngoài gốc đang đo: màn nào lỡ gọi ra Internet thì đo sẽ phụ thuộc mạng.
  await trang.setRequestInterception(true);
  trang.on('request', (r) => (r.url().startsWith(GOC) || r.url().startsWith('data:')
    ? r.continue() : r.abort()));

  await trang.goto(`${GOC}/dang-nhap`, { waitUntil: 'networkidle2' }).catch((e) => {
    dung(2, `Không mở được ${GOC}/dang-nhap: ${e.message}. Máy chủ giao diện có đang chạy không?`);
  });

  const vao = await trang.evaluate(async (email, matKhau) => {
    const r = await fetch('/api/dang-nhap', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      credentials: 'same-origin', body: JSON.stringify({ email, matKhau }),
    });
    return { ma: r.status, than: await r.json().catch(() => null) };
  }, dangNhap.email, dangNhap.password);
  if (vao.ma !== 200 || !vao.than?.ok) dung(2, `Đăng nhập hỏng (${vao.ma}).`);
  if (vao.than.canChonTeam) dung(2, 'Tài khoản thuộc nhiều team — script chưa chọn team hộ.');

  const menu = await trang.evaluate(async () => (await fetch('/api/dieu-huong', { credentials: 'same-origin' })).json());
  const man = [];
  for (const n of menu.nhom || []) for (const m of n.man || []) man.push({ nhom: n.ten, ten: m.ten, duong: m.duong });
  if (!man.length) dung(2, 'Menu rỗng — không có màn nào để đo.');

  const hang = [];
  for (const m of man) {
    const loi = [];
    const nhanLoi = (e) => loi.push(String(e?.message || e));
    const nhanCua = (r) => { if (r.status() >= 500) loi.push(`cửa ${r.status()} ${new URL(r.url()).pathname}`); };
    trang.on('pageerror', nhanLoi);
    trang.on('response', nhanCua);
    try {
      await trang.goto(GOC + m.duong, { waitUntil: 'networkidle2', timeout: 30000 });
      // Màn nạp dữ liệu sau khi tải xong; chờ một nhịp rồi mới đọc.
      await new Promise((r) => setTimeout(r, CHO_MS));
    } catch (e) { loi.push(`không mở được: ${e.message}`); }
    trang.off('pageerror', nhanLoi);
    trang.off('response', nhanCua);

    const so = await trang.evaluate(() => {
      const than = document.querySelector('main') || document.body;
      const chu = than.innerText.split(/\s+/).filter(Boolean).length;
      // CHỮ DIỄN GIẢI = chữ ĐANG HIỆN, trừ mọi BẢNG và DANH SÁCH dữ liệu. Đây mới là thứ
      // người vận hành phải ĐỌC; 235 tên sản phẩm trong một bảng không phải lỗi giao diện.
      // Trộn hai thứ vào một con số thì màn nào nhiều dữ liệu cũng bị chấm là dài dòng.
      //
      // ⚠️ ĐỪNG đếm trên `cloneNode()`: bản sao tách khỏi tài liệu nên `innerText` rơi về
      //    kiểu `textContent` và đếm luôn phần đang ẩn (tab chưa mở, hộp thoại chưa bật).
      //    Đo 22/09 trên màn «Người và team»: 122 chữ đang hiện mà bản sao đếm ra 238.
      // ⚠️ `details` đóng: Chrome mới KHÔNG dùng `display:none` cho phần thân mà dùng
      //    `content-visibility: hidden` — phần tử vẫn có hộp bố cục, nên phép đếm theo
      //    `offsetParent` vẫn đếm nó. Đo 24/09: ô «Nguồn số» đang đóng làm chữ diễn giải của
      //    ba màn TĂNG sau khi dọn. Phải loại thẳng theo bộ chọn.
      const BO = 'table, [role="list"], [role="listbox"], select, pre, [hidden], [aria-hidden="true"],'
        + ' details:not([open]) > *:not(summary), .nguon-so';
      const diBo = document.createTreeWalker(than, NodeFilter.SHOW_TEXT);
      let chuVan = 0;
      for (let n = diBo.nextNode(); n; n = diBo.nextNode()) {
        const cha = n.parentElement;
        if (!cha || cha.closest(BO)) continue;
        // `offsetParent` rỗng = đang bị `display:none` ở đâu đó phía trên.
        if (!cha.offsetParent && getComputedStyle(cha).position !== 'fixed') continue;
        chuVan += String(n.nodeValue || '').split(/\s+/).filter(Boolean).length;
      }
      return {
        chu,
        chuVan,
        canhBao: than.querySelectorAll('.alert').length,
        // MÃ LỘ TRÊN MẶT MÀN — không tính phần nằm trong ô «Nguồn số» đã gập. Luật 8 của sổ
        // vẫn đòi khai nguồn; GD4 chỉ dời lời khai ấy xuống ô gập, nên đếm ở đây phải trừ nó
        // ra, kẻo thước bảo «chưa dọn» trong khi việc đã làm đúng cách.
        ma: than.querySelectorAll('code').length - than.querySelectorAll('.nguon-so code').length,
        oNguonSo: than.querySelectorAll('.nguon-so').length,
        thaoTac: than.querySelectorAll(
          'button:not([disabled]), input:not([type=hidden]), select, textarea',
        ).length,
      };
    }).catch(() => ({ chu: 0, chuVan: 0, canhBao: 0, ma: 0, oNguonSo: 0, thaoTac: 0 }));

    hang.push({ ...m, ...so, loi });
  }

  const rong = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log(`\n${rong('MÀN', 26)}${rong('ĐƯỜNG', 18)}${'CHỮ'.padStart(6)}${'DIỄN GIẢI'.padStart(11)}${'CẢNH BÁO'.padStart(10)}${'MÃ HỞ'.padStart(7)}${'NGUỒN SỐ'.padStart(10)}${'THAO TÁC'.padStart(10)}  LỖI`);
  for (const h of hang) {
    console.log(rong(h.ten, 26) + rong(h.duong, 18)
      + String(h.chu).padStart(6) + String(h.chuVan).padStart(11) + String(h.canhBao).padStart(10)
      + String(h.ma).padStart(7) + String(h.oNguonSo).padStart(10) + String(h.thaoTac).padStart(10)
      + (h.loi.length ? `  ❌ ${h.loi.join(' · ')}` : ''));
  }

  const tong = (k) => hang.reduce((a, h) => a + h[k], 0);
  const vo = hang.filter((h) => h.loi.length);
  console.log(`\n${hang.length} màn · ${tong('chu')} chữ (trong đó ${tong('chuVan')} chữ DIỄN GIẢI)`
    + ` · ${tong('canhBao')} hộp cảnh báo · ${tong('ma')} chỗ lộ mã kỹ thuật trên mặt màn`
    + ` · ${tong('oNguonSo')} màn có ô «Nguồn số»`);
  console.log(`Màn vỡ: ${vo.length}${vo.length ? ' — ' + vo.map((h) => h.ten).join(', ') : ''}`);

  await browser.close();
  process.exit(vo.length ? 1 : 0);
} catch (e) {
  await browser.close().catch(() => {});
  dung(2, `Đo hỏng giữa chừng: ${e?.stack || e}`);
}
