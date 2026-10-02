// LL15a · HRM TỪ BIGQUERY — tầng A: khách BigQuery CHỈ ĐỌC (`src/hrm/bigquery.js`) + bộ đọc HRM có đệm (`src/hrm/hrm.js`).
// Thật: ký JWT RS256 bằng `node:crypto` (cặp khoá RSA sinh trong ca, chữ ký được KIỂM bằng khoá công khai) · phân tích dòng
// theo schema · đệm. Giả: mạng Google (fetch ghi lại từng lượt).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { taoKhachBigQuery, LoiBigQuery, PHAM_VI_CHI_DOC } from '../src/hrm/bigquery.js';
import { taoDocHrm, tomTatHrm, marketerPosTheoTeam, SQL_NHAN_VIEN, SQL_GHEP_POS } from '../src/hrm/hrm.js';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const KHOA = { type: 'service_account', project_id: 'du-an-thu', client_email: 'sa-thu@du-an-thu.iam.gserviceaccount.com', private_key: PEM };
const tepTam = (noiDung) => { const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bq-')), 'k.json'); fs.writeFileSync(f, noiDung); return f; };
const TEP = tepTam(JSON.stringify(KHOA));

function mangGia({ token = { status: 200, json: { access_token: 'tk-1', expires_in: 3600 } }, query = null } = {}) {
  const goi = [];
  const fn = async (url, o) => {
    goi.push({ url, o });
    if (url.startsWith('https://oauth2.googleapis.com/token')) return { ok: token.status === 200, status: token.status, json: async () => token.json };
    const q = typeof query === 'function' ? query(JSON.parse(o.body)) : query;
    return { ok: (q?.status ?? 200) === 200, status: q?.status ?? 200, json: async () => q?.json ?? { jobComplete: true, schema: { fields: [] }, rows: [] } };
  };
  fn.goi = goi;
  return fn;
}

test('Q1 · token xin ĐÚNG phạm vi bigquery.readonly, JWT RS256 ký bằng khoá riêng (kiểm bằng khoá công khai)', async () => {
  const mang = mangGia();
  const k = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mang });
  await k.truyVan('SELECT 1');
  const t = mang.goi.find((g) => g.url.startsWith('https://oauth2.googleapis.com/token'));
  const assertion = new URLSearchParams(t.o.body).get('assertion');
  const [dau, than, ky] = assertion.split('.');
  const claim = JSON.parse(Buffer.from(than, 'base64url').toString());
  // đáp án BIẾT TRƯỚC (không so với hằng của chính tệp bị đo — đảo hằng thì ca vẫn xanh)
  assert.equal(claim.scope, 'https://www.googleapis.com/auth/bigquery.readonly');
  assert.equal(PHAM_VI_CHI_DOC, claim.scope);
  assert.equal(claim.iss, KHOA.client_email);
  assert.equal(claim.aud, 'https://oauth2.googleapis.com/token');
  assert.equal(JSON.parse(Buffer.from(dau, 'base64url').toString()).alg, 'RS256');
  assert.ok(crypto.createVerify('RSA-SHA256').update(`${dau}.${than}`).verify(publicKey, Buffer.from(ky, 'base64url')), 'chữ ký JWT sai');
  assert.ok(!t.o.body.includes('BEGIN PRIVATE KEY') && !JSON.stringify(mang.goi).includes(PEM.slice(40, 80)), 'khoá riêng lọt ra mạng');
});

test('Q2 · token có đệm: hai câu đọc ⇒ MỘT lượt xin token; gần hết hạn ⇒ xin lại', async () => {
  let gio = 1_000_000;
  const mang = mangGia();
  const k = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mang, dongHo: () => gio });
  await k.truyVan('SELECT 1'); await k.truyVan('SELECT 2');
  const soToken = () => mang.goi.filter((g) => g.url.includes('oauth2')).length;
  assert.equal(soToken(), 1);
  gio += 3600 * 1000 - 30_000;   // còn 30 giây — dưới ngưỡng 60 giây
  await k.truyVan('SELECT 3');
  assert.equal(soToken(), 2);
});

test('Q3 · câu đọc gửi đúng project của khoá, SQL chuẩn, vùng US; dòng ra đối tượng theo schema (chuỗi · BOOLEAN · TIMESTAMP)', async () => {
  const mang = mangGia({ query: { json: { jobComplete: true,
    schema: { fields: [{ name: 'emp_code', type: 'STRING' }, { name: 'thieu', type: 'BOOLEAN' }, { name: 'luc', type: 'TIMESTAMP' }, { name: 'trong', type: 'STRING' }] },
    rows: [{ f: [{ v: 'NV001' }, { v: 'true' }, { v: '1.7593E9' }, { v: null }] }] } } });
  const k = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mang });
  const r = await k.truyVan('SELECT emp_code FROM t');
  const q = mang.goi.find((g) => g.url.includes('/queries'));
  assert.equal(q.url, 'https://bigquery.googleapis.com/bigquery/v2/projects/du-an-thu/queries');
  assert.deepEqual(JSON.parse(q.o.body), { query: 'SELECT emp_code FROM t', useLegacySql: false, location: 'US', timeoutMs: 20000 });
  assert.equal(q.o.headers.Authorization, 'Bearer tk-1');
  assert.deepEqual(r, [{ emp_code: 'NV001', thieu: true, luc: 1.7593e12, trong: null }]);
});

test('Q4 · lỗi ra MÃ rõ ràng, không mang khoá: thiếu đường dẫn · tệp hỏng · token bị từ chối · 403 của câu đọc · chưa xong', async () => {
  assert.throws(() => taoKhachBigQuery({ tepKhoa: '' }), (e) => e instanceof LoiBigQuery && e.ma === 'thieu_khoa');
  assert.throws(() => taoKhachBigQuery({ tepKhoa: tepTam('{khong-phai-json') }), (e) => e.ma === 'khoa_hong');
  assert.throws(() => taoKhachBigQuery({ tepKhoa: tepTam(JSON.stringify({ type: 'authorized_user' })) }), (e) => e.ma === 'khoa_hong');
  const tuChoi = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mangGia({ token: { status: 400, json: { error: 'invalid_grant' } } }) });
  await assert.rejects(tuChoi.truyVan('SELECT 1'), (e) => e.ma === 'token' && /invalid_grant/.test(e.message));
  const cam = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mangGia({ query: { status: 403, json: { error: { errors: [{ reason: 'accessDenied' }] } } } }) });
  await assert.rejects(cam.truyVan('SELECT 1'), (e) => e.ma === 'truy_van' && e.status === 403 && /accessDenied/.test(e.message) && !e.message.includes('PRIVATE'));
  const dut = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: async () => { throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ETIMEDOUT' } }); } });
  await assert.rejects(dut.truyVan('SELECT 1'), (e) => e.ma === 'mang' && /fetch failed · ETIMEDOUT/.test(e.message), 'lỗi mạng phải mang mã nguyên nhân');
  const cham = taoKhachBigQuery({ tepKhoa: TEP, fetchFn: mangGia({ query: { json: { jobComplete: false } } }) });
  await assert.rejects(cham.truyVan('SELECT 1'), (e) => e.ma === 'cham');
});

test('Q5 · bộ đọc HRM: đệm một ngày · «đọc lại» bỏ đệm · hai lời gọi cùng lúc = MỘT lượt · khách hỏng ⇒ báo lỗi, lần sau thử lại', async () => {
  let gio = 0; let soDoc = 0;
  const khach = { truyVan: async (sql) => { soDoc++; return sql === SQL_NHAN_VIEN ? [{ emp_code: 'NV1' }] : sql === SQL_GHEP_POS ? [{ person_id: 'p1' }] : []; } };
  const doc = taoDocHrm({ taoKhach: () => khach, dongHo: () => gio });
  const [a, b] = await Promise.all([doc(), doc()]);
  assert.equal(a, b); assert.equal(soDoc, 2, 'hai câu (nhân viên + bảng ghép) cho MỘT lượt');
  gio += 23 * 3600 * 1000; await doc(); assert.equal(soDoc, 2, 'còn trong đệm');
  await doc({ lamMoi: true }); assert.equal(soDoc, 4);
  gio += 25 * 3600 * 1000; await doc(); assert.equal(soDoc, 6, 'quá một ngày ⇒ đọc lại');
  let lan = 0;
  const hong = taoDocHrm({ taoKhach: () => { lan++; if (lan === 1) throw new LoiBigQuery('khoa_hong', 'tệp khoá hỏng'); return khach; } });
  await assert.rejects(hong(), (e) => e.ma === 'khoa_hong');
  assert.ok((await hong()).nhanVien.length, 'lần sau phải thử dựng khách lại');
  // câu đọc CHỈ chọn cột cần — không kéo lương/cấp bậc/quản lý
  assert.doesNotMatch(SQL_NHAN_VIEN.split(' FROM ')[0], /\blevel\b|comp_profile|manager|revenue/);
});

test('Q6 · tóm tắt + xếp tài khoản marketer: team trên hệ · chờ gán · đã nghỉ · ngoài hệ (vận đơn, ban giám đốc)', () => {
  const nhanVien = [
    { emp_code: 'G1', ho_ten: 'A', status: 'active', team_code: 'PIALPHA_GCC' },
    { emp_code: 'E1', ho_ten: 'B', status: 'thuviec', team_code: 'PIALPHA_EU' },
    { emp_code: 'V1', ho_ten: 'C', status: 'active', team_code: 'PIALPHA_VD_OFFLINE' },
    { emp_code: 'N1', ho_ten: 'D', status: 'nghi', team_code: 'PIALPHA_GCC' },
    { emp_code: 'X1', ho_ten: 'E', status: 'active', team_code: 'APEXONE' },
  ];
  const ghep = [
    { person_id: 'p1', person_name: 'mk.gcc', emp_code: 'G1', map_status: 'confirmed', source_role: 'marketer', id_type: 'pancake' },
    { person_id: 'p2', person_name: 'mk.eu', emp_code: 'E1', map_status: 'needs_hcns', source_role: 'marketer', id_type: 'pancake' },
    { person_id: 'p3', person_name: 'mk.vd', emp_code: 'V1', map_status: 'confirmed', source_role: 'marketer' },
    { person_id: 'p4', person_name: 'mk.nghi', emp_code: null, map_status: 'da_nghi', source_role: 'marketer' },
    { person_id: 'p5', person_name: 'mk.moi', emp_code: null, map_status: 'unmapped', source_role: 'marketer' },
    { person_id: 'p6', person_name: 'mk.cu', emp_code: 'N1', map_status: 'confirmed', source_role: 'marketer' },
    { person_id: 'p7', person_name: 'sale.1', emp_code: 'G1', map_status: 'confirmed', source_role: 'sale' },
  ];
  const t = tomTatHrm({ luc: 5, nhanVien, ghep });
  assert.deepEqual([t.soHoSo, t.soHoSoPialpha, t.soHoSoPialphaDangLam, t.soGhep, t.soGhepXacNhan, t.soGhepChuaGhep, t.soTaiKhoanMarketer],
    [5, 3, 2, 7, 4, 1, 6]);
  const d = Object.fromEntries(marketerPosTheoTeam({ nhanVien, ghep }).map((x) => [x.taiKhoan, x]));
  assert.equal(Object.keys(d).length, 6, 'chỉ dòng marketer');
  assert.deepEqual([d['mk.gcc'].slug, d['mk.gcc'].tenTeam, d['mk.gcc'].ghep, d['mk.gcc'].trangThaiNv], ['tieu-alpha', 'Pialpha GCC', 'đã xác nhận', 'đang làm']);
  assert.deepEqual([d['mk.eu'].slug, d['mk.eu'].ghep, d['mk.eu'].choGan], ['pialpha-eu', 'HCNS chưa xác nhận', false]);
  assert.deepEqual([d['mk.vd'].ngoaiHe, d['mk.vd'].slug, d['mk.vd'].choGan], [true, null, false], 'vận đơn không vào hệ');
  assert.deepEqual([d['mk.nghi'].daNghi, d['mk.nghi'].choGan], [true, false], 'đã nghỉ KHÔNG phải chờ gán');
  assert.deepEqual([d['mk.moi'].choGan, d['mk.moi'].daNghi], [true, false]);
  assert.deepEqual([d['mk.cu'].daNghi, d['mk.cu'].choGan, d['mk.cu'].ngoaiHe], [true, false, false], 'hồ sơ «nghi» ⇒ đã nghỉ');
});
