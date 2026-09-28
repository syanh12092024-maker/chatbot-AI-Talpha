# NHẬT KÝ PHIẾU UI-HT1 — cửa đọc hội thoại cho bàn hội thoại (28/09/2026)

Phiếu: `docs/thi-cong/phieu/PHIEU-UI-HT1.md` · CR-28-09 · làn 🟨 · người quyết cho đo Pancake thật (chỉ đọc).

## Đo lại nguyên liệu TRƯỚC khi code (bước 3) — máy chủ 169.58.33.8, CSDL `aicloser_v3` thật, chỉ đọc

| Đo | Kết quả | Hệ quả cho phiếu |
|---|---|---|
| `hoi_thoai` · có mã Pancake trong `tin_cho_xu_ly` · việc mở | 28.953 · **0** · **0** | Đường đọc cũ (`van-hanh/router.js`) trống với MỌI hội thoại |
| Sổ AI bot cũ (`ai-messages.jsonl`, 56.940 dòng, ghi lần cuối 28/08) | 33.315 conv có `cust`; phủ **26.774/28.953 hội thoại (92,5%)** | Nguồn mã khách thứ hai |
| Mã `<page_id>_<psid>` trên 3 page thật (có `customer_id`) | 2/3 page đọc được **13** và **10** tin | Khuôn mã đúng — trùng `convIdCua` (lien-ket.js) và `luoc-do-v1.md` §7.3 |
| Gọi KHÔNG kèm `customer_id` | Pancake: **«Thiếu mã khách hàng»** | Đề bài phiếu ②.2 (thử gọi không mã) **SAI** — bỏ, hết nguồn thì nói ra |
| Page thứ 3 | «Không tìm thấy gói cước nào cho người dùng này» | Lỗi riêng page — phải hiện cho người dùng |
| `pkGetMessages` | trả `[]` cho page thứ 3 (nuốt lỗi) | Thêm `pkDocTin` không nuốt lỗi |
| Xoay token của `pkFetchPage` | lỗi quyền mã **105** ∈ `PERM_ERRS` ⇒ xoay đúng | Dùng lại, không viết lại |

Chưa đo: tỉ lệ đọc được trên toàn bộ page thật — cần bản đã deploy (mở bàn hội thoại trên máy chủ).

## Làm gì

- `v3/src/ui/ban-hoi-thoai/doc-hoi-thoai.js` (module MỚI): `docHoiThoai(bc, id)` — đọc `hoi_thoai` + `page`
  qua cổng team TRƯỚC khi chạm Pancake; mã hội thoại = `convIdCua`; mã khách: `tin_cho_xu_ly.cust_id` (dòng
  mới nhất) → Sổ AI bot cũ → hết thì nói lý do và KHÔNG gọi; nhớ 60s + chung một lượt bay.
- `GET /api/ban-hoi-thoai/:id` trong router điều phối (cùng ba cái chắn; team khác 404).
- `src/pancake.js#pkDocTin` — 9 dòng thêm, chỉ GET, trả `{ok, messages | loi}`.
- Nối dây: `vai-b.js` (`docTinPancake`, `docSoAiBotCu`, thiếu thì kêu «chưa nối») · `chay-that.js` (thật,
  nạp lười `pancake.js`; `ai-log.js` nạp sẵn — `kb.js` nó cần vốn đã nạp) · `xem-thu.js` (GIẢ, ba cảnh).

## Quyết định lệch phiếu (luật 13)

1. **Module riêng `ban-hoi-thoai/` thay vì nằm trong `dispatch/`.** Thước «không còn tên cột B tự đoán»
   (`dispatch-kho-viec.test.mjs:426`) cấm chữ `cust_id` trong cả module điều phối — tên từng bị bịa trên
   bảng việc. Ở đây `tin_cho_xu_ly.cust_id` là cột THẬT (`003_tin_cho_xu_ly.up.sql:55`). Nới thước là mở
   lỗ cho cả module; viết lách chữ là lừa thước (án lệ 30). Chọn tách module; giá: `ban-hoi-thoai/` import
   `congTruyVan`/`convIdCua` từ `dispatch/` (dùng chung cổng team và công thức mã, không chép).
2. **Chạm `src/pancake.js`** — phiếu ③ ghi «không đụng ngoài việc gọi `pkGetMessages`». Không làm được vì
   `pkGetMessages` nuốt lỗi (đo ở trên). Thêm MỘT hàm đứng cạnh, không sửa hàm cũ; không phải file bộ não.

## Kiểm

- Bộ ca `ban-hoi-thoai-doc.test.mjs` 10/10 · ca HTTP trong `dispatch-router.test.mjs` (200 · 404 team khác
  không chạm Pancake · 401 · 403) · `vai-b-noi-day` (nối đủ / thiếu thì kêu).
- v3 911/911 · `npm test` toàn repo 2.124 pass / 0 fail.
- Đảo-vá 7 đột biến (mỗi lượt một tiến trình mới): bỏ nguồn Sổ AI → 6 đỏ · bỏ nhớ 60s → 1 · bỏ chung lượt
  bay → 1 · nuốt lỗi Pancake → 1 · gọi dù thiếu mã → 1 · lấy mã cũ nhất → **0 đỏ lần đầu** (dữ liệu ca chỉ
  một dòng có mã) ⇒ thêm dòng mã cũ vào ca ⇒ 1 đỏ · bỏ gọt HTML → 1.
- Bản xem thử: ht1 đọc 5 tin · ht3 «Pancake không trả tin: Không tìm thấy gói cước…» · ht4 «Chưa có mã
  khách Pancake…» · ht999 404.
- Cổng `ops/bin/nghiem-thu/ui-ht1.sh` 7/7.

## Nợ

- 7,5% hội thoại (2.179) không có mã khách ở nguồn nào — bàn hội thoại nói lý do. Tra theo danh sách hội
  thoại Pancake (`pkGetConversations` chỉ trang 1, hội thoại mới) không phủ được hội thoại tháng 8.
