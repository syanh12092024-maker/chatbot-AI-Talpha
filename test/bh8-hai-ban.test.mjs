// Nghiệm thu BH8 · HAI BẢN — người đọc tiếng Việt, model đọc tiếng Anh gọn.
//
// Ba điều phải đúng, theo thứ tự quan trọng:
//   ① bản dịch KHÔNG được đổi thứ gửi khách: số, giá, URL, câu mẫu trong ngoặc
//   ② hỏng ở bất kỳ đâu (model lỗi, dịch lệch, bản máy kiểu cũ) ⇒ LÙI về tiếng Việt, không im
//   ③ hai bản CORE không được lệch nhau lặng lẽ — băm canh
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { CORE, CORE_VI, CORE_VI_BAM, buildSystem } from '../src/prompts.js';
import {
  DAU_BAN_MAY, laBanMayEn, thanBanMay, kiemGiuNguyenVan, dichBanMay,
} from '../src/chat/dich-ban-may.js';
import { dungBanChoMay } from '../db/di-tru/nguon.js';

// Mẩu kịch bản THẬT của Minty Fresh Smile KSA (CSDL dev, 28/09) — số, câu mẫu, link nguyên văn.
const VI = `- Giọng điệu / phong cách: Thân thiện, xưng "po/opo". Trả lời NGẮN 1-3 dòng.
LUỒNG BÁN
1. Khách nhắn → chào, nêu 1-2 lợi ích, rồi hỏi khách muốn mấy set.
3. Đủ thông tin → chốt đơn theo mẫu «chốt đơn» bên dưới.
- Giao hàng: khung "2-5 days", trừ cuối tuần.
· Khách nói để sau / "mamaya" / "later":
  "Do you want me to keep this promotion for you? Because the promotion will end at 11 PM today, dear 😘"
· Chốt đơn: "👉Your order is <tổng tiền> SAR. You will receive this gift in the next 2-5 days! ❤️"
· WhatsApp: "Please contact us via WhatsApp: wa.me/971543610815"`;

const EN_DUNG = `- Tone: friendly, use "po/opo". Reply SHORT, 1-3 lines.
SALES FLOW
1. Customer messages → greet, state 1-2 benefits, ask how many sets.
3. Details complete → close with the order template below.
- Delivery: window "2-5 days", excluding weekends.
· Customer says later / "mamaya" / "later":
  "Do you want me to keep this promotion for you? Because the promotion will end at 11 PM today, dear 😘"
· Close: "👉Your order is <tổng tiền> SAR. You will receive this gift in the next 2-5 days! ❤️"
· WhatsApp: "Please contact us via WhatsApp: wa.me/971543610815"`;

const goiTra = (text) => async () => ({ content: [{ type: 'text', text }] });

// ═══ ① giữ nguyên văn ═══════════════════════════════════════════════════════════════

test('H1 · bản dịch đúng → qua kiểm; câu «chốt đơn» tiếng Việt được phép dịch', () => {
  const k = kiemGiuNguyenVan(VI, EN_DUNG);
  assert.equal(k.ok, true, `thiếu ${k.thieu} · thừa ${k.thua}`);
});

test('H2 · đổi MỘT con số (11 PM → 10 PM) → trượt', () => {
  const k = kiemGiuNguyenVan(VI, EN_DUNG.replace('11 PM', '10 PM'));
  assert.equal(k.ok, false);
});

test('H3 · THÊM một con số không có trong nguồn (bịa giá) → trượt', () => {
  const k = kiemGiuNguyenVan(VI, EN_DUNG + '\n- Only 99 SAR today!');
  assert.equal(k.ok, false);
  assert.ok(k.thua.some((x) => x.includes('99')));
});

test('H4 · câu mẫu gửi khách bị DIỄN ĐẠT LẠI → trượt (phải chép từng chữ)', () => {
  const k = kiemGiuNguyenVan(VI, EN_DUNG.replace('Do you want me to keep this promotion for you?', 'Shall I hold this promo for you?'));
  assert.equal(k.ok, false);
  assert.ok(k.thieu.some((x) => x.startsWith('câu')));
});

test('H5 · mất link WhatsApp → trượt', () => {
  const k = kiemGiuNguyenVan(VI, EN_DUNG.replace('wa.me/971543610815', 'our WhatsApp'));
  assert.equal(k.ok, false);
});

// ═══ ② lùi an toàn ══════════════════════════════════════════════════════════════════

test('H6 · dịch đúng → bản máy mang DẤU, thân là tiếng Anh', async () => {
  const kq = await dichBanMay(VI, { goi: goiTra(EN_DUNG) });
  assert.equal(kq.ngonNgu, 'en');
  assert.ok(laBanMayEn(kq.text));
  assert.equal(thanBanMay(kq.text), EN_DUNG);
});

test('H7 · dịch LỆCH / model LỖI / trả RỖNG / chưa nối → giữ bản tiếng Việt, NÓI lý do', async () => {
  const ca = [
    [{ goi: goiTra(EN_DUNG.replace('2-5', '3-7')) }, /lệch nguyên văn/],
    [{ goi: async () => { throw new Error('429'); } }, /model dịch lỗi/],
    [{ goi: goiTra('') }, /rỗng/],
    [{}, /chưa nối/],
  ];
  for (const [deps, lyDo] of ca) {
    const kq = await dichBanMay(VI, deps);
    assert.equal(kq.ngonNgu, 'vi');
    assert.equal(kq.text, VI, 'lùi thì phải là NGUYÊN bản tiếng Việt');
    assert.equal(laBanMayEn(kq.text), false);
    assert.match(kq.lyDo, lyDo);
  }
});

test('H8 · buildSystem: bản máy CÓ dấu → khối page là tiếng Anh, KHÔNG lộ dấu', () => {
  const b = buildSystem({ text: 'KB', config: { tone: 'Thân thiện' }, kichBanMay: `${DAU_BAN_MAY}\n${EN_DUNG}` });
  assert.equal(b.length, 3);
  assert.match(b[1].text, /^# PAGE GUIDE/);
  assert.ok(b[1].text.includes('SALES FLOW'));
  assert.ok(!b[1].text.includes(DAU_BAN_MAY), 'dấu nhận là cho máy ráp, không cho model đọc');
  assert.ok(!b[1].text.includes('Giọng điệu'), 'có bản EN thì không dựng thêm bản Việt');
  assert.ok(b[2].cache_control, 'neo cache vẫn ở khối CUỐI');
});

test('H9 · buildSystem: bản máy KHÔNG dấu (khuôn tiếng Việt cũ) → dựng từ config như trước BH8', () => {
  const b = buildSystem({ text: 'KB', config: { tone: 'Thân thiện' }, kichBanMay: '- Giọng điệu / phong cách: Thân thiện' });
  assert.match(b[1].text, /^# HƯỚNG DẪN RIÊNG CHO PAGE NÀY/);
});

// ═══ ③ song sinh + băm ══════════════════════════════════════════════════════════════

test('H10 · CORE (EN) được dịch từ ĐÚNG bản CORE_VI hiện hành — sửa bản Việt mà quên bản Anh là đỏ', () => {
  const bam = crypto.createHash('sha256').update(CORE_VI).digest('hex').slice(0, 16);
  assert.equal(bam, CORE_VI_BAM, 'CORE_VI đã đổi: dịch lại CORE rồi cập nhật CORE_VI_BAM');
  const ngoaiNgoac = CORE.replace(/"[^"\n]*"/g, '');
  const viet = ngoaiNgoac.match(/[^\s]*[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ][^\s]*/gi) || [];
  assert.deepEqual(viet, [], 'ngoài câu trong ngoặc (nhãn tool, nhãn ghi chú), CORE (EN) không được còn chữ tiếng Việt');
});

test('H11 · câu chào: `dungBanChoMay` và `buildSystem` là MỘT câu (song sinh BH7)', () => {
  const cfg = { greeting: 'Hello po! 😊' };
  const dong = dungBanChoMay(cfg).split('\n').find((l) => l.includes('Câu chào'));
  assert.ok(dong, 'dungBanChoMay phải có dòng câu chào');
  assert.ok(buildSystem({ text: 'KB', config: cfg })[1].text.includes(dong), 'hai nơi phải giống từng chữ');
  assert.ok(!dong.includes('khách mới nhắn'), '«khách mới nhắn» đọc được thành «mọi lượt»');
});
