# CR-28-09b · MỘT NGUỒN CHO SẢN PHẨM · GIÁ · ẢNH · KỊCH BẢN

> Trạng thái: **ÁP — phương án B, «lưu là chạy» một bước** (người quyết gõ «áp b. gộp 1 bước», 28/09).
> Yêu cầu: người quyết, 28/09/2026 — *«mong muốn quy về 1 chỗ. Tức user sửa như nào thì hệ
> thống thực sự chạy như thế. Tuân thủ rule đúng như vậy.»*

## 1 · Câu đổi

**Từ** ba nguồn song song cho dữ liệu bot bán hàng — Google Sheet (bot đồng bộ 5 phút/lần) ·
`kb-overrides.json` của tiến trình bot v1 (đè trọn Sheet cho 77 page, giữ 543 ảnh) · bảng v3
`san_pham`/`goi_gia`/`kich_ban` (UI v3 ghi vào) —
**sang** MỘT nguồn: **CSDL v3, sửa qua UI v3**. Bot đọc đúng thứ UI ghi; không nơi nào khác
người sửa được mà bot nghe theo,
**vì** hôm nay sửa giá ở tab sản phẩm của UI v3 thì bot v1 KHÔNG đổi (nó đọc
`kb-overrides.json`), sửa Sheet cho 77 page cũng KHÔNG đổi (lớp đè thắng), và ảnh không có chỗ
nào sửa được — màn hình nói một đằng, bot chạy một nẻo.

**Luật mới (một câu, để thước canh):** *Mọi thứ bot dùng để chào bán — sản phẩm, bậc giá, ảnh,
kịch bản — có đúng MỘT chỗ ghi là CSDL v3; mỗi lượt lưu trên UI hoặc có hiệu lực với bot, hoặc
báo lỗi rõ ràng — không bao giờ «lưu xong» mà bot vẫn chạy bản cũ.*

**Phạm vi âm — CR này KHÔNG đụng:** câu chữ bot nói / luật prompt (sóng BH) · đơn hàng, POS tạo
đơn · công tắc bật/tắt bot · bàn hội thoại (UI-HT) · kéo danh mục POS (vẫn là đường VÀO của
`san_pham`, chỉ thôi không phải đường duy nhất) · nhãn chủ đề cho ảnh («chọn ảnh đúng lúc» là
việc riêng, §4).

## 2 · Tác động năm lớp

Lệnh đã chạy: `grep -nEi "sheet|kb-overrides|san_pham|POS|ảnh" docs/v3/01-QUYET-DINH.md` ·
`grep -nEi "kb-overrides|Google Sheet|san_pham|V3_RAP_PROMPT" SO-DIEU-HANH-THI-CONG.md` ·
`grep -rlnEi "kb-overrides|Google Sheet|san_pham|goi_gia" docs/v3/ban-giao v3/docs/spec` ·
`grep -rnE "from './kb.js'|productImages" src` · `grep -rnEi "anh|image" db/migrate/*.sql`.

| Lớp | Chỗ nào | Phải làm gì | Ai | Ước |
|---|---|---|---|---|
| 1 Ý đồ | `01-QUYET-DINH.md:148,186` — «Dữ liệu sản phẩm đồng bộ từ POS · team tự thêm qua giao diện» | Không trái — CR này là thực hiện đúng dòng 186. Thêm một dòng luật «một nguồn» + trỏ CR | Tổng | S |
| 1 Ý đồ | `01-QUYET-DINH.md:250` «tên trống, chỉ có giá và ảnh — lấy tên từ POS» | Giữ. Ảnh nay có nhà trong v3 | Tổng | — |
| 2 Điều hành | Sổ :1369 — nợ L0-M1 «`products` của kb-overrides (giá+ảnh) CHƯA nạp, L1-M1 quyết backfill» | Nợ này ĐƯỢC TRẢ bởi phiếu MN2 | Tổng | — |
| 2 Điều hành | Sổ :1198 🔴 N-C5 — `rap-prompt.js:122` tra `san_pham.page_id` (NULL mọi dòng) ⇒ bật `V3_RAP_PROMPT_BAT` là mọi page `noData` | Chặn **phương án A**; không chặn phương án B | — | — |
| 2 Điều hành | Phiếu đang mở: BH2–BH6 (🎫, chạm `prompts.js` `tools.js`) · UI-HT1..4 | BH3/BH6 cùng chạm `tools.js` ⇒ phương án A phải xếp SAU BH6 hoặc gộp khai «Đụng bộ não». Phương án B không chạm bộ não | Tổng | — |
| 3 Hợp đồng | `ban-giao/luoc-do-v1.md` (bảng `san_pham`/`goi_gia`, không có ảnh) · `tang-truy-van-v1.md` · `02-KE-HOACH-CODE.md` (nguồn `san_pham` = POS) · `bien-moi-truong-v3.md` | Thêm bảng ảnh; sửa dòng «nguồn = POS» thành «POS kéo vào + người sửa trên UI; một chỗ ghi» | Thợ | S |
| 4 Máy · bot | `src/kb.js` — `syncFromSheet` 5 phút/lần (`src/server.js:20-21`) + `applyOverrides` đè trọn | Sheet thôi là nguồn: tắt đồng bộ Sheet sau khi đã nạp hết vào v3 | Thợ | M |
| 4 Máy · bot | `src/tools.js:201` `send_product_image` ← `productImages()` của `kb.js` (**bộ não**) | A: đổi sang đọc v3 (khai «Đụng bộ não»). B: không đụng | Thợ | M |
| 4 Máy · v3 | `v3/src/ui/van-hanh` `POST /api/van-hanh/products/:id` — chỉ ghi `san_pham`/`goi_gia` | Sau khi ghi CSDL phải đẩy sang bot (B) — giống đúng cách «Đưa kịch bản lên LIVE» đang làm; đẩy hỏng ⇒ báo lỗi, không im | Thợ | M |
| 4 Máy · v3 | Màn «Sản phẩm & kho», «Ảnh gửi khách» đọc bot v1 (`cau-bot-v1.js#danhSachPageKemSanPham`) | Đổi sang đọc CSDL v3 — cùng bộ đọc với tab sửa | Thợ | M |
| 4 Máy · v3 | Chưa có chỗ tải/xoá/xếp ảnh trong UI v3 | Dựng CRUD ảnh trên tab «Sản phẩm & giá» | Thợ | M |
| 4 Thước | `test/kb-overrides-bo-nho.test.mjs` · `dieu-huong.test.mjs` (đếm màn ẩn) · ca van-hanh products | Thêm ca «lưu trên UI ⇒ bot đọc ra đúng giá trị mới» (đầu-cuối); đảo-vá: bỏ bước đẩy ⇒ đỏ | Thợ | M |
| 5 Dữ liệu | `db/migrate` 001: `san_pham` **không có cột ảnh**, không bảng ảnh nào | Migration 025 `anh_san_pham` (url tệp nội bộ, nhãn, thứ tự, gắn `san_pham_goc`) | Thợ | S |
| 5 Dữ liệu | Prod: 77 page · 543 ảnh trong `kb-overrides.json`, **chỉ 52 tệp** ở `public/uploads/` ⇒ ~490 link ngoài (có thể CDN hết hạn) | Nạp một lượt vào v3; ảnh link ngoài **tải về máy mình**; link chết ⇒ liệt kê cho marketer, không bịa | Thợ + người | M |
| 5 Dữ liệu | Page chỉ có trong Sheet (chưa bị đè) — **chưa đo** | Đếm rồi nạp cùng lượt | Thợ | S |
| 5 Dữ liệu | Khớp page → `san_pham` v3: qua `page.san_pham_goc_ma` — **chưa đo** bao nhiêu page trong 77 đã có mã gốc | Page không khớp ⇒ danh sách cho người gán, không tự đoán | Người | ? |

**Tin tốt đã đo (sổ :2322):** `kb-overrides.json` và dashboard cũ **không ai ghi từ 28/08** và
cổng 3100 đã đóng với bên ngoài ⇒ dữ liệu trong đó đứng yên, nạp một lượt là đủ, không phải
hoà giải hai bên đang cùng sửa.

## 3 · Giá phải trả

- **Hai phương án — người quyết chọn một:**
  - **B (đề nghị làm trước) — v3 là nguồn, bot là bản chép máy sinh ra.** Mỗi lượt lưu trên UI
    v3 ghi CSDL rồi đẩy sang bot (`POST /admin/kb/:pageId` đã có) — y như kịch bản LIVE đang
    làm. `kb-overrides.json` còn đó nhưng **chỉ máy ghi**, không người nào. Không chạm bộ não,
    không chờ N-C5. Rủi ro: hai bản cùng tồn tại — nên đẩy hỏng phải chặn lượt lưu và kèm một
    phép đo lệch định kỳ (CSDL vs bot) báo đỏ.
  - **A (đích cuối) — bot đọc thẳng CSDL v3** (`V3_RAP_PROMPT_BAT=1` + `send_product_image` đọc
    bảng ảnh). Chỉ còn một bản thật. Đắt hơn: vá N-C5 trước, sửa `tools.js` (bộ não — **xin
    người quyết tường minh**), xếp sau BH3/BH6.
- **Mất đi:** sửa Google Sheet không còn tác dụng — ai quen sửa Sheet phải chuyển sang UI.
- **Rủi ro:** lượt nạp ảnh link ngoài có thể lộ ra nhiều ảnh đã chết — tức bot **hôm nay** đang
  gửi ảnh hỏng mà không ai biết. Đây là phát hiện, không phải thiệt hại do CR.

## 4 · Không làm ngay ⇒ §9 SỔ NỢ

- Nhãn chủ đề cho ảnh + «chọn ảnh đúng lúc» (`thu-vien-anh/kho-anh.js` đầu tệp).
- Tồn kho thật từ POS vào `het_hang`.
- Phương án A nếu người quyết chọn B trước.

## 5 · Phiếu cần đẻ (phương án B)

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| MN1 | Migration 025 `anh_san_pham` + tầng A đọc/ghi + hợp đồng lược đồ | 🟨 | — |
| MN2 | Lượt nạp một lần: Sheet + `kb-overrides.json` → `san_pham`/`goi_gia`/`anh_san_pham`; tải ảnh link ngoài về; báo cáo page không khớp & link chết. Chạy thử trên dev, in số trước/sau | 🟥 | MN1 |
| MN3 | Cửa ghi v3 đẩy sang bot sau mỗi lượt lưu (sản phẩm · giá · ảnh); đẩy hỏng ⇒ lượt lưu báo lỗi. Ca đầu-cuối + đảo-vá | 🟥 | MN1 |
| MN4 | UI: CRUD ảnh trên tab «Sản phẩm & giá»; «Sản phẩm & kho» + «Ảnh gửi khách» đọc CSDL v3 | 🟨 | MN1 · MN3 |
| MN5 | Tắt `syncFromSheet` trên prod + phép đo lệch CSDL↔bot định kỳ. **Mở van — cần người gật** | 🟥 | MN2 · MN3 · MN4 |

## 5b · Bổ sung 28/09 — MỘT MÀN cho «page này trả lời thế nào»

Người quyết (test thật qua UI): *«enduser chỉ quan tâm page này trả lời như nào, tư vấn dựa vào
đâu… một kịch bản chuẩn gồm prompt rule, sản phẩm, bảng giá… cấu hình A ở màn này, cấu hình B
bị chuyển sang màn khác → không biết trước đó đang ở đâu, bị miss.»*

Đo hôm nay — thứ bot dùng để trả lời MỘT page rải trên bảy chỗ:

| Thành phần | Hiện ở đâu | Sửa được tại trang page? |
|---|---|---|
| Kịch bản riêng (8 ô) | tab «Kịch bản» | nháp được; **đưa lên chạy phải sang `/kich-ban`** |
| Sản phẩm · bậc giá | tab «Sản phẩm & giá» | được — nhưng **bot v1 không đọc** (mục 1) |
| Bốn ô giá nâng cao (giá gốc · KM · phí ship · miễn ship) | màn «Hội thoại và đơn» | không |
| Ảnh | `/thu-vien-anh` (ẩn khỏi menu, chỉ đọc) | không |
| Quy tắc chung | `/bo-luat` | không (đúng — sửa là đổi mọi page) |
| Kỹ năng theo sản phẩm · Câu trả lời sẵn | `/ky-nang` · `/lop-0` | không |
| Đoạn chữ thật gửi AI | `/prompt-page?page=` | chỉ đọc |

Phiếu thêm:

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| MN6 | Trang một page thành **màn kịch bản đầy đủ**: các khối xếp đúng thứ tự AI nhận (quy tắc chung → kịch bản page → sản phẩm · giá đủ tám cột · ảnh → kỹ năng · câu trả lời sẵn) · khối nào sửa được thì sửa tại chỗ · khối dùng chung cả team hiện chỉ đọc kèm nhãn «sửa ở đây là đổi mọi page» · một ô **xem trước đoạn chữ gửi AI** ngay cuối · nút đưa lên chạy ngay tại màn cho vai duyệt. Các màn lẻ (`/kich-ban`, `/thu-vien-anh`, `/prompt-page`) còn đường dẫn, ra khỏi lối đi chính | 🟨 | MN3 · MN4 |

Câu hỏi cho người quyết (chặn MN6): tách **soạn** (marketer) và **đưa lên chạy** (người duyệt)
đang là luật đã ký (`kho-kich-ban.js` `VAI_DUYET_DUOC`). Giữ hai bước trên cùng một màn, hay gộp?

**Trả lời 28/09: GỘP MỘT BƯỚC — lưu là chạy.** Đo lại khi áp: đây KHÔNG phải đổi quyết định —
`01-QUYET-DINH.md` §9 đã ký sẵn *«Kịch bản do người viết thì áp dụng thẳng, không cần duyệt»*;
bước duyệt là code trôi khỏi dòng đó. Vai «Người duyệt kịch bản» còn nguyên cho **đề xuất của
AI** (§9 dòng kế). Lịch sử bản giữ nguyên để lùi.

## 5c · Phát hiện khi áp — cửa tiền lúc tạo đơn đọc bảng KHÁC bảng bot báo giá

`src/orders/hang-cho.js#cua2Tien` so tổng đơn với `goi_gia` của v3 (qua
`src/products/catalog.js#docSanPhamGoiGia`), còn bot báo giá cho khách theo `kb-overrides.json`
(`src/kb.js`). Hai bảng lệch ⇒ đơn đúng giá bot vừa báo vẫn bị chặn (hoặc ngược lại). Phương án
B chữa luôn chỗ này: bot nhận bản chép sinh từ chính `goi_gia`.

## 6 · Đường lùi

- MN1–MN4 chỉ THÊM (bảng mới, cửa đẩy mới); lùi = `025 down` + revert commit.
- Trước MN2/MN5: chụp `kb-overrides.json` + `sheet.json` trên prod (`cp … .bak-2809`). Lùi MN5
  = bật lại `syncFromSheet` + chép lại bản chụp, khởi động lại bot (~40s nạp page).
