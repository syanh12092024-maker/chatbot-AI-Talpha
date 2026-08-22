# PHIẾU VA-R3 — Máy trạng thái: CAS ghiDon + đơn kẹt cho_gui_wa (C3: RF-13·RF-14)

**Base:** `bf9614a` · **Làn:** 🟥 hai sổ lệch (POS vs hệ) trên đường đơn · thợ **sonnet** ·
điểm (a) tổng tự chấm: bám repro `refute-tong-the-1.repro.mjs` F5 + `refute-mang4` F4; sửa
nội bộ máy trạng thái, không đổi interface đã ✅.

## ① Thi hành
- RF-13: `may-trang-thai.js:257-278` `ghiDon()` UPDATE MÙ, không CAS `trang_thai_he` ⇒
  `apDung` nhận ẢNH CŨ ghi đè: POS ở 12 «Chờ in» mà sổ hệ ghi `cho_sale` (F5 repro).
- RF-14: `quet-don-moi.js:61` CAU_QUET không quét lại `cho_gui_wa` ⇒ đơn crash/re-throw kẹt
  vĩnh viễn, `so_lan_thu_wa` vẫn 0, 0 `viec_can_xu_ly` (mở lại lỗ 37,4%).

## ② Vào/ra
**Vào (ĐO LẠI):** `may-trang-thai.js` ghiDon/apDung · `quet-don-moi.js` CAU_QUET + nhánh
gui_wa_loi (VA đã có gui_wa_loi từ L3-M1) · trạng thái cho_gui_wa ai đọc.
**Ra:** (1) `ghiDon` CAS: UPDATE ... WHERE trang_thai_he = $tu_kỳ_vọng; 0 dòng chạm → TỪ CHỐI
lỗi có tên (ảnh cũ không ghi đè); hai sổ không bao giờ lệch. (2) job quét NHẶT LẠI đơn kẹt
`cho_gui_wa` (crash giữa lượt) — đưa vào lượt gửi lại theo trần, quá trần → cho_sale +
viec_can_xu_ly (không đơn nào chết im).

## ③ File được đụng
```
src/orders/may-trang-thai.js
src/orders/quet-don-moi.js
test/va-r3-*.test.js
ops/bin/nghiem-thu/va-r3.sh
docs/thi-cong/nhat-ky/phieu-va-r3.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```
⛔ Không đụng hang-cho.js/tao-don.js/doc-danh-muc.js (C2 song song) · doc-y.js (C4) · KHÔNG
đổi chữ ký hàm export (hang-cho C2 đang gọi) — chỉ sửa NỘI BỘ.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-r3.sh`
```bash
# 1. RF-13: node refute-tong-the-1.repro.mjs → F5: lượt đi từ ảnh cũ bị TỪ CHỐI, POS≡hệ (không lệch)
# 2. RF-14: đơn kẹt cho_gui_wa (mô phỏng crash) → lượt quét sau NHẶT LẠI (in trạng thái trước/sau);
#    quá trần → cho_sale + viec_can_xu_ly +1
# 3. CAS: 2 lượt ghiDon song song cùng đơn → 1 thắng, 1 bị từ chối (không cả hai ghi)
# 4. hồi quy: node --test test/l3-m1-*.test.js + l3-m3 không gãy (interface giữ nguyên)
```
## ⑤ DB dev, mẩu tự chèn tự dọn. ## ⑥ Ngoài phạm vi → §9.
## ⑦ ĐÃ TRA: RF-13/14 §9 — phiếu đóng. Không trùng C2/C4 (file tách).
**Khi nộp:** nhật ký · §10 · commit pathspec (`fix(orders): VA-R3 — ...`) · ≤10 dòng.
