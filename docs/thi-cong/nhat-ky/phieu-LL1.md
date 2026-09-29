# Nhật ký phiếu LL1 — Khung năm đích (29/09/2026)

> Phiếu `docs/thi-cong/phieu/PHIEU-LL1.md` · CR-28-09c · làn 🟩 · base `20b9bdb` · commit `ee6ad06`
> Đụng bộ não: không.

## ⑤ Đã tra chưa (output máy)

```
$ grep -n "LL1\|năm đích" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
297:## §5f · SÓNG LÀM LẠI (LL1–LL17) — CR-28-09c, người quyết gõ «áp» 29/09
307:| LL1  | Khung năm đích: menu xếp lại, không đổi đường, sale vào thẳng Hộp thư | — | 🟩 | 🎫 `PHIEU-LL1.md` |
$ grep -n "N-HT4" -A6 docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
1319: 🟢 N-HT4 … ② đường lùi '/dieu-phoi' ở v3/chay-that.js · ui/chung/http.js#TRANG_MAC_DINH … ④ HK10 không đo được mot-page
```
Không trùng nợ: N-HT4 ② (đường lùi `/dieu-phoi`) chỉ chạm khi đích theo vai hỏng — LL1 giữ nguyên chỗ đặt chân nên
không đụng tới.

## Đo lại nguyên liệu trước khi code

- Menu nằm ở MỘT chỗ: `v3/src/ui/chung/man-hinh.js` (`NHOM` + `MAN`); khung vẽ lấy qua `/api/dieu-huong`.
- Mã mục cũ (`hom-nay` · `page-bot` · `day-bot`) chỉ xuất hiện ở `man-hinh.js` và `dieu-huong.test.mjs` — không màn
  nào, không CSS nào đọc mã mục (`grep` trên `v3/src v3/test test ops/bin`).
- Chỗ đặt chân sau đăng nhập = `menuCua(vai)[0].man[0].duong` (`vai-b.js:625`) ⇒ thứ tự trong đích đầu tiên QUYẾT
  nơi mỗi vai vào mỗi sáng.
- Biểu tượng: khung đọc `window.UI.icon` từ `chung/ui.js` (17 hình Lucide); **không có hình nào cho «Sản phẩm»**.
- Bản chụp trước (chạy `menuCua` trên `20b9bdb`, lưu vào ca N3/N5/N7): 27 đường · quản trị hiện 17 màn · marketer 9 ·
  sale 2 · quản lý 14 · duyệt kịch bản 4 · mọi vai trừ sale đặt chân `/trang-chu`, sale `/ban-hoi-thoai`.

## Làm gì

1. `NHOM` → `hop-thu` Hộp thư · `san-pham` Sản phẩm · `page` Page · `so-lieu` · `cai-dat` (+ dự trù giữ nguyên).
2. Mỗi `dat(...)` sang đích của cột «Nhà mới» `03-MAN-HINH.md`. «Khách hàng» từ Số liệu sang Hộp thư (tìm khách là
   việc của sale); «Kỹ năng» sang Sản phẩm (tới LL11); bảy màn «Dạy bot» sang Page.
3. Thêm hình Lucide `package` (cùng bản 0.453, ISC) vào `BIEU_TUONG` của `ui.js`.
4. Sửa thước menu cũ CÙNG commit (án lệ 27): `dieu-huong.test.mjs` ④c ④d ④e ④f ④h ⑥b.
5. `09-KE-HOACH-GIAO-DIEN.md` §4a trỏ LL1 (bảng GD6 giữ làm lịch sử).

**Chọn và giá phải trả (luật 13):** «Sản phẩm & kho» BỎ cờ `moTuManKhac` + `itDung`. Giữ cờ thì với quản trị/quản lý
(mở được trang một page) màn bị ẩn ⇒ bấm đích Sản phẩm chỉ thấy «Kỹ năng theo sản phẩm». Giá: thanh bên của quản trị
17 → 18 màn, quản lý 14 → 15. Đây là thay đổi tập màn DUY NHẤT; ca N5 viết nó thành ngoại lệ có tên.

## Bộ ca — `v3/test/b/ll1-nam-dich.test.mjs` (viết TRƯỚC khi sửa mã: N1 N4 N5 N6 N7 đỏ, N2 N3 xanh)

N1 năm đích đúng thứ tự/tên · N2 biểu tượng có thật trong bộ `ui.js` · N3 danh sách đường = bản chụp · N4 mỗi đường
đúng đích + bảng đích phủ đủ · N5 tập màn hiện theo từng vai = bản chụp (+ ngoại lệ Sản phẩm) · N6 đích Sản phẩm mở
bằng `/san-pham` · N7 chỗ đặt chân từng vai = bản chụp, sale chỉ Hộp thư 2 màn.

Nhánh bộ ca KHÔNG chạm: trình duyệt vẽ biểu tượng thật (đo thay bằng: `/chung/ui.js` máy chủ trả có khoá `package`).

## Đảo-vá — mỗi đột biến một tiến trình mới, khôi phục rồi so mã băm (khớp)

| # | Đột biến | Kết quả |
|---|---|---|
| M1 | Luật chung sang Cài đặt | ĐỎ — N4 · ④e |
| M2 | Trả cờ mở-từ-màn-khác cho Sản phẩm | ĐỎ — N5 · N6 · ④c ④f ④h |
| M3 | Bỏ một màn khỏi sổ | ĐỎ — N3 · N4 · ④c ④e ④f |
| M4 | Đảo thứ tự Hộp thư (đổi chỗ đặt chân) | ĐỎ — N7 · N5 · N3 · ④c ④d |
| M5 | Biểu tượng đích không có trong bộ | ĐỎ — N2 |
| M6 | Đổi tên đích | ĐỎ — N1 |
| M7 | «Khách hàng» về Số liệu | ĐỎ — N4 · ④f |
| M8 | Gỡ hình `package` khỏi `ui.js` | ĐỎ — N2 |
| M9 | Kỹ năng sang Page | ĐỎ — N4 |

9/9 đỏ, không đột biến nào sống.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll1.sh`: **ĐỎ 0 / XANH 10** (bộ ca LL1 · thước menu cũ · HK10 · đăng nhập thật · menu
  thật theo vai · hợp đồng · bốn cổng UI-HT1..4).
- `npm test` (dev, 29/09): **2.221 ca · 2.217 đạt · 0 đỏ · 4 bỏ qua** (4 bỏ qua có từ trước).
- Bản xem thử (dữ liệu giả, `v3/xem-thu.js`, cổng tạm 3177 — đã tắt), đăng nhập qua HTTP rồi đọc `/api/dieu-huong`:
  - tài khoản quản trị: Hộp thư [inbox] Việc của tôi · Bàn hội thoại · Việc đang chờ · Hội thoại và đơn — Sản phẩm
    [package] Sản phẩm & kho · Kỹ năng theo sản phẩm — Page [bot] Tất cả page · Kịch bản · Quy tắc chung · Câu trả lời
    sẵn — Số liệu — Cài đặt; `diTiep=/trang-chu`.
  - tài khoản chỉ sale: Hộp thư [inbox] Bàn hội thoại · Việc đang chờ; `diTiep=/ban-hoi-thoai`.
  - Chưa chụp ảnh màn: trình duyệt tích hợp chặn gõ ô mật khẩu. Menu đo ở tầng máy chủ trả cho khung, không ở tầng vẽ.

## Chưa làm / để phiếu sau

- Tên màn con giữ nguyên (phiếu nói không đổi ở LL1) — gộp giao diện ở LL2 (Hộp thư) · LL3 (Page) · LL5 · LL6 · LL13.
- Chưa deploy. Van: không có — thay đổi chỉ là menu; khi deploy cùng các phiếu sau thì đo lại `/api/dieu-huong` trên prod.
