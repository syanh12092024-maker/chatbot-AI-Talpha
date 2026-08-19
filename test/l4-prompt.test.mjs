// NGHIỆM THU LUỒNG 4 — bỏ classifier LLM + gộp BASE_SYSTEM/HARD_RULES thành CORE.
// Spec: docs/v2/prompts/L4-PROMPT.md · docs/v2/02-TANG-LUONG-CHAT.md § M08
//
// Ba việc test này canh, theo đúng thứ tự rủi ro:
//   ① 14 NGUYÊN TẮC không được biến mất khi gộp prompt (rủi ro lớn nhất: 39 page bán sai)
//   ② Phản đối bán hàng KHÔNG được gán `complaint` — dán nhãn này là AI ngừng bán ngay
//   ③ Khiếu nại thật vẫn phải tới được cửa bàn giao
//
// Test chạy OFFLINE hoàn toàn: bộ luật mới không gọi LLM nên nghiệm thu không cần API key.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { CORE, buildSystem } from '../src/prompts.js';
import { classify } from '../src/classifier.js';
import { toolDefs } from '../src/tools.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// ─────────────────────────────────────────────────────────────────────────────
// ① ĐỐI CHIẾU 14 NGUYÊN TẮC (nguồn chuẩn: README.md §14)
// Mỗi nguyên tắc → một mẩu chữ BẮT BUỘC phải còn trong CORE. Cố tình bắt theo cụm
// ngắn, đặc trưng: sửa văn phong thoải mái, nhưng XOÁ MẤT quy tắc là test đỏ ngay.
// Nguyên tắc 6/8/9/10/13 nằm ở CODE (handler, pancake-poll, config, ai-log) chứ không
// ở prompt — ghi rõ ở đây để lần sau không ai tưởng là bị bỏ sót.
// ─────────────────────────────────────────────────────────────────────────────
const NGUYEN_TAC = [
  ['1 · Ngôn ngữ & giọng', ['Tagalog', 'TIẾNG VIỆT', 'po"/"opo', '1-3 câu', 'tôn giáo/chính trị', 'litrato']],
  ['2 · Trung thực thông tin', ['CHỈ BÁN 1 SP', 'get_price', 'không bịa giá', 'khan hiếm', 'NỘI TỆ', 'CÒN HÀNG']],
  ['2 · Ảnh luôn đi kèm chữ', ['send_product_image', 'caption', 'ảnh trơ', 'feedback', 'chứng nhận']],
  ['3 · Chốt đơn COD đúng quy trình', ['cod_confirmed=true', 'THÀNH CÔNG trong lượt đó', 'Order ID']],
  ['3 · Cấm bịa tổng tiền', ['TỔNG TIỀN', 'MỘT gói trong bảng giá', 'nhân/cộng giá các gói', '2 sets']],
  ['4 · Chống spam làm phiền', ['KHÔNG hỏi lại thứ khách ĐÃ cho', 'Najma', 'checklist']],
  ['5 · Chống đơn trùng', ['KHÁCH ĐÃ CÓ ĐƠN', 'Facebook Commerce', 'đơn TRÙNG']],
  ['7 · Biết chuyển người', ['handoff_human', 'đòi gặp người thật', 'không chắc thông tin']],
  ['11 · Không cam kết vượt thẩm quyền', ['2-5 ngày', 'đổi trả/hoàn tiền/bảo hành ngoài KB']],
  ['12 · Bảo vệ PII', ['KHÔNG đọc lại đầy đủ SĐT', 'khách KHÁC']],
  ['14 · Văn phong phải chủ động bán', ['let me know po', 'mahal po', 'iisipin ko muna', '3 LẦN', 'MỘT GÓC KHÁC', 'walang risk', 'PHẢN ĐỐI BÁN HÀNG']],
];

test('① CORE giữ đủ 14 nguyên tắc — không nguyên tắc nào biến mất khi gộp prompt', () => {
  for (const [ten, cums] of NGUYEN_TAC) {
    for (const cum of cums) {
      assert.ok(CORE.includes(cum), `Nguyên tắc "${ten}" mất mẩu "${cum}" khỏi CORE`);
    }
  }
});

test('① CORE tự tuyên bố THẨM QUYỀN — vì nó không còn đứng cuối để thắng bằng recency', () => {
  // HARD_RULES cũ đứng CUỐI nên thắng kịch bản page nhờ vị trí. CORE đứng ĐẦU,
  // mất lợi thế đó → phải nói thẳng bằng chữ, nếu không kịch bản page ghi đè được.
  assert.match(CORE, /THẨM QUYỀN/);
  assert.match(CORE, /THẮNG MỌI KHỐI SAU/);
});

// ─────────────────────────────────────────────────────────────────────────────
// ② CẤU TRÚC KHỐI + TRẦN TOKEN
// ─────────────────────────────────────────────────────────────────────────────

test('② buildSystem: CORE đầu → kịch bản page giữa → KB cuối, neo cache đúng 1 chỗ ở khối CUỐI', () => {
  const kb = {
    text: 'Sản phẩm A — 99 AED',
    config: { tone: 'vui vẻ', greeting: 'Hello po!', salesPrompt: 'Nhấn mạnh hàng chính hãng.' },
  };
  const blocks = buildSystem(kb);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].text, CORE, 'khối 1 phải là CORE nguyên vẹn');
  assert.match(blocks[1].text, /HƯỚNG DẪN RIÊNG CHO PAGE/);
  assert.match(blocks[2].text, /KNOWLEDGE BASE/);

  // Neo cache: đúng 1 điểm (an toàn với Kimi) và phải ở khối CUỐI để cache phủ trọn system.
  const neo = blocks.filter((b) => b.cache_control);
  assert.equal(neo.length, 1, 'chỉ được đúng 1 điểm neo cache');
  assert.equal(neo[0], blocks[blocks.length - 1], 'điểm neo phải ở khối CUỐI');
});

test('② Kịch bản riêng của page đi qua NGUYÊN VĂN — không được cắt để tiết kiệm token', () => {
  // Luật của L4: đây là kịch bản marketer viết, và số liệu CHƯA chứng minh dài/ngắn
  // cái nào tốt hơn (2 page cùng ngành, kịch bản 830 vs 829 token, chênh 12,7 lần lượt/đơn).
  const salesPrompt = 'A'.repeat(4000);
  const blocks = buildSystem({ text: 'kb', config: { salesPrompt } });
  assert.ok(blocks[1].text.includes(salesPrompt), 'kịch bản page bị cắt ngắn');
});

test('② Page chưa có tone/greeting/salesPrompt → không chèn khối rỗng', () => {
  const blocks = buildSystem({ text: 'kb', config: {} });
  assert.equal(blocks.length, 2, 'chỉ còn CORE + KB');
  assert.ok(blocks[1].cache_control, 'neo cache vẫn phải ở khối cuối');
});

test('② Trần token CORE — canh bằng số KÝ TỰ (đo offline, không cần API)', () => {
  // Đo 11/08/2026 bằng tiktoken o200k_base, hiệu chuẩn về đơn vị của docs
  // (hệ số k=0,8738 suy ra từ chính BASE_SYSTEM 1.804 + HARD_RULES 1.486 trong docs):
  //   CORE = 2.256 token / 6.734 ký tự  →  2,985 ký tự mỗi token.
  // Trần 7.200 ký tự ≈ 2.410 token: đủ chỗ sửa văn phong, nhưng ai dán thêm cả khối
  // mới vào CORE là test đỏ và phải đo lại tử tế.
  assert.ok(CORE.length <= 7200, `CORE phình lên ${CORE.length} ký tự (trần 7.200) — đo lại token trước khi nới`);
});

// ─────────────────────────────────────────────────────────────────────────────
// ③ BỎ CLASSIFIER LLM — giữ nguyên chữ ký & shape để handler.js (file của L2) không đổi
// ─────────────────────────────────────────────────────────────────────────────

test('③ classify() trả ĐÚNG shape cũ và KHÔNG còn __usage (không gọi LLM → không tốn token)', async () => {
  const r = await classify('magkano po?', 'Sản phẩm A');
  assert.deepEqual(Object.keys(r).sort(), ['intent', 'is_spam_conf', 'lang', 'lead_quality', 'urgency']);
  assert.equal(r.__usage, undefined, 'còn __usage nghĩa là vẫn gọi LLM');
  assert.ok(['interested', 'question', 'complaint', 'spam'].includes(r.intent));
  assert.ok(['tl', 'en', 'other'].includes(r.lang));
});

test('③ classify() KHÔNG gọi mạng — chạy được cả khi không có API key', async () => {
  // Đây là lý do chính bỏ classifier LLM: đợt 08/08/2026 API trả 429 làm nó fallback
  // loạn, kéo theo mất luôn cửa nhận diện khiếu nại. Luật thuần thì không bao giờ gãy.
  const src = readFileSync(join(SRC, 'classifier.js'), 'utf8');
  assert.ok(!/anthropic|messages\.create|fetch\(/i.test(src), 'classifier.js vẫn còn đường gọi API');
});

// ⚠️ CỬA SỐNG CÒN: `complaint` là cửa BÀN GIAO ở handler.js — dán nhãn này là AI
// NGỪNG BÁN ngay, trước khi LLM kịp chạy. Phản đối bán hàng lọt vào đây = mất đơn.
const PHAN_DOI = [
  'ang mahal naman po',          // chê đắt
  'iisipin ko muna po',          // để tôi nghĩ đã
  'mahal po masyado',
  'wala pang budget ngayon',     // chưa có tiền
  'next time na lang po',
  'hindi na po muna',
  'effective ba talaga ito?',    // nghi hiệu quả — 07/08/2026 từng bị gán spam
  'peke ba ito?',                // NGHI hàng giả (có dấu hỏi) ≠ TỐ hàng giả
  'scam ba to?',
  'totoo po ba yan?',
  'mas mura sa ibang shop',      // so giá chỗ khác
];

test('③ Phản đối bán hàng TUYỆT ĐỐI không bị gán complaint (11/11 ca)', async () => {
  for (const msg of PHAN_DOI) {
    const r = await classify(msg);
    assert.notEqual(r.intent, 'complaint', `"${msg}" bị gán complaint → AI ngừng bán oan`);
    assert.notEqual(r.intent, 'spam', `"${msg}" bị gán spam → khách bị im lặng`);
  }
});

// Khiếu nại THẬT — khách đã mua mà có vấn đề, hoặc chửi bới / tố lừa đảo / doạ kiện.
const KHIEU_NAI = [
  'hindi pa dumating ang order ko',   // chưa nhận được hàng
  'where is my order?',
  'nasaan na ang parcel ko',
  'sirang item ang natanggap ko',     // hàng hỏng
  'wrong item ang padala niyo',
  'gusto ko ng refund',               // đòi hoàn tiền
  'ibalik niyo ang pera ko',
  'na-overcharge ako',                // tính sai tiền
  'manloloko kayo',                   // tố lừa đảo (KHÔNG phải câu hỏi)
  'scammer kayo talaga',
  'gago kayo',                        // chửi bới
  'isusumbong ko kayo sa DTI',        // doạ kiện
  'طلبي ما وصل',                       // Ả Rập: đơn chưa tới
];

test('③ Khiếu nại thật → vẫn vào cửa complaint để bàn giao người thật (13/13 ca)', async () => {
  for (const msg of KHIEU_NAI) {
    const r = await classify(msg);
    assert.equal(r.intent, 'complaint', `"${msg}" KHÔNG vào được cửa bàn giao`);
  }
});

test('③ Spam khoanh CỰC HẸP — chỉ rác thật, khách đang giận KHÔNG phải spam', async () => {
  // Cửa spam ở handler.js là IM LẶNG HOÀN TOÀN, không để lại vết. Im nhầm 1 khách =
  // mất đơn và không ai biết. Khách chửi bới phải đi đường complaint để còn có người xử lý.
  for (const msg of ['join my telegram channel now', 'earn $500 a day work from home', 'bit.ly/abc123 add me']) {
    assert.equal((await classify(msg)).intent, 'spam', `"${msg}" phải là spam`);
  }
  for (const msg of ['gago kayo', 'manloloko kayo']) {
    assert.notEqual((await classify(msg)).intent, 'spam', `"${msg}" là khách giận, KHÔNG được im`);
  }
});

test('③ Sticker/ảnh (`<div></div>`) không bị kết tội — 8,9% tin khách là chuỗi này', async () => {
  // Đo 07/08/2026: 50/562 tin của khách là `<div></div>`. Nó không rỗng nên từng lọt
  // qua mọi cửa canh và bị gán complaint → khách bị bàn giao oan.
  for (const msg of ['<div></div>', '  ', '<p></p>']) {
    const r = await classify(msg);
    assert.equal(r.intent, 'question', `"${msg}" phải rơi vào nhánh vô hại`);
  }
});

// `lang` không còn ai đọc từ 11/08/2026 (bỏ câu giữ chân khi bàn giao — xem handler.js),
// nhưng classifier vẫn trả nó. Giữ test để enum không lặng lẽ đổi nếu sau này dùng lại.
test('③ lang chuẩn hoá đúng enum cũ (tl | en | other)', async () => {
  assert.equal((await classify('magkano po ito')).lang, 'tl');
  assert.equal((await classify('how much is this')).lang, 'en');
  assert.equal((await classify('كم سعر هذا المنتج')).lang, 'other'); // Ả Rập → câu song ngữ
});

test('③ lead_quality có nghĩa: có SĐT > có tín hiệu mua > hỏi vu vơ', async () => {
  const phone = await classify('order po, 0501234567');
  const buy = await classify('gusto ko po mag order');
  const hoi = await classify('ano po ito');
  assert.ok(phone.lead_quality > buy.lead_quality, 'có SĐT phải điểm cao nhất');
  assert.ok(buy.lead_quality > hoi.lead_quality);
});

// ─────────────────────────────────────────────────────────────────────────────
// ④ DỌN NHỎ
// ─────────────────────────────────────────────────────────────────────────────

test('④ Đã bỏ tool score_lead, các tool còn lại nguyên vẹn', () => {
  const ten = toolDefs.map((t) => t.name);
  assert.ok(!ten.includes('score_lead'), 'score_lead chưa được gỡ');
  assert.deepEqual(ten, ['get_price', 'create_draft_order', 'send_product_image', 'handoff_human']);
});

test('④ score_lead không còn sót trong CODE (ghi chú giải thích vì sao bỏ thì được giữ)', () => {
  for (const f of ['tools.js', 'closer.js', 'prompts.js', 'classifier.js']) {
    // Bỏ dòng chú thích rồi mới soi: `tools.js` cố ý giữ một ghi chú nói vì sao tool này
    // bị gỡ, để lần sau không ai thêm lại nó mà không biết lý do.
    const code = readFileSync(join(SRC, f), 'utf8')
      .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    assert.ok(!code.includes('score_lead'), `${f} còn dùng score_lead trong code`);
  }
});

test('④ max_tokens của closer hạ còn 400 (tin TB 182 token, chỉ 6,3% vượt 300)', () => {
  const src = readFileSync(join(SRC, 'closer.js'), 'utf8');
  assert.match(src, /max_tokens:\s*400/);
});

test('④ Giữ sanitizeMessages/sanitizeSystem — bỏ là khách ngồi im vĩnh viễn', () => {
  // Nửa emoji lọt vào API → Claude trả 400 invalid_request_error, lỗi bị coi là
  // "không tự hồi phục" nên bot không thử lại và khách không bao giờ nhận được tin.
  const src = readFileSync(join(SRC, 'closer.js'), 'utf8');
  assert.match(src, /sanitizeSystem\(buildSystem\(kb\)\)/);
  assert.match(src, /sanitizeMessages\(state\.messages\)/);
});

test('④ Closer không bao giờ trả "..." cho khách', () => {
  const src = readFileSync(join(SRC, 'closer.js'), 'utf8');
  assert.ok(!/return\s*'\.\.\.'/.test(src) && !/return\s*"\.\.\."/.test(src));
});
