// DUYỆT sổ nhận diện template Botcake/RTO (M15 → bot-registry).
//
//   npm run tpl-approve                  → chạy khô: liệt kê mẫu chờ duyệt
//   npm run tpl-approve -- --apply       → duyệt các mẫu đạt ngưỡng
//   npm run tpl-approve -- --apply --min-hits 5
//
// VÌ SAO CÓ NGƯỠNG `--min-hits`: duyệt nhầm một câu do NGƯỜI gõ thành "template
// máy" thì hệ thống sẽ coi sale đang gõ tay là bot, rồi AI chen ngang vào lúc
// sale đang nói chuyện với khách. Một câu lặp NGUYÊN VĂN ở nhiều hội thoại KHÁC
// NHAU thì gần như chắc chắn là máy gửi — người không gõ lại y hệt nhiều lần.
// Mặc định 3 hội thoại; hạ xuống là tự chịu trách nhiệm.
//
// Duyệt là cửa DUY NHẤT làm mẫu có hiệu lực (ghi `botcake-templates.json`).
// Tác dụng ngay cả khi HUMAN_TAKEOVER đang tắt: `context.js` dùng sổ này để
// LOẠI tin template khỏi ngữ cảnh gửi lên model — bớt token mỗi lượt.
import 'dotenv/config';
import { readCandidates, approveCandidate } from './template-learner.js';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const i = argv.indexOf('--min-hits');
const MIN_HITS = i >= 0 ? Number(argv[i + 1]) : 3;

const hitsOf = (c) => Number(c.hits ?? c.count ?? c.convs ?? 0);
const textOf = (c) => String(c.sample || c.pattern || '').replace(/\s+/g, ' ');

const all = readCandidates();
const pending = all.filter((c) => !c.status || c.status === 'pending');

console.log(`Sổ chờ duyệt: ${pending.length} mẫu (tổng ${all.length}) · ngưỡng ≥${MIN_HITS} hội thoại\n`);

let duyet = 0, boQua = 0;
for (const c of pending) {
  const h = hitsOf(c);
  const dat = h >= MIN_HITS;
  console.log(`${dat ? '✓' : '·'} ×${String(h).padStart(3)} hội thoại  "${textOf(c).slice(0, 92)}"`);
  if (!dat) { boQua++; continue; }
  if (!APPLY) { duyet++; continue; }
  const r = approveCandidate(c.id, { by: 'cli' });
  if (r?.ok === false) { console.log(`    → lỗi: ${r.error || 'không duyệt được'}`); continue; }
  duyet++;
}

console.log(`\n══ ${duyet} mẫu ${APPLY ? 'ĐÃ DUYỆT' : 'sẽ được duyệt'} · ${boQua} dưới ngưỡng, giữ lại chờ người xem ══`);
if (!APPLY) console.log('(chạy khô — chưa ghi gì. Thêm --apply để duyệt.)');
else console.log('Nhớ restart service để bot-registry nạp lại sổ.');
