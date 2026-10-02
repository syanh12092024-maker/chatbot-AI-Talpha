# PHIẾU MB1 — Dời việc v3 mượn của v1 vào chính tiến trình v3

**Base:** `85241c6` · **Làn:** 🟨 (đổi nơi chạy, không đổi hình dạng dữ liệu màn nhận; không gửi gì cho khách)
**Nguồn:** CR-02-10 (`docs/thi-cong/doi-y-do/CR-02-10-mot-ban-v3.md`) · `01-QUYET-DINH.md` §14 · sổ §5g
**Đụng bộ não:** không.

## ① Vì sao

v3 đọc/ghi mười hai việc qua cầu HTTP `v3/src/noi-day/cau-bot-v1.js` → `/admin/api` của tiến trình
v1 (`src/server.js`, cổng 3100). Tắt v1 là các màn đó chết. Và đo 02/10: **worker v3 chưa từng nạp
KB** — chỉ `src/server.js:17` gọi `loadKB()`; với `V3_RAP_PROMPT_BAT` vắng, `rap-prompt.js#rapKb` đi
đường `kb.js#getKBForPage` trên một `pageMap` rỗng ⇒ mọi page `noData` ⇒ bàn giao. v3 là bot duy nhất
thì nó phải tự nạp thứ v1 từng nạp.

## ② Làm gì

1. `src/core/khoi-dong-loi.js` — một hàm khởi động lõi dùng chung, gọi từ CẢ `v3/chay-that.js` và
   `src/queue/chay-worker.js`: `loadKB()` + đồng bộ Sheet danh bạ 5′ (y `src/server.js:17-22`) · nối kho
   token CSDL (`datKhoTokenDb`, nếu chưa nối) · `refreshPancakePages` 10′ · nạp sổ đăng ký page
   (cái `readiness.js` cần). Gọi hai lần là vô hại.
2. Ruột `cau-bot-v1.js`: từng hàm export giữ NGUYÊN tên + hình dạng trả về, đổi `goi('/admin/api/…')`
   thành gọi thẳng hàm thư viện mà handler v1 tương ứng đang gọi (`admin.js` · `admin-scripts.js` ·
   `admin-ops.js`): `sanSangToanHe`←`allReadiness` · `danhSachPageKemSanPham`←`/pages` ·
   `sanPhamCuaPage`←`/kb/:id` · `daySanPhamLenBot`←`updatePageProducts`+đọc lại · `dayKhoiChungLenBot`
   ←`datKhoiChung`+đọc lại · `pheuHoiThoai`←`/ops/conv-state` · `donHangToanHe`←`/orders` ·
   `chiPhiToanHe`←`/token-cost` · `danhSachToken`/`themToken`/`boToken`←`pancake.js`.
   `goiAdminV1` (một nơi gọi: `chay-that.js#dayKichBanLenBot`) thay bằng hàm tường minh
   `dayKichBanLenBot` ← `updatePageConfig`. Cửa ghi giữ đúng luật cũ (`V3_BOT_KHOA` · `V3_BOT_GHI=0` ·
   `PANCAKE_READONLY` trừ đường kho có `V3_GHI_KHO_BOT=1`), bỏ điều kiện «thiếu ADMIN_USER/PASS».
3. `/webhook` (GET xác minh + POST `taoWebhookHandler`) dời sang `v3/chay-that.js`. `/uploads` v3 đã tự
   phục vụ (`chay-that.js:213`).
4. Kiểm kê: mọi nút ở 7 trang `public/*.html` của `/admin` mà v3 chưa có ⇒ bảng trong báo cáo phiếu.

## ③ Không làm

Không đổi công tắc bật/tắt (MB2). Không tắt `aicloser.service` (MB3). Không gỡ tệp v1, không đổi tên
`cau-bot-v1.js`, không đổi chữ trên màn (MB4). Không sửa năm file não.

## ④ Nghiệm thu

- Bộ ca mới `test/mb1-loi-trong-tien-trinh.test.mjs`: mỗi hàm của cầu chạy được khi KHÔNG có tiến trình
  v1 (không `ADMIN_USER`, `fetch` bị chặn) và trả đúng hình dạng cũ; worker sau `khoiDongLoi()` thấy
  sản phẩm của một page trong `kb-overrides.json` (không `noData`). Đảo-vá: bỏ `loadKB()` khỏi khởi động ⇒ đỏ.
- `npm test` không thêm ca đỏ so với mốc.
- `grep -n "fetch(gocBot" v3/src/noi-day/cau-bot-v1.js` → 0 dòng.

## ⑤ Đã tra chưa

Handler v1: `src/admin.js:90,183,237,414-431,455-477` · `src/admin-scripts.js:175,350` · cầu:
`v3/src/noi-day/cau-bot-v1.js` (566 dòng) · khởi động v1: `src/server.js` · worker: `src/queue/chay-worker.js:165`.
