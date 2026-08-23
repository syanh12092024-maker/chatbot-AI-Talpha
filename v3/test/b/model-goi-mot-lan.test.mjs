// GỌI MỘT MODEL MỘT LẦN — L1-M4a
//
// Bốn thứ file này canh, đều là chỗ đã trả giá thật hoặc sẽ trả giá thật:
//   ① Độ ngẫu nhiên LUÔN được gửi (bản đang chạy không đặt → bot mỗi lượt một kiểu).
//   ② Thiếu khoá thì ném TRƯỚC KHI gọi mạng (gọi rồi mới biết là đốt một vòng 401 vô ích,
//      và 401 đó lại bị bộ dự phòng đọc thành "tài khoản hỏng" rồi đổi nhà oan).
//   ③ Lỗi tầng tài khoản (hết tiền / sai khoá) tách được khỏi lỗi thoáng qua — 08–10/08/2026
//      tài khoản Kimi hết tiền, bot chết 2 ngày mà dashboard vẫn xanh.
//   ④ Khoá API KHÔNG BAO GIỜ lọt vào thông điệp lỗi.

import test from 'node:test';
import assert from 'node:assert/strict';

import { goiMotLan, MAC_DINH_DO_NGAU_NHIEN, MAC_DINH_TIMEOUT_MS } from '../../src/model/goi-mot-lan.js';
import {
  LoiModelLa, LoiThieuKhoa, LoiThamSo, LoiNhaCungCap, LoiHetGio,
  laLoiTaiKhoan, veSinhChuoi, LOI_TAI_KHOAN, STATUS_TAI_KHOAN, CHE,
} from '../../src/model/loi.js';
import { MA_NHA } from '../../src/model/nha/index.js';

const KHOA = 'sk-test-KHOA-BI-MAT-khong-duoc-ro-ra-ngoai-0123456789';

const MODEL_CUA_NHA = {
  claude: 'claude-haiku-4.5',
  kimi: 'kimi-k2.6',
  openai: 'gpt-5.6-luna',
  deepseek: 'deepseek-v4-flash',
};
const HO_ANTHROPIC = new Set(['claude', 'kimi']);

const yeuCau = (them = {}) => ({
  system: 'ngắn gọn',
  messages: [{ role: 'user', content: 'giá bao nhiêu' }],
  max_tokens: 400,
  ...them,
});

const TRA_LOI_ANTHROPIC = {
  id: 'msg_01', role: 'assistant',
  content: [{ type: 'text', text: 'Dạ 99 SAR ạ' }],
  stop_reason: 'end_turn',
  usage: { input_tokens: 3053, output_tokens: 167, cache_read_input_tokens: 8390, cache_creation_input_tokens: 0 },
};
const TRA_LOI_OPENAI = {
  id: 'chatcmpl_01',
  choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'Dạ 99 SAR ạ' } }],
  usage: { prompt_tokens: 11443, completion_tokens: 167, prompt_tokens_details: { cached_tokens: 8390 } },
};
const traLoiCuaNha = (maNha) => (HO_ANTHROPIC.has(maNha) ? TRA_LOI_ANTHROPIC : TRA_LOI_OPENAI);

function fetchGia({ status = 200, than, json } = {}) {
  const goi = [];
  const fn = async (url, tuyChon) => {
    goi.push({ url, tuyChon, than: JSON.parse(tuyChon.body) });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (than !== undefined ? than : JSON.stringify(json ?? {})),
    };
  };
  fn.goi = goi;
  return fn;
}

/** `fetch` giả KHÔNG BAO GIỜ trả lời — chỉ chịu thua khi bị AbortController huỷ. */
function fetchTreo() {
  const goi = [];
  const fn = (url, tuyChon) => new Promise((_, tuChoi) => {
    goi.push({ url });
    tuyChon.signal.addEventListener('abort', () => {
      const e = new Error('The operation was aborted');
      e.name = 'AbortError';
      tuChoi(e);
    });
  });
  fn.goi = goi;
  return fn;
}

// ---- TIÊU CHÍ XONG #5 · LUÔN GỬI ĐỘ NGẪU NHIÊN -------------------------------------

test('độ ngẫu nhiên · không truyền thì thân gửi đi vẫn có temperature 0.3 — cả bốn nhà', async () => {
  assert.equal(MAC_DINH_DO_NGAU_NHIEN, 0.3);
  for (const maNha of MA_NHA) {
    const fk = fetchGia({ json: traLoiCuaNha(maNha) });
    const kq = await goiMotLan({ ma: MODEL_CUA_NHA[maNha], khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk });
    assert.equal(fk.goi[0].than.temperature, 0.3, `${maNha}: thân gửi đi không có temperature 0.3`);
    assert.equal(kq.doNgauNhien, 0.3, `${maNha}: kết quả không ghi lại độ ngẫu nhiên đã dùng`);
  }
});

test('độ ngẫu nhiên · truyền thì dùng đúng giá trị đó, kể cả 0', async () => {
  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  const kq = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau({ temperature: 0 }), fetchFn: fk });
  assert.equal(fk.goi[0].than.temperature, 0);
  assert.equal(kq.doNgauNhien, 0);

  const fk1 = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau({ temperature: 1 }), fetchFn: fk1 });
  assert.equal(fk1.goi[0].than.temperature, 1);
});

test('độ ngẫu nhiên · ngoài [0,1] thì chặn TRƯỚC KHI gọi mạng', async () => {
  for (const xau of [-0.1, 1.1, 2, NaN, 'nóng']) {
    const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
    await assert.rejects(
      () => goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau({ temperature: xau }), fetchFn: fk }),
      LoiThamSo,
      `temperature ${xau} phải bị chặn`,
    );
    assert.equal(fk.goi.length, 0, `temperature ${xau}: đã lỡ gọi mạng`);
  }
});

// ---- TIÊU CHÍ XONG #6 · THIẾU KHOÁ THÌ KHÔNG GỌI MẠNG ------------------------------

test('thiếu khoá · ném LoiThieuKhoa và KHÔNG gọi mạng', async () => {
  for (const khoa of [undefined, null, '', '   ', 123]) {
    const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
    await assert.rejects(
      () => goiMotLan({ ma: 'kimi-k2.6', khoa, yeuCau: yeuCau(), fetchFn: fk }),
      LoiThieuKhoa,
      `khoá ${JSON.stringify(khoa)} phải bị chặn`,
    );
    assert.equal(fk.goi.length, 0, `khoá ${JSON.stringify(khoa)}: fetchFn giả đã bị gọi`);
  }
});

test('mã model lạ · ném LoiModelLa và KHÔNG gọi mạng', async () => {
  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await assert.rejects(() => goiMotLan({ ma: 'gpt-9000', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk }), LoiModelLa);
  assert.equal(fk.goi.length, 0);
});

test('yêu cầu rỗng · ném LoiThamSo và KHÔNG gọi mạng', async () => {
  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await assert.rejects(() => goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: { messages: [] }, fetchFn: fk }), LoiThamSo);
  await assert.rejects(() => goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, fetchFn: fk }), LoiThamSo);
  assert.equal(fk.goi.length, 0);
});

// ---- TIÊU CHÍ XONG #7 · TÁCH LỖI TẦNG TÀI KHOẢN ------------------------------------

test('lỗi nhà cung cấp · HTTP 402 là lỗi tài khoản, HTTP 500 thì không', async () => {
  const f402 = fetchGia({ status: 402, json: { error: { message: 'insufficient balance, please recharge' } } });
  const e402 = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: f402 }).catch((e) => e);
  assert.ok(e402 instanceof LoiNhaCungCap);
  assert.equal(e402.laLoiTaiKhoan, true);
  assert.equal(e402.status, 402);
  assert.equal(e402.maNha, 'kimi');
  assert.match(e402.thongDiep, /insufficient balance/);

  const f500 = fetchGia({ status: 500, json: { error: { message: 'internal server error' } } });
  const e500 = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: f500 }).catch((e) => e);
  assert.ok(e500 instanceof LoiNhaCungCap);
  assert.equal(e500.laLoiTaiKhoan, false, '500 là lỗi thoáng qua — đánh dấu là lỗi tài khoản sẽ khoá nhà oan');
  assert.equal(e500.status, 500);
});

test('lỗi nhà cung cấp · 401/403 cũng là lỗi tài khoản; 500 mang chữ hết tiền cũng vậy', async () => {
  for (const st of STATUS_TAI_KHOAN) {
    const f = fetchGia({ status: st, json: { error: { message: 'nope' } } });
    const e = await goiMotLan({ ma: 'claude-haiku-4.5', khoa: KHOA, yeuCau: yeuCau(), fetchFn: f }).catch((x) => x);
    assert.equal(e.laLoiTaiKhoan, true, `HTTP ${st} phải là lỗi tài khoản`);
  }
  // Bộ nhận diện theo CHỮ, chép từ src/llm-health.js dòng 20 — Moonshot từng trả
  // "insufficient balance" kèm status không phải 4xx.
  const f = fetchGia({ status: 500, json: { error: { message: 'insufficient_quota for this key' } } });
  const e = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: f }).catch((x) => x);
  assert.equal(e.laLoiTaiKhoan, true);
});

test('bộ nhận diện lỗi tài khoản · giữ nguyên biểu thức của bản đang chạy', () => {
  for (const s of [
    'insufficient balance, please recharge',
    'You exceeded your current quota',
    'invalid api key',
    'authentication_error',
    'permission_error',
    'account suspended',
  ]) assert.ok(LOI_TAI_KHOAN.test(s), `phải nhận ra: ${s}`);
  assert.equal(LOI_TAI_KHOAN.test('gateway timeout'), false);
  assert.equal(laLoiTaiKhoan('gateway timeout', 500), false);
  assert.equal(laLoiTaiKhoan('gateway timeout', 401), true);
});

test('lỗi nhà cung cấp · đứt mạng thì đánh dấu laLoiMang, status 0', async () => {
  const fk = async () => { throw new Error('fetch failed: ECONNREFUSED'); };
  const e = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk }).catch((x) => x);
  assert.ok(e instanceof LoiNhaCungCap);
  assert.equal(e.laLoiMang, true);
  assert.equal(e.status, 0);
  assert.equal(e.laLoiTaiKhoan, false);
});

test('lỗi nhà cung cấp · thân trả về không phải JSON thì báo rõ, không ném TypeError', async () => {
  const fk = fetchGia({ status: 200, than: '<html>502 Bad Gateway</html>' });
  const e = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk }).catch((x) => x);
  assert.ok(e instanceof LoiNhaCungCap);
  assert.match(e.thongDiep, /không phải JSON/);
});

test('KHÔNG tự thử lại — thử lại là việc của L1-M4c', async () => {
  const fk = fetchGia({ status: 500, json: { error: { message: 'oops' } } });
  await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk }).catch(() => {});
  assert.equal(fk.goi.length, 1, 'lớp này chỉ được gọi ĐÚNG MỘT LẦN');
});

// ---- HẾT GIỜ -----------------------------------------------------------------------

test('hết giờ · quá timeoutMs thì huỷ bằng AbortController và ném LoiHetGio', async () => {
  assert.equal(MAC_DINH_TIMEOUT_MS, 60000);
  const fk = fetchTreo();
  const e = await goiMotLan({
    ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), timeoutMs: 30, fetchFn: fk,
  }).catch((x) => x);
  assert.ok(e instanceof LoiHetGio, `phải là LoiHetGio, đang là ${e?.name}`);
  assert.equal(e.timeoutMs, 30);
  assert.equal(e.maNha, 'kimi');
  assert.equal(fk.goi.length, 1);
});

// ---- TIÊU CHÍ XONG #8 · KHÔNG RÒ KHOÁ ----------------------------------------------

test('không rò khoá · khoá không xuất hiện trong BẤT KỲ thông điệp lỗi nào', async () => {
  const chuaKhoa = (x) => String(x).includes(KHOA);

  const canh = [
    // Nhà cung cấp vọng lại nguyên văn khoá trong thân lỗi — có thật, hay gặp ở 401.
    { ten: '401 vọng lại khoá', fetchFn: fetchGia({ status: 401, json: { error: { message: `Incorrect API key provided: ${KHOA}` } } }) },
    { ten: '500 vọng lại khoá', fetchFn: fetchGia({ status: 500, json: { error: { message: `boom ${KHOA}` } } }) },
    // Lỗi mạng mang khoá trong thông điệp (ví dụ URL có khoá).
    { ten: 'đứt mạng', fetchFn: async () => { throw new Error(`connect failed for key ${KHOA}`); } },
    // Thân không phải JSON, chứa khoá.
    { ten: 'thân rác', fetchFn: fetchGia({ status: 200, than: `rác ${KHOA} rác` }) },
  ];

  for (const c of canh) {
    const e = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: c.fetchFn }).catch((x) => x);
    assert.ok(e instanceof Error, `${c.ten}: phải ném lỗi`);
    assert.equal(chuaKhoa(e.message), false, `${c.ten}: khoá lọt vào err.message`);
    assert.equal(chuaKhoa(JSON.stringify(e)), false, `${c.ten}: khoá lọt vào JSON.stringify(err)`);
    assert.equal(chuaKhoa(e.stack || ''), false, `${c.ten}: khoá lọt vào err.stack`);
    assert.ok(String(e.message).includes(CHE) || !chuaKhoa(e.message));
  }
});

test('không rò khoá · kết quả TRẢ VỀ khi thành công cũng không mang khoá', async () => {
  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  const kq = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk });
  assert.equal(JSON.stringify(kq).includes(KHOA), false);
});

test('vệ sinh chuỗi · thay bí mật, bỏ qua chuỗi quá ngắn', () => {
  assert.equal(veSinhChuoi(`a ${KHOA} b`, KHOA), `a ${CHE} b`);
  assert.equal(veSinhChuoi('không có gì', KHOA), 'không có gì');
  // Bí mật dưới 8 ký tự thì bỏ qua — thay bừa sẽ băm nát thông điệp mà chẳng giấu được gì.
  assert.equal(veSinhChuoi('abc def abc', 'abc'), 'abc def abc');
  assert.equal(veSinhChuoi(null, KHOA), '');
});

// ---- KẾT QUẢ TRẢ VỀ ----------------------------------------------------------------

test('kết quả · đủ token, tiền, mã model thật và thời gian chạy', async () => {
  const cu = process.env.AI_USD_VND;
  process.env.AI_USD_VND = '26000'; // ghim tỉ giá để bài này không phụ thuộc máy chạy
  try {
    const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
    const kq = await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk });

    assert.deepEqual(kq.token, { vao: 3053, ra: 167, cacheDoc: 8390, cacheGhi: 0 });
    assert.equal(kq.maModel, 'kimi-k2.6');
    assert.equal(kq.nhaCungCap, 'kimi');
    assert.ok(kq.tienUsd > 0);
    // Hồ sơ token này chính là hồ sơ nền → tiền một lượt đúng bằng đ/tin của bảng quyết định.
    assert.equal(kq.tienVnd, 128); // 127,68đ làm tròn
    assert.ok(Number.isFinite(kq.msChay) && kq.msChay >= 0);
    assert.equal(kq.traLoi.content[0].text, 'Dạ 99 SAR ạ');
  } finally {
    if (cu === undefined) delete process.env.AI_USD_VND; else process.env.AI_USD_VND = cu;
  }
});

test('kết quả · thân gửi đi mang đúng mã gọi API, không phải mã hệ thống', async () => {
  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await goiMotLan({ ma: 'claude-haiku-4.5', khoa: KHOA, yeuCau: yeuCau(), fetchFn: fk });
  // 'claude-haiku-4.5' là mã hệ thống; nhà cung cấp chỉ nhận 'claude-haiku-4-5'.
  assert.equal(fk.goi[0].than.model, 'claude-haiku-4-5');
});
