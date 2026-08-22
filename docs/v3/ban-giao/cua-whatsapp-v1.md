# BÀN GIAO — CỬA PANCAKE WHATSAPP v1 (cho L3-M1, L2-M1, và mọi module gọi WhatsApp)

> Phiếu **L1-M3** · dựng 22/08/2026 · nguồn sự thật của file này là `src/channels/whatsapp/*.js`.
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l1-m3.sh`.
> Đọc trước: [`./cua-messenger-v1.md`](./cua-messenger-v1.md) (khuôn gốc — cửa này SAO
> CHÉP guard/định tuyến team/`ctxHeThong()` từ đó, đổi bảng sở hữu `page`→`don_hang`) ·
> [`./tang-truy-van-v1.md`](./tang-truy-van-v1.md) (ctx, `layMotTheoId`, `ctxHeThong()`).

## 0 · Import từ đâu

```js
import {
  guiTinMau,
  LoiDonKhongThuocTeam,
  LoiSaiNguonDon,
  LoiMauChuaDuyet,
  LoiCuaGuiDong,
  LoiChuaCoEndpoint,
} from "../../channels/whatsapp/index.js"; // (sửa lại số cấp `../` theo vị trí file gọi)
```

Cửa này **không đi qua `src/pancake.js`** (khác Messenger) — Cloud API WhatsApp không
đi qua khái niệm Facebook Page/conversation của Pancake Messenger. Adapter thật
(`src/channels/whatsapp/adapter.js#guiMauQuaPancake`) hiện CHƯA CẮM endpoint nào (xem §7).

## 1 · Một hàm — chữ ký

```ts
guiTinMau(
  pool,
  ctx,
  { soNhan, tenMau, thamSo, donHangId },
  deps?: { guiMau?, bangMauTin? },
): Promise<{ ok: true, idBatDau, ...ketQuaAdapter }>
```

- `pool` — giống hệt tầng truy vấn, cửa này **không mở pool riêng**.
- `ctx` — `{ teamId, nguoiDungId }` (ctx người), HOẶC `ctxHeThong()` cho job nền (quét
  đơn mỗi N phút — xem §4).
- `soNhan` — số điện thoại nhận. Cửa này **KHÔNG kiểm khuôn số** (E.164 hay không) —
  ngoài phạm vi phiếu L1-M3, caller tự đảm bảo.
- `tenMau` — tên mẫu. Phải có `da_duyet:true` trong bảng mẫu, xem **§3 — ĐỌC KỸ**.
- `thamSo` — tham số điền vào mẫu (mã đơn, sản phẩm, số lượng, tổng tiền, COD…). Cửa
  này **truyền nguyên vẹn** xuống adapter, không diễn giải/validate nội dung.
- `donHangId` — **`don_hang.id`** (khoá nội bộ v3, KHÔNG phải `ma_pos`) — dùng để định
  tuyến team (§4) và rào nguồn đơn (§5). Đơn phải tồn tại và thuộc đúng team của `ctx`
  (hoặc resolve được qua `ctxHeThong()`).
- `deps.guiMau` — tiêm hàm thay `guiMauQuaPancake` thật khi test (spy/mock) — cùng
  khuôn `deps.send` của cửa Messenger.
- `deps.bangMauTin` — tiêm bảng mẫu thay `BANG_MAU_TIN` thật (RỖNG) khi test. **Không
  tiêm là dùng bảng THẬT — mọi `tenMau` đều bị `LoiMauChuaDuyet` cho tới khi có mẫu
  Meta duyệt thật được thêm vào `mau-tin.js`.**

⛔ **KHÔNG có hàm gửi text tự do** ở cửa này — Cloud API WhatsApp ngoài cửa sổ 24 giờ
bắt buộc dùng mẫu Meta đã duyệt (01-QUYET-DINH.md §4/§5). Cần trả lời tự do trong cửa
sổ 24h (đọc tin khách, M8 90-phu-luc) là việc của module KHÁC, ngoài phạm vi L1-M3.

## 2 · Bốn cửa, xếp nối tiếp — CỐ Ý guard đứng SAU CÙNG

```
① định tuyến team (qua don_hang)  →  ② rào NGUỒN ĐƠN  →  ③ luật MẪU TIN  →  ④ guard (N1)  →  adapter
```

Guard đứng cuối (khuôn Messenger: `kiemGuardGuiGhi` luôn là bước cuối trước khi chạm
mạng) — để tách "chặn vì nghiệp vụ sai" khỏi "chặn vì van đóng" khi đo cặp đối chứng.
Mọi lỗi ở cửa ①–④ đều là lỗi **có tên**, `deps.guiMau`/`guiMauQuaPancake` KHÔNG được
gọi (spy = 0 lượt — đo được, xem `ops/bin/nghiem-thu/l1-m3.sh` phép ①–④).

## 3 · ⚠️ BẢNG MẪU TIN — RỖNG THẬT, ĐỌC KỸ TRƯỚC KHI TEST/GỌI

`src/channels/whatsapp/mau-tin.js#BANG_MAU_TIN` là **`Object.freeze({})`** — KHÔNG có
mẫu nào được Meta duyệt tại lượt code này (thủ tục WhatsApp Business Account là VIỆC
NGƯỜI, chưa bắt đầu — 90-phu-luc-bang-hoi-ky-thuat.md §M1/§M2 còn để trống). Đây là
**thực tế**, không phải file thiếu sót — cấm bịa mẫu để "cho chạy được".

**Hệ quả cho caller (đặc biệt L3-M1, L2-M1):**

- Gọi `guiTinMau(...)` **KHÔNG tiêm `deps.bangMauTin`** → LUÔN ném `LoiMauChuaDuyet`,
  bất kể `tenMau` là gì, bất kể guard/routing/nguồn đúng hết. Đây KHÔNG phải bug.
- Muốn test **hành vi thật** của `guiTinMau` (routing, rào nguồn, hai pha…) mà không
  đụng mẫu thật: tiêm `deps.bangMauTin = { <ten_mau_gia_lap>: { da_duyet: true } }`
  (xem test/l1-m3-cua.test.js, mọi ca "CHO-QUA" đều làm vậy).
- Muốn test **orchestration** (vd job quét `quet-don-moi.js` của L3-M1 gọi `guiTinMau`
  đúng 1 lượt rồi chuyển `da_gui_wa`) mà không quan tâm luật mẫu: mock/spy TOÀN BỘ hàm
  `guiTinMau` ở tầng gọi (deps của job runner), đừng đi qua bảng mẫu thật.
- Khi Meta duyệt một mẫu thật: thêm MỘT dòng vào `BANG_MAU_TIN` kèm ngày duyệt + nội
  dung mẫu — không "tạm cho qua" bằng cách gõ `da_duyet: true` trước khi có bằng chứng.

## 4 · Định tuyến team qua `don_hang` (khác Messenger — không có `page`)

`guiTinMau` không nhận `pageId`/`psid` (Cloud API không đi qua Facebook Page). Thực thể
"sở hữu team" duy nhất trong tay hàm này là chính **đơn hàng** (`donHangId`):

- **ctx NGƯỜI**: `layMotTheoId(pool, ctx, "don_hang", donHangId)` — 0 dòng (không tồn
  tại HOẶC thuộc team khác) ⇒ `LoiDonKhongThuocTeam` + 1 dòng `nhat_ky`
  (`hanh_dong='chan_don_xuyen_team'`).
- **`ctxHeThong()`** (job nền — quét đơn mỗi N phút, "không có NGƯỜI"): tự tra
  `don_hang.team_id` RAW (bỏ qua ctx-scope, cùng tiền lệ N3 của Messenger) rồi tự dựng
  lại `ctxHeThong()` để gọi tiếp — MỌI lượt gọi dưới nhánh này tự ghi `nhat_ky` với
  `team_id` **THẬT** của đơn (không NULL/`chua-phan`). Đơn không tồn tại ⇒
  `LoiDonKhongThuocTeam`, không ghi `nhat_ky` (chưa có team để ghi).

Dòng `don_hang` tra được (`don.nguon`) được dùng NGAY cho rào ở §5 — một lượt tra, hai
việc, không tra lại lần hai.

## 5 · Rào NGUỒN ĐƠN — chỉ `trang_ban_hang`

```
don.nguon !== 'trang_ban_hang'  →  LoiSaiNguonDon, KHÔNG gọi adapter
```

01-QUYET-DINH.md §1: chỉ luồng **trang bán hàng** cần bot xác nhận qua WhatsApp trước
khi chuyển «Chờ in» (khách bấm BUY NOW nhưng chưa ai nói chuyện với họ). Luồng
**messenger** khách đã xác nhận trong chat rồi — gọi cửa này cho đơn `nguon='messenger'`
là SAI LUỒNG, không phải trường hợp biên cần xử lý êm; máy trạng thái L3-M1 dựa vào rào
này để KHÔNG BAO GIỜ đưa đơn messenger vào nhánh chờ-gửi-WA (xem `LoiSaiNhanhNguon` phía
L3-M1 — lỗi khác tên, tầng khác, cùng ý).

## 6 · Guard tại cửa (N1) — biến RIÊNG, van CHUNG

```
guiTinMau chỉ chạy tới adapter khi
  process.env.V3_WA_GUI === "1"  VÀ  process.env.PANCAKE_READONLY !== "1"
mọi trường hợp khác (vắng biến, giá trị lạ, chỉ một vế đúng) → LoiCuaGuiDong.
VẮNG BIẾN = ĐÓNG (fail-closed đúng chiều).
```

`V3_WA_GUI` là biến RIÊNG của cửa này (khác `V3_PANCAKE_GUI` của Messenger — hai cửa
độc lập, bật WA không tự bật Messenger và ngược lại), nhưng dùng CHUNG
`PANCAKE_READONLY` với Messenger — đây là **MỘT van an toàn duy nhất** cho mọi đường
gửi-ra-Pancake của máy này (sổ điều hành §0a luật 1: máy dev luôn có
`PANCAKE_READONLY=1`). Đọc env **tươi mỗi lượt gọi** (không cache lúc import).

**Việc NGƯỜI khi cutover VPS (H9, sổ điều hành §8 — đã gồm `V3_PANCAKE_GUI`, CẦN THÊM
`V3_WA_GUI=1`):** thiếu biến này thì cửa gửi WhatsApp đóng câm vĩnh viễn dù mọi thứ khác
đúng. Đã khai trong `docs/v3/ban-giao/bien-moi-truong-v3.md`.

## 7 · Adapter — endpoint Pancake WhatsApp CHƯA CHỐT (chờ H1)

`src/channels/whatsapp/adapter.js#guiMauQuaPancake` là bản cài THẬT, hiện LUÔN ném
`LoiChuaCoEndpoint` (`coPhanHoi=true`) — CẤM BỊA endpoint (đo lại nguyên liệu 22/08:
`src/pancake.js` không có route `/whatsapp`; 01-QUYET-DINH.md §4 xác nhận "gửi bằng API
cần thử một lần thật" = điểm kiểm **H1**, chưa chạy — xem sổ điều hành §7b T1).

Khi H1 xong (endpoint xác định): thay THÂN `guiMauQuaPancake`, **giữ nguyên chữ ký**
(payload `{soNhan,tenMau,thamSo,donHangId}` vào, `{ok,id}` ra hoặc ném lỗi có tên) —
`guiTinMau` và mọi caller (L3-M1…) không cần đổi gì.

## 8 · Nhật ký HAI PHA — `coPhanHoi` quyết định có mồ côi hay không

```
INSERT wa_gui_bat_dau   TRƯỚC khi gọi adapter
gọi adapter →
  thành công            → INSERT wa_gui_ket_qua (luôn ghi)
  lỗi VỚI coPhanHoi=true  → INSERT wa_gui_ket_qua (kết cục ĐÃ BIẾT, kể cả LoiChuaCoEndpoint)
  lỗi KHÔNG coPhanHoi     → KHÔNG ghi pha 2 — dòng bắt-đầu MỒ CÔI (mất tín hiệu mạng thật)
```

Khuôn `src/pos/ghi-nguoc.js` (L1-M1). `nhat_ky` là bảng CHỈ-INSERT — hai dòng là hai
SỰ KIỆN. Dòng mồ côi là tín hiệu DUY NHẤT đọc ra được «lệnh đã bay đi mà không ai biết
kết cục» — đọc `nhat_ky WHERE hanh_dong='wa_gui_bat_dau' AND doi_tuong_id NOT IN (SELECT
doi_tuong_id FROM nhat_ky WHERE hanh_dong='wa_gui_ket_qua')` để tìm các đơn cần soi tay.

## 9 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l1-m3.sh           # 24 phép + 1 HOÃN minh bạch, tự dựng/dọn sandbox
node --test test/l1-m3-cua.test.js         # 17 ca chi tiết
```

Nhánh gửi WhatsApp **THẬT** (HTTP thật) CHƯA đo được — endpoint chưa chốt (§7). Cổng in
`⏸ HOÃN` cho nhánh này, không giả xanh. Đo trên `aicloser_v3_nt_l1m3` (sandbox tự
dựng/tự dọn), không phải `aicloser_v3` dev.
