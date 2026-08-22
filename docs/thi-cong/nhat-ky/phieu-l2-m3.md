# NHẬT KÝ — PHIẾU L2-M3 (Ráp prompt bốn khối từ DB + ngân sách lượt theo độ nóng + cờ trọng điểm)

Base nhận phiếu: `020c50c`. Base thật lúc code (đã đo lại theo luật "cây có nhiều phiên
cùng checkout"): `09d4704` (L3-M2 ✅ + VA-Q12 đóng, HEAD đứng yên suốt lượt code — L3-M3
chạy song song trong `src/orders/`/`db/migrate/006`, không đụng vùng của phiếu này).

## 0 · ĐÃ TRA (mục ⑦ phiếu)

`grep -n "rap-prompt\|ngan-sach-luot\|bo_luat_chung\|ky_nang\|L2-M3" docs/thi-cong/SO-NO.md`
→ 0 dòng. Không nợ cũ trùng vùng. Khớp đúng lời khai ⑦ của phiếu ("§9 không nợ vùng
rap-prompt... Không trùng").

## 1 · Đo lại nguyên liệu TRƯỚC khi code (án lệ #4)

- `buildSystem(kb)` trong `src/prompts.js` (CẤM SỬA) **HARDCODE hằng `CORE`** — không
  đọc bất kỳ trường `kb.*` nào cho "bộ luật chung". Đây là phát hiện QUAN TRỌNG NHẤT của
  phiếu: seed/đọc `bo_luat_chung` đúng hợp đồng DB không có nghĩa nó đã ĐIỀU KHIỂN model.
  Quyết định: `kb.text` chỉ mang MẨU ~300 ký tự của `bo_luat_chung` (không dán nguyên
  ~2.256 token — trùng lặp với CORE, tốn token mà không đổi hành vi), khai rõ tình trạng
  ngay trong text đó + trong `duong-tin-v1.md` §13.2. Ba khối còn lại (kỹ năng/kịch
  bản/sản phẩm) CÓ hiệu lực thật qua `kb.text`/`kb.config`.
- Tầng truy vấn (`src/db/truy-van.js`) đã có SẴN hợp đồng OR-IS-NULL cho `bo_luat_chung`
  (hàm `veTeamKhiDoc`) — `rap-prompt.js` dùng thẳng `layNhieu`, KHÔNG tự viết SQL. Cũng
  phát hiện: tầng truy vấn KHÔNG cho ghi `team_id NULL` vào `bo_luat_chung` (đúng chủ
  đích, xem comment `truy-van.js` dòng ~17) ⇒ seed phải dùng `pool.query` thẳng (đúng
  tiền lệ `db/di-tru/ket-noi-pos.js`/`nap.js`), không qua `themMoi`.
- `hoi_thoai` đã có sẵn `diem_nong`/`diem_lead` từ migration 001 (dòng 162-163) nhưng
  `src/chat/kho.js#COT_CHO_PHEP` CHƯA cho ghi — khớp đứt kiểu "bảng có reader mà không ai
  ghi". Đã mở (2 dòng).
- `san_pham` KHÔNG có cột "nhóm sản phẩm" — quyết định: `ky_nang.bat_cho_nhom_sp` khớp
  trực tiếp vào `san_pham.ma` (mã biến thể POS, khoá duy nhất sẵn có).
- 01-QUYET-DINH.md §6 "2 SP hoàn 26,8%/19,2% chưa bật kỹ năng size" — ĐO LẠI: không có
  cách nào xác định ĐÚNG 2 mã SP đó từ dữ liệu hiện có (`san_pham` không có tỉ lệ hoàn
  theo SP; `don_hang.san_pham_ma` — migration 005 của L3-M2 — CHƯA cửa POS nào ghi, nợ
  Q2 §9 sổ 23/08). Quyết định: seed kỹ năng "hỏi size" với `bat_cho_nhom_sp='{}'` VÀ
  `bat=false` — khung có sẵn, KHÔNG âm thầm bật cho toàn danh mục team (tránh hỏi size
  cho sản phẩm không có size). Ghi rõ trong comment + §9.

## 2 · Quyết định thiết kế + tradeoff (luật 13 — nói ra, không lặng lẽ chọn một bên)

1. **`chamVaTinhNganSach` (chấm điểm) đặt SỚM, `conNganSach` (gác cửa) đặt MUỘN** trong
   handler-v3.js — đúng vị trí `updateLead`/`checkBudget` của `src/handler.js` cũ (dòng
   223-225 vs 320): chấm sớm để tin cụt liên tiếp vẫn bị trừ điểm (spec M11); gác muộn
   (sau lớp từ khoá/Fast Lane/classify, đều 0 token) để không chặn nhầm ba tầng miễn phí.
2. **`backFromCold` luôn `false` ở v3`** — `hoi_thoai.trang_thai` không có nhãn COLD
   trong CHECK (chỉ GREET/QUALIFY/SELLING/CLOSING/HANDOFF/POST_SALE). Không bịa thêm
   trạng thái ngoài phạm vi phiếu. Mất đúng 1/12 tín hiệu điểm (+2 khi quay lại sau khi
   nguội) — ảnh hưởng nhỏ, ghi rõ trong code + duong-tin-v1.md §13.4.
3. **Cờ fallback đặt tên `V3_RAP_PROMPT_BAT`** (đặt=1 mới BẬT đường DB), KHÔNG phải
   "đặt để tắt" — theo đúng luật "vắng = ĐÓNG" của `bien-moi-truong-v3.md` (mọi biến
   V3_* khác đều cùng chiều: V3_POS_GHI/V3_PANCAKE_GUI/V3_WA_GUI/V3_NAP_DEV). Đã VƯỢT
   PATHSPEC ③ để thêm 1 dòng vào `bien-moi-truong-v3.md` — file đó tự đòi "thêm biến =
   thêm dòng CÙNG COMMIT", rủi ro thấp (docs, 1 dòng), theo đúng tiền lệ "khai trước xin
   sau" của L3-M1 (nợ P1 §9 sổ 22/08).
4. **Chứng minh "cờ fallback hoạt động" bằng `kb.nguon` (`'kb_cu'|'db'`) thay vì spy**
   trên `getKBForPage` — đơn giản/chắc chắn hơn mock module, và đề bài ④#4 chỉ đòi chứng
   minh được hành vi, không khoá cứng cơ chế đo.
5. **`ghi()`/`luuLai()` trong handler-v3.js đóng `kb`/`lead` qua CLOSURE** (không đổi
   chữ ký, không sửa ~10 call site) — `kb`/`lead` được closure đọc TRỄ (đúng lúc gọi,
   không phải lúc khai hàm), khai rõ bằng comment tại chỗ vì JS thứ tự khai ≠ thứ tự
   chạy dễ đọc nhầm là bug.
6. **`layKb` đổi chữ ký** `layKb(pageId)` đồng bộ → `layKb(pool,{teamId,pageIdText})`
   bất đồng bộ. Đo trước: `grep -rn "layKb:" test/ ops/` → mọi override đều `() => kb`
   (bỏ qua tham số) ⇒ đổi chữ ký KHÔNG vỡ test/ops đã gate (đã chạy lại xác nhận, xem
   §4). Bỏ import `getKBForPage` trực tiếp khỏi handler-v3.js (không dùng nữa — dọn code
   chết, luật 12).

## 3 · Bẫy tự bắt khi VIẾT cổng nghiệm thu (không phải lỗi code, lỗi THƯỚC)

Khi tự chạy thử `ops/bin/nghiem-thu/l2-m3.sh`, tự bắt được 2 bẫy KHÔNG liên quan tính
năng — sửa ngay trong phiếu này (đất của mình):

1. `$?` đọc SAU một lệnh `so "..." "$(...)"` (bash function/printf) thay vì NGAY sau
   `node --test` → luôn đọc rc=0 (của `so`), không phải rc thật của node — cổng lỏng mà
   không ai biết (án lệ #5 dạng mới). Vá: capture `$?` vào biến NGAY sau lệnh `node`.
2. `grep -c '^✔ '/'^✖ '` đếm TRÙNG khi có ca đỏ thật: node --test in ca đỏ 2 LẦN (khối
   tuần tự + khối "failing tests:" cuối log) + dòng "✖ failing tests:" tự nó cũng khớp
   `^✖ ` ⇒ 1 ca đỏ đếm ra 3. Chưa lộ ở `l2-m2.sh`/`l3-m2.sh` (hai cổng đó chưa từng có ca
   đỏ để test). Vá: đếm bằng dòng tổng kết CHUẨN `ℹ pass N`/`ℹ fail N` của chính node
   --test; tên ca đỏ cắt log tại dòng `ℹ tests` trước khi grep (chỉ lấy khối đầu).
   KHÔNG sửa `l2-m2.sh`/`l3-m2.sh` (ngoài pathspec, đất phiếu khác) — chỉ vá bản COPY
   trong `l2-m3.sh` của mình. Đáng để TỔNG biết vì cùng họ lỗi có thể lặp ở gate script
   tương lai — xem §9.

## 4 · Hồi quy — l2-m1 sạch, l2-m2 có 1 ca đỏ ĐÃ CHẨN ĐOÁN

- `test/l2-m1-hang-doi.test.js` 12/12 xanh · `test/l2-m1-nhac-truong.test.js`
  (`--experimental-test-module-mocks`) 11/11 xanh · `test/l2-m2-lop-tu-khoa.test.js`
  12/12 xanh — KHÔNG hồi quy.
- `test/l2-m2-handler.test.js`: ca **"không cướp diễn đàn (ở tầng handler)"** (dòng
  ~206-224) ĐỎ THẬT, tái lập ổn định. CHẨN ĐOÁN đầy đủ: file đó dùng CHUNG một
  `hoi_thoai` cho 6 ca (`before()` tạo 1 lần). Ca "NHƯỜNG khi thiếu KB size" (chạy TRƯỚC
  trong cùng file) đã tiêu 1 lượt gọi model thật trên hội thoại đó
  (`moc_luot_llm` +1). Tin của ca "không cướp diễn đàn" ("magkano po ang presyo?") chỉ
  ghi điểm lead = 1 (tín hiệu `price`) ⇒ tier LẠNH ⇒ ngân sách 24h = 1 lượt — ĐÃ TIÊU HẾT
  bởi ca chạy trước ⇒ ngân sách lượt theo độ nóng (đúng việc phiếu này làm — thay trần 4
  lượt cứng) CHẶN ĐÚNG THIẾT KẾ, không gọi model, `guiTinCalls` rỗng thay vì
  `['stub AI reply']`. XÁC NHẬN không phải bug: cùng kịch bản dưới trần-4-cứng CŨ không
  đỏ (4 > 1 lượt đã tiêu); test/l2-m3-handler.test.js (đất phiếu này) chứng minh
  `conNganSach` hoạt động đúng bằng chính cơ chế này (hết ngân sách → handoff không im).
  KHÔNG sửa `test/l2-m2-handler.test.js` (ngoài pathspec ③, đất test L2-M2 — án lệ #25).
  Đề xuất vá 1-3 dòng cho TỔNG: thêm `deps.conNganSach: () => ({ok:true})` cho ca đó
  (như `test/l2-m3-handler.test.js` đã làm), hoặc tách `hoi_thoai` riêng cho ca đó.
  Ghi vào §9 sổ điều hành + `duong-tin-v1.md` §13.6.
  `ops/bin/nghiem-thu/l2-m3.sh` phép ⑦e tự nhận diện ĐÚNG ca này BẰNG TÊN (án lệ #8 "so
  DANH SÁCH không so SỐ") — số/tên ca đỏ KHÁC dự kiến mới bị TRƯỢT.
- `test/l3-m1-*.test.js`, `test/l3-m2-*.test.js`, `test/l0-m1-*.test.js`,
  `test/l0-m2-*.test.js`: KHÔNG gọi `xuLyMotTin`/`handler-v3.js` (đo bằng
  `grep -l "xuLyMotTin\|handler-v3"`) — ngoài phạm vi ảnh hưởng, không cần hồi quy.

## 5 · Bộ ca viết cho phiếu này (17 ca, 3 tệp)

- `test/l2-m3-ngan-sach-luot.test.js` (8 ca, THUẦN không DB): 5 bậc tăng dần
  (lạnh<ấm<nóng<đang_chốt<sát_đơn, sát đơn priority=true) · trần tuyệt đối kẹp đúng
  HARD_MAX_TURNS kể cả cộng bonus phản đối vượt trần · cộng dồn điểm qua nhiều lượt
  (prevLead threading) · phạt tin cụt liên tiếp · `conNganSach` còn/hết ngân sách +
  nhãn ưu tiên. Tự dựng số liệu bằng cách SEED `prevLead.signals` trực tiếp (không dò
  câu chữ khớp đúng biên tier — tránh trôi theo regex lead-score.js).
- `test/l2-m3-rap-prompt.test.js` (6 ca, sandbox `aicloser_v3_test_l2m3`): ráp đủ 4 khối
  - buildSystem không ném + 4 dấu vết · hợp đồng OR-IS-NULL 3 team + version mới ăn ngay
    không cache · kỹ năng theo nhóm SP (đối chứng in cả hai) · khối rỗng nói ra + fallback
    cờ config · seed mồi khớp CORE nguyên văn + idempotent 2 lượt.
- `test/l2-m3-handler.test.js` (3 ca, sandbox `aicloser_v3_test_l2m3h`): hết ngân sách →
  handoff không im + so_ai ghi `trong_diem`/`kb_nguon_thieu` · còn ngân sách → model gọi
  bình thường + diem_lead/diem_nong lưu đúng · điểm cộng dồn qua 2 lượt liên tiếp không
  reset (mỗi ca tự dựng `hoi_thoai` riêng, không ăn theo thứ tự chạy của ca khác).

## 6 · Kết quả nghiệm thu

`bash ops/bin/nghiem-thu/l2-m3.sh` → **11/11 phép ĐẠT** (7 phép đề bài, ⑦ tách 5 mục
a-e). `node --test test/l2-m3-*.test.js` → 17/17 xanh.

## 7 · File chạm

Trong pathspec ③: `src/chat/rap-prompt.js` (mới) · `src/chat/ngan-sach-luot.js` (mới) ·
`src/chat/handler-v3.js` (đấu 2 module + closure kb/lead) · `src/chat/kho.js` (mở 2
cột) · `db/di-tru/bo-luat-va-ky-nang.js` (mới) · `db/di-tru/index.js` (thêm mục gọi) ·
`test/l2-m3-*.test.js` (3 tệp mới) · `docs/v3/ban-giao/duong-tin-v1.md` (APPEND §13) ·
`ops/bin/nghiem-thu/l2-m3.sh` (mới) · nhật ký này · SO-DIEU-HANH §9+§10.

VƯỢT PATHSPEC (khai rõ, đã giải thích §2.3): `docs/v3/ban-giao/bien-moi-truong-v3.md`
(+1 dòng `V3_RAP_PROMPT_BAT`).

KHÔNG chạm: `src/prompts.js` `src/kb.js` `src/lead-score.js` `src/orders/*` `src/pos/*`
`db/migrate/*` (không migration mới — bo_luat_chung/ky_nang đã có từ 001) — L3-M3 đang
chạy song song trong `src/orders/`+`db/migrate/006`, đo git status TRƯỚC và SAU, không
giao nhau.
