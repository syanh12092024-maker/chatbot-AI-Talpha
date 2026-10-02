// PHIẾU VE7c · «CÀI ĐẶT › MODEL AI» THEO BẢN VẼ 4 — «Màn chỉ hiện thứ bot THẬT SỰ dùng»: hai thẻ theo vai (trả lời khách ·
// dự phòng), việc nền ẩn tới khi có việc nối vào, số page bot mới đang xử đếm bằng CÙNG luật worker, và «Thay khoá và thử
// một lượt» gọi ĐÚNG model + khoá MỘT lần.
// Vai «trả lời khách» đọc bằng ĐƯỜNG CHỌN CỦA BOT (`src/chat/model.js#chonModel` — chính hàm `layModel` gọi), KHÔNG bằng
// lớp v3: đo 30/09 trên prod, 3/4 team chưa có dòng `cau_hinh_model` ⇒ bot gọi `MODEL_CLOSER` bằng `KIMI_API_KEY`, còn lớp
// v3 báo «chưa có khoá» (nó đọc `V3_KHOA_<NHÀ>`, prod không đặt). Ca dựng ĐÚNG trạng thái đó.
// Thật: `chonModel` · `khoaCuaBot` · `maHoa` · `goiMotLan` (dựng yêu cầu, phân loại lỗi, che khoá) · máy chủ vai-b · script
// trang (vm + `testkit/dom-gia.js`). Giả: MẠNG nhà model, và pool pg (trả lời ĐÚNG hai câu SQL của bot, câu lạ ⇒ ném).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

const KHOA_DAN = 'sk-kimi-DAN-TREN-MAN-0123456789abcdef';
const KHOA_MAY_CHU = 'sk-kimi-KIMI_API_KEY-may-chu-9876543210';
process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_MA_HOA = crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';   // cầu sang tiến trình bot đóng chắc chắn — ca không gọi bot thật
// Đúng hình prod (đo 30/09): AI_PROVIDER=kimi · MODEL_CLOSER=kimi-k2.6 · có CẢ KIMI_API_KEY lẫn ANTHROPIC_API_KEY · KHÔNG có
// V3_KHOA_<NHÀ> nào. Khoá Anthropic có mặt mà bot KHÔNG được mượn (claude ≠ AI_PROVIDER) — ca C5/C8/C9 canh đúng chỗ đó.
const KHOA_ANT_MAY_CHU = 'sk-ant-ANTHROPIC_API_KEY-khong-duoc-muon';
Object.assign(process.env, { AI_PROVIDER: 'kimi', MODEL_CLOSER: 'kimi-k2.6', KIMI_API_KEY: KHOA_MAY_CHU, ANTHROPIC_API_KEY: KHOA_ANT_MAY_CHU });
for (const n of ['V3_KHOA_KIMI', 'V3_KHOA_CLAUDE', 'V3_KHOA_OPENAI', 'V3_KHOA_DEEPSEEK', 'KIMI_BASE_URL']) delete process.env[n];

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const { xoaSachCauHinh } = await import('../../src/model/cau-hinh.js');
const { goiMotLan } = await import('../../src/model/goi-mot-lan.js');
const { chonModel, khoaCuaBot, layModel } = await import('../../../src/chat/model.js');
const { maHoa } = await import('../../../db/khoa.js');
const km = await import('../../src/ui/model/kho-model.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const bcQt = () => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt@talpha.vn', teamId: 't1', vai: [VAI.QUAN_TRI] });

/** Mạng giả của nhà model: ghi lại từng lượt gọi; lời gọi thử đi qua `goiMotLan` THẬT. */
const TRA_LOI_OK = { id: 'msg_1', role: 'assistant', content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn',
  usage: { input_tokens: 14, output_tokens: 1 } };
function mangGia(tra = { status: 200, json: TRA_LOI_OK }, { timeoutMs } = {}) {
  const goi = [];
  const fn = (url, o) => {
    goi.push({ url, headers: o.headers, than: JSON.parse(o.body) });
    if (tra === 'treo') return new Promise((_, tuChoi) => o.signal.addEventListener('abort', () => tuChoi(new Error('aborted'))));
    if (tra.nem) return Promise.reject(new Error(tra.nem));
    return Promise.resolve({ ok: tra.status >= 200 && tra.status < 300, status: tra.status,
      text: async () => (tra.than ?? JSON.stringify(tra.json ?? {})) });
  };
  km.datGoiThu((o) => goiMotLan({ ...o, ...(timeoutMs ? { timeoutMs } : {}), fetchFn: fn }));
  return goi;
}
const loiNha = (status, message) => ({ status, json: { type: 'error', error: { type: 'loi', message } } });

/** Pool pg giả cho ĐƯỜNG CHỌN CỦA BOT: đọc cùng kho giả (dòng `cau_hinh_model` màn vừa ghi) + kho khoá (mã hoá thật). */
function poolGia(kho, khoaNha) {
  return {
    query: async (sql, [a, b] = []) => {
      const t = String(sql).replace(/\s+/g, ' ');
      if (t.includes('FROM cau_hinh_model WHERE team_id=$1 AND vai_tro=$2 AND bat LIMIT 1')) {
        const rows = kho.docThang('cau_hinh_model').filter((r) => String(r.team_id) === String(a) && r.vai_tro === b && r.bat !== false)
          .slice(0, 1).map((r) => ({ nha_cung_cap: r.nha_cung_cap, ma_model: r.ma_model, do_ngau_nhien: r.do_ngau_nhien }));
        return { rows, rowCount: rows.length };
      }
      if (t.includes('SELECT khoa_api_ma FROM khoa_nha WHERE team_id = $1 AND nha_cung_cap = $2')) {
        const v = khoaNha.get(`${a}|${b}`);
        return v ? { rows: [{ khoa_api_ma: maHoa(v) }], rowCount: 1 } : { rows: [], rowCount: 0 };
      }
      throw new Error(`pool giả chưa biết câu SQL này — bot đổi câu hỏi? «${t.slice(0, 90)}»`);
    },
  };
}

async function dungThu({ vai = 'quan-tri', noiDuongBot = true } = {}) {
  xoaSachCauHinh();
  km.xoaThu();
  const mk = await bam('matkhau1');
  const { kho, taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true }],
    vai: [{ id: 'v1', ma: vai, ten: vai }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }],
    // CR-02-10 · MB2: bot xử đúng page có `bot_ai_bat = true` (luật worker) — `111` bật; cột cũ `giao_bot_moi` KHÔNG tính.
    page: [
      { id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', bot_ai_bat: true },
      { id: 'p2', team_id: 't1', page_id: '222', ten: 'Page B', giao_bot_moi: true },
      { id: 'p3', team_id: 't1', page_id: '333', ten: 'Page C' },
    ],
  });
  const khoaNha = new Map();
  const khoKhoa = {
    coKhoa: async (t, n) => khoaNha.has(`${t}|${n}`),
    docKhoa: async (t, n) => khoaNha.get(`${t}|${n}`) ?? null,
    ghiKhoa: async (t, n, v) => { khoaNha.set(`${t}|${n}`, v); return 1; },
  };
  const pool = poolGia(kho, khoaNha);
  // y hệt `v3/chay-that.js` — cùng hai hàm, cùng tham số
  const duongBot = noiDuongBot ? {
    chon: (bc) => chonModel(pool, { teamId: bc.teamId }, { vaiTro: 'chinh' }),
    khoa: (bc, nha) => khoaCuaBot(pool, { teamId: bc.teamId, nhaCungCap: nha }),
  } : undefined;
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express, khoKhoa, duongBot });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@talpha.vn', matKhau: 'matkhau1' }) });
  const cookie = dn.headers.get('set-cookie').split(';')[0];
  const post = (duong, than) => fetch(`${goc}${duong}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', cookie },
    body: JSON.stringify(than) });
  return { goc, sv, cookie, kho, khoaNha, pool, post };
}
const nhatKy = (kho, hanhDong) => kho.docThang('nhat_ky').filter((r) => r.hanh_dong === hanhDong)
  .map((r) => ({ ...r, sau: typeof r.sau === 'string' ? JSON.parse(r.sau) : r.sau }));
const datEnv = (t, bien) => {
  const cu = Object.fromEntries(Object.keys(bien).map((k) => [k, process.env[k]]));
  Object.assign(process.env, bien);
  t.after(() => { for (const [k, v] of Object.entries(cu)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });
};
const moMan = (o) => moTrang('model/trang/model-ai.html', { goc: o.goc, cookie: o.cookie, duong: '/model-ai' });
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();

test('C1 · HÌNH PROD: team chưa lưu cấu hình ⇒ màn nói bot gọi model MÁY CHỦ bằng KIMI_API_KEY (không «chưa có khoá» giả); đếm page theo luật worker', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  mangGia();
  const m = await moMan(o);
  assert.deepEqual(m.document.querySelectorAll('[data-the]').map((x) => x.dataset.the), ['chinh', 'duPhong']);
  const suThat = chu(m.$('#suThat'));
  assert.match(suThat, /Màn chỉ hiện thứ bot THẬT SỰ dùng\./);
  assert.match(suThat, /đang xử 1\/3 page của team/, 'đếm theo cột bot_ai_bat (luật worker) — cột giao_bot_moi cũ KHÔNG tính');
  assert.match(suThat, /Bot cũ .*KHÔNG gửi độ ngẫu nhiên/);
  // bot THẬT: model máy chủ + KIMI_API_KEY + không gửi độ ngẫu nhiên — không phải «bộ mặc định» của lớp v3
  assert.match(chu(m.$('[data-bot-dung]')), /^Bot đang gọi kimi-k2\.6 — model của MÁY CHỦ \(MODEL_CLOSER\), khoá chung của máy chủ \(KIMI_API_KEY\), KHÔNG gửi độ ngẫu nhiên\. Team chưa lưu cấu hình riêng/);
  assert.match(chu(m.$('#dauPhai')), /Chưa lưu cấu hình riêng — bot dùng model của máy chủ/);
  assert.doesNotMatch(chu(m.$('#dauPhai')), /bộ mặc định/);
  assert.equal(chu(m.$('[data-tt-khoa="chinh"]')), '(khoá chung của máy chủ · KIMI_API_KEY)');
  assert.doesNotMatch(chu(m.$('#bang-tin')), /chưa có khoá|không gọi được|rơi thẳng sang dự phòng/i, 'báo động giả: bot đang có khoá thật');
  // dự phòng theo lớp v3 (V3_KHOA_<NHÀ>) — chưa nối nên không có hộp đỏ, thẻ tự nói
  assert.equal(chu(m.$('[data-tt-khoa="duPhong"]')), '(chưa có khoá)');
  assert.match(chu(m.$('[data-the="chinh"]')), /Đang dùng/);
  assert.doesNotMatch(chu(m.$('[data-the="chinh"]')), /Bot v3 đọc ô này/, 'team chưa lưu cấu hình thì bot KHÔNG đọc ô này — thẻ đã nói bot gọi gì');
  assert.equal(chu(m.$('output[for="nn"]')), '0,3');
  assert.match(chu(m.$('[data-the="duPhong"]')), /Chưa nối/);
  assert.ok(m.$('[data-thu="chinh"]') && m.$('[data-thu="duPhong"]'), 'thiếu nút thử của một thẻ');
  assert.equal(m.$('#ghiChuNen').hidden, false);
  assert.match(m.$('#ghiChuNen').textContent, /^Việc nền: chưa việc nào dùng — ô này ẩn .*Đang lưu: deepseek-v4-flash · độ ngẫu nhiên 0,1\.$/);
  assert.equal(nhatKy(o.kho, 'thu_model').length, 0, 'mở màn KHÔNG được gọi thử');
  // máy chủ không trả khoá ra màn
  const d = await (await fetch(`${o.goc}/api/model/cau-hinh`, { headers: { Accept: 'application/json', cookie: o.cookie } })).text();
  assert.ok(!d.includes(KHOA_MAY_CHU), 'khoá máy chủ lọt ra màn');
  // cùng luật worker (cột bot_ai_bat); chưa nối cổng ⇒ «chưa đo», không phải 0
  assert.deepEqual((await km.manModel(bcQt())).botMoi, { soPage: 1, tong: 3, viSao: null });
  const cu = km.datTaoTruyVanMan(null);
  t.after(() => km.datTaoTruyVanMan(cu));
  const mu = (await km.manModel(bcQt())).botMoi;
  assert.equal(mu.soPage, null);
  assert.match(mu.viSao, /chưa nối cổng truy vấn/);
});

test('C2 · dán khoá + thử: lưu khoá (đủ ba dòng cấu hình) RỒI gọi bằng KHOÁ VỪA DÁN — thắng KIMI_API_KEY; bot chuyển sang cấu hình riêng; nhật ký không chứa khoá', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const mang = mangGia();
  const m = await moMan(o);
  m.$('#khoa-chinh').value = KHOA_DAN;
  await m.$('[data-thu="chinh"]').click();
  await m.cho();
  const post = m.goi.filter((g) => g.phuongThuc === 'POST');
  assert.deepEqual(post.map((g) => g.duong), ['/api/model/khoa', '/api/model/thu'], 'phải lưu khoá TRƯỚC rồi mới thử');
  assert.deepEqual(post[0].than, { nha: 'kimi', khoa: KHOA_DAN });
  assert.deepEqual(post[1].than, { vai: 'chinh' });
  assert.equal(mang.length, 1, 'đúng MỘT lượt gọi nhà model');
  const hd = JSON.stringify(mang[0].headers);
  assert.ok(hd.includes(KHOA_DAN) && !hd.includes(KHOA_MAY_CHU), 'lượt thử phải dùng khoá VỪA DÁN (khoá bot dùng từ giờ), không phải KIMI_API_KEY');
  assert.equal(mang[0].than.max_tokens, 16);
  assert.equal(mang[0].than.temperature, 0.3, 'bot đi cấu hình riêng gửi độ ngẫu nhiên của dòng');
  assert.match(JSON.stringify(mang[0].than.messages), /Trả lời đúng một chữ: OK/);
  assert.equal(o.kho.docThang('cau_hinh_model').length, 3, 'lưu khoá phải ghi đủ ba dòng cấu hình — thiếu thì bot vẫn đi model máy chủ, bỏ qua khoá team');
  assert.match(chu(m.$('[data-ket-thu="chinh"]')), /kimi-k2\.6: Khoá dùng được \(khoá riêng của team\) · trả lời sau \d+,\d giây/);
  assert.match(chu(m.$('[data-the="chinh"]')), /Khoá dùng được/);
  assert.ok(m.loa.includes('kimi-k2.6: khoá dùng được.'), `toast: ${m.loa.join(' | ')}`);
  assert.equal(chu(m.$('[data-tt-khoa="chinh"]')), '(khoá riêng của team)');
  assert.equal(chu(m.$('[data-bot-dung]')), 'Bot đang gọi kimi-k2.6 · khoá riêng của team · độ ngẫu nhiên 0,3.');
  assert.doesNotMatch(chu(m.$('#dauPhai')), /Chưa lưu cấu hình riêng/);
  // lớp v3 còn phát «chưa dán khoá cho 3/4 nhà — … không chọn được model của nhà đó»: sai (chọn được, chỉ không gọi được) ⇒ không hiện
  assert.doesNotMatch(chu(m.$('#bang-tin')), /không chọn được/);
  const [thu] = nhatKy(o.kho, 'thu_model');
  assert.deepEqual([thu.sau.ok, thu.sau.maModel, thu.sau.nha, thu.sau.nguon, thu.sau.duong], [true, 'kimi-k2.6', 'kimi', 'team', 'cau_hinh_model']);
  assert.equal(nhatKy(o.kho, 'doi_khoa').length, 1);
  assert.ok(!JSON.stringify(o.kho.docThang('nhat_ky')).includes(KHOA_DAN), 'khoá lọt vào nhật ký (bảng không sửa được)');
});

test('C3 · nhà model trả 401 ⇒ HTTP 200 + «Khoá bị từ chối (401) — khoá chung của máy chủ · KIMI_API_KEY», KHÔNG đá ra trang đăng nhập', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const mang = mangGia(loiNha(401, 'invalid x-api-key'));
  const m = await moMan(o);
  await m.$('[data-thu="chinh"]').click();
  await m.cho();
  assert.deepEqual(m.goi.filter((g) => g.phuongThuc === 'POST').map((g) => g.duong), ['/api/model/thu'], 'ô khoá trống ⇒ thử khoá đang có, không ghi khoá');
  assert.equal(m.location.di, undefined, '401 của NHÀ MODEL biến thành 401 của màn ⇒ người dùng bị đá ra đăng nhập');
  assert.ok(JSON.stringify(mang[0].headers).includes(KHOA_MAY_CHU), 'team chưa cấu hình ⇒ thử đúng khoá máy chủ bot đang dùng');
  assert.match(chu(m.$('[data-ket-thu="chinh"]')), /kimi-k2\.6: Khoá bị từ chối \(401\) — khoá chung của máy chủ · KIMI_API_KEY/);
  assert.match(chu(m.$('[data-the="chinh"]')), /Khoá bị từ chối \(401\)/);
  assert.equal(o.kho.docThang('cau_hinh_model').length, 0, 'thử KHÔNG được ghi cấu hình (không đổi đường bot)');
  const [thu] = nhatKy(o.kho, 'thu_model');
  assert.deepEqual([thu.sau.ok, thu.sau.status, thu.sau.nguon, thu.sau.duong], [false, 401, 'may_chu', 'config']);
  km.xoaThu();
  const r = await o.post('/api/model/thu', { vai: 'chinh' });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.deepEqual([d.ok, d.ket.ok, d.ket.status, d.ket.ma], [true, false, 401, 'loi_nha_cung_cap']);
});

test('C4 · bấm dồn ⇒ lượt thứ hai bị chặn (429 «vừa thử xong — chờ N giây»), nhà model chỉ bị gọi MỘT lần', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const mang = mangGia();
  const m = await moMan(o);
  await m.$('[data-thu="chinh"]').click();
  await m.cho();
  await m.$('[data-thu="duPhong"]').click();   // vai khác, CÙNG team — chặn theo team (mỗi lượt là một lời gọi tốn tiền)
  await m.cho();
  assert.match(m.$('[data-ket-thu="duPhong"]').textContent, /vừa thử xong — chờ \d+ giây rồi thử lại\./);
  assert.deepEqual(m.goi.filter((g) => g.duong === '/api/model/thu').map((g) => g.than.vai), ['chinh', 'duPhong'], 'nút của thẻ nào thử vai đó');
  assert.equal(mang.length, 1);
  const r = await o.post('/api/model/thu', { vai: 'chinh' });
  assert.equal(r.status, 429);
  assert.equal((await r.json()).ma, 'thu_qua_nhanh');
  assert.equal(mang.length, 1);
});

test('C5 · đổi model trong ô chọn mà CHƯA lưu ⇒ không gọi gì; ô khoá đi theo nhà mới và nói theo LUẬT BOT (claude ≠ AI_PROVIDER ⇒ bot không mượn khoá máy chủ)', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const mang = mangGia();
  const m = await moMan(o);
  const chon = m.$('#vai-chinh');
  chon.value = 'claude-sonnet-5';
  await chon.phat('change');
  assert.equal(m.$('#khoa-chinh').dataset.khoaNha, 'claude', 'ô khoá phải đi theo NHÀ của model vừa chọn');
  assert.equal(m.$('[data-ten-nha="chinh"]').textContent, 'Anthropic Claude');
  assert.equal(chu(m.$('[data-tt-khoa="chinh"]')), '(chưa có khoá — bot sẽ KHÔNG gọi được)');
  assert.match(chu(m.$('#vai-chinh')), /claude-sonnet-5 — Anthropic Claude \(chưa có khoá\)/);
  assert.doesNotMatch(chu(m.$('#vai-chinh')), /kimi-k2\.6 — Moonshot Kimi \(chưa có khoá\)/, 'kimi có KIMI_API_KEY cho bot');
  m.$('#khoa-chinh').value = 'sk-ant-khong-duoc-gui';
  await m.$('[data-thu="chinh"]').click();
  await m.cho();
  assert.match(m.$('[data-ket-thu="chinh"]').textContent, /Bạn vừa đổi sang claude-sonnet-5 mà chưa lưu .*model đang LƯU: kimi-k2\.6/);
  assert.equal(m.goi.filter((g) => g.phuongThuc === 'POST').length, 0, 'chưa lưu model mà vẫn ghi khoá/gọi thử');
  assert.equal(mang.length, 0);
});

test('C6 · quản lý CHỈ XEM: không nút thử, ô khoá + nút lưu chết; gọi thẳng đường thử ⇒ 403, nhà model không bị gọi', async (t) => {
  const o = await dungThu({ vai: 'quan-ly' });
  t.after(() => o.sv.close());
  const mang = mangGia();
  const m = await moMan(o);
  assert.equal(m.document.querySelectorAll('[data-thu]').length, 0);
  assert.equal(m.$('#khoa-chinh').disabled, true);
  assert.equal(m.$('#nutLuu').disabled, true);
  assert.equal(m.$('#ghiChuLuu').textContent, 'Vai của bạn chỉ xem được.');
  const r = await o.post('/api/model/thu', { vai: 'chinh' });
  assert.equal(r.status, 403);
  assert.equal((await r.json()).ma, 'thieu_vai');
  await assert.rejects(km.thuModel(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'ql@t.vn', teamId: 't1', vai: [VAI.QUAN_LY] }), { vai: 'chinh' }),
    (e) => e.name === 'LoiThieuVai');
  assert.equal(mang.length, 0);
  assert.equal(nhatKy(o.kho, 'thu_model').length, 0);
});

test('C7 · lỗi → câu người đọc được (qua `goiMotLan` THẬT); dự phòng thử theo lớp v3 (V3_KHOA_<NHÀ>); khoá không lọt; vai lạ bị từ chối', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const thu = async (tra, tuy, vai = 'chinh') => { km.xoaThu(); const goi = mangGia(tra, tuy); return { kq: await km.thuModel(bcQt(), { vai }), goi }; };

  await km.luuCauHinh(bcQt(), { chinh: 'kimi-k2.6', duPhong: 'claude-haiku-4.5' });
  await km.luuCauHinh(bcQt(), { khoa: { kimi: KHOA_DAN } });   // đường thật của màn: dán khoá team
  const b = await thu(loiNha(402, 'insufficient balance'));
  assert.equal(b.kq.chu, 'Tài khoản hết tiền (402) — khoá riêng của team');
  assert.match((await thu(loiNha(429, 'rate limited'))).kq.chu, /^Nhà model đang giới hạn lượt gọi \(429\)/);
  const c = await thu(loiNha(500, `upstream echo ${KHOA_DAN}`));
  assert.match(c.kq.chu, /^Lỗi nhà model \(500\): /);
  assert.ok(!c.kq.chu.includes(KHOA_DAN), 'khoá lọt vào câu lỗi hiện trên màn');
  assert.match((await thu({ nem: 'getaddrinfo ENOTFOUND' })).kq.chu, /^Lỗi nhà model: /);
  const h = await thu('treo', { timeoutMs: 30 });
  assert.equal(h.kq.ma, 'het_gio');
  assert.match(h.kq.chu, /^Quá 20 giây không trả lời/);

  // dự phòng: lớp v3 — chưa có V3_KHOA_CLAUDE lẫn khoá team claude ⇒ ném TRƯỚC khi gọi mạng; đặt biến ⇒ gọi bằng biến đó
  const dp = await thu(undefined, undefined, 'duPhong');
  assert.equal(dp.kq.chu, 'Chưa có khoá của Anthropic Claude');
  assert.equal(dp.goi.length, 0);
  datEnv(t, { V3_KHOA_CLAUDE: 'sk-ant-V3-env-000111' });
  const dp2 = await thu(undefined, undefined, 'duPhong');
  assert.equal(dp2.kq.ok, true);
  assert.match(dp2.kq.chu, /^Khoá dùng được \(khoá chung của máy chủ · V3_KHOA_CLAUDE\)/);
  assert.ok(JSON.stringify(dp2.goi[0].headers).includes('sk-ant-V3-env-000111'));

  assert.ok(!JSON.stringify(o.kho.docThang('nhat_ky')).includes(KHOA_DAN), 'khoá lọt vào nhật ký (bảng không sửa được)');
  assert.equal(nhatKy(o.kho, 'thu_model').length, 7);
  km.xoaThu();
  await assert.rejects(km.thuModel(bcQt(), { vai: 'nen' }), (e) => e instanceof km.LoiCauHinh && /chỉ thử được vai/.test(e.message));
  const r = await o.post('/api/model/thu', { vai: 'nen' });
  assert.equal(r.status, 400);
});

test('C8 · bot KHÔNG gọi được (model chính nhà Claude, không khoá team, Claude ≠ AI_PROVIDER) ⇒ hộp đỏ + thẻ nói thẳng; nút thử không gọi mạng', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  await km.luuCauHinh(bcQt(), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  const mang = mangGia();
  const m = await moMan(o);
  const bt = chu(m.$('#bang-tin'));
  assert.match(bt, /Bot không gọi được model trả lời khách/);
  assert.match(bt, /claude-haiku-4\.5 \(Anthropic Claude\) chưa có khoá — mọi lượt trả lời khách của bot mới sẽ hỏng\./);
  assert.match(chu(m.$('[data-bot-dung]')), /^Bot KHÔNG gọi được: claude-haiku-4\.5 chưa có khoá\./);
  assert.equal(chu(m.$('[data-tt-khoa="chinh"]')), '(chưa có khoá — bot sẽ KHÔNG gọi được)');
  await m.$('[data-thu="chinh"]').click();
  await m.cho();
  assert.match(chu(m.$('[data-ket-thu="chinh"]')), /claude-haiku-4\.5: Chưa có khoá của Anthropic Claude — bot KHÔNG gọi được model này/);
  assert.equal(mang.length, 0);
  const [thu] = nhatKy(o.kho, 'thu_model');
  assert.deepEqual([thu.sau.ok, thu.sau.maModel], [false, 'claude-haiku-4.5']);
  // đường bot chưa nối ⇒ «chưa đo», và vai chính KHÔNG được thử bằng luật khác
  const o2 = await dungThu({ noiDuongBot: false });
  t.after(() => o2.sv.close());
  const m2 = await moMan(o2);
  assert.match(chu(m2.$('[data-bot-dung]')), /Chưa đo được bot đang gọi model nào/);
  assert.equal(chu(m2.$('[data-tt-khoa="chinh"]')), '(chưa đo được bot dùng khoá nào)');
  const k2 = await km.thuModel(bcQt(), { vai: 'chinh' });
  assert.deepEqual([k2.ok, k2.ma], [false, 'chua_noi_duong_bot']);
  assert.equal(mang.length, 0);
  // đọc đường bot hỏng (CSDL…) ⇒ «chưa đo», KHÔNG đổ thành «bot không gọi được»
  const cu = km.datDuongBot({ chon: async () => { throw new Error('connect ECONNREFUSED 127.0.0.1:5432'); }, khoa: async () => { throw new Error('ECONNREFUSED'); } });
  t.after(() => km.datDuongBot(cu));
  const bd = (await km.manModel(bcQt())).botDung;
  assert.equal(bd.loi, null);
  assert.match(bd.chuaDo, /ECONNREFUSED/);
});

test('C9 · MỘT luật: `chonModel` (màn) ≡ `layModel` (bot) trên mọi nhánh — model, nhà, khoá gửi đi, độ ngẫu nhiên, lỗi', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const ctx = { teamId: 't1' };
  const botGui = async () => {
    const goi = [];
    const lm = await layModel(o.pool, ctx, { vaiTro: 'chinh', goi: async (x) => { goi.push(x); return { traLoi: { content: [] } }; } });
    if (lm.nguon === 'cau_hinh_model') await lm.client.messages.create({ model: lm.maModel, max_tokens: 5, messages: [{ role: 'user', content: 'x' }] });
    return { lm, goi };
  };
  // ① chưa có dòng ⇒ đường máy chủ (client cũ của llm.js)
  let c = await chonModel(o.pool, ctx);
  let b = await botGui();
  assert.deepEqual([c.nguon, c.maModel, c.nhaCungCap, c.khoa, c.nguonKhoa, c.bienMayChu, c.doNgauNhien],
    ['config', 'kimi-k2.6', 'kimi', KHOA_MAY_CHU, 'may_chu', 'KIMI_API_KEY', null]);
  assert.deepEqual([b.lm.nguon, b.lm.maModel, b.lm.nhaCungCap], [c.nguon, c.maModel, c.nhaCungCap]);
  // ② có dòng kimi, chưa khoá team ⇒ mượn KIMI_API_KEY (kimi = AI_PROVIDER)
  await km.luuCauHinh(bcQt(), { chinh: 'kimi-k2.6', duPhong: 'claude-haiku-4.5', doNgauNhien: 0.45 });
  c = await chonModel(o.pool, ctx);
  b = await botGui();
  assert.deepEqual([c.nguon, c.khoa, c.nguonKhoa, c.doNgauNhien], ['cau_hinh_model', KHOA_MAY_CHU, 'may_chu', 0.45]);
  assert.deepEqual([b.goi[0].ma, b.goi[0].khoa, b.goi[0].yeuCau.temperature], [c.maModel, c.khoa, c.doNgauNhien]);
  // ③ dán khoá team ⇒ khoá team thắng
  o.khoaNha.set('t1|kimi', KHOA_DAN);
  c = await chonModel(o.pool, ctx);
  b = await botGui();
  assert.deepEqual([c.khoa, c.nguonKhoa, b.goi[0].khoa], [KHOA_DAN, 'team', KHOA_DAN]);
  // ④ nhà khác AI_PROVIDER, không khoá team ⇒ CẢ HAI ném cùng lỗi, cùng lý do
  await km.luuCauHinh(bcQt(), { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });
  const e1 = await chonModel(o.pool, ctx).catch((e) => e);
  const e2 = await layModel(o.pool, ctx).catch((e) => e);
  assert.deepEqual([e1.name, e1.lyDo, e1.message], ['LoiChuaCoLopModel', 'thieu_khoa', 'Provider đã chọn chưa có API key của team']);
  assert.deepEqual([e2.name, e2.lyDo, e2.message], [e1.name, e1.lyDo, e1.message]);
  // khoá theo nhà cho ô chọn: cùng luật
  assert.deepEqual(await khoaCuaBot(o.pool, { teamId: 't1', nhaCungCap: 'claude' }), { khoa: null, nguonKhoa: null, bienMayChu: null });
  assert.deepEqual(await khoaCuaBot(o.pool, { teamId: 't1', nhaCungCap: 'kimi' }), { khoa: KHOA_DAN, nguonKhoa: 'team', bienMayChu: null });
});
