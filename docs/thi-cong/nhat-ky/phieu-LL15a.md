# PHIẾU LL15a — HRM từ BigQuery lên màn, CHỈ ĐỌC (Người và team · Kết nối)

> Làn 🟨 (đưa một khoá dịch vụ lên máy chủ + đọc dữ liệu nhân sự; KHÔNG ghi bảng quyền) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ
> não · 0 gói · 0 migration · 1 biến mới `V3_BQ_KHOA`. Commit `8036529` · cổng `ops/bin/nghiem-thu/ll15a.sh` · ca
> `test/ll15a-hrm.test.mjs` + `v3/test/b/ll15a-hrm-man.test.mjs`.

## 1 · Đề bài

Người quyết 02/10: «BQ có key r mà» — sửa lời tôi «H11 (cấp tài khoản BigQuery) là việc người đang treo». Người quyết chọn (hỏi
thẳng): **chép khoá đang có lên máy chủ** (thay vì tạo SA riêng chỉ đọc, hay cấp quyền cho SA talpha). Bản vẽ 4 › Người và team:
«Marketer trên POS ↔ hồ sơ HRM» + cột «Hồ sơ HRM»; Kết nối › HRM.

**Phạm vi âm:** KHÔNG tạo tài khoản từ HRM, KHÔNG khoá người nghỉ, KHÔNG đổi tên team theo HRM (LL15b — ghi vào bảng quyền, gật
riêng) · KHÔNG kéo đơn POS (số đơn 14 ngày + shop mỗi tài khoản «chưa đo», N-MK-GOI-Y-DON) · KHÔNG nối marketer ↔ sản phẩm.

## 2 · Đo lại nguyên liệu (02/10)

- Máy dev: khoá SA `cmo-bigquery-prod-202604@levelup-465304` (4 bản; gcloud đăng nhập bằng nó) đọc được `HRM_Core.dim_employee`
  (118) + `PIALPHA_ALL_Dataset.dim_person_map` (324). Quyền IAM của SA: KHÔNG đo được (SA không đọc được chính sách).
- Prod: chỉ có khoá của dự án khác — `/opt/talpha/bigquery_key.json` (`faos-dashboard@talpha-faos-2026`) · `/opt/auus/...`
  (`auus1-bq-sa@auus1-dashboard-2`) — đọc thử hai bảng HRM bằng cả hai: **403 accessDenied**.
- Cấu trúc: `dim_employee` 20 cột (chỉ lấy 6: emp_code · ho_ten · chuc_vu · status · email_cong_ty · team_code — KHÔNG kéo lương,
  cấp bậc, quản lý); emp_code không trùng; email không trùng (1 trống). `dim_person_map`: person_id · person_name · emp_code ·
  map_status (confirmed 270 · unmapped 47 · da_nghi 6 · needs_hcns 1) · source_role (creator 124 · sale 107 · marketer 63 ·
  seller 30) · id_type · updated_at.
- Marketer theo team (mã thật, sau khi tách đã nghỉ): GCC 19 đang làm + 7 đã nghỉ · AUUS 9 · EU 20 · ngoài hệ 2 · đã nghỉ không ra
  hồ sơ 6 = 63.

## 3 · Đã làm

- **Khoá lên máy chủ** (người quyết chọn): `/etc/aicloser/bq-levelup.json` — thư mục 700, tệp 600 root:root, NGOÀI cây git
  (`checkout -f` khi deploy không đụng), băm khớp hai đầu; đọc thử TỪ PROD bằng token chỉ đọc: 118 · 324.
- `src/hrm/bigquery.js`: khách REST tự ký JWT RS256 (`node:crypto`), token phạm vi **`bigquery.readonly`** (Google từ chối mọi lời
  gọi ghi bằng token này dù SA có quyền ghi), đệm token, MỘT cửa `jobs.query`; lỗi mang mã (`thieu_khoa` · `khoa_hong` · `token` ·
  `truy_van` · `cham` · `mang` + mã nguyên nhân như ETIMEDOUT) và KHÔNG mang khoá. 0 gói thêm.
- `src/hrm/hrm.js`: `taoDocHrm` (khách dựng lúc gọi đầu — khoá hỏng không làm chết tiến trình; đệm một ngày; «đọc lại»; hai lời gọi
  cùng lúc = một lượt) · `TEAM_HRM` (quyết định 29/09) · `tomTatHrm` · `marketerPosTheoTeam` (bốn nhóm loại trừ nhau).
- Màn Người và team: cột «Hồ sơ HRM» (mã NV · trạng thái · team; khớp email không phân biệt hoa; không khớp ⇒ «không có trong
  HRM») · bảng marketer POS của ĐÚNG team đang mở (đang làm + chờ gán) + câu tóm tắt tách phạm vi team / cả công ty · câu cạnh nút
  HRM: «Tạo tài khoản từ HRM: chưa làm (LL15b) — bảng dưới đọc HRM lúc …». Chưa nối ⇒ nói thiếu `V3_BQ_KHOA`; đọc hỏng ⇒ «Đọc HRM
  hỏng» + lý do — khối người trong team không chết theo.
- Màn Kết nối › HRM: nhãn + số đọc từ nguồn (`GET /api/ket-noi/hrm`) · «Đọc lại HRM» (`POST /api/ket-noi/hrm/doc-lai`, bỏ đệm).
- Nối dây: `dungPhanB({ docHrm })` → một bộ đọc cho hai màn; `chay-that.js` dựng khi có `V3_BQ_KHOA` (vắng = đóng);
  `bien-moi-truong-v3.md` có dòng biến.

## 4 · Chọn A thay B

- **Chép khoá đang có** (người quyết chọn) thay vì SA riêng chỉ đọc: làm được ngay. Giá: tệp khoá trên máy chủ mang ĐỦ quyền của SA
  (chưa đo — có thể ghi); bù bằng token phạm vi chỉ đọc + một cửa đọc + tệp 600 ngoài git. Giống cách máy chủ đang giữ khoá
  talpha/auus. Nên làm sau: SA riêng chỉ đọc rồi thay tệp (nợ N-BQ-KHOA-RONG).
- **REST tự viết thay `@google-cloud/bigquery`**: hai câu SELECT không đáng ~40 gói; giá: tự giữ đúng định dạng JWT (ca Q1 kiểm chữ
  ký bằng khoá công khai).
- **Đã nghỉ tách khỏi «của team»**: bản đầu đếm marketer đã nghỉ của GCC vào «của team» (26 thay vì 19 + 7) — số thật lộ ra lỗi.

## 5 · Thước

- `ve7d-nguoi-team` N1 neo câu «chờ việc người H11» ⇒ đổi theo sự thật mới (thiếu `V3_BQ_KHOA`). `vai-b-noi-day` «nối đủ» thêm
  `docHrm` + đòi báo thiếu. `ve7b-ket-noi` K5 (chưa nối ⇒ «Chưa nối vào máy chủ», không số tay) giữ nguyên — xanh.
- Q1 lượt đầu so phạm vi token với HẰNG của chính tệp bị đo ⇒ đột biến L1 sống; nay so với chuỗi biết trước. Kết nối khi đọc hỏng
  chưa có ca ⇒ L19 sống; thêm H6.

## 6 · Kiểm (02/10)

- Tầng A Q1–Q6 **6/6** · màn H1–H6 **6/6** · đảo-vá **19/19 ĐỎ** trên bản cuối · cổng `ll15a.sh` **15/15** (kèm `ve7e.sh` lồng).
- `npm test` **2.446 ca · 2.442 đạt · 0 đỏ · 4 bỏ qua** (+12). ĐỦ cổng: **50 xanh / 12 đỏ** = đúng 12 nợ cũ (lượt đủ bị dừng ở giới hạn chạy nền khi còn `ve8a` · `ve8b` — chạy riêng: 18/18 · 16/16; `ve7e` xanh trong lượt lồng của `ll15a.sh`).
- Đầu-cuối THẬT trên máy dev (máy chủ v3 + Postgres hộp cát + Google thật, hai lượt): Người và team (GCC) 19 đang làm · 7 đã nghỉ ·
  0 chờ gán · 2 ngoài hệ / 63; Kết nối 118 hồ sơ (24 Pialpha) · 324 ghép · 63 marketer. Đọc lần đầu ~1,5 giây, lần sau từ đệm.
- Mạng máy dev → googleapis chập chờn (một lượt ETIMEDOUT): lỗi không đệm, lần sau tự đọc lại; câu lỗi nay mang mã nguyên nhân.

## 7 · Nợ

- **N-BQ-KHOA-RONG** khoá trên máy chủ là SA dashboard `cmo-bigquery-prod-202604` (quyền chưa đo, có thể ghi) — tạo SA riêng
  CHỈ ĐỌC (BigQuery Data Viewer trên `HRM_Core` + `PIALPHA_ALL_Dataset`, Job User) rồi thay tệp `/etc/aicloser/bq-levelup.json`.
- **LL15b** tạo tài khoản từ HRM (khớp email · MKT → Marketer, SALE → Sale · sale thành viên cả ba team · người nghỉ tự khoá · tên
  team theo HRM) — ghi bảng quyền, gật riêng.
- Số đơn 14 ngày + shop của từng tài khoản POS: chưa đo (N-MK-GOI-Y-DON — kéo đơn POS, «để sau»).
