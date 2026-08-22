# PHIẾU L3-M1 — Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN ngay từ cửa vào

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 (điều khiển đơn thật: đẩy WhatsApp + ghi ngược POS
— qua 2 cửa đã guard) · thợ **opus**

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §7b. «Quyết định quan trọng nhất về nghiệp
> vụ» (01 §1) sống ở phiếu này — sai nhánh là hoặc làm phiền khách đã đồng ý mua, hoặc
> đóng gói gửi cho khách chưa ai hỏi (bom hàng). Bản v2 — đóng 7 finding
> `nghiep-vu-L3-M1.verdict.yaml` (2 CHAN: nhánh messenger đặt nhầm bảng · thiếu trạng
> thái thất bại + 3 lý do không gửi).

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
   - Nguồn `trang_ban_hang`: `moi → cho_gui_wa → {da_gui_wa · gui_wa_loi}` ·
     `da_gui_wa → {xac_nhan → day_cho_in (cửa POS, CAS theo LIVE — xem dưới) ·
     tu_choi → dong · het_luot → cho_sale}`.
   - **TRẠNG THÁI THẤT BẠI + 3 LÝ DO ĐẾM ĐƯỢC (N2):** `guiTinMau` hỏng → `gui_wa_loi` +
     cột `ly_do_khong_gui` (`thieu_so_wa` | `mau_chua_duyet` | `loi_kenh`) — 02 §L3 có
     gạch nghiệm thu «Ba lý do không gửi đếm đúng trên riêng đơn trang bán hàng»; nằm
     lại `cho_gui_wa` im lặng là 37,4% quay lại, im lặng hơn. `gui_wa_loi` được job quét
     THỬ LẠI có trần đếm lần; quá trần → `cho_sale` + `viec_can_xu_ly`.
   - **CAS THEO LIVE (N2 vế POS):** đồ thị thật 1.400 đơn là `0 → 1 → 12 → 8` — POS có
     thể đã sang `1` khi khách xác nhận. `xac_nhan` đọc LIVE qua cửa POS: live thuộc tập
     tiền-in hợp lệ khai theo bảng-mã-ĐÃ-XÁC-MINH (dự kiến `{0, 1}` — thợ ĐO nhãn của
     `1` trong bảng 14 mã ở `luoc-do-v1.md` rồi chốt, ghi nhật ký) → CAS
     `{tu: live, sang: 12}`; live NGOÀI tập → KHÔNG ghi POS, đơn sang `cho_sale` + lý do
     `pos_trang_thai_la` — không im lặng, không ghi bừa.
   - Nguồn `messenger` (N1 — SỬA PHẠM TRÙ): đơn Messenger **chưa duyệt thì CHƯA TỒN TẠI
     trong `don_hang`** (01 §1: sale duyệt mới TẠO đơn) — pre-duyệt sống ở
     `hang_cho_tao_don`, ĐẤT L3-M4, phiếu này KHÔNG mô hình nó. Máy chỉ quản đơn
     messenger ĐÃ TẠO: khởi tạo thẳng `day_cho_in` khi L3-M4 gọi
     `donMessengerDaTao(ctx, {donId})` (POS đã «Chờ in» từ lúc tạo). **KHÔNG tồn tại
     trạng thái WA trong nhánh này**; ép sang trạng thái WA → `LoiSaiNhanhNguon`.
   - BẢNG CHUYỂN CHO PHÉP **PER-NGUỒN** khai cứng (khuôn bảng-mã-xác-minh L1-M1): cặp
     ngoài bảng → ném lỗi; mọi chuyển (kể cả bị chặn) ghi `nhat_ky`.
   - Hàm thuần `chuyen(don, sukien)` tách khỏi side-effect; side-effect (gửi WA, ghi
     POS, huỷ nhắc) qua deps tiêm — RUNTIME trỏ cửa thật, TEST trỏ mock.
2. **`src/orders/quet-don-moi.js`** — job quét `don_hang` nguồn `trang_ban_hang` trạng
   thái POS «Chờ xác nhận»(0) chưa vào máy → `moi` → `cho_gui_wa` → `guiTinMau` (mẫu
   xác nhận) → `da_gui_wa`/`gui_wa_loi`. Nhịp quét ≤ 5 phút (02 §L3 «trong vòng 5
   phút»). Chạy ctxHeThong nhưng khuôn L1-M2 là ctx theo PAGE còn job này duyệt ĐƠN —
   **rebind ctx PER-ĐƠN từ `don_hang.team_id`** (verdict iv), nhat_ky từng đơn mang team
   của đơn đó. Job cũng quét lại `gui_wa_loi` theo trần thử lại.
3. **Interface cho các phiếu sau (đủ 3 phía — verdict câu 7):**
   - L3-M3 (bộ đọc ý): `nhanPhanHoi(ctx, {donId, ket_qua})` với 4 kết quả
     `xac_nhan | tu_choi | doi_sua | khong_ro` — thi hành `xac_nhan` (CAS trên) ·
     `tu_choi` (→ dong) · `doi_sua`/`khong_ro` (→ `cho_sale` + `viec_can_xu_ly` lý do
     rõ). Kèm hai hook: `bao_het_luot(ctx, {donId})` → `het_luot → cho_sale` (trạng thái
     có sự kiện KÍCH, hết mồ côi) và deps `huyLichNhac(donId)` được GỌI khi
     `xac_nhan`/`tu_choi` tới (mock trong test — bảng `lich_nhac` vẫn đất L3-M3).
   - L3-M4: `donMessengerDaTao(ctx, {donId})` như ②#1 — M4 lo duyệt/loại TRÊN
     `hang_cho_tao_don`, M1 chỉ nhận đơn đã tạo.
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
# 1. NHÁNH MESSENGER SẠCH WA (02 §L3 gạch 2): donMessengerDaTao → day_cho_in, spy cửa
#    WA guiTinMau = 0 TUYỆT ĐỐI; ép sang trạng thái WA → LoiSaiNhanhNguon (in tên lỗi);
#    đơn messenger có dòng trạng thái pre-duyệt trong don_hang = 0 (pre-duyệt là
#    hang_cho_tao_don, đất L3-M4)
# 2. NHÁNH TRANG BÁN HÀNG: đơn 0-chưa-xác-nhận → quét ≤5' → guiTinMau đúng 1 lượt (mock,
#    in tham số mẫu tin) → da_gui_wa; quét lần 2 KHÔNG gửi lại (idempotent, spy vẫn 1)
# 2b. BA LÝ DO KHÔNG GỬI (N2): ép 3 ca (thiếu số WA · mẫu chưa duyệt · lỗi kênh) → 3 đơn
#     gui_wa_loi với 3 ly_do_khong_gui khác nhau, SELECT đếm THEO LÝ DO = 1/1/1 «trên
#     riêng đơn trang bán hàng» (đơn messenger = 0); quá trần thử lại → cho_sale
# 3. xac_nhan CAS THEO LIVE (N2): mock cửa POS live=0 → CAS {tu:0,sang:12}; live=1
#    (submitted chen giữa, đồ thị 0→1→12→8) → CAS {tu:1,sang:12}; live=8 (ngoài tập) →
#    POS 0 lượt ghi + đơn cho_sale + pos_trang_thai_la (in cả 3 ca); day_cho_in chỉ ở
#    2 ca đầu; trạng thái POS trong DB không bị test sửa tay
# 4. tu_choi → dong, POS mock 0 lượt, huyLichNhac spy=1 (cả ca xac_nhan);
#    doi_sua/khong_ro → cho_sale + viec_can_xu_ly +1 dòng lý do đúng (SELECT in ra);
#    bao_het_luot → het_luot → cho_sale (trạng thái có sự kiện kích)
# 5. Bảng chuyển per-nguồn: cặp NGOÀI bảng (vd trang_ban_hang: moi→day_cho_in nhảy cóc)
#    → ném lỗi + nhat_ky +1; in bảng chuyển đọc từ code = bảng khai trong ban-giao (diff rỗng)
# 6. Job quét rebind ctx PER-ĐƠN: 2 đơn thuộc 2 team nghiệp vụ khác nhau trong MỘT lượt
#    quét → 2 dòng nhat_ky mang 2 team_id đúng theo từng đơn (in cặp)
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
