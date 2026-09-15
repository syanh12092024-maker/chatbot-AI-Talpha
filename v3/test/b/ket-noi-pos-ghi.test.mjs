// CỬA GHI KẾT NỐI POS (15/09/2026) — thêm · sửa · bật/tắt · bỏ trên màn «Kết nối & token».
//
// Bảng `ket_noi_pos` quyết định đơn của một thị trường đi vào shop nào, bằng khoá nào. Trước
// lượt này nó chỉ đổi được bằng SQL trên máy chủ — tức mọi lượt đổi đều KHÔNG có dấu vết.
//
// Bộ ca này đo HÀNH VI của cửa, không đo hình dạng code: mỗi ca dựng một lượt bấm thật qua
// HTTP rồi soi hai thứ — cái gì đi ra trình duyệt, và cái gì rơi vào nhật ký.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const kn = await import('../../src/ui/ket-noi/kho-ket-noi.js');
const rt = await import('../../src/ui/ket-noi/router.js');
const { HANH_DONG, hopLeHanhDong, laBatBuoc } = await import('../../src/audit/hanh-dong.js');

/** Khoá thật, để ca «khoá không lọt ra» có cái cụ thể mà tìm. */
const KHOA_THAT = 'khoa-api-pos-that-' + crypto.randomBytes(6).toString('hex');

/* ═══════════ bàn giả: một bảng ket_noi_pos trong bộ nhớ ═══════════
 * Cố ý KHÔNG dựng Postgres ở đây. Tầng SQL (`src/pos/ket-noi.js`) có cổng riêng chạy trên
 * CSDL thật; bộ ca này đo TẦNG TRÊN — router + kho — nơi quyết định cái gì ra màn và cái gì
 * vào nhật ký. Trộn hai tầng vào một chỗ đo thì ca đỏ không nói được tầng nào hỏng.
 */
let BAN = [];
let idKe = 1;
const cuaGhiGia = {
  them: async (_bc, { market, shopId, apiKey }) => {
    if (BAN.some((r) => r.market === market)) {
      const e = new Error(`Team này đã có một kết nối POS cho thị trường "${market}".`);
      e.ma = 'trung_thi_truong'; e.status = 409; throw e;
    }
    const r = { id: String(idKe++), market, shopId, bat: true, coKhoa: !!apiKey, _khoa: apiKey };
    BAN.push(r);
    return { id: r.id, market: r.market, shopId: r.shopId, bat: r.bat, coKhoa: r.coKhoa };
  },
  sua: async (_bc, id, { shopId, apiKey }) => {
    const r = BAN.find((x) => x.id === String(id));
    if (!r) { const e = new Error('không thấy'); e.ma = 'khong_thay'; e.status = 404; throw e; }
    if (shopId) r.shopId = shopId;
    if (apiKey) r._khoa = apiKey;          // rỗng = GIỮ khoá cũ, đúng hợp đồng của cửa
    return { id: r.id, market: r.market, shopId: r.shopId, bat: r.bat, coKhoa: !!r._khoa };
  },
  batTat: async (_bc, id, bat) => {
    const r = BAN.find((x) => x.id === String(id));
    if (!r) { const e = new Error('không thấy'); e.ma = 'khong_thay'; e.status = 404; throw e; }
    r.bat = !!bat;
    return { id: r.id, market: r.market, shopId: r.shopId, bat: r.bat, coKhoa: !!r._khoa };
  },
  bo: async (_bc, id) => {
    const i = BAN.findIndex((x) => x.id === String(id));
    if (i < 0) { const e = new Error('không thấy'); e.ma = 'khong_thay'; e.status = 404; throw e; }
    return { ...BAN.splice(i, 1)[0], coKhoa: true, _khoa: undefined };
  },
};

let NHAT_KY = [];
const chanDangNhap = (req, res, next) => (req.boiCanh ? next() : res.status(401).json({ ok: false }));
const chanVai = (...can) => (req, res, next) => {
  if (!req.boiCanh) return res.status(401).json({ ok: false });
  return can.some((v) => req.boiCanh.vai.includes(v))
    ? next() : res.status(403).json({ ok: false, ma: 'thieu_vai' });
};

rt.datChanDangNhap(chanDangNhap);
rt.datChanVai(chanVai);
kn.datDocKetNoiPos(async () => BAN.map((r) => ({ id: r.id, market: r.market, shopId: r.shopId, bat: r.bat })));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.boiCanh = {
    nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: 't1',
    vai: String(req.headers['x-thu-vai'] || 'quan-tri').split(','), nguon: 'phien', ip: null,
  };
  next();
});
app.use(rt.taoRouterKetNoi());
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref();
const goc = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((r) => server.close(r)));

async function goi(duong, { method = 'GET', than, vai = 'quan-tri' } = {}) {
  const res = await fetch(goc + duong, {
    method,
    headers: { 'x-thu-vai': vai, ...(than ? { 'content-type': 'application/json' } : {}) },
    body: than ? JSON.stringify(than) : undefined,
  });
  const d = (res.headers.get('content-type') || '').includes('json')
    ? await res.json().catch(() => null) : await res.text();
  return { res, d };
}

function datLai() {
  BAN = []; idKe = 1; NHAT_KY = [];
  kn.datGhiKetNoiPos(cuaGhiGia);
  rt.datPheuNhatKy(async (_bc, ban) => { NHAT_KY.push(ban); return ban; });
}
datLai();

/* ═══════════ ① KHOÁ API ĐI MỘT CHIỀU ═══════════ */

test('KHOÁ KHÔNG LỌT RA · không đường nào trả khoá về trình duyệt, kể cả sau khi vừa gõ nó', async () => {
  datLai();
  const them = await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Saudi', shopId: '77', apiKey: KHOA_THAT } });
  assert.equal(them.res.status, 200, JSON.stringify(them.d));

  // Soi TOÀN BỘ thân trả về dưới dạng chuỗi — tìm khoá ở mọi độ sâu, không chỉ ở các
  // trường mình nghĩ tới. Cửa rò rỉ hay mọc ở trường người viết ca không ngờ (án lệ #31).
  const doc = await goi('/api/ket-noi/pos');
  for (const [ten, than] of [['POST /pos', them.d], ['GET /pos', doc.d]]) {
    assert.ok(!JSON.stringify(than).includes(KHOA_THAT), `${ten} để lọt khoá API ra trình duyệt`);
  }
  assert.equal(them.d.pos.coKhoa, true, 'phải nói được LÀ CÓ khoá — chỉ không nói khoá là gì');
});

test('KHOÁ KHÔNG VÀO NHẬT KÝ · `nhat_ky` là bảng chỉ-thêm, lọt vào là lọt vĩnh viễn', async () => {
  datLai();
  await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'UAE', shopId: '88', apiKey: KHOA_THAT } });
  await goi('/api/ket-noi/pos/1', { method: 'POST', than: { shopId: '99', apiKey: KHOA_THAT + '-moi' } });
  assert.equal(NHAT_KY.length, 2);
  for (const ban of NHAT_KY) {
    assert.ok(!JSON.stringify(ban).includes(KHOA_THAT), 'khoá API rơi vào nhật ký: ' + JSON.stringify(ban));
  }
  // Nhưng phải nói ĐƯỢC một điều về khoá: có đổi hay không. Đó là nửa quan trọng của dòng này.
  assert.match(NHAT_KY[1].ghiChu, /ĐỔI KHOÁ API/);
  assert.equal(NHAT_KY[1].sau.doiKhoa, true);
});

test('SỬA KHÔNG ĐỔI KHOÁ · để trống ô khoá thì giữ khoá cũ, và nhật ký nói đúng thế', async () => {
  datLai();
  await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Kuwait', shopId: '11', apiKey: KHOA_THAT } });
  const sua = await goi('/api/ket-noi/pos/1', { method: 'POST', than: { shopId: '22' } });
  assert.equal(sua.res.status, 200, JSON.stringify(sua.d));
  assert.equal(BAN[0]._khoa, KHOA_THAT, 'khoá cũ phải còn nguyên — màn không đọc được khoá cũ để gõ lại');
  assert.equal(BAN[0].shopId, '22');
  assert.match(NHAT_KY[1].ghiChu, /khoá giữ nguyên/);
  assert.equal(NHAT_KY[1].sau.doiKhoa, false);
});

/* ═══════════ ② MỌI LƯỢT ĐỔI ĐỀU ĐỂ LẠI DẤU ═══════════ */

test('BỐN MÃ nằm trong danh mục deny-by-default, và ba mã đổi cấu hình là BẮT BUỘC ghi', () => {
  // Đúng lỗ đã cắn ngày 25/08: chín mã của năm màn chưa khai ⇒ `ghiNhatKy` từ chối, lượt ghi
  // rơi vào hư không, màn vẫn báo thành công. Ca này chặn tái phạm cho cụm mã mới.
  for (const ma of [HANH_DONG.THEM_KET_NOI_POS, HANH_DONG.SUA_KET_NOI_POS,
    HANH_DONG.BAT_TAT_KET_NOI_POS, HANH_DONG.BO_KET_NOI_POS]) {
    assert.ok(hopLeHanhDong(ma), `mã ${ma} chưa khai trong HANH_DONG — nhật ký sẽ nuốt lượt ghi`);
  }
  for (const ma of [HANH_DONG.THEM_KET_NOI_POS, HANH_DONG.SUA_KET_NOI_POS, HANH_DONG.BO_KET_NOI_POS]) {
    assert.ok(laBatBuoc(ma), `${ma} phải BẮT BUỘC ghi — cùng họ với doi_khoa, đây là đường tiền`);
  }
});

test('CHƯA NỐI PHỄU NHẬT KÝ · cửa từ chối TRƯỚC khi sửa, không sửa xong rồi mới kêu', async () => {
  datLai();
  rt.datPheuNhatKy(null);
  const r = await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Oman', shopId: '5', apiKey: 'k' } });
  assert.equal(r.res.status, 500);
  assert.equal(r.d.ma, 'chua_noi');
  // Điều thật sự cần đo: BẢNG KHÔNG ĐỔI. Sửa xong rồi mới phát hiện mất dấu là hỏng kiểu
  // tệ nhất — kết nối đã đổi thật mà không ai truy được ai đổi.
  assert.equal(BAN.length, 0, 'đã ghi vào bảng trong khi không ghi được nhật ký');
});

/* ═══════════ ③ CHƯA NỐI CỬA GHI THÌ NÓI RA, ĐỪNG ẨN CÂM ═══════════ */

test('CHƯA NỐI CỬA GHI · màn khai suaDuoc=false và cửa trả lỗi CẤU HÌNH, không phải 404', async () => {
  datLai();
  kn.datGhiKetNoiPos(null);
  const doc = await goi('/api/ket-noi/pos');
  assert.equal(doc.d.suaDuoc, false, 'màn phải biết để ẩn nút, thay vì cho bấm rồi ăn 500');

  const r = await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'X', shopId: '1', apiKey: 'k' } });
  assert.equal(r.res.status, 500);
  assert.equal(r.d.ma, 'chua_noi');
  assert.match(r.d.thongDiep, /lỗi cấu hình/i, 'phải nói đây là lỗi máy chủ, không phải «không sửa được»');
});

test('NỬA CỬA LÀ TỪ CHỐI CẢ CỤM · thiếu một trong bốn hàm thì không nhận', () => {
  assert.throws(() => kn.datGhiKetNoiPos({ them: () => {}, sua: () => {} }),
    /thiếu hàm.*batTat|thiếu hàm.*bo/);
  datLai();
});

/* ═══════════ ④ TẮT LÀ CÁCH ĐÚNG, BỎ LÀ MẤT KHOÁ ═══════════ */

test('TẮT · cửa POS của thị trường đó đóng ngay, bản ghi và khoá vẫn còn để bật lại', async () => {
  datLai();
  await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Saudi', shopId: '77', apiKey: KHOA_THAT } });
  const tat = await goi('/api/ket-noi/pos/1/bat', { method: 'POST', than: { bat: false } });
  assert.equal(tat.res.status, 200, JSON.stringify(tat.d));
  assert.equal(BAN[0].bat, false);
  assert.equal(BAN[0]._khoa, KHOA_THAT, 'tắt mà mất khoá thì bật lại không được — đó là bỏ, không phải tắt');
  assert.match(NHAT_KY[1].ghiChu, /TẮT/);
  assert.match(NHAT_KY[1].ghiChu, /ngừng tạo được đơn/, 'dòng nhật ký phải nói HẬU QUẢ, không chỉ nói hành động');

  const bat = await goi('/api/ket-noi/pos/1/bat', { method: 'POST', than: { bat: true } });
  assert.equal(bat.res.status, 200);
  assert.equal(BAN[0].bat, true, 'bật lại được là điều làm «tắt» khác «bỏ»');
});

test('BỎ · dòng nhật ký giữ lại thị trường + shop, vì bản ghi thì mất rồi', async () => {
  datLai();
  await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'UAE', shopId: '88', apiKey: KHOA_THAT } });
  const bo = await goi('/api/ket-noi/pos/1', { method: 'DELETE' });
  assert.equal(bo.res.status, 200, JSON.stringify(bo.d));
  assert.equal(BAN.length, 0);
  assert.equal(NHAT_KY[1].hanhDong, HANH_DONG.BO_KET_NOI_POS);
  assert.equal(NHAT_KY[1].truoc.market, 'UAE', 'mất bản ghi rồi thì nhật ký là chỗ duy nhất còn biết');
  assert.equal(NHAT_KY[1].truoc.shopId, '88');
  assert.ok(!JSON.stringify(NHAT_KY[1]).includes(KHOA_THAT));
});

/* ═══════════ ⑤ HAI RÀNG BUỘC UNIQUE NÓI ĐƯỢC THÀNH CÂU ═══════════ */

test('TRÙNG THỊ TRƯỜNG · trả 409 kèm câu người đọc được, không phải 23505 trần', async () => {
  datLai();
  await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Saudi', shopId: '77', apiKey: 'k1' } });
  const lai = await goi('/api/ket-noi/pos', { method: 'POST', than: { market: 'Saudi', shopId: '78', apiKey: 'k2' } });
  assert.equal(lai.res.status, 409);
  assert.match(lai.d.thongDiep, /Saudi/);
  assert.ok(!/23505|duplicate key/i.test(lai.d.thongDiep), 'câu lỗi của Postgres không phải câu cho người dùng');
  assert.equal(BAN.length, 1, 'lượt trùng không được để lại gì');
  assert.equal(NHAT_KY.length, 1, 'lượt hỏng KHÔNG ghi nhật ký thành công');
});

/* ═══════════ ⑥ VAI ═══════════ */

test('CHỈ quan-tri · vai khác không sửa được kết nối POS', async () => {
  datLai();
  const r = await goi('/api/ket-noi/pos', {
    method: 'POST', vai: 'quan-ly', than: { market: 'X', shopId: '1', apiKey: 'k' },
  });
  assert.equal(r.res.status, 403);
  assert.equal(BAN.length, 0);
});
