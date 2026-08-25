// MÀN «AI ĐỀ XUẤT» (G2-F8) — NỬA SAU của tiêu chí nghiệm thu giai đoạn 2:
//   *«Kịch bản NGƯỜI VIẾT → áp thẳng. Đề xuất CỦA AI → phải duyệt mới áp. Hai đường khác nhau.»*
//
// Bài test này dựng MỘT máy chủ thật có CẢ HAI router (`bo-luat` + `ai-de-xuat`) dùng CHUNG
// một cửa ghi, rồi đi hai đường bằng HTTP. Đó là chỗ duy nhất chứng minh được «hai đường
// KHÁC NHAU»: gọi thẳng hàm trong tầng dưới thì cả hai đều nhận `nguon` làm tham số và bài
// test sẽ xanh kể cả khi hai cửa HTTP thật ra là một.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const bl = await import('../../src/ui/bo-luat/index.js');
const dx = await import('../../src/ui/ai-de-xuat/index.js');

const LUAT = ['# BỘ LUẬT', '', '1. Chào bằng tiếng Ả Rập.', '2. Không hứa ngày giao.'].join('\n')
  + '\n' + 'x'.repeat(300);
const DAI = (s) => s + '\n' + 'y'.repeat(300);

const { taoTruyVan, kho } = dungCongGia({
  team: [
    { id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false },
    { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
    // t3 CỐ Ý trắng trơn — dùng riêng cho phép thử «màn rỗng». Không dùng lại t2: t2 đã
    // được gieo một bản AI để kiểm chéo team, nên hỏi nó «rỗng chưa» là hỏi sai chỗ.
    { id: 't3', slug: 'trong-tron', ten: 'Trống trơn', la_ky_thuat: false },
  ],
  page: [
    { id: 'p1', team_id: 't1', page_id: '111', ten: 'A', bot_ai_bat: true },
    { id: 'p2', team_id: 't1', page_id: '222', ten: 'B', bot_ai_bat: true },
  ],
  bo_luat_chung: [
    { id: 'b1', team_id: 't1', phien_ban: 1, dang_dung: true, noi_dung: LUAT, nguon: 'nguoi', nguoi_sua: 'seed' },
    // Bản của team KHÁC, cũng do AI đề xuất — không được lọt sang danh sách của t1.
    { id: 'bx', team_id: 't2', phien_ban: 1, dang_dung: false, noi_dung: LUAT, nguon: 'ai', nguoi_sua: 'ke_khac' },
  ],
});

bl.datTaoTruyVan(taoTruyVan);
dx.datDocBoLuat(bl.manBoLuat);

/* ── cửa ghi giả, mô phỏng `src/db/noi-dung.js` của người A. CẢ HAI màn dùng chung ── */
const goiCua = [];
const cua = {
  taoBan: async (bc, t) => {
    goiCua.push({ ham: 'taoBan', teamId: bc.teamId, nguon: t.nguon });
    const ds = kho.docThang('bo_luat_chung').filter((r) => String(r.team_id ?? '') === String(bc.teamId));
    const pb = Math.max(0, ...ds.map((r) => Number(r.phien_ban) || 0)) + 1;
    const id = 'moi' + goiCua.length;
    kho.bang.get('bo_luat_chung').push({
      id, team_id: bc.teamId, phien_ban: pb, noi_dung: t.noiDung, dang_dung: false,
      // ⚠️ `nguon` ghi ĐÚNG cái cửa gửi xuống — KHÔNG mặc định thành 'nguoi'. Mặc định ở
      //    đây sẽ che mất đúng cái lỗi bài test đi tìm.
      nguon: t.nguon, duyet_luc: null, ghi_chu: t.ghiChu || '', nguoi_sua: bc.tenDangNhap || '',
    });
    return { id, phienBan: pb };
  },
  ap: async (bc, t) => {
    goiCua.push({ ham: 'ap', teamId: bc.teamId, id: t.id });
    const ds = kho.bang.get('bo_luat_chung');
    const b = ds.find((r) => String(r.id) === String(t.id));
    if (!b) throw new Error(`không có bản id=${t.id}`);
    if (b.dang_dung) throw new Error(`bản v${b.phien_ban} đang áp rồi.`);
    if (b.nguon === 'ai' && !b.duyet_luc) {
      throw new Error(`bản v${b.phien_ban} là ĐỀ XUẤT CỦA AI và chưa ai duyệt.`);
    }
    const cu = ds.find((r) => r.dang_dung && String(r.team_id ?? '') === String(bc.teamId));
    if (cu) cu.dang_dung = false;
    b.dang_dung = true;
    return { laLui: false, anhHuong: { soPage: 2, soPageDangBatBot: 2 } };
  },
  duyet: async (bc, t) => {
    goiCua.push({ ham: 'duyet', teamId: bc.teamId, id: t.id });
    const b = kho.bang.get('bo_luat_chung').find((r) => String(r.id) === String(t.id));
    if (!b) throw new Error(`không có bản id=${t.id}`);
    b.duyet_luc = new Date().toISOString();
    b.duyet_boi = bc.tenDangNhap || '';
    return { duyetLuc: b.duyet_luc };
  },
};
bl.datCuaBoLuat(cua);
dx.datCuaBoLuat(cua);
bl.datPheuNhatKy(async (bc, ban) => taoTruyVan(bc).them('nhat_ky', {
  hanh_dong: ban.hanhDong, doi_tuong_loai: ban.doiTuongLoai ?? null,
  doi_tuong_id: ban.doiTuongId == null ? null : String(ban.doiTuongId), ghi_chu: ban.ghiChu ?? null,
}));

const chanDangNhap = () => (req, res, next) => (
  req.boiCanh ? next() : res.status(401).json({ ok: false, ma: 'chua_dang_nhap' })
);
const chanVai = (...vai) => {
  const can = vai.flat().filter(Boolean).map(String);
  return (req, res, next) => {
    if (!req.boiCanh) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap' });
    if (can.some((v) => req.boiCanh.vai.includes(v))) return next();
    return res.status(403).json({ ok: false, ma: 'thieu_vai' });
  };
};
for (const m of [bl, dx]) { m.datChanDangNhap(chanDangNhap); m.datChanVai(chanVai); }

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const team = req.headers['x-thu-team'];
  if (team) {
    req.boiCanh = {
      nguoiDungId: 'u_' + team, tenDangNhap: 'an@talpha.vn', teamId: String(team),
      vai: String(req.headers['x-thu-vai'] || 'quan-tri').split(','), nguon: 'phien', ip: null,
    };
  }
  next();
});
app.use(bl.taoRouterBoLuat());
app.use(dx.taoRouterDeXuat());

const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref();
const goc = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((r) => server.close(r)));

async function goi(duong, { team = 't1', vai = 'quan-tri', method = 'GET', than } = {}) {
  const res = await fetch(goc + duong, {
    method,
    headers: { 'x-thu-team': team, 'x-thu-vai': vai, ...(than ? { 'content-type': 'application/json' } : {}) },
    body: than ? JSON.stringify(than) : undefined,
  });
  const d = (res.headers.get('content-type') || '').includes('json') ? await res.json().catch(() => null) : await res.text();
  return { res, d };
}
const dong = (id) => kho.docThang('bo_luat_chung').find((r) => String(r.id) === String(id));

/* ══════════════════ TIÊU CHÍ NGHIỆM THU: HAI ĐƯỜNG KHÁC NHAU ══════════════════ */

test('§9 · đường NGƯỜI VIẾT — lưu rồi áp THẲNG, không cần ai duyệt', async () => {
  const { res, d } = await goi('/api/bo-luat/nhap', {
    method: 'POST', than: { noiDung: DAI('# BẢN NGƯỜI GÕ'), ghiChu: 'sửa tay' },
  });
  assert.equal(res.status, 200, JSON.stringify(d));
  assert.equal(dong(d.id).nguon, 'nguoi', 'cửa của người phải ghi nguon=nguoi');

  const ap = await goi(`/api/bo-luat/${d.id}/ap`, { method: 'POST', than: { lyDo: 'ok' } });
  assert.equal(ap.res.status, 200, 'bản người viết phải áp thẳng được: ' + JSON.stringify(ap.d));
  assert.equal(dong(d.id).dang_dung, true);
});

test('§9 · đường AI ĐỀ XUẤT — áp NGAY thì BỊ CHẶN, duyệt xong mới áp được', async () => {
  const { res, d } = await goi('/api/ai-de-xuat', {
    method: 'POST', than: { noiDung: DAI('# BẢN AI NGHĨ'), ghiChu: 'AI đề nghị bỏ câu hứa ngày giao' },
  });
  assert.equal(res.status, 200, JSON.stringify(d));
  assert.equal(dong(d.id).nguon, 'ai', 'cửa AI phải ghi nguon=ai');
  assert.equal(d.daDuyet, false);

  // ① áp ngay → chặn
  const som = await goi(`/api/bo-luat/${d.id}/ap`, { method: 'POST', than: { lyDo: 'thử lách' } });
  assert.equal(som.res.status, 400, 'áp bản AI chưa duyệt phải bị chặn, nhận ' + som.res.status);
  assert.equal(som.d.ma, 'ai_chua_duyet');
  assert.equal(dong(d.id).dang_dung, false, 'bị chặn mà vẫn áp được là hỏng cả tiêu chí');

  // ② duyệt → ③ áp được
  const duyet = await goi(`/api/ai-de-xuat/${d.id}/duyet`, { method: 'POST', than: { ghiChu: 'đọc rồi, được' } });
  assert.equal(duyet.res.status, 200, JSON.stringify(duyet.d));
  assert.ok(dong(d.id).duyet_luc, 'phải đóng dấu ai duyệt, lúc nào');

  const sau = await goi(`/api/bo-luat/${d.id}/ap`, { method: 'POST', than: { lyDo: 'duyệt rồi' } });
  assert.equal(sau.res.status, 200, 'duyệt xong phải áp được: ' + JSON.stringify(sau.d));
  assert.equal(dong(d.id).dang_dung, true);
});

test('§9 · DUYỆT ≠ ÁP — màn đề xuất KHÔNG có đường áp nào', async () => {
  // Nếu một ngày ai đó thêm `POST /api/ai-de-xuat/:id/ap` cho tiện, hai người thành một cú bấm.
  const r = await goi('/api/ai-de-xuat/moi1/ap', { method: 'POST', than: {} });
  assert.notEqual(r.res.status, 200, 'màn đề xuất không được có đường áp');
});

/* ══════════════════ KHÔNG LÁCH ĐƯỢC QUA THAM SỐ ══════════════════ */

test('cửa của NGƯỜI bỏ qua `nguon` gửi từ trình duyệt', async () => {
  const { d } = await goi('/api/bo-luat/nhap', {
    method: 'POST', than: { noiDung: DAI('# LÁCH 1'), ghiChu: 'x', nguon: 'ai' },
  });
  assert.equal(dong(d.id).nguon, 'nguoi', 'trình duyệt không được tự đặt nguon');
});

// ĐÃ THỬ PHÁ ĐỂ KIỂM (25/08): `nguon='ai'` được chốt ở HAI tầng — router không chuyền
// `req.body.nguon` xuống, và tầng dưới cũng ghi cứng. Phá MỘT tầng thì bài dưới vẫn xanh, vì
// tầng kia còn đỡ và hành vi vẫn đúng; phá CẢ HAI mới đỏ. Đó là đúng — bài test canh HÀNH VI,
// không canh cách viết. Ai thấy nó xanh sau khi mình vừa nới một tầng thì đừng vội mừng.
test('cửa của AI bỏ qua `nguon` gửi từ trình duyệt — chiều NGUY HIỂM hơn', async () => {
  // Chiều này mới là chiều mất tiền: đánh dấu một bản AI thành 'nguoi' để áp thẳng, khỏi duyệt.
  const { d } = await goi('/api/ai-de-xuat', {
    method: 'POST', than: { noiDung: DAI('# LÁCH 2'), ghiChu: 'x', nguon: 'nguoi' },
  });
  assert.equal(dong(d.id).nguon, 'ai', 'không được để trình duyệt hạ bản AI xuống thành bản người');
  const ap = await goi(`/api/bo-luat/${d.id}/ap`, { method: 'POST', than: {} });
  assert.equal(ap.res.status, 400, 'bản lách vẫn phải bị cửa áp chặn');
});

/* ══════════════════ LUẬT CỦA MÀN ══════════════════ */

test('đề xuất KHÔNG có lý do thì từ chối', async () => {
  const { res, d } = await goi('/api/ai-de-xuat', {
    method: 'POST', than: { noiDung: DAI('# KHÔNG LÝ DO'), ghiChu: '   ' },
  });
  assert.equal(res.status, 400);
  assert.equal(d.ma, 'thieu_ly_do');
});

test('đề xuất quá ngắn thì từ chối', async () => {
  const { res, d } = await goi('/api/ai-de-xuat', { method: 'POST', than: { noiDung: 'ngắn', ghiChu: 'x' } });
  assert.equal(res.status, 400);
  assert.equal(d.ma, 'qua_ngan');
});

/* ══════════════════ PHÂN QUYỀN & TEAM ══════════════════ */

test('quản lý XEM được, GHI thì 403', async () => {
  const xem = await goi('/api/ai-de-xuat', { vai: 'quan-ly' });
  assert.equal(xem.res.status, 200);
  assert.equal(xem.d.suaDuoc, false, 'quản lý không được thấy mình sửa được');

  const ghi = await goi('/api/ai-de-xuat', {
    vai: 'quan-ly', method: 'POST', than: { noiDung: DAI('# QL'), ghiChu: 'x' },
  });
  assert.equal(ghi.res.status, 403);
});

test('sale không vào được màn này', async () => {
  const r = await goi('/api/ai-de-xuat', { vai: 'sale' });
  assert.equal(r.res.status, 403);
});

test('chỉ thấy đề xuất của TEAM MÌNH, và chỉ bản nguon=ai', async () => {
  const { d } = await goi('/api/ai-de-xuat');
  assert.ok(d.deXuat.length > 0, 'phải có bản AI đã tạo ở các bài trên');
  assert.ok(d.deXuat.every((x) => x.tang === 'bo_luat_chung'));
  // bản `bx` của t2 cũng là nguon=ai — không được lọt sang.
  const ids = d.deXuat.map((x) => String(x.id));
  assert.ok(!ids.includes('bx'), 'bản của team khác lọt vào danh sách');
  // và bản người viết cũng không được trộn vào.
  assert.ok(!ids.includes('b1'), 'bản người viết không thuộc màn này');
});

/* ══════════════════ MÀN RỖNG PHẢI NÓI VÌ SAO RỖNG ══════════════════ */

test('team chưa có đề xuất nào → nói RÕ là «bình thường», không phải «chưa cài đặt»', async () => {
  const r = await goi('/api/ai-de-xuat', { team: 't3' });
  assert.equal(r.res.status, 200);
  assert.equal(r.d.deXuat.length, 0);
  assert.ok(r.d.trong, 'màn rỗng phải kèm lời giải thích');
  assert.equal(r.d.trong.vi, 'xong', 'rỗng vì XONG, không phải vì chưa cài đặt xong');
  assert.match(r.d.trong.noi, /bình thường/i);
});

test('ba tầng — tầng nào chưa nhận được đề xuất phải nói LÝ DO bằng cột thật', async () => {
  const { d } = await goi('/api/ai-de-xuat');
  assert.equal(d.tang.length, 3, 'kế hoạch nói đề xuất ở CẢ BA tầng');
  const chua = d.tang.filter((t) => !t.duoc);
  assert.ok(chua.length > 0, 'hôm nay mới một tầng nhận được — nếu hết thì sửa lại bài test');
  for (const t of chua) {
    assert.ok(t.vi && t.vi.length > 40, `tầng ${t.ma} chưa nhận được mà không nói vì sao`);
    assert.match(t.vi, /cột|bảng/i, `lý do của tầng ${t.ma} phải chỉ ra cột/bảng thật`);
  }
});

/* ══════════════════ CHƯA NỐI CỬA THÌ TỪ CHỐI ══════════════════ */

test('chưa nối cửa ghi → TỪ CHỐI, không ghi vòng', async () => {
  dx.datCuaBoLuat(null);
  const { res, d } = await goi('/api/ai-de-xuat', {
    method: 'POST', than: { noiDung: DAI('# KHÔNG CỬA'), ghiChu: 'x' },
  });
  assert.equal(res.status, 500);
  assert.equal(d.ma, 'chua_noi');
  dx.datCuaBoLuat(cua);
});
