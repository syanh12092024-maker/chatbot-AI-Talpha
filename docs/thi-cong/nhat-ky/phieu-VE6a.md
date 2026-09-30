# Nhật ký phiếu VE6a — Số liệu › Tổng quan theo bản vẽ 3a (30/09/2026)

> CR-28-09c · làn 🟩 (màn ĐỌC; 0 cửa mới, 0 cửa ghi) · base `2fd2474` · commit `1ecb8f9` · Đụng bộ não: không.

## Đo trước khi code (agent Explore + kiểm lại từng nguồn dùng tới)

- Bản vẽ 3a: chip Hôm nay/7/30 · lọc page/marketer · bốn ô số (chi phí AI/đơn · tin AI/đơn · đơn theo luồng · BUY NOW không gửi
  WhatsApp) · phễu Messenger 5 chặng · phễu trang bán hàng 5 chặng · bảng theo page (Page · Marketer · Đơn · Chốt · AI/đơn · Hoàn) ·
  khách theo rủi ro hoàn 4 tầng. Nhiều ô bản vẽ để `[N]` — chính bản vẽ chưa có số.
- Màn hiện có (`/bao-cao`, «Đơn và tỉ lệ chốt»): ba thước Messenger (dọc) · luồng trang · bảng theo page — và HỎNG từ 25/09 (`T`
  chưa khai; vá ở VE-VA1, đã lên prod).
- Nguồn: `/api/bao-cao` (ba thước · `haiLuong` 7 ngày từ CSDL, khoảng MỞ `{tu, den:null}` · page) · `/api/chi-phi` (tong + page, sổ
  bot cũ, «toàn thời gian») · `/api/nguon-khach` (`choRoi`: WhatsApp chưa chạy ⇒ `doDuoc=false`, 37,4% = số tài liệu cũ) ·
  `/api/rui-ro-hoan` (bốn tầng, CHỈ quản trị · quản lý). KHÔNG cửa nào nhận ngày / bộ lọc page · marketer. Chặng «Hội thoại mới ·
  Bot tư vấn · Sale duyệt · Giao thành công · Khách xác nhận · Chờ in · Sale gọi lại» và «Chốt · Hoàn theo page»: không có nguồn.

## Làm gì — chọn gì thay gì

1. KHÔNG vẽ chip khoảng và bộ lọc (chip không làm gì là nói dối); một dòng nói vì sao, mỗi số tự ghi khoảng của nó.
2. Bốn ô số (`metricRow`): chi phí AI/đơn (tong của team, «toàn thời gian · sổ bot cũ · % doanh thu: chưa có nguồn») · tin AI/đơn ·
   đơn theo luồng «Messenger · trang» ĐỨNG RIÊNG (không tổng) + khoảng · BUY NOW: «—» + «chưa đo được · 37,4% là số cũ».
3. Hai phễu (`.pheu`): chặng có nguồn mang số (Bot chốt đơn = sổ đếm của bot · Bấm BUY NOW = đơn trang trong khoảng), chặng không
   có nói «chưa có nguồn». KHÔNG tỉ lệ rơi (luật ②a của Nguồn khách: số khác nguồn, khác khoảng).
4. Ba thước Messenger GIỮ, đứng DỌC dưới phễu, tiêu đề «đo ba thứ khác nhau, KHÔNG cộng».
5. Bảng theo page ghép «AI / đơn» (cùng cửa `/api/chi-phi`, theo `pageId`), gồm page TỐN TIỀN mà 0 đơn (nhãn «Tốn tiền, 0 đơn»);
   xếp đắt nhất lên đầu khi đo được; cột Chốt · Hoàn giữ đúng bản vẽ, ô «—», chú thích nói chưa có nguồn theo page.
6. Rủi ro hoàn: hỏi `/api/dieu-huong` (menu tính từ CÙNG hằng vai của màn Rủi ro hoàn) trước — marketer KHÔNG gọi cửa, KHÔNG thấy khối;
   bốn tầng bản vẽ (tốt + bình thường gộp một ô) + giờ chấm + lối «Xem đủ →».
7. Mỗi khối phụ đọc cửa riêng, tự nói lỗi (`thu()`): sổ chi phí hỏng ⇒ ô số «chưa đọc được», bảng xếp theo đơn POS — khối chính đứng.

## Thước

- `bao-cao.test.mjs` ①c: thước cũ cấm chữ `metric-row` TRÊN CẢ TRANG — rộng hơn luật (chú thích của chính ca: «KHÔNG dùng
  `.metric-row` … cho CHÚNG»). Nay đo đúng phạm vi luật: ba thước không nằm trong hàng ngang; hàm vẽ hàng ô số không mang nhãn/trường
  của ba thước (đảo-vá M9 canh).
- Mới `v3/test/b/ve6a-tong-quan.test.mjs` V1–V6 (CHẠY THẬT script trang, payload `manBaoCao` thật). Lượt bấm thật bắt một lỗi của
  chính bản nháp: khoảng mở `den: null` (dạng THẬT) in «trong khoảng đo» ⇒ sửa + V6.
- `va1-ten-chua-khai.test.mjs`: DOM giả thêm `metricRow`, `fetch` giả trả theo ĐƯỜNG (cửa phụ lỗi ⇒ khối chính vẫn đứng).

## Đảo-vá — 11/11 đỏ

M1 cộng hai luồng · M2 37,4% mất nhãn số cũ · M3 phễu mọc tỉ lệ · M4 chặng không nguồn bịa 0 · M5 bảng xếp ngược · M6 marketer gọi
cửa rủi ro · M7 tốt + bình thường không gộp · M8 sổ chi phí hỏng kéo sập khối chính · M9 ba thước vào hàng ô số · M10 giấu page tốn
tiền 0 đơn · M11 khoảng mở in «trong khoảng đo».

## Đo

- Cổng `ops/bin/nghiem-thu/ve6a.sh`: ĐỎ 0 / XANH 8 (kèm va1.sh).
- `npm test` (dev, sandbox): **2.334 ca · 2.330 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
- Bấm thật (dev · app v3 trong tiến trình · sandbox · bộ đọc «bot cũ» GIẢ; hai luồng + rủi ro hoàn đọc CSDL THẬT): quản trị — ô số
  «8.900 đ · 67,8 · 3 · 5 (23/9/2026 – nay) · —», phễu Messenger «— · — · 90 · — · —», phễu trang «5 · — (WhatsApp chưa chạy) · — · — · —»,
  bảng xếp theo AI/đơn (8.467 đ · 6.350 đ · «Tốn tiền, 0 đơn»), bốn tầng rủi ro + giờ chấm · marketer — không khối rủi ro, không gọi cửa
  · lỗi JS 0 · request hỏng 0 (cả hai vai) · 390px tràn ngang 0.
- Bò toàn bộ (ba vai, 51 màn): lỗi JS 0 · khung lệch 0 · HTML thô 0 · request hỏng 6 = 4 cũ + 2 `/api/chi-phi` ở `/bao-cao` (màn nay gọi
  thêm cửa chi phí) — CÙNG nguyên nhân 502 sandbox (cầu sang bot cũ không chạy); trên prod bot cũ chạy.

## Chưa làm

- Chip khoảng + lọc page/marketer: cần cửa đọc nhận `tu/den/page/marketer` (máy chủ) — phiếu riêng.
- Chặng phễu thiếu nguồn (hội thoại mới · bot tư vấn · sale duyệt · giao thành công · xác nhận · chờ in · gọi lại) và Chốt · Hoàn
  theo page — cần đếm ở tầng dữ liệu (và dữ liệu đơn còn là lát 28/08: nợ N-KEODON).
