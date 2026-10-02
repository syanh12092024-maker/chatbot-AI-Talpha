# CR-02-10b · PAGE PHẢI GẮN SẢN PHẨM THÌ BOT MỚI CHAT

> Trạng thái: **ÁP trọn** — người quyết gõ *«áp trọn, bỏ giá riêng theo page»* (02/10). Hai điểm chờ
> chốt ở mục 3 đã rõ: **bỏ ghi đè giá theo page** (mất đi 1); **GSP4 giữ đúng điều kiện mục 5** — chạy
> khi bộ đếm «page còn đọc bản sao» = 0, hoặc khi người quyết nói tường minh chấp nhận phần còn lại
> thôi chat (người quyết chưa chọn sớm hơn ⇒ giữ mặc định). Sổ §5h · GSP1–GSP5.
> Yêu cầu: người quyết, 02/10/2026 — *«page bắt buộc gắn sản phẩm thì mới chat được»*. Cùng lượt,
> về hai màn «Thêm sản phẩm» và «Bản sao theo page»: *«2 màn này k dùng làm gì cả cho version mới?
> Nếu cần thì migrate theo ver mới thôi nhỉ? Ở SP thấy cái gộp món pos thành sp là đúng br»*.

## 1 · Câu đổi

**Từ** page có sản phẩm qua HAI đường (`src/products/catalog.js:7-13`):
(a) page khai sản phẩm gốc + shop POS ⇒ món POS của gốc ấy ở shop ấy;
(b) page chưa khai ⇒ **bản sao theo page** — 78 dòng `san_pham nguon='kb'` nạp một lượt từ
`kb-overrides.json` (MN2), mỗi dòng giữ bậc giá + ảnh riêng của một page.
Hôm nay **mọi** page có hàng đều đi đường (b) — 0/514 page đã gắn gốc (bảng 1).
Sản phẩm gốc sinh ra bằng HAI lối: gộp món POS theo SKU (màn «Gộp món POS», VE8a) và tạo tay theo
số hiệu (màn «Thêm sản phẩm», LL13).

**Sang** MỘT đường: **page phải gắn một sản phẩm gốc × một shop POS**; page chưa gắn thì bot
không có sản phẩm, không trả lời khách (bàn giao sale, đúng khuôn page thiếu KB) và không bật
được. Sản phẩm gốc chỉ sinh từ **gộp món POS theo SKU**; lối tạo theo số hiệu bỏ.

**Vì:**
1. Người quyết chốt 02/10.
2. «Một nguồn» (CR-28-09b) còn hở: giá + ảnh của page nằm ở bản sao riêng từng page, trong khi
   màn Sản phẩm sửa giá ở món POS × thị trường (VE8b) — vẫn là hai chỗ ghi cho cùng một sự thật.
3. Gốc tạo theo số hiệu không mang SKU, không marketer ⇒ món của shop kéo về sau không tự nối
   (lượt kéo nối SKU trước, `src/pos/doc-danh-muc.js:142-155`). Prod có đúng một ca như thế:
   «Diamond Halo set», tạo 29/09, `sku` NULL (bảng 12).
4. Bản sao mang mã `kb:<page>:SP01`, POS không biết mã đó (§9 N-MN8b); page gắn gốc thì sản phẩm
   là món POS thật `<shop>:<biến thể>`.

**Luật mới (một câu, để thước canh):** *Bot chỉ chào bán ở page đã gắn một sản phẩm gốc và một
shop POS, và chỉ chào món POS của gốc đó ở shop đó; page chưa gắn ⇒ không sản phẩm, không trả
lời, không bật được — ở MỌI đường đọc: chat (cả hai nguồn KB), cửa tiền, bản chép, cổng bật, màn.*

**Phạm vi âm — CR này KHÔNG đụng:** kịch bản / lời bot theo page (`kich_ban` giữ khoá page; 74
page đang có bản LIVE) · năm file bộ não (`prompts.js` `closer.js` `tools.js` `fast-lane.js`
`outbound-guard.js`) · luật gộp theo SKU (VE8a giữ nguyên) · công tắc bật/tắt · đơn đã tạo ·
**không XOÁ** dòng bản sao (`nguon='kb'`), ảnh hay bậc giá của chúng, không bỏ cột
`san_pham.page_id` — chỉ thôi đọc · `ai_sale` / pancake-tool của team khác.

## 2 · Tác động năm lớp

Lệnh đã chạy: `grep -n -i "kế thừa|san_pham_goc_ma|bản sao|một nguồn|noData" docs/v3/01-QUYET-DINH.md` ·
`grep -n "bản sao|page_id|LL13|MN8|pos_ma|N-C5|số hiệu" SO-DIEU-HANH-THI-CONG.md` + `ls docs/thi-cong/phieu/` ·
`grep -rn "san_pham.page_id|bản sao" docs/v3/ban-giao v3/docs/spec docs/v3/02-KE-HOACH-CODE.md docs/v3/03-MAN-HINH.md` ·
`grep -rn "docSanPhamGoiGia" src v3/src` · `grep -ln "catalog|docSanPhamGoiGia|s.page_id|Bản sao|veThem|soHieu" ops/bin/nghiem-thu/*.sh` ·
đảo thử bộ ca trên worktree tạm (dưới) · SQL chỉ-đọc trên prod (mục 5d).

| Lớp | Chỗ nào | Phải làm gì | Ai | Ước |
|---|---|---|---|---|
| 1 Ý đồ | `01-QUYET-DINH.md:219-221` §8 «Thêm thị trường = gắn đúng một món POS…, page kế thừa» | Không trái — CR làm chặt: kế thừa từ gốc × shop là đường DUY NHẤT. Thêm một dòng luật + trỏ CR | Tổng | S |
| 1 Ý đồ | `01-QUYET-DINH.md:227-234` «Một nguồn» | Ghi rõ: giá + ảnh của page = của món POS × shop; bản sao theo page thôi là chỗ ghi | Tổng | S |
| 2 Điều hành | Sổ §5 LL13 «nối 78 bản sao page» (:320) | Đổi đích: không nối bản sao vào món, mà chuyển page sang gốc (GSP2) | Tổng | S |
| 2 Điều hành | §9 N-MN8b (:1358) tạo đơn chưa dùng `pos_ma` | Trả bởi GSP4 — đơn từ page gắn gốc mang mã món POS thật; thợ xác nhận ở cửa tạo đơn | Thợ | — |
| 2 Điều hành | §9 N-MN8c (:1359) 75/79 SP chưa tên · N-DANHMUC-GOC (:1390) · RF-15 (:1508) gán `san_pham.page_id` khi shop có 1 page | N-MN8c mất ý nghĩa (tên theo món/gốc) · N-DANHMUC-GOC thành việc của GSP2 · RF-15 thôi cần (không shop nào của Pialpha GCC có đúng 1 page; 0/491 món POS có `page_id`) | Tổng | S |
| 2 Điều hành | Phiếu đang mở: BH3 · BH6 · BH8 (bộ não) · LL16 (kéo 6 shop) | Không phiếu nào cầm `catalog.js` · `ban-chep-bot.js` · `hang-cho.js` · `handler-v3.js` ⇒ không va. LL16: prod đã kéo đủ 7 shop của Pialpha GCC (bảng 7b) — sổ cần ghi lại | Tổng | S |
| 3 Hợp đồng | `03-MAN-HINH.md:13` Sản phẩm (VE1: «ô lưu ý… dẫn tới Bản sao theo page và số hiệu chờ đặt tên») | Bỏ ô lưu ý · «+ Thêm» = Gộp món POS | Thợ | S |
| 3 Hợp đồng | `03-MAN-HINH.md:14` Page — «SP & giá (kế thừa, ghi đè có chủ ý)» | → «kế thừa từ sản phẩm × thị trường, sửa ở Sản phẩm › Theo thị trường» (mục 3: mất ghi đè theo page) | Thợ | S |
| 3 Hợp đồng | `ban-giao/luoc-do-v1.md:94` «147 bản sao theo page phải gộp có người xác nhận» | Cập nhật số đo (78) + luật mới; khai `san_pham.page_id` «không còn ai đọc» | Thợ | S |
| 4 Máy | `src/products/catalog.js:7-13` — bộ đọc CHUNG | Bỏ nhánh `page_id`: `if (!maGoc \|\| !trang.pos_shop_id) return []`. Bộ này nằm trên: `rap-prompt.js:280` (chat khi `V3_RAP_PROMPT_BAT=1`) · `admin-v3/operations.js:54` (cổng bật) · **`orders/hang-cho.js:222` `cua2Tien` · `orders/legacy.js:49` · `van-hanh/don-cho.js:36,69` (ĐƯỜNG TIỀN)** · `ban-chep-bot.js:85` · `kho-san-pham-v3.js:48` | Thợ | M |
| 4 Máy | `v3/src/noi-day/kho-san-pham-v3.js:24-27` | `ELSE s.page_id = p.id` → page chưa gắn đếm 0 | Thợ | S |
| 4 Máy | `src/products/ban-chep-bot.js:68-70` `pageBanSanPham` · `src/products/san-pham-goc.js:296-300` «Page đang bán» đường `mon_pos` · `src/pos/doc-danh-muc.js:73-87,166-189` RF-15 gán/backfill `page_id` | Bỏ ba nhánh đọc/ghi theo `page_id` | Thợ | S |
| 4 Máy · ⚠️ | **Chat trên prod KHÔNG đi qua `catalog.js`.** `V3_RAP_PROMPT_BAT` vắng (đo 02/10: `.env`, unit, `/proc` của `aicloser-v3`) ⇒ `rapKb` lui về `kb.js` đọc `kb-overrides.json` (77 page có products, sửa lần cuối 30/09). Và `dayPageSangBot` gặp page rỗng thì KHÔNG đẩy (ca BC10, cố ý — đẩy rỗng là xoá thứ bot đang bán) ⇒ bản chép cũ đứng nguyên | Bỏ nhánh ở `catalog.js` **không đủ**. Chặn ở `src/chat/handler-v3.js` (ngoài bộ não): đọc `page` TRƯỚC KB, chưa gắn gốc + shop ⇒ bàn giao `page_chua_gan_san_pham` + nhật ký, không gọi model — phủ cả hai nguồn KB | Thợ | M |
| 4 Máy | `v3/src/ui/san-pham/trang/san-pham.html` — `veThem` (756-800) · `veBanSao`/`veBang`/`moPage` (673-754) · ô lưu ý (102-113) · router `POST /api/san-pham/goc` (`router.js:134`, tạo gốc không SKU) · `GET /api/san-pham` (`:122`, chỉ màn này gọi — `san-pham.html:822`) | GSP1 bỏ lối số hiệu + đóng `POST /goc`; GSP5 bỏ màn bản sao + `GET /api/san-pham`. Cửa sửa gốc `POST /goc/:id` giữ | Thợ | M |
| 4 Máy | Trang một page, tab «SP & giá» (`mot-page.html:444+`) — hôm nay sửa đúng thứ bot đọc = bản sao của page | Sau CR thứ bot đọc = món POS của shop ⇒ sửa ở một page là sửa MỌI page cùng gốc × shop. Câu chữ phải nói vậy, hoặc chuyển hẳn sang Sản phẩm › Theo thị trường | Thợ | S–M |
| 4 Bộ ca | **Đảo thử 02/10** — worktree tạm, bỏ nhánh `page_id` ở `catalog.js` + `kho-san-pham-v3.js` + `ban-chep-bot.js`, chạy 39 tệp ca chạm đường đọc: bản gốc **410/411** (1 đỏ sẵn: `l2-m3-rap-prompt` lỗi runner «Unable to deserialize cloned data», không do luật) → bản đảo **375/411** ⇒ **35 ca neo luật cũ** — đều dựng fixture bằng bản sao theo page: đường tiền (D1–D3 · D5 · D8 duyệt · B2 hàng chờ · R2-3/6/7/8 · Legacy→duyệt) · chat (① · ④a rap-prompt) · bản chép + ảnh (BC6–BC10 · AR1–AR7 · NK4–NK5 · AS5–AS6) · đầu-cuối (V3 UI e2e · LL2 Hộp thư) | Chuyển fixture sang page gắn gốc + shop — **không xoá ca**. Thêm 4 ca luật mới: (i) page chưa gắn + có bản sao ⇒ chat bàn giao, model 0 lượt — chạy cả nhánh `kb.js`; (ii) cổng bật chặn; (iii) `cua2Tien` đóng; (iv) gắn gốc + shop ⇒ đủ. Đảo-vá: trả nhánh `page_id` / bỏ chốt handler ⇒ (i)–(iii) đỏ | Thợ | M–L |
| 4 Cổng | `ops/bin/nghiem-thu/*.sh` | Đo: **0 cổng** neo đường `page_id` / màn bản sao / lối số hiệu. Cổng mới `gsp1.sh` … `gsp5.sh` | Thợ | S |
| 4 Biến | `V3_*` | Không thêm, không đổi | — | — |
| 5 Dữ liệu | Prod — mục 5d | Không bản ghi nào phải SỬA cho luật mới; phải THÊM: gốc cho sản phẩm 74 page đang bán, gắn page, chép giá + ảnh sang món POS (GSP2–GSP3). Bản sao giữ nguyên làm lưu trữ | Thợ + người | M–L |

## 3 · Giá phải trả

**Làm lại:** 35 ca (fixture) · hai màn Sản phẩm · câu chữ tab «SP & giá» của trang page.

**Mất đi:**
1. **Ghi đè giá theo page** (`03-MAN-HINH.md:14` «ghi đè có chủ ý»). Sau CR giá thuộc món POS ×
   shop: mọi page cùng gốc × shop chung MỘT bảng giá. Hai page cùng shop bán cùng sản phẩm hai giá
   ⇒ không còn cách. Đề nghị bỏ — đúng VE8b «một nơi nhập giá». Muốn giữ thì là thiết kế riêng,
   ngoài CR này.
2. **Page bán nhiều sản phẩm**: `page.san_pham_goc_ma` là một cột ⇒ một page một gốc. Đo: 2 page
   có 2 bản sao — người xem đó là hai biến thể của cùng gốc (giữ được cả hai) hay hai sản phẩm
   (chỉ giữ được một).
3. **Màn «Bản sao theo page»** — chỗ duy nhất hôm nay liệt kê 74 page có hàng. Thay bằng cột «Còn
   thiếu» ở danh sách Page (đã có) + bộ đếm tạm «x page còn đọc bản sao» trong lúc chuyển.

**Rủi ro mới:**
1. **Đường tiền.** Bộ đọc chung nằm trên `cua2Tien` và duyệt đơn ⇒ GSP3 · GSP4 làn 🟥, phản biện
   bắt buộc. Van `V3_POS_GHI=0` và hàng chờ tạo đơn = 0 dòng (đo 02/10) ⇒ lúc áp không đơn nào kẹt.
2. **Giá lệch khi gom.** Nhiều page cùng gốc × shop đang mang giá bản sao khác nhau ⇒ phải chọn
   một. Chọn sai là bot báo giá khác giá marketer chạy ads. Máy chỉ gợi ý và nói lệch, **người
   chọn**.
3. **Ảnh trùng.** 536 ảnh gom về món POS — nhiều page cùng gốc × shop ⇒ khử trùng theo `duong`.
4. **Chốt ở handler.** Thêm một lượt đọc `page` trước KB; đọc hỏng không được im — đúng khuôn
   `page_no_kb`: bàn giao + ghi nhật ký.

**Bộ não:** KHÔNG chạm. `handler-v3.js` · `catalog.js` · `ban-chep-bot.js` · `hang-cho.js` nằm
ngoài năm file.

## 4 · Không làm ngay ⇒ §9 SỔ NỢ

- **N-GSP-XOA-BAN-SAO** — 78 dòng `nguon='kb'` + 154 bậc giá + 536 ảnh giữ làm lưu trữ sau GSP4;
  xoá + bỏ cột `san_pham.page_id` là phiếu sau, khi đủ 30 ngày không ai đọc. Neo: migration 015
  «bỏ cột là phiếu khác, sau này».
- **N-GSP-DIAMOND** — gốc «Diamond Halo set» không SKU (lối số hiệu, 29/09): gắn SKU tay qua
  `POST /api/san-pham/goc/:id` hay gộp lại qua màn Gộp. Neo: bảng 12.
- **N-GSP-TEAM-KT** — 2 page của team kỹ thuật có bản sao, shop của team đó chưa kéo danh mục:
  chuyển team hay bỏ. Neo: bảng 1 + 8.
- **N-GSP-KB-OVERRIDES** — page không gắn gốc thì bản chép cũ trong `kb-overrides.json` đứng nguyên
  (BC10). Chốt ở handler chặn rồi nên không ra khách, nhưng tệp còn dữ liệu chết. Dọn ở phiếu khác.
- **N-GSP-GHI-DE-PAGE** — nếu sau này cần giá riêng theo page (mục 3, mất đi 1).

## 5 · Phiếu cần đẻ

| Mã | Việc | Làn | Thứ tự · phụ thuộc |
|---|---|---|---|
| GSP1 | Màn Sản phẩm: «+ Thêm» mở «Gộp món POS»; bỏ khung tạo gốc theo số hiệu + danh sách 185 số hiệu; đóng `POST /api/san-pham/goc` (tạo gốc không SKU). Cửa sửa gốc `POST /goc/:id` giữ | 🟨 | 1 — độc lập; chặn sớm gốc không SKU |
| GSP2 | Gắn 76 page vào gốc: màn «Bản sao theo page» đổi TẠM thành **danh sách việc chuyển** (mỗi dòng: page · shop · giá + ảnh bản sao · gợi ý món POS/SKU của shop khớp tên page) — người xác nhận: gắn vào gốc có sẵn, hoặc gộp SKU thành gốc rồi gắn, trong cùng màn · ô lưu ý trái thành bộ đếm «x page còn đọc bản sao» · cửa ghi gắn page dùng lại cửa đã có (`san-pham-goc.js:660`, nhật ký `truoc/sau`) | 🟨 | 2 — sau GSP1 (cùng tệp màn) |
| H-GSP | Người: shop cho 11 page chưa có shop · xác nhận gợi ý · chọn giá khi lệch · 2 page có 2 bản sao | — | song song GSP2 |
| GSP3 | Chép giá + ảnh, CHẠY TRONG tiến trình v3 (nút trên danh sách việc chuyển — không script rời trên prod, vì bản chép `kb-overrides.json` do chính tiến trình ghi): page đã gắn ⇒ bậc giá bản sao → món POS (`gia_tay=true`, CHỈ khi món chưa có giá; tiền tệ phải khớp shop; gốc có >1 món ở shop hoặc giá lệch giữa các page ⇒ dừng, hiện ra cho người chọn) + ảnh → món POS (khử trùng `duong`) · đẩy bản chép · nhật ký ghi id đã ghi để lùi | 🟥 | 3 — sau GSP2 (cùng tệp màn) |
| GSP4 | Một đường: bỏ nhánh `page_id` ở `catalog.js` · `kho-san-pham-v3.js` · `ban-chep-bot.js` · `san-pham-goc.js` «Page đang bán» · `doc-danh-muc.js` RF-15; chốt ở `handler-v3.js` trước KB; 35 ca chuyển fixture + 4 ca luật mới + đảo-vá + cổng `gsp4.sh`; deploy theo `mo-van` | 🟥 | 4 — khi bộ đếm = 0, hoặc người quyết chấp nhận phần còn lại thôi chat |
| GSP5 | Dọn: bỏ màn «Bản sao theo page» + ô lưu ý + `GET /api/san-pham`; tab «SP & giá» trang page nói giá sửa ở Sản phẩm › Theo thị trường; `03-MAN-HINH.md` · `luoc-do-v1.md` | 🟨 | 5 — sau GSP4 |

Áp theo thứ tự §④ của quy trình: `01-QUYET-DINH.md` → `ban-giao` → sổ + phiếu → code → ca → cổng → màn.

## 5d · Lớp 5 ĐO TRÊN PROD (02/10, SSH chỉ đọc, `BEGIN READ ONLY` … `ROLLBACK`)

Script `node --env-file=.env -` đọc từ stdin, không tệp nào đặt lên máy chủ.

| # | Đo | Số |
|---|---|---|
| 1 | Page Pialpha GCC | **514** · gắn gốc **0** · có shop 119 · `bot_ai_bat` 0 · `v3_ai_bat` 0 · `giao_bot_moi` 0. Team kỹ thuật: 68 page, cũng 0 |
| 2 | Page đang có sản phẩm (đúng luật `catalog.js`) | **74** GCC + 2 team kỹ thuật = **76** — **cả 76 qua bản sao**, cả 76 có bậc giá; 440 GCC + 66 kỹ thuật không có sản phẩm |
| 3 | Dòng `san_pham` | `kb`: 76 (GCC) + 2 · `pos`: 491 (8 thuộc gốc) — đúng con số «491/567 chưa có bậc giá» trên màn: 567 = 76 + 491, và **0/491 món POS có giá** |
| 4 | Bản sao → món POS → gốc | **0/78 đã nối món POS** (`pos_ma` NULL cả 78) ⇒ chuyển TỰ ĐỘNG qua `pos_ma` = 0 |
| 5 | Page có bản sao trỏ >1 gốc | 0 (vì 0 nối) |
| 9 | Bản sao chi tiết | 78 dòng · 154 bậc giá (151 + 3) · 6 tiền tệ AED BHD KWD OMR QAR SAR · 77/78 có ảnh, **536 ảnh** (523 + 13) · chỉ 3 có tên · mã dạng `kb:<page>:SP01` |
| 10 | Page có 2 bản sao | 2 |
| 11 | Page bản sao có kịch bản LIVE | 74 (không đổi theo CR) |
| 7 | Món POS theo shop (GCC) | Saudi 174 · UAE 146 · Kuwait 69 · Taiwan 43 · Qatar 31 · Oman 15 · Bahrain 13 — **491/491 có SKU** · 0 có giá |
| 7b | Kết nối POS | GCC: 7 shop, đã kéo cả 7 · team kỹ thuật: 7 kết nối, kéo 0 |
| 8 | 74 page bản sao GCC | 63 có shop (shop đều đã kéo) · **11 chưa có shop** · 38 có `thi_truong` gõ tay |
| 13 | SKU | 274 SKU · 272 chưa có gốc · 95 SKU bán ở >1 shop |
| 12 | Sản phẩm gốc | 2: «Diamond Halo set» (số hiệu 5, **không SKU**, không marketer, tạo 29/09) · «Clear Sight EYE HEALTHY» (SKU 171, marketer VVI0026, tạo 01/10) · 0 page gắn |
| 14 | Hàng chờ tạo đơn | 0 dòng |
| — | Cờ prod | `V3_RAP_PROMPT_BAT` vắng · `V3_POS_GHI=0` · `kb-overrides.json` 77 page có products (30/09 05:15) |

**Đọc ra:** chuyển tự động = 0 ⇒ cả 76 page phải gắn có người xác nhận (GSP2). Giá và ảnh CHỈ
nằm ở bản sao ⇒ áp GSP4 trước GSP3 là 76 page mất cả giá lẫn ảnh với bot. 0 page bật + 0 hàng
chờ + van POS đóng ⇒ lúc áp **không khách nào chịu ảnh hưởng**.

## 6 · Đường lùi

- **GSP1 · GSP5** — chỉ giao diện: revert commit.
- **GSP2** — mỗi lượt gắn đã ghi nhật ký `truoc/sau` (`san-pham-goc.js:680`); gỡ bằng cửa gỡ có
  sẵn (`:693`). Bản sao không bị đụng.
- **GSP3** — chỉ ghi vào món POS CHƯA có giá; nhật ký lượt chép lưu danh sách id `goi_gia` / `anh_san_pham`
  đã ghi ⇒ lùi = xoá đúng danh sách đó. Bản sao giữ nguyên.
- **GSP4** — revert commit: nhánh `page_id` trở lại, bản sao còn nguyên ⇒ bot đọc như hôm nay.
  Không migration.
- **Cả CR** — không xoá một dòng dữ liệu nào ⇒ lùi luôn là revert code.
