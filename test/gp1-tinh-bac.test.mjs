// GP1 · TẦNG A THUẦN — `tinhBac` (bậc giá từ COD đơn POS một món) + câu đọc BigQuery `sqlGiaDon` + quy bậc → `offers` của cửa lưu giá.
// Không CSDL, không mạng: dòng đầu vào dựng đúng khuôn câu đọc trả (`team_code · shop_id · variation_id · sku · so_luong · tien_te · cod ·
// ngay · luc · so_don · gia_mon`, một dòng = các đơn CÙNG ngày · cùng mức COD). Đáp án lấy từ ĐỀ BÀI (phiếu ④1 + số đo review (a) G1),
// không lấy từ code bị đo.
// Nhánh KHÔNG chạm ở tệp này: ghép món của team / tiền tệ thị trường / ghi (ở `test/gp1-xem-ap.test.mjs`), cửa + màn (ở `v3/test/b/`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { tinhBac, sqlGiaDon, SQL_GIA_DON, offersTuBac, LY_DO, CHU_LY_DO, taoNguonGiaDon } from '../src/products/gia-tu-don-pos.js';

// Một dòng câu đọc: `n` đơn cùng ngày `ngay`, cùng mức `cod`.
const dong = (n, cod, ngay, o = {}) => ({
  team_code: 'tieu-alpha', shop_id: '111', variation_id: 'va', sku: '264', so_luong: 1, tien_te: 'SAR',
  cod, ngay, luc: `${ngay} 10:00:00+00`, so_don: n, gia_mon: 0, ...o,
});
// Ngày thứ i kể từ mốc (lịch UTC, chuỗi YYYY-MM-DD) — không neo đồng hồ máy.
const ngayThu = (moc, i) => { const d = new Date(`${moc}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); };
const motNhom = (ds, o) => { const kq = tinhBac(ds, o); assert.equal(kq.length, 1, 'đúng một nhóm (team, shop, biến thể)'); return kq[0]; };

test('A1 · (a) 10 đơn 99 SAR + 1 đơn 89 SAR (mới nhất) ⇒ bậc 1 = 9900, tỷ lệ 9/10 đơn gần nhất, giá đơn gần nhất 89', () => {
  const ds = [...Array.from({ length: 10 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), dong(1, 8900, '2026-09-20')];
  const g = motNhom(ds);
  assert.equal(g.lyDo, null);
  assert.deepEqual(g.bac.map((b) => [b.soLuong, b.gia, b.soDonMuc, b.soDonGanDay, b.tong]), [[1, 9900, 9, 10, 11]]);
  assert.equal(g.bac[0].tiLe, 0.9);
  assert.deepEqual(g.bac[0].ganNhat, { gia: 8900, ngay: '2026-09-20' });
  assert.deepEqual([g.tu, g.den], ['2026-09-01', '2026-09-20']);
  assert.equal(g.posMa, '111:va');
  assert.equal(g.tienTe, 'SAR');
});

test('A2 · (a′) 172 đơn cũ 29 EUR + 12 đơn MỚI NHẤT 37 EUR (Europe SKU 211 đo thật) ⇒ doi_gia_gan_day, 0 đề xuất', () => {
  const cu = Array.from({ length: 22 }, (_, i) => dong(i < 18 ? 8 : 7, 2900, ngayThu('2026-08-10', i), { tien_te: 'EUR', sku: '211' }));
  assert.equal(cu.reduce((n, x) => n + x.so_don, 0), 172);
  const moi = Array.from({ length: 12 }, (_, i) => dong(1, 3700, ngayThu('2026-09-07', i * 2), { tien_te: 'EUR', sku: '211' }));
  const g = motNhom([...cu, ...moi]);
  assert.equal(g.lyDo, 'doi_gia_gan_day');
  assert.equal(g.bac.length, 0, 'không bậc nào được đề xuất');
  const b = g.boBac.find((x) => x.soLuong === 1);
  assert.equal(b.lyDo, 'doi_gia_gan_day');
  assert.deepEqual([b.giaGanDay, b.giaCuaSo], [3700, 2900], 'nói cả hai mức để người thấy');
  assert.match(g.chiTiet, /bậc 1: 10 đơn gần nhất 37 EUR · cả cửa sổ 29 EUR \(đơn mới nhất 2026-09-29\)/, 'lời giải thích ở đơn vị LỚN + tệ');
});

test('A3 · (a″) đơn POS có giá món > 0 (POS sẽ thu hai lần) ⇒ pos_co_gia_mon, 0 đề xuất', () => {
  const ds = [...Array.from({ length: 10 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), dong(1, 21800, '2026-09-12', { gia_mon: 10900 })];
  const g = motNhom(ds);
  assert.equal(g.lyDo, 'pos_co_gia_mon');
  assert.equal(g.bac.length, 0);
});

test('A4 · (b) 2 đơn ⇒ it_don; biên: 3 đơn cùng mức ⇒ đạt (đúng ngưỡng toiThieu)', () => {
  const hai = motNhom([dong(1, 9900, '2026-09-01'), dong(1, 9900, '2026-09-02')]);
  assert.equal(hai.lyDo, 'it_don');
  assert.equal(hai.bac.length, 0);
  const ba = motNhom([dong(1, 9900, '2026-09-01'), dong(1, 9900, '2026-09-02'), dong(1, 9900, '2026-09-03')]);
  assert.equal(ba.lyDo, null);
  assert.deepEqual(ba.bac.map((b) => b.gia), [9900]);
});

test('A5 · (c) 5/5/4 đơn ba mức xen kẽ ⇒ phan_tan; biên 8/10 = 0,8 đạt · 7/10 phan_tan', () => {
  const muc = [9900, 10900, 11900];
  const ds = Array.from({ length: 14 }, (_, i) => dong(1, muc[i % 3], ngayThu('2026-09-01', i)));
  assert.deepEqual(muc.map((m) => ds.filter((x) => x.cod === m).length), [5, 5, 4]);
  const g = motNhom(ds);
  assert.equal(g.lyDo, 'phan_tan');
  assert.equal(g.bac.length, 0);
  const tron = (soKhac) => Array.from({ length: 10 }, (_, i) => dong(1, i < soKhac ? 8900 : 9900, ngayThu('2026-09-01', i * 2 + (i < soKhac ? 1 : 0))));
  assert.equal(motNhom(tron(2)).lyDo, null, '8/10 = 0,8 — đúng ngưỡng ⇒ đạt');
  assert.equal(motNhom(tron(3)).lyDo, 'phan_tan', '7/10 < 0,8 ⇒ phan_tan');
});

test('A6 · (d) mua 2 rẻ hơn mua 1 ⇒ khong_tang; mua 2 BẰNG mua 1 không phải «rẻ hơn» (phiếu: giá mua nhiều < giá mua ít)', () => {
  const ds = [...Array.from({ length: 5 }, (_, i) => dong(1, 10900, ngayThu('2026-09-01', i))),
    ...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { so_luong: 2 }))];
  const g = motNhom(ds);
  assert.equal(g.lyDo, 'khong_tang');
  const bang = [...Array.from({ length: 5 }, (_, i) => dong(1, 10900, ngayThu('2026-09-01', i))),
    ...Array.from({ length: 5 }, (_, i) => dong(1, 10900, ngayThu('2026-09-01', i), { so_luong: 2 }))];
  assert.equal(motNhom(bang).lyDo, null);
  const tang = [...Array.from({ length: 5 }, (_, i) => dong(1, 10900, ngayThu('2026-09-01', i))),
    ...Array.from({ length: 4 }, (_, i) => dong(1, 15900, ngayThu('2026-09-01', i), { so_luong: 2 }))];
  assert.deepEqual(motNhom(tang).bac.map((b) => [b.soLuong, b.gia]), [[1, 10900], [2, 15900]]);
});

test('A7 · (e) SKU «sp test» (so bằng chuanSku: hoa/thường, khoảng trắng) ⇒ sku_thu', () => {
  for (const sku of ['sp test', ' SP   Test ', 'TEST']) {
    const g = motNhom(Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { sku })));
    assert.equal(g.lyDo, 'sku_thu', `«${sku}»`);
  }
  assert.equal(motNhom(Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { sku: 'test 2' }))).lyDo, null,
    'SKU chỉ CHỨA chữ test không phải SKU thử');
});

test('A8 · (f) TWD 990 ⇒ bậc 990 (TT1: POS không xu) · offers đơn vị LỚN: TWD 990 · SAR 99 · EUR 37 / 49,99', () => {
  const g = motNhom(Array.from({ length: 5 }, (_, i) => dong(1, 990, ngayThu('2026-09-01', i), { tien_te: 'TWD', shop_id: '219' })));
  assert.deepEqual(g.bac.map((b) => b.gia), [990]);
  assert.deepEqual(offersTuBac(g.bac, 'TWD'), [{ so_luong: 1, price: 990, tien_te: 'TWD' }]);
  assert.deepEqual(offersTuBac([{ soLuong: 1, gia: 9900 }, { soLuong: 2, gia: 15900 }], 'SAR'),
    [{ so_luong: 1, price: 99, tien_te: 'SAR' }, { so_luong: 2, price: 159, tien_te: 'SAR' }]);
  assert.deepEqual(offersTuBac([{ soLuong: 1, gia: 3700 }, { soLuong: 2, gia: 4999 }], 'EUR').map((o) => o.price), [37, 49.99]);
  assert.throws(() => offersTuBac([{ soLuong: 1, gia: 100 }], 'GBP'), /GBP/, 'tệ lạ ⇒ ném, không đoán hệ số');
});

test('A9 · một bậc ít đơn KHÔNG kéo cả món: bậc 1 đủ + bậc 3 một đơn ⇒ đề xuất bậc 1, bậc 3 ghi it_don', () => {
  const ds = [...Array.from({ length: 10 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), dong(1, 19900, '2026-09-05', { so_luong: 3 })];
  const g = motNhom(ds);
  assert.equal(g.lyDo, null);
  assert.deepEqual(g.bac.map((b) => b.soLuong), [1]);
  assert.deepEqual(g.boBac.map((b) => [b.soLuong, b.lyDo]), [[3, 'it_don']]);
});

test('A10 · bậc đủ đơn mà phân tán ⇒ bỏ CẢ món (/code-review #2); giá đổi gần đây ở MỘT bậc ⇒ bỏ CẢ món', () => {
  const sach = Array.from({ length: 10 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i)));
  const tan = Array.from({ length: 6 }, (_, i) => dong(1, i % 2 ? 15900 : 16900, ngayThu('2026-09-01', i), { so_luong: 2 }));
  const g = motNhom([...sach, ...tan]);
  assert.equal(g.lyDo, 'phan_tan');
  assert.equal(g.bac.length, 0, 'không đề xuất nửa bảng');
  assert.match(g.chiTiet, /bậc 2: mức nhiều nhất 3\/6 đơn gần nhất/);
  const doi = [...Array.from({ length: 20 }, (_, i) => dong(1, 15900, ngayThu('2026-08-01', i), { so_luong: 2 })),
    ...Array.from({ length: 10 }, (_, i) => dong(1, 17900, ngayThu('2026-09-20', i), { so_luong: 2 }))];
  const g2 = motNhom([...sach, ...doi]);
  assert.equal(g2.lyDo, 'doi_gia_gan_day', 'bậc 2 đổi giá ⇒ bảng của món đang chuyển chế độ — không đề xuất nửa bảng');
  assert.equal(g2.bac.length, 0);
});

test('A16 · (/code-review #2) mua 1 đang chuyển 29→37 EUR giữa chừng (10 đơn gần nhất 6 mới / 4 cũ) + mua 2 còn giá cũ ổn định ⇒ KHÔNG đề xuất', () => {
  const e = { tien_te: 'EUR' };
  const cu1 = Array.from({ length: 30 }, (_, i) => dong(1, 2900, ngayThu('2026-08-01', i), e));
  const xen = Array.from({ length: 10 }, (_, i) => dong(1, i < 4 ? 2900 : 3700, ngayThu('2026-09-10', i), e));   // 4 cũ rồi 6 mới
  const mua2 = Array.from({ length: 8 }, (_, i) => dong(1, 5000, ngayThu('2026-08-20', i), { ...e, so_luong: 2 }));
  const g = motNhom([...cu1, ...xen, ...mua2]);
  assert.equal(g.lyDo, 'phan_tan');
  assert.equal(g.bac.length, 0, 'bậc 2 = 50 EUR (giá cũ) KHÔNG được ghi một mình');
});

test('A17 · (/code-review #7) hai dòng cùng ngày cùng giờ, khác mức: thứ tự BigQuery trả không đổi kết quả (thứ tự toàn phần)', () => {
  const cu = Array.from({ length: 20 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i)));
  const a = dong(9, 8900, '2026-09-25'); const b = dong(9, 9900, '2026-09-25');   // cùng `luc` 10:00 — đồng hạng
  assert.deepEqual(motNhom([...cu, a, b]), motNhom([...cu, b, a]));
  assert.deepEqual(motNhom([b, ...cu, a]), motNhom([a, ...cu.slice().reverse(), b]));
});

test('A11 · nhóm không ghép được team (team_code null) ⇒ khong_ghep_team · hai tệ trong một nhóm ⇒ lech_tien_te', () => {
  const g = motNhom(Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { team_code: null })));
  assert.equal(g.lyDo, 'khong_ghep_team');
  assert.equal(g.team, null);
  const hai = motNhom([...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), dong(1, 9900, '2026-09-10', { tien_te: 'AED' })]);
  assert.equal(hai.lyDo, 'lech_tien_te');
});

test('A12 · «gần nhất» theo NGÀY ĐƠN (rồi giờ), không theo thứ tự dòng đầu vào: xáo trộn ⇒ cùng kết quả', () => {
  const cu = Array.from({ length: 20 }, (_, i) => dong(1, 2900, ngayThu('2026-08-10', i), { tien_te: 'EUR' }));
  const moi = Array.from({ length: 10 }, (_, i) => dong(1, 3700, ngayThu('2026-09-07', i), { tien_te: 'EUR' }));
  const a = motNhom([...cu, ...moi]);
  const b = motNhom([...moi.slice().reverse(), ...cu.slice(5), ...cu.slice(0, 5)]);
  assert.equal(a.lyDo, 'doi_gia_gan_day');
  assert.deepEqual(b, a);
  // Cùng một ngày: dòng giờ muộn hơn là đơn mới hơn.
  const ngay = [dong(5, 9900, '2026-09-01'), dong(4, 9900, '2026-09-02', { luc: '2026-09-02 08:00:00+00' }),
    dong(1, 8900, '2026-09-02', { luc: '2026-09-02 23:00:00+00' })];
  assert.deepEqual(motNhom(ngay).bac[0].ganNhat, { gia: 8900, ngay: '2026-09-02' });
});

test('A13 · nhiều nhóm: tách theo (team, shop, biến thể); tham số ganDay/toiThieu/nguong có tác dụng', () => {
  const ds = [...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))),
    ...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { variation_id: 'vb' })),
    ...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { shop_id: '222' })),
    ...Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i), { team_code: 'pialpha-eu' }))];
  assert.equal(tinhBac(ds).length, 4);
  const it = Array.from({ length: 5 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i)));
  assert.equal(motNhom(it, { toiThieu: 6 }).lyDo, 'it_don');
  const tan = [...Array.from({ length: 4 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), dong(1, 8900, '2026-09-10')];
  assert.equal(motNhom(tan).lyDo, null, '4/5 = 0,8');
  assert.equal(motNhom(tan, { nguong: 0.9 }).lyDo, 'phan_tan');
  // 6 đơn cũ 9900 + 3 đơn mới 8900: ganDay 10 phủ cả 9 đơn ⇒ 6/9 < 0,8 ⇒ phan_tan; ganDay 3 ⇒ 3 đơn mới 100% 8900 ≠ mức cả cửa sổ 9900.
  const doi = [...Array.from({ length: 6 }, (_, i) => dong(1, 9900, ngayThu('2026-09-01', i))), ...Array.from({ length: 3 }, (_, i) => dong(1, 8900, ngayThu('2026-09-20', i)))];
  assert.equal(motNhom(doi).lyDo, 'phan_tan');
  assert.equal(motNhom(doi, { ganDay: 3 }).lyDo, 'doi_gia_gan_day');
});

test('A14 · câu đọc BigQuery: chỉ đọc, đơn MỘT dòng món, COD > 0, khác huỷ, số lượng 1–10, team theo NGÀY ĐƠN (+ team hiện tại khi thiếu lịch sử)', () => {
  const s = sqlGiaDon(60);
  assert.equal(SQL_GIA_DON, s, 'SQL_GIA_DON = câu 60 ngày mặc định');
  for (const m of ['INTERVAL 59 DAY', "ARRAY_LENGTH(JSON_QUERY_ARRAY(payload_json, '$.items')) = 1", 'cod > 0', "<> 'HUY'", 'BETWEEN 1 AND 10',
    'order_currency', 'HRM_Core.fact_employee_team_history', 'HRM_Core.dim_employee', "JSON_VALUE(marketer, '$.id')",
    "'$.items[0].variation_info.retail_price'", 'total_price']) {
    assert.ok(s.includes(m), `câu đọc thiếu «${m}»`);
  }
  assert.doesNotMatch(s, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP|ALTER|TRUNCATE)\b/i, 'câu đọc không chứa lệnh ghi');
  assert.ok(sqlGiaDon(30).includes('INTERVAL 29 DAY'));
  assert.ok(sqlGiaDon('45').includes('INTERVAL 44 DAY'), 'chuỗi số (từ ?soNgay=) được nhận');
  for (const vang of [undefined, '', null]) assert.equal(sqlGiaDon(vang), s, 'vắng ⇒ 60 ngày');
  for (const sai of [0, -1, 181, 1.5, '60; DROP TABLE x', 'abc', '6e1']) {
    assert.throws(() => sqlGiaDon(sai), (e) => e.ma === 'so_ngay_sai' && e.status === 400, `soNgay ${String(sai)} phải bị từ chối`);
  }
});

test('A18 · nguồn BigQuery có đệm: cùng câu trong hạn ⇒ MỘT lượt đọc (xem trước + áp cùng lát) · hết hạn ⇒ đọc lại · giữ tối đa `toiDa` câu', async () => {
  let gio = 1_000_000; const goi = [];
  const nguon = taoNguonGiaDon({ taoKhach: () => ({ truyVan: async (sql) => { goi.push(sql); return [{ sql }]; } }), hanMs: 1000, toiDa: 2, dongHo: () => gio });
  const a = await nguon.truyVan('A'); await nguon.truyVan('A');
  assert.deepEqual(goi, ['A'], 'trong hạn ⇒ không đọc lại');
  assert.equal(a.luc, 1_000_000, 'lát đọc mang giờ đọc (màn nói tuổi phép đo)');
  await Promise.all([nguon.truyVan('B'), nguon.truyVan('B')]);
  assert.deepEqual(goi, ['A', 'B'], 'hai lời gọi cùng lúc ⇒ một lượt đọc');
  await nguon.truyVan('C');            // đệm đầy (toiDa 2) ⇒ bỏ câu cũ nhất (A)
  await nguon.truyVan('A');
  assert.deepEqual(goi, ['A', 'B', 'C', 'A'], 'câu bị bỏ khỏi đệm ⇒ đọc lại');
  gio += 1000; await nguon.truyVan('C');
  assert.deepEqual(goi.at(-1), 'C', 'hết hạn ⇒ đọc lại');
});

test('A15 · danh mục lý do: đủ mười lý do của phiếu + chua_gop_goc, mỗi lý do có chữ tiếng Việt', () => {
  for (const k of ['it_don', 'phan_tan', 'doi_gia_gan_day', 'khong_tang', 'sku_thu', 'pos_co_gia_mon', 'lech_tien_te', 'khong_ghep_team',
    'da_co_gia', 'khong_co_mon', 'chua_gop_goc']) {
    assert.ok(LY_DO.includes(k), k);
    assert.ok(CHU_LY_DO[k] && CHU_LY_DO[k].length > 5, `chữ của ${k}`);
  }
});
