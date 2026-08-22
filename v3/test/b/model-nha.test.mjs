// BỐN NHÀ & BỘ DỊCH HÌNH DẠNG — L1-M4a
//
// Hai câu hỏi file này trả lời:
//   ① Cùng MỘT yêu cầu kiểu Anthropic (có `system`, có `tools`) chạy qua CẢ BỐN bản cài
//      thì có ra CÙNG MỘT hình dạng kết quả không.
//   ② Dịch sang họ OpenAI rồi dịch về có mất gì không — đo bằng chính bốn công cụ thật
//      của `src/tools.js`, thứ `closer.js` đang dùng với khách thật.
//
// Không lời gọi nào ra Internet: `fetchFn` giả, và bộ dịch trong `chuan-hoa.js` cố ý
// không biết mạng là gì.

import test from 'node:test';
import assert from 'node:assert/strict';

import { toolDefs } from '../../../src/tools.js';
import {
  sangOpenAI, tuOpenAI, tuAnthropic, thanAnthropic,
  congCuSangOpenAI, congCuTuOpenAI, chonCongCuSangOpenAI, lyDoDungTuOpenAI,
  heThongSangChuoi, noiDungSangOpenAI, MAC_DINH_MAX_TOKENS,
} from '../../src/model/chuan-hoa.js';
import { NHA, layNha, MA_NHA } from '../../src/model/nha/index.js';
import { TAT_SUY_NGHI } from '../../src/model/nha/kimi.js';
import { layModel } from '../../src/model/bang-model.js';
import { goiMotLan } from '../../src/model/goi-mot-lan.js';
import { LoiNhaLa, LoiThamSo } from '../../src/model/loi.js';

// ---- ĐỒ NGHỀ GIẢ -------------------------------------------------------------------

const KHOA = 'sk-test-KHOA-BI-MAT-khong-duoc-ro-ra-ngoai-0123456789';

/** Yêu cầu mẫu — CÙNG MỘT yêu cầu chạy qua cả bốn nhà. */
function yeuCauMau() {
  return {
    system: 'Bạn là nhân viên tư vấn. Trả lời ngắn 1-3 câu.',
    messages: [
      { role: 'user', content: 'giá bao nhiêu vậy shop' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Dạ em kiểm tra giúp anh ạ' },
          { type: 'tool_use', id: 'tu_1', name: 'get_price', input: { product_id: '' } },
        ],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'tu_1', content: '99 SAR' }],
      },
    ],
    max_tokens: 400,
    tools: toolDefs,
    tool_choice: { type: 'auto' },
    stop_sequences: ['\n\nKhách:'],
  };
}

const TRA_LOI_ANTHROPIC = {
  id: 'msg_01',
  model: '(mã của nhà)',
  role: 'assistant',
  content: [
    { type: 'text', text: 'Dạ 99 SAR ạ' },
    { type: 'tool_use', id: 'tu_2', name: 'send_product_image', input: { caption: 'ảnh thật ạ' } },
  ],
  stop_reason: 'tool_use',
  usage: {
    input_tokens: 3053,
    output_tokens: 167,
    cache_read_input_tokens: 8390,
    cache_creation_input_tokens: 0,
  },
};

const TRA_LOI_OPENAI = {
  id: 'chatcmpl_01',
  model: '(mã của nhà)',
  choices: [{
    index: 0,
    finish_reason: 'tool_calls',
    message: {
      role: 'assistant',
      content: 'Dạ 99 SAR ạ',
      tool_calls: [{
        id: 'tu_2',
        type: 'function',
        function: { name: 'send_product_image', arguments: '{"caption":"ảnh thật ạ"}' },
      }],
    },
  }],
  usage: {
    // OpenAI GỘP phần trúng cache vào prompt_tokens: 3053 + 8390 = 11443.
    prompt_tokens: 11443,
    completion_tokens: 167,
    prompt_tokens_details: { cached_tokens: 8390 },
  },
};

/** `fetch` giả — ghi lại mọi lời gọi, không đụng mạng. */
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

/** Một model đại diện cho mỗi nhà. */
const MODEL_CUA_NHA = {
  claude: 'claude-haiku-4.5',
  kimi: 'kimi-k2.6',
  openai: 'gpt-5.6-luna',
  deepseek: 'deepseek-v4-flash',
};

const traLoiCuaNha = (maNha) => (NHA[maNha].ho === 'anthropic' ? TRA_LOI_ANTHROPIC : TRA_LOI_OPENAI);

// ---- SỔ ĐĂNG KÝ --------------------------------------------------------------------

test('sổ nhà · đúng bốn nhà, đủ giao diện chung, mã lạ thì ném lỗi', () => {
  assert.deepEqual([...MA_NHA].sort(), ['claude', 'deepseek', 'kimi', 'openai']);
  for (const maNha of MA_NHA) {
    const n = layNha(maNha);
    assert.equal(n.ma, maNha);
    assert.ok(['anthropic', 'openai'].includes(n.ho), `${maNha}: họ lạ ${n.ho}`);
    assert.match(n.baseUrlMacDinh, /^https:\/\//);
    assert.equal(typeof n.dungGoi, 'function');
    assert.equal(typeof n.docTraLoi, 'function');
  }
  assert.throws(() => layNha('groq'), LoiNhaLa);
});

test('sổ nhà · điểm cuối và cách xác thực đúng bảng của spec', () => {
  const dung = (maNha) => NHA[maNha].dungGoi({
    dong: layModel(MODEL_CUA_NHA[maNha]), khoa: KHOA, yeuCau: yeuCauMau(), doNgauNhien: 0.3,
  });

  const claude = dung('claude');
  assert.equal(claude.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(claude.tuyChon.headers['x-api-key'], KHOA);
  assert.equal(claude.tuyChon.headers['anthropic-version'], '2023-06-01');

  const kimi = dung('kimi');
  assert.equal(kimi.url, 'https://api.moonshot.ai/anthropic/v1/messages');
  assert.equal(kimi.tuyChon.headers['x-api-key'], KHOA);
  assert.equal(kimi.tuyChon.headers['anthropic-version'], '2023-06-01');

  const openai = dung('openai');
  assert.equal(openai.url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(openai.tuyChon.headers.authorization, `Bearer ${KHOA}`);

  const deepseek = dung('deepseek');
  assert.equal(deepseek.url, 'https://api.deepseek.com/v1/chat/completions');
  assert.equal(deepseek.tuyChon.headers.authorization, `Bearer ${KHOA}`);
});

// ---- TIÊU CHÍ XONG #4 · KIMI PHẢI TẮT THINKING -------------------------------------

test('kimi · BẮT BUỘC gửi thinking:{type:"disabled"} · claude KHÔNG được gửi', async () => {
  // BẪY ĐÃ TRẢ GIÁ BẰNG KHÁCH THẬT (src/llm.js dòng 35–39): Kimi k2.6 mặc định BẬT
  // thinking; không tắt thì phần suy nghĩ ăn sạch max_tokens và tin trả về RỖNG
  // (đo thật: max_tokens=200 → thinking_tokens=199, text=""). Claude thì không có trường
  // này — gửi vào là 400. Nên đây là hai bài kiểm ngược nhau, không phải một.
  assert.deepEqual(TAT_SUY_NGHI, { thinking: { type: 'disabled' } });

  const fk = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await goiMotLan({ ma: 'kimi-k2.6', khoa: KHOA, yeuCau: yeuCauMau(), fetchFn: fk });
  assert.deepEqual(fk.goi[0].than.thinking, { type: 'disabled' });

  const fc = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await goiMotLan({ ma: 'claude-haiku-4.5', khoa: KHOA, yeuCau: yeuCauMau(), fetchFn: fc });
  assert.equal('thinking' in fc.goi[0].than, false, 'Claude KHÔNG được nhận trường thinking');

  // Cả hai model Kimi đều phải tắt, không chỉ k2.6.
  const fk25 = fetchGia({ json: TRA_LOI_ANTHROPIC });
  await goiMotLan({ ma: 'kimi-k2.5', khoa: KHOA, yeuCau: yeuCauMau(), fetchFn: fk25 });
  assert.deepEqual(fk25.goi[0].than.thinking, { type: 'disabled' });
});

// ---- TIÊU CHÍ XONG #3 · BỐN NHÀ, MỘT HÌNH DẠNG -------------------------------------

test('bốn nhà · cùng một yêu cầu → cùng MỘT hình dạng kết quả', async () => {
  const ketQua = {};
  for (const maNha of MA_NHA) {
    const fk = fetchGia({ json: traLoiCuaNha(maNha) });
    ketQua[maNha] = await goiMotLan({
      ma: MODEL_CUA_NHA[maNha], khoa: KHOA, yeuCau: yeuCauMau(), fetchFn: fk,
    });
  }

  const KHOA_KET_QUA = ['traLoi', 'maModel', 'nhaCungCap', 'token', 'tienUsd', 'tienVnd', 'doNgauNhien', 'msChay'];
  for (const maNha of MA_NHA) {
    const kq = ketQua[maNha];
    assert.deepEqual(Object.keys(kq).sort(), [...KHOA_KET_QUA].sort(), `${maNha}: sai bộ trường kết quả`);
    assert.equal(kq.maModel, MODEL_CUA_NHA[maNha]);
    assert.equal(kq.nhaCungCap, maNha);
    assert.equal(kq.doNgauNhien, 0.3);
    assert.equal(typeof kq.msChay, 'number');

    // Cùng một hồ sơ token dù hai họ báo cáo bằng hai kiểu khác hẳn nhau.
    assert.deepEqual(kq.token, { vao: 3053, ra: 167, cacheDoc: 8390, cacheGhi: 0 }, `${maNha}: token lệch`);

    // Câu trả lời: đúng hình dạng Anthropic mà closer.js đang đọc.
    const t = kq.traLoi;
    assert.equal(t.role, 'assistant');
    assert.equal(t.stop_reason, 'tool_use');
    assert.deepEqual(t.content.map((b) => b.type), ['text', 'tool_use'], `${maNha}: khối nội dung lệch`);
    assert.equal(t.content[0].text, 'Dạ 99 SAR ạ');
    assert.deepEqual(
      { id: t.content[1].id, name: t.content[1].name, input: t.content[1].input },
      { id: 'tu_2', name: 'send_product_image', input: { caption: 'ảnh thật ạ' } },
      `${maNha}: khối tool_use lệch`,
    );
    assert.deepEqual(Object.keys(t.usage).sort(), [
      'cache_creation_input_tokens', 'cache_read_input_tokens', 'input_tokens', 'output_tokens',
    ]);
    // `maModel` là mã HỆ THỐNG để ghi Sổ AI, không phải mã gửi cho nhà cung cấp.
    assert.equal(t.model, MODEL_CUA_NHA[maNha]);
  }

  // Bốn nhà, bốn mức tiền khác nhau — vì đó chính là lý do lớp model tồn tại.
  const usd = MA_NHA.map((n) => ketQua[n].tienUsd);
  assert.equal(new Set(usd).size, 4, 'bốn nhà phải ra bốn mức tiền khác nhau');
});

// ---- DỊCH HAI CHIỀU HỌ OPENAI ------------------------------------------------------

test('chuẩn hoá · bốn công cụ THẬT của tools.js dịch sang OpenAI rồi về, không mất gì', () => {
  assert.equal(toolDefs.length, 4, 'tools.js phải có đúng bốn công cụ — đổi số thì sửa cả bài này');
  const vong = congCuTuOpenAI(congCuSangOpenAI(toolDefs));
  assert.deepEqual(vong, toolDefs.map((t) => ({
    name: t.name, description: t.description, input_schema: t.input_schema,
  })));
  // Kiểm cả hình dạng đích: OpenAI đòi {type:'function', function:{name,description,parameters}}
  for (const f of congCuSangOpenAI(toolDefs)) {
    assert.equal(f.type, 'function');
    assert.equal(typeof f.function.name, 'string');
    assert.equal(f.function.parameters.type, 'object');
  }
});

test('chuẩn hoá · system thành tin đầu, tool_result thành vai tool, tool_use thành tool_calls', () => {
  const than = sangOpenAI(yeuCauMau(), { maGoiApi: 'gpt-5.6-luna', doNgauNhien: 0.3 });

  assert.equal(than.messages[0].role, 'system');
  assert.match(than.messages[0].content, /nhân viên tư vấn/);

  assert.equal(than.messages[1].role, 'user');
  assert.equal(than.messages[1].content, 'giá bao nhiêu vậy shop');

  // Lượt assistant có tool_use → content chữ + tool_calls, `arguments` là CHUỖI JSON.
  const trg = than.messages[2];
  assert.equal(trg.role, 'assistant');
  assert.equal(trg.content, 'Dạ em kiểm tra giúp anh ạ');
  assert.equal(trg.tool_calls.length, 1);
  assert.equal(trg.tool_calls[0].id, 'tu_1');
  assert.equal(trg.tool_calls[0].function.name, 'get_price');
  assert.deepEqual(JSON.parse(trg.tool_calls[0].function.arguments), { product_id: '' });

  // tool_result của Anthropic nằm trong tin user; ở họ OpenAI nó là VAI RIÊNG.
  assert.deepEqual(than.messages[3], { role: 'tool', tool_call_id: 'tu_1', content: '99 SAR' });

  assert.equal(than.model, 'gpt-5.6-luna');
  assert.equal(than.max_tokens, 400);
  assert.equal(than.temperature, 0.3);
  assert.deepEqual(than.stop, ['\n\nKhách:']);
  assert.equal(than.tool_choice, 'auto');
  assert.equal(than.tools.length, 4);
});

test('chuẩn hoá · tool_choice và finish_reason dịch đúng bảng', () => {
  assert.equal(chonCongCuSangOpenAI({ type: 'auto' }), 'auto');
  assert.equal(chonCongCuSangOpenAI({ type: 'any' }), 'required');
  assert.equal(chonCongCuSangOpenAI({ type: 'none' }), 'none');
  assert.deepEqual(chonCongCuSangOpenAI({ type: 'tool', name: 'get_price' }),
    { type: 'function', function: { name: 'get_price' } });
  assert.equal(chonCongCuSangOpenAI(undefined), undefined);

  assert.equal(lyDoDungTuOpenAI('stop'), 'end_turn');
  assert.equal(lyDoDungTuOpenAI('length'), 'max_tokens');
  assert.equal(lyDoDungTuOpenAI('tool_calls'), 'tool_use');
  assert.equal(lyDoDungTuOpenAI(undefined), 'end_turn');
});

test('chuẩn hoá · cached_tokens phải TRỪ khỏi prompt_tokens, không đếm hai lần', () => {
  // Anthropic báo input_tokens KHÔNG kể phần cache; OpenAI GỘP. Bê thẳng là đếm cache hai
  // lần, mà giá vào đắt gấp 10 lần giá đọc cache → tiền phồng lên rất nhiều.
  const kq = tuOpenAI(TRA_LOI_OPENAI, { ma: 'gpt-5.6-luna' });
  assert.equal(kq.usage.input_tokens, 3053);
  assert.equal(kq.usage.cache_read_input_tokens, 8390);
  assert.equal(kq.usage.output_tokens, 167);
  assert.equal(kq.usage.cache_creation_input_tokens, 0);

  // DeepSeek gọi tên khác: prompt_cache_hit_tokens / prompt_cache_miss_tokens.
  const ds = tuOpenAI({
    choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }],
    usage: { prompt_tokens: 11443, completion_tokens: 167, prompt_cache_hit_tokens: 8390, prompt_cache_miss_tokens: 3053 },
  }, { ma: 'deepseek-v4-flash' });
  assert.equal(ds.usage.input_tokens, 3053);
  assert.equal(ds.usage.cache_read_input_tokens, 8390);

  // Không có thông tin cache → toàn bộ prompt_tokens là token vào.
  const khongCache = tuOpenAI({
    choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: 'ok' } }],
    usage: { prompt_tokens: 100, completion_tokens: 10 },
  }, { ma: 'gpt-5.6-luna' });
  assert.equal(khongCache.usage.input_tokens, 100);
  assert.equal(khongCache.usage.cache_read_input_tokens, 0);
});

test('chuẩn hoá · arguments hỏng thì giữ nguyên văn, không ném cả lượt đi', () => {
  const kq = tuOpenAI({
    choices: [{
      finish_reason: 'tool_calls',
      message: { role: 'assistant', content: '', tool_calls: [{ id: 'c1', function: { name: 'get_price', arguments: '{hong' } }] },
    }],
    usage: {},
  }, { ma: 'gpt-5.6-luna' });
  assert.deepEqual(kq.content, [{ type: 'tool_use', id: 'c1', name: 'get_price', input: { _tho: '{hong' } }]);
});

test('chuẩn hoá · tin không có chữ nào thì không đẻ ra khối text rỗng', () => {
  const kq = tuOpenAI({
    choices: [{ finish_reason: 'stop', message: { role: 'assistant', content: '' } }],
    usage: {},
  }, { ma: 'gpt-5.6-luna' });
  assert.deepEqual(kq.content, []);
  assert.equal(kq.stop_reason, 'end_turn');
});

test('chuẩn hoá · họ Anthropic lấp đủ bốn ô usage kể cả nhà cung cấp bỏ trống', () => {
  const kq = tuAnthropic({ content: [{ type: 'text', text: 'hi' }] }, { ma: 'kimi-k2.6' });
  assert.deepEqual(kq.usage, {
    input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0,
  });
  assert.equal(kq.stop_reason, 'end_turn');
  assert.equal(kq.model, 'kimi-k2.6');
});

test('chuẩn hoá · system dạng mảng khối và nội dung có ảnh', () => {
  assert.equal(heThongSangChuoi([{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }]), 'A\nB');
  assert.equal(heThongSangChuoi('A'), 'A');
  assert.equal(heThongSangChuoi(null), '');

  // Chỉ có chữ → CHUỖI (mọi máy chủ tương thích OpenAI đều nhận).
  assert.equal(noiDungSangOpenAI([{ type: 'text', text: 'xin chào' }]), 'xin chào');
  // Có ảnh → mảng parts.
  const parts = noiDungSangOpenAI([
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAA' } },
    { type: 'text', text: 'ảnh nè' },
  ]);
  assert.deepEqual(parts, [
    { type: 'image_url', image_url: { url: 'data:image/png;base64,AAA' } },
    { type: 'text', text: 'ảnh nè' },
  ]);
});

test('chuẩn hoá · thiếu max_tokens thì lấy trần mặc định, không để nhà cung cấp trả 400', () => {
  const y = { messages: [{ role: 'user', content: 'hi' }] };
  assert.equal(thanAnthropic(y, { maGoiApi: 'x', doNgauNhien: 0.3 }).max_tokens, MAC_DINH_MAX_TOKENS);
  assert.equal(sangOpenAI(y, { maGoiApi: 'x', doNgauNhien: 0.3 }).max_tokens, MAC_DINH_MAX_TOKENS);
});

test('chuẩn hoá · yêu cầu không có messages thì NÉM LoiThamSo', () => {
  assert.throws(() => thanAnthropic({}, { maGoiApi: 'x', doNgauNhien: 0.3 }), LoiThamSo);
  assert.throws(() => sangOpenAI({ messages: [] }, { maGoiApi: 'x', doNgauNhien: 0.3 }), LoiThamSo);
});

test('baseUrl · đè được để trỏ sang máy chủ nội bộ', async () => {
  for (const maNha of MA_NHA) {
    const fk = fetchGia({ json: traLoiCuaNha(maNha) });
    await goiMotLan({
      ma: MODEL_CUA_NHA[maNha], khoa: KHOA, yeuCau: yeuCauMau(),
      fetchFn: fk, baseUrl: 'http://127.0.0.1:8099/',
    });
    assert.match(fk.goi[0].url, /^http:\/\/127\.0\.0\.1:8099\/v1\//, `${maNha}: baseUrl không được áp dụng`);
  }
});
