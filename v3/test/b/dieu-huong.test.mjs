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
  assert.deepEqual(ten(VAI.SALE), ['Việc đang chờ']);
});

test('②b · MARKETER không thấy màn hạ tầng', () => {
  const t = ten(VAI.MARKETER);
  assert.ok(t.includes('Sản phẩm & kho'));
  assert.ok(!t.includes('Kết nối & token'), 'kho token là hạ tầng dùng chung ba team');
  assert.ok(!t.includes('Cấu hình team'));
});

test('②c · NGƯỜI DUYỆT KỊCH BẢN thấy bộ luật nhưng không thấy màn hạ tầng', () => {
  const t = ten(VAI.DUYET_KICH_BAN);
  assert.ok(t.includes('Quy tắc chung mọi page'), 'họ cần biết luật chung để duyệt kịch bản cho khớp');
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
  // ═══ ĐỔI 14/09/2026 ═══════════════════════════════════════════════════════════
  // Người tiếp quản nói «toàn bộ đều khó dùng» và chỉ ra bốn bệnh: quá nhiều màn · từ
  // ngữ khó hiểu · không biết thứ tự việc · một màn quá nhiều thứ. Được hỏi «hằng ngày
  // anh thật sự cần app này làm gì», họ kể NĂM việc. Tên mục nay là ĐÚNG NĂM CÂU ĐÓ:
  //   Bot nói gì với khách · Việc cần người làm · Bật bot cho page ·
  //   Dạy bot nói gì · Tốn bao nhiêu tiền   (+ «Màn khác» cho phần còn lại)
  // KHÔNG màn nào bị xoá, KHÔNG đường nào đổi — chỉ đổi TÊN và CHỖ NGỒI.
  // NHOM khai BẢY: sáu mục trên + hai mục dự trù (`bot-noi` chưa có màn, `nhan-cho-khach`
  // của giai đoạn 3) — cả hai tự ẩn.
  // ═══ ĐỔI LẦN NỮA · 14/09/2026 · lượt 3 — theo mục F1 của bản đặc tả vận hành ═════════
  //   Tổng quan · Vận hành · AI Bot · Phân tích · Quản trị   (+ dự trù «Nhắn cho khách»)
  // Năm việc người dùng kể ở lượt 2 KHỚP năm nhóm này, chỉ khác nhãn; lời của năm việc
  // giữ lại trong câu mô tả `mo`. `bot-noi` bỏ khỏi dự trù: «Hội thoại» nay thuộc Vận hành.
  assert.equal(mh.NHOM.length, 6, `đang có ${mh.NHOM.length} mục: ${mh.NHOM.map((n) => n.ten)}`);
  for (const n of mh.NHOM) {
    assert.ok(n.bieuTuong, `mục ${n.ten}: thiếu biểu tượng — mục Q, một bộ biểu tượng cho cả khung`);
  }
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
  assert.ok(hien <= 5, `vai thấy nhiều nhất phải ≤ 5 mục, đang thấy ${hien}`);
});

test('④b · mọi màn thuộc về một mục CÓ THẬT — không màn nào rơi ra ngoài menu', () => {
  const ma = new Set(mh.NHOM.map((n) => n.ma));
  const lac = mh.MAN.filter((m) => !ma.has(m.nhom));
  assert.deepEqual(lac.map((m) => `${m.ten} → nhóm "${m.nhom}"`), [],
    'màn khai nhóm không có trong NHOM sẽ biến mất khỏi menu mà không ai báo');
});

test('④c · vai QUẢN TRỊ thấy 5 mục nhưng vẫn đủ 25 màn — gom chứ không xoá', () => {
  const menu = mh.menuCua([VAI.QUAN_TRI]);
  assert.equal(menu.length, 5, 'quản trị phải thấy đúng năm mục CÓ MÀN (mục dự trù tự ẩn)');
  const soMan = menu.reduce((a, n) => a + n.man.length, 0);
  assert.equal(soMan, mh.MAN.length, 'gom nhóm KHÔNG được làm rơi màn nào');
  // ═══ ĐỔI GD6 · 25/09/2026 — mục đặt theo NHỊP MỞ MÁY ════════════════════════════════
  //   Hôm nay · Page & bot · Dạy bot · Số liệu · Cài đặt   (+ dự trù «Nhắn cho khách»)
  // Và bảy màn chưa dùng được mang cờ `thuNghiem`: KHÔNG vẽ ra thanh bên, nhưng vẫn nằm
  // trong gói menu (cờ `an`) để thanh trên cùng tra được vị trí khi mở bằng đường dẫn.
  assert.deepEqual(menu.map((n) => n.ma), ['hom-nay', 'page-bot', 'day-bot', 'so-lieu', 'cai-dat'],
    'thứ tự mục theo nhịp mở máy: việc hôm nay trước, cài đặt sau cùng');
  assert.equal(menu[0].man[0].ten, 'Việc của tôi', 'Hôm nay mở bằng việc của chính người xem');
  const hienRa = menu.reduce((a, n) => a + n.man.filter((m) => !m.an).length, 0);
  const an = menu.reduce((a, n) => a + n.man.filter((m) => m.an).length, 0);
  assert.equal(hienRa, 19, `thanh bên đang vẽ ${hienRa} màn`);
  assert.equal(an, 7, 'bảy màn chưa dùng được phải ẩn khỏi thanh bên nhưng còn trong gói');
  // Chín màn ít dùng dồn vào Cài đặt. Đếm ở đây để nếu có người kéo một màn ít dùng trở
  // lên mục hằng ngày thì bài này đỏ, chứ không trôi lặng lẽ.
  // Bảy màn ít dùng nay tản ra ba mục theo ĐÚNG việc của chúng, không dồn hết vào một
  // chỗ nữa. Đếm ở đây để ai kéo một màn ít dùng lên mục hằng ngày thì ca này đỏ.
  const itDung = mh.MAN.filter((m) => m.itDung);
  assert.equal(itDung.length, 9, `đang có ${itDung.length} màn ít dùng`);
});

test('④d · SALE chỉ thấy MỘT mục, và mục đó chỉ có một màn — §10', () => {
  const menu = mh.menuCua([VAI.SALE]);
  assert.equal(menu.length, 1, 'sale không được thấy mục nào khác');
  assert.equal(menu[0].ma, 'hom-nay');
  assert.deepEqual(menu[0].man.map((m) => m.ten), ['Việc đang chờ']);
});

test('④e · `mucCuaDuong` chỉ đúng mục đang đứng — menu phải bung được đúng chỗ', () => {
  assert.equal(mh.mucCuaDuong('/bo-luat'), 'day-bot');
  assert.equal(mh.mucCuaDuong('/dieu-phoi'), 'hom-nay');
  assert.equal(mh.mucCuaDuong('/nhat-ky'), 'cai-dat');
  assert.equal(mh.mucCuaDuong('/hieu-qua'), 'day-bot', 'màn ẩn vẫn phải tra ra mục của nó');
  assert.equal(mh.mucCuaDuong('/dieu-phoi/'), 'hom-nay', 'gạch chéo cuối không được làm lệch');
  assert.equal(mh.mucCuaDuong('/khong-co-that'), null, 'đường lạ trả null, không đoán bừa');
});

test('④f · trong MỖI mục, màn ít dùng đứng SAU hết — vạch «Ít dùng» mới có nghĩa', () => {
  // ═══ ĐỔI LUẬT 14/09/2026, không chỉ đổi số ════════════════════════════════════
  // Luật cũ: MỌI màn ít dùng phải nằm trong mục «Cài đặt» — vì nếu một màn ít dùng lạc
  // sang mục hằng ngày thì vạch «Ít dùng» mọc ra giữa mục đó và thành một ranh giới vô
  // nghĩa. Luật ấy đúng khi cả chín màn bị dồn vào một chỗ.
  //
  // Nay mục đặt theo VIỆC của người dùng, và màn ít dùng tản về đúng việc của chúng:
  // «Đoạn chữ gửi cho AI» thuộc việc «Dạy bot nói gì», không thuộc «Cài đặt». Vạch vẫn
  // có nghĩa — nó chia «hay dùng» với «ít dùng» BÊN TRONG cùng một việc.
  // Luật THẬT SỰ cần canh là: trong mỗi mục, không màn ít dùng nào đứng TRƯỚC một màn
  // hay dùng. Vỡ điều đó thì vạch cắt ngang giữa những màn hay dùng.
  const theoNhom = new Map();
  for (const m of mh.MAN) {
    if (!theoNhom.has(m.nhom)) theoNhom.set(m.nhom, []);
    theoNhom.get(m.nhom).push(m);
  }
  const sai = [];
  for (const [nhom, ds] of theoNhom) {
    const viTriItDungDau = ds.findIndex((m) => m.itDung);
    if (viTriItDungDau === -1) continue;
    const hayDungSauVach = ds.slice(viTriItDungDau).filter((m) => !m.itDung);
    for (const m of hayDungSauVach) sai.push(`${nhom}: «${m.ten}» hay dùng mà đứng SAU vạch`);
  }
  assert.deepEqual(sai, [], sai.join(' · '));

  // Neo SỐ, cố ý: đổi cờ `itDung` của một màn là ca này đỏ, buộc khai ra.
  // 14/09: 9 → 7. Ba màn rời khỏi «ít dùng» vì chúng là việc SỐ NĂM người dùng kể ra
  // («cấu hình cho page mới đủ để chat đúng»): Quy tắc chung mọi page · Câu trả lời sẵn ·
  // Kỹ năng theo sản phẩm. Một màn thêm vào: không có.
  // GD6 · 25/09: 7 → 9. Hai màn thêm vào «ít dùng» vì chúng chỉ mở khi cần tra cứu:
  // «Khách hàng» và «Khách vào từ đâu». Thứ tự theo đúng thứ tự trong sổ đăng ký.
  const itDung = mh.MAN.filter((m) => m.itDung).map((m) => m.ten);
  assert.deepEqual(itDung, [
    'Sản phẩm & kho', 'Đưa sản phẩm lên chạy',
    'Đoạn chữ gửi cho AI', 'Ảnh gửi khách', 'Gợi ý từ AI', 'So hai bản kịch bản',
    'Khách vào từ đâu', 'Rủi ro hoàn hàng', 'Khách hàng',
  ]);
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

/* ═══════════ ⑥ THANH TRÊN CÙNG — và header thôi tự chế link ═══════════ */
// ĐỔI 14/09/2026 (mục F2 của bản đặc tả): BỎ thanh tab. Nó liệt kê đúng các màn mà thanh bên
// đã hiện — hai nơi điều hướng cho cùng một việc. Thay bằng thanh trên cùng 52px: trái là
// đường dẫn vị trí «Nhóm / Màn», phải là menu tài khoản. Không nút riêng của từng màn.

test('⑥a · khung có thanh trên cùng với đường dẫn vị trí, và KHÔNG còn thanh tab trùng lặp', () => {
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  assert.match(js, /class="dh-top"|className = "dh-top"/, 'thiếu thanh trên cùng');
  assert.match(js, /aria-label="Vị trí"/, 'đường dẫn vị trí phải có nhãn cho trình đọc màn hình');
  assert.match(js, /aria-current="page"/, 'mục đang đứng phải đánh dấu aria-current');
  assert.doesNotMatch(js, /dungThanhTab|class="dh-tab"/,
    'thanh tab đã bỏ — nó lặp đúng thứ thanh bên hiện (mục F2)');
  // Tối đa HAI tầng (mục F1): nhóm → màn. Nhóm là nút bung, màn là liên kết.
  assert.match(js, /aria-expanded/, 'nút nhóm phải báo trạng thái bung cho trình đọc màn hình');
});

test('⑥b · đường dẫn vị trí tìm ra ĐÚNG nhóm cho mọi màn — kể cả màn chi tiết', async () => {
  // Chạy chính hàm tìm chỗ đứng của khung trên dữ liệu thật của sổ màn: mọi đường trong
  // menu phải ra đúng nhóm của nó, và một đường CON (màn chi tiết) phải ra nhóm của màn cha.
  const js = readFileSync(path.join(GOC_UI, 'chung/dieu-huong.js'), 'utf8');
  const than = js.match(/function timChoDung\(d, nay\) \{[\s\S]*?\n  \}\n/);
  assert.ok(than, 'không tìm thấy hàm timChoDung trong khung');
  const timChoDung = new Function(`${than[0]}; return timChoDung;`)();

  const d = { nhom: mh.menuCua([VAI.QUAN_TRI]) };
  for (const n of d.nhom) {
    for (const m of n.man) {
      const cho = timChoDung(d, m.duong);
      assert.ok(cho, `không tìm ra chỗ đứng cho ${m.duong}`);
      assert.equal(cho.nhom.ma, n.ma, `${m.duong} phải thuộc nhóm ${n.ma}`);
      assert.equal(cho.sau, null, `${m.duong} là màn chính, không phải màn con`);
    }
  }
  const chiTiet = timChoDung(d, '/dieu-phoi/viec/123');
  assert.ok(chiTiet, 'màn chi tiết phải tìm ra màn cha');
  assert.equal(chiTiet.nhom.ma, 'hom-nay');
  assert.equal(chiTiet.man.duong, '/dieu-phoi');
  assert.equal(timChoDung(d, '/khong-co-that'), null, 'đường lạ trả null, không đoán bừa');
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
