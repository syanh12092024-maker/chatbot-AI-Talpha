// PHIẾU VE5 · HỘP THƯ THEO BẢN VẼ 1a — ba tab «Cần bạn · Đơn chờ · Bot đang xử» · thẻ đơn ở cột giữa · nhận/đóng việc ở
// thanh cuối · cột phải ba khối. Luật GIỮ NGUYÊN từ UI-HT2/LL2: trang chỉ ĐỌC (thước `ban-hoi-thoai-khong-gui` T4), mọi
// lời gọi ghi trong `hop-thu-ui.js` (thước `hop-thu` H4). Hành vi van POS trên Postgres thật: `test/ll2-hop-thu.test.mjs` L6.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../src/ui/ban-hoi-thoai/trang/ban-hoi-thoai.html', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../../src/ui/hop-thu/trang/hop-thu-ui.js', import.meta.url), 'utf8');
const than = (src, ten) => (src.match(new RegExp(`(?:async )?function ${ten}\\([^)]*\\) \\{[\\s\\S]*?\\n  ?\\}\\n`)) || [''])[0];

test('V1 · ba tab đúng thứ tự bản vẽ; «Tất cả» thành LỐI (không phải tab) — chức năng cũ không mất', () => {
  const tab = [...html.matchAll(/role="tab"[^>]*data-loc="([a-z]+)">([^<]+)</g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(tab, [['can', 'Cần bạn'], ['don', 'Đơn chờ'], ['bot', 'Bot đang xử']]);
  assert.match(html, /<button type="button" class="lien-ke" data-loc="tat">Mọi hội thoại gần đây<\/button>/);
  assert.match(html, /const API_LOC = \{ can: 'nguoi', bot: 'bot', tat: 'tat' \};/, 'tab mới phải đi ĐÚNG lát đọc cũ');
  assert.match(html, /<header class="an-tieu-de">\s*<h1>Hộp thư<\/h1>/, 'tên màn một nguồn (HK10), ẩn như bản vẽ');
  assert.match(html, /quản trị thấy ở «Việc đang chờ»/, 'không hứa «quản trị được báo» — chưa có đường đẩy thông báo');
});

test('V2 · «Cần bạn» = việc mở + đơn chờ: đếm cộng hai nguồn; đơn là HÀNG của hàng đợi (không khối «không có…»)', () => {
  assert.match(html, /const veDemCan = \(\) => \{ \$\('#n-can'\)\.textContent = so\(DEM_NGUOI \+ DEM_DON\); \};/);
  assert.match(html, /if \(LOC === 'can' && !TIM && window\.HopThu\) \{\s*const n = await window\.HopThu\.veDonCho\(\$\('#don-can'\), \{ moHoiThoai: mo, chiCo: true \}\);/);
  assert.match(ui, /noi\.innerHTML = \(chiCo \? \(hangMess \?/, 'chế độ «Cần bạn» phải vẽ đơn thành hàng');
  assert.match(ui, /<span class="ht-phu">Bot chốt đơn — chờ bạn duyệt<\/span>/);
  assert.match(ui, /const ve = \(tieuDe, dem, than, rong\) => \(chiCo && !than \? "" : khoi/, 'Cần bạn không in «Không có…» chen hàng đợi');
});

test('V3 · thẻ đơn ở CỘT GIỮA; ba nút mở ĐÚNG form cũ (luật duyệt không đổi); van POS đóng ⇒ nói trước + khoá nút duyệt', () => {
  assert.match(html, /<div class="chat-than" id="cuon-chat"><div class="chat-tin" id="chat" aria-live="polite"><\/div><div id="the-don"><\/div><\/div>/);
  assert.match(html, /window\.HopThu\.theDon\(dc, \$\('#the-don'\)/);
  assert.doesNotMatch(html, /id="mo-don"|khoi\('Đơn chờ duyệt'/, 'form đơn còn nằm ở cột phải — hai chỗ duyệt một đơn');
  const td = than(ui, 'theDon');
  assert.ok(td, 'không thấy hàm theDon');
  // Đảo-vá M6 (VE5): bản đầu dùng regex `goi\([^)]*,` — không vượt được `)` của `${enc(o.id)}` nên lượt gọi duyệt lọt.
  // Nay đếm: thẻ đơn có ĐÚNG MỘT lời gọi, là lượt ĐỌC đơn; không đường ghi nào xuất hiện trong thân.
  assert.deepEqual([...td.matchAll(/\bgoi\(/g)].length, 1, 'thẻ đơn tự gọi thêm — mọi lượt ghi phải qua form moDon');
  assert.match(td, /d = await goi\(`\/api\/hop-thu\/don\/\$\{enc\(dc\.id\)\}`\);/);
  assert.doesNotMatch(td, /\/(duyet|luu|loai)\b/, 'thẻ đơn nhắc tới đường ghi');
  assert.match(td, /moDon\(o\.id, form, \{ tapTrung: b\.dataset\.mo,/);
  assert.match(td, /data-mo="duyet"\$\{d\.posGhiMo === false \? ' disabled title="Cửa tạo đơn POS đang đóng"' : ""\}>Duyệt → Chờ in/);
  assert.match(td, /if \(choDuyet && d\.posGhiMo === false\) \{\s*canh\.push\(UI\.alert\(\{ level: "info", title: "Cửa tạo đơn POS đang ĐÓNG trên máy chủ"/);
  assert.match(ui, /const MUC_CANH = new Set\(\["chan", "nhac"\]\);/, 'cảnh báo hoàn theo TẦNG máy chủ tính, không ngưỡng tự đặt');
  // Luật duyệt của form cũ còn nguyên: ô «đã kiểm tra» + phải lưu trước khi duyệt.
  const md = than(ui, 'moDon');
  assert.match(md, /if \(!\$\("#hd-xac"\)\.checked\) throw new Error/);
  assert.match(md, /if \(daDoi\(\)\) throw new Error\("Bạn đã sửa thông tin — lưu đơn trước khi duyệt\."\)/);
});

test('V4 · thanh cuối: khối đóng việc dùng chung đắp vào menu mở LÊN; thanh dựng TRƯỚC khi gắn; liên kết Pancake không xoá khối', () => {
  const vc = than(html, 'veChan');
  assert.ok(vc, 'không thấy veChan');
  assert.match(vc, /<details class="menu-len"><summary class="btn"[^>]*>\$\{v\.trangThai === 'dang_xu' \? 'Đóng việc' : 'Nhận · đóng việc'\} ▾<\/summary>/);
  assert.match(vc, /<div class="menu-len-than" id="o-dong-viec"><\/div><\/details>/);
  assert.match(vc, /Trả lời khách ở Pancake · ở đây nhận, duyệt và đóng/);
  assert.equal((html.match(/\$\('#chan'\)\.innerHTML\s*=/g) || []).length, 1, 'chỉ veChan được vẽ lại thanh cuối — vẽ lại sau khi gắn là mất khối đóng việc');
  assert.match(html, /\$\('#the-don'\)\.innerHTML = '';\s*veChan\(ht, id\);/, 'thanh phải dựng NGAY khi mở, trước lượt đọc bối cảnh');
  assert.match(html, /\$\('#lk-pancake'\)\.innerHTML = `<a class="btn"/);
  assert.doesNotMatch(html, /Trả lại bot<\/button>/, 'không vẽ nút «Trả lại bot» riêng — sale chưa có đường đổi chủ hội thoại về bot');
});

test('V5 · cột phải ba khối theo bản vẽ; «Page này bán gì» nói rõ vai sale chưa có đường đọc sản phẩm', () => {
  const khoi = [...html.matchAll(/\$\{khoi\('([^']+)', /g)].map((m) => m[1]);
  assert.deepEqual(khoi, ['Khách', 'Bot đã làm gì', 'Page này bán gì', 'Đơn đang bàn']);
  assert.match(html, /dong\('Vì sao chuyển', v \? v\.lyDoChu : h\.lyDoCuoi\)/);
  assert.match(html, /cam\('Sản phẩm & giá của page: vai của bạn chưa có đường đọc ở đây/);
});
