// UI-HT1 · cửa đọc hội thoại cho BÀN HỘI THOẠI (CR-28-09) — chỉ đọc Pancake, không lưu bản sao.
//
// Đo 28/09 trên máy chủ (nhật ký phiếu): 28.953 hội thoại, 0 có mã Pancake trong hàng đợi v3;
// Sổ AI của bot cũ phủ 26.774 (92,5%); Pancake BẮT BUỘC `customer_id` («Thiếu mã khách hàng»);
// một page trả «Không tìm thấy gói cước» — lỗi phải NÓI RA, không thành «hội thoại chưa có tin».
import test from 'node:test';
import assert from 'node:assert/strict';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import {
  datTaoTruyVan, docHoiThoai, datDocTinPancake, datTraMaKhachSoAi, datDongHoHoiThoai,
  xoaNhoHoiThoai, taoTraMaKhachSoAi, NHO_HOI_THOAI_MS,
} from '../../src/ui/dispatch/index.js';

const bcT1 = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });
const bcT2 = taoBoiCanh({ nguoiDungId: 'u2', tenDangNhap: 'binh', teamId: 't2', vai: [VAI.SALE] });

function dung({ tinV3 = [] } = {}) {
  const kho = new KhoGia({
    page: [
      { id: 'p1', team_id: 't1', page_id: '102938', ten: 'Tiểu Alpha Store' },
      { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Auus Store' },
    ],
    hoi_thoai: [
      // ht1: đã có tin đi qua hàng đợi v3 (có cust_id) · ht3: chưa qua v3, chỉ Sổ AI bot cũ biết
      // ht4: không nguồn nào biết mã khách · ht2: của team khác
      { id: 'ht1', team_id: 't1', page_id: 'p1', psid: '9911', trang_thai: 'CLOSING', chu_so_huu: 'AI' },
      { id: 'ht3', team_id: 't1', page_id: 'p1', psid: '7733', trang_thai: 'GREET', chu_so_huu: 'AI' },
      { id: 'ht4', team_id: 't1', page_id: 'p1', psid: '6644', trang_thai: 'GREET', chu_so_huu: 'AI' },
      { id: 'ht2', team_id: 't2', page_id: 'p2', psid: '8822', trang_thai: 'GREET', chu_so_huu: 'AI' },
    ],
    tin_cho_xu_ly: tinV3,
  });
  datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));
  xoaNhoHoiThoai();
  datDongHoHoiThoai(() => 1_000_000);
  const goi = [];
  datDocTinPancake(async (pageId, convId, custId) => {
    goi.push({ pageId, convId, custId });
    return { ok: true, messages: [
      { inserted_at: '2026-08-20T10:00:00', from: { id: 'k', name: 'Aisha' }, message: 'hi <b>there</b>' },
      { inserted_at: '2026-08-20T10:01:00', from: { id: pageId, name: 'Page' }, original_message: 'Hello!' },
    ] };
  });
  datTraMaKhachSoAi((convId) => (convId === '102938_7733' ? 'cust-so-ai' : null));
  return { kho, goi };
}

test('dựng mã `<page_id>_<psid>` và lấy mã khách từ HÀNG ĐỢI v3 trước', async () => {
  const { goi } = dung({ tinV3: [
    { id: 1, team_id: 't1', page_id: '102938', psid: '9911', cust_id: 'cust-cu', conv_id: '102938_9911' },
    { id: 3, team_id: 't1', page_id: '102938', psid: '9911', cust_id: '', conv_id: '' },
    // Dòng MỚI NHẤT (id lớn nhất) mang mã khách thắng — Pancake có thể cấp mã mới cho khách.
    { id: 2, team_id: 't1', page_id: '102938', psid: '9911', cust_id: 'cust-v3', conv_id: '102938_9911' },
  ] });
  const kq = await docHoiThoai(bcT1, 'ht1');
  assert.equal(kq.maHoiThoai, '102938_9911');
  assert.equal(kq.nguonMa, 'hang_doi_v3');
  assert.deepEqual(goi, [{ pageId: '102938', convId: '102938_9911', custId: 'cust-v3' }]);
  assert.equal(kq.lichSuLoi, null);
  assert.equal(kq.lichSu.length, 2);
  assert.equal(kq.lichSu[0].text, 'hi there', 'bỏ thẻ HTML của Pancake');
  assert.equal(kq.lichSu[0].laPage, false);
  assert.equal(kq.lichSu[1].laPage, true);
});

test('hội thoại CHƯA qua v3 vẫn đọc được nhờ Sổ AI bot cũ (92,5% hội thoại máy chủ ở cảnh này)', async () => {
  const { goi } = dung();
  const kq = await docHoiThoai(bcT1, 'ht3');
  assert.equal(kq.nguonMa, 'so_ai_bot_cu');
  assert.equal(goi[0].custId, 'cust-so-ai');
  assert.equal(kq.lichSu.length, 2);
});

test('không nguồn nào biết mã khách ⇒ NÓI VÌ SAO, và KHÔNG gọi Pancake (gọi thiếu mã là chắc lỗi)', async () => {
  const { goi } = dung();
  const kq = await docHoiThoai(bcT1, 'ht4');
  assert.equal(goi.length, 0);
  assert.equal(kq.nguonMa, null);
  assert.deepEqual(kq.lichSu, []);
  assert.match(kq.lichSuLoi, /mã khách/);
});

test('Pancake trả lỗi ⇒ `lichSuLoi` mang ĐÚNG câu của Pancake, `lichSu` rỗng — không giả làm «chưa có tin»', async () => {
  dung();
  datDocTinPancake(async () => ({ ok: false, loi: 'Không tìm thấy gói cước nào cho người dùng này' }));
  const kq = await docHoiThoai(bcT1, 'ht3');
  assert.deepEqual(kq.lichSu, []);
  assert.match(kq.lichSuLoi, /gói cước/);
});

test('đường đọc ném ⇒ vẫn trả lý do, không làm sập màn', async () => {
  dung();
  datDocTinPancake(async () => { throw new Error('fetch failed'); });
  const kq = await docHoiThoai(bcT1, 'ht3');
  assert.match(kq.lichSuLoi, /fetch failed/);
});

test('NHỚ 60 giây: hai lượt liền = MỘT lượt gọi Pancake; hết hạn thì gọi lại', async () => {
  const { goi } = dung();
  let bay = 1_000_000;
  datDongHoHoiThoai(() => bay);
  await docHoiThoai(bcT1, 'ht3');
  await docHoiThoai(bcT1, 'ht3');
  assert.equal(goi.length, 1);
  bay += NHO_HOI_THOAI_MS + 1;
  await docHoiThoai(bcT1, 'ht3');
  assert.equal(goi.length, 2);
});

test('nhiều người mở CÙNG LÚC ⇒ chung một lượt bay', async () => {
  const { goi } = dung();
  await Promise.all([docHoiThoai(bcT1, 'ht3'), docHoiThoai(bcT1, 'ht3'), docHoiThoai(bcT1, 'ht3')]);
  assert.equal(goi.length, 1);
});

test('hội thoại của TEAM KHÁC ⇒ null (router trả 404), và không gọi Pancake', async () => {
  const { goi } = dung();
  assert.equal(await docHoiThoai(bcT1, 'ht2'), null);
  assert.equal(await docHoiThoai(bcT2, 'ht1'), null);
  assert.equal(goi.length, 0);
});

test('chưa nối đường đọc Pancake ⇒ nói ra, không ném', async () => {
  dung();
  datDocTinPancake(null);
  const kq = await docHoiThoai(bcT1, 'ht3');
  assert.match(kq.lichSuLoi, /chưa nối/);
});

test('taoTraMaKhachSoAi · dựng chỉ mục conv→cust từ Sổ AI, dựng lại theo nhịp, bỏ dòng thiếu', () => {
  let lan = 0;
  let bay = 0;
  const tra = taoTraMaKhachSoAi(() => {
    lan++;
    return [
      { page: '1', conv: '1_a', cust: 'c-a' },
      { page: '1', conv: '1_b' },               // thiếu cust — bỏ
      { page: '1', conv: '1_a', cust: 'c-a2' }, // dòng sau thắng (mới hơn)
    ];
  }, { nhipMs: 1000, dongHo: () => bay });
  assert.equal(tra('1_a'), 'c-a2');
  assert.equal(tra('1_b'), null);
  assert.equal(lan, 1, 'một lần đọc cho nhiều lượt tra');
  bay = 2000;
  tra('1_a');
  assert.equal(lan, 2, 'quá nhịp thì đọc lại');
});
