# PHIẾU LL15b — Người + vai THEO HRM (tạo · cấp · rút · khoá · tên team), xem kế hoạch rồi áp; tự động hằng ngày khi bật cờ

> Làn 🟥 (GHI bảng quyền: `nguoi_dung` · `thanh_vien_team` · `team`) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ não · 0 gói ·
> **1 migration (029)** · 1 biến mới `V3_HRM_TU_DONG`. Commit `3500986` · cổng `ops/bin/nghiem-thu/ll15b.sh` · ca
> `test/ll15b-dong-bo.test.mjs` (hộp cát) + `v3/test/b/ll15b-dong-bo-man.test.mjs`.

## 1 · Đề bài

Người quyết 02/10: «làm tiếp LL15b đi. Thêm nữa kết nối BQ này thì phần Người trong team cũng tự động thêm xoá như HRM luôn».
Luật đã ký (quyết định 29/09, CR-28-09c; nợ LL15a §7): tạo tài khoản theo email · MKT → Marketer, SALE → Sale (Sale là thành
viên cả ba team) · người nghỉ tự khoá · tên team theo HRM. Thêm của lượt này: TỰ ĐỘNG theo HRM (thêm + xoá).

**Phạm vi âm:** KHÔNG ghi gì lên BigQuery (token vẫn `bigquery.readonly`) · KHÔNG đụng tài khoản / vai tạo TAY · KHÔNG «đặt lại
mật khẩu» (chỉ mật khẩu ĐẦU cho tài khoản chưa có) · KHÔNG cắt phiên đang mở khi khoá · KHÔNG nối marketer ↔ sản phẩm/page
(«phụ trách» vẫn «Chưa có nguồn») · KHÔNG kéo đơn POS.

## 2 · Đo lại nguyên liệu (02/10)

- `HRM_Core.dim_employee` có `comp_profile` (MKT · SALE · BO · VANDON · CTV) — đây là cột «loại vai», không phải `chuc_vu`. Thêm
  vào câu đọc (`SQL_NHAN_VIEN`); vẫn KHÔNG kéo lương/cấp bậc/quản lý (Q5 canh).
- Lược đồ: `nguoi_dung` không có cột nối HRM; `thanh_vien_team` không phân biệt dòng tay / dòng máy ⇒ migration 029: `ma_nv`
  (duy nhất khi có) + `nguon` ('tay' | 'hrm', mặc định 'tay' — mọi dòng cũ là tay).
- Cổng danh tính (`cong-danh-tinh.js`) không ghi được `team` và không có giao dịch nhiều bảng ⇒ đồng bộ ghi bằng pool (tầng A)
  trong MỘT giao dịch, nhật ký qua `src/db/nhat-ky.js#ghiNhatKy` (cửa ghi audit chung).
- Đăng nhập (`kho-nguoi-dung.js`) từ chối `mat_khau_hash` NULL ⇒ tài khoản HRM tạo ra chưa đăng nhập được tới khi đặt mật khẩu
  đầu (M8 đo: 401 → đặt → 200). Vé phiên mang vai tới khi hết hạn ⇒ khoá chặn lần đăng nhập SAU (nói thẳng ở màn).
- **Chạy thử kế hoạch trên dữ liệu prod — CHỈ ĐỌC** (02/10, mã LL15b chép tạm vào `/tmp` máy chủ rồi xoá; cột 029 chưa có trên
  prod nên đọc thay bằng hằng): prod 1 tài khoản · 3 dòng vai ⇒ **tạo 21 tài khoản · gắn mã 0 · cấp 41 vai** (GCC 4 + AUUS 2 +
  EU 5 marketer · 10 sale × 3 team) · **rút 0 · khoá 0 · mở khoá 0** · đổi tên 2 team (Tiểu Alpha → Pialpha GCC · Auus →
  Pialpha AUUS) · 94 hồ sơ ngoài hệ · 0 thiếu email · 0 cảnh báo · qua rào tự động.

## 3 · Đã làm

- **Tầng A `src/hrm/dong-bo.js`**: `docHienTrang` · `lapKeHoach` (hàm THUẦN: HRM + hiện trạng ⇒ tạo · gắn mã · cấp · rút · khoá ·
  mở khoá · đổi tên + cảnh báo + vân tay sha256) · `kiemAnToan` (rào lượt tự động: HRM rỗng · rút > 30% vai HRM khi ≥ 5 · khoá
  > 5) · `apDung` (một giao dịch; RANH GIỚI nằm trong chính câu ghi: rút chỉ `nguon = 'hrm'`, khoá/mở chỉ tài khoản có `ma_nv`,
  đổi tên team theo cả `id` lẫn `slug`; mỗi thay đổi một dòng nhật ký + một dòng tóm tắt) · `datMatKhauDau` (chỉ khi `mat_khau_hash
  IS NULL`) · `taoDongBoHrm` (`keHoach` · `apDung` lập lại + so vân tay ⇒ `ke_hoach_doi` · `tuDong` đọc HRM MỚI, vượt rào ⇒ nhật ký
  `hrm_dong_bo_hoan` rồi DỪNG, lỗi ⇒ ghi `lanCuoi.loi` không ném · `lanCuoi`).
- Luật: vào hệ = team Pialpha có trên hệ (`TEAM_HRM`) · `comp_profile` MKT/SALE · active/thử việc · có email (chữ thường) ·
  khớp tài khoản theo `ma_nv` rồi theo email (email đã gắn mã KHÁC ⇒ cảnh báo, bỏ qua) · đã nghỉ ⇒ rút vai HRM + khoá, TRỪ quản
  trị duy nhất còn hoạt động của một team (cảnh báo) · mã không còn trong HRM ⇒ cảnh báo, giữ nguyên.
- **Tầng màn `v3/src/ui/team/dong-bo-hrm.js`** + 3 đường (`router.js`): `GET /api/team/hrm/ke-hoach` (quản trị; kế hoạch gọt
  còn email · team · vai · lý do — không id nội bộ) · `POST /api/team/hrm/ap-dung` {vanTay} (chỉ người là Quản trị của MỌI team
  nghiệp vụ — lượt đồng bộ đụng cả ba team) · `POST /api/team/nguoi-dung/:id/mat-khau-dau` (quản trị; người phải ở team đang mở;
  máy chủ băm; trả email).
- `thanhVienCua` thêm `maNv` · `coMatKhau` (không bao giờ trả băm) · `nguon` mỗi vai; `botThanhVien` rào ④ — vai HRM rút tay ⇒ 409
  `vai_cua_hrm` («đổi ở HRM, lượt sau tự rút»).
- Màn Người và team: «Lấy người từ HRM (BigQuery)» MỞ khi quản trị + đã nối ⇒ hộp kế hoạch (tóm tắt · nhóm gập/mở · chỗ lệch ·
  cảnh báo rào · vì sao không áp được) ⇒ «Áp dụng» · chip vai HRM mang chữ «HRM», không nút rút · cột Tài khoản «Chưa đặt mật khẩu»
  + «Đặt mật khẩu» · câu cạnh nút: nhịp (tự động mỗi 24 giờ / chỉ khi bấm) + lần cuối (tạo · cấp · rút · khoá | HOÃN + lý do |
  HỎNG + lý do).
- Nối dây: `vai-b.js` dep `dongBoHrm` (thiếu ⇒ báo); `chay-that.js` dựng khi có `docHrm`; `V3_HRM_TU_DONG=1` ⇒ lượt đầu 5 phút sau
  khi chạy rồi mỗi 24 giờ (`unref`), in kết quả ra log. Nhật ký: 10 mã mới có chữ (`hanh-dong.js`) + việc máy «đồng bộ người theo
  HRM». Bảng biến môi trường: dòng `V3_HRM_TU_DONG` + `V3_BQ_KHOA` nói thêm việc ghi. `03-MAN-HINH.md`: đoạn LL15b.

## 4 · Chọn A thay B

- **Xem kế hoạch rồi áp (vân tay) + tự động có rào** thay vì tự động áp mù: một lần đọc HRM hỏng/rỗng có thể khoá cả công ty. Giá:
  lượt tự động có thể HOÃN và chờ người (ghi nhật ký + câu cạnh nút nói vì sao).
- **Hai ranh giới (`nguon` · `ma_nv`) nằm trong câu SQL**, không chỉ trong kế hoạch: kế hoạch cũ/sai (B6 dựng kế hoạch giả) không
  vượt được. Giá: tài khoản/vai tạo tay KHÔNG bao giờ được HRM dọn — người nghỉ mà có vai tay thì quản trị tự rút.
- **Vai HRM không rút tay** (409) thay vì cho rút rồi lượt sau cấp lại: một nguồn sự thật. Giá: muốn rút gấp thì sửa ở HRM rồi
  bấm «Lấy người từ HRM»; nếu tắt `V3_BQ_KHOA`, dòng HRM đứng yên tới khi nối lại (nợ N-HRM-RUT-GAP).
- **Áp tay đòi Quản trị MỌI team** thay vì quản trị team đang mở: lượt đồng bộ cấp/rút/khoá ở cả ba team. Giá: quản trị một team
  chỉ xem được kế hoạch.
- **Mật khẩu ĐẦU, không đặt lại**: v3 chưa có luồng đặt lại có xác minh; mở «đặt lại» ở đây là cho quản trị chiếm tài khoản người
  khác. Giá: 21 tài khoản mới cần quản trị đặt mật khẩu từng người, theo từng team (nợ N-MK-HANG-LOAT nếu thấy nặng).

## 5 · Thước

- `ll15a-hrm-man` H1 neo câu «Tạo tài khoản từ HRM: chưa làm (LL15b)» ⇒ đổi theo sự thật mới («Đồng bộ người theo HRM: máy chủ
  chưa nối» khi có HRM mà không nối bộ đồng bộ). `vai-b-noi-day`: «nối đủ» thêm `dongBoHrm` + đòi báo thiếu + `daNoiDongBoHrm()`
  là HÀNH VI, không chỉ chữ.
- M5 lượt đầu dò băm bằng `\$scrypt` — băm thật dạng `scrypt$16384$…` ⇒ thước câm; sửa trước khi đảo-vá.
- Lượt tự động (`tuDong`) lúc đầu không có ca nào ⇒ thêm B7 trước khi đảo-vá.

## 6 · Kiểm (02/10)

- Tầng A B1–B7 **7/7** · màn M1–M8 **8/8** (M8 đầu-cuối hộp cát: bấm áp ⇒ tài khoản + vai HRM lên bảng ⇒ đặt mật khẩu ⇒ đăng nhập
  200; áp lại bản cũ ⇒ 409) · đảo-vá **33/33 ĐỎ** (15 tầng A · 18 màn/nối dây; khôi phục khớp băm) · cổng `ll15b.sh` **15/15** (kèm `ll15a.sh` lồng) · `npm test` **2.461 ca · 2.457 đạt · 0 đỏ · 4 bỏ qua** (+15) · ĐỦ cổng: chưa chạy — chạy ở cửa vào lúc mở van.

## 7 · Nợ

- **N-HRM-RUT-GAP** vai HRM chỉ rút qua HRM; tắt `V3_BQ_KHOA` thì dòng HRM đứng yên (không rút tay được).
- **N-MK-HANG-LOAT** tài khoản HRM tạo ra phải đặt mật khẩu đầu từng người (21 người lượt đầu prod) — chưa có gửi mời / đặt hàng
  loạt / người dùng tự đặt.
- **N-KHOA-PHIEN** khoá không cắt phiên đang mở (vé mang vai tới khi hết hạn).
- **N-HRM-LANCUOI-NHO** «lần cuối» giữ trong bộ nhớ tiến trình — restart thì mất (nhật ký vẫn có dòng `hrm_dong_bo`/`_hoan`).
- Vẫn còn: N-BQ-KHOA-RONG (SA riêng chỉ đọc) · phụ trách marketer «Chưa có nguồn» · N-MK-GOI-Y-DON.
