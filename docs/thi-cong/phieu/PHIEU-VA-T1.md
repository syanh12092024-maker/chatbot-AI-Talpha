# PHIẾU VA-T1 — Vá BỐN THƯỚC trôi theo cây sống (gate toàn cục lộ ra) — code nghiệp vụ KHÔNG đụng

**Base:** `550c4ec` · **Làn:** 🟨 thước thuần · thợ **sonnet** · điểm (a) tổng tự
chấm: án lệ «known-answer trôi theo cây sống» — thước neo con-số-chụp-thời-điểm thay vì
bất biến; 4 cổng đỏ mà KHÔNG cổng nào là bug code (tổng đã mổ tới gốc từng cái).

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a. Phiếu THƯỚC: cấm sửa bất kỳ file nào trong
> `src/` — chỉ test + `ops/bin/nghiem-thu/`. Hành vi code là CHUẨN, thước phải theo code.

## ① Bốn thước + chẩn đoán tổng đã mổ

1. **`ops/bin/nghiem-thu/l0-m1.sh` + `test/l0-m1-*` (7 trượt):** phép `bo_luat_chung`
   2/1/1 đếm TUYỆT ĐỐI — seed mồi L2-M3 (+1 dòng NULL toàn hệ trong DB chính) làm thành
   3/2/2; phép ⑨ down→up đỏ dây chuyền theo. **Vá: đếm DELTA** — chèn dòng test xong đếm
   `sau − trước` hoặc lọc `WHERE id IN (dòng mình chèn)`, không đếm cả bảng.
2. **`ops/bin/nghiem-thu/l3-m1.sh` (⑦b):** neo cứng «26|26 đơn thật» — VA-Q12 backfill
   3.784. **Vá: bất biến** «đếm TRƯỚC lượt chạy ≡ đếm SAU» (delta = 0 trong cùng lượt),
   bỏ hằng 26.
3. **`ops/bin/nghiem-thu/l3-m2.sh` (phép 005 down):** `migrate.js down` gỡ bản MỚI NHẤT
   (006 của VA-Q12) chứ không phải 005. **Vá theo khuôn l1-m1.sh đã vá 23/08:** lùi
   từng bản tới khi 005 là bản chót rồi mới down (xem `l1-m1.sh` dòng ~112 làm mẫu).
4. **`test/l2-m2-handler.test.js` ca «không cướp diễn đàn» — ĐỎ CẢ KHI CÔ LẬP.** Chuỗi
   nhân quả tổng đã lần ra (mổ tay 23/08): (a) fixture kb KHÔNG có `products` ⇒
   `rap-prompt`/khuôn kb.js đặt `noData` ⇒ handler bàn giao sớm TRƯỚC bậc 4b/5 —
   **hành vi ĐÚNG nghiệp vụ (không có giá thì không bịa), PHÁN: giữ code, sửa fixture
   thêm products**; (b) sau khi thêm products, assert `guiTinCalls=['stub AI reply']`
   vẫn đỏ — các ca trong file SHARE cùng `PSID`/hội thoại nên `state.aiTurns` bị ca
   trước tiêu, ngân sách lạnh (L2-M3) chặn lượt model. **Vá: mỗi ca một hội thoại riêng
   (psid riêng + dòng `hoi_thoai` fixture riêng), và rà CẢ FILE các ca khác cùng bệnh
   tiềm ẩn.** Tổng đã thử 2 nấc và revert (test về HEAD sạch) — mày làm TRỌN, đo lại
   từng nấc đừng tin lời tổng.

## ② Ra: 4 thước xanh trên DB chính HIỆN TẠI **và** bất biến với dữ liệu tương lai

(chạy 2 lần liên tiếp cùng kết quả; bơm thêm 1 đơn giả định không làm đỏ — nêu cách
chứng minh trong nhật ký).

## ③ Pathspec

```
ops/bin/nghiem-thu/l0-m1.sh
ops/bin/nghiem-thu/l3-m1.sh
ops/bin/nghiem-thu/l3-m2.sh
test/l0-m1-*.test.js
test/l2-m2-handler.test.js
docs/thi-cong/nhat-ky/phieu-va-t1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md  ← §9 + §10
```

⛔ TUYỆT ĐỐI không sửa `src/**` — thước theo code, không phải code theo thước. Thấy chỗ
NGHI là bug code thật → DỪNG, ghi §9, báo tổng (đừng tự phán).

## ④ Nghiệm thu

```bash
# 1. Chạy TUẦN TỰ cả 13 cổng ops/bin/nghiem-thu/{l*,va-*}.sh — 13/13 rc=0, không phép
#    trượt nào (in bảng tên-cổng → rc + đạt/trượt; đo rc TÁCH DÒNG: RC=$?; echo — cấm
#    đo trong cùng chuỗi echo có command substitution, án lệ tổng 23/08)
# 2. node --test toàn bộ test/l0-*,l1-*,l2-*,l3-*,va-* — tổng pass = tổng tests, fail 0
# 3. Chạy lại lượt 2 nguyên bộ — kết quả y hệt (không nhiễu thứ tự còn sót)
```

## ⑤–⑦: thước thuần, không nhánh thật; nợ đã tra = chính 4 mục ① (không mở nợ mới trừ

khi phát hiện bug code thật → §9 DỪNG).

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`fix(nghiem-thu): VA-T1 — ...`) · ≤12 dòng.
