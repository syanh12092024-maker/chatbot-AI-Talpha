# Nhật ký phiếu LL11 — Kỹ năng bỏ, «hỏi size» thành kiến thức sản phẩm (29/09/2026)

> CR-28-09c · làn 🟨 (đổi lời bot) · base `28e807f` · commit `54f4969` · Đụng bộ não: không (`src/chat/rap-prompt.js`
> là bộ ráp prompt v3, không thuộc năm tệp bộ não; chỉ chạy khi `V3_RAP_PROMPT_BAT=1`, prod vắng).

## Đo trước khi code

- `san_pham_goc.kien_thuc` (021, jsonb) có người ĐỌC — `src/products/catalog.js` → `rap-prompt.js#xayVanBanSanPham`
  in sáu nhãn (công dụng · hợp với · cách dùng · thành phần · cảnh báo · thêm) — nhưng **không có đường ghi nào**
  (grep `kien_thuc` trong `src/` · `v3/src/`: chỉ đọc). Không có nhãn «hỏi size».
- Prod: `ky_nang` 3 dòng, cả ba `hoi_size`, 0 bật; `san_pham_goc` 0 dòng ⇒ chưa có gì phải chuyển.

## Làm gì

1. Tầng A `suaKienThucGoc` + `KHOA_KIEN_THUC` (bảy khoá, thêm `hoi_size`), trần 2.000 ký tự/ô; `chiTietSanPhamGoc`
   trả `kienThuc`. RETURNING lấy bản TRƯỚC qua truy vấn con (ảnh chụp trước câu lệnh — ca KT1 kiểm).
2. `rap-prompt.js`: nhãn «Hỏi size trước khi chốt» (sau «Cách dùng»).
3. Tầng giao diện: `VAI_SUA_KIEN_THUC` = quản trị + marketer (chọn: kiến thức là lời tư vấn marketer viết, đúng chỗ màn
   kỹ năng cũ cho marketer bật; khác tên/mã gốc — quản trị). Nhật ký `SUA_KIEN_THUC_SAN_PHAM`, vào nhóm BẮT BUỘC.
   Router `POST /api/san-pham/goc/:id/kien-thuc`; kho đòi 11 hàm.
4. Màn Sản phẩm: khối «Chung — kiến thức bot đọc» trên thị trường (bảy ô, ô «hỏi size» có gợi ý). Màn Kỹ năng ra
   khỏi menu (`thuNghiem`), đường giữ tới LL8.

## Bộ ca

- `test/ll11-kien-thuc.test.mjs`: KT1 Postgres thật (khoá lạ · ô rỗng · bản trước · thay trọn · team khác · trần) ·
  KT2 bộ ráp prompt đọc «hỏi size» và MỌI khoá ghi được (không khoá nào viết vào khoảng không) · KT3 vai + nhật ký
  bắt buộc.
- Thước sửa: `dieu-huong` ④c (thanh bên 9 → 8, ẩn 19, thuNghiem 6, ít dùng 9) · `ll1` N5 thêm bảng `BO_CO_CHU_Y`
  (bỏ màn khỏi menu cũng phải khai phiếu) · **cổng `ll1.sh` ⑤ thôi neo số màn** (mỗi phiếu đổi số — cách sửa duy
  nhất là «nâng con số», không canh gì; danh sách đã do N5 canh).

## Đảo-vá — 7/7 ĐỎ

M1 nhận khoá lạ → KT1 · M2 lưu ô rỗng → KT1 · M3 bộ ráp prompt quên nhãn → KT2 · M4 sale sửa được → KT3 · M5 nhật ký
không bắt buộc → KT3 · M6 Kỹ năng vẫn trên menu → N5 · M7 bỏ kẹp team khi ghi → KT1.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll11.sh`: **ĐỎ 0 / XANH 8**. `npm test` (dev 29/09): **2.267 ca · 0 đỏ · 4 bỏ qua**.
- Chụp sandbox: khối «Chung — kiến thức bot đọc» đọc lại đúng công dụng · cách dùng đã lưu; menu Sản phẩm còn một
  dòng. 0 lỗi JS.

## Chưa làm / để sau

- Gỡ khối kỹ năng khỏi bộ ráp prompt v3 (`KHOI.KY_NANG`) và gỡ giao diện màn Kỹ năng: LL8.
