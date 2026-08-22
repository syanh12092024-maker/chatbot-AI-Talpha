# PHIẾU L1-M3 — Cửa Pancake WhatsApp: KHUNG + mock (phép gửi thật dồn §7b T1)

**Base:** `5bee9da` · **Làn:** 🟥 gửi-ra-ngoài — thợ **sonnet** (tái dùng NGUYÊN cơ chế
guard/định tuyến đã duyệt 2 vòng ở L1-M2; cơ chế mới duy nhất là luật MẪU TIN)

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a. Điểm (a): tổng tự chấm (tái dùng cơ chế đã
> duyệt — dòng §10 22/08). Phép gọi Pancake thật HOÃN «chờ H1 + §7b T1», cấm giả xanh.

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §L1 — "Cửa Pancake WhatsApp — mới hoàn toàn, phụ thuộc
  điểm kiểm 1" (nay code KHUNG trước theo lệnh người quyết 22/08, sổ §7b).
- `docs/v3/01-QUYET-DINH.md` §4 — đường Pancake (Cloud API chính thức) ĐÃ CHỐT, bỏ tự
  dựng; "cần mẫu tin duyệt trước"; §1 — chỉ luồng TRANG BÁN HÀNG mới nhắn WhatsApp.
- `docs/v3/ban-giao/cua-messenger-v1.md` — KHUÔN cửa: guard fail-closed 2 biến · định
  tuyến team qua tầng truy vấn · ctxHeThong gắn đúng team · nhật ký hai pha. SAO CHÉP
  cơ chế, đổi tên biến.

## ② Hợp đồng vào/ra

**Vào (ĐO LẠI):** tài liệu/endpoint WhatsApp của Pancake — thợ TÌM bằng đọc code cũ
(`src/wa-login.js`, baileys? — đó là đường WhatsApp Web CŨ đã bị 01 §4 LOẠI, không tái
dùng) + doc pages.fm nếu với tới được; KHÔNG tìm được endpoint chắc chắn → dựng
**adapter interface** (`guiMauQuaPancake(payload)` để trống một bản cài `chua-co-endpoint`
ném lỗi có tên) + ghi §9 «endpoint WA Pancake chốt ở H1». Cấm bịa endpoint.

**Ra (đo được):**

1. `src/channels/whatsapp/` (MỚI):
   - `guiTinMau(pool, ctx, {soNhan, tenMau, thamSo, donHangId})` — CHỈ gửi theo MẪU đã
     duyệt (Cloud API ngoài 24h bắt buộc template — 01 §4/§5); KHÔNG có hàm gửi text tự
     do. Bảng mẫu tin: khai trong code kèm cột `da_duyet boolean` — mẫu chưa duyệt →
     ném lỗi (khuôn «bảng mã xác minh» của L1-M1).
   - Guard fail-closed: `V3_WA_GUI === '1'` VÀ `PANCAKE_READONLY !== '1'`; vắng = ĐÓNG.
   - Định tuyến team + ctxHeThong gắn team + nhật ký 2 pha (`wa_gui_bat_dau`/`wa_gui_ket_qua`)
     — sao chép cơ chế L1-M2/L1-M1.
   - Chỉ nhận đơn nguồn `trang_ban_hang` (01 §1) — đơn `messenger` gọi vào → ném lỗi
     (`LoiSaiNguonDon`): máy trạng thái L3 sẽ dựa vào rào này.
2. `docs/v3/ban-giao/cua-whatsapp-v1.md` — chữ ký + lỗi có tên + chỗ trống endpoint chờ H1.

## ③ File được đụng (pathspec)

```
src/channels/whatsapp/
test/l1-m3-*.test.js
docs/v3/ban-giao/cua-whatsapp-v1.md
ops/bin/nghiem-thu/l1-m3.sh
docs/thi-cong/nhat-ky/phieu-l1-m3.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← CHỈ append §9 + §10
```

⛔ Không đụng `src/channels/messenger/` (đã ✅) ngoài IMPORT khuôn lỗi nếu cần · không
sửa file phẳng `src/` · KHÔNG dùng `@whiskeysockets/baileys` (đường đã LOẠI) · `.env` chỉ ĐỌC.

## ④ Nghiệm thu — đóng gói `ops/bin/nghiem-thu/l1-m3.sh`

```bash
# 1. Guard cặp đối chứng (khuôn L1-M2): a=0 (vắng V3_WA_GUI) · b=0 (READONLY=1) · c=1
#    (mở, xuống adapter mock) — cùng spy, env trong harness
# 2. Mẫu tin: tên mẫu chưa duyệt → lỗi đúng tên, adapter 0 lượt; mẫu da_duyet → qua
# 3. Nguồn đơn: đơn messenger → LoiSaiNguonDon, adapter 0 lượt; đơn trang_ban_hang → qua
# 4. Định tuyến team + 2 pha: như khuôn (page/số thuộc team khác ctx → chặn + nhat_ky;
#    timeout sau gửi → dòng bắt-đầu mồ côi)
# 5. Adapter thật: nếu endpoint CHƯA chốt → gọi bản cài thật ném LoiChuaCoEndpoint và
#    output ghi «HOÃN — chờ H1 (§7b T1)»; CÓ endpoint thì vẫn HOÃN phép gửi thật
# 6. npm test: bộ l1-m3 xanh
```

## ⑤ Test chạm nhánh nào

Local: toàn bộ luật cửa trên mock adapter + DB thật (mẩu trộn tự chèn, dọn DELETE đúng id).
Gửi thật: §7b T1, chờ H1.

## ⑥ Ngoài phạm vi → APPEND §9. ## ⑦ ĐÃ TRA

```
$ grep -rn "whatsapp\|wa_" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep "§9"; rc=1 — chưa nợ nào vùng này
$ ls src/channels/whatsapp 2>/dev/null → chưa tồn tại
```

Quan hệ: **mới** — thi hành 02 §L1 với phạm vi thu hẹp «khung + mock» theo lệnh 22/08.

---

**Khi nộp:** nhật ký `docs/thi-cong/nhat-ky/phieu-l1-m3.md` · APPEND 3 dòng §10 · commit
pathspec ③ (`feat(whatsapp): L1-M3 — ...`) · trả lời tổng ≤15 dòng.
