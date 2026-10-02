// LL17a · ĐƠN POS TỪ BIGQUERY (mức nhẹ của LL17) — tầng A: câu đọc đúng luật đo 02/10 · gộp theo team HRM của marketer · bộ đọc
// đệm · khách BigQuery TỪ CHỐI kết quả nhiều trang (không trả nửa số). Mạng Google giả; khoá RSA sinh trong ca.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { taoKhachBigQuery, LoiBigQuery } from '../src/hrm/bigquery.js';
import { SQL_DON_POS, SQL_DON_POS_MOC, SQL_DON_POS_PAGE, SO_NGAY_DOC, NHOM_TRANG_THAI, taoDocDonPos, tongHopTeam, tiLeGiao, luiNgay } from '../src/hrm/don-pos.js';

const NV = (emp_code, team_code, ho_ten, status = 'active') => ({ emp_code, team_code, ho_ten, status, comp_profile: 'MKT' });
const HRM = { nhanVien: [NV('NV1', 'PIALPHA_GCC', 'An'), NV('NV2', 'PIALPHA_GCC', 'Bình', 'nghi'), NV('NV3', 'PIALPHA_EU', 'Chi'),
  NV('NV4', 'PIALPHA_SALE_ONLINE', 'Sale lạc'), NV('NV5', 'PIALPHA_VD_OFFLINE', 'Vận đơn')] };
const D = (ngay, maNv, trangThai, soDon, cod = 0, tienTe = 'SAR', chia = 100) => ({ ngay, shop: 's1', tienTe, chia, maNv, trangThai, soDon, cod });
const DU = { homNay: '2026-10-02', dong: [
  D('2026-10-02', 'NV1', 'GIAO_THANH_CONG', 3, 30000),            // An · hôm nay · 300 SAR
  D('2026-09-30', 'NV1', 'DON_HOAN', 1, 9999),                   // hoàn — tiền KHÔNG vào COD đã giao
  D('2026-09-26', 'NV1', 'GIAO_THANH_CONG', 2, 500, 'TWD', 1),   // 7 ngày tính tới 26/09 ⇒ 26/09 thuộc 7 ngày
  D('2026-09-25', 'NV2', 'HUY', 4),                              // Bình (đã nghỉ) · ngoài 7 ngày, trong 30
  D('2026-09-20', 'NV2', 'UNKNOWN', 1),                          // mã lạ ⇒ «khác», không đoán
  D('2026-09-03', 'NV1', 'DANG_GIAO', 5),                        // đúng 30 ngày (03/09 → 02/10)
  D('2026-09-02', 'NV1', 'GIAO_THANH_CONG', 50, 100000),         // 31 ngày ⇒ ngoài cả hai khoảng
  D('2026-10-01', 'NV3', 'GIAO_THANH_CONG', 7, 7000, 'EUR'),     // team KHÁC (EU) ⇒ không vào team này
  D('2026-10-01', null, 'GIAO_THANH_CONG', 6),                   // chưa ghép marketer ⇒ chờ gán (cả công ty)
  D('2026-10-01', 'NV4', 'DON_THO', 2),                          // team HRM là sale ('*') ⇒ ngoài hệ
  D('2026-10-01', 'NV5', 'CHO_HANG', 3),                         // team không vào hệ ⇒ ngoài hệ
  D('2026-10-01', 'NV9', 'HUY', 1),                              // mã NV không có trong HRM ⇒ ngoài hệ
] };

test('P1 · câu đọc đúng luật đo 02/10: marketer JSON · tiền ở `cod` ÷ divisor (không total_price) · 60 ngày tới HÔM NAY · không động từ ghi', () => {
  assert.equal(SO_NGAY_DOC, 60);
  assert.match(SQL_DON_POS, /JSON_VALUE\(marketer, '\$\.id'\)/);
  assert.match(SQL_DON_POS, /SUM\(IFNULL\(o\.cod, 0\)\)/);
  assert.doesNotMatch(SQL_DON_POS, /total_price/, 'total_price = 0 trên mọi shop (đo 02/10)');
  assert.match(SQL_DON_POS, /ANY_VALUE\(currency_divisor\) AS chia FROM .*dim_shop_project GROUP BY shop_id/, 'một shop một dòng — không nhân đôi đơn');
  assert.match(SQL_DON_POS, /BETWEEN DATE_SUB\(CURRENT_DATE\(\), INTERVAL 59 DAY\) AND CURRENT_DATE\(\)/, '60 ngày, loại ngày tương lai');
  assert.match(SQL_DON_POS_MOC, /COUNTIF\(SAFE_CAST\(inserted_date AS DATE\) > CURRENT_DATE\(\)\) AS tuong_lai/);
  for (const s of [SQL_DON_POS, SQL_DON_POS_MOC, SQL_DON_POS_PAGE]) assert.doesNotMatch(s, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP)\b/i);
  assert.deepEqual(Object.keys(NHOM_TRANG_THAI).sort(), ['CHO_HANG', 'DANG_GIAO', 'DA_DAT_HANG', 'DA_XAC_NHAN', 'DON_HOAN', 'DON_THO', 'GIAO_THANH_CONG', 'HUY']);
});

test('P2 · gộp theo team HRM của marketer: 7 / 30 ngày · chờ gán · ngoài hệ · team khác bị loại · COD theo TỪNG tiền tệ · mã lạ vào «khác»', () => {
  const r = tongHopTeam(DU, HRM, { slug: 'tieu-alpha' });
  assert.equal(luiNgay('2026-10-02', 29), '2026-09-03');
  assert.deepEqual(r.team[7], { don: 6, thanhCong: 5, hoan: 1, huy: 0, dangXuLy: 0, khac: 0, codThanhCong: { SAR: 300, TWD: 500 } });
  assert.deepEqual(r.team[30], { don: 16, thanhCong: 5, hoan: 1, huy: 4, dangXuLy: 5, khac: 1, codThanhCong: { SAR: 300, TWD: 500 } });
  assert.deepEqual([r.choGan[30].don, r.ngoaiHe[30].don], [6, 6]);
  assert.deepEqual(r.marketer.map((m) => [m.maNv, m.ten, m.daNghi, m.k[7].don, m.k[30].don]), [['NV1', 'An', false, 6, 11], ['NV2', 'Bình', true, 0, 5]]);
  assert.equal(tiLeGiao(r.team[7]), 5 / 6);
  assert.equal(tiLeGiao({ thanhCong: 0, hoan: 0 }), null, 'chưa đơn nào kết thúc ⇒ null, không 0');
  const eu = tongHopTeam(DU, HRM, { slug: 'pialpha-eu' });
  assert.deepEqual([eu.team[30].don, eu.team[30].codThanhCong], [7, { EUR: 70 }]);
});

test('P3 · marketer chỉ thấy dòng CỦA MÌNH (team vẫn là tổng) · không mã NV ⇒ không dòng nào', () => {
  const an = tongHopTeam(DU, HRM, { slug: 'tieu-alpha', chiMaNv: 'NV1' });
  assert.deepEqual(an.marketer.map((m) => m.maNv), ['NV1']);
  assert.equal(an.team[30].don, 16);
  assert.deepEqual(tongHopTeam(DU, HRM, { slug: 'tieu-alpha', chiMaNv: null }).marketer, []);
});

test('P4 · bộ đọc: ba câu (số + mốc + theo page — LL17b) · đệm 1 giờ · «làm mới» · hai lời gọi cùng lúc = một lượt · lỗi không đệm · đổi kiểu số', async () => {
  let goi = 0; let hong = true; let gio = 0;
  const doc = taoDocDonPos({ dongHo: () => gio, taoKhach: () => ({ truyVan: async (sql) => {
    goi++; await new Promise((r) => setTimeout(r, 3));
    if (hong) throw new Error('mạng');
    if (sql === SQL_DON_POS_PAGE) return [{ page_id: '101', status_category: 'HUY', so_don: '2' }, { page_id: null, status_category: 'HUY', so_don: '1' }];
    return sql === SQL_DON_POS_MOC ? [{ hom_nay: '2026-10-02', dong_bo: '2026-10-02T07:30:04', tuong_lai: '1' }]
      : [{ ngay: '2026-10-02', shop_id: 's1', currency: 'SAR', chia: '100', emp_code: 'NV1', status_category: 'GIAO_THANH_CONG', luong: 'messenger', so_don: '3', cod: 30000 }];
  } }) });
  await assert.rejects(doc(), /mạng/);
  hong = false;
  const [a, b] = await Promise.all([doc(), doc()]);
  assert.equal(a, b);
  assert.equal(goi, 6, 'ba câu × (lượt lỗi + một lượt cho hai lời gọi cùng lúc)');
  assert.deepEqual([a.homNay, a.dongBo, a.tuongLai], ['2026-10-02', '2026-10-02T07:30:04', 1]);
  assert.deepEqual(a.dong, [{ ngay: '2026-10-02', shop: 's1', tienTe: 'SAR', chia: 100, maNv: 'NV1', trangThai: 'GIAO_THANH_CONG', luong: 'messenger', soDon: 3, cod: 30000 }]);
  assert.deepEqual(a.theoPage, [{ page: '101', trangThai: 'HUY', soDon: 2 }, { page: null, trangThai: 'HUY', soDon: 1 }]);
  gio = 3599 * 1000; await doc(); assert.equal(goi, 6, 'trong hạn đệm');
  await doc({ lamMoi: true }); assert.equal(goi, 9);
  gio += 3601 * 1000; await doc(); assert.equal(goi, 12);
});

test('P5 · khách BigQuery TỪ CHỐI kết quả nhiều trang (`pageToken`) — không trả nửa số', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const tep = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bq-')), 'k.json');
  fs.writeFileSync(tep, JSON.stringify({ type: 'service_account', project_id: 'du-an', client_email: 'sa@du-an.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
  const mang = (q) => async (url) => (url.startsWith('https://oauth2') ? { ok: true, status: 200, json: async () => ({ access_token: 't', expires_in: 3600 }) }
    : { ok: true, status: 200, json: async () => q });
  const SCHEMA = { fields: [{ name: 'x', type: 'INTEGER' }] };
  const mot = taoKhachBigQuery({ tepKhoa: tep, fetchFn: mang({ jobComplete: true, schema: SCHEMA, rows: [{ f: [{ v: '1' }] }], totalRows: '1' }) });
  assert.deepEqual(await mot.truyVan('SELECT 1'), [{ x: 1 }]);
  const cat = taoKhachBigQuery({ tepKhoa: tep, fetchFn: mang({ jobComplete: true, schema: SCHEMA, rows: [{ f: [{ v: '1' }] }], totalRows: '90000', pageToken: 'p2' }) });
  await assert.rejects(cat.truyVan('SELECT 1'), (e) => e instanceof LoiBigQuery && e.ma === 'cat_trang' && /90000 dòng mà một trang chỉ 1/.test(e.message));
});
