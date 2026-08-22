# PHIẾU L3-M1 — Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN ngay từ cửa vào

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 (điều khiển đơn thật: đẩy WhatsApp + ghi ngược POS
— qua 2 cửa đã guard) · thợ **opus**

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b. «Quyết định quan trọng nhất về nghiệp
> vụ» (01 §1) sống ở phiếu này — sai nhánh là hoặc làm phiền khách đã đồng ý mua, hoặc
> đóng gói gửi cho khách chưa ai hỏi (bom hàng).

## ① Thi hành đoạn spec nào

- `docs/v3/01-QUYET-DINH.md` §1 — bảng hai luồng, NGUYÊN VĂN từng ô: trang bán hàng
  (BUY NOW → POS «Chờ xác nhận» → BOT NHẮN WHATSAPP → xác nhận → «Chờ in») ·
  Messenger (bot chốt trong chat → hàng chờ duyệt → duyệt là tạo thẳng «Chờ in»,
  **KHÔNG NHẮN WHATSAPP LẠI**). Số phải bịt: 37,4% BUY NOW không gửi WhatsApp.
- `docs/v3/02-KE-HOACH-CODE.md` §L3 — "Máy trạng thái phân nhánh theo nguồn" + "Chỉ đơn
  trang bán hàng vào luồng nhắn WhatsApp" + Nghiệm thu 3 gạch đầu (nhắn trong 5 phút ·
  đơn Messenger không hề nhận tin xác nhận · xác nhận → POS sang Chờ in).
- `docs/v3/ban-giao/luoc-do-v1.md` (don_hang: `nguon` NOT NULL · trạng thái HỆ tách
  trạng thái POS) · `cua-whatsapp-v1.md` (guiTinMau + `LoiSaiNguonDon`) · bàn giao cửa
  POS trong `luoc-do-v1.md` §thay-đổi (ghiNguocTrangThai 4 cửa · bảng mã ĐÃ XÁC MINH:
  «Chờ xác nhận»=0 · «Chờ in»=12).

## ② Hợp đồng vào/ra

**Vào (ĐO LẠI):** bảng `don_hang` sau L1-M1 (26 dòng thật, 2 cột trạng thái) ·
`src/pos/index.js` exports (ghiNguocTrangThai(ctx,{donId,tu,sang})) ·
`src/channels/whatsapp/index.js` exports (guiTinMau, rào nguồn đơn) · bảng `lich_nhac`
(chưa ai ghi — L3-M3 mới dùng, phiếu này KHÔNG đụng).

**Ra (đo được):**

1. **`src/orders/may-trang-thai.js`** — trạng thái HỆ (cột riêng, TÁCH POS):
   - Nguồn `trang_ban_hang`: `moi → cho_gui_wa → da_gui_wa → {xac_nhan → day_cho_in
(gọi cửa POS 0→12) · tu_choi → dong · het_luot → cho_sale}`.
   - Nguồn `messenger`: `moi → cho_duyet → {duyet → tao_don_cho_in (L3-M4 thi hành vế
tạo; phiếu này chỉ chuyển trạng thái) · loai → dong}` — **KHÔNG tồn tại trạng thái
     WA nào trong nhánh này**; ép đơn messenger sang trạng thái WA → ném lỗi có tên
     (`LoiSaiNhanhNguon`), khuôn rào của cửa WA.
   - BẢNG CHUYỂN CHO PHÉP **PER-NGUỒN** khai cứng (khuôn bảng-mã-xác-minh L1-M1): cặp
     ngoài bảng → ném lỗi; mọi chuyển (kể cả bị chặn) ghi `nhat_ky`.
   - Hàm thuần `chuyen(don, sukien)` tách khỏi side-effect (dễ test); side-effect (gửi
     WA, ghi POS) qua deps tiêm — RUNTIME trỏ vào cửa thật, TEST trỏ mock.
2. **`src/orders/quet-don-moi.js`** — job quét `don_hang` nguồn `trang_ban_hang` trạng
   thái POS «Chờ xác nhận»(0) chưa vào máy → đưa vào `moi` rồi đẩy `cho_gui_wa` →
   `guiTinMau` (mẫu xác nhận đơn) → `da_gui_wa`. Nhịp quét ≤ 5 phút (nghiệm thu 02 §L3
   «trong vòng 5 phút»); chạy bằng ctxHeThong (gắn đúng team — khuôn N3 L1-M2).
3. **Interface cho L3-M3** (bộ đọc ý): `nhanPhanHoi(ctx, {donId, ket_qua:
'xac_nhan'|'tu_choi'|'doi_sua'|'khong_ro'})` — phiếu này thi hành nhánh `xac_nhan`
   (→ day_cho_in, gọi cửa POS compare-and-set tu=0 sang=12) và `tu_choi` (→ dong);
   `doi_sua`/`khong_ro` → `cho_sale` + ghi `viec_can_xu_ly` (lý do rõ).
4. `docs/v3/ban-giao/may-trang-thai-don-v1.md` — sơ đồ trạng thái per-nguồn + bảng
   chuyển + interface cho L3-M2/M3/M4 + B (màn L4 đọc `viec_can_xu_ly`).

## ③ File được đụng (pathspec)

```
src/orders/
test/l3-m1-*.test.js
docs/v3/ban-giao/may-trang-thai-don-v1.md
ops/bin/nghiem-thu/l3-m1.sh
docs/thi-cong/nhat-ky/phieu-l3-m1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §9 + §10
```

⛔ Không đụng `src/queue/` `src/chat/` (L2-M1 đang chạy song song — thấy cần interface
thì ghi §9, KHÔNG với sang) · không sửa file phẳng `src/` · không đụng `lich_nhac`
(đất L3-M3) · `.env` chỉ ĐỌC.

## ④ Nghiệm thu — đóng gói `ops/bin/nghiem-thu/l3-m1.sh`

```bash
# 1. NHÁNH MESSENGER SẠCH WA (phép đắt nhất — 02 §L3 gạch 2): đơn messenger đi TRỌN vòng
#    đời (moi→cho_duyet→duyet và moi→cho_duyet→loai) với spy cửa WA: guiTinMau = 0 TUYỆT
#    ĐỐI; ép sang trạng thái WA → LoiSaiNhanhNguon (in tên lỗi)
# 2. NHÁNH TRANG BÁN HÀNG: đơn 0-chưa-xác-nhận → quét ≤5' → guiTinMau đúng 1 lượt (mock,
#    in tham số mẫu tin) → da_gui_wa; quét lần 2 KHÔNG gửi lại (idempotent, spy vẫn 1)
# 3. xac_nhan → cửa POS được gọi đúng compare-and-set {tu:0, sang:12} (mock đếm 1, in
#    tham số); trạng thái hệ day_cho_in; trạng thái POS trong DB KHÔNG bị sửa tay (test
#    không đụng cột pos — chỉ cửa mock nhận lệnh)
# 4. tu_choi → dong, POS mock 0 lượt; doi_sua/khong_ro → cho_sale + viec_can_xu_ly +1
#    dòng lý do đúng (SELECT in ra)
# 5. Bảng chuyển per-nguồn: cặp NGOÀI bảng (vd trang_ban_hang: moi→day_cho_in nhảy cóc)
#    → ném lỗi + nhat_ky +1; in bảng chuyển đọc từ code = bảng khai trong ban-giao (diff rỗng)
# 6. Job quét chạy ctxHeThong: nhat_ky dòng mang team_id thật của đơn (không NULL/chua-phan)
# 7. npm test: bộ l3-m1 xanh; mẩu đơn test tự chèn tự dọn DELETE đúng id (DB đang có 26
#    đơn thật — không đụng)
```

## ⑤ Test chạm nhánh nào

Local: trọn máy trạng thái trên DB thật + mock 2 cửa (WA/POS — cửa thật đã ✅ có test
riêng). Gửi WA thật + ghi POS thật: §7b T1/T2. Đơn LadiPage thật chảy vào: cần collector
đơn chạy theo nhịp (docDon đã có — job quét dùng dữ liệu nó đổ).

## ⑥ Ngoài phạm vi → APPEND §9 (kể cả thấy don_hang thật có trạng thái lạ).

## ⑦ ĐÃ TRA — OUTPUT MÁY

```
$ grep -n "may-trang-thai\|L3-M1\|trạng thái đơn" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep §9
rc=1 — chưa nợ nào vùng này. src/orders chưa tồn tại.
```

Quan hệ: **mới** — thi hành 01 §1 (quyết định nghiệp vụ số một) + tiêu thụ 3 giao diện
đã ✅ (cửa POS · cửa WA · viec_can_xu_ly).

---

**Khi nộp:** nhật ký `docs/thi-cong/nhat-ky/phieu-l3-m1.md` · APPEND 3 dòng §10 · commit
pathspec ③ (`feat(orders): L3-M1 — ...`) · trả lời tổng ≤15 dòng.
