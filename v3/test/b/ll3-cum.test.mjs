// PHIẾU LL3 · CỤM — nhiều màn một việc thành TAB trong trang (CR-28-09c · bản vẽ bảng 2b–2d).
//
// Đích Page của bản vẽ có hai chỗ: «Tất cả page» (danh sách + kịch bản các page) và «Luật chung»
// (luật · trả lời sẵn · đề xuất chờ duyệt). Trước LL3 đó là năm dòng menu ngang hàng. Nay mỗi chỗ là
// MỘT dòng; các màn còn lại hiện thành tab do khung vẽ. Bốn điều canh: sổ cụm tự nhất quán · không màn
// nào mất đường vào · tên cụm không bị gắn lên màn khác · khung thật sự vẽ tab (đọc mã khung).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const GOC_UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui');

const thanhBen = (v, nhom) => (mh.menuCua([v]).find((n) => n.ma === nhom)?.man || []).filter((m) => !m.an).map((m) => m.tenMenu || m.ten);
const tabCua = (v, nhom, cum) => (mh.menuCua([v]).find((n) => n.ma === nhom)?.man || [])
  .filter((m) => m.cum === cum && (!m.an || m.trongCum)).map((m) => m.nhanCum);

test('C1 · sổ cụm tự nhất quán: cụm dùng đều có khai · mỗi cụm ≥2 màn · một cụm chỉ ở một đích', () => {
  const dung = new Map();
  for (const m of mh.MAN.filter((x) => x.cum)) {
    assert.ok(mh.CUM[m.cum], `màn ${m.duong} khai cụm «${m.cum}» không có trong CUM`);
    assert.ok(m.nhanCum, `màn ${m.duong} trong cụm mà không có nhãn tab`);
    if (!dung.has(m.cum)) dung.set(m.cum, new Set());
    dung.get(m.cum).add(m.nhom);
  }
  for (const [cum, nhom] of dung) assert.equal(nhom.size, 1, `cụm ${cum} trải ${[...nhom].join(', ')}`);
  for (const cum of Object.keys(mh.CUM)) {
    assert.ok(mh.MAN.filter((m) => m.cum === cum).length >= 2, `cụm ${cum} dưới hai màn — không đáng là cụm`);
  }
});

test('C2 · Page của quản trị: thanh bên HAI dòng (Tất cả page · Luật chung), phần còn lại là tab', () => {
  assert.deepEqual(thanhBen(VAI.QUAN_TRI, 'page'), ['Tất cả page', 'Luật chung']);
  assert.deepEqual(tabCua(VAI.QUAN_TRI, 'page', 'danh-sach-page'), ['Tất cả page', 'Kịch bản']);
  // VE4 · 29/09 (bản vẽ 2d): bốn tab — «Chính sách · FAQ · Phản đối» mới, «Đề xuất chờ duyệt» thôi `thuNghiem`.
  assert.deepEqual(tabCua(VAI.QUAN_TRI, 'page', 'luat-chung'), ['Luật', 'Chính sách · FAQ · Phản đối', 'Trả lời sẵn', 'Đề xuất chờ duyệt']);
});

test('C3 · tên cụm CHỈ trên đầu cụm chuẩn — marketer (không mở «Tất cả page») thấy đúng tên màn của mình', () => {
  // VE4: màn hiện được ĐẦU TIÊN của cụm Luật chung với marketer nay là «Chính sách · FAQ · Phản đối» (đứng trước «Trả
  // lời sẵn» theo bản vẽ) — marketer không mở «Luật» nên dòng mang tên màn của nó, không mang tên cụm.
  assert.deepEqual(thanhBen(VAI.MARKETER, 'page'), ['Kịch bản của page', 'Chính sách · FAQ · Phản đối']);
  assert.deepEqual(thanhBen(VAI.DUYET_KICH_BAN, 'page'), ['Kịch bản của page', 'Luật chung']);
});

test('C4 · không màn nào mất đường vào: với MỌI vai, (thanh bên ∪ tab cụm) ⊇ mọi màn vai đó mở được ngoài màn ẩn cũ', () => {
  for (const v of Object.values(VAI)) {
    const goi = mh.menuCua([v]).flatMap((n) => n.man);
    const toi = new Set(goi.filter((m) => !m.an || m.trongCum).map((m) => m.duong));
    const phaiToi = goi.filter((m) => !m.thuNghiem && !m.canId && !m.moTuManKhac).map((m) => m.duong);
    assert.deepEqual(phaiToi.filter((d) => !toi.has(d)), [], `vai ${v} mất đường vào`);
  }
});

test('C5 · khung vẽ tab cụm dưới đầu trang: chạy mã khung (LL18: `khung.js`, máy chủ vẽ sẵn) + hệ kiểu', async () => {
  // LL18 · 29/09: markup khung chuyển từ `dieu-huong.js` (JS dựng sau một lượt hỏi) sang `khung.js` (hàm thuần,
  // máy chủ vẽ sẵn vào HTML). Ca này nay CHẠY hàm thay vì soi chuỗi mã: cụm có `data-cum`, đọc cờ `trongCum`,
  // và đầu cụm mang tên cụm ở hàng «Trong mục».
  const k = await import('../../src/ui/chung/khung.js');
  const d = { nhom: mh.menuCua([VAI.QUAN_TRI]) };
  const tab = k.veTabCum(d, '/lop-0-dong');
  assert.match(tab, /<nav class="tabs" data-cum="luat-chung"/, 'khung không gắn data-cum cho thanh tab');
  assert.match(tab, /href="\/lop-0-dong" aria-current="page">Trả lời sẵn</, 'màn trongCum phải lên tab và được đánh dấu');
  assert.match(k.veKhung(d, '/kich-ban').html, /aria-label="Trong mục Page"><a href="\/page-bot" aria-current="page">Tất cả page</,
    'hàng «Trong mục» không dùng tên cụm cho đầu cụm');
  const js = fs.readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  assert.doesNotThrow(() => new Function(js), 'tệp khung không parse được');
  const css = fs.readFileSync(path.join(GOC_UI, 'chung/kieu.css'), 'utf8');
  // Đòi đúng QUY TẮC ĐẶT CHỖ (trải hết lưới đầu trang) — chuỗi `.tabs[data-cum]` còn ở quy tắc màu chữ, đo
  // chuỗi trần thì gỡ quy tắc đặt chỗ vẫn xanh (đảo-vá M5, 29/09).
  assert.match(css, /body > header > \.tabs\[data-cum\] \{ grid-column: 1 \/ -1; grid-row: auto; justify-self: stretch;/,
    'hệ kiểu thiếu quy tắc đặt thanh tab cụm (kể cả đặt lại grid-row/justify-self — đầu trang có `.sp` thì tab bị đẩy sang phải)');
  // Mọi màn trong cụm phải có <header> ngay dưới <body> — khung chèn tab vào đó; thiếu thì tab không bao giờ
  // hiện. Đường → thư mục dò qua hằng `DUONG_TRANG` của từng màn; màn KHÔNG dò ra là ĐỎ (không lặng lẽ bỏ qua).
  const thuMucCua = new Map();
  for (const t of fs.readdirSync(GOC_UI)) {
    const d = path.join(GOC_UI, t);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.js'))) {
      const m = fs.readFileSync(path.join(d, f), 'utf8').match(/DUONG_TRANG = ['"](\/[^'"]*)['"]/);
      if (m) thuMucCua.set(m[1], t);
    }
  }
  const thieu = []; let daDo = 0;
  for (const m of mh.MAN.filter((x) => x.cum && !x.canId)) {
    const t = thuMucCua.get(m.duong);
    assert.ok(t, `không dò ra thư mục của ${m.duong} — thước đang đo nhầm chỗ`);
    const html = fs.readdirSync(path.join(GOC_UI, t, 'trang')).filter((f) => f.endsWith('.html'))
      .map((f) => fs.readFileSync(path.join(GOC_UI, t, 'trang', f), 'utf8')).join('');
    daDo += 1;
    if (!/<body[^>]*>\s*<header/.test(html)) thieu.push(m.duong);
  }
  assert.equal(daDo, mh.MAN.filter((x) => x.cum && !x.canId).length);
  assert.deepEqual(thieu, [], 'màn trong cụm không có <header> ngay dưới <body>');
});
