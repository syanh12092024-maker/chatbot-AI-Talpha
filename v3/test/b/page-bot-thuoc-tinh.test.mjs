// BA CỘT MỚI SỬA ĐƯỢC CỦA MÀN «PAGE & BOT» (15/09/2026): thị trường · ngành hàng · lời khai
// «đã tắt Botcake».
//
// Ca quan trọng nhất của bộ này KHÔNG phải «lưu được». Lưu được là chuyện dễ. Thứ đáng đo là
// **lưu rồi có còn không** — vì trước lượt này `db/di-tru/nap.js` ghi đè trần `thi_truong` và
// `nganh_hang` mỗi lượt `npm run di-tru`, tức một nút sửa thị trường sẽ bị chính nút «Kéo dữ
// liệu về» ở màn bên cạnh xoá sạch, im lặng, và người dùng chỉ phát hiện khi đi tìm lại.
//
// `v3/test/b/page-bot.test.mjs` đã canh hợp đồng hai chiều giữa `COT_BI_DI_TRU_GHI_DE` và câu
// SQL thật. Bộ này thêm vế còn thiếu: đọc THẲNG nhánh `CASE` và đo nghĩa của nó.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const kp = await import('../../src/ui/page-bot/kho-page.js');
const ct = await import('../../src/ui/page-bot/cong-tac.js');
const { HANH_DONG, hopLeHanhDong } = await import('../../src/audit/hanh-dong.js');

const GOC_REPO = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');
const NAP_JS = path.join(GOC_REPO, 'db/di-tru/nap.js');

function dungKho() {
  const { taoTruyVan, kho } = dungCongGia({
    team: [
      { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
      { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    ],
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'Alpha KSA', thi_truong: '',
        nganh_hang: '', marketer: '', bot_ai_bat: false, botcake_tat: false,
        trong_diem: false, mat_dau: false },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'Beta UAE', thi_truong: 'UAE',
        nganh_hang: 'Đồ da', marketer: 'An', bot_ai_bat: false, botcake_tat: true,
        trong_diem: false, mat_dau: false },
      { id: 'p9', team_id: 't2', page_id: '999', ten: 'Của team khác', thi_truong: 'Qatar',
        nganh_hang: '', marketer: '', bot_ai_bat: false, botcake_tat: false,
        trong_diem: false, mat_dau: false },
    ],
    san_pham_goc: [
      { id: 'g1', team_id: 't1', ma_goc: 'fitgum-acai-berry', ten: 'Fitgum Acai Berry', so_hieu: '125' },
    ],
    san_pham: [
      { id: 's1', team_id: 't1', page_id: 'p1', ma: '111:a', ten: 'SP A', ma_goc: null },
      { id: 's2', team_id: 't1', page_id: 'p1', ma: '111:b', ten: 'SP B', ma_goc: null },
      { id: 's9', team_id: 't2', page_id: 'p9', ma: '999:z', ten: 'SP Z', ma_goc: null },
    ],
  });
  const nhatKy = [];
  kp.datTaoTruyVan(taoTruyVan);
  ct.datPheuNhatKy((bc, ban) => { nhatKy.push(ban); return { id: 'nk' + nhatKy.length }; });
  return { kho, nhatKy };
}

const bcQt = (teamId = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId, vai: [VAI.QUAN_TRI],
});
const bcQuanLy = () => taoBoiCanh({
  nguoiDungId: 'u2', tenDangNhap: 'ql@talpha.vn', teamId: 't1', vai: [VAI.QUAN_LY],
});
const dong = (kho, id) => kho.docThang('page').find((p) => String(p.id) === id);

/* ═══════════ ① CÔNG NGƯỜI NHẬP KHÔNG ĐƯỢC BỐC HƠI ═══════════ */

test('DI TRÚ KHÔNG XOÁ · thi_truong và nganh_hang phải có nhánh CASE giữ chỗ đã có', () => {
  // Đọc file thật, không gõ lại (cùng luật với ca COT_BI_DI_TRU_GHI_DE bên cạnh).
  const src = readFileSync(NAP_JS, 'utf8');
  const khoi = src.match(/ON CONFLICT \(page_id\) DO UPDATE SET([\s\S]*?)`,/);
  assert.ok(khoi, 'không tìm thấy câu ON CONFLICT của napPage');

  for (const cot of ['thi_truong', 'nganh_hang', 'marketer']) {
    assert.match(khoi[1], new RegExp(`CASE WHEN page\\.${cot} <> ''`),
      `\`${cot}\` phải giữ nhánh CASE — màn Page & Bot cho sửa cột này, và một lượt `
      + '`npm run di-tru` không được phép xoá công người nhập');
    assert.match(khoi[1], new RegExp(`ELSE EXCLUDED\\.${cot}`),
      `\`${cot}\`: nguồn vẫn phải ĐIỀN VÀO CHỖ TRỐNG — nếu không thì 374 page chưa có thị `
      + 'trường sẽ mãi trống dù nguồn có sẵn số liệu');
  }
  // Vế còn lại của cùng một sự thật: cột nào màn cho sửa thì phải khai BỀN.
  for (const cot of ['thi_truong', 'nganh_hang', 'botcake_tat']) {
    assert.equal(kp.COT_SUA_DUOC[cot]?.benVung, true, `COT_SUA_DUOC thiếu "${cot}" hoặc khai chưa bền`);
    assert.ok(!kp.COT_BI_DI_TRU_GHI_DE.includes(cot),
      `"${cot}" vừa cho sửa vừa nằm trong danh sách bị ghi đè — một trong hai chỗ đang nói dối`);
  }
});

/* ═══════════ ② LƯU ĐƯỢC, VÀ ĐỂ LẠI DẤU ═══════════ */

test('THỊ TRƯỜNG · lưu xuống cột, ghi nhật ký có TRƯỚC và SAU', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await ct.datThiTruong(bcQt(), 'p1', '  Saudi  ');
  assert.equal(kq.doi, true);
  assert.equal(kq.thi_truong, 'Saudi', 'phải cắt khoảng trắng — "Saudi " không tra ra kết nối POS nào');
  assert.equal(dong(kho, 'p1').thi_truong, 'Saudi');

  assert.equal(nhatKy.length, 1);
  assert.equal(nhatKy[0].hanhDong, HANH_DONG.DAT_THI_TRUONG);
  assert.equal(nhatKy[0].truoc.thi_truong, '');
  assert.equal(nhatKy[0].sau.thi_truong, 'Saudi');
});

test('NGÀNH HÀNG · cùng khuôn, và xoá cũng là một lượt có dấu', async () => {
  const { kho, nhatKy } = dungKho();
  await ct.datNganhHang(bcQt(), 'p2', '');
  assert.equal(dong(kho, 'p2').nganh_hang, '');
  assert.match(nhatKy[0].ghiChu, /xoá ngành hàng/);
  assert.equal(nhatKy[0].truoc.nganh_hang, 'Đồ da');
});

test('KHÔNG ĐỔI thì KHÔNG ghi nhật ký — nhật ký đầy tiếng ồn là nhật ký không ai đọc', async () => {
  const { nhatKy } = dungKho();
  const kq = await ct.datThiTruong(bcQt(), 'p2', 'UAE');
  assert.equal(kq.doi, false);
  assert.equal(nhatKy.length, 0);
});

test('QUÁ DÀI · chặn ở cửa, không để một đoạn văn rơi vào cột nhãn', async () => {
  dungKho();
  await assert.rejects(() => ct.datThiTruong(bcQt(), 'p1', 'x'.repeat(121)), /dài quá/);
  await assert.rejects(() => ct.datNganhHang(bcQt(), 'p1', 'x'.repeat(121)), /dài quá/);
});

/* ═══════════ ③ BOTCAKE LÀ LỜI KHAI, KHÔNG PHẢI CÔNG TẮC ═══════════ */

test('BOTCAKE · cột đổi, và cả kết quả lẫn nhật ký đều nói rõ đây KHÔNG phải lượt tắt thật', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await ct.datBotcakeTat(bcQt(), 'p1', true);
  assert.equal(dong(kho, 'p1').botcake_tat, true);
  assert.equal(kq.laLoiKhai, true,
    'màn phải nhận được cờ này để hiện đúng nghĩa — một ô tick trông y hệt một công tắc');
  assert.match(nhatKy[0].ghiChu, /LỜI KHAI/,
    'người đọc nhật ký sáu tháng sau phải hiểu dòng này KHÔNG chứng minh Botcake đã tắt');
});

test('BOTCAKE · không gọi ra ngoài lượt nào — v3 không có đường nào với tới Botcake', async () => {
  dungKho();
  const fetchCu = globalThis.fetch;
  let soLuot = 0;
  globalThis.fetch = async (...a) => { soLuot += 1; return fetchCu(...a); };
  try {
    await ct.datBotcakeTat(bcQt(), 'p1', true);
  } finally { globalThis.fetch = fetchCu; }
  // Bẫy ở tầng THẤP NHẤT với tới được, không tin danh sách import (án lệ L2-M1).
  assert.equal(soLuot, 0, 'có lượt HTTP đi ra — cờ này là lời khai, không được giả vờ tắt hộ');
});

/* ═══════════ ④ TEAM VÀ VAI ═══════════ */

test('PAGE TEAM KHÁC · 404 cho cả ba cửa, không phải 403', async () => {
  dungKho();
  for (const [ten, chay] of [
    ['thi-truong', () => ct.datThiTruong(bcQt(), 'p9', 'X')],
    ['nganh-hang', () => ct.datNganhHang(bcQt(), 'p9', 'X')],
    ['botcake', () => ct.datBotcakeTat(bcQt(), 'p9', true)],
  ]) {
    await assert.rejects(chay, (e) => e.ma === 'khong_thay' && e.status === 404,
      `${ten}: 403 là xác nhận với người dò rằng id đó CÓ THẬT ở team khác`);
  }
});

test('VAI · quan-ly xem được nhưng không sửa được ba cột này', async () => {
  const { kho } = dungKho();
  for (const chay of [
    () => ct.datThiTruong(bcQuanLy(), 'p1', 'X'),
    () => ct.datNganhHang(bcQuanLy(), 'p1', 'X'),
    () => ct.datBotcakeTat(bcQuanLy(), 'p1', true),
  ]) await assert.rejects(chay, /vai|quyền/i);
  assert.equal(dong(kho, 'p1').thi_truong, '', 'từ chối mà vẫn ghi được là chặn giả');
});

/* ═══════════ ⑤ BA MÃ MỚI PHẢI QUA ĐƯỢC DANH MỤC DENY-BY-DEFAULT ═══════════ */

test('BA MÃ đã khai trong danh mục — nếu chưa, mọi dòng nhật ký của ba cửa bị nuốt', () => {
  for (const ma of [HANH_DONG.DAT_THI_TRUONG, HANH_DONG.DAT_NGANH_HANG, HANH_DONG.BAT_TAT_BOTCAKE]) {
    assert.ok(hopLeHanhDong(ma), `mã ${ma} chưa khai — đúng lỗ đã cắn ngày 25/08`);
  }
  // Ba mã trong `cong-tac.js` phải TRÙNG danh mục, không phải chuỗi gõ lại gần giống.
  assert.equal(ct.HANH_DONG_THI_TRUONG, HANH_DONG.DAT_THI_TRUONG);
  assert.equal(ct.HANH_DONG_NGANH_HANG, HANH_DONG.DAT_NGANH_HANG);
  assert.equal(ct.HANH_DONG_BOTCAKE, HANH_DONG.BAT_TAT_BOTCAKE);
});

/* ═══════════ ⑥ MARKETER: CHỈ ĐỌC TRÊN MÀN (người quyết chốt 15/09) ═══════════ */

test('MARKETER · màn KHÔNG còn ô nhập, nhưng cột và bản tin readiness vẫn sống', () => {
  const trang = readFileSync(
    path.join(GOC_REPO, 'v3/src/ui/page-bot/trang/page-bot.html'), 'utf8',
  );
  // Quyết định của người quyết, khoá bằng máy: bỏ Ô NHẬP, giữ CỘT và giữ bản tin.
  assert.ok(!/data-mkt=/.test(trang), 'ô nhập marketer quay lại — người quyết chốt bỏ nó khỏi màn');
  assert.ok(!/addEventListener\('blur', \(\) => luuMarketer/.test(trang), 'tay ghi marketer còn nối');
  assert.match(trang, /p\.marketer/, 'vẫn phải HIỆN marketer — bỏ ô nhập không phải bỏ thông tin');

  // Nửa còn lại: câu cảnh báo cũ bảo người ta «Gán ngay trong cột Marketer» — một lời chỉ
  // đường tới cái nút vừa bị bỏ. Chỉ đường tới hư không còn tệ hơn không chỉ đường.
  assert.ok(!/Gán ngay trong cột Marketer/.test(trang),
    'cảnh báo còn trỏ vào ô nhập đã bỏ');
  assert.match(trang, /pages\.json/, 'cảnh báo phải nói giá trị nay tới từ đâu');
});

test('MARKETER · cột vẫn nằm trong COT_SUA_DUOC vì cửa API còn sống', () => {
  // Không phải thừa: `POST /api/page-bot/:id/marketer` vẫn còn (đường lập trình), nên di trú
  // vẫn KHÔNG được phép xoá cột. Bỏ ô nhập mà bỏ luôn lớp bảo vệ là mở lại đúng cái lỗ cũ.
  assert.equal(kp.COT_SUA_DUOC.marketer?.benVung, true);
  assert.ok(!kp.COT_BI_DI_TRU_GHI_DE.includes('marketer'));
});

/* ═══════════ ⑦ PAGE KHAI NÓ BÁN SẢN PHẨM NÀO (015) ═══════════ */

test('SẢN PHẨM GỐC · ghi lên `page`, KHÔNG lên `san_pham`', async () => {
  const { kho, nhatKy } = dungKho();
  const kq = await ct.ganSanPhamGoc(bcQt(), 'p1', 'fitgum-acai-berry');
  assert.equal(kq.doi, true);
  assert.equal(dong(kho, 'p1').san_pham_goc_ma, 'fitgum-acai-berry');

  // Bản đầu (014/CR6) ghi lên `san_pham` và ĐÓ LÀ SAI: `san_pham.page_id` NULL sạch vì mọi
  // shop đều nhiều page, nên ghi vào đó là ghi vào hư không. Ca này khoá chiều đúng lại.
  assert.ok(kho.docThang('san_pham').every((r) => !r.ma_goc),
    'KHÔNG được ghi `ma_goc` lên san_pham — một biến thể POS được nhiều page cùng bán');

  assert.equal(nhatKy[0].hanhDong, HANH_DONG.GAN_SAN_PHAM_GOC);
  assert.equal(nhatKy[0].truoc.san_pham_goc_ma, null);
  assert.match(nhatKy[0].ghiChu, /kịch bản tầng sản phẩm/,
    'dòng nhật ký phải nói HẬU QUẢ — đổi cột này là đổi kịch bản page ấy đọc');
});

test('SẢN PHẨM GỐC · page KHÔNG cần biến thể POS nào — đó là cả điểm của 015', async () => {
  // `p2` không có dòng `san_pham` nào. Bản 014 trả 409 ở đây; bản 015 phải gán được, vì
  // lời khai là của PAGE, không phụ thuộc `san_pham.page_id`.
  const { kho } = dungKho();
  const kq = await ct.ganSanPhamGoc(bcQt(), 'p2', 'fitgum-acai-berry');
  assert.equal(kq.doi, true);
  assert.equal(dong(kho, 'p2').san_pham_goc_ma, 'fitgum-acai-berry');
});

test('SẢN PHẨM GỐC · mã lạ ⇒ 404 kèm chỉ đường, không ghi gì', async () => {
  const { kho } = dungKho();
  await assert.rejects(
    () => ct.ganSanPhamGoc(bcQt(), 'p1', 'khong-ton-tai'),
    (e) => e.ma === 'khong_co_san_pham_goc' && e.status === 404
      && /goi-y-gop-san-pham/.test(e.message),
  );
  assert.equal(dong(kho, 'p1').san_pham_goc_ma ?? null, null);
});

test('SẢN PHẨM GỐC · bỏ khai được, và nhật ký nói mất kế thừa', async () => {
  const { kho, nhatKy } = dungKho();
  await ct.ganSanPhamGoc(bcQt(), 'p1', 'fitgum-acai-berry');
  const kq = await ct.ganSanPhamGoc(bcQt(), 'p1', '');
  assert.equal(kq.maGoc, null);
  assert.equal(dong(kho, 'p1').san_pham_goc_ma, null);
  assert.match(nhatKy[1].ghiChu, /mất kế thừa/);
});

test('SẢN PHẨM GỐC · khai lại đúng cái đang có ⇒ KHÔNG ghi nhật ký', async () => {
  const { nhatKy } = dungKho();
  await ct.ganSanPhamGoc(bcQt(), 'p1', 'fitgum-acai-berry');
  const kq = await ct.ganSanPhamGoc(bcQt(), 'p1', 'fitgum-acai-berry');
  assert.equal(kq.doi, false);
  assert.equal(nhatKy.length, 1);
});

test('SẢN PHẨM GỐC · page team khác ⇒ 404 · vai quan-ly ⇒ chặn', async () => {
  const { kho } = dungKho();
  await assert.rejects(() => ct.ganSanPhamGoc(bcQt(), 'p9', 'fitgum-acai-berry'),
    (e) => e.ma === 'khong_thay' && e.status === 404);
  await assert.rejects(() => ct.ganSanPhamGoc(bcQuanLy(), 'p1', 'fitgum-acai-berry'), /vai|quyền/i);
  assert.equal(dong(kho, 'p1').san_pham_goc_ma ?? null, null);
});
