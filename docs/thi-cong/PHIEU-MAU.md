# PHIẾU <MÃ> — <tên việc một câu>

**Base:** `<sha HEAD lúc phát phiếu>` · **Làn:** 🟩/🟨/🟥 (máy phán, phiếu tự khai không tính)

> Phiếu là HỢP ĐỒNG giữa tổng và thợ. Thợ nạp skill `tho-thi-cong` trước khi làm.
> File này nằm ở `docs/thi-cong/phieu/PHIEU-<MÃ>.md`. Thiếu dòng `Base` = chặng 1 ĐỎ
> (cổng đo pathspec trên `base..HEAD`, cấm suy `HEAD~1`).

## ① Thi hành đoạn spec nào

Trỏ tới spec/kế hoạch, KHÔNG chép lại nội dung (chép là đẻ bản sao thứ hai của luật):

- `docs/.../KE-HOACH-*.md` §…
- `docs/.../SPEC-*.md` mục …

## ② Hợp đồng vào/ra

- **Vào:** bảng/cột/hàm/file nào là nguyên liệu — thợ PHẢI ĐO LẠI trước khi code
  (đề bài có thể khai sai).
- **Ra:** hành vi mới là gì, nói bằng câu đo được.

## ③ File được đụng (pathspec)

```
api/duong/dan/a.py
tests/test_a.py
```

Ngoài danh sách này = ngoài phạm vi → ghi §9 sổ nợ, cấm sửa.

## ④ Nghiệm thu BẰNG NỘI DUNG (viết TRƯỚC khi code)

Mỗi mục = một lệnh + con số/danh sách kỳ vọng. Xong việc, thợ đóng gói thành
`ops/bin/nghiem-thu/<mã>.sh` chạy được (gate sẽ chạy lại mãi về sau).

```bash
# ví dụ:
psql -c "SELECT count(*) FROM ... WHERE ..."   # kỳ vọng: 0
pytest tests/test_a.py -q                       # kỳ vọng: N passed
```

## ⑤ Test chạm nhánh nào

Liệt kê nhánh THẬT phải chạm (không fixture tự dựng điều kiện). Nhánh không chạm được
→ khai trong nhật ký vì sao.

## ⑥ Ngoài phạm vi

Thấy gì ngoài ③ → APPEND vào sổ nợ (`SO-NO.md` hoặc §9 sổ điều hành). Cấm tiện tay sửa.

## ⑦ ĐÃ TRA CHƯA — dán OUTPUT MÁY

Trước khi phát, tổng grep NEO của phiếu này (file:line, tên hàm/bảng/cột) trong sổ nợ +
`nhat-ky/ra-*.md`, dán nguyên văn output vào đây + một dòng quan hệ: **trùng-phán / trùng-nợ /
mới**. Thiếu ⑦ = phiếu chưa hoàn chỉnh, không phát. (Án lệ: một lượt rà rộng đẻ phiếu trùng
với phán quyết cũ đang treo — thứ chặn nó phải là quy trình, không phải trí nhớ người duyệt.)

---

**Khi làm:** đề bài mơ hồ thì cắm `[NEEDS CLARIFICATION: câu hỏi]` ngay chỗ đó rồi làm tiếp
phần chắc — cổng chặng 1 sẽ chặn phiếu còn marker, tổng trả lời rồi thợ đóng.

**Khi nộp:** nhật ký chi tiết vào `nhat-ky/phieu-<mã>.md` · APPEND đúng 3 dòng vào §10
sổ · trả lời tổng ≤15 dòng (trạng thái · con số nghiệm thu · commit hash · đường nhật ký).
