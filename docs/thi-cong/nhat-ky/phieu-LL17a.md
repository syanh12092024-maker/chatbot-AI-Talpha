# PHIẾU LL17a — Đơn POS từ BigQuery, MỨC NHẸ: Số liệu › Tổng quan có «Đơn POS của team — theo marketer»

> Làn 🟨 (màn đọc + một nguồn ngoài CHỈ ĐỌC; không ghi CSDL) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ não · 0 gói · 0 migration · 0 biến
> mới (dùng lại `V3_BQ_KHOA`). Commit `f5efc99` · cổng `ops/bin/nghiem-thu/ll17a.sh` · ca `test/ll17a-don-pos.test.mjs` +
> `v3/test/b/ll17a-so-lieu-man.test.mjs`.

## 1 · Đề bài

Người quyết 02/10 hỏi «Đọc đơn từ BQ làm gì nhỉ» → trả lời bằng số đo → «ok làm mức nhẹ đi»: màn Số liệu đọc SỐ TỔNG HỢP đơn từ
BigQuery (đếm · trạng thái · tiền theo team, marketer, ngày), KHÔNG chép tên/SĐT khách vào v3.

**Phạm vi âm:** KHÔNG ghi `don_hang` (LL17 đầy đủ: chép đơn · `UNIQUE (ma_pos)` · khách · ghi ngược — để sau) · KHÔNG đổi ba thước
Messenger, phễu, bảng theo page, chi phí AI/đơn, rủi ro hoàn (vẫn đọc ảnh chụp 28/08) · KHÔNG quy đổi tiền · KHÔNG team theo ngày đơn.

## 2 · Đo lại nguyên liệu (02/10, prod CHỈ ĐỌC)

- `don_hang` của v3: **123.629 dòng, MỌI dòng `tao_luc` 28/08 và MỌI dòng team GCC** — ảnh chụp di trú, đứng im 5 tuần.
- BigQuery `vw_sale_order_team`: đồng bộ 07:30 sáng nay · **14.675 đơn sau 28/08** · 3.260 đơn 7 ngày · 13 shop.
- `marketer` là JSON (`JSON_VALUE(marketer,'$.id')` → `dim_person_map` → mã NV; đo ở LL15d). **Tiền ở `cod`** (đơn vị nhỏ nhất) ÷
  `dim_shop_project.currency_divisor` (100; TWD 1) — **`total_price` = 0 trên mọi shop** (7.851/7.851 đơn Saudi 30 ngày).
- `status_category`: GIAO_THANH_CONG 9.393 · DON_HOAN 4.930 · HUY 3.763 · DANG_GIAO 2.682 · DON_THO 1.495 · CHO_HANG 1.328 · UNKNOWN 259 ·
  DA_DAT_HANG 166 · DA_XAC_NHAN 163 (60 ngày).
- **1 đơn mang ngày tương lai** (01/11/2026) — loại khỏi số, đếm riêng.
- Có sẵn `mart_performance_master` (đội dữ liệu: doanh thu · quảng cáo · lợi nhuận theo marketer/ngày) — KHÔNG dùng: định nghĩa trộn
  quảng cáo/lợi nhuận, màn này cần đếm đơn theo luật nói rõ được.

## 3 · Đã làm

- **Tầng A `src/hrm/don-pos.js`**: một câu SELECT gộp 60 ngày tới HÔM NAY theo ngày × shop × tiền tệ × mã NV × trạng thái (shop một dòng
  bằng `ANY_VALUE` — không nhân đôi đơn) + một câu mốc (hôm nay · đồng bộ lúc · số đơn ngày tương lai); bộ đọc đệm 1 giờ (hai lời gọi =
  một lượt, lỗi không đệm); `tongHopTeam` — đơn thuộc team HRM HIỆN TẠI của marketer; chưa ghép ⇒ «chờ gán team»; team không vào hệ /
  team sale / mã lạ ⇒ «ngoài hệ»; nhóm trạng thái (mã lạ ⇒ «khác», không đoán); COD đã giao theo TỪNG tiền tệ; `tiLeGiao` = thành công ÷
  (thành công + hoàn), chưa đơn kết thúc ⇒ null.
- **Khách BigQuery** (`src/hrm/bigquery.js`): kết quả nhiều trang (`pageToken`) ⇒ `LoiBigQuery('cat_trang')` — không trả nửa số; vẫn
  MỘT cửa `jobs.query` (cổng ll15a ② giữ).
- **Màn** `v3/src/ui/bao-cao/kho-don-pos.js` + `GET /api/bao-cao/don-pos` (đọc RIÊNG): team đang mở theo slug (`auth/kho-nguoi-dung.js
  #teamTheoId`) · marketer (không quản trị) chỉ thấy dòng mình (luật phạm vi LL15d) · chưa nối ⇒ nói thiếu `V3_BQ_KHOA` · đọc hỏng ⇒
  «hỏng» + lý do. Trang Tổng quan: bảng team 7/30 ngày · bảng theo marketer · câu cả công ty (chờ gán · ngoài hệ · ngày tương lai) · câu
  «hoàn về trễ: tỉ lệ khoảng ngắn còn đẹp hơn thật — đọc 30 ngày» · thước KHÁC ba thước Messenger, không cộng · nguồn số.
- Nối dây: `vai-b.js` dep `docDonPos` (+ dùng chung `docHrm`; thiếu ⇒ báo) · `chay-that.js` dựng khi có `V3_BQ_KHOA`.
  `03-MAN-HINH.md` (Số liệu) · `bien-moi-truong-v3.md` (dòng `V3_BQ_KHOA`).

## 4 · Chọn A thay B

- **Đếm từ đơn** thay vì đọc `mart_performance_master`: luật đếm nằm trong code đọc được, kiểm được; giá: không có doanh thu quy đổi,
  lợi nhuận, quảng cáo.
- **COD theo từng tiền tệ** thay vì quy đổi một tiền: «không cộng thứ đo bằng thước khác nhau» (luật màn Báo cáo); giá: dòng COD dài.
- **Team HRM hiện tại** của marketer thay vì team vào ngày đơn (luật ký nói «vào ngày đơn»): có `fact_employee_team_history` nhưng chưa
  đo; 60 ngày ít đổi team. Màn nói ra. Nợ N-DON-TEAM-THEO-NGAY.

## 5 · Thước

- Ca L4 lượt đầu truyền `docDonPos: undefined` để giả «chưa nối» — JS lấy luôn tham số MẶC ĐỊNH ⇒ vẫn nối, ca đỏ vì thước. Đổi `null`.
- Đảo-vá H6 (tỉ lệ chia cho tổng đơn) SỐNG lượt đầu: khoảng 7 ngày trong ca có 6 đơn = 5 thành công + 1 hoàn ⇒ hai mẫu số trùng. Thêm
  kiểm hàng 30 ngày (4 huỷ ⇒ 83,3% vs 50%) ⇒ đỏ.
- `vai-b-noi-day` «nối đủ» thêm `docDonPos` + đòi báo thiếu.

## 6 · Kiểm (02/10, worktree `so-lieu-bq`)

- Tầng A P1–P5 **5/5** · màn L1–L4 **4/4** · đảo-vá **24/24 ĐỎ** · cổng `ll17a.sh` **14/14** (lồng `ll15d.sh` → … → `ve7e.sh`) · `npm test` **2.315 ca · 0 đỏ** (worktree) · cửa vào **2.311 đạt · 0 đỏ**.
- **Chạy thật trên prod** (mã chép tạm `/tmp`, chỉ đọc): 1,4 giây · 4.841 dòng gộp (một trang) · 23.781 đơn 60 ngày · 30 ngày: GCC
  6.875 đơn (giao 75,7%) · AUUS 631 (92,8%) · EU 4.931 (67,8%) · chờ gán 171 · ngoài hệ 0 · 7 ngày GCC 1.127/1.538 đơn còn đang xử lý.

## 7 · Nợ

- **N-DON-TEAM-THEO-NGAY** team của đơn = team HRM HIỆN TẠI của marketer, chưa theo ngày đơn (`HRM_Core.fact_employee_team_history`).
- **N-SO-LIEU-CON-ANH-CHUP** ba thước Messenger · phễu · bảng theo page · chi phí AI/đơn · rủi ro hoàn vẫn đọc `don_hang` 28/08 — LL17
  đầy đủ (hoặc đổi từng khối sang BigQuery).
- **N-DON-POS-THEO-PAGE** BigQuery có `page_id` của đơn — bảng «Theo page» (cột Chốt · Hoàn «chưa có nguồn») điền được, chưa làm.
