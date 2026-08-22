# PHIẾU L3-M2 — Lọc trùng CHÉO hai luồng đơn + chấm tỉ lệ hoàn từ lịch sử POS

**Base:** `f295de8` · **Làn:** 🟥 (kết quả quyết đơn được tạo/chặn — đường đơn) ·
thợ **opus** (danh sách 4-phiếu-opus) · điểm (a) tổng tự chấm: thi hành 01 §1 câu «Lọc
trùng phải KIỂM CHÉO cả hai luồng — cùng một khách vào được bằng hai đường» + 02 §L3;
không gửi gì ra ngoài (chỉ đọc POS + ghi bảng nội bộ) nên không thuê lượt (a).

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b.

## ① Thi hành

- `docs/v3/01-QUYET-DINH.md` §1 (kiểm chéo hai luồng) · §11 dòng «Chặn cứng khách hoàn
  cao ở một ngưỡng — Đề xuất chia BỐN TẦNG thay vì một ngưỡng, 144 khách hoàn 30–65%
  đang bị gộp nhầm — **Chờ chốt**» ⇒ phiếu này CHỈ TÍNH + LƯU + PHÂN TẦNG, **KHÔNG
  chặn tự động** (quyết định chặn chưa chốt — làm ngưỡng cứng là vượt ý đồ).
- `docs/v3/02-KE-HOACH-CODE.md` §L3 — "Lọc trùng kiểm chéo cả hai luồng" + "Chấm tỉ lệ
  hoàn từ lịch sử POS, quét lại mỗi đêm" + Nghiệm thu «Khách đặt trang bán hàng rồi chat
  Messenger cùng sản phẩm → bị bắt là trùng».
- `docs/v3/ban-giao/luoc-do-v1.md` — `khach.so_dien_thoai` khoá nối kênh (NULL được) ·
  bảng mã POS: nhóm hủy/hoàn `{4,5,6,7}` (KHÔNG 8 — án lệ L1-M1) ·
  `hang_cho_tao_don` có «kết quả bốn cửa kiểm chống trùng» (L3-M4 sẽ GỌI phiếu này).

## ② Vào/ra

**Vào (ĐO LẠI):** dữ liệu `don_hang` thật (26 dòng + nguồn) · `khach` · lịch sử trạng
thái POS đọc qua `src/pos/` (docDon — có `status_history` không? thợ đo; không có thì
chấm theo trạng thái hiện tại + ngày, khai phép quy ước vào nhật ký) · số điện thoại
trong hai luồng có định dạng lệch nhau (PH/UAE có 0 đầu, +966…) — thợ ĐO phân bố thật
trước khi viết bộ chuẩn hoá.

**Ra:**

1. `src/orders/loc-trung.js` — `kiemTrung(pool, ctx, {soDienThoai, sanPhamId, keo_ngay})`
   → `{trung: bool, don: [...], nguon_trung: 'trang_ban_hang'|'messenger'|'ca_hai',
ly_do}`:
   - Chuẩn hoá SĐT một chỗ (hàm thuần, bảng ca lệch thật trong test).
   - KIỂM CHÉO: tra `don_hang` CẢ HAI nguồn theo khách (SĐT chuẩn hoá) + sản phẩm +
     cửa sổ ngày (mặc định thợ đề xuất theo dữ liệu, khai nhật ký; config được).
   - SĐT NULL (Messenger giữa chừng) → `trung:false, ly_do:'chua_co_sdt'` — nói ra,
     không im lặng.
2. `src/orders/ti-le-hoan.js` — job đêm: chấm per-KHÁCH từ lịch sử POS
   (hủy/hoàn = `{4,5,6,7}`), ghi `khach.ti_le_hoan` + `khach.tang_hoan`
   (**BỐN TẦNG** — ranh giới tầng khai config, mặc định thợ đề xuất từ phân bố thật,
   ghi nhật ký; 144 khách 30–65% phải RA TẦNG RIÊNG, không gộp «bình thường») —
   cột thiếu thì migration 005 (khai lý do luoc-do §thay-đổi + regen schema).
   **KHÔNG có nhánh chặn tự động** — tầng chỉ để L3-M4/L4 ĐỌC và người quyết sau.
3. Interface cho L3-M4: 2 hàm trên là 2 trong «bốn cửa kiểm» — khai chữ ký vào
   `may-trang-thai-don-v1.md` §append (hoặc file bàn giao riêng nếu gọn hơn).

## ③ Pathspec

```
src/orders/loc-trung.js
src/orders/ti-le-hoan.js
src/orders/index.js               ← CHỈ thêm export
db/migrate/005_*.up.sql
db/migrate/005_*.down.sql
db/schema.sql
test/l3-m2-*.test.js
docs/v3/ban-giao/luoc-do-v1.md    ← CHỈ append §thay-đổi
docs/v3/ban-giao/may-trang-thai-don-v1.md ← CHỈ append §cửa-kiểm
ops/bin/nghiem-thu/l3-m2.sh
docs/thi-cong/nhat-ky/phieu-l3-m2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không đụng src/chat (L2-M2 đang song song) · may-trang-thai.js đã ✅ chỉ IMPORT ·
KHÔNG chặn/sửa đơn nào — phiếu này chỉ TÍNH và TRẢ KẾT QUẢ.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/l3-m2.sh`

```bash
# 1. KIỂM CHÉO (02 §L3 nguyên văn): khách X đặt LadiPage (don_hang nguồn trang_ban_hang)
#    rồi giả lập chốt Messenger cùng SP → kiemTrung trả trung:true, nguon_trung đúng;
#    ĐẢO CHIỀU (Messenger trước, LadiPage sau) cũng bắt (in cả hai chiều)
# 2. Chuẩn hoá SĐT: bảng ≥8 ca lệch thật (0 đầu · +966 · khoảng trắng · PH format) —
#    cùng khách 2 định dạng vẫn bắt trùng (in từng cặp)
# 3. SĐT NULL → trung:false + ly_do='chua_co_sdt' (không ném, không im)
# 4. Khác SP / ngoài cửa sổ ngày → KHÔNG trùng (đối chứng âm, in 2 ca)
# 5. Tỉ lệ hoàn: dựng lịch sử mẫu theo khuôn thật → tầng đúng ranh giới; khách 45% hoàn
#    RA TẦNG RIÊNG không phải «bình thường»; mã 8 KHÔNG tính hoàn (án lệ — in phép đếm
#    có/không 8 lệch nhau)
# 6. Job đêm idempotent: chạy 2 lần số không đổi; KHÔNG UPDATE đơn/không chặn gì
#    (đếm don_hang trước/sau = bằng)
# 7. Migration 005 idempotent + down→up; thước l0-m1 KHÔNG gãy nếu 005 không thêm bảng
#    (thêm bảng thì tự vá NEO kèm khai — như án lệ 003)
# 8. node --test l3-m2 xanh + hồi quy l3-m1 không gãy
```

## ⑤ Nhánh thật: chấm tỉ lệ hoàn trên 26 đơn thật + lịch sử POS thật nếu đọc được

(POS không chặn IP — L1-M1 đã đo); phân tầng 144 khách thật = khi VPS/cutover có dữ
liệu đầy. ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
§9 có nợ N4-L1-M1 (quy ước quy đổi tiền POS chưa khai) — phiếu này KHÔNG đụng tiền,
chỉ đếm trạng thái ⇒ không chạm nợ đó. Nợ «144 khách gộp nhầm» 01 §11 = chính phiếu
này trả (phần TÍNH), phần CHẶN chờ chốt — đã ghi rõ ở ①.
```

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`feat(orders): L3-M2 — ...`) · ≤15 dòng.
