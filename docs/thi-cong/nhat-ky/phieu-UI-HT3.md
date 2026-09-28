# NHẬT KÝ PHIẾU UI-HT3 — cột bối cảnh · nhãn nguồn tin · tên Messenger (28/09/2026)

Phiếu: `docs/thi-cong/phieu/PHIEU-UI-HT2-4.md` §UI-HT3 · CR-28-09 · làn 🟩 · người quyết cho «cứ SSH đọc»
khi cần số đo (chỉ đọc, chỉ in số đếm).

## Đo lại nguyên liệu TRƯỚC khi code — máy chủ 169.58.33.8, CSDL `aicloser_v3` thật, chỉ đọc

| Đo | Kết quả | Hệ quả |
|---|---|---|
| `hoi_thoai` · có `khach_id` | 29.563 · **36** | 29.527 hội thoại không có tên ở hồ sơ ⇒ cần tên Messenger |
| Sổ AI bot cũ: conv · conv có `name` · bản ghi `reply` · `reply` ≥12 ký tự | 33.315 · 33.301 · 13.972 · 13.483 | Nguồn tên Messenger + nguồn đối chiếu «tin bot» |
| 23 hội thoại thật đọc được trên Pancake: trường `from` | 29/29 tin page khớp Sổ AI chỉ mang `uid`; **54 tin KHÔNG khớp cũng mang `uid`**; `flow_id` chỉ ở luồng Botcake | `from` KHÔNG tách được bot với sale ⇒ «Bot AI» chỉ khi khớp dữ liệu đối chiếu |
| `ly_do_cuoi` · `ai_noi_gi` khác rỗng | 8.859 · 3.886 | Khối «Hội thoại» có dữ liệu thật |
| `khach.tang_hoan` có giá trị | 89.484/89.498 | Rủi ro hoàn đáng hiện (nhãn đã vá ở `103e082`) |
| `don_hang` · gắn hội thoại · theo nguồn | 123.629 · 2.326 (2.261 hội thoại) · messenger 115.775 / trang bán hàng 7.854 (0 gắn hội thoại) | Không có chỉ mục theo `hoi_thoai_id`: EXPLAIN = Seq Scan, **81–104 ms**, đọc 16.594 trang/lượt |
| `don_hang.trang_thai_pos` (đơn gắn hội thoại) | mã SỐ: 16·2·3·5·6·4·20·11·9·12·0·17·1 | Phải ra chữ theo `src/pos/ma-trang-thai.js#BANG_MA`; mã 17 ngoài bảng |
| `don_hang.trang_thai_he` (đơn gắn hội thoại) | 2.326/2.326 `moi_tu_pos` | — |
| `so_ai` · cột tiền | 0 dòng · `tien_vnd`/`tien_usd` CÓ (011) | Khối «Bot v3» nói «chưa có dữ liệu» (CR mục 3) |
| `kich_ban` LIVE | 74, đều tầng page | Vẫn đi bộ giải ba tầng thật — đọc thẳng tầng page sai ngay khi có bản tầng nước |
| `lan_gui` · `tin_cho_xu_ly` | 0 · 0 | Đường đối chiếu v3 chưa có dữ liệu; đo bằng sandbox |

## 🔴 Lỗi của UI-HT1 bắt được trước deploy

`docHoiThoai` đọc `tin_cho_xu_ly` qua cổng dữ liệu. Cổng THẬT (`cong-du-lieu-that.js` → `src/db/truy-van.js#
kiemTraTenBang`) chỉ nhận bảng trong `BANG_NGHIEP_VU_CHUAN` — `tin_cho_xu_ly` và `lan_gui` KHÔNG có ⇒ ném.
Cổng giả không có danh sách bảng nên bộ ca HT1 xanh. Dựng lại bằng lệnh (sandbox `uiht3loi`, cổng thật, không
tiêm bộ đọc SQL):

```
NÉM: "tin_cho_xu_ly" không nằm trong BANG_NGHIEP_VU_CHUAN của tầng truy vấn v3 (src/db/truy-van.js) — …
```

Hậu quả nếu deploy: mở BẤT KỲ hội thoại nào trên máy chủ ⇒ 500. Vá: bộ đọc SQL `taoDocDauVetV3Sql(pool)` (hai
câu, `team_id = $1` từ bối cảnh, có LIMIT), tiêm từ `chay-that.js`; thiếu thì `vai-b` kêu «mở hội thoại là
500». Lưới mới: `test/ui-ht3-sql.test.js` chạy TRỌN `docHoiThoai` và `boiCanhHoiThoai` qua cổng thật trên
Postgres — loại lỗi này (bảng ngoài danh sách, tên cột sai, kiểu `numeric`/`timestamptz`) chỉ bắt được ở đó.

## Làm gì

- `doc-hoi-thoai.js`: `taoChiMucSoAi(docSo)` — MỘT lần đọc Sổ AI cho bốn câu hỏi (mã khách · tên Messenger ·
  đầu câu bot đã trả lời · số lượt bot cũ); `datChiMucSoAi`, `datLaTinTuDong`, `datDocDauVetV3`,
  `taoDocDauVetV3Sql`. Mỗi tin page mang `nguon`:
  `ai` = khớp `lan_gui.provider_id` (chính xác) hoặc đầu câu 60 ký tự (lần gửi v3 `da_gui`/`khong_ro` ·
  `reply` của Sổ AI; bỏ HTML/hoa/khoảng trắng; đầu câu <12 ký tự không tính) · `tu_dong` = `from.flow_id` hoặc
  `isAutomationTemplate` · `page` = còn lại.
- `boi-canh-hoi-thoai.js` (mới) + `GET /api/ban-hoi-thoai/:id/boi-canh`: hồ sơ khách qua `hoSoCua` (một công
  thức với điều phối) · đơn đang bàn = đơn MỚI NHẤT của hội thoại, trạng thái hệ + POS ra chữ · kịch bản qua
  bộ giải ba tầng tiêm vào (`docKichBanChoPage`), ném thì nói lý do · Sổ AI v3: lượt trả lời, model gần nhất
  (bỏ `khong-goi-model`), tiền chỉ trên lượt gọi model · lượt bot cũ từ Sổ AI. Team khác ⇒ 404.
- Danh sách: `tenMessenger` cho mỗi dòng. Trang: nhãn nguồn dưới bong bóng (Bot AI màu chính · Page nền
  trung tính · Tự động viền đứt), bối cảnh vẽ ngay từ dòng danh sách rồi vẽ lại khi `/boi-canh` về — KHÔNG chờ
  Pancake. Huy hiệu rủi ro hoàn dùng chung `DongViecUI.huyHieuHoan` (không có công thức thứ hai).
- Nối dây: `vai-b.js` (+3 phụ thuộc, thiếu thì kêu), `chay-that.js` (thật), `xem-thu.js` (GIẢ: đủ năm loại tin,
  hội thoại 5 chỉ có tên Messenger, đơn đang bàn, Sổ AI v3 có một lượt chưa tính tiền).

## Quyết định lệch phiếu (luật 13)

1. **Nhãn «Page» thay cho «SALE»** (phiếu UI-HT2: «tin sale có nhãn SALE»). Đo 23 hội thoại: `from` của tin sale
   và tin bot KHÔNG khác nhau. Gọi «SALE» là đoán — tin bot cũ không có trong Sổ AI (bị cắt/sửa) sẽ bị gán cho
   sale. Giá: sale thấy «Page» cho cả tin mình gõ lẫn tin bot không đối chiếu được.
2. **Chạm `src/`? Không.** Chỉ `import` `src/db/kich-ban.js`, `src/bot-registry.js`, `src/pos/ma-trang-thai.js`,
   `src/orders/may-trang-thai.js` (hai cái sau chỉ trong bộ ca làm nguồn sự thật cho nhãn).
3. **Đơn của hội thoại đọc qua cổng, không SQL riêng**: quét bảng ~90 ms/lượt mở — chấp nhận; chỉ mục là
   migration, ngoài phạm vi âm của CR (lược đồ) ⇒ nợ §9.
4. **Sửa thước của UI-HT1** (`ops/bin/nghiem-thu/ui-ht1.sh` ③): `grep -c tệp*` với NHIỀU tệp in «tệp:số» ⇒ phép
   so số hỏng ⇒ cổng HT1 đỏ OAN từ lúc UI-HT2 thêm tệp thứ hai vào thư mục (không ai chạy lại cổng HT1). Đổi
   sang `cat | grep -c`; kiểm lại răng: chèn một `db.them(` ⇒ ③ đỏ «1», gỡ ra ⇒ xanh.

## Kiểm

- `v3/test/b/ban-hoi-thoai-boi-canh.test.mjs` 13/13 — nhánh chạm: năm nguồn tin, provider_id, `dien_tap`/`ghiNote`
  không tính, chỉ mục Sổ AI, tên Messenger ở danh sách, bối cảnh đủ khối, «chưa có dữ liệu», tiền chỉ trên lượt
  gọi model, bộ giải ném/chưa nối, team khác không gọi bộ giải, nhãn trạng thái đơn = máy trạng thái, nhãn POS =
  `BANG_MA`, HTTP 401/403/200/404.
- `test/ui-ht3-sql.test.js` 3/3 trên Postgres sandbox qua CỔNG THẬT (S1 dấu vết không lọt team · S2 `docHoiThoai`
  trọn đường · S3 bối cảnh đúng cột/kiểu với bộ giải kịch bản thật).
- `vai-b-noi-day`: thiếu ba phụ thuộc thì kêu (và câu `docDauVetV3` phải nói «500»); nối đủ thì `daNoiDauVetV3()`
  · `daNoiGiaiKichBan()` thật sự true.
- v3 932/932 · `npm test` toàn repo 2.179 ca, 2.175 pass, 0 đỏ (đo lúc nộp).
- Đảo-vá 19 đột biến, mỗi lượt một tiến trình: **19/19 đỏ** (bỏ khớp Sổ AI · bỏ ngưỡng 12 · bỏ flow_id · diễn
  tập tính là đã tới · SQL lấy mã cũ nhất · SQL bỏ kẹp team `lan_gui` · bỏ provider_id · đếm cả lượt không phải
  reply · so cả `other_bot` · đơn cũ nhất · model gồm lượt không gọi model · bộ giải nhận id Facebook · tiền null
  là có giá · nuốt lỗi bộ giải · `so_ai` không lọc psid · mã POS thô · bỏ tên Messenger · 404→200 · nối mà không
  đặt bộ đọc).
- Cổng `ops/bin/nghiem-thu/ui-ht3.sh` 12/12 · `ui-ht1.sh` 7/7 (sau khi sửa thước) · `ui-ht2.sh` 8/8.
- Bản xem thử (dữ liệu GIẢ, ảnh chụp 1440 và 390): nhãn nguồn đúng cả năm loại · năm khối bối cảnh · hội thoại 5
  hiện «Messenger: Hessa Al Amri» + lý do chưa có hồ sơ · không cuộn ngang · 0 lỗi console.

Nhánh test KHÔNG chạm: JavaScript trong trang (vẽ nhãn, vẽ khối) — không có bộ ca DOM; kiểm bằng ảnh chụp.

## Nợ (đề nghị ghi §9)

- Chỉ mục `don_hang (team_id, hoi_thoai_id) WHERE hoi_thoai_id IS NOT NULL` — mỗi lượt mở hội thoại quét 123.629
  đơn (~90 ms, 16.594 trang).
- `so_ai` chưa có chỉ mục theo `psid` — cột bối cảnh quét mọi dòng Sổ AI của page (0 dòng hôm nay).
- `tin_cho_hoi_thoai (team_id,page_id,psid,id)` là chỉ mục MỘT PHẦN (chỉ `cho`/`dang_xu`) — đọc dấu vết tin đã
  xong đi `tin_cho_xu_ly_conv` rồi lọc psid (0 dòng hôm nay).
- Mã POS 17 (2 đơn gắn hội thoại) ngoài `BANG_MA` — màn hiện «mã 17 · chưa xác minh».
- Tỉ lệ tin page còn «Page» trên hội thoại thật — đo sau deploy (bắt buộc trước khi hứa «phân biệt bot/sale»).
- Chưa làm (phiếu UI-HT2): mốc «bot đẩy sang người» giữa khung chat; tìm theo tên (nay đã có tên Messenger).
