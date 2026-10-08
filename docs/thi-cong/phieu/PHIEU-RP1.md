# PHIẾU RP1 — Đường đọc CSDL (`V3_RAP_PROMPT_BAT=1`) đủ cho pilot: ảnh sản phẩm · ảnh hỏng không chặn chữ · tên bậc giá từ giao diện · tên sản phẩm gốc · luật lõi giữ trong mã

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (thứ bot gửi cho khách + cửa lên đơn)
**Nguồn:** người quyết 07/10: «pilot bật cờ đọc từ CSDL» · «GIỮ LUẬT LÕI TRONG MÃ» · «giữ Botcake chào» · 08/10 «tên bậc giá có config trên giao diện rồi phải không»
(⇒ bot phải đọc «Tên bậc» marketer đặt) · soát env P2 (`scratchpad/soat-env.md` §6) · review (a) 07/10 TRẢ VỀ (2 CHẶN · 5 NÊN — bản này viết lại theo,
`scratchpad/review-a-rp1.md`) · sổ §5j (điều kiện pilot bước ③)
**Đụng bộ não:** không (`src/tools.js`, `src/fast-lane.js`, `src/prompts.js` CHỈ ĐỌC trường có sẵn — không sửa).
**Biến mới:** `V3_LUAT_CHUNG_CSDL` (vắng = luật lõi CORE trong mã) — khai `docs/v3/ban-giao/bien-moi-truong-v3.md` cùng commit.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

So trọn hai đường (review (a) bảng «đặc biệt soi (1)»): nhánh cờ BẬT của `src/chat/rap-prompt.js#rapKb` (`:280-335`) khác đường cũ `kb.js#getKBForPage` /
`ban-chep-bot.js` ở:
1. **Ảnh** — `products` không có `images` (`:302-315`) dù `catalog.js:23,40` đọc `anh_san_pham` vào `s.anh` ⇒ `tools.js:199-202` «chưa có ảnh», tin chào không ảnh
   (`fast-lane.js:139-149`); khối KB thiếu dòng «Ảnh có sẵn (dùng tool send_product_image để gửi): <nhãn>» (`kb.js:367-372`).
2. **Ảnh hỏng chặn chữ** — `handler-v3.js:470-494#xaAnh` gửi từng ảnh qua `guiDaXacNhan` (`:145-157`, `ok !== true` ⇒ `LoiGuiChuaXacNhan` `khongThuLai`), chạy TRƯỚC
   `guiChu` ở cả fast-lane (`:643`) lẫn model (`:868`) ⇒ ảnh 2 bị Pancake từ chối (`invalid_upload_fb_attachments_result`, chập chờn — `tools.js:100-101`) ⇒ 0 POST chữ,
   khách nhận ảnh trơ, hội thoại sang sale, GL4 đếm 1 (review RV-2). v1 thử lại 1 lần rồi vẫn gửi chữ (`tools.js:103-121,149-153`). Có ở CẢ đường cũ khi page có ảnh.
3. **Tên bậc giá** — `goiGiaChoChat` luôn `label: Buy <so_luong>` (`:129-147`) bỏ qua `goi_gia.nhan` («Tên bậc» marketer đặt ở Sản phẩm › Theo thị trường —
   `san-pham.html:426`, lưu ở `operations.js:300,349`; chú thích `:125-128` «không có cột nhãn» SAI từ migration 025). Đường cũ dùng `nhan || Buy N`
   (`ban-chep-bot.js:43`). Đọc `nhan` thì `src/orders/draft.js:31-32` so `qty` model truyền với `so_luong` ⇒ «Buy 1 Get 1 FREE (Total 2)» + `qty=1` bị từ chối.
4. **Tên sản phẩm** — `name: s.ten` = tên món POS «125 - Tummiva Care gel — 50ml» (số hiệu nội bộ, `doc-danh-muc.js:29-39`) tới khách qua khối KB + caption fast-lane
   (`fast-lane.js:167`) (review RV-1).
5. **Món hết hàng** vẫn trong `products` (đường cũ lọc) ⇒ fast-lane/tool lấy món [0] có thể là món hết.
6. **Luật lõi** — `boLuatChung` (`:322-328`) thay CORE trong `prompts.js:188-201` khi bản CSDL có «THẨM QUYỀN»; prod có 1 bản seed 24/08 (băm `95e4da2d…` ≠ CORE_VI
   hiện tại), tiếng Việt (~2× token so với bản EN của BH8). Người quyết: GIỮ CORE trong mã.

## ② Hợp đồng vào / ra

1. **Ảnh**: mỗi `products[i]` thêm `images: (s.anh || []).map(a => ({ url: a.duong, label: a.nhan }))` đúng thứ tự `catalog.js` (khuôn `ban-chep-bot.js:45`). Khối KB
   (`text`) thêm dòng «Ảnh có sẵn (dùng tool send_product_image để gửi): <các nhãn>» cho món có ảnh (khuôn `kb.js:367-372`).
2. **Ảnh hỏng KHÔNG chặn chữ** (`handler-v3.js#xaAnh`): `success:false` dứt khoát ⇒ thử lại 1 lần rồi bỏ ảnh đó; `khongRo` (quá hạn/mạng) ⇒ KHÔNG thử lại, bỏ ảnh đó
   (không gửi lại — luật GL3); cả hai vẫn gửi chữ; caption dời sang tấm gửi được đầu tiên (không tấm nào ⇒ caption đi theo chữ); `LoiCuaGuiDong` / guard / cổng ghi
   chặn vẫn ném như cũ; sổ (`so_ai` hoặc nhật ký lượt) ghi số ảnh hỏng. GL4: lỗi ảnh vẫn đếm (`loai guiAnh`), chữ gửi OK thì `ghiGuiTot` xoá chuỗi như hiện nay.
3. **Tên bậc giá**: `goiGiaChoChat` trả `label: nhan || Buy <so_luong>` (nhãn vẫn phải tiếng Anh như marketer gõ — không dịch). Khối KB / `bangGia` / fast-lane nêu
   TỔNG số món của bậc khi nhãn khác «Buy N» (vd «Buy 1 Get 1 FREE (Total 2 Products) — 2 items: 109 SAR»). `draft.js`: khi model chọn được bậc tường minh (theo
   nhãn/giá), `qty` của đơn = `so_luong` của bậc (KHÔNG từ chối vì model truyền số món «mua»); vẫn từ chối khi không khớp bậc nào / giá lệch. Cửa tiền `cua2Tien`
   giữ nguyên (so tổng với bậc). Sửa chú thích `rap-prompt.js:125-128`.
4. **Tên sản phẩm**: page gắn gốc ⇒ `name` = tên SẢN PHẨM GỐC (`san_pham_goc.ten`), không số hiệu nội bộ; page chưa gắn (RF-15) giữ như cũ.
5. **Lọc món hết hàng** khỏi `products` như đường cũ (giữ trong khối KB một dòng «hết hàng» nếu đường cũ có; nếu không có thì bỏ hẳn).
6. **Luật lõi giữ trong mã**: cờ BẬT ⇒ `boLuatChung` CHỈ lấy từ CSDL khi `V3_LUAT_CHUNG_CSDL=1`; vắng ⇒ `""` (prompts.js tự dùng CORE). Khai biến mới.
7. Không đổi nhánh cờ TẮT (`kb_cu`), trừ ② 2 (ảnh hỏng — áp cho mọi đường vì cùng `xaAnh`).

**Sửa sau review (a) 07/10:** C1 → ② 2 · C2 → ② 3 (người quyết 08/10: dùng «Tên bậc» trên giao diện) · N1 → ② 1 · N2 → ② 4 · N3 → ⑦b · N4 → ② 6 (người quyết) ·
N5 → ④ · G3 → ② 5.

## ③ File được đụng

```
src/chat/rap-prompt.js
src/chat/handler-v3.js
src/orders/draft.js
src/products/catalog.js
docs/v3/ban-giao/bien-moi-truong-v3.md
test/gl4-ngat-page.test.mjs
test/rp1-*.test.mjs
v3/test/b/rp1-*.test.mjs
ops/bin/nghiem-thu/rp1.sh
```
`catalog.js`: CHỈ nếu cần đọc `san_pham_goc.ten` cho ② 4. `test/gl4-ngat-page.test.mjs`: CHỈ sửa kỳ vọng ca P3d (ảnh 2 hỏng ⇒ nay chữ vẫn đi). `handler-v3.js`: CHỈ
`xaAnh` (+ hàm phụ). Neo đảo-vá `gl3.sh`/`gl3b.sh`/`gl4.sh`/`gl3c.sh` không được đụng — buộc phải ⇒ DỪNG báo tổng. Ca cũ đỏ ngoài ③ (vd ca so nhãn «Buy N» cứng) ⇒
DỪNG, báo tổng kèm danh sách.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/rp1.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_rp1_p$$"`; `V3_RAP_PROMPT_BAT=1` CHỈ trong env tiến trình ca; fetch giả, KHÔNG mạng; mở van gửi CHỈ trong env ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

⚠️ Ca đi đường thật: page gắn gốc → ảnh vào món bằng đối soát «chép» THẬT (`chuyen-ban-sao.js`, không INSERT tay) → worker → `rapKb` cờ bật → `lanNhanh`/`chayCloser` →
cửa gửi thật → Pancake giả; khẳng định thứ tự POST (ảnh trước, chữ sau) và `content_url`.

1. Món 2 ảnh (tuyệt đối «Ảnh sản phẩm» + tương đối `/uploads/…`) ⇒ `products[0].images` đủ, đúng thứ tự; khối KB có dòng «Ảnh có sẵn …»; `send_product_image` gửi ảnh
   (tương đối được ghép `PUBLIC_URL`); tin chào (qua `buildIntro` với món có bậc giá) kèm ảnh tuyệt đối.
2. Ảnh 2 bị từ chối `success:false` ⇒ thử lại 1 lần ⇒ vẫn hỏng ⇒ 1 POST chữ ĐÚNG nội dung, tin `xong`, 0 việc sale; ảnh `khongRo` ⇒ KHÔNG POST lại ảnh đó, chữ vẫn đi;
   cổng ghi chặn ⇒ vẫn ném như cũ.
3. Bậc nhãn «Buy 1 Get 1 FREE (Total 2 Products)» `so_luong=2` ⇒ prompt / fast-lane nói đúng nhãn + «2 items»; model gọi tạo đơn `qty=1` cho bậc đó ⇒ đơn `qty=2`, tổng
   đúng, KHÔNG «số lượng không khớp»; giá lệch bậc ⇒ vẫn từ chối; nhãn trống ⇒ «Buy N» như cũ.
4. Page gắn gốc ⇒ `name` là tên sản phẩm gốc, caption/khối KB không có số hiệu «125 -».
5. Món hết hàng không đứng đầu `products` (bị lọc).
6. Cờ BẬT + `V3_LUAT_CHUNG_CSDL` vắng ⇒ prompt dùng CORE trong mã (không có văn bản bản CSDL); đặt `=1` ⇒ dùng bản CSDL.
7. Cờ TẮT ⇒ `rapKb` trả y nguyên bản trước sửa (so trọn đối tượng).
8. Đảo-vá: bỏ `images` ⇒ 1 đỏ · bỏ catch ảnh ⇒ 2 đỏ · bỏ thử lại ⇒ 2 đỏ · `label` về «Buy N» ⇒ 3 đỏ · `draft.js` so `qty` cũ ⇒ 3 đỏ · `name` về tên món ⇒ 4 đỏ · bỏ lọc hết
   hàng ⇒ 5 đỏ · luật CSDL khi vắng biến ⇒ 6 đỏ.
9. Cổng / bộ ca cũ xanh (rc tách dòng): `gl4.sh` · `gl3b.sh` · `gl3.sh` · `tt1b.sh` (hoặc bộ ca `test/tt1b-*`) · bộ ca có `rapKb`/`rap-prompt`/`draft` (`grep -rlE "rapKb|rap-prompt|orders/draft" test v3/test`) ·
   `test/mn3-ban-chep-bot.test.mjs` · `test/l3-m4-*.test.*`. `npm test -- --test-force-exit` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/rp1-*.test.mjs` (ảnh · ảnh hỏng · tên bậc + qty · tên gốc · hết hàng · luật lõi · cờ tắt) · `v3/test/b/rp1-*.test.mjs` nếu chạm màn.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

`variant`/«(phân loại)» trống ở món POS · dòng «Thị trường · Ngành hàng» không có ở đường CSDL · `introImages` không ghép `PUBLIC_URL` (cả hai đường) · ảnh lớn quá hạn 30 s
(N-GL3B-HAN-ANH) · 5 ảnh `*.trycloudflare.com` (đường hầm tạm) trên page 1263228703530758.

## ⑦ ĐÃ TRA CHƯA · ⑦b đo prod trước bước ③ (tổng, chỉ đọc)

```
$ grep -n "images" src/chat/rap-prompt.js   → 0 dòng (trước sửa)
```
⑦b: món của page pilot có ảnh SAU H-GSP (hôm nay 0) · URL ảnh còn sống · món đầu danh sách mang ảnh + còn hàng · page pilot có kịch bản LIVE (thiếu ⇒ `config {}`, mất câu chào /
cách bán) · `FASTLANE_TEMPLATES`/`FASTLANE_INTRO` đang `=0` (người quyết: giữ Botcake chào).
Quan hệ: **mới** (soát env P2) + review (a) C1/C2.
