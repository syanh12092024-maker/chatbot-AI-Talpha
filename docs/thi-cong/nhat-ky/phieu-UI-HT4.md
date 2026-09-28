# NHẬT KÝ PHIẾU UI-HT4 — sửa thước theo §10 mới (28/09/2026)

Phiếu: `docs/thi-cong/phieu/PHIEU-UI-HT2-4.md` §UI-HT4 · CR-28-09 · làn 🟩. Đề bài: «Spec L4-M1 (đã trỏ CR),
bộ ca dispatch, HK10 (tên màn trong menu), thước "không có ô soạn tin" (`<textarea>`/nút gửi) phải phủ cả màn mới.»

## Đo lại nguyên liệu TRƯỚC khi sửa (máy dev, cây chung)

| Đo | Kết quả | Hệ quả |
|---|---|---|
| Thước «không soạn tin» của bàn hội thoại | chỉ soi MỘT tệp HTML tìm `<textarea>` + chữ gửi (`ban-hoi-thoai-ds`, `ui-ht2.sh` ③) | Đường gửi mọc ở chỗ khác (cửa tiêm · `r.post` · import · `contenteditable` · `fetch` POST) vẫn xanh |
| Đồ thị import của module (bắc cầu) | 12 tệp, đều trong `ui/ban-hoi-thoai` · `ui/dispatch` · `ui/chung/http.js` · `auth/boi-canh.js`; thư viện ngoài: `express` `node:path` `node:url` | Làm được danh sách vùng cho phép — deny-by-default |
| Cửa tiêm `dat*` trong đồ thị | 14 cửa, đều là cửa ĐỌC / cái chắn / nhật ký | Khai thành danh sách; cửa mới phải khai có lý do |
| HK10 | đo 26 màn (có bàn hội thoại), **bỏ qua lặng 1** (`mot-page`, không `<h1>` tĩnh); ba nhánh `continue` = ba cách xanh vì không đo | Đột biến «bàn mất `<h1>`» SỐNG trên HK10 cũ (đo ở dưới) |
| Sale đăng nhập xong vào đâu | `vai-b.js#duongSauKhiVao` = màn đầu trên menu vai ⇒ `/ban-hoi-thoai`; ca `auth-router` dùng hàm đích TỰ DỰNG, không ca nào canh đích THẬT | Thứ tự menu đổi là sale đặt chân sai chỗ mà không đỏ |
| Bộ ca điều phối | 6 tệp xanh; lời chú thích «hội thoại đầy đủ nằm ở Pancake (§10)» còn đúng một nửa — nay đọc được ở bàn | Chỉ sửa lời, giữ khẳng định (màn chi tiết không dựng chat từ `so_ai`) |
| Tài liệu còn chép luật cũ | spec L4-M1 (thân bài) · `06-PROMPT-GIAO-VIEC.md` · `SO-TAY-VAI-B.md:251` · `04-TIEN-DO.md` (thiếu dòng) · `thiet-ke/HienTrang.dc.html` | Sửa bốn cái đầu; cái cuối là ảnh chụp thiết kế cũ — lịch sử, không sửa |

## Làm gì

- **`v3/test/b/ban-hoi-thoai-khong-gui.test.mjs` (mới, trong BỘ CA — án lệ 34):**
  T1 đồ thị import (kể cả `import()` động) chỉ trong vùng cho phép · T2 cửa tiêm = danh sách đã khai ·
  T3 mọi đường `/ban-hoi-thoai*` chỉ GET (đọc stack của CẢ HAI router) + POST/PUT/PATCH/DELETE → 404 qua HTTP ·
  T4 trang: không `textarea`/`contenteditable`, ô nhập duy nhất là ô tìm, form duy nhất là form tìm, script
  ngoài đúng ba tệp, không `method:`, mọi URL API là đường đọc · T5 khối đóng việc dùng chung: một `fetch`, mọi
  đường dưới `/api/dieu-phoi/` · T6 **hành vi**: bẫy `globalThis.fetch`, token giả qua cửa kho CSDL, `pkDocTin`
  chỉ gọi GET.
- **HK10 siết:** màn §10 (`ban-hoi-thoai`, `dispatch`) PHẢI nằm trong số được đo; màn mới lọt nhánh bỏ qua là
  đỏ (`mot-page` khai sẵn — cho phép bớt, không cho thêm, để phiên đang sửa `mot-page` không đỏ oan khi họ
  thêm `<h1>`); số màn được đo ≥20.
- **`vai-b-noi-day`:** đăng nhập thật qua dây nối thật ⇒ `diTiep === '/ban-hoi-thoai'` và `/api/ban-hoi-thoai`
  mở được cho sale.
- **Bộ ca điều phối:** sửa lời ở `dispatch-chi-tiet` · `dispatch-dong-viec` · `dispatch-kho-viec` cho khớp §10 mới;
  không đổi khẳng định nào.
- **Hợp đồng:** spec L4-M1 thêm **§7 «Bàn hội thoại — hợp đồng HIỆN HÀNH»** (bốn đường · tám luật, mỗi luật chỉ
  tên thước canh nó) và đánh dấu ba đoạn thành lịch sử; `06-PROMPT-GIAO-VIEC.md` trỏ CR; `SO-TAY-VAI-B.md` sửa
  câu trích; `04-TIEN-DO.md` thêm dòng UI-HT1–4.
- **Cổng** `ops/bin/nghiem-thu/ui-ht4.sh` — chạy lại cả ba cổng trước của sóng (thước UI-HT1 từng đỏ oan mà
  không ai chạy lại).

## Quyết định lệch phiếu (luật 13)

1. Phiếu nói «thước không có ô soạn tin (`<textarea>`/nút gửi)». Làm RỘNG hơn: canh ĐƯỜNG GỬI (import, cửa
   tiêm, phương thức HTTP, Pancake chỉ GET), không chỉ canh Ô SOẠN. Lý do: ô soạn không có đường gửi là vô hại;
   đường gửi không có ô soạn (một `fetch` POST, một cửa tiêm) mới là thứ phá §10. Giá: T2 đỏ mỗi khi thêm cửa
   ĐỌC mới — người thêm phải khai vào danh sách.
2. T4 là thước HÌNH DẠNG trên văn bản HTML (án lệ 30): chuỗi ghép kiểu `'<tex' + 'tarea'` lọt được. Chấp nhận vì
   lớp HÀNH VI nằm ở T3 (không đường ghi nào trên bàn) và T1/T2 (không đường tới chỗ gửi) — ô soạn lọt qua T4
   cũng không gửi được đi đâu.
3. Không sửa trang chi tiết việc («Hội thoại đầy đủ nằm ở Pancake» — vẫn đúng) và các đường lùi `'/dieu-phoi'`
   (`chay-that.js` `'/'`, `TRANG_MAC_DINH`): ngoài phạm vi «sửa thước», và `chay-that.js` đang được phiên song
   song sửa ⇒ nợ §9.

## Kiểm

- Bộ ca mới 6/6 · `he-kieu` · `vai-b-noi-day` · 4 bộ điều phối: 106/106 (lượt chạy riêng).
- `npm test` toàn repo **2.194 ca, 2.190 pass, 0 đỏ** (cây chung, gồm cả tệp đang dở của phiên song song).
- Cổng `ops/bin/nghiem-thu/ui-ht4.sh` **17/17** (kèm `ui-ht1` · `ui-ht2` · `ui-ht3` xanh).
- **Đảo-vá trong WORKTREE RIÊNG** (`git worktree` tại HEAD `e9a5a6f` + tệp ca mới chép sang; phiên song song đang
  sửa cây chung — án lệ 24), mỗi đột biến một tiến trình: gốc xanh; **16/16 đột biến đỏ** — import chỗ gửi ·
  `import()` động tới `lan-gui.js` · cửa tiêm `datGuiTin` · `r.post …/gui` · `r.all` · `textarea` ·
  `contenteditable` · `input type=text` · `fetch` POST trong trang · script ngoài mới · gọi API lạ · khối đóng việc
  gọi ra ngoài · khối đóng việc thêm `fetch` · `pkDocTin` gọi POST (đột biến ở `src/pancake.js`, chỉ trong
  worktree) · bàn mất `<h1>` · bàn xếp sau «Việc đang chờ» (sale đặt chân sai).
- **Bằng chứng HK10 cũ có lỗ:** đặt HK10 bản HEAD vào worktree + đổi `<h1>` bàn thành `<h2>` ⇒ `✔ HK10 … fail 0`
  (SỐNG). Bản siết ⇒ đỏ.
- Worktree đã gỡ; cây chung không bị đột biến chạm.

## Nợ (đề nghị ghi §9)

- Trang chi tiết việc chưa trỏ về bàn hội thoại cho việc loại hội thoại (hiện «Hội thoại đầy đủ nằm ở Pancake»).
- Đường lùi `'/dieu-phoi'` ở `v3/chay-that.js` (`app.get('/')`), `v3/src/ui/chung/http.js#TRANG_MAC_DINH`,
  `dang-nhap.html`/`chon-team.html` (khi máy chủ không trả `diTiep`) — chỉ chạm khi đích theo vai hỏng.
- `docs/v3/thiet-ke/HienTrang.dc.html` còn trích §10 cũ — ảnh chụp thiết kế 14/09, để nguyên làm lịch sử.
- HK10 vẫn không đo được `mot-page` (đầu trang động).
