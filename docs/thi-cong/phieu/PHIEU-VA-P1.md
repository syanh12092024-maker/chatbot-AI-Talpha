# PHIẾU VA-P1 — Cửa POS: thêm cặp chuyển `1→12` vào bảng CHO PHÉP (nợ P1 của L3-M1)

**Base:** `bbe3a4c` · **Làn:** 🟨 (một dòng bảng hằng + test, trên đất cửa POS đã guard
4 lớp) · thợ **sonnet** · điểm (a): tổng tự chấm — neo có sẵn, không cơ chế mới.

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a. Phiếu vá NHỎ — đúng một việc, cấm mở rộng.

## ① Thi hành

- Sổ §9 nợ **P1** (thợ L3-M1 ghi 23/08): máy trạng thái ca `xac_nhan` với POS live=1
  gọi `ghiNguocTrangThai({tu:1, sang:12})` — bảng `CHUYEN_CHO_PHEP` của L1-M1 chỉ có
  `0→12` ⇒ ngoài đời đơn vào `cho_sale` oan thay vì `day_cho_in`.
- Neo: đồ thị 1.400 đơn thật (nhật ký L1-M1 §1.5): `0 → 1 → 12 → 8`, tức `1→12` là
  chuyển tiến hợp lệ PHỔ BIẾN; nhãn mã 1 đã xác minh trong bảng 14 mã (`luoc-do-v1.md`).

## ② Vào/ra

**Vào (ĐO LẠI):** `src/pos/ma-trang-thai.js` / nơi khai `CHUYEN_CHO_PHEP` + nhật ký
L1-M1 §1.4–1.5 + test C5 của l3-m1 (neo thợ L3-M1 để lại).
**Ra:** cặp `1→12` vào bảng CHO PHÉP (kèm chú thích neo đồ thị + nhãn đã xác minh);
KHÔNG thêm cặp nào khác; test cửa POS có ca mới `{tu:1,sang:12}` qua đủ 4 cửa an toàn.

## ③ Pathspec

```
src/pos/ma-trang-thai.js
test/l1-m1-ghi-nguoc.test.js
ops/bin/nghiem-thu/l1-m1.sh      ← CHỈ nếu cổng có neo bảng chuyển cần cập nhật
docs/v3/ban-giao/luoc-do-v1.md   ← CHỈ append 1 dòng §thay-đổi
docs/thi-cong/nhat-ky/phieu-va-p1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md  ← CHỈ append §9 (đóng P1) + §10
```

## ④ Nghiệm thu

```bash
# 1. Bảng CHO PHÉP có đúng 1 cặp MỚI 1→12 (diff danh sách cặp trước/sau = +1 dòng, in cả bảng)
# 2. Test mới: V3_POS_GHI=1 harness + mock PUT → {tu:1,sang:12} ĐI QUA (4 cửa vẫn nguyên:
#    vắng biến chặn · ngoài bảng chặn · CAS lệch chặn · 2 pha ghi)
# 3. bash ops/bin/nghiem-thu/l1-m1.sh vẫn 24/24 (không gãy phép cũ)
# 4. node --test test/l1-m1-*.test.js + test/l3-m1-*.test.js xanh (C5 của L3-M1 giữ nguyên
#    hành vi fail-closed khi cặp CHƯA có → thợ cập nhật ca C5 theo hành-vi-mới-có-cặp,
#    khai rõ trong nhật ký)
```

## ⑤ Nhánh thật: không — bảng hằng + mock. ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
Nợ P1 sổ §9 (a34bd9c0) — phiếu này ĐÓNG nó. Không trùng phiếu nào khác.
```

**Khi nộp:** nhật ký · APPEND §10 + §9 dòng «P1 đóng bởi VA-P1» · commit pathspec
(`fix(pos): VA-P1 — ...`) · ≤10 dòng.
