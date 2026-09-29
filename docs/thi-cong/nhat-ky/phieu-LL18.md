# Nhật ký phiếu LL18 — khung theo bản vẽ, vẽ sẵn ở máy chủ; nén; cache theo phiên bản (29/09/2026)

> CR-28-09c · làn 🟩 (giao diện; không đường tiền, không tin gửi khách) · base `43d0cbe` · commit `31212d9` · Đụng bộ não: không.
> Không có tệp PHIEU riêng: phiếu sinh từ lời người dùng ngay sau deploy sóng LL (29/09 ~07:00 prod):
> «test e2e 1 lượt xem còn lỗi ui nào k? Mình thấy load chậm và click menu để chuyển màn bị nhảy màn mất menu sau đó
> mới hiện lại. Giao diện cũng k giống bản artifact bạn gửi cho mình».

## Đo trước khi code

- **Mạng người dùng → prod** (máy dev, cùng mạng người dùng): ping RTT ~320 ms, 0% mất gói; tải thật 2–54 KB/s, dao động
  mạnh. `kieu.css` **104 KB không nén** (1,9–11,3 s/lượt), `dieu-huong.js` 27 KB (1,1–11,9 s); cả ba tệp chung
  `Cache-Control: no-cache` ⇒ mỗi lần bấm menu hỏi lại từng tệp.
- **Cơ chế menu**: `dieu-huong.js` nằm CUỐI `<body>`; chạy xong mới `fetch('/api/dieu-huong')`, về rồi mới dựng thanh bên
  240px + thanh trên, rồi `body.style.paddingLeft = 240px`. Mỗi lần bấm menu = tải lại cả trang ⇒ trang hiện TRẦN tới khi
  lượt hỏi về. `kieu.css` và phông chữ cũng do JS chèn ⇒ nháy kiểu.
- **Bản vẽ** (artifact «AI Closer — làm lại từ đầu», 12 bảng): thanh NGANG 56px — logo «AC» · team · năm đích (gạch
  chân teal) · tài khoản; dải «Trong mục X» 44px; nền kem #F6F5F1, vạch #E4E1D8, màu chính #0B6E75, thẻ bo 12, nút 8,
  huy hiệu tròn. App chạy: thanh bên TỐI 240px, nền xám lạnh, bo 4.
- **E2E lượt 1** (sandbox Postgres + `v3/chay-that.js` THẬT + Chromium qua DevTools, ba vai, bò mọi mục menu; lượt 2
  giả lập mạng RTT 320 ms · 30 KB/s, bấm menu thật, chụp liền 150 ms): menu tới ~1.150 ms, lần vẽ đầu ~750 ms ⇒ ~0,4 s
  trang trần (ảnh `cham-1-02/03`: không menu, chữ hệ thống, rồi menu chèn vào đẩy trang sang phải). CLS 0,1–0,57 ở
  17/19 màn. Lỗi thật: marketer mở `/` ⇒ `/dieu-phoi` **403** (`chay-that.js`/`xem-thu.js` đổi hướng CỨNG — luồng đăng
  nhập đã theo vai từ 22/09 nhưng địa chỉ gốc thì không); trang 403 in thô «sale</b> và <b>quan-tri» (`escHtml` bọc cả
  chuỗi đã nối thẻ).

## Làm gì — và chọn gì thay gì (luật 13)

1. **Khung vẽ ở MÁY CHỦ** — `chung/khung.js` (hàm thuần, không import: một nguồn markup, máy chủ gọi để vẽ, trình duyệt
   nạp làm đường lùi) + `chung/khung-may-chu.js` (lớp Express bọc `res.sendFile`: trang HTML của UI được chèn khung ngay
   sau `<body>`, tab cụm vào cuối `body > header` của trang). Chọn bọc `sendFile` ở MỘT lớp thay vì sửa ~30 router: mọi
   trang đi qua một cửa; trang không qua cửa ấy vẫn có đường lùi (JS tự dựng từ cùng `khung.js`).
   Giá: HTML nay mang tên người + team ⇒ `Cache-Control: private, no-cache` (ETag vẫn cho 304).
2. **Cache theo phiên bản** — `?v=<sha1 12 ký tự>` băm từ nội dung CẢ BỐN tệp (kieu.css · ui.js · dieu-huong.js ·
   khung.js), máy chủ chèn vào HTML. Đúng mã ⇒ `max-age=31536000, immutable`; không/sai mã ⇒ `no-cache` như cũ. Giữ lời
   hứa của HK9 (hai tệp không bao giờ lệch bản — đổi một tệp là đổi URL cả bốn) mà bỏ được lượt hỏi lại.
3. **Nén gzip** trong cùng lớp: bọc `res.send` — thân chữ ≥ 1 KB (HTML · CSS · JS · JSON). Không thêm gói npm (`compression`
   kéo 7 gói phụ; tự làm ~15 dòng với `zlib`). Giá: `gzipSync` chạy trên luồng chính — thân lớn nhất ~100 KB, <2 ms.
4. **Phông chữ không chặn vẽ**: `<link media="print" onload="this.media='all'">` chèn ở máy chủ; biểu tượng tab nội tuyến
   (hết 404 `/favicon.ico`).
5. **Khung theo bản vẽ** — thanh ngang năm đích + «Trong mục X»; luật hàng 2 (MỘT chỗ, `khung.js#hangHai`): đích có một
   dòng hiện và dòng ấy đầu một cụm (Số liệu · Cài đặt) ⇒ hàng 2 là tab cụm và KHÔNG vẽ lại trong trang; đích ≥ 2 dòng
   (Hộp thư · Page) ⇒ hàng 2 là các dòng, cụm của dòng đang đứng thành tab trong trang (tầng 3). Bỏ thanh bên + đường dẫn
   vị trí (bản vẽ không có; hàng 1 + hàng 2 đã nói «đang ở đâu»). CSS khung chuyển vào `kieu.css` (cùng tệp token ⇒ khung và
   màu về cùng lượt). Token màu/bo góc theo bản vẽ; bỏ bộ token thanh bên tối (`--side-*`, `--toi`, `--tren-toi*` — grep:
   không ai khác gọi). `--content-max` 1360 → 1440, lề 32px (thẳng hàng thanh trên như bản vẽ).
6. **`/` theo vai** ở `vai-b.js` (cùng hàm đích với luồng đăng nhập); chưa đăng nhập ⇒ `/dang-nhap`. Bỏ hai dòng đổi hướng
   cứng ở `chay-that.js` · `xem-thu.js`.
7. **Trang 403 của điều phối**: `VAI_VAO_DUOC.map(escHtml).join('</b> và <b>')`.
8. **Ngõ cụt 403** (e2e lượt 2 thấy): 23 trang «cần vai …» trỏ «← Về bảng điều phối» `/dieu-phoi` — với marketer đó là 403
   lần hai. Đổi thành «← Về màn đầu của bạn» `/` (đích theo vai).
9. **Liên kết trong trang sang màn vai này không mở được** (e2e lượt 2–4: «Mở màn Model AI» ở Cài đặt team, 7 liên kết
   «Hệ còn sống» → Vận hành, «Chi phí từng tin», thẻ «Page bot KHÔNG bật được» → `/san-sang` → `/page-bot`): cửa
   `GET /api/dieu-huong/cam?d=…` — trang gửi các đường nó ĐANG HIỆN, máy chủ trả đường nào là MÀN có thật mà vai này không
   vào được. Chỉ trả lời về đường đã hỏi ⇒ không lộ thêm tên màn (giữ luật «lọc ở máy chủ»); đường không phải màn
   (`/chon-team`, `/viec/7`) không bao giờ bị tắt. `dieu-huong.js` gỡ `href`, gắn `aria-disabled` + lời «nhờ quản trị»,
   canh cả nội dung vẽ sau (MutationObserver gom 400 ms). Chọn cửa chung thay vì sửa từng màn: nhiều liên kết do DỮ LIỆU
   vẽ (thẻ việc, bước cài đặt) — sửa từng màn là hẹn ngày một màn quên. Đường chỉ còn chuyển hướng: bảng
   `man-hinh.js#CHUYEN_HUONG` (`/san-sang` → `/page-bot`), quyền xét theo ĐÍCH; lệnh chuyển hướng của `/san-sang` cũng
   theo vai (không mở được danh sách page ⇒ `/`).

## Lỗi của chính lượt này, bắt bằng e2e (ghi để người sau biết cổng nào bắt được gì)

- `<body data-khung="2">` (khai số hàng) TRÙNG dấu `[data-khung]` của khối khung ⇒ `:not([data-khung] a)` loại MỌI liên
  kết trong trang: cửa tắt liên kết chạy mà không soi gì. Bộ ca HTTP xanh (chỉ đo máy chủ), e2e lượt 3 thấy marketer vẫn
  vào 5 màn 403. Đổi thành `data-khung-hang`; K9 nay đòi ĐÚNG MỘT phần tử mang `data-khung` (đột biến M18).
- `/san-sang` không nằm trong sổ màn (màn «ngoài menu») ⇒ cửa kiểm coi là «không phải màn», cho qua. Xét theo đích TRƯỚC.
- Thước của tôi sai một lần (K1 đòi «Đề xuất chờ duyệt» là tab cụm — nó khai `an`, không `trongCum`, từ LL3).

## Bộ ca

- `v3/test/b/ll18-khung.test.mjs` K1–K12 (hàm thuần + HTTP thật qua `dungPhanB`, CSDL giả, ba người ba vai; đọc byte
  THÔ trên dây để thấy gzip): khung theo vai · hàng 2 · tab cụm không lặp · sale không thấy đường quản trị · thoát ký tự ·
  lối ra mọi vai · chèn đúng chỗ · mã phiên bản · phông không chặn vẽ · `/` theo vai · 403 in thẻ đúng · cache theo mã (4
  tệp × 3 trường hợp) · JSON ≥1 KB nén, nhỏ hơn không · cửa liên kết cấm (không lộ, không chặn nhầm, chuyển hướng theo
  đích) · 23 trang 403 thôi ngõ cụt.
- Thước sửa theo luật mới (án lệ #27): HK9 (cache dài CHỈ bằng mã băm chung — thay «cấm max-age»), HK14 (ui.js cùng
  luật), ⑥a ⑥b (thanh ngang; `timChoDung` chạy từ `khung.js`), C5 LL3 (chạy `veTabCum` thay soi chuỗi).

## Đảo-vá — 20/20 ĐỎ (mỗi đột biến một tiến trình mới, khôi phục, mã băm khớp)

M1 đích mất aria-current → K1 K3 K4 · M2 khung chèn cuối body → K6 K9 · M3 cache dài bất kể mã → K10 · M4 mã chỉ băm
kieu.css → HK9 · M5 tắt nén → K9 K10 · M6 `/` cứng /dieu-phoi → K7 K12 · M7 403 thoát ký tự hai lần → K8 · M8 bỏ chèn tab
cụm → K6 K9 · M9 bỏ `private` → K9 · M10 bỏ luật «một cụm ⇒ hàng 2» → K2 · M11 tab cụm vẽ lặp → K2 · M12 không thoát
ký tự tên → K5 · M13 máy chủ vẽ menu quản trị cho mọi vai → K9 · M14 phông chặn vẽ → K6 · M15 cửa kiểm trả nguyên danh
sách → K11 · M16 cửa kiểm quên vai → K11 · M17 403 Model trỏ lại /dieu-phoi → K12 · M18 body mang lại dấu `data-khung`
→ K6 K9 · M19 cửa kiểm quên bảng chuyển hướng → K11 · M20 `/san-sang` chuyển hướng cứng → K11.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll18.sh`: **ĐỎ 0 / XANH 9** (bộ ca 12/12 · bốn thước · khung thật theo ba vai · 0 trang 403 trỏ `/dieu-phoi` · ll1 · ll3).
- `npm test` (dev 29/09): **2.282 ca · 2.278 đạt · 0 đỏ · 4 bỏ qua** (có từ trước).
- **E2E trước / sau** (dev 29/09, sandbox, cùng kịch bản, Chromium, mạng giả lập RTT 320 ms · 30 KB/s; năm lượt — số «sau» là lượt 5,
  bò MỌI liên kết trong trang của ba vai, 47 màn, 0 lỗi JS, 0 request hỏng ngoài hai 502 chỉ-sandbox):

| Đo | Trước (`b41261e`+LL) | Sau |
|---|---|---|
| Menu có mặt | ~1.150 ms — SAU lần vẽ đầu (~750 ms) | ~400 ms — CÓ TRONG lần vẽ đầu (~420 ms) |
| Lần vẽ đầu | ~750 ms | ~420 ms |
| Màn có menu tới sau lần vẽ đầu | 5/5 | 0/5 (và 0/47 màn khi bò đủ ba vai) |
| CLS Hộp thư | 0,166 | 0,000 |
| Marketer vào `/` | 403 | màn đầu của marketer |
| Liên kết dẫn vào 403 (marketer, bò mọi liên kết trong trang) | 8 | **0** · đã tắt 13 liên kết |

## Chưa làm / để sau (→ §9)

- CLS > 0,1 còn ở 11/34 màn quản trị — do DỮ LIỆU của từng màn về sau lần vẽ đầu (bảng/khối đẩy nhau), không do khung.
  Nhà: từng màn giữ chỗ (skeleton) — phiếu giao diện sau.
- Tệp JS riêng của từng màn (`/hop-thu/hop-thu-ui.js`…) vẫn `no-cache` (đã nén, 304 khi không đổi) — một lượt hỏi/tệp.
- Trang «cần vai …» chưa có khung (in bằng HTML riêng của từng router, nền giữa màn) và còn ghi «Quản lý» (vai đã thôi
  cấp) — dọn cùng LL9.
- 502 `/api/bao-cao` · `/api/chi-phi` CHỈ ở sandbox (không có tiến trình bot cũ ở 3100); prod có.
- Chưa deploy.
