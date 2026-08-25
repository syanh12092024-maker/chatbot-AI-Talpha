// `goiModel()` — CỬA DUY NHẤT NGƯỜI A DÙNG (điểm bàn giao #4)
//
// Tiêu chí nghiệm thu đo ở đây:
//   ② NẠP NÓNG — gọi `goiModel` (đếm model đã dùng qua `fetchFn` giả) → `ghiCauHinh` đổi
//     model chính → gọi lại TRONG CÙNG MỘT TIẾN TRÌNH, KHÔNG khởi động lại gì → lời gọi
//     thứ hai đi ĐÚNG MODEL MỚI.
//   ⑪ Mỗi lượt gọi (KỂ CẢ LƯỢT LỖI) đều gọi phễu Sổ AI đúng một lần, bản ghi có `maModel`.
//
// Vì sao ⑪ quan trọng đến thế: thiếu `ma_model` mỗi lượt thì sau này không so được model
// nào rẻ hơn THẬT (đo bằng tiền mỗi ĐƠN) — đó là lý do tồn tại của cả lớp model.
//
// KHÔNG lời gọi nào ra Internet: mọi thứ đi qua `fetchFn` giả.

import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';

import {
  goiModel, datPheuSoAi, xoaSachSoAi, NHIP_KEU_CHUA_TIEM,
  datTaoTruyVan, datPheuNhatKy, datPheuCanhBao, xoaSachCauHinh,
  ghiCauHinh, docCauHinh, datKhoKhoa,
  datDongHo, xoaSucKhoe, dangHongThuan,
  datNgu, xoaSachDuPhong, LoiCaHaiNhaHong,
  LoiThieuBoiCanh, LoiNhaCungCap, LoiModelLa, VIEC,
} from '../../src/model/index.js';
import { TEN_BIEN_KHOA_CHU } from '../../src/model/kho-khoa.js';
import { taoBoiCanh, boiCanhMay } from '../../src/auth/boi-canh.js';
import { dungCongGia } from '../../testkit/db-gia.js';

process.env[TEN_BIEN_KHOA_CHU] = randomBytes(32).toString('base64');
for (const n of ['V3_KHOA_KIMI', 'V3_KHOA_CLAUDE', 'V3_KHOA_OPENAI', 'V3_KHOA_DEEPSEEK']) delete process.env[n];

const KHOA = {
  kimi: 'sk-kimi-gia-000000000000',
  claude: 'sk-claude-gia-0000000000',
  openai: 'sk-openai-gia-0000000000',
  deepseek: 'sk-deepseek-gia-00000000',
};

const bcCua = (teamId) => taoBoiCanh({
  nguoiDungId: `u-${teamId}`, tenDangNhap: `nguoi-${teamId}`, teamId, vai: ['quan-tri'],
});
const yeuCau = (them = {}) => ({ messages: [{ role: 'user', content: 'giá bao nhiêu' }], max_tokens: 400, ...them });

const THAN_ANTHROPIC = JSON.stringify({
  id: 'msg_01', role: 'assistant',
  content: [{ type: 'text', text: 'Dạ 99 SAR ạ' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3053, output_tokens: 167, cache_read_input_tokens: 8390 },
});
const THAN_OPENAI = JSON.stringify({
  id: 'chatcmpl_01',
  choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Dạ 99 SAR ạ' } }],
  usage: { prompt_tokens: 11443, completion_tokens: 167, prompt_tokens_details: { cached_tokens: 8390 } },
});

function nhaTuUrl(url) {
  const u = String(url);
  if (u.includes('moonshot')) return 'kimi';
  if (u.includes('anthropic')) return 'claude';
  if (u.includes('openai')) return 'openai';
  return 'deepseek';
}

let gio = 1_000_000;

/** Nền sạch: kho giả đã nối, bốn phễu giả, đồng hồ giả, hàm nghỉ giả. */
function dungNen() {
  xoaSachCauHinh(); xoaSachSoAi(); xoaSucKhoe(); xoaSachDuPhong();
  gio = 1_000_000;
  datDongHo(() => gio);
  datNgu(async (ms) => { gio += ms; });
  const { kho, taoTruyVan } = dungCongGia();
  datTaoTruyVan(taoTruyVan);
  // KHO KHOÁ GIẢ — mô phỏng `khoa_nha` của người A (migration 008). Từ 008 khoá không còn
  // nằm trong `cau_hinh_model`; lớp model nhận kho khoá qua `datKhoKhoa`.
  const khoaNha = new Map();
  const kN = (t, n) => `${t}|${n}`;
  datKhoKhoa({
    coKhoa: async (t, n) => khoaNha.has(kN(t, n)),
    docKhoa: async (t, n) => khoaNha.get(kN(t, n)) ?? null,
    ghiKhoa: async (t, n, v) => { khoaNha.set(kN(t, n), v); return 1; },
  });
  const soAi = [];
  datPheuSoAi((ban) => { soAi.push(ban); });
  const nhatKy = [];
  datPheuNhatKy((bc, ban) => { nhatKy.push({ teamId: bc.teamId, ...ban }); });
  const canhBao = [];
  datPheuCanhBao((c) => { canhBao.push(c); });
  return { kho, soAi, nhatKy, canhBao, khoaNha };
}

/**
 * `fetchFn` giả — ghi lại MÃ MODEL thật đã gửi đi, vì tiêu chí ② đòi "đếm model đã dùng
 * qua fetchFn giả", không phải tin vào giá trị lớp model tự báo.
 */
function dungFetch(luat = {}) {
  const goi = [];
  const fn = async (url, tuyChon) => {
    const nha = nhaTuUrl(url);
    const than = JSON.parse(tuyChon.body);
    goi.push({ nha, maGoiApi: than.model, temperature: than.temperature, than });
    const d = luat[nha];
    if (d === 'mang') throw new TypeError('fetch failed');
    if (d === undefined || d === 'ok') {
      return {
        ok: true, status: 200,
        text: async () => (nha === 'kimi' || nha === 'claude' ? THAN_ANTHROPIC : THAN_OPENAI),
      };
    }
    return {
      ok: false, status: d,
      text: async () => JSON.stringify({ error: { message: d === 402 ? 'insufficient balance' : `lỗi ${d}` } }),
    };
  };
  return { fn, goi, model: () => goi.map((g) => g.maGoiApi) };
}

async function batLoi(fn) {
  try { await fn(); } catch (e) { return e; }
  return assert.fail('mong đợi một lỗi, nhưng không có lỗi nào');
}

const khoaChoTeam = (bc) => ghiCauHinh(bc, { khoa: { ...KHOA } });

// ---- BỐI CẢNH ----------------------------------------------------------------------

test('bối cảnh · thiếu boiCanh thì ném LoiThieuBoiCanh, KHÔNG gọi mạng, KHÔNG ghi Sổ AI', async () => {
  const { soAi } = dungNen();
  const f = dungFetch();
  assert.ok(await batLoi(() => goiModel({ yeuCau: yeuCau(), fetchFn: f.fn })) instanceof LoiThieuBoiCanh);
  assert.ok(await batLoi(() => goiModel({ boiCanh: {}, yeuCau: yeuCau(), fetchFn: f.fn })) instanceof LoiThieuBoiCanh);
  assert.equal(f.goi.length, 0);
  // Thiếu bối cảnh là GỌI SAI, không phải một lượt chat hỏng — ghi vào sổ là bịa ra một
  // lượt chưa từng xảy ra, mà cũng chẳng có teamId để ghi.
  assert.equal(soAi.length, 0);
});

test('bối cảnh · vé MÁY (bot trả lời lúc 3 giờ sáng) vẫn gọi được', async () => {
  const { soAi } = dungNen();
  const f = dungFetch();
  const bc = boiCanhMay('t1', 'bot trả lời khách');
  await khoaChoTeam(bc);
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq.maModel, 'kimi-k2.6');
  assert.equal(soAi[0].teamId, 't1');
});

// ---- TIÊU CHÍ ② · NẠP NÓNG ---------------------------------------------------------

test('tiêu chí ② · đổi model chính rồi gọi lại TRONG CÙNG TIẾN TRÌNH → lời gọi sau đi model mới', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();

  const kq1 = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq1.maModel, 'kimi-k2.6');
  assert.deepEqual(f.model(), ['kimi-k2.6'], 'đếm bằng chính thân gói gửi đi, không tin lời tự khai');

  // Đổi model. KHÔNG khởi động lại gì, không xoá đệm bằng tay, không chờ hết hạn 5 giây.
  await ghiCauHinh(bc, { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });

  const kq2 = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq2.maModel, 'claude-haiku-4.5');
  assert.deepEqual(f.model(), ['kimi-k2.6', 'claude-haiku-4-5']);
  assert.equal(f.goi[1].nha, 'claude');
});

test('tiêu chí ② · đổi model của team này KHÔNG đổi model của team kia', async () => {
  dungNen();
  const a = bcCua('t1'); const b = bcCua('t2');
  await khoaChoTeam(a); await khoaChoTeam(b);
  const f = dungFetch();

  await goiModel({ boiCanh: a, yeuCau: yeuCau(), fetchFn: f.fn });
  await goiModel({ boiCanh: b, yeuCau: yeuCau(), fetchFn: f.fn });
  await ghiCauHinh(a, { chinh: 'claude-haiku-4.5', duPhong: 'kimi-k2.6' });

  const kqA = await goiModel({ boiCanh: a, yeuCau: yeuCau(), fetchFn: f.fn });
  const kqB = await goiModel({ boiCanh: b, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kqA.maModel, 'claude-haiku-4.5');
  assert.equal(kqB.maModel, 'kimi-k2.6');
});

test('tiêu chí ② · đổi ĐỘ NGẪU NHIÊN cũng ăn ngay ở lượt kế tiếp', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();
  await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(f.goi[0].temperature, 0.3);
  await ghiCauHinh(bc, { doNgauNhien: 0.9 });
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(f.goi[1].temperature, 0.9);
  assert.equal(kq.doNgauNhien, 0.9);
});

// ---- ĐỘ NGẪU NHIÊN -----------------------------------------------------------------

test('độ ngẫu nhiên · không truyền thì lấy của team; việc nền lấy do_ngau_nhien_nen', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();

  const chot = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(chot.doNgauNhien, 0.3);
  assert.equal(f.goi[0].temperature, 0.3);

  const nen = await goiModel({ boiCanh: bc, viec: VIEC.NEN, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(nen.doNgauNhien, 0.1);
  assert.equal(nen.maModel, 'deepseek-v4-flash');
  assert.equal(f.goi[1].temperature, 0.1);
});

test('độ ngẫu nhiên · nơi gọi truyền tay thì THẮNG cấu hình team', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau({ temperature: 0 }), fetchFn: f.fn });
  assert.equal(kq.doNgauNhien, 0);
  assert.equal(f.goi[0].temperature, 0);
});

// ---- TIÊU CHÍ ⑪ · PHỄU SỔ AI -------------------------------------------------------

test('tiêu chí ⑪ · lượt CHẠY ĐƯỢC gọi phễu Sổ AI đúng một lần, bản ghi đủ cột', async () => {
  const { soAi } = dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();

  const kq = await goiModel({
    boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn, nhan: { pageId: 'p1', custId: 'c1', lane: 'chot' },
  });
  assert.equal(soAi.length, 1);
  const b = soAi[0];
  assert.equal(b.maModel, 'kimi-k2.6');
  assert.equal(b.nhaCungCap, 'kimi');
  assert.equal(b.teamId, 't1');
  assert.deepEqual(b.token, { vao: 3053, ra: 167, cacheDoc: 8390, cacheGhi: 0 });
  assert.equal(b.tienUsd, kq.tienUsd);
  assert.equal(b.tienVnd, kq.tienVnd);
  assert.ok(b.tienVnd > 0);
  assert.equal(b.daChuyenDuPhong, false);
  assert.equal(b.doNgauNhien, 0.3);
  assert.equal(b.thanhCong, true);
  assert.deepEqual(b.nhan, { pageId: 'p1', custId: 'c1', lane: 'chot' });
  assert.ok(Number.isFinite(b.msChay));
});

test('tiêu chí ⑪ · lượt LỖI cũng ghi đúng MỘT lần, và bản ghi vẫn có maModel', async () => {
  const { soAi } = dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch({ kimi: 402, claude: 402 });

  assert.ok(await batLoi(() => goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn })) instanceof LoiCaHaiNhaHong);
  assert.equal(soAi.length, 1);
  assert.equal(soAi[0].thanhCong, false);
  assert.ok(soAi[0].maModel, 'lượt lỗi mà không có ma_model thì Sổ AI chỉ có phần đẹp');
  assert.equal(soAi[0].loi.ma, 'ca_hai_nha_hong');
  assert.deepEqual(soAi[0].token, { vao: 0, ra: 0, cacheDoc: 0, cacheGhi: 0 });
  assert.equal(soAi[0].tienUsd, 0);
});

test('tiêu chí ⑪ · lượt lỗi 400 vẫn ghi Sổ AI, maModel là model đã thử', async () => {
  const { soAi } = dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch({ kimi: 400 });
  const e = await batLoi(() => goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn }));
  assert.ok(e instanceof LoiNhaCungCap);
  assert.equal(soAi.length, 1);
  assert.equal(soAi[0].maModel, 'kimi-k2.6');
  assert.equal(soAi[0].nhaCungCap, 'kimi');
  assert.equal(soAi[0].thanhCong, false);
});

test('tiêu chí ⑪ · lỗi từ CHÍNH lớp model (mã model lạ trong cấu hình) cũng để lại một dòng', async () => {
  const { soAi, kho } = dungNen();
  const bc = bcCua('t1');
  // Hình BA DÒNG của lược đồ thật (`UNIQUE (team_id, vai_tro)`), không phải hình một-dòng
  // mà bản trước của lớp cấu hình từng giả định.
  kho.gieo('cau_hinh_model', [
    { id: 'g1', team_id: 't1', vai_tro: 'chinh', nha_cung_cap: 'kimi',
      ma_model: 'model-khong-co-that', do_ngau_nhien: 0.3, bat: true, sua_luc: 'x' },
    { id: 'g2', team_id: 't1', vai_tro: 'du_phong', nha_cung_cap: 'claude',
      ma_model: 'claude-haiku-4.5', do_ngau_nhien: null, bat: true, sua_luc: 'x' },
    { id: 'g3', team_id: 't1', vai_tro: 'nen', nha_cung_cap: 'deepseek',
      ma_model: 'deepseek-v4-flash', do_ngau_nhien: 0.1, bat: true, sua_luc: 'x' },
  ]);
  const f = dungFetch();
  assert.ok(await batLoi(() => goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn })) instanceof LoiModelLa);
  assert.equal(soAi.length, 1);
  assert.equal(soAi[0].thanhCong, false);
  assert.equal(f.goi.length, 0);
});

test('tiêu chí ⑪ · lượt chuyển dự phòng ghi `daChuyenDuPhong: true` và mã model THẬT đã chạy', async () => {
  const { soAi } = dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch({ kimi: 402 });
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq.daChuyenDuPhong, true);
  assert.equal(soAi.length, 1);
  assert.equal(soAi[0].daChuyenDuPhong, true);
  // "mã model THẬT đã chạy, không phải mã đã cấu hình" — hợp đồng mục 2.
  assert.equal(soAi[0].maModel, 'claude-haiku-4.5');
  assert.equal(soAi[0].nhaCungCap, 'claude');
});

test('phễu Sổ AI · ném lỗi thì NUỐT — sổ hỏng không được làm chết lượt chat', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  datPheuSoAi(() => { throw new Error('sổ AI sập'); });
  const f = dungFetch();
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq.maModel, 'kimi-k2.6');
  assert.ok(kq.traLoi.content[0].text.includes('99 SAR'));
});

test('phễu Sổ AI · chưa tiêm thì kêu mỗi 100 lượt — không im lặng, cũng không ồn', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  datPheuSoAi(null);
  const f = dungFetch();

  const goc = console.warn;
  const keu = [];
  console.warn = (...a) => { if (String(a[0]).includes('PHỄU SỔ AI')) keu.push(String(a[0])); };
  try {
    for (let i = 0; i < NHIP_KEU_CHUA_TIEM + 1; i++) {
      await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
    }
  } finally { console.warn = goc; }
  assert.equal(keu.length, 2, `${NHIP_KEU_CHUA_TIEM + 1} lượt thì phải kêu đúng 2 lần (lượt 1 và lượt 101)`);
});

// ---- HÌNH DẠNG TRẢ VỀ --------------------------------------------------------------

test('trả về · `traLoi` thay thẳng giá trị messages.create — closer.js dùng nguyên, không sửa', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();
  const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });

  assert.equal(kq.traLoi.role, 'assistant');
  assert.ok(Array.isArray(kq.traLoi.content));
  assert.equal(kq.traLoi.content[0].type, 'text');
  assert.equal(kq.traLoi.stop_reason, 'end_turn');
  assert.equal(kq.traLoi.usage.input_tokens, 3053);
  assert.deepEqual(Object.keys(kq).sort(), [
    'daChuyenDuPhong', 'doNgauNhien', 'maModel', 'msChay', 'nhaCungCap', 'tienUsd', 'tienVnd', 'token', 'traLoi',
  ]);
});

test('trả về · họ OpenAI cũng ra ĐÚNG hình dạng Anthropic (việc nền chạy deepseek)', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();
  const kq = await goiModel({ boiCanh: bc, viec: VIEC.NEN, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(kq.nhaCungCap, 'deepseek');
  assert.equal(kq.traLoi.role, 'assistant');
  assert.equal(kq.traLoi.content[0].type, 'text');
  assert.equal(kq.traLoi.stop_reason, 'end_turn');
});

// ---- NỐI CẢ ĐƯỜNG: CẤU HÌNH + SỨC KHOẺ + NHẬT KÝ + CẢNH BÁO ------------------------

test('cả đường · hết tiền nhà chính: chuyển dự phòng, báo một lần, ghi nhật ký, Sổ AI đủ 3 lượt', async () => {
  const { soAi, nhatKy, canhBao } = dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  nhatKy.length = 0;
  const f = dungFetch({ kimi: 402 });

  for (let i = 0; i < 3; i++) {
    const kq = await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
    assert.equal(kq.daChuyenDuPhong, true);
    assert.equal(kq.maModel, 'claude-haiku-4.5');
  }
  assert.equal(soAi.length, 3, 'mỗi lượt đúng một dòng Sổ AI');
  assert.equal(canhBao.length, 1, 'một sự việc, một tiếng chuông');
  assert.equal(nhatKy.filter((x) => x.hanhDong === 'chuyen_du_phong').length, 1);
  assert.equal(f.goi.filter((g) => g.nha === 'kimi').length, 1, 'nhà đã hỏng thì không gọi lại nữa');
  assert.equal(dangHongThuan('t1', 'kimi'), true);
});

test('cả đường · đổi khoá xong thì lượt kế tiếp mang khoá mới, không khởi động lại', async () => {
  dungNen();
  const bc = bcCua('t1');
  await khoaChoTeam(bc);
  const f = dungFetch();
  await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });

  await ghiCauHinh(bc, { khoa: { kimi: 'sk-kimi-MOI-11111111111111' } });
  const c = await docCauHinh(bc);
  assert.equal(c.khoa.kimi, 'sk-kimi-MOI-11111111111111');
  await goiModel({ boiCanh: bc, yeuCau: yeuCau(), fetchFn: f.fn });
  assert.equal(f.goi.length, 2);
});
