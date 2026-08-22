# NHẬT KÝ PHIẾU L1-M2 — Cửa Pancake Messenger (bọc code cũ + định tuyến team + guard)

**Thợ:** session thợ thi công (Sonnet 5) · **Ngày:** 22/08/2026
**Base:** `dfcd9ae` (phiếu khai) · **Cây lúc code:** `e88bed7` (chốt Base L1-M1+L1-M2 —
không có commit nào khác giữa hai mốc đụng vùng của phiếu này)
**Làn:** 🟥 (có đường GỬI TIN RA KHÁCH) nhưng route **sonnet** theo lệnh 22/08 · **Skill
nạp:** `tho-thi-cong`
**Cổng:** `bash ops/bin/nghiem-thu/l1-m2.sh` → **15 phép · ĐẠT 15 · TRƯỢT 0** (chạy 2 lượt
liên tiếp, cùng kết quả) · `node --test test/l1-m2-cua.test.js` → **17 ca xanh / 0 đỏ**

---

## 1 · ĐO LẠI NGUYÊN LIỆU trước khi code (bước 3 skill)

| Nguyên liệu                              | Phiếu ② khai                                                          | ĐO THẬT 22/08                                                                                                                                                                                                                                                                        | Kết                                           |
| ---------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `src/pancake.js`                         | 269 dòng — đọc conv/tin, gửi reply/ảnh, tag, note, kho token          | đúng 269 dòng. Export thật: `decodeTok listPancakeTokens addPancakeToken removePancakeToken pkMarkUnread pancakePages pancakePageCount refreshPancakePages pkGetConversations pkGetMessages pkToggleTag pkTagId pkTagByName pkSendReply pkSendImage pkAddNote createOrder`           | khớp                                          |
| `PANCAKE_READONLY` ở bản cũ              | "kiểm RẢI RÁC ở từng caller, `pkSendReply` KHÔNG tự kiểm"             | xác nhận đúng — `pkSendReply`/`pkSendImage`/`pkAddNote`/`pkTagByName` trong `pancake.js` **0 dòng** đọc `PANCAKE_READONLY`; 12 chỗ kiểm rải rác ở `admin-orders.js:21`, `scheduler-followup.js:39`, `pancake-poll.js:229`… (đều `process.env.PANCAKE_READONLY === '1'`, "vắng = mở") | khớp — đúng lý do cửa mới cần guard TẬP TRUNG |
| `hoi_thoai` UNIQUE                       | `(page,psid)`                                                         | đúng: `UNIQUE (page_id, psid)`, `page_id` là FK **bigint** tới `page.id` (nội bộ), KHÔNG phải `page_id` text Facebook                                                                                                                                                                | khớp, cần phân biệt hai "page_id"             |
| **`convId` (Pancake) so với cột `psid`** | ④#2b: "tra hoi_thoai (UNIQUE(page,psid))" để kiểm convId thuộc pageId | **LỆCH** — xem §3.1, đây là phát hiện chính của lượt này                                                                                                                                                                                                                             | phải quyết định, không đoán ngầm              |
| `.env` hiện trạng                        | không khai cụ thể                                                     | `PANCAKE_READONLY=1` (dòng 77) · `DATABASE_URL_V3` có · `V3_KHOA_MA_HOA` có · **`V3_PANCAKE_GUI` VẮNG MẶT** (đúng — việc NGƯỜI H9, chưa cutover)                                                                                                                                     | khớp kỳ vọng fail-closed                      |
| `pkAddNote` chữ ký                       | không khai chi tiết                                                   | `pkAddNote(pageId, custId, message)` — **không có convId/psid** (khác 4 hàm còn lại) → ảnh hưởng thiết kế N5 cho `ghiNote` (xem §3.5)                                                                                                                                                | phát hiện, đã xử lý                           |

### 1.1 · Phát hiện lệch đề bài — `convId` ≠ `psid` (án lệ #4 skill, không phải giả định)

Bằng chứng, không suy đoán:

- `src/pancake-poll.js:277` — `const psid = c.from_psid;` — tách RIÊNG khỏi `c.id`
  (dùng làm `convId`/`pkConvId` xuyên suốt file, vd dòng 369 `pkGetMessages(pageId, c.id,
custId)`, dòng 417 `pkConvId: c.id`).
- `test/l7-miner-order.test.mjs:122` — fixture mock cũ: `id: 'c${i}', from_psid:
'psid${i}'` — **CỐ Ý** hai chuỗi khác nhau (`"c1"` vs `"psid1"`), chứng tỏ tác giả gốc
  của repo này đã mô hình hai giá trị này là ĐỘC LẬP, không phải cùng trường đổi tên.
- `hoi_thoai` (schema `db/schema.sql`) **không có cột nào** lưu `convId` thô của
  Pancake — chỉ có `psid` (nguồn `c.from_psid`, xác nhận qua `db/di-tru/nguon.js:6`:
  `conv-state.json ... khoá = "<pageId>_<psid>"`).

**Hệ quả nếu làm đúng CHỮ của phiếu (so `convId === hoi_thoai.psid`):** câu tra sẽ
**0 dòng khớp VĨNH VIỄN** với MỌI hội thoại thật (không phải chỉ hội thoại giả mạo) —
cửa sẽ khoá câm 100% lượt gọi hợp lệ. Đây đúng án lệ #4 skill: "Code theo đúng chữ của
đề bài sai thì luật ra đời CÂM."

## 2 · Đối chiếu nợ cũ (⑦ ĐÃ TRA CHƯA)

Không có `docs/thi-cong/SO-NO.md` trong repo này (giống phát hiện của L0-M2 — khác dự
án LevelUp-Sales-OS mà skill v3 bổ sung nhắc tới). Phiếu tự chạy sẵn câu ⑦
(`grep messenger|pancake ... | grep §9` → `rc=1`, không dòng nợ nào đụng
`src/channels/messenger`), đo lại xác nhận đúng. Grep thêm không tìm phán/nợ nào khác
đụng vùng này trong `docs/thi-cong/nhat-ky/*.md`.

## 3 · Quyết định chốt trong lượt (nói ra tradeoff, luật 13)

### 3.1 · N5 tra chéo bằng `psid`, KHÔNG so `convId` Pancake

Quyết định (không phải giả định ngầm — rule 11+13): giữ đúng CƠ CHẾ mà phiếu trích dẫn
(`hoi_thoai` UNIQUE(page_id,psid)), nhưng tham số dùng để SO KHỚP quyền sở hữu là
**`psid`** (Facebook PSID, đúng cột thật tồn tại), không phải `convId` của Pancake.
`convId` vẫn được **truyền xuống nguyên vẹn** cho lệnh gọi HTTP thật (API Pancake bắt
buộc cần nó, không có cách nào thay thế). Test `N5b` khẳng định rõ: gọi xuống với
`convId="pk-conv-abc"` trong khi `psid="psid-khach-a1"` — hai giá trị khác nhau, không
bị "đánh tráo".

**Giá phải trả:** mọi hàm nhận hội thoại (`docTin`, `guiTin`, `guiAnh`, `gatThe`) đòi
CẢ `psid` LẪN `convId` làm hai tham số riêng — không tự suy ra cái này từ cái kia. Đây
KHÔNG phải gánh nặng mới cho L2-M1: vòng poll v2 vốn đã luôn mang cả hai giá trị song
song suốt vòng đời (`processConv(pageId, c, psid, custId, mark)`), nên người gọi kế
tiếp không phải tính toán gì thêm — chỉ cần truyền đúng cả hai field đã có sẵn trong
tay. Đã ghi rõ thành hợp đồng trong `docs/v3/ban-giao/cua-messenger-v1.md` §2 (không
phải hành vi ngầm).

**Vì sao không cắm marker chờ làm rõ để chặn, thay vì tự quyết:** rule 11 cho hai lựa
chọn — hỏi tổng (block) HOẶC ghi rõ giả định (không block). Đây có bằng chứng CỨNG
(2 chỗ code + schema, không phải một khả năng mơ hồ 50/50), và một cách đọc khác (so
trực tiếp) chắc chắn làm cửa câm 100% — không phải một trade-off cân bằng cần người
quyết, mà là vá một lỗi khai nguyên liệu rõ ràng. Chọn ghi quyết định có bằng chứng,
dành marker chờ làm rõ cho chỗ THẬT SỰ 50/50.

### 3.2 · Ba lỗi MỚI ở tầng CỬA, không tái dùng `LoiXuyenTeam`/`LoiThieuBoiCanhTeam`

`LoiPageKhongThuocTeam` (định tuyến), `LoiHoiThoaiKhongThuocPage` (N5),
`LoiCuaGuiDong` (guard N1) — ba class riêng trong `src/channels/messenger/loi.js`,
không tái dùng lỗi của tầng truy vấn. Lý do: `LoiXuyenTeam` của tầng truy vấn có nghĩa
CHÍNH XÁC là "ctx hợp lệ nhưng truyền tay `team_id` khác trong `dieuKien`/`duLieu`" —
tình huống của cửa này khác hẳn (page/hội thoại thuộc team khác, phát hiện qua 0 dòng
kết quả của một `layNhieu` đã tự scope, không phải truyền tay `team_id`). Gộp chung tên
sẽ làm người bắt lỗi (`catch (e) { if (e instanceof LoiXuyenTeam) ... }`) không phân
biệt được lỗi đến từ tầng nào, và làm sai lệch bảng ⑤/①④ mà tầng truy vấn đã định nghĩa
rạch ròi.

### 3.3 · Job nền (`ctxHeThong`) tra `page.team_id` bằng SQL trực tiếp — cùng tiền lệ `thanh_vien_team`

`trangPageTheoTeam()` nhánh `ctx.laHeThong` dùng `pool.query("SELECT id, team_id FROM
page WHERE page_id = $1", ...)` — bỏ qua tầng truy vấn (`layNhieu`) vì đây đúng bài
toán con-gà-quả-trứng: tầng truy vấn đòi ctx.teamId đã biết TRƯỚC khi lọc, nhưng mục
đích của bước này là TÌM RA team đó. `docs/v3/ban-giao/luoc-do-v1.md` §6 đã cho tiền lệ
y hệt cho `thanh_vien_team` ("SQL trực tiếp qua `db/ket-noi.js`, không qua `src/db/`").
Truy vấn CHỈ đọc 1 dòng theo khoá tự nhiên (`page_id`), không liệt kê rộng — không phải
lối vòng bỏ rào team, mà là bước DUY NHẤT có thể bootstrap ra team. Sau bước này, MỌI
lượt gọi tầng truy vấn tiếp theo lại đi qua `ctxHeThong()` bình thường (tự ghi
`nhat_ky` mỗi lượt, đúng hợp đồng `boi-canh.js`).

**Hệ quả cần biết:** `docHoiThoai` dưới `ctxHeThong()` KHÔNG tự sinh dòng `nhat_ky` nào
(routing của nó chỉ là raw SELECT, không gọi `layNhieu`) — trong khi `docTin`/`guiTin`/
`guiAnh`/`gatThe` (có bước N5 gọi `layNhieu(ctxHeThong(), "hoi_thoai", ...)`) THÌ CÓ,
tự động qua cơ chế sẵn có của tầng truy vấn (`ghiNhatKyHeThong`). Test `N3a`/phép ③ của
cổng CỐ Ý dùng `docTin` (không phải `docHoiThoai`) làm vật đo cho lý do này — đã kiểm
tra kỹ để không chọn nhầm hàm không tạo ra tín hiệu cần đo.

### 3.4 · Thứ tự kiểm: định tuyến team → N5 → guard → gọi xuống

Khớp đúng thứ tự phiếu ② liệt kê các bullet (định tuyến team trước, guard sau). Test
`②b`/`N5a`/`N5b` cố ý đặt **guard MỞ** (`V3_PANCAKE_GUI=1`, không readonly) khi đo N5 —
để chứng minh N5 tự nó chặn được, không phải "ăn theo" một guard đang đóng sẵn (đúng
tinh thần án lệ #29 skill: phanh phải có ca hành-vi thật, không chỉ known-answer).

### 3.5 · `ghiNote` không áp N5 — do CẤU TRÚC của `pkAddNote`, không phải bỏ sót

`pkAddNote(pageId, custId, message)` không nhận `convId`/`psid` — API Pancake gắn ghi
chú vào HỒ SƠ KHÁCH, không vào một hội thoại cụ thể. `ghiNote` của cửa v3 giữ đúng chữ
ký đó, chỉ áp định tuyến team (page) + guard N1, không áp N5 (không có gì để tra). Ghi
rõ trong code comment + ban-giao, tránh người đọc sau tưởng nhầm là thiếu.

### 3.6 · Dependency-injection qua tham số `deps` — tái dùng khuôn có sẵn, không phát minh mock mới

Sáu hàm nhận tham số thứ tư `deps = {}` (vd `{ send = pkSendReply }`) để tiêm spy/mock
khi test — module ESM không cho monkey-patch export trực tiếp (binding chỉ đọc). Khuôn
này **đã có sẵn** ở `src/scheduler-followup.js:277` (`send = pkSendReply` làm default
param) — tái dùng nguyên xi, không phát minh cơ chế mock mới (luật 12 "cấm
over-engineering").

## 4 · Kết quả nghiệm thu ④ (cổng `ops/bin/nghiem-thu/l1-m2.sh`, sandbox `aicloser_v3_nt_l1m2`)

| Phép                                         | Số đo                                                                                                                          | Kết |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --- |
| ① guard 3 ca đối chứng (N1+N4)               | **a=0 · b=0 · c=1** (đúng khuôn phiếu yêu cầu in)                                                                              | ✔   |
| ①b tính duy nhất trong V3 (N2)               | import trực tiếp `pancake.js` trong `src/{db,pos,channels,chat,orders,queue}` = ĐÚNG 1 file: `src/channels/messenger/index.js` | ✔   |
| ② định tuyến team (page khác team)           | `LoiPageKhongThuocTeam` · spy=0 · `nhat_ky(chan_page_xuyen_team)` 0→1 (+1)                                                     | ✔   |
| ②b N5 (psid không thuộc page, guard đang MỞ) | `LoiHoiThoaiKhongThuocPage` · spy=0                                                                                            | ✔   |
| ③ `ctxHeThong` gắn ĐÚNG team (N3)            | `nhat_ky` dòng mới `team_id=1` (= team thật của page, không NULL/`chua-phan`)                                                  | ✔   |
| ④ hàm ĐỌC dưới guard đóng                    | vẫn trả `[{"id":"mau-1"}]` (không bị chặn)                                                                                     | ✔   |
| ⑤ nhánh Pancake thật                         | in "CHƯA CHẠY — chờ VPS" (token 121 IP cá nhân, không giả xanh)                                                                | —   |
| ⑥ `npm test` bộ l1-m2                        | **17 xanh / 0 đỏ**                                                                                                             | ✔   |

**TỔNG (gate script): 15 phép · ĐẠT 15 · TRƯỢT 0** — chạy lặp lại lần 2 để loại flaky,
cùng kết quả cả hai lượt.

## 5 · Test — nhánh nào chạm, nhánh nào không

**17 ca, 1 tệp** `test/l1-m2-cua.test.js`, tự dựng CSDL sandbox riêng
(`aicloser_v3_test_l1m2cua`) rồi tự dọn (`db/sandbox.js`) — KHÔNG chạy trên
`aicloser_v3` (CSDL dev). Nhóm ca:

- **Định tuyến team** (N1a–c): page đúng team → qua; page team khác →
  `LoiPageKhongThuocTeam` + `nhat_ky` +1, spy=0; page không tồn tại → tương tự, spy=0.
- **N5** (N5a–b): psid sai → `LoiHoiThoaiKhongThuocPage`, spy=0; psid đúng → qua, và
  xác nhận rõ `convId` truyền xuống KHÁC `psid` (không bị đánh tráo, xem §3.1).
- **Guard N1** (guard-a/b/c/doc): vắng biến → chặn spy=0; cả hai biến sai chiều → chặn
  spy=0; đúng cả hai (đối chứng dương) → spy=1; hàm ĐỌC dưới guard đóng vẫn đọc được.
- **N3** (N3a–b): `ctxHeThong()` trên page có team → `nhat_ky` mang `team_id` thật;
  page không tồn tại → `LoiPageKhongThuocTeam`, không có team để ghi log.
- **`ghiNote`** (a–c): guard đóng chặn; guard mở + đúng page → gọi xuống với đúng 3 đối
  số; page sai team → chặn trước cả khi tới guard.
- **`guiAnh`/`gatThe`**: đường CHO-QUA thật (án lệ #29 skill) — xác nhận đối số truyền
  xuống `pkSendImage`/`pkTagByName` đúng thứ tự/giá trị; `gatThe` có thêm ca guard đóng.

**Nhánh KHÔNG chạm (khai rõ, không giấu):** gọi Pancake THẬT qua HTTP (token 121 ở IP
cá nhân — NHÁNH-VPS, phép ⑤ của cổng in "CHƯA CHẠY — chờ VPS", không giả xanh). Đường
phục vụ request thật của L2-M1 (chưa tồn tại — cửa này chỉ là tầng được GỌI, chưa có ai
gọi thật ngoài test/cổng).

## 6 · Ngoài phạm vi — nợ chuyển L2-M1 (N2, APPEND nguyên văn vào §9 sổ điều hành)

Theo đúng phiếu ②#3 (tổng đã duyệt trước): `src/tools.js:1` (bộ não chat, CẤM SỬA)
import thẳng `createOrder, pkSendImage, pkAddNote, pkTagByName` từ `pancake.js`;
`scheduler-followup.js:24` import `pkSendReply` — bốn hàm gửi không một dòng guard.
Cửa v3 KHÔNG bịt được lối này trong phiếu này (đụng file cấm); L2-M1 khi chuyển đường
xử lý tin PHẢI route outbound của bộ não qua cửa v3 (DI/injection, không sửa
`tools.js`). Đã APPEND đúng câu này vào §9 sổ điều hành (không diễn giải lại).

Không phát hiện thêm nợ nào khác ngoài phạm vi. Không đụng `src/pos/` (vùng L1-M1 đang
chạy song song), không đụng `db/migrate/*` hay `db/schema.sql`, không đụng file phẳng
dưới `src/`, không đổi `package.json`, `.env` chỉ ĐỌC (không ghi). Lượt này không cắm
marker chờ làm rõ nào — chỗ mơ hồ duy nhất (psid≠convId, §3.1) đã thành quyết định có
bằng chứng, không phải phỏng đoán.
