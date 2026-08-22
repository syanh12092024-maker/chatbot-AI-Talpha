# BÀN GIAO — CỬA PANCAKE MESSENGER v1 (cho L2-M1 và mọi module gọi Messenger)

> Phiếu **L1-M2** · dựng 22/08/2026 · nguồn sự thật của file này là `src/channels/messenger/*.js`.
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l1-m2.sh`.
> Đọc trước: [`docs/v3/ban-giao/tang-truy-van-v1.md`](./tang-truy-van-v1.md) (ctx, hai lỗi
> `LoiThieuBoiCanhTeam`/`LoiXuyenTeam`, `ctxHeThong()`).

## 0 · Import từ đâu

```js
import {
  docHoiThoai,
  docTin,
  guiTin,
  guiAnh,
  ghiNote,
  gatThe,
  LoiPageKhongThuocTeam,
  LoiHoiThoaiKhongThuocPage,
  LoiCuaGuiDong,
} from "../../channels/messenger/index.js"; // (sửa lại số cấp `../` theo vị trí file gọi)
```

`src/pancake.js` (bản cũ, 269 dòng — đọc conv/tin · gửi reply/ảnh · tag · note · kho
token) **KHÔNG import trực tiếp ở bất kỳ module V3 nào khác** — cửa này là **MỘT chỗ
DUY NHẤT** trong `src/db|pos|channels|chat|orders|queue` gọi xuống nó (đo bằng
`ops/bin/nghiem-thu/l1-m2.sh` phép ①b, lặp lại mỗi lần chạy cổng). Đường v2 cũ
(`pancake-poll.js`, `tools.js`, `handler.js`, `scheduler-followup.js`, `admin*.js`,
`order-bridge.js`) vẫn import thẳng — có vòng đời riêng, xem §4 "nợ N2" dưới.

## 1 · Sáu hàm — chữ ký

```ts
docHoiThoai(pool, ctx, { pageId });                                       // → mảng conversations (Pancake)
docTin(pool, ctx, { pageId, psid, convId, custId });                      // → mảng messages (Pancake, tối đa 25)
guiTin(pool, ctx, { pageId, psid, convId, custId, text });                // → { ok, id } | { ok:false, error }
guiAnh(pool, ctx, { pageId, psid, convId, custId, url, caption? });       // → { ok, id } | { ok:false, error }
ghiNote(pool, ctx, { pageId, custId, message });                         // → { ok } | { ok:false, error }
gatThe(pool, ctx, { pageId, psid, convId, name, on? = true });            // → { ok, tags } | { ok:false, error }
```

- `pool` — giống hệt tầng truy vấn (`taoPool()`/`voiPool()` của `db/ket-noi.js`), cửa
  này **không mở pool riêng**.
- `ctx` — **cùng hình dạng `{ teamId, nguoiDungId }`** của tầng truy vấn, HOẶC
  `ctxHeThong()` cho đường job nền (poll/webhook — "không có NGƯỜI", xem §3).
- Tham số thứ tư `deps = {}` (không ghi trong bảng trên) — tiêm hàm pancake.js thật
  thay bằng spy/mock khi test (mặc định là hàm thật, khớp tên: `getConversations`,
  `getMessages`, `send`, `sendImage`, `addNote`, `tagByName`). Cùng khuôn
  `send = pkSendReply` đã có sẵn ở `src/scheduler-followup.js:277`.
- Mọi chặn (định tuyến team, N5, guard) **NÉM lỗi có tên** — không trả `{ok:false}`.
  Chỉ lỗi MẠNG/API thật của Pancake mới trả `{ok:false,error}` (nguyên hình dạng cũ,
  đi thẳng qua cửa không đổi).

## 2 · ⚠️ `psid` ≠ `convId` của Pancake — ĐỌC KỸ TRƯỚC KHI GỌI

Phiếu gốc viết "kiểm convId thuộc pageId qua `hoi_thoai` (UNIQUE(page,psid))" — đo lại
nguyên liệu (skill `tho-thi-cong` bước 3) thì **hai giá trị này KHÁC NHAU trong dữ liệu
thật**, không phải cùng một trường đổi tên:

| Tên biến trong code cũ                | Là gì                                         | Ví dụ dạng     |
| ------------------------------------- | --------------------------------------------- | -------------- |
| `convId` (`c.id`, tham số `pkConvId`) | id hội thoại **của Pancake**, dùng để gọi API | `"c17..."`     |
| `psid` (`c.from_psid`)                | Facebook Page-Scoped ID của khách, lưu ở DB   | `"2787903..."` |
| `custId` (`c.customers[0].id`)        | id khách hàng **của Pancake**                 | số/chuỗi khác  |

Bằng chứng: `src/pancake-poll.js:277` (`const psid = c.from_psid;` — tách riêng khỏi
`c.id`) và fixture cũ `test/l7-miner-order.test.mjs:122`
(`id: "c${i}", from_psid: "psid${i}"` — **cố ý** hai chuỗi khác nhau). Cột
`hoi_thoai.psid` chứa `from_psid`, **không có cột nào** lưu `convId` thô của Pancake.

⇒ Cửa này tra N5 (hội thoại thuộc đúng page) bằng **`psid`**, không phải `convId`.
`convId` vẫn được **truyền xuống nguyên vẹn** cho lệnh gọi HTTP thật (Pancake bắt buộc
cần nó) nhưng **không** dùng để xét quyền sở hữu. Caller (bạn, L2-M1) phải có sẵn cả
hai giá trị khi gọi `docTin`/`guiTin`/`guiAnh`/`gatThe` — đúng những gì vòng poll v2 đã
luôn mang theo (`processConv(pageId, c, psid, custId, mark)`), nên không phát sinh việc
tính toán mới.

**Hệ quả bắt buộc:** hội thoại **MỚI** (khách nhắn tin lần đầu, chưa có dòng
`hoi_thoai`) phải được `themMoi(pool, ctx, "hoi_thoai", { page_id, psid, ... })` (tầng
truy vấn) **TRƯỚC** khi gọi bất kỳ hàm nào ở cửa này nhận `psid` — cửa không tự tạo
dòng `hoi_thoai` hộ bạn (ngoài phạm vi phiếu L1-M2, đây là việc điều phối luồng tin
của L2-M1).

## 3 · Định tuyến team + `ctxHeThong()` (N3)

- **ctx NGƯỜI** (`{teamId, nguoiDungId}`): cửa tra `page` theo `page_id` (khoá tự
  nhiên Facebook, text) qua CHÍNH tầng truy vấn (`layNhieu(pool, ctx, "page", ...)`) —
  0 dòng khớp (page không tồn tại HOẶC thuộc team khác) ⇒ `LoiPageKhongThuocTeam` + 1
  dòng `nhat_ky` (`hanh_dong='chan_page_xuyen_team'`).
- **`ctxHeThong()`** (job nền — poll/webhook, "không có NGƯỜI" chứ không phải "không có
  TEAM"): cửa tự tra `page.team_id` **RAW** (bỏ qua ctx-scope — chưa có team nào để mà
  scope, cùng tiền lệ `thanh_vien_team` ở `luoc-do-v1.md` §6) rồi tự dựng lại
  `ctxHeThong()` để gọi tiếp — MỌI lượt gọi tầng truy vấn dưới nhánh này đều tự ghi
  `nhat_ky` với `team_id` **THẬT** của page (không phải NULL/`chua-phan`). Page không
  tồn tại ⇒ `LoiPageKhongThuocTeam`, không ghi `nhat_ky` (chưa có team để ghi).
- `ghiNote` không nhận `psid`/`convId` (API Pancake của nó chỉ cần `pageId`+`custId`) —
  vẫn định tuyến team, không áp N5 (không phải thiếu sót, `pkAddNote` không có tham số
  để mà kiểm).

## 4 · Guard tại cửa (N1) — chỉ nhóm hàm GỬI/GHI

```
guiTin · guiAnh · ghiNote · gatThe  chỉ chạy khi
  process.env.V3_PANCAKE_GUI === "1"  VÀ  process.env.PANCAKE_READONLY !== "1"
mọi trường hợp khác (vắng biến, giá trị lạ, chỉ một vế đúng) → LoiCuaGuiDong,
KHÔNG gọi xuống pancake.js. VẮNG BIẾN = ĐÓNG (fail-closed đúng chiều).
```

`docHoiThoai`/`docTin` (ĐỌC) **không** đi qua guard này — chỉ định tuyến team + N5.
Đọc env **tươi mỗi lượt gọi** (không cache lúc import) — đổi biến giữa hai lượt gọi
trong cùng tiến trình có hiệu lực ngay.

**Việc NGƯỜI khi cutover VPS (H9, sổ điều hành §8):** đặt `V3_PANCAKE_GUI=1` trên VPS —
thiếu biến này thì cửa gửi/ghi đóng câm vĩnh viễn dù mọi thứ khác đúng.

## 5 · Nợ chuyển cho L2-M1 (N2 — nguyên văn từ phiếu L1-M2 ②#3)

`src/tools.js:1` (bộ não chat, CẤM SỬA) import thẳng
`createOrder, pkSendImage, pkAddNote, pkTagByName` từ `pancake.js`;
`scheduler-followup.js:24` import `pkSendReply` — bốn hàm gửi không một dòng guard.
Cửa v3 KHÔNG bịt được lối này trong phiếu L1-M2 (đụng file cấm); **L2-M1 khi chuyển
đường xử lý tin PHẢI route outbound của bộ não qua cửa v3** (DI/injection, không sửa
`tools.js`). Cũng ghi nguyên văn ở §9 sổ điều hành.

`createOrder` (tạo đơn) **KHÔNG được bọc** ở phiếu này — nằm ngoài "bộ sale dùng" ②,
thuộc phạm vi L3-M4 (hàng chờ tạo đơn, 4 cửa chống trùng).

## 6 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l1-m2.sh          # 15 phép của PHIẾU L1-M2 ④, tự dựng/dọn sandbox
node --test test/l1-m2-cua.test.js        # 17 ca chi tiết
```

Nhánh gọi Pancake **THẬT** (HTTP thật, không mock) chưa đo được từ máy cá nhân — token
báo lỗi 121 (giới hạn theo IP). Cổng in "CHƯA CHẠY — chờ VPS" cho nhánh này, không giả
xanh. Đo trên `aicloser_v3_nt_l1m2` (sandbox tự dựng/tự dọn), không phải `aicloser_v3`
dev.
