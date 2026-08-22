# NHẬT KÝ PHIẾU L1-M3 — Cửa Pancake WhatsApp: KHUNG + mock (phép gửi thật → §7b T1)

**Base:** `5bee9da` · **Làn:** 🟥 · thợ **sonnet** (khai trong phiếu — tái dùng NGUYÊN
cơ chế guard/định tuyến đã duyệt 2 vòng ở L1-M2; cơ chế mới duy nhất là luật MẪU TIN +
rào nguồn đơn).

## 1 · ĐO LẠI NGUYÊN LIỆU trước khi code (bước 3 skill, án lệ #4)

Phiếu ② đòi: tìm endpoint WhatsApp của Pancake bằng đọc code cũ + doc, KHÔNG chắc thì
dựng adapter interface trả về `chua-co-endpoint`. Đã đo, KHÔNG bịa:

- `src/pancake.js` (bọc bởi cửa Messenger L1-M2, `PK_BASE = "https://pages.fm/api/v1"`)
  — quét hết các route (`/pages`, `/conversations`, `/messages`, `/toggle_tag`,
  `/notes`, `/settings`, `/generate_page_access_token`, `/unread`) — **không có route
  `/whatsapp` nào**.
- `01-QUYET-DINH.md` §4: "Pancake có sẵn bốn cách kết nối WhatsApp, trong đó có Cloud
  API chính thức... Còn phải kiểm: Pancake cho gửi WhatsApp qua giao diện thì chắc
  chắn; **gửi bằng API thì cần thử một lần thật. Đây là ĐIỂM KIỂM CHẶN SỐ 1**" — chính
  là H1, sổ điều hành §8 còn ⬜.
- `docs/v3/90-phu-luc-bang-hoi-ky-thuat.md` §M1 ("Dùng kênh WhatsApp nào?") và §M2 ("Đã
  có WhatsApp Business Account chưa?") **còn để trống** — chưa trả lời cả đường lẫn tài
  khoản, và §"TỔNG KẾT — ĐƯỜNG GĂNG" xếp thủ tục Meta là nút thắt của khối WhatsApp,
  "không phải code".
- `src/wa.js` / `src/wa-login.js` (đọc để hiểu cơ chế, KHÔNG sửa/tái dùng — file phẳng
  đang chạy) dùng **Baileys** (`@whiskeysockets/baileys` trong `package.json`) — đường
  WhatsApp Web giả lập, 01 §4 ĐÃ LOẠI ("68% doanh nghiệp dùng công cụ không chính thức
  bị khoá ít nhất 1 lần/12 tháng"), và thực tế chỉ gửi được vào MỘT nhóm nội bộ, không
  gửi 1-1 cho khách (90-phu-luc bảng "Đang có gì").
- `.env` (chỉ đọc tên biến): không có biến `WA_*` nào ngoài `WA_GROUP_JID`-kiểu-cũ
  (không thấy trong danh sách khai báo tên biến — không có biến Cloud API nào cả).

**Kết luận:** endpoint Pancake WhatsApp CHƯA XÁC ĐỊNH được, đúng như phiếu tiên liệu.
Dựng adapter `src/channels/whatsapp/adapter.js#guiMauQuaPancake` — bản cài THẬT nhưng
LUÔN ném `LoiChuaCoEndpoint` (không phải mock giấu trong nhánh test) — và ghi §9 dưới.

## 2 · Đối chiếu nợ cũ (⑦ ĐÃ TRA CHƯA — nguyên văn từ phiếu, đã chạy sẵn)

```
$ grep -rn "whatsapp\|wa_" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep "§9"; rc=1 — chưa nợ nào vùng này
$ ls src/channels/whatsapp 2>/dev/null → chưa tồn tại
```

Repo này KHÔNG có `docs/thi-cong/SO-NO.md` (khác dự án LevelUp-Sales-OS mà skill dùng
chung — kiểm bằng `find . -iname 'SO-NO.md'`, 0 kết quả) — mục ⑦ tổng quát của skill áp
dụng qua chính khối "ĐÃ TRA" đã có sẵn trong phiếu, không cần tra thêm nguồn nào khác.

Tra thêm (chủ động, không có trong phiếu): `PHIEU-L3-M1.md` và
`docs/v3/ban-giao/bien-moi-truong-v3.md` (2 file vừa được TỔNG soạn song song, thấy
trong `git log 5bee9da..HEAD`) đã **tham chiếu sẵn** `guiTinMau`, `LoiSaiNguonDon`,
`V3_WA_GUI` — đúng tên hàm/lỗi/biến trong phiếu L1-M3 ②. Không có xung đột hợp đồng;
L3-M1 (thợ sau) mong `guiTinMau(donHangId=...)` hoạt động đúng như đã bàn giao ở §3 file
`cua-whatsapp-v1.md` — đặc biệt điểm **bảng mẫu RỖNG** (xem §3.2 dưới, việc L3-M1 cần
biết để không bị `LoiMauChuaDuyet` chặn oan khi test).

## 3 · Quyết định chốt trong lượt (nói ra tradeoff, luật 13)

### 3.1 · Định tuyến team qua `don_hang`, KHÔNG tái dùng `LoiPageKhongThuocTeam` của Messenger

`guiTinMau` không có `pageId`/`psid` (Cloud API không đi qua khái niệm Facebook Page) —
thực thể "sở hữu team" duy nhất trong tay hàm là `donHangId`. Cân nhắc: import thẳng
`LoiPageKhongThuocTeam` từ Messenger (phiếu cho phép: "⛔ Không đụng
`src/channels/messenger/` ngoài IMPORT khuôn lỗi nếu cần") — **chọn KHÔNG tái dùng**,
tự định nghĩa `LoiDonKhongThuocTeam` riêng. Lý do: tên lỗi nên nói đúng THỰC THỂ bị
chặn (đơn, không phải page) để log/alert đọc ra ngay loại tài nguyên, và hai cửa có
vòng đời độc lập (L3-M1 sẽ chỉ `instanceof` lỗi của WA, không nên phụ thuộc ngầm vào
module Messenger). Giá phải trả: hai class trùng Ý NGHĨA (không thuộc team, 0 dòng =
không tồn tại HOẶC của team khác) nhưng khác TÊN — chấp nhận được vì đây đúng khuôn
"mỗi cửa có bộ lỗi riêng" đã có sẵn trong repo (POS có `LoiVanGhiDong`/`LoiTrangThaiDaDoi`
riêng, Messenger có bộ ba riêng — không cửa nào chia sẻ lớp lỗi với cửa khác).

### 3.2 · Bảng mẫu tin RỖNG thật — không bịa mẫu "cho có"

`BANG_MAU_TIN = Object.freeze({})`. Cân nhắc: thêm MỘT mẫu ví dụ để "test dễ hơn" —
**từ chối**, vì Meta CHƯA duyệt mẫu nào (90-phu-luc §M1/§M2 bỏ trống) và một mẫu giả
mang tên như thật (`da_duyet:true`) là đúng thứ án lệ #4 cảnh báo: người sau đọc code
thấy bảng "có vẻ đủ" rồi quên đây là dữ liệu KHÔNG THẬT. Giá phải trả: mọi lượt gọi
`guiTinMau` không tiêm `deps.bangMauTin` LUÔN ném `LoiMauChuaDuyet`, kể cả trong nghiệm
thu ⑤ (gọi qua adapter thật) — đã ghi RÕ trong `cua-whatsapp-v1.md` §3 (mục riêng, in
đậm) để L3-M1 không mất thời gian tưởng nhầm là bug.

### 3.3 · Guard đứng CUỐI CÙNG (④), sau routing + nguồn + mẫu — khuôn L1-M2

Thứ tự CỐ Ý: định tuyến team → rào nguồn → luật mẫu → guard N1 → adapter. Khuôn đúng
`trangPageTheoTeam → xacNhanHoiThoaiThuocPage(N5) → kiemGuardGuiGhi(N1)` của Messenger
(guard luôn là bước cuối trước khi chạm mạng) — cho phép bộ ca đối chứng ① (guard a/b/c)
cô lập ĐÚNG MỘT biến (chỉ guard đổi, mọi thứ khác hợp lệ), và bộ ca ②③ (mẫu/nguồn) cô
lập ĐÚNG rào đang đo (guard luôn MỞ khi đo hai rào đó) — không có ca nào bị nhiễu bởi
gate khác.

### 3.4 · `coPhanHoi` trên `LoiChuaCoEndpoint` = `true` (khác `LoiPosKhongTraLoi` mặc định `false`)

Khuôn `src/pos/api.js#LoiPosKhongTraLoi`: `coPhanHoi` mặc định `false` (mất tín hiệu
mạng — KHÔNG biết chắc), chỉ `true` khi POS **đã trả lời**. Cân nhắc áp y hệt cho
`LoiChuaCoEndpoint` — **từ chối áp mặc định `false`**, vì "chưa cắm endpoint" không
phải một cú mạng bị mất, mà là quyết định CỤC BỘ, biết chắc TRƯỚC khi thử gọi (adapter
ném lỗi ngay, không có `fetch` nào chạy). Gán cứng `coPhanHoi=true` để `guiTinMau` ghi
pha 2 ("KHÔNG gửi — chưa có endpoint") thay vì để dòng bắt-đầu mồ côi oan — mồ côi phải
dành riêng cho lượt THẬT SỰ không biết kết cục (timeout/đứt mạng thật, xem test "hai pha
· mất phản hồi"). Đã đo cả hai nhánh trong `l1-m3.sh` phép ④c và ⑤ — không mồ côi khi
gọi adapter thật.

### 3.5 · KHÔNG ghi nhật ký "bị chặn" cho gate ②③④ (khác `pos_ghi_bi_chan` của L1-M1)

L1-M1 (`ghi-nguoc.js`) ghi MỘT dòng `pos_ghi_bi_chan` cho MỌI gate an toàn bị chặn
(a/b/c), lý do nêu rõ: "im lặng thì không ai biết đã có người thử". Phiếu L1-M3 chỉ
liệt kê đúng "guard fail-closed + định tuyến team + ctxHeThong + **nhật ký 2 pha**" là
cơ chế cần sao chép — KHÔNG nhắc tới nhật ký cho các gate nghiệp vụ (nguồn/mẫu). Chọn
KHÔNG thêm log riêng cho ②③④(guard) — chỉ giữ đúng 1 dòng `nhat_ky` cho vi phạm định
tuyến team (mirror `chan_page_xuyen_team`) + hai pha cho hành động GỬI thật sự. Giá
phải trả: một lượt bị chặn vì mẫu chưa duyệt hoặc nguồn sai KHÔNG để lại dấu vết trong
`nhat_ky` (chỉ trả lỗi có tên cho caller ngay lúc gọi) — chấp nhận được vì đây là lỗi
GỌI SAI ở tầng ứng dụng (caller đọc lỗi ngay, không phải tình huống "gửi đi rồi mất
dấu"), khác hẳn tình huống L1-M1 xử lý (thao tác ghi đơn tiền thật cần audit MỌI lượt
thử). Nếu sau này cần audit đầy đủ hơn (vd đo tỉ lệ đơn bị chặn vì thiếu mẫu), mở phiếu
riêng — không tự thêm ở đây (luật 12, cấm over-engineering).

## 4 · Kết quả nghiệm thu ④ (cổng `ops/bin/nghiem-thu/l1-m3.sh`, sandbox `aicloser_v3_nt_l1m3`)

```
① guard a/b/c: a=0 · b=0 · c=1                                          ✔ ✔ ✔ ✔ ✔ ✔
② mẫu chưa duyệt/rỗng → LoiMauChuaDuyet (spy 0) · da_duyet → qua (spy 1) ✔ ✔ ✔ ✔
③ nguồn messenger → LoiSaiNguonDon (spy 0) · trang_ban_hang → qua        ✔ ✔ ✔ ✔
④ đơn xuyên team → LoiDonKhongThuocTeam + nhat_ky +1, spy 0              ✔ ✔ ✔ ✔
④b ctxHeThong() → nhat_ky(wa_gui_bat_dau) mang team_id THẬT             ✔
④c hai pha: thành công 1;1 · từ chối coPhanHoi=true 1;1 · timeout 1;0   ✔ ✔ ✔
⑤ adapter thật → LoiChuaCoEndpoint, coPhanHoi=true                      ✔ ✔
⑤ HOÃN — gửi WhatsApp THẬT (§7b T1, chờ H1)                              ⏸
⑥ npm test test/l1-m3-*.test.js: 17/17 xanh                             ✔

TỔNG: 24 phép · ĐẠT 24 · TRƯỢT 0 · HOÃN 1
```

Chặng 1 `_chan1.sh l1-m3`: ①②③⑤⑦ đạt; **④pathspec và ⑥marker báo ĐỎ vì NHIỄU SONG
SONG** (khuôn án lệ đã có ở nhật ký L1-M1 §"phép ④ nhiễu song song") — `git diff
5bee9da..HEAD` gồm 7 commit của TỔNG soạn L2-M1/L3-M1 song song (`docs/thi-cong/nhat-ky/
nghiep-vu-L2-M1.verdict.yaml`, `PHIEU-L2-M1.md`, `PHIEU-L3-M1.md`,
`bien-moi-truong-v3.md`), KHÔNG phải file của tôi. Xác minh bằng
`grep -rn "NEEDS CLARIFICATION" src/channels/whatsapp/ test/l1-m3-cua.test.js
ops/bin/nghiem-thu/l1-m3.sh` → 0 kết quả; marker đếm=1 nằm trong
`nghiep-vu-L2-M1.verdict.yaml` (đo bằng `git diff ... | xargs grep -ln`). `git status
--short` xác nhận cây làm việc của tôi CHỈ có đúng 3 đường dẫn chưa track:
`ops/bin/nghiem-thu/l1-m3.sh`, `src/channels/whatsapp/`, `test/l1-m3-cua.test.js` — cả
ba ⊆ pathspec ③. Sau commit sẽ đo lại per-commit (`git diff --numstat <parent>
<commit>`, luật ㉟) để xác nhận diff CHỈ chứa pathspec của tôi.

## 5 · Test — nhánh nào chạm, nhánh nào không

**Chạm (test/l1-m3-cua.test.js, 17 ca, DB thật `aicloser_v3_test_l1m3cua` tự dựng/dọn):**
guard a/b/c (3) · mẫu chưa duyệt (bảng test + bảng thật rỗng, 2) + mẫu duyệt (1) · nguồn
messenger/trang_ban_hang (2) · định tuyến xuyên team + đơn không tồn tại (2) ·
`ctxHeThong()` gắn team thật + đơn không tồn tại (2) · hai pha thành công/từ chối-đã-
biết/mồ côi-timeout (3) · adapter thật gọi trực tiếp + qua `guiTinMau` (2).

**KHÔNG chạm (HOÃN có chủ đích, khai minh bạch):** gửi WhatsApp thật qua Pancake HTTP —
§7b T1, chờ H1 (endpoint chưa tồn tại — không THỂ test được, không phải bỏ sót).
`soNhan` không được kiểm khuôn (E.164) — phiếu không đòi, cửa truyền nguyên vẹn xuống
adapter (xem §1 `cua-whatsapp-v1.md`). Không test tương tác với `src/orders/` (L3-M1,
chưa tồn tại tại thời điểm code — chỉ đối chiếu hợp đồng tên hàm/lỗi qua đọc phiếu, §2).

## 6 · Ngoài phạm vi — SỔ NỢ

Không phát sinh nợ §9 MỚI trong lượt này. Đã kiểm tra: (a) hợp đồng tên hàm/lỗi/biến
khớp với `PHIEU-L3-M1.md` + `bien-moi-truong-v3.md` đã soạn song song (§2 trên) — không
xung đột cần ghi nợ; (b) không đụng/không cần đụng file ngoài pathspec ③; (c) không phát
hiện lệch đề bài nào khác ngoài "endpoint chưa xác định" mà phiếu đã tiên liệu sẵn
(không phải một phát hiện MỚI cần §9 — đã có sẵn trong chính văn phiếu ②).
