---
name: phan-bien-refute
description: Khuôn PHẢN BIỆN ĐỐI KHÁNG cho agent review phiếu đường tiền của dây chuyền LevelUp Sales OS. Nạp khi được tổng phát đề bài "chứng minh phiếu X SAI". Khác review thường - nhiệm vụ là TÌM CÁCH PHÁ, mỗi finding phải có kịch bản hỏng cụ thể chạy được, không nhận xét chung chung.
---

# PHẢN BIỆN ĐỐI KHÁNG (refute) — v1 · 17/08/2026

Đề bài của mày KHÔNG phải "xem code có ổn không" — là **"chứng minh nó SAI"**. Không tìm được
cách phá sau khi thử thật mới được nói "không phá được".

## Quy trình

1. Đọc phiếu (hợp đồng vào/ra + nghiệm thu) + diff của commit phiếu + nhật ký thợ.
2. Dựng và CHẠY THỬ tối thiểu các kịch bản phá theo danh mục dưới — mỗi kịch bản một lệnh/
   một ca test thật, không suy đoán chay.
3. Mỗi finding = `file:line` + **kịch bản hỏng cụ thể** (đầu vào/trạng thái → sai gì) + mức.
   Chạy ra được ⇒ CONFIRMED; dựng được lý lẽ nhưng chưa chạy được ⇒ PLAUSIBLE (nói rõ).
4. Finding NGOÀI phạm vi phiếu → đề nghị ghi §9 sổ nợ, đừng bắt thợ vá lố phạm vi.
5. Trả về ≤15 dòng: bảng finding + phán tổng (ĐẠT / TRẢ VỀ kèm danh sách).

## Danh mục kịch bản phá (tối thiểu phải thử)

- **Biên & rỗng:** 0 · NULL · chuỗi rỗng · thiếu cột (nguồn BigQuery hay trả chuỗi/NULL — án
  lệ cộng chuỗi `"372"+"0"`), tập rỗng vs tập-không-đọc-được (hai nghĩa khác nhau).
- **Tiền & đơn vị:** minor vs đơn vị thường (lỗi 100×) · VND vs tệ TKQC (RON/USD/EUR) · phép
  so hai vế phải cùng đơn vị và IN đơn vị.
- **Thời gian:** múi giờ (chạy ca test ở UTC và UTC±lệch lớn — án lệ đỏ-1h-mỗi-ngày) · ranh
  ngày DB vs đồng hồ tường · cửa sổ trượt vs ngày lịch · tuổi phép đo ≠ tuổi sự việc.
- **Đồng thời & thứ tự:** hai lượt ghi song song (FOR UPDATE? CAS?) · deploy code trước
  migration (reader mới có lưới chưa?) · thứ tự cron (job đọc chạy trước job ghi?).
- **Grain & phạm vi:** phép đo grain nào, dữ liệu grain nào (án lệ match-rate dự-án dùng làm
  cổng cấp-ad) · lọc theo dự án đủ chưa (id nhận từ ngoài có lọc `project_id`?) · một-nguồn-
  một-luật (có bản sao thứ hai của luật này ở đâu chưa?).
- **Đường lỗi:** mã thoát có tách theo dự án? một phần hỏng thì tổng thể có đỏ? câu lỗi có
  bị cắt mất vế hành động? log có khai đúng cái cổng làm?
- **Lời khai vs hành vi:** mỗi docstring/comment khai về code khác → grep kiểm ngay; nghiệm
  thu của thợ có TỰ DỰNG ĐIỀU KIỆN không (fixture khác prod).

## Cấm

- Bới style/naming/format — không phải việc của mày.
- Finding không có kịch bản hỏng = không phải finding.
- Kết luận "ổn" khi chưa chạy thử kịch bản nào.


## VERDICT CÓ CẤU TRÚC (v3 · 21/08 — thay «trả lời tự do»)

Cuối lượt refute, ghi `docs/thi-cong/nhat-ky/refute-<MÃ>.verdict.yaml`:

```yaml
phieu: <MÃ>
vong: 1
ket_luan: DAT | TRA_VE
findings:
  - ma: F1
    muc: CHAN        # CHAN | NEN | GHI-NO
    mo_ta: <một câu>
    kich_ban: <lệnh/bước tái lập chạy được — không có thì KHÔNG được xếp CHAN>
    file_line: <file:line>
mu_code_review: []    # mũ /code-review gộp vào đây — mục RIÊNG, không trộn với mũ refute
mu_nghiep_vu: []      # nếu phiếu thuộc làn 🟥, mũ nghiệp vụ cũng ghi riêng
```

**Ba mức, định nghĩa CỨNG:**
- `CHAN` — phải đủ **ba điều kiện**: ①có kịch bản tái lập chạy được ②sai NGHIỆP VỤ/TIỀN hoặc mất
  dữ liệu ③không có cách vòng hợp lệ. Thiếu một ⇒ xuống `NEN`.
- `NEN` — đáng sửa nhưng không chặn gộp; thợ sửa được trong lượt thì sửa, không thì ghi nợ.
- `GHI-NO` — ngoài phạm vi phiếu; tổng đổ vào sổ nợ (có NEO chuẩn để máy tra).

**MỘT vòng.** Vòng 2 (nếu có) chỉ VERIFY các mã `CHAN` — cấm mở kịch bản mới. Còn `CHAN` sau
vòng 2 ⇒ DỪNG, báo tổng xé phiếu. Nhiều vòng không có tín hiệu ngoài làm kết quả TỆ đi
(arXiv 2310.01798 + án lệ refute-W3h 4 vòng vẫn phải xé).
