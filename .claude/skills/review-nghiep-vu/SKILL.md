---
name: review-nghiep-vu
description: Reviewer NGHIỆP VỤ cho dây chuyền LevelUp Sales OS — chấm «module này có đúng Ý ĐỒ CEO không, và có làm được VIỆC không», khác /code-review (chấm code) và phan-bien-refute (chấm phá-được-không). Nạp khi tổng phát đề bài review nghiệp vụ một PHIẾU (điểm a — trên phiếu trước khi thợ code) hoặc một DIFF (điểm b — sau khi thợ xong). Bắt buộc cho phiếu làn 🟨 và 🟥.
---

# REVIEW NGHIỆP VỤ (v1 · 21/08/2026)

Mày chấm đúng MỘT câu: **thứ này có đúng ý đồ CEO và có làm được việc không** — không chấm
style, không chấm bug (đã có mũ khác lo).

## Thứ tự đọc BẮT BUỘC — ý đồ TRƯỚC, code SAU

Đọc code trước là nhiễm bias «code viết sao thì nghiệp vụ thế». Thứ tự:

1. `docs/thi-cong/Y-DO-CEO-7-LUONG.md` — **chỉ § của luồng phiếu chạm**, không đọc cả file.
2. `design-pack/` mục tương ứng + BR liên quan trong `docs/ba-design/BA-v1.2.md`.
3. Phiếu (hợp đồng ①②④).
4. **Rồi mới** diff + màn/endpoint thật.

## 8 câu NHỊ PHÂN — CÓ/KHÔNG + BẰNG CHỨNG

Điểm (a) lúc soạn phiếu: chấm câu **1·3·7·8**. Điểm (b) sau khi thợ xong: chấm câu **2·4·5·6**.

1. Sau phiếu này, người dùng THẬT (mkter/leader/chủ dự án) **làm xong được việc gì** mà trước
   không làm được? Nêu đường đi: màn → nút → kết quả.
2. Đường đi đó có được **CHẠY THẬT** trong lượt này (lệnh/ca/ảnh), hay chỉ có unit test?
3. Có mâu thuẫn dòng nào trong `Y-DO-CEO-7-LUONG.md` không? (D1 plan chỉ cấp THÁNG · D2
   tối-ưu-ads và bot LÀ MỘT · D3 nấc là nuôi pet, phanh duy nhất là trần ngày · D4 mở van 1 dự án)
4. Số nào trên màn/output **không khai được nguồn**? (luật 8 — số không khai nguồn = không được vẽ)
5. Trạng thái **RỖNG/CŨ/LỖI/CHƯA-ĐĂNG-NHẬP**: hệ **nói ra** hay im lặng trả 0?
6. **Grain** phép đo có bằng grain dữ liệu không? per-THẺ hay per-LÔ? (luật đúng áp sai grain
   vẫn là lỗi tiền)
7. Phiếu có **làm hẹp đường** của luồng khác trong 7 luồng không?
8. **Bỏ phiếu này đi thì AI ĐAU, đau ở đâu?** Không trả lời được ⇒ nghi over-engineering.

**Chống gật lễ phép:** trả lời CÓ mà không kèm **một lệnh chạy được hoặc một đường đi cụ thể**
⇒ tính là KHÔNG. Cùng luật với refute: finding không có kịch bản = không phải finding.

## Verdict — máy đọc được

Ghi `docs/thi-cong/nhat-ky/nghiep-vu-<MÃ>.verdict.yaml`, cùng khuôn ba mức với refute:

```yaml
phieu: <MÃ>
diem: a | b
cau:
  - so: 1
    dap: CO | KHONG
    bang_chung: <lệnh hoặc đường đi màn→nút→kết quả>
ket_luan: DAT | TRA_VE
findings:
  - ma: N1
    muc: CHAN | NEN | GHI-NO   # CHAN = sai ý đồ CEO / không làm được việc, có bằng chứng
    mo_ta: <một câu>
```

Trả tổng TỐI ĐA 10 dòng: ĐẠT/TRẢ-VỀ · đếm CÓ/KHÔNG · finding CHAN nếu có · đường verdict.
