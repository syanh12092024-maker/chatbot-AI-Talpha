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
  assert.ok(t.includes('Quy tắc chung của bot'), 'họ cần biết luật chung để duyệt kịch bản cho khớp');
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

test('④a · BỐN mục người dùng thấy — mục thứ năm là quay lại danh sách dài', () => {
  // Bản 01/09 gom 24 dòng phẳng thành SÁU mục. Bản này gom tiếp còn BỐN, theo bản vẽ
  // 11/09: người tiếp quản mở lên và nói «nhiều tính năng quá, khó hiểu». Sáu mục vẫn
  // buộc phải đọc sáu câu mô tả rồi bung mục mới biết bên trong có gì.
  //   Việc · Page · Số liệu · Cài đặt
  // KHÔNG màn nào bị xoá — 24 màn vẫn đủ 24 đường, và vẫn nằm trong menu nên bài ③
  // (không trang nào kẹt) giữ nguyên hiệu lực.
  // NHOM khai NĂM: bốn mục trên + `nhan-cho-khach` dự trù cho giai đoạn 3, tự ẩn.
  assert.equal(mh.NHOM.length, 5, `đang có ${mh.NHOM.length} mục: ${mh.NHOM.map((n) => n.ten)}`);
  for (const n of mh.NHOM) {
    assert.ok(n.ma && n.ten, 'mục phải có mã và tên');
    assert.ok(n.mo && n.mo.length > 8, `mục ${n.ten}: thiếu câu mô tả — người dùng không đoán được trong đó có gì`);
  }
  for (const ma of mh.MUC_DU_TRU) {
    assert.ok(mh.NHOM.some((n) => n.ma === ma), `mục dự trù "${ma}" không có trong NHOM`);
    assert.equal(mh.MAN.filter((m) => m.nhom === ma).length, 0,
      `mục "${ma}" đã có màn — bỏ nó khỏi MUC_DU_TRU và cập nhật bài test này`);
  }
  const hien = mh.menuCua([VAI.QUAN_TRI]).length;
  assert.ok(hien <= 4, `vai thấy nhiều nhất phải ≤ 4 mục, đang thấy ${hien}`);
});

test('④b · mọi màn thuộc về một mục CÓ THẬT — không màn nào rơi ra ngoài menu', () => {
  const ma = new Set(mh.NHOM.map((n) => n.ma));
  const lac = mh.MAN.filter((m) => !ma.has(m.nhom));
  assert.deepEqual(lac.map((m) => `${m.ten} → nhóm "${m.nhom}"`), [],
    'màn khai nhóm không có trong NHOM sẽ biến mất khỏi menu mà không ai báo');
});

test('④c · vai QUẢN TRỊ thấy 4 mục nhưng vẫn đủ 24 màn — gom chứ không xoá', () => {
  const menu = mh.menuCua([VAI.QUAN_TRI]);
  assert.equal(menu.length, 4, 'quản trị phải thấy đúng bốn mục CÓ MÀN (mục dự trù tự ẩn)');
  const soMan = menu.reduce((a, n) => a + n.man.length, 0);
  assert.equal(soMan, mh.MAN.length, 'gom nhóm KHÔNG được làm rơi màn nào');
  assert.deepEqual(menu.map((n) => n.ma), ['viec', 'page', 'so-lieu', 'cai-dat'],
    'thứ tự mục là thứ tự nhịp làm việc: việc hằng ngày trước, cài đặt sau cùng');
  // «Việc» là mục mở mỗi sáng — nó phải đứng ĐẦU, và Bảng điều phối phải là màn đầu của nó.
  assert.equal(menu[0].man[0].ten, 'Bảng điều phối');
  // Chín màn ít dùng dồn vào Cài đặt. Đếm ở đây để nếu có người kéo một màn ít dùng trở
  // lên mục hằng ngày thì bài này đỏ, chứ không trôi lặng lẽ.
  const caiDat = menu.find((n) => n.ma === 'cai-dat');
  assert.equal(caiDat.man.length, 13, 'Cài đặt = 4 màn cấu hình + 9 màn ít dùng');
});

test('④d · SALE chỉ thấy MỘT mục, và mục đó chỉ có một màn — §10', () => {
  const menu = mh.menuCua([VAI.SALE]);
  assert.equal(menu.length, 1, 'sale không được thấy mục nào khác');
  assert.equal(menu[0].ma, 'viec');
  assert.deepEqual(menu[0].man.map((m) => m.ten), ['Bảng điều phối']);
});

test('④e · `mucCuaDuong` chỉ đúng mục đang đứng — menu phải bung được đúng chỗ', () => {
  assert.equal(mh.mucCuaDuong('/bo-luat'), 'cai-dat');
  assert.equal(mh.mucCuaDuong('/dieu-phoi'), 'viec');
  assert.equal(mh.mucCuaDuong('/nhat-ky'), 'cai-dat');
  assert.equal(mh.mucCuaDuong('/dieu-phoi/'), 'viec', 'gạch chéo cuối không được làm lệch');
  assert.equal(mh.mucCuaDuong('/khong-co-that'), null, 'đường lạ trả null, không đoán bừa');
});

test('④f · ĐÚNG chín màn nằm dưới vạch «Ít dùng», và không màn nào của mục khác', () => {
  // Chín màn này chưa có dữ liệu để hiện, hoặc đang tắt trên máy chủ, hoặc một năm dùng
  // một lần. Cờ `itDung` KHÔNG đổi quyền và KHÔNG bỏ màn khỏi menu — bài ④b vẫn canh
  // «không màn nào rơi ra ngoài». Nó chỉ đổi CHỖ ĐỨNG trong mục.
  const itDung = mh.MAN.filter((m) => m.itDung);
  assert.deepEqual(itDung.map((m) => m.ten), [
    'Quy tắc chung của bot', 'Thư viện kỹ năng', 'Prompt thật của page',
    'Trả lời sẵn theo từ khoá', 'Thư viện ảnh', 'Gợi ý từ AI',
    'So hai bản kịch bản', 'Đưa sản phẩm lên chạy', 'Rủi ro hoàn hàng',
  ]);
  // Tất cả phải nằm trong «Cài đặt»: một màn ít dùng lạc sang mục hằng ngày thì vạch
  // «Ít dùng» mọc ra giữa mục đó, và người dùng thấy một ranh giới không có nghĩa.
  for (const m of itDung) assert.equal(m.nhom, 'cai-dat', `${m.ten} không thuộc Cài đặt`);
  // Và bốn màn cấu hình thật phải đứng TRƯỚC vạch.
  const caiDat = mh.MAN.filter((m) => m.nhom === 'cai-dat');
  assert.deepEqual(caiDat.slice(0, 4).map((m) => m.itDung), [false, false, false, false],
    'bốn màn cấu hình phải đứng trên vạch');
  assert.ok(caiDat.slice(4).every((m) => m.itDung), 'phần sau vạch phải toàn màn ít dùng');
});

/* ═══════════ ⑤ LỐI RA: đổi team và đăng xuất phải có ở MỌI trang ═══════════ */
// 01 §8 chốt BA team, và một người có thể thuộc nhiều team. Trước 01/09 chỉ MỘT trong 25
// trang có lối tới `/chon-team` — vai `sale` (không vào được Cấu hình team) thì kẹt hẳn:
// muốn sang team khác phải xoá cookie.

test('⑤a · menu dùng chung có nút đổi team và nút đăng xuất', () => {
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  assert.match(js, /\/chon-team/, 'thiếu lối đổi team');
  assert.match(js, /\/api\/dang-xuat/, 'thiếu lối đăng xuất');
  assert.match(js, /method:\s*['"]POST['"]/,
    'đăng xuất là cửa POST (xoá cookie ở máy chủ) — một thẻ <a> không gọi được');
});

test('⑤b · vì menu nhúng ở mọi trang, MỌI trang đều có lối ra — kể cả trang của vai sale', () => {
  // Bài ③ đã canh mọi trang nhúng `dieu-huong.js`; bài này canh cái nhúng đó CÓ lối ra.
  // Hai bài cộng lại mới là câu «không trang nào kẹt».
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  const trongMenu = js.includes('/chon-team') && js.includes('/api/dang-xuat');
  assert.ok(trongMenu, 'lối ra phải nằm trong menu dùng chung, không phải trong từng trang');
  // Và nó KHÔNG được nằm sau lớp vai: sale cũng phải thoát được.
  assert.ok(!/VAI\.|vai\s*===|batBuocVai/.test(js.split('.dh-tk')[1] || ''),
    'khối tài khoản không được lọc theo vai — mọi người đều phải ra được');
});

test('⑤c · `dieu-huong.js` PHẢI PARSE ĐƯỢC — một dấu huyền ngược lạc chỗ là mất menu ở cả 25 trang', () => {
  // Án lệ 01/09: một comment CSS chứa dấu huyền ngược nằm trong template literal của biến
  // `css` đóng chuỗi sớm ⇒ cả tệp thành lỗi cú pháp. Trình duyệt bỏ qua trong im lặng
  // (menu bọc trong try/catch của chính nó), mọi trang vẫn hiện — chỉ là không còn menu.
  // Bài ③ đếm được thẻ <script> nhúng, KHÔNG đọc được rằng tệp bên trong có chạy hay không.
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  assert.doesNotThrow(() => new Function(js), 'tệp menu không parse được');
});

/* ═══════════ ⑥ THANH TAB CỦA MỤC — và header thôi tự chế link ═══════════ */
// Design mới: mỗi mục hiện như MỘT trang nhiều tab. Không gộp 24 trang thành 6 (mỗi màn
// giữ đường riêng, router riêng, lớp vai riêng) — thanh tab chỉ nói ra rằng những màn này
// thuộc cùng một việc, và cho đi ngang bằng một cú bấm thay vì quay lại menu.

test('⑥a · menu dùng chung có dựng thanh tab, và chỉ dựng khi mục có TỪ HAI màn', () => {
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  assert.match(js, /dungThanhTab/, 'thiếu hàm dựng thanh tab');
  assert.match(js, /man\.length\s*<\s*2/,
    'phải bỏ qua mục chỉ có một màn — một tab đơn độc là nhiễu');
  // Thanh tab chỉ mang màn THƯỜNG DÙNG, cộng chính màn đang đứng nếu nó là màn ít dùng.
  // Mục «Cài đặt» có 13 màn: mười ba tab ngang thì tab cuối bị cuộn khuất, không ai đọc.
  assert.match(js, /!m\.itDung\s*\|\|\s*m\.duong\s*===\s*nay/,
    'thanh tab phải lọc màn ít dùng, trừ màn đang đứng');
  assert.match(js, /insertAdjacentElement\("afterend"|insertAdjacentElement\('afterend'/,
    'thanh tab phải nằm ngay dưới <header>');
});

test('⑥b · mỗi mục có từ hai màn thì thanh tab của nó liệt kê ĐÚNG các màn đó', () => {
  // Thanh tab dựng từ chính `menuCua`, nên bài này canh dữ liệu: mục nào ra thanh tab,
  // mục nào không, và số tab bằng số màn vai đó vào được.
  const menu = mh.menuCua([VAI.QUAN_TRI]);
  const coTab = menu.filter((n) => n.man.length >= 2).map((n) => `${n.ma}:${n.man.length}`);
  // Neo SỐ, cố ý: thêm một màn là ca này đỏ, buộc người thêm phải khai ra mình vừa làm gì.
  // 14/09/2026: page 4 → 5 vì thêm màn «Bắt đầu» (đứng đầu nhóm, lối đi cho người mới).
  assert.deepEqual(coTab, ['viec:4', 'page:5', 'so-lieu:3', 'cai-dat:13'],
    `mục có thanh tab: ${coTab}`);
  // Vai `sale` chỉ vào được MỘT màn của mục «Việc» ⇒ họ KHÔNG được thấy thanh tab: một
  // thanh tab đơn độc là nhiễu, và nó còn chìa ra tên ba màn họ không có quyền mở.
  const cuaSale = mh.menuCua([VAI.SALE]);
  assert.equal(cuaSale[0].man.length, 1, 'sale chỉ vào được Bảng điều phối');
});

test('⑥c · header của MỌI trang thôi tự chế link điều hướng', () => {
  // Trước 01/09 header 25 trang mang 61 link do từng tác giả tự nghĩ ra — người dùng chỉ
  // tới được màn nào ngẫu nhiên được nhắc ở trang đang đứng. Nay menu lo dọc, tab lo ngang;
  // link tự chế trong header vừa trùng vừa trôi khỏi sổ đăng ký khi đổi đường.
  const sot = [];
  for (const ten of readdirSync(GOC_UI)) {
    const thu = path.join(GOC_UI, ten, 'trang');
    if (!existsSync(thu)) continue;
    for (const f of readdirSync(thu).filter((x) => x.endsWith('.html'))) {
      const s = readFileSync(path.join(thu, f), 'utf8');
      const m = s.match(/<header[^>]*>([\s\S]*?)<\/header>/);
      if (m && /<a\s+href="\//.test(m[1])) sot.push(`${ten}/${f}`);
    }
  }
  assert.deepEqual(sot, [],
    `header còn link tự chế: ${sot.join(', ')} — chuyển vào sổ đăng ký màn, đừng gắn tay`);
});
