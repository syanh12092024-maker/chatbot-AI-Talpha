# CR-28-09c · Làm gọn theo bản thảo «4 màn» — HỒ SƠ ĐO, CHƯA ÁP

Người yêu cầu: chủ dự án · 28/09/2026 · sau bản dựng https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb
(«Cảm giác giao diện này dễ hiểu và dễ sử dụng hơn. Nếu theo bản thảo này thì CR có lớn không?»).
Trạng thái: **ĐO XONG · CHỜ «áp»** — không tệp mã / quyết định / thước nào bị sửa.

Bản thảo gói NĂM thay đổi khác nhau. Luật «một CR sửa đúng một điều» ⇒ tách thành A–E, đo riêng,
người quyết chọn áp phần nào.

## 1 · Câu đổi + phạm vi âm

| | Từ | Sang | Vì |
|---|---|---|---|
| **A · Màn** | 26 màn / 5 nhóm menu (`03-MAN-HINH.md`, `chung/man-hinh.js`) | 4 đích: **Hộp thư · Page · Số liệu · Cài đặt** | Sale mở một màn là làm được việc; marketer có một chỗ cho «bot nói gì»; chủ đọc tiền một chỗ |
| **B · Vai** | 5 vai (§9: Quản trị · Marketer · Sale · Quản lý · Người duyệt kịch bản) | 3 vai: Quản trị · Marketer · Sale | «Lưu là chạy» (CR-28-09b) đã bỏ việc của Người duyệt; Quản lý = Quản trị chỉ xem |
| **C · Nội dung bot** | 7 khái niệm (luật chung · kịch bản 3 tầng · kỹ năng · câu trả lời sẵn · so A/B · gợi ý AI · đoạn chữ gửi AI) — §6 «bốn khối» | Luật chung + Page (sản phẩm · giá · ảnh · lời bot) + ô **Thử hỏi bot** | Marketer phải hiểu 7 khái niệm để sửa một câu bot nói |
| **D · Model** | «Bốn nhà, mỗi team chọn» (§7) | Một chính + một dự phòng khác nhà, màn một khung | Mã ĐÃ chạy đúng kiểu này (chính + dự phòng khác nhà — sổ tay B #15); chỉ gọn màn và câu chữ §7 |
| **E · Một bot** | Bot cũ `src/` + v3 song song, cờ `V3_*` | Một bot, Postgres là nguồn | **KHÔNG thuộc CR này** — là đích của lộ trình cutover đã ký; CR-28-09b (MN1–8, xong 28/09) đã làm phần «một nguồn» |

**Phạm vi âm** — CR này KHÔNG đụng: năm tệp bộ não (`src/prompts.js` `closer.js` `tools.js` `fast-lane.js`
`outbound-guard.js`); van gửi `V3_PANCAKE_GUI` · `V3_POS_GHI`; hai luồng đơn (§1); «trả lời khách ở Pancake» (§10);
lược đồ (KHÔNG DROP bảng nào — xem mục 6); đường cutover (E).

## 2 · Tác động năm lớp (đo 28/09, lệnh + số ở cuối mục)

| Lớp | Chỗ | Việc phải làm | Ước lượng |
|---|---|---|---|
| 1 · Ý đồ | §6 (bốn khối, «tầng kỹ năng là mới hoàn toàn»), §7 (bốn nhà), §9 (năm vai; «đề xuất của AI phải có người duyệt»), §10 (Hộp thư thêm DUYỆT ĐƠN — vẫn không soạn tin) | Viết lại 4 mục, giữ dòng cũ gạch ngang + trỏ CR | nhỏ |
| 2 · Điều hành | §5e MN1–MN8 **vừa xong** (MN6 dựng «trang page = màn kịch bản đầy đủ» — trùng vùng với Page mới); BH2–BH6 🎫 · BH8 🔨 ở bộ não (không trùng); UI-HT1–4 xong | Không dừng phiếu nào. Page mới phải đi TRÊN MN6, báo phiên MN trước khi đụng | — |
| 3 · Hợp đồng | `03-MAN-HINH.md` (8 nhóm, 45 dòng màn) · 8 spec `v3/docs/spec/*` · `ban-giao/luoc-do-v1.md` (bảng `ky_nang` `mau_0_dong`) | Viết lại 03 theo 4 đích; spec L4-M1 §7 giữ; đánh dấu lịch sử cho spec màn bị gỡ | vừa |
| 4 · Máy | 30 module `v3/src/ui/*` ≈ **28.000 dòng**; màn bị gỡ/gộp: `trang-chu` 577 · `van-hanh` 1.514 · `lop-0-dong` 595 · `ky-nang` 576 · `ai-de-xuat` 572 · `hieu-qua` 341 · `prompt-page` 691 · `len-chay` 593 · 5 màn số liệu ≈ 2.700 · 6 màn cài đặt ≈ 5.400 (gộp, không bỏ); vai `QUAN_LY`/`NGUOI_DUYET` ở **35 tệp** (mã + ca); đường bot: kỹ năng ở `src/chat/rap-prompt.js`, câu trả lời sẵn ở `src/chat/handler-v3.js`, tầng nước/SP ở `src/db/kich-ban.js` — **không tệp bộ não nào**; thước theo menu: `dieu-huong` (17 mục) · `phan-quyen-nam-vai` · `he-kieu` HK10/HK15 · ~40 tệp ca gắn tên màn | Gộp giao diện, tái dùng tầng đọc; ẩn trước, gỡ đường bot sau; viết lại thước menu/quyền | **lớn nhất (A)** |
| 5 · Dữ liệu | PROD: `nguoi_dung` **1** · gán vai **3, cả 3 là quản trị** · `ky_nang` **3, 0 bật** · `mau_0_dong` **0** · `kich_ban` 74 LIVE + 1 lưu trữ, **tất cả tầng page** · `bo_luat_chung` 1 · `cau_hinh_model` 3 · page 581, **0 bật bot, 0 có marketer** · nhật ký 30 ngày: **1 người, 5 thao tác** | **0 bản ghi phải sửa**: không ai mang vai sắp bỏ, không kỹ năng nào bật, không mẫu 0 đồng, không kịch bản tầng nước/SP | ≈ 0 |

Lệnh đo: `grep -nE "^## (6|7|9|10)…" docs/v3/01-QUYET-DINH.md` · `grep -cE "^\| " docs/v3/03-MAN-HINH.md` ·
`wc -l` từng `v3/src/ui/<màn>/` · `grep -rln "QUAN_LY\|NGUOI_DUYET" v3/src v3/test` (35) · `grep -ln … src/prompts.js`
(chỉ `boLuatChung`/`kichBanMay` — hai khối GIỮ) · SQL đếm trên `aicloser_v3` prod qua SSH đọc (script xoá sau khi chạy).

## 3 · Giá phải trả

- **Gỡ ~9 màn đã xây** (câu trả lời sẵn, kỹ năng, gợi ý AI, so A/B, việc của tôi, hội thoại và đơn…) — mã nằm lại
  trong git, dựng lại được khi có lượt chat đủ để cần.
- **Viết lại thước**: mọi ca gắn menu 17 mục / năm vai / tên màn — thước đỏ trông như mã đỏ (án lệ 27), phải đi cùng.
- **«Thử hỏi bot» là việc MỚI duy nhất**: gọi model thật qua đúng bộ ráp prompt ⇒ tốn token, và cần khoá model SỐNG
  (máy chủ đang bị từ chối 401 — sổ §9 N-TPD). Chưa có khoá thì ô này chỉ hiện «chưa nối».
- **Đụng vùng MN6 vừa làm** (trang page) — phải xếp lại cho khớp, không dựng song song.
- Tab «Đơn chờ xác nhận WhatsApp» của Hộp thư sẽ TRỐNG tới khi luồng WhatsApp có (hồ sơ Meta chưa nộp — việc người).
- Rủi ro sinh ra: người đã quen vị trí màn cũ — hôm nay đo được đúng 1 người dùng, nên rủi ro này gần 0; càng để lâu
  càng đắt.

## 4 · Đề nghị ghi §9 SỔ NỢ

- Gỡ HẲN bảng `ky_nang` · `mau_0_dong` · cột tầng nước/SP của `kich_ban` — KHÔNG làm trong CR này (lùi lược đồ không
  phải đường lùi, sổ mở-van §5); xét sau một tháng không ai cần.
- «Thử hỏi bot» cần khoá model sống ⇒ nối vào việc người «thay khoá model máy chủ».

## 5 · Phiếu cần đẻ (nếu áp trọn A–D)

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| LL1 | Khung 4 đích + menu theo 3 vai (thay 5 nhóm) · sale vào thẳng Hộp thư | 🟩 | — |
| LL2 | Hộp thư = bàn hội thoại + duyệt đơn Messenger trong khung chat + tab đơn chờ xác nhận | 🟨 (duyệt đơn là đường tiền) | LL1 |
| LL3 | Page: danh sách + luật chung + «Bật được chưa» (4 điều kiện) + 4 tab, gộp 8 màn — đi trên MN6 | 🟨 | LL1 |
| LL4 | Thử hỏi bot: gọi model thật qua bộ ráp prompt, không gửi khách, ghi chi phí | 🟨 | LL3 · khoá model sống |
| LL5 | Số liệu một màn (gộp 5, hai phễu tách luồng) | 🟩 | LL1 |
| LL6 | Cài đặt một màn nhiều tab (gộp 6) + Model một khung (D) | 🟩 | LL1 |
| LL7 | Vai 5 → 3 (B): quyền, lược đồ gieo, 35 tệp | 🟨 (quyền) | LL1 |
| LL8 | Gỡ màn thừa + gỡ kỹ năng / câu trả lời sẵn / tầng nước-SP khỏi ĐƯỜNG BOT (C) — không đụng bộ não, không DROP bảng | 🟨 | LL3 |
| LL9 | Thước: menu · quyền · HK10/HK15 · §10 cho Hộp thư mới | 🟩 | LL1–LL8 |

Cỡ: 9 phiếu. Để so: sóng UI-HT (4 phiếu, cùng loại việc) xong trong một ngày làm việc của dây chuyền này.
Phần nặng là A (LL1–LL6); B, C, D mỗi phần một phiếu.

## 6 · Đường lùi

Không sửa dữ liệu, không DROP bảng ⇒ lùi = `git revert` các commit của CR + restart `aicloser-v3`; CSDL không phải
lùi. Làm theo thứ tự «thêm màn mới trước, gỡ màn cũ sau cùng» (LL8 cuối) ⇒ tới trước LL8, màn cũ vẫn mở được theo
đường cũ — lùi bất kỳ lúc nào không mất gì.
