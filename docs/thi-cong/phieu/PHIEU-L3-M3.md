# PHIẾU L3-M3 — Hàng đợi nhắc (2h × tối đa 5, huỷ khi khách trả lời) + bộ đọc ý 4 nhánh

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 (điều khiển gửi nhắc ra khách — qua cửa WA đã
guard) · thợ **sonnet** (cơ chế cửa/máy đã có sẵn, phiếu này là lịch + phân loại) ·
điểm (a) tổng tự chấm: thi hành 02 §L3 hai gạch «Hàng đợi có hẹn giờ: nhắc mỗi 2 tiếng,
tối đa 5 lần, huỷ khi khách trả lời» + «Bốn nhánh đọc ý»; nghiệm thu 02 §L3 «Khách trả
lời giữa chừng → lịch nhắc bị huỷ ngay» — bỏ phiếu này thì đơn `da_gui_wa` không ai theo,
37,4% chỉ được hỏi đúng một lần.

> Thợ nạp skill `tho-thi-cong` (2 bài học mới cuối file). Đọc sổ §0a + §7b.
> PHÁT khi src/orders rảnh (sau L3-M2).

## ① Thi hành

- `docs/v3/02-KE-HOACH-CODE.md` §L3 — nhắc 2h/tối đa 5/huỷ khi trả lời · bốn nhánh đọc
  ý: xác nhận · hủy · đòi sửa · không rõ.
- `docs/v3/ban-giao/may-trang-thai-don-v1.md` §2 — hook `nhanPhanHoi` (4 kết quả) +
  `bao_het_luot` + chỗ deps `huyLichNhac` đang no-op chờ phiếu này.
- `docs/v3/ban-giao/luoc-do-v1.md` — bảng `lich_nhac` (nhắc mỗi 2 tiếng · huỷ được).
- `docs/v3/ban-giao/cua-whatsapp-v1.md` — nhắc gửi bằng `guiTinMau` (mẫu duyệt), KHÔNG
  gửi text tự do.

## ② Vào/ra

**Vào (ĐO LẠI):** bảng `lich_nhac` cột thật · hook máy trạng thái (nhanPhanHoi/
bao_het_luot chữ ký thật trong `src/orders/index.js`) · chiều ĐỌC tin WhatsApp về **CHƯA
TỒN TẠI** (cửa L1-M3 chỉ gửi; poll/webhook WA = H1/H2) ⇒ bộ đọc ý nhận TEXT qua
interface, nguồn text thật đấu ở cutover.

**Ra:**

1. `src/orders/lich-nhac.js` — đặt lịch khi đơn vào `da_gui_wa` (lần 1 sau 2h, cách 2h,
   trần 5); job quét lịch tới hạn → gửi nhắc qua `guiTinMau` (mẫu nhắc riêng, ghi
   `so_lan_thu_wa`); **quá 5 lần → gọi `bao_het_luot`** (máy đưa `het_luot → cho_sale`);
   `huyLichNhac(donId)` cài THẬT (thay no-op qua deps của máy — đúng chỗ bàn giao §5
   chờ): huỷ mọi lịch còn treo của đơn, idempotent.
2. `src/orders/doc-y.js` — `docY(text, {ngonNgu?}) → {ket_qua, do_tin}` bốn nhánh
   (AR/EN + biến thể PH nếu dữ liệu có): luật từ khoá + khuôn mẫu (KHÔNG gọi model —
   0 đồng; câu mơ hồ → `khong_ro`, để máy đẩy `cho_sale`, KHÔNG đoán liều); hàm thuần,
   bảng ca thật trong test.
3. `src/orders/nhan-phan-hoi-wa.js` — cầu nối: nhận `{donId, text}` (interface — nguồn
   thật chờ H1/H2) → `docY` → `nhanPhanHoi(ctx, {donId, ket_qua})` → máy tự lo (kể cả
   huỷ lịch qua deps). Ghi `so_ai` sự kiện phản hồi.

## ③ Pathspec

```
src/orders/lich-nhac.js
src/orders/doc-y.js
src/orders/nhan-phan-hoi-wa.js
src/orders/index.js               ← CHỈ thêm export + cài deps huyLichNhac thật
test/l3-m3-*.test.js
docs/v3/ban-giao/may-trang-thai-don-v1.md ← CHỈ append §lịch-nhắc
ops/bin/nghiem-thu/l3-m3.sh
docs/thi-cong/nhat-ky/phieu-l3-m3.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không đụng may-trang-thai.js/quet-don-moi.js (✅ — chỉ import + deps) · không đụng
src/chat src/channels src/pos · KHÔNG thêm migration (lich_nhac đã có — thiếu cột thì
§9 xin trước).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/l3-m3.sh`

```bash
# 1. Lịch: đơn vào da_gui_wa → 1 dòng lich_nhac hạn +2h (đồng hồ TIÊM qua deps — cấm neo
#    đồng hồ tường, án lệ «thước tự dựng»); tua 2h → gửi nhắc 1 (guiTinMau mock=1, mẫu
#    NHẮC không phải mẫu xác nhận); tua đủ 5 lần → bao_het_luot gọi 1, đơn cho_sale,
#    KHÔNG lịch thứ 6 (đếm = 5)
# 2. HUỶ NGAY (02 §L3 nguyên văn): giữa lần 2 và 3 khách trả lời (nhan-phan-hoi-wa) →
#    lịch treo bị huỷ TRONG CÙNG LƯỢT (đếm lịch active = 0 ngay sau nhanPhanHoi, không
#    chờ job quét); guiTinMau sau đó = 0
# 3. docY bốn nhánh: bộ ca ≥16 câu (≥4 mỗi nhánh, AR/EN, in từng câu→nhánh); câu mơ hồ
#    → khong_ro (không đoán); nhánh xac_nhan đi trọn tới CAS POS mock (nối L3-M1)
# 4. Idempotent: huyLichNhac 2 lần không lỗi; đặt lịch cho đơn đã có lịch không nhân đôi
# 5. Job quét lịch rebind ctx per-đơn (khuôn L3-M1 ④#6 — 2 team 2 dòng nhat_ky đúng)
# 6. node --test l3-m3 xanh + hồi quy l3-m1/l3-m2 không gãy
```

## ⑤ Nhánh thật: gửi nhắc thật + nhận phản hồi thật = §7b (T1 + H2). Đồng hồ tiêm deps.

## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA

```
Bàn giao máy §5: deps huyLichNhac đang no-op {camChua:false} CHỜ ĐÚNG phiếu này — quan
hệ: thi-hành-chỗ-chờ. lich_nhac chưa ai ghi (luoc-do). Không trùng phiếu nào.
```

**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`feat(orders): L3-M3 — ...`) · ≤12 dòng.
