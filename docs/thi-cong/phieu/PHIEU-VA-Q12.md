# PHIẾU VA-Q12 — docDon nuôi bảng `khach` + `san_pham_ma` (đóng khớp đứt Q1+Q2, cả Q3 nếu rẻ)

**Base:** `31172e1` · **Làn:** 🟥 dữ liệu khách trên đường đơn — nhưng CHỈ ĐỌC POS,
ghi bảng nội bộ · thợ **sonnet** · điểm (a) tổng tự chấm: nợ Q1/Q2 do L3-M2 đo ra
(«bảng có reader mà không ai ghi» — họ lỗi phổ biến nhất, §0 CLAUDE gốc); bỏ phiếu này
thì lọc trùng thật trả tập RỖNG vĩnh viễn và luồng WA không có SĐT để gửi.

> Thợ nạp skill `tho-thi-cong` (2 bài học mới cuối). Đọc sổ §0a + §9 (Q1·Q2·Q3).

## ① Thi hành

- Sổ §9 nợ **Q1** (L3-M2 23/08): `don_hang.san_pham_ma text[]` (005) CHƯA AI GHI —
  POS có sẵn `items[].variation_id` 95,9%; reader đang fail-closed
  `nghi_trung_chua_ro_san_pham`.
- Nợ **Q2**: bảng `khach` 0 dòng · `don_hang.khach_id` 0/26 — docDon không dựng khách ⇒
  kiemTrung thật rỗng + `thieu_so_wa` L3-M1 chặn (không SĐT thì gửi WA cho ai).
- Nợ **Q3** (nếu rẻ trong cùng lượt đọc): POS trả `status_history` 5.144/5.144 mà cửa
  không lưu — thêm cột/ghi kèm để tỉ lệ hoàn chấm bằng LỊCH SỬ thay vì quy ước
  (độ lệch quy ước đã đo 0,08% — không gấp; làm nếu không phình phạm vi).

## ② Vào/ra

**Vào (ĐO LẠI):** khuôn đơn POS thật (docDon đang parse gì, bỏ gì — nhật ký L1-M1) ·
`chuanHoaSdt` của L3-M2 (DÙNG LẠI, cấm viết bản hai) · UNIQUE `khach` theo team+SĐT
(luoc-do).

**Ra:** trong `src/pos/doc-don.js` (+ file phụ nếu cần):

1. Mỗi đơn đọc về → **upsert `khach`** theo (team, SĐT chuẩn hoá — dùng `chuanHoaSdt`
   import từ orders): tên/SĐT từ đơn POS; đơn không SĐT → khach_id NULL + đếm (nói ra).
2. Ghi `don_hang.khach_id` + `san_pham_ma` (mảng `variation_id` các items; thiếu 4,1% →
   mảng rỗng, KHÔNG bịa).
3. Q3 nếu làm: lưu `status_history` (jsonb, cột mới = migration 006 khai lý do; KHÔNG
   thêm bảng — NEO 21 giữ).
4. Di trú lại 26 đơn cũ (chạy docDon refresh) — sau phiếu: `khach` > 0 · `khach_id`
   khớp danh sách · kiemTrung trên dữ liệu thật hết rỗng.

## ③ Pathspec

```
src/pos/doc-don.js
src/pos/                    ← file phụ nếu tách
db/migrate/006_*.up.sql     ← CHỈ nếu làm Q3
db/migrate/006_*.down.sql
db/schema.sql               ← regen nếu có 006
test/va-q12-*.test.js
docs/v3/ban-giao/luoc-do-v1.md ← CHỈ append §thay-đổi
ops/bin/nghiem-thu/va-q12.sh
docs/thi-cong/nhat-ky/phieu-va-q12.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md ← §9 (đóng Q1·Q2·[Q3]) + §10
```

⛔ Không đụng src/orders (chỉ IMPORT chuanHoaSdt) · ghiNguocTrangThai/4 cửa KHÔNG đụng ·
KHÔNG lượt ghi nào ra POS (docDon là GET).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-q12.sh`

```bash
# 1. docDon 1 shop thật (GET) → khach được upsert: count > 0, in 3 dòng đầu (SĐT đã
#    chuẩn hoá bằng ĐÚNG hàm L3-M2 — so 1 số qua cả hai đường, khớp)
# 2. don_hang.khach_id: tập đơn có SĐT → khach_id NOT NULL (đếm 2 vế danh sách); đơn
#    không SĐT → NULL + đếm in ra (không im)
# 3. san_pham_ma: đơn có items → mảng đúng variation_id (in 2 mẫu đối chiếu response);
#    4,1% thiếu → mảng rỗng, kiemTrung trả nghi_trung_chua_ro_san_pham (nối L3-M2)
# 4. kiemTrung TRÊN DỮ LIỆU THẬT hết rỗng: cặp trùng chéo thật L3-M2 nêu (966501984606,
#    #68771/#68769) BẮT ĐƯỢC qua đường đầy đủ (in kết quả — đây là phép ăn tiền)
# 5. Idempotent: docDon 2 lần → khach/don_hang không nhân đôi (đếm trước/sau)
# 6. node --test va-q12 xanh + hồi quy l1-m1 + l3-m2 không gãy
```

## ⑤ Nhánh thật: toàn phiếu chạy trên POS GET thật (đã chứng minh không chặn IP).

## ⑥ Ngoài phạm vi → §9. ## ⑦ ĐÃ TRA: nợ Q1·Q2·Q3 sổ §9 — phiếu này SINH RA để đóng

chúng; không trùng phiếu nào (L1-M1 ✅ đã đóng, đây là phần NỐI thiếu).

**Khi nộp:** nhật ký · §10 3 dòng + §9 đóng nợ · commit pathspec
(`fix(pos): VA-Q12 — ...`) · ≤12 dòng.
