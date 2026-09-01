// MENU ĐIỀU HƯỚNG DÙNG CHUNG (`chung/man-hinh.js`).
//
// Màn dựng xong 24 cái mà không có menu nào liệt kê chúng — chủ dự án mở `/trang-chu` và
// hỏi «vào đâu để vào trang chính». Bài test này canh ba chuyện của cái menu vừa dựng:
//   ① Đường và vai LẤY TỪ CHÍNH MÀN, không chép lại — chép sai một đường là nút dẫn tới 404.
//   ② Lọc theo vai ở MÁY CHỦ, và đúng §9.
//   ③ Mọi trang đều nhúng menu — sót một trang là người dùng lại kẹt ở đúng trang đó.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');

const GOC_UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui');

/* ═══════════ ① ĐƯỜNG VÀ VAI PHẢI CÓ THẬT ═══════════ */

test('①a · mọi màn trong sổ đều có đường và ít nhất một vai', () => {
  assert.ok(mh.MAN.length >= 24, `sổ chỉ có ${mh.MAN.length} màn`);
  for (const m of mh.MAN) {
    assert.ok(m.duong && m.duong.startsWith('/'), `${m.ten}: đường không hợp lệ (${m.duong})`);
    assert.ok(Array.isArray(m.vai) && m.vai.length, `${m.ten}: không khai vai nào — không ai thấy`);
    assert.ok(m.ten && m.nhom, `${m.duong}: thiếu tên hoặc nhóm`);
  }
});

test('①b · mọi đường trong menu TRỎ TỚI MÀN CÓ THẬT', () => {
  // Đọc `DUONG_TRANG` từ mọi router đã dựng — cùng phép với bài test của Trang chủ.
  const co = new Set();
  for (const ten of readdirSync(GOC_UI)) {
    const f = path.join(GOC_UI, ten, 'router.js');
    if (!existsSync(f)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(/DUONG_TRANG\s*=\s*'([^']+)'/g)) co.add(m[1]);
  }
  const chet = mh.MAN.filter((m) => !co.has(m.duong));
  assert.deepEqual(chet.map((m) => `${m.ten} → ${m.duong}`), [],
    'menu có nút dẫn tới màn chưa dựng — bấm vào là 404');
});

test('①c · không đường nào trùng nhau', () => {
  const d = mh.MAN.map((m) => m.duong);
  assert.equal(new Set(d).size, d.length, `trùng đường: ${d.filter((x, i) => d.indexOf(x) !== i)}`);
});

/* ═══════════ ② LỌC THEO VAI, ĐÚNG §9 ═══════════ */

const ten = (vai) => mh.menuCua([vai]).flatMap((n) => n.man.map((m) => m.ten));

test('②a · SALE chỉ thấy Bảng điều phối — §9', () => {
  assert.deepEqual(ten(VAI.SALE), ['Bảng điều phối']);
});

test('②b · MARKETER không thấy màn hạ tầng', () => {
  const t = ten(VAI.MARKETER);
  assert.ok(t.includes('Sản phẩm & kho'));
  assert.ok(!t.includes('Kết nối & token'), 'kho token là hạ tầng dùng chung ba team');
  assert.ok(!t.includes('Cấu hình team'));
});

test('②c · NGƯỜI DUYỆT KỊCH BẢN thấy bộ luật nhưng không thấy màn hạ tầng', () => {
  const t = ten(VAI.DUYET_KICH_BAN);
  assert.ok(t.includes('Bộ luật chung'), 'họ cần biết luật chung để duyệt kịch bản cho khớp');
  assert.ok(!t.includes('Kết nối & token'));
});

test('②d · QUẢN TRỊ thấy hết', () => {
  assert.equal(ten(VAI.QUAN_TRI).length, mh.MAN.length);
});

test('②e · vai rỗng → menu rỗng, không lộ tên màn nào', () => {
  assert.deepEqual(mh.menuCua([]), []);
  assert.deepEqual(mh.menuCua(['vai-la-hoac']), []);
});

test('②f · menu của một vai KHỚP đúng `VAI_VAO_DUOC` của từng màn', async () => {
  // Đây là chỗ menu dễ nói dối nhất: chìa ra màn người ta sẽ bị 403, hoặc giấu màn họ được
  // xem. Khớp được vì sổ NHẬP vai từ màn — bài này canh việc đó không bị ai chép tay lại.
  for (const vai of Object.values(VAI)) {
    const trongMenu = new Set(mh.menuCua([vai]).flatMap((n) => n.man.map((m) => m.duong)));
    for (const m of mh.MAN) {
      const nenCo = m.vai.map(String).includes(String(vai));
      assert.equal(trongMenu.has(m.duong), nenCo,
        `vai ${vai} · màn ${m.ten}: menu ${trongMenu.has(m.duong) ? 'CÓ' : 'KHÔNG'} nhưng màn khai ${nenCo ? 'CHO' : 'KHÔNG cho'} vào`);
    }
  }
});

/* ═══════════ ③ MỌI TRANG PHẢI NHÚNG MENU ═══════════ */

test('③ · mọi trang HTML đều nhúng `dieu-huong.js`', () => {
  const sot = [];
  for (const ten of readdirSync(GOC_UI)) {
    const thu = path.join(GOC_UI, ten, 'trang');
    if (!existsSync(thu)) continue;
    for (const f of readdirSync(thu).filter((x) => x.endsWith('.html'))) {
      const s = readFileSync(path.join(thu, f), 'utf8');
      if (!s.includes('dieu-huong.js')) sot.push(`${ten}/${f}`);
    }
  }
  assert.deepEqual(sot, [],
    `trang thiếu menu: ${sot.join(', ')} — người dùng vào đó là kẹt, không đi đâu được`);
});

/* ═══════════ ④ SÁU MỤC, XẾP THEO NHỊP — không mọc dài trở lại ═══════════ */
// Menu cũ là 24 dòng phẳng: vai `quan-tri` phải quét 24 mục để tìm một màn. Bốn bài dưới
// khoá đúng cái vừa sửa, vì thứ dễ trôi nhất ở một sổ đăng ký là có người thêm nhóm mới.

test('④a · đúng SÁU mục, không hơn — thêm mục thứ bảy là quay lại danh sách dài', () => {
  assert.equal(mh.NHOM.length, 6, `đang có ${mh.NHOM.length} mục: ${mh.NHOM.map((n) => n.ten)}`);
  for (const n of mh.NHOM) {
    assert.ok(n.ma && n.ten, 'mục phải có mã và tên');
    assert.ok(n.mo && n.mo.length > 8, `mục ${n.ten}: thiếu câu mô tả — người dùng không đoán được trong đó có gì`);
  }
});

test('④b · mọi màn thuộc về một mục CÓ THẬT — không màn nào rơi ra ngoài menu', () => {
  const ma = new Set(mh.NHOM.map((n) => n.ma));
  const lac = mh.MAN.filter((m) => !ma.has(m.nhom));
  assert.deepEqual(lac.map((m) => `${m.ten} → nhóm "${m.nhom}"`), [],
    'màn khai nhóm không có trong NHOM sẽ biến mất khỏi menu mà không ai báo');
});

test('④c · vai QUẢN TRỊ thấy 6 mục nhưng vẫn đủ 24 màn — gom chứ không xoá', () => {
  const menu = mh.menuCua([VAI.QUAN_TRI]);
  assert.equal(menu.length, 6, 'quản trị phải thấy đủ sáu mục');
  const soMan = menu.reduce((a, n) => a + n.man.length, 0);
  assert.equal(soMan, mh.MAN.length, 'gom nhóm KHÔNG được làm rơi màn nào');
  // Mục nặng nhất là «Bot nói gì» — bảy mặt của một việc (01 §6 bốn khối).
  const bot = menu.find((n) => n.ma === 'bot-noi-gi');
  assert.equal(bot.man.length, 7);
  assert.equal(bot.man[bot.man.length - 1].ten, 'Prompt của page',
    'màn xem lại prompt phải đứng CUỐI — nó là chỗ kiểm sau khi sửa, không phải chỗ bắt đầu');
});

test('④d · SALE chỉ thấy MỘT mục, và mục đó chỉ có một màn — §10', () => {
  const menu = mh.menuCua([VAI.SALE]);
  assert.equal(menu.length, 1, 'sale không được thấy mục nào khác');
  assert.equal(menu[0].ma, 'viec-can-xu');
  assert.deepEqual(menu[0].man.map((m) => m.ten), ['Bảng điều phối']);
});

test('④e · `mucCuaDuong` chỉ đúng mục đang đứng — menu phải bung được đúng chỗ', () => {
  assert.equal(mh.mucCuaDuong('/bo-luat'), 'bot-noi-gi');
  assert.equal(mh.mucCuaDuong('/dieu-phoi'), 'viec-can-xu');
  assert.equal(mh.mucCuaDuong('/nhat-ky'), 'cai-dat');
  assert.equal(mh.mucCuaDuong('/dieu-phoi/'), 'viec-can-xu', 'gạch chéo cuối không được làm lệch');
  assert.equal(mh.mucCuaDuong('/khong-co-that'), null, 'đường lạ trả null, không đoán bừa');
});
