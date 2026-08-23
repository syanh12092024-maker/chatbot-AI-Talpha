// L0-M3 · tiêu chí 5 → 10 — chạy trên MỘT MÁY CHỦ HTTP THẬT (node:http, cổng 0) rồi
// `fetch` vào. Không thêm supertest, không thêm gói nào.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE = 'khoa-thu-cho-test-router-dai-hon-32-ky-tu-xyz';

const { KhoGia, taoTruyVanGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, cuaBoiCanh, batBuocBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { docVe } = await import('../../src/auth/ve.js');
const {
  datCongDanhTinh, datPheuNhatKy, taoRouterAuth, xoaBoDemThuSai,
  lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, chanTeamTrenUrl,
} = await import('../../src/auth/index.js');

/* ───────────────────────────────── hạt giống ───────────────────────────────── */

const MK = { an: 'mat-khau-an-1', binh: 'mat-khau-binh-2', cuc: 'mat-khau-cuc-3', dung: 'mat-khau-dung-4' };
const NHANH = { N: 1024, r: 8, p: 1 };   // scrypt mặc định cố ý chậm; test không cần chậm

const kho = new KhoGia({
  team: [
    { id: 't1', ten: 'Tiểu Alpha' },
    { id: 't2', ten: 'Auus' },
    { id: 't3', ten: 'Pialpha EU' },
  ],
  vai: [
    { id: 'v_sale', ma: 'sale', ten: 'Sale' },
    { id: 'v_qt', ma: 'quan_tri', ten: 'Quản trị' },
  ],
  nguoi_dung: [
    { id: 'u_an', ten_dang_nhap: 'an', ho_ten: 'Nguyễn An', bat: true, mat_khau_bam: await bam(MK.an, NHANH) },
    { id: 'u_binh', ten_dang_nhap: 'binh', ho_ten: 'Trần Bình', bat: true, mat_khau_bam: await bam(MK.binh, NHANH) },
    { id: 'u_cuc', ten_dang_nhap: 'cuc', ho_ten: 'Lê Cúc', bat: false, mat_khau_bam: await bam(MK.cuc, NHANH) },
    { id: 'u_dung', ten_dang_nhap: 'dung', ho_ten: 'Phạm Dung', bat: true, mat_khau_bam: await bam(MK.dung, NHANH) },
  ],
  thanh_vien_team: [
    { nguoi_dung_id: 'u_an', team_id: 't1', vai_id: 'v_sale' },
    { nguoi_dung_id: 'u_binh', team_id: 't1', vai_id: 'v_sale' },
    { nguoi_dung_id: 'u_binh', team_id: 't2', vai_id: 'v_qt' },
    { nguoi_dung_id: 'u_cuc', team_id: 't1', vai_id: 'v_sale' },
    // u_dung: không thuộc team nào
  ],
  // bảng CÓ team_id, để chứng minh bối cảnh dựng từ vé đi lọt xuống tầng truy vấn
  khach: [
    { id: 'k1', team_id: 't1', ten: 'Khách của Tiểu Alpha' },
    { id: 'k2', team_id: 't2', ten: 'Khách của Auus' },
  ],
});

/** Cổng danh tính: cổng cấp hệ thống, KHÔNG gắn team — xem `kho-nguoi-dung.js`. */
datCongDanhTinh(() => taoTruyVanGia(kho, boiCanhMay('_he_thong', 'đọc bốn bảng dùng chung để đăng nhập')));

let nhatKy = [];
datPheuNhatKy((boiCanh, ban) => { nhatKy.push({ boiCanh, ...ban }); return ban; });
const donNhatKy = () => { nhatKy = []; };
const coNhatKy = (ma) => nhatKy.filter((n) => n.hanhDong === ma);

/* ──────────────────────────────── máy chủ thật ─────────────────────────────── */

const app = express();
app.use(express.json());
app.use(lopBoiCanh());
app.use(taoRouterAuth());

// Đường của "người A" — đã có bối cảnh, có chắn xuyên team.
app.get('/api/thu', batBuocDangNhap(), chanTeamTrenUrl(), (req, res) => {
  res.json({ ok: true, teamId: req.boiCanh.teamId, vai: [...req.boiCanh.vai] });
});
app.post('/api/thu', batBuocDangNhap(), chanTeamTrenUrl(), (req, res) => {
  res.json({ ok: true, teamId: req.boiCanh.teamId });
});

// Tiêu chí 10: bối cảnh dựng từ vé phải đi lọt batBuocBoiCanh VÀ lọt xuống cổng truy vấn.
app.get('/api/khach', batBuocDangNhap(), chanTeamTrenUrl(), async (req, res, next) => {
  try {
    const bc = batBuocBoiCanh(cuaBoiCanh(req));
    const db = taoTruyVanGia(kho, bc);
    res.json({ ok: true, teamId: bc.teamId, khach: (await db.chon('khach')).map((k) => k.id) });
  } catch (e) { next(e); }
});

app.get('/api/chi-quan-tri', batBuocDangNhap(), batBuocVaiHTTP(VAI.QUAN_TRI), (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref();
const goc = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((r) => server.close(r)));

/* ─────────────────────────────── tiện tay cho test ─────────────────────────── */

function docSetCookie(res) {
  const ds = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
  return ds.find((c) => c.startsWith('v3_ve=')) || null;
}
const giaTriVe = (res) => {
  const h = docSetCookie(res);
  if (!h) return null;
  return decodeURIComponent(h.slice('v3_ve='.length).split(';')[0]);
};

async function goi(duong, { ve, ...tuyChon } = {}) {
  const headers = { ...(tuyChon.headers || {}) };
  if (ve) headers.cookie = `v3_ve=${encodeURIComponent(ve)}`;
  if (tuyChon.than !== undefined) {
    headers['content-type'] = 'application/json';
    tuyChon.body = JSON.stringify(tuyChon.than);
    tuyChon.method = tuyChon.method || 'POST';
  }
  delete tuyChon.than;
  const res = await fetch(goc + duong, { ...tuyChon, headers, redirect: 'manual' });
  const chu = res.headers.get('content-type') || '';
  const than = chu.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { res, than, ve: giaTriVe(res) };
}

const dangNhap = (tenDangNhap, matKhau) => goi('/api/dang-nhap', { than: { tenDangNhap, matKhau } });

/* ─────────────────────────────────── test ──────────────────────────────────── */

test('trang · GET /dang-nhap và /chon-team trả HTML thuần, không gọi mạng ra ngoài', async () => {
  for (const d of ['/dang-nhap', '/chon-team']) {
    const { res, than } = await goi(d);
    assert.equal(res.status, 200, d);
    assert.match(than, /<!doctype html>/i, d);
    assert.doesNotMatch(than, /https?:\/\/(?!127\.0\.0\.1)/i, `${d} không được trỏ ra ngoài`);
    assert.match(than, /--pri:#0e7c86/, `${d} phải dùng hệ thiết kế của ops.html`);
  }
});

test('tiêu chí 9 · sai mật khẩu và tài khoản không tồn tại → CÙNG mã, CÙNG thông điệp', async () => {
  xoaBoDemThuSai();
  const saiMatKhau = await dangNhap('an', 'sai-bét');
  const khongCoTaiKhoan = await dangNhap('khong-he-co-nguoi-nay', 'sai-bét');
  const taiKhoanKhoa = await dangNhap('cuc', MK.cuc);   // mật khẩu ĐÚNG nhưng bat:false

  for (const k of [saiMatKhau, khongCoTaiKhoan, taiKhoanKhoa]) {
    assert.equal(k.res.status, 401);
    assert.equal(k.than.ma, 'sai_dang_nhap');
    assert.equal(k.than.thongDiep, 'Sai tên đăng nhập hoặc mật khẩu.');
    assert.equal(k.ve, null, 'thất bại thì KHÔNG được đặt cookie');
  }
  assert.equal(
    new Set([saiMatKhau, khongCoTaiKhoan, taiKhoanKhoa].map((k) => JSON.stringify(k.than))).size, 1,
    'ba ca phải trả về thân giống hệt nhau — khác nhau là chỉ điểm cho người dò tài khoản',
  );
  xoaBoDemThuSai();
});

test('tiêu chí 8 · sai mật khẩu 6 lần liên tiếp → lần thứ 6 trả 429', async () => {
  xoaBoDemThuSai();
  const ma = [];
  for (let i = 0; i < 6; i++) ma.push((await dangNhap('an', `sai-${i}`)).res.status);
  assert.deepEqual(ma, [401, 401, 401, 401, 401, 429], `thực tế: ${ma.join(',')}`);

  // 429-an-toàn: đang bị hãm thì mật khẩu ĐÚNG cũng không lọt.
  const dung = await dangNhap('an', MK.an);
  assert.equal(dung.res.status, 429);
  assert.equal(dung.than.ma, 'thu_qua_nhieu');
  assert.equal(dung.ve, null);

  // hãm khoá theo tên đã hạ chữ thường → đổi hoa/thường không lách được
  assert.equal((await dangNhap('AN', MK.an)).res.status, 429);

  // người khác không bị vạ lây
  xoaBoDemThuSai('binh');
  assert.equal((await dangNhap('binh', MK.binh)).res.status, 200);

  xoaBoDemThuSai();
});

test('tiêu chí 5 · người thuộc HAI team → trả danh sách, CHƯA phát vé đủ quyền', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('binh', MK.binh);

  assert.equal(vao.res.status, 200);
  assert.equal(vao.than.canChonTeam, true);
  assert.equal(vao.than.diTiep, '/chon-team');
  assert.equal(vao.than.dsTeam.length, 2);
  assert.deepEqual(vao.than.dsTeam.map((t) => t.teamId).sort(), ['t1', 't2']);
  assert.deepEqual(vao.than.dsTeam.find((t) => t.teamId === 't2'), { teamId: 't2', tenTeam: 'Auus', vai: ['quan_tri'] });
  assert.equal(vao.than.toi.teamId, null);

  // vé trong cookie là vé TẠM: chưa mang teamId, chưa mang vai
  const tam = docVe(vao.ve);
  assert.equal(tam.tam, true);
  assert.equal(tam.teamId, null);
  assert.deepEqual(tam.vai, []);

  // vé tạm KHÔNG mở được đường của người A
  const chan = await goi('/api/khach', { ve: vao.ve });
  assert.equal(chan.res.status, 401);
  assert.equal(chan.than.ma, 'chua_dang_nhap');

  // chọn team xong MỚI có vé mang teamId đó
  const chon = await goi('/api/chon-team', { ve: vao.ve, than: { teamId: 't2' } });
  assert.equal(chon.res.status, 200);
  const du = docVe(chon.ve);
  assert.equal(du.tam, undefined);
  assert.equal(du.teamId, 't2');
  assert.deepEqual(du.vai, ['quan_tri']);
  assert.equal(du.hetHan - du.capLuc, 8 * 60 * 60 * 1000);

  const mo = await goi('/api/khach', { ve: chon.ve });
  assert.equal(mo.res.status, 200);
  assert.deepEqual(mo.than.khach, ['k2'], 'vé team t2 chỉ thấy khách của t2');

  assert.equal(coNhatKy('dang_nhap').length, 1, 'chọn team xong mới tính là đăng nhập xong');
});

test('tiêu chí 5b · người thuộc MỘT team → phát vé đủ quyền luôn', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('an', MK.an);

  assert.equal(vao.res.status, 200);
  assert.equal(vao.than.canChonTeam, false);
  assert.equal(vao.than.diTiep, '/dieu-phoi');
  const than = docVe(vao.ve);
  assert.equal(than.teamId, 't1');
  assert.deepEqual(than.vai, ['sale']);

  const h = docSetCookie(vao.res);
  assert.match(h, /HttpOnly/i);
  assert.match(h, /SameSite=Lax/i);
  assert.match(h, /Path=\//);
  assert.match(h, /Max-Age=28800/, 'Max-Age phải khớp hạn vé 8 tiếng');

  assert.equal(coNhatKy('dang_nhap').length, 1);
  assert.equal(coNhatKy('dang_nhap')[0].boiCanh.teamId, 't1');
});

test('tiêu chí 10 · bối cảnh dựng từ vé đi lọt batBuocBoiCanh và lọt xuống cổng truy vấn', async () => {
  xoaBoDemThuSai();
  const vao = await dangNhap('an', MK.an);
  const kq = await goi('/api/khach', { ve: vao.ve });

  assert.equal(kq.res.status, 200, 'batBuocBoiCanh không được ném');
  assert.equal(kq.than.teamId, 't1');
  assert.deepEqual(kq.than.khach, ['k1'], 'chỉ thấy khách của team mình, dù kho có cả t2');

  const toi = await goi('/api/toi', { ve: vao.ve });
  assert.equal(toi.res.status, 200);
  assert.equal(toi.than.nguoiDungId, 'u_an');
  assert.equal(toi.than.tenDangNhap, 'an');
  assert.equal(toi.than.teamId, 't1');
  assert.deepEqual(toi.than.vai, ['sale']);
  assert.deepEqual(toi.than.dsTeam.map((t) => t.teamId), ['t1']);
});

test('tiêu chí 6 · chọn team mình KHÔNG thuộc → 403, có ghi nhật ký', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('an', MK.an);           // an chỉ thuộc t1

  const xin = await goi('/api/chon-team', { ve: vao.ve, than: { teamId: 't3' } });
  assert.equal(xin.res.status, 403);
  assert.equal(xin.than.ma, 'khong_thuoc_team');
  assert.equal(xin.ve, null, 'không được phát vé mới');

  const ghi = coNhatKy('chan_xuyen_team');
  assert.equal(ghi.length, 1);
  assert.equal(ghi[0].doiTuongId, 't3');
  assert.equal(ghi[0].sau.team_xin, 't3');
  assert.equal(ghi[0].sau.team_cua, 't1');

  // vé cũ vẫn còn nguyên giá trị của team cũ
  const van = await goi('/api/khach', { ve: vao.ve });
  assert.deepEqual(van.than.khach, ['k1']);

  // và từ vé TẠM cũng không chọn được team lạ
  donNhatKy();
  const tam = await dangNhap('binh', MK.binh);
  const xin2 = await goi('/api/chon-team', { ve: tam.ve, than: { teamId: 't3' } });
  assert.equal(xin2.res.status, 403);
  assert.equal(coNhatKy('chan_xuyen_team').length, 1);
});

test('tiêu chí 7 · ?team_id=<team khác> với vé của team mình → 403 chan_xuyen_team, có ghi nhật ký', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('an', MK.an);           // vé team t1

  const chan = await goi('/api/thu?team_id=t2', { ve: vao.ve });
  assert.equal(chan.res.status, 403);
  assert.equal(chan.than.ma, 'chan_xuyen_team');

  const ghi = coNhatKy('chan_xuyen_team');
  assert.equal(ghi.length, 1, 'phải ghi đúng một dòng');
  assert.equal(ghi[0].sau.team_xin, 't2');
  assert.equal(ghi[0].sau.team_cua, 't1');
  assert.equal(ghi[0].boiCanh.nguoiDungId, 'u_an');
  assert.match(ghi[0].doiTuongId, /team_id=t2/);

  // cũng chặn khi team_id nằm trong THÂN yêu cầu
  donNhatKy();
  const than = await goi('/api/thu', { ve: vao.ve, than: { team_id: 't2' } });
  assert.equal(than.res.status, 403);
  assert.equal(coNhatKy('chan_xuyen_team').length, 1);

  // và cũng chặn ở đường có chạm dữ liệu thật
  donNhatKy();
  const kh = await goi('/api/khach?team_id=t2', { ve: vao.ve });
  assert.equal(kh.res.status, 403);
  assert.equal(coNhatKy('chan_xuyen_team').length, 1);

  // truyền ĐÚNG team của mình thì đi lọt
  donNhatKy();
  const lot = await goi('/api/thu?team_id=t1', { ve: vao.ve });
  assert.equal(lot.res.status, 200);
  assert.equal(lot.than.teamId, 't1');
  assert.equal(coNhatKy('chan_xuyen_team').length, 0);
});

test('vai · thiếu vai → 403 thieu_vai, có ghi nhật ký', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const sale = await dangNhap('an', MK.an);          // vai sale
  const chan = await goi('/api/chi-quan-tri', { ve: sale.ve });
  assert.equal(chan.res.status, 403);
  assert.equal(chan.than.ma, 'thieu_vai');
  assert.equal(coNhatKy('thieu_vai').length, 1);

  const binh = await dangNhap('binh', MK.binh);
  const qt = await goi('/api/chon-team', { ve: binh.ve, than: { teamId: 't2' } });
  const lot = await goi('/api/chi-quan-tri', { ve: qt.ve });
  assert.equal(lot.res.status, 200, 'quản trị của t2 phải vào được');
});

test('đăng xuất · xoá cookie, sau đó vé không dùng được từ trình duyệt nữa', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('an', MK.an);
  const ra = await goi('/api/dang-xuat', { ve: vao.ve, method: 'POST' });

  assert.equal(ra.res.status, 200);
  assert.match(docSetCookie(ra.res), /Max-Age=0/);
  assert.equal(ra.ve, '');
  assert.equal(coNhatKy('dang_xuat').length, 1);

  const khong = await goi('/api/toi');
  assert.equal(khong.res.status, 401);
  assert.equal(khong.than.ma, 'chua_dang_nhap');
});

test('đổi team · vé đủ quyền chọn team khác mình CÓ thuộc → ghi doi_team', async () => {
  xoaBoDemThuSai(); donNhatKy();
  const vao = await dangNhap('binh', MK.binh);
  const t2 = await goi('/api/chon-team', { ve: vao.ve, than: { teamId: 't2' } });
  donNhatKy();
  const t1 = await goi('/api/chon-team', { ve: t2.ve, than: { teamId: 't1' } });

  assert.equal(t1.res.status, 200);
  assert.equal(docVe(t1.ve).teamId, 't1');
  assert.deepEqual(docVe(t1.ve).vai, ['sale'], 'vai đổi theo team, không mang vai cũ sang');
  const ghi = coNhatKy('doi_team');
  assert.equal(ghi.length, 1);
  assert.equal(ghi[0].truoc.team_id, 't2');
  assert.equal(ghi[0].sau.team_id, 't1');

  const kh = await goi('/api/khach', { ve: t1.ve });
  assert.deepEqual(kh.than.khach, ['k1']);
});

test('tài khoản không thuộc team nào → 403, không phát vé', async () => {
  xoaBoDemThuSai();
  const kq = await dangNhap('dung', MK.dung);
  assert.equal(kq.res.status, 403);
  assert.equal(kq.than.ma, 'khong_thuoc_team');
  assert.equal(kq.ve, null);
});

test('vé giả / vé sửa tay → coi như chưa đăng nhập, không nổ 500', async () => {
  const vao = await dangNhap('an', MK.an);
  for (const xau of ['rác', `${vao.ve}x`, 'a.b', '']) {
    const kq = await goi('/api/toi', { ve: xau });
    assert.equal(kq.res.status, 401, `vé "${xau.slice(0, 12)}" phải là 401`);
  }
});

test('đăng nhập · thiếu tên hoặc thiếu mật khẩu → 401 cùng thông điệp, không đụng bộ đếm', async () => {
  xoaBoDemThuSai();
  for (const [t, m] of [['', MK.an], ['an', ''], ['', '']]) {
    const kq = await dangNhap(t, m);
    assert.equal(kq.res.status, 401);
    assert.equal(kq.than.ma, 'sai_dang_nhap');
  }
  assert.equal((await dangNhap('an', MK.an)).res.status, 200, 'không được vô cớ bị hãm');
});
