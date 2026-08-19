// Nghiệm thu M04 · nhận diện "khách đã nói trọn ý chưa".
// Ca test lấy NGUYÊN VĂN từ 1.354 tin khách thật (Pancake, 11/08/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCompleteThought, debounceFor, DEBOUNCE_DONE_MS, DEBOUNCE_MORE_MS } from '../src/turn-complete.js';

const more = (t) => assert.equal(isCompleteThought(t).complete, false, `phải coi là CÒN DỞ: ${JSON.stringify(t)}`);
const done = (t) => assert.equal(isCompleteThought(t).complete, true, `phải coi là TRỌN Ý: ${JSON.stringify(t)}`);

test('T1 · ba mẫu sót có quy luật (tìm ra khi chạy lại trên tin thật)', () => {
  ['hello poh', 'hi po', 'Start'].forEach(more);          // chào rồi mới vào việc
  ['71566943', '0536064249', '109'].forEach(more);        // mẩu SĐT/số của đơn
  ['Celieta Boca', 'Grace Pranom'].forEach(more);         // tên riêng — mẩu thông tin đơn
  ['Yes', 'Ok. Mam', 'opo', 'sige po'].forEach(more);     // gật đầu ngắn
  more('');                                                // sticker/ảnh
});

test('T2 · câu đã trọn ý → trả nhanh', () => {
  ['how much po', 'magkano po', 'كم السعر',
   'Ilang araw po bago dumating ang order?',
   'Pwede po ba COD sa Jeddah area namin?',
   'I want to know if this is safe for pregnant women'].forEach(done);
});

test('T3 · dấu hiệu còn dở rõ ràng', () => {
  ['Name :', 'Address', 'Contact number -', 'my name is', 'and', 'ang order ko po ay'].forEach(more);
});

test('T4 · chờ đúng mốc 5s / 15s', () => {
  assert.equal(debounceFor('how much po').ms, DEBOUNCE_DONE_MS);
  assert.equal(debounceFor('hello po').ms, DEBOUNCE_MORE_MS);
  assert.equal(DEBOUNCE_DONE_MS, 5000);
  assert.equal(DEBOUNCE_MORE_MS, 15000);
});

test('T5 · không chắc thì lệch về phía CHỜ', () => {
  ['bracelet', 'sa Riyadh', 'yung isa'].forEach(more);
});
