# PHIẾU LL17b — Số liệu đọc đơn từ BigQuery: đơn theo luồng · trang bán hàng · BUY NOW · Chốt/Hoàn theo page · hai luồng tab Khách

> Làn 🟨 (màn đọc + nguồn ngoài CHỈ ĐỌC; không ghi CSDL) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ não · 0 gói · 0 migration · 0 biến
> mới (dùng lại `V3_BQ_KHOA`). Commit `33cd8aa` · cổng `ops/bin/nghiem-thu/ll17b.sh` · ca `test/ll17b-luong-page.test.mjs` ·
> `test/ll17b-anh-chup-cu.test.mjs` · `v3/test/b/ll17b-so-lieu-man.test.mjs`.

## 1 · Đề bài

Người quyết 02/10: «Chữa cổng chập chờn, làm nốt màn số lượng và các phần còn lại». Màn Số liệu còn đọc ảnh chụp `don_hang` 28/08 —
và ô «Đơn theo luồng» in **0 · 0** trên prod (cửa sổ 7 ngày rơi hẳn ra ngoài ảnh chụp): số SAI trông như số đúng (nợ N-DON-THEO-LUONG-0).

**Phạm vi âm:** KHÔNG ghi `don_hang` · KHÔNG đổi ba thước Messenger (đơn quy cho AI · bot tự chốt · hội thoại có đơn — đọc bản quét
POS của lõi bot) · KHÔNG đổi chi phí AI/đơn · KHÔNG đổi rủi ro hoàn (LL17c) · KHÔNG lọc bảng Theo page theo phạm vi marketer
(N-MK-LOC-PAGE-CON, bảng cũ cũng chưa lọc).

## 2 · Đo lại nguyên liệu (02/10, máy dev, khoá levelup, CHỈ ĐẾM)

- Luồng của đơn suy trong BigQuery bằng `JSON_VALUE(payload_json,'$.conversation_id')` — đúng luật `src/pos/doc-don.js#suyNguon`
  (`^(\d+)_(\d+)$` ⇒ messenger · trống ⇒ trang bán hàng · khác ⇒ không suy được). 60 ngày cả công ty: messenger **14.094** · trang bán
  hàng **9.777** · không suy được **1** · 5.413 dòng gộp (một trang).
- `vw_sale_order_team.page_id` là id page Facebook: 30 ngày **12.699** đơn, **7.927** mang `page_id` (62%) · **203** page, **167**
  khớp `pages.json` của công ty.
- Prod: `baoCaoHaiLuong` 7 ngày trả 0/0 vì `don_hang` có dòng tới 28/08 (đo ở LL17a).

## 3 · Đã làm

- **Tầng A `src/hrm/don-pos.js`**: câu gộp chính thêm chiều `luong` (CASE trên mã hội thoại — mã không ra khỏi BigQuery); câu thứ ba
  `SQL_DON_POS_PAGE` (30 ngày, `page_id` × trạng thái); bộ đọc chạy ba câu song song, đệm như cũ; `tongHopTeam` trả thêm `luong` (đơn
  CỦA TEAM tách ba luồng, không gộp; luồng lạ ⇒ «không suy được»); `theoPageTeam(du, pageIds)` chỉ page của team.
- **`src/db/so-lieu.js#boiCanhRong`** thêm `{ cotLuc }`: khoảng đo rỗng mà dòng mới nhất CỦA TEAM cũ hơn đầu khoảng ⇒
  `{ anhChupCu: true, moiNhat, viSaoRong: «… CHƯA BIẾT, không phải 0» }`; `baoCaoHaiLuong` truyền `tao_luc`.
- **Kho màn**: `kho-bao-cao.js#docHaiLuongCuaA` gặp `anhChupCu` ⇒ `{ co:false, vi:'anh-chup-cu' }` (không trả 0 · 0);
  `pageCuaTeamBaoCao` (page_id + tên page của team) · `kho-don-pos.js` trả `luong` · `theoPage` (page của team có đơn 30 ngày; đọc page
  hỏng ⇒ null, khối chính vẫn đứng) · `soNgayPage`.
- **Tổng quan** (`bao-cao.html`): ô «Đơn theo luồng — không gộp» = BigQuery 7 ngày; không có thì số chụp; số chụp cũ ⇒ «—» + «chưa biết —
  bảng đơn là ảnh chụp cũ hơn khoảng đo» · khối Luồng trang bán hàng (7 + 30 ngày, giao · hoàn · huỷ · tỉ lệ giao) · bước «Bấm BUY NOW»
  · bảng Theo page: «Chốt» = đơn − huỷ, «Hoàn» = hoàn ÷ (thành công + hoàn), page chỉ có đơn BigQuery thành hàng, câu chú nói khoảng KHÁC
  hai cột bot. `taiDonPos` vẽ lại ô số · phễu · trang bán hàng · bảng khi số BigQuery về (hai lượt tải đến theo thứ tự nào cũng hội tụ).
- **Tab Khách** (`nguon-khach.html`): «Hai luồng chạy song song» đọc `/api/bao-cao/don-pos` (30 ngày, ba luồng — «không suy được» chỉ
  hiện khi > 0) · «Bấm BUY NOW» cùng số · bỏ câu «đơn mang nguồn khác» của ảnh chụp khi đang hiện số BigQuery; 403 / chưa nối ⇒ số chụp.
- `03-MAN-HINH.md` (Số liệu).

## 4 · Chọn A thay B

- **Suy luồng trong BigQuery** thay vì kéo mã hội thoại về: mã chứa PSID khách — không ra khỏi BigQuery (cổng ② canh).
- **Tab Khách gọi lại `/api/bao-cao/don-pos`** thay vì nhét số BigQuery vào `/api/nguon-khach`: một cửa, một luật phạm vi, một đệm;
  giá: trang gọi thêm một lượt.
- **Chốt theo page = đơn 30 ngày trừ huỷ, mọi nguồn** — `page_id` của đơn không nói đơn từ bot hay sale; câu chú nói rõ khoảng KHÁC hai
  cột bot bên trái. Hoàn theo page tính trên đơn ĐÃ KẾT THÚC (như `tiLeGiao`), không trên tổng đơn.
- **Giả định ghi ngay tại code** (`boiCanhRong`): team có page mà cả khoảng không một đơn, dòng mới nhất trước khoảng ⇒ «bảng chưa được nạp
  tới» — không phân biệt được với «team thật sự 0 đơn» khi bảng còn được nạp. Câu không khẳng định «ảnh chụp».

## 5 · Thước

- P4 (LL17a) đỏ đúng dự kiến: mỗi lượt đọc giờ 3 câu ⇒ sửa số lượt 4/6/8 → 6/9/12, thêm `luong` · `theoPage` vào dạng trả.
- Q1 lượt đầu đỏ vì regex rút khuôn khỏi câu SQL sai (thước) — sửa; Q1 so khuôn BigQuery chạy bằng JS với `suyNguon` trên 11 mẫu (kể cả
  chữ số Ả Rập, khoảng trắng đầu, ba khúc).
- M3 lượt đầu đỏ vì đoán sai cách DOM giả ghép chữ («Page A 111») — thước.
- Đảo-vá **17/17 ĐỎ** (mỗi lượt một tiến trình): nhãn luồng đảo · khuôn bỏ neo · luồng đếm mọi đơn · theo page không lọc team · reader bỏ
  theoPage · bỏ nhánh ảnh chụp · max không lọc team · kho bỏ cờ · page 0 đơn thành hàng · Chốt không trừ huỷ · Hoàn mẫu số tổng đơn · ô
  luồng lấy 30 ngày · tab Khách lấy 7 ngày · luôn giấu «không suy được» · ô ảnh chụp nói «chưa nối» · BUY NOW tab Khách lấy số chụp ·
  trang bán hàng Tổng quan bỏ BigQuery.

## 6 · Kiểm (02/10, worktree `so-lieu-bq`)

- Tầng A Q1–Q4 **4/4** · Postgres B1–B3 **3/3** · màn M1–M5 **5/5** · cổng `ll17b.sh` **10/10** (lồng `ll17a.sh` → `ll15d.sh` → …) ·
  `npm test` **2.331 ca · 0 đỏ** (4 bỏ qua).

## 7 · Nợ

- **N-DON-THEO-LUONG-0** — ĐÓNG ở LL17b (chờ mở van).
- **N-DON-POS-THEO-PAGE** — ĐÓNG ở LL17b (chờ mở van).
- **N-SO-LIEU-CON-ANH-CHUP** — còn: ba thước Messenger (bản quét POS của lõi bot, không phải `don_hang`) · chi phí AI/đơn (Sổ AI cũ) ·
  rủi ro hoàn (⇒ LL17c) · phễu Messenger + tuổi «Tính trên đơn tới 28/08» của tab Khách.
- **N-MK-LOC-PAGE-CON** (đã có) — bảng Theo page cho marketer vẫn là mọi page của team.
