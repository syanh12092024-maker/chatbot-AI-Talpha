# PHIẾU L1-M1 — Cửa POS: đọc đơn / danh mục sản phẩm / tồn kho + GHI NGƯỢC trạng thái đơn

**Base:** `DIEN-LUC-PHAT` · **Làn:** 🟥 GHI RA NGOÀI (đổi trạng thái đơn thật trên POS —
sai là hỏng đơn khách) · thợ **opus** (1 trong 4 phiếu khó theo route 22/08)

> Phiếu là HỢP ĐỒNG. Thợ nạp skill `tho-thi-cong` trước khi làm. Đọc sổ §0a trước khi gõ.
> Phát SAU GATE R0 (L0-M1 ✅ + L0-M2 ✅). Bản v2 — đóng 7 finding
> `docs/thi-cong/nhat-ky/nghiep-vu-L1-M1.verdict.yaml` (3 CHAN: bảng mã không phép đo ·
> ghi không đọc live · V3_KHOA_MA_HOA thiếu).

## ① Thi hành đoạn spec nào

- `docs/v3/02-KE-HOACH-CODE.md` §"L1 · Bốn cửa kết nối" — mục Cửa POS (đọc đơn theo trạng
  thái · đọc danh mục + tồn kho · ghi ngược trạng thái — "quyền ghi mới, sai là hỏng đơn
  thật") + mục "Nghiệm thu" hai gạch đầu: đọc danh mục thật không-đoán-qua-25-đơn · đổi đơn
  nháp 2 chiều POS ghi nhận đúng.
- `docs/v3/01-QUYET-DINH.md` §1 (luồng trang bán hàng: Chờ xác nhận → Chờ in) · §8 ("mỗi
  team có **kết nối POS riêng**") · §12 (chỗ hở: sản phẩm suy ngược từ 25 đơn, tên SP trống).
- `docs/TONG-QUAN-HE-THONG.md` §7.5 — mỗi thị trường một shop (`pancake-shops.json`:
  `{market, shop_id, api_key}`) · trạng thái hủy/hoàn = `4,5,6,7,8` · mốc ngày UTC=07:00 VN.
- `docs/v3/ban-giao/luoc-do-v1.md` + `tang-truy-van-v1.md` — dùng tầng truy vấn L0-M2
  (ctx bắt buộc), KHÔNG query thẳng.
- Sổ §9 hai dòng nợ liên quan: `pages.json.posApiKey` ĐÃ BỊ CHE (112/112 dạng `***`) —
  khoá thật ở `pancake-shops.json`, đừng đọc nhầm cột · `kb-overrides.products` chưa nạp.

## ② Hợp đồng vào/ra

**Vào (ĐO LẠI trước khi code):** `src/pancake-orders.js` (219 dòng, bản đang chạy — BỌC LẠI
qua import, cấm sửa file gốc) · `pancake-shops.json` (khoá POS thật theo market) ·
`page-shop-cache.json` (map page→shop có sẵn) · lược đồ v3 (bảng `don_hang`, `san_pham`,
`goi_gia` đang rỗng phần POS).

**Ra (đo được):**

1. **Migration `db/migrate/002_ket_noi_pos.*`** — bảng `ket_noi_pos` (team_id NOT NULL ·
   market · shop_id · api_key lưu MÃ HOÁ cùng cơ chế `db/khoa.js` của L0-M1). 19 bảng không
   có chỗ chứa kết nối POS theo team (01 §8 đòi) — bảng mới, khai lý do vào `luoc-do-v1.md`
   (§thay đổi). Di trú `pancake-shops.json` → `ket_noi_pos`, team = `chua-phan` (chờ H7,
   giống pattern page). Khoá mã hoá: `.env` dev ĐÃ có `V3_KHOA_MA_HOA` (tổng đặt 22/08 sau
   verdict N3); VPS dùng khoá RIÊNG — việc NGƯỜI H9 §8 sổ, không chặn dev.
2. **`src/pos/`** (thư mục con MỚI) — cửa POS v3, mọi hàm nhận `ctx` qua tầng truy vấn
   L0-M2:
   - `docDon(ctx, {shop, trangThai, tuNgay})` — đọc đơn theo trạng thái; ghi/refresh vào
     `don_hang` (cột nguồn, trạng thái POS TÁCH trạng thái hệ).
   - `docDanhMuc(ctx, shop)` — danh mục SP + biến thể + TỒN KHO thật từ API POS → upsert
     `san_pham`/`goi_gia`. Hết cảnh suy từ 25 đơn (01 §12).
   - `ghiNguocTrangThai(ctx, {donId, tu, sang})` — GHI NGƯỢC có **BỐN CỬA AN TOÀN**:
     a. Biến môi trường `V3_POS_GHI` mặc định VẮNG/`0` = fail-CLOSED — hàm NÉM LỖI, không
     gọi API (giống khuôn `PANCAKE_READONLY`).
     b. Bảng chuyển trạng thái CHO PHÉP khai cứng BẰNG MÃ ĐÃ XÁC MINH (mục 3 dưới — bảng
     mã chưa xác minh thì cửa (b) ĐÓNG, mọi lượt ném lỗi). Ngoài bảng là ném lỗi.
     ⛔ KHÔNG BAO GIỜ có nhánh xoá đơn.
     c. COMPARE-AND-SET (N2): vế `tu` bắt buộc; trước PUT phải GET trạng thái LIVE từ POS
     — live ≠ `tu` → TỪ CHỐI (lỗi có tên + nhat_ky). Sale vẫn đổi trạng thái tay song song
     (§7.4) — cấm tra whitelist trên ảnh chụp `don_hang` cũ.
     d. Nhật ký HAI PHA (N4): INSERT `pos_ghi_bat_dau` TRƯỚC PUT + INSERT `pos_ghi_ket_qua`
     SAU (bảng chỉ-INSERT nên 2 dòng, không update). Mất phản hồi sau PUT ⇒ dòng bắt-đầu
     MỒ CÔI, phát hiện được. Lượt bị chặn ở (a)(b)(c) cũng ghi.
3. **Bảng mã trạng thái POS — XÁC MINH LÀ ĐIỀU KIỆN MỞ CỬA (b), N1:** KHÔNG bịa, KHÔNG
   đoán. "Chờ in" xuất hiện 8 lần trong docs mà không đâu có mã số; chỉ chắc `0` = Chờ xác
   nhận (`pancake-orders.js:173`); đoán 3="Chờ in" khi 3 có thể là "Đã giao" = đơn khách bị
   đánh dấu đã giao lúc hàng còn trong kho. Xác minh: đọc đơn THẬT nhiều trạng thái từ API,
   đối chiếu nhãn dashboard POS bằng mắt, ghi bảng `mã → nhãn` vào nhật ký + `luoc-do-v1.md`
   §thay-đổi; neo kiểm `{4,5,6,7,8}` = hủy/hoàn (§7.5) phải khớp. Bảng chuyển cho phép
   trong code NẠP TỪ bảng đã xác minh; mã chưa xác minh ⇒ cửa (b) đóng, KHÔNG "tạm cho qua".
4. **Luật suy `don_hang.nguon` (N6, cột NOT NULL):** neo `conversation_id` trên đơn POS
   (§7.5 — khớp hội thoại Messenger ⇒ `messenger`; còn lại ⇒ `trang_ban_hang`). Thợ ĐO
   phân bố thật + khai luật vào nhật ký; đơn KHÔNG suy được → LIỆT KÊ từng mã + đổ §9,
   cấm đoán bừa (đoán sai là bịt luôn lỗ 37,4% mà L3 sinh ra để vá).

## ③ File được đụng (pathspec)

```
db/migrate/002_ket_noi_pos.up.sql
db/migrate/002_ket_noi_pos.down.sql
db/di-tru/ket-noi-pos.js
db/di-tru/index.js
db/schema.sql                            ← regen theo luoc-do-v1 §0 khi thêm migration 002
src/pos/
test/l1-m1-*.test.js
docs/v3/ban-giao/luoc-do-v1.md          ← CHỈ append §thay-đổi (bảng 002 + bảng mã trạng thái)
ops/bin/nghiem-thu/l1-m1.sh
docs/thi-cong/nhat-ky/phieu-l1-m1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md  ← CHỈ append §9 + §10
```

⛔ Không sửa `src/pancake-orders.js` hay bất kỳ file phẳng nào dưới `src/` · không đụng
`src/db/` (đất L0-M2 đã chốt) ngoài IMPORT · `.env` chỉ ĐỌC.

## ④ Nghiệm thu BẰNG NỘI DUNG — đóng gói `ops/bin/nghiem-thu/l1-m1.sh`

```bash
# 1. Migrate 002 idempotent (2 lượt, _migrations +1 rồi đứng) + down→up sạch trên DB đã seed
# 2. ket_noi_pos: count = số market trong pancake-shops.json (in cả hai vế); api_key trong
#    DB không mở đầu bằng ký tự khoá thật (đã mã hoá — in 10 ký tự đầu 1 dòng)
# 3. ĐỌC THẬT từ POS (chạy được ở local thì chạy; lỗi mạng/121 → khai NHÁNH-VPS, xem ⑤):
#    docDanhMuc trên 1 shop thật: count san_pham nạp được > 0, IN 3 tên SP + tồn kho đầu
#    danh sách, đối chiếu MẮT với dashboard POS (chụp số vào nhật ký)
# 4. docDon trên 1 shop thật, 1 trạng thái: count đơn đọc được + IN 2 mã đơn đầu; đơn ghi
#    vào don_hang có nguon + trạng thái POS tách trạng thái hệ (SELECT kiểm 2 cột khác nhau)
# 3b. BẢNG MÃ XÁC MINH (N1): bảng mã→nhãn trong code = bảng đã xác minh trong nhật ký
#     (diff = rỗng, in cả bảng); {4,5,6,7,8} thuộc nhóm hủy/hoàn; chưa xác minh → phép ĐỎ
#     và cửa (b) phải đang ĐÓNG (gọi thử → ném lỗi)
# 5. GHI NGƯỢC — BỐN cửa đo ĐỦ, không gộp:
#    a. V3_POS_GHI vắng → gọi ghiNguocTrangThai ném lỗi ĐÚNG TÊN, api KHÔNG được gọi
#       (mock/spy đếm 0 lượt), nhat_ky +1 dòng "bị chặn"
#    b. V3_POS_GHI=1 + chuyển NGOÀI bảng cho phép → ném lỗi, api 0 lượt
#    b2. COMPARE-AND-SET (N2): mock GET live ≠ `tu` → từ chối đúng tên lỗi, PUT 0 lượt,
#        nhat_ky +1 dòng bị-chặn
#    b3. NHẬT KÝ 2 PHA (N4): mock PUT timeout SAU khi gửi → dòng bắt-đầu tồn tại KHÔNG có
#        dòng kết-quả (đếm 2 loại, in 2 số)
#    c. V3_POS_GHI=1 + đơn NHÁP + chuyển hợp lệ: PHÉP NÀY CHỈ CHẠY TRÊN VPS/khi tổng ra
#       lệnh — local ghi rõ "CHƯA CHẠY — chờ diễn tập VPS" vào output, KHÔNG giả vờ xanh
# 6. Mọi hàm gọi không ctx → ném lỗi tầng truy vấn (thừa kế L0-M2, đo 1 phép đại diện).
#    Phép 3/4 chạy dưới ctxHeThong (job nền, có audit) — KHAI RÕ trong output (N7), không
#    phải ctx người thật; đường người thật đo ở L4 khi có màn
# 7. npm test: bộ l1-m1 xanh; KHÔNG chạy bộ cũ trong script này (nợ §9: bộ cũ ghi vào
#    conv-state.json thật — gate R1 xử riêng)
```

Mỗi phép in MỘT CON SỐ hoặc MỘT DANH SÁCH. Phép 5c để trạng thái "CHƯA CHẠY" thật thà —
cấm tự dựng điều kiện giả.

## ⑤ Test chạm nhánh nào

Nhánh thật: API POS thật qua `pancake-shops.json` (POS `pos.pages.fm` KHÁC token page —
lỗi 121 là chuyện token PAGE; thợ ĐO xem POS có chặn IP cá nhân không, ghi kết quả vào
nhật ký). Chặn thật → mock theo ĐÚNG khuôn response chụp từ VPS (lệnh curl mẫu ghi nhật ký)
và phép 3–4 chuyển trạng thái NHÁNH-VPS chờ gate R1. Phép 5c luôn là nhánh VPS/diễn tập.

## ⑥ Ngoài phạm vi

Ngoài ③ → APPEND §9. Đặc biệt: thấy gì lạ trong dữ liệu đơn thật (giá âm, trạng thái
ngoài bảng mã…) → §9, cấm "sửa giùm" dữ liệu POS.

## ⑦ ĐÃ TRA CHƯA — OUTPUT MÁY

```
$ grep -rn "pos\|POS" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep "§9\|posApiKey\|products" | head -3
→ 2 dòng nợ: posApiKey bị che (đã đưa vào ①) · kb-overrides.products chưa nạp (KHÔNG thuộc
  phiếu này — products là dữ liệu KB theo page, nạp ở phiếu kịch bản; danh mục POS là nguồn khác)
$ ls src/pos db/migrate/002* 2>/dev/null → chưa tồn tại
```

Quan hệ: **mới**, thi hành chỗ hở 01 §12 (suy-25-đơn) + nợ-đọc-nhầm-cột (posApiKey).

---

**Khi làm:** mơ hồ → `[NEEDS CLARIFICATION: …]`, làm tiếp phần chắc.

**Khi nộp:** nhật ký `docs/thi-cong/nhat-ky/phieu-l1-m1.md` · APPEND 3 dòng §10 ·
commit pathspec ③ (`feat(pos): L1-M1 — ...`) · trả lời tổng ≤15 dòng.
