# NHẬT KÝ PHIẾU G2-A6 — API số liệu

> Người A · 25/08/2026 · nhánh `main` · đo trên **VPS · PostgreSQL 16.15**

---

## 0 · CÁI BẪY CỦA MỘT API SỐ LIỆU: BÁO CÁO TOÀN SỐ 0 TRÔNG Y HỆT «HỆ CHẠY ÊM»

Bài học 3 của giai đoạn 2, đã trả giá thật: *«Không có việc nào đang chờ» đọc như tin mừng,
trong khi sự thật là chưa gán page — người ta ngồi chờ một hệ thống không bao giờ có việc.*

Ở đây cái bẫy gấp đôi, vì hôm nay **mọi bảng số liệu đều rỗng**: `so_ai` 0 dòng ·
`don_hang` 0 dòng. Một API trả về `{soDon: 0, tienVnd: 0}` là đúng số mà sai nghĩa.

Nên MỌI hàm trong `src/db/so-lieu.js` trả kèm `boiCanh { coDuLieu, viSaoRong }`, và ba cảnh
rỗng nói **ba câu khác nhau**:

```
[S1] "team này CHƯA CÓ PAGE NÀO — con số 0 ở trên là «chưa cài đặt xong», không phải
      «không có gì xảy ra». Gán page cho team ở màn Cấu hình team (việc người H7)."
[S2] "team có 2 page nhưng bảng `don_hang` không có dòng nào trong khoảng …"
```

Ca S2 khẳng định thẳng rằng nó **không được giống** ca S1.

## 1 · BỐN KHỐI, MỖI KHỐI MỘT LUẬT CỨNG

**① Báo cáo — KHÔNG trả về một tổng.** 01-QUYET-DINH §1: hai luồng đơn đo bằng **hai thước
khác nhau**. Ca S3 khẳng định `"tongDon" in bc === false` — cấm cộng, và có một trường
`viSaoKhongCong` nói lý do ngay trong dữ liệu trả về. Kèm: đơn thiếu `tong_tien` (nợ N4) phải
được kêu ra, không để «tổng tiền 100» đọc như doanh thu thật.

**② Chi phí AI — tìm page ĐỐT TIỀN MÀ KHÔNG RA ĐƠN.** Cờ `dotTienKhongRaDon` chỉ bật khi
**có lượt gọi mà 0 đơn** — page im lặng 0 lượt 0 đơn KHÔNG bị gắn cờ (ca S6). Và nếu có lượt
nào thiếu `tien_vnd` thì tổng tiền được khai là **cận DƯỚI**, không phải số thật (S5).

**③ A/B — chưa đủ mẫu thì `tiLeChot` là `null`.** Không trả số rồi dặn màn hình nhớ ẩn đi;
trả số là mời người ta quên. Ca S7: `5 khách · tiLeChot=null · "CHƯA KẾT LUẬN — mới 5/30
khách, còn thiếu 25"`.

**④ Sức khoẻ 9 đèn.** Tài liệu chỉ ghi «đèn 9 chỉ số» chứ **không liệt kê**, nên danh sách
là tự quyết (ghi §9). Mỗi chỉ số được chọn vì nó neo vào một **sự cố thật** hoặc một **con số
thật đã đo** của dự án này, không phải một chỉ số nghe hay:

| Đèn | Neo vào |
|---|---|
| `llm_account` | sự cố 23/08 — tài khoản AI hết tiền, bot im ba tiếng |
| `don_ket_cho_gui_wa` | RF-14 — đơn kẹt vĩnh viễn, không job nào đọc trạng thái đó |
| `page_thieu_marketer` | 514/514 đo 25/08 — báo cáo cắt theo marketer sẽ trống |
| `page_thieu_kich_ban` | dùng CHÍNH bộ giải ba tầng của G2-A5 |
| `du_lieu_mo_coi` | dùng CHÍNH `demMoCoi()` của B-Y3 |
| `hang_doi_tin` · `viec_qua_han` · `hang_cho_duyet` · `page_mat_dau` | đo thẳng từ bảng |

## 2 · CHỖ TINH TẾ NHẤT: ĐÈN XÁM

«0 lượt trả lời» có **hai nghĩa hoàn toàn khác nhau**, và gộp chúng là dựng một đèn đỏ vĩnh
viễn — rồi ai cũng học cách bỏ qua nó (đúng bài học tôi vừa rút ở mốc nền mục của l0-m1.sh).

```
[S10] do  · 90 phút · "bot IM 90 phút (ngưỡng 30) — kiểm tài khoản AI còn tiền không, đúng cảnh 23/08"
[S11] xam · "CHƯA CÓ DỮ LIỆU — Sổ AI chưa có lượt trả lời nào cho team này.
             Đây là «chưa cài đặt xong», KHÔNG phải «bot đang chết»."
```

Và `tomTat` nói thẳng: *«KHÔNG đèn đỏ, nhưng có đèn XÁM — chưa đủ dữ liệu để nói hệ khoẻ»*.
Một bảng toàn xám nghĩa là hệ chưa cài xong, không phải hệ khoẻ.

## 3 · MIGRATION 011 — LƯU TIỀN, KHÔNG TÍNH LẠI

`so_ai` chưa có cột tiền. Tính tiền lúc ĐỌC (token × bảng giá hôm nay) sai hai lần: bảng giá
đổi thì **mọi con số lịch sử đổi theo**, và tầng dữ liệu phải giữ một **bản sao bảng giá**
trong khi bảng giá thật nằm ở `01 §7` và ở lớp model của người B. Án lệ #18: *«so hai giá trị
dẫn xuất phải đóng dấu THAM SỐ DẪN XUẤT vào chỗ lưu»*.

Nên 011 thêm `tien_usd` · `tien_vnd` · `nha_cung_cap` · `do_ngau_nhien` ·
`da_chuyen_du_phong` — đúng bộ cột hợp đồng với người B (mục 2) đã đòi, và lớp model của họ
đã tính sẵn rồi đẩy qua phễu `datPheuSoAi`.

## 4 · BẰNG CHỨNG MÁY

```
✔ báo cáo rỗng có nói lý do          ✔ báo cáo KHÔNG cộng hai luồng
✔ số đèn sức khoẻ = 9                ✔ chưa có Sổ AI → đèn XÁM (không phải đỏ)
✔ chưa đủ mẫu → KHÔNG lộ tỉ lệ       ✔ test/l0-m2-so-lieu.test.js: 14 ca, 0 đỏ

[S4]  fb-b: 1200đ / 0 đơn → đốt-không-ra-đơn=true
[S12] 2 page thiếu marketer — "báo cáo cắt theo marketer sẽ TRỐNG"
[S14] nguồn = page LEFT JOIN so_ai ON so_ai.page_id = page.page_id (id FACEBOOK)
```

Ca S14 khoá một cái bẫy riêng: `so_ai.page_id` là **id Facebook (text)**, không phải khoá
ngoại. Nối nhầm sang `page.id` thì câu **vẫn chạy và trả về RỖNG**, không báo lỗi.

## 5 · NGOÀI PHẠM VI / NỢ

- Danh sách 9 chỉ số là **tự quyết** — tài liệu không liệt kê. Chủ dự án đổi thì sửa
  `CHIN_CHI_SO`, và ca S9 sẽ đỏ cho tới khi test được sửa theo (cố ý).
- Ngưỡng A/B `TOI_THIEU_DE_KET_LUAN = 30` là quy ước, được KHAI ra trong chính kết quả trả
  về (`nguong`) để người đọc biết ngưỡng đang là bao nhiêu.
- `tien_vnd` chỉ có giá trị khi lớp model của người B đẩy qua phễu `datPheuSoAi`. Chưa nối
  thì mọi báo cáo tiền là **cận dưới**, và API nói ra điều đó.
