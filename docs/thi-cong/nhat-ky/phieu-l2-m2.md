# NHẬT KÝ — PHIẾU L2-M2 (Lớp từ khoá v3: thật/giả + hỏi size + vá `paano mag order`)

Thợ: sonnet · Base nhận việc: `baa86f1` (HEAD dịch trong lúc làm — điều bình thường trên cây
nhiều phiên, đo lại ngay trước commit, không neo SHA lúc nhận phiếu — bài học ㉟ skill
tho-thi-cong).

## 0 · Đã tra sổ nợ trước khi code (mục ⑦ phiếu)

`grep` neo `lop-tu-khoa`/`tu.khoa`/`paano`/`thật.giả`/`hỏi size`/`L2-M2` trong
`docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` §9 (dự án này KHÔNG có file `SO-NO.md` riêng — sổ nợ
sống trong chính §9 của sổ điều hành): **0 dòng khớp**. Đúng như phiếu ⑦ đã khai: "Sổ §9:
không nợ nào vùng src/chat/lop-tu-khoa." — không có ai đã vá/đang vá trùng, code thẳng.

## 1 · Đo lại nguyên liệu đề bài TRƯỚC khi code (án lệ #4 skill tho-thi-cong)

Đọc `src/fast-lane.js` (CẤM SỬA) dòng 68 lấy đúng `ASK_HOWTO`:

```
/(how to order|how do i order|how can i order|paano (?:mag)?(?:order|umorder|bumili)|pano (?:mag)?order|pa ?order|kaano|كيف أطلب|كيفية الطلب|طريقة الطلب)/i
```

Chạy `node -e` đo trực tiếp (không đoán) trên các biến thể phiếu nêu + biến thể tự thêm:

```
NOMATCH "paano mag order"        NOMATCH "paano mag-order"      MATCH   "paano magorder"
MATCH   "paano umorder"          NOMATCH "paano mag umorder"    NOMATCH "pano mag order"
MATCH   "pano magorder"          MATCH   "paano bumili"         MATCH   "paano order"
```

**Lệch đề bài nhỏ đã sửa ngay khi thấy:** phiếu ①/⑤ liệt "paano mag order, **paano umorder**,
pano mag order…" như ba ví dụ "biến thể tách chữ" — nhưng đo lại thì `paano umorder` **ĐÃ
khớp** regex gốc (không có khoảng trắng ở giữa `um` và `order` để vỡ). Lỗ THẬT chỉ nằm ở
`"mag" + KHOẢNG TRẮNG/GẠCH NỐI + động từ` (và biến thể có đệm "po"/"ba" trước "mag"). Không
sửa lại lời phiếu (không phải việc của thợ — luật 9), chỉ áp đúng cái LỖ THẬT vào code +
ghi rõ ở đây để người sau khỏi đi vá nhầm chỗ (kiểu «đề bài phiếu cũng có thể khai sai
nguyên liệu», án lệ #4).

Regex vá (`PAANO_GAP` trong `src/chat/lop-tu-khoa.js`) đo lại full ma trận (script trong
`/tmp` lúc code, không commit): **9/9 biến thể ĐÃ khớp cũ** vẫn KHÔNG khớp regex mới (không
giẫm lên phần fastLane đang đúng) · **9/9 biến thể GÃY** (bao gồm cả đệm "po"/"ba") khớp
regex mới · **13/13 câu không liên quan** (hỏi giá/địa chỉ/chào…) không khớp cả hai bên.

## 2 · Kiến trúc — chêm bậc "4b" giữa KB-check và Fast Lane

`handler-v3.js` có sẵn chuỗi đánh số (①HỘI THOẠI ②KB+MODEL ③STATE ④KB rỗng→handoff
⑤FAST LANE ⑥PHÂN LOẠI ⑦GỌI BỘ NÃO …). Phiếu ①: "lớp này đứng TRƯỚC classify/fastLane
trong handler." → chêm khối **"── 4b ·"** ngay sau ④ (kb.noData) và trước ⑤ (Fast Lane).
`lopTuKhoa({text, kb})` là hàm THUẦN (không DB, không mạng) — gọi trực tiếp (không qua
`deps`), cùng hạng với `dungState`/`ganTuState` (helper v3-native), khác với
`layKb/layModel/phanLoai/lanNhanh/chayCloser/kiemTinRa` (seam để thay bộ não CŨ trong test —
`lopTuKhoa` không thuộc bộ não cũ, không cần seam).

Khi `handled:true`: đi qua **CÙNG CỬA** `d.kiemTinRa` (M09) với Fast Lane/AI trước khi gửi —
quyết định có chủ đích (nói ra, không lặng lẽ chọn): câu trả lời của lớp mới vẫn là TEXT TỰ
DO marketer/ops gõ vào KB (`kb.config.fastLaneAuth`/`fastLaneSize`), y hệt
`fastLanePrice/fastLaneShip/fastLaneHowto` đã có — không có lý do để MIỄN kiểm cho riêng lớp
này. Test `test/l2-m2-handler.test.js` chứng minh bằng REAL `guardOutbound` (không stub): câu
lọt tiếng Việt bị chặn (`rule=VIETNAMESE`), ghi `spent_no_send`, không gửi.

## 3 · Ba luật — quyết định + trade-off nói ra

**Không bịa (đề bài ①):** luật `that_gia`/`hoi_size` chỉ trả lời khi
`kb.config.fastLaneAuth`/`fastLaneSize` CÓ chữ; rỗng ⇒ NHƯỜNG (`handled:false`, không đụng
gì — pipeline chạy tiếp y hệt chưa có lớp này). Đây là quy ước KB **MỚI**, cùng khuôn 3 field
0-đồng đã có (`fastLanePrice/fastLaneShip/fastLaneHowto`, `kb.js` SCRIPT_FIELDS) nhưng CHƯA
thêm vào `SCRIPT_FIELDS` — `kb.js` ngoài pathspec ③. Hệ quả: 2 field mới hôm nay chỉ sống
được qua sửa thẳng `kb-overrides.json` (đúng đường ⑤ phiếu chỉ định dùng để rút bộ từ khoá
thật), CHƯA có ô nhập dashboard. Ghi nợ §9 sổ điều hành + §12 `duong-tin-v1.md`.

**Luật `paano` KHÔNG nhường** khi thiếu `fastLaneHowto` riêng — dùng khung mặc định 3 ngôn
ngữ chép tay từ `FRAME[lang].howto` của `fast-lane.js` (hằng private, không export được).
Lý do KHÁC hai luật trên: đây là vá một câu trả lời ĐÃ AN TOÀN có sẵn (đúng nội dung fastLane
dùng khi bắt được `how to order`), không phải bịa claim mới về sản phẩm — nhường ở đây sẽ vô
hiệu hoá phần lớn giá trị của việc vá (71/73 page hôm nay `config` gần như rỗng — đo bằng
`node -e` trên `kb-overrides.json` thật tại gốc repo, xem §5 dưới). Nợ nhỏ đi kèm: 2 bản chữ
(`FRAME.howto` và `HOWTO_FALLBACK` ở đây) có thể trôi nếu ai sửa một bên mà quên bên kia —
đã ghi comment tại chỗ, không đưa vào §9 (rủi ro thấp, sửa rẻ khi phát hiện).

**Lớp mới KHÔNG re-bắt các biến thể fastLane ĐÃ bắt đúng** (`paano magorder`, `paano
umorder`, `how to order`…) — dù kỹ thuật có thể mở rộng `PAANO_GAP` để bắt CẢ họ, nhưng làm
vậy sẽ cướp quyền của bảng "Kịch bản tự động" L8 (`rule-store.js`, đã chạy TRƯỚC template
cứng trong `fastLane()`) cho đúng những câu mà marketer có thể đã tự cấu hình câu trả lời
riêng theo page. Phạm vi vá giữ ĐÚNG cái lỗ đã đo ở mục 1 — không hơn (án lệ #12 "cấm
over-engineering"). Test `test/l2-m2-lop-tu-khoa.test.js` có ca đối chứng riêng cho việc này.

**An toàn bổ sung (tự quyết, không có trong đề bài, ghi rõ vì sao):** thêm `HAS_PHONE` (chép
lại nguyên regex phone của `fast-lane.js`, không export được) và giữ nguyên trần **12 từ**
của `fastLane()` — khách vừa cho SĐT hoặc viết câu dài là đang giữa lượt chốt đơn/cần ngữ
cảnh đầy đủ, một câu trả lời mẫu (dù đúng chủ đề) chen ngang lúc này có rủi ro lạc lượt y hệt
lý do `fast-lane.js` đã cân nhắc cho các luật khác của chính nó. Test có ca riêng cho cả hai.

**Thuật ngữ đề bài ④#1/#3 "model 0 lượt (spy layModel=0)":** đo lại kiến trúc thì
`d.layModel(...)` (tra CẤU HÌNH model) chạy KHÔNG ĐIỀU KIỆN ở bước ② của handler, TRƯỚC CẢ
bước ④/④b — cho MỌI tin, bất kể lớp nào xử lý sau đó (kiến trúc L2-M1 có sẵn, ngoài phạm vi
phiếu này). Nên "layModel=0" không thể là nghĩa đen — đo thật (`node -e`) xác nhận nó LUÔN
= 1 dù lớp từ khoá có bắt hay không. Đọc theo Ý ĐỊNH của đề bài (0 token / không sinh
completion), tín hiệu ĐÚNG là `dem.goiModel`/`deps.chayCloser` (bộ đếm + seam đã có sẵn của
chính handler). Ghi RÕ ở đây theo luật 11 skill (gặp mơ hồ: hỏi tổng HOẶC ghi giả định ngay
tại chỗ quyết) — không dừng phiếu lại vì đây là một cách đọc rõ ràng, có bằng chứng đo, không
phải một ngã rẽ thiết kế.

## 4 · Phạm vi & vùng cấm — tự kiểm trước khi commit

`git diff --name-only HEAD` (đo NGAY TRƯỚC commit, không qua index — án lệ ㊱): 0 file phẳng
`src/[^/]+\.js` bị đụng · 0 dòng đụng `src/orders`/`src/pos`/`src/channels` (hai thợ khác
đang ở đó — `src/orders/index.js`, `src/orders/loc-trung.js`, `src/orders/ti-le-hoan.js`,
`db/migrate/005_*`, `test/l3-m2-*` là CỦA THỢ L3-M2, không đụng) · 0 dòng đụng 5 file CẤM SỬA
bộ não (`prompts.js closer.js tools.js fast-lane.js outbound-guard.js`). Đúng pathspec ③.

## 5 · Nguyên liệu thật đã đo (không bịa)

`kb-overrides.json` gốc repo (73 page): `grep`/`node -e` không tìm thấy field `size` có cấu
trúc nào trong `desc`/`variant`/`note` (chỉ 2/73 page có chữ "bust" trong mô tả marketing,
không phải bảng size); 71/73 page có `config` gần rỗng
(`{greeting:"",tone:"",salesPrompt:""}`). Xác nhận quyết định ở mục 3: hai luật thật/giả +
size hôm nay hầu như luôn NHƯỜNG trên dữ liệu thật hiện có — ĐÚNG THIẾT KẾ (fail-open về
AI, không bịa), giá trị của phiếu nằm ở chỗ SẴN SÀNG khi ai điền `kb-overrides.json`, không
phải ở tỉ lệ bắt hôm nay trên dữ liệu trống.

## 6 · Kết quả nghiệm thu

`bash ops/bin/nghiem-thu/l2-m2.sh` (chạy 3 lượt liên tiếp, lũy đẳng, `rc=0` cả ba):

```
① bắt đúng ≥12 thật/giả · ≥8 size · 0 lượt model   14/14|8/8|goiModel=0   ✔
② paano ≥3 biến thể — cũ trượt hết, mới bắt hết     6|6|6                  ✔
③ NHƯỜNG đúng — không bịa, model ĐƯỢC gọi           1|1|1|AI               ✔
④ 10 câu ngoài phạm vi — 0 câu bị cướp              10/10                  ✔
⑤ so_ai lane=tu_khoa_v3 + 0 token (SELECT thật)     3|true                 ✔
⑥a bộ ca l2-m2 (18 ca, 2 tệp)                       rc=0 (18/0)            ✔
⑥b hồi quy l2-m1 hàng đợi (12 ca)                   rc=0 (12/0)            ✔
⑥c hồi quy l2-m1 nhạc trưởng (11 ca, cần cờ mock)   rc=0 (11/0)            ✔
═══ TỔNG: 8 phép · ĐẠT 8 · TRƯỢT 0
```

`node --test test/l2-m2-lop-tu-khoa.test.js test/l2-m2-handler.test.js` độc lập: **18 ca
xanh** (12 đơn vị không cần DB + 6 tích hợp qua `xuLyMotTin` thật trên sandbox
`aicloser_v3_test_l2m2`, tự dựng/tự dọn qua `db/sandbox.js`). Hồi quy L2-M1 (2 tệp gốc, không
sửa) vẫn xanh nguyên: `node --test test/l2-m1-hang-doi.test.js` 12/12 ·
`node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js` 11/11.

## 7 · Phối hợp cây nhiều phiên

Nhận việc lúc HEAD `baa86f1`; 2 thợ khác đang chạy L3-M2 (`src/orders`) và VA-P1 (đã đóng,
merge vào `main` giữa lúc tôi làm — HEAD dịch từ `f55230a` → `baa86f1` qua 5 commit, không
đụng vùng của tôi). Không `git add -A`. Commit theo nghi thức private-index ㉟ (4 vế): đo
HEAD tươi ngay trước `git commit-tree` · `GIT_INDEX_FILE` riêng `read-tree` từ HEAD đó ·
`git add` đích danh từng đường dẫn pathspec (đọc ĐĨA) · `commit-tree`+`update-ref` CAS ·
`git diff --numstat <parent> <commit>` SAU commit để tự soát pathspec · kết bằng
`git reset -- <pathspec>` để đồng bộ index CHÍNH (bài học §9 của L2-M1 — thiếu bước này để
lại "D"/"MM" giả cho phiên sau).

Vì "commit `<hash>`" của dòng §10 tự tham chiếu chính nó (§10 nằm trong `SO-DIEU-HANH-THI-CONG.md`
— nếu gộp vào CÙNG commit thì hash chưa tồn tại lúc viết dòng đó), tách **2 commit** — đúng
khuôn đã thấy ở các phiếu trước (VA-P1 `b3d4e10`+`9b724e5`, L1-M1 `f5611cb`+`dff58ed`):

1. Code + test + `ops/bin/nghiem-thu/l2-m2.sh` + `docs/v3/ban-giao/duong-tin-v1.md` (§12) +
   chính nhật ký này — `feat(chat): L2-M2 — ...`.
2. Riêng `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` (§9 nợ mới + §10 3 dòng, tham chiếu hash
   THẬT của commit 1) — `docs(dieu-hanh): L2-M2 🔎 — ...`.

## 8 · Nhánh test KHÔNG chạm (khai theo luật 4 skill tho-thi-cong)

Nhánh gọi Pancake/Meta/model THẬT không đo (van nguồn đóng trên dev + token 121 theo IP máy
cá nhân — kế thừa nguyên trạng từ L2-M1, không phải việc của phiếu này). Đo hiệu quả trên
khách thật = §7b T3/T4 sổ điều hành (việc CEO/H8, không phải thợ).
