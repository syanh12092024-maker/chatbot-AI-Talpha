Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, đang chạy production trên VPS 169.58.33.8 (39 page).

# LUỒNG 3 — NHẬP LIỆU (M01 Token&Page Registry · M02 Script Studio · M03 Readiness Gate)

## Đọc trước khi làm
1. `docs/v2/00-TONG-QUAN.md` — kiến trúc v2 + mô hình dữ liệu §6.1, §6.2
2. `docs/v2/01-TANG-NHAP-LIEU.md` — spec đầy đủ M01/M02/M03
3. `docs/v2/07-KICH-BAN-TU-DONG.md` — bảng kịch bản 2 cột (làm sau, nhưng đọc để thiết kế đúng)
4. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE, đọc kỹ

## ⚠️ ĐỌC KỸ — cái này ĐÃ CÓ, đừng làm lại
Tài liệu bản đầu ghi *"0/39 page có kịch bản riêng"* — **SAI**, đã đính chính.

Thực tế đang chạy:
- Dashboard **đã có** ô nhập `greeting` / `tone` / `salesPrompt`
- **Đã có** `POST /admin/api/kb/:pageId/config` và import file `.xlsx` kịch bản Pancake
- Lưu ở `kb-overrides.json` dạng `{ "<pageId>": { "config": { greeting, tone, salesPrompt } } }`
- Nạp vào prompt qua `getKBForPage().config` → `buildSystem()` → khối `# HƯỚNG DẪN RIÊNG CHO PAGE NÀY`
- **37/38 page đã điền** `greeting` + `salesPrompt` (890–1.908 token mỗi page)
- **1/38 page có `tone`** · **1 page trống hoàn toàn** (Light Step Care KSA)

**Việc của bạn KHÔNG phải xây ô nhập.** Bốn thứ còn thiếu mới là M02:
1. **Phiên bản hoá** — sửa xong không quay lại được bản cũ, không biết ai sửa lúc nào
2. **Validator** — không có gì chặn kịch bản ghi sai giá / lọt tiếng Việt / hứa ngày giao
3. **Trạng thái duyệt** — DRAFT / REVIEW / LIVE / ARCHIVED
4. **Nút "Thử với 1 tin"** chạy trên bản nháp, KHÔNG gửi cho khách thật

## Phạm vi
### M01 · `src/page-registry.js` (mới)
Nạp token → phát hiện page → `pages.json` (schema §6.1) → failover token theo thứ tự
`.env` → map shop POS → kiểm 3 thẻ Pancake tồn tại. Spec §M01.

### M02 · Script Studio
- Lưu phiên bản kịch bản (giữ `kb-overrides.json` làm nguồn LIVE để không phá luồng
  đang chạy; thêm `script-versions/` cho lịch sử)
- **Validator** — 6 luật ở spec §M02. Dùng lại `src/outbound-guard.js` cho phần đối
  chiếu giá (`allowedPrices`, `extractMoney` đã export sẵn) thay vì viết lại
- Màn hình sửa + lịch sử + khôi phục

### M03 · `src/readiness.js` (mới)
Thang 7 bậc §M03. **Phân biệt rõ 2 mức**, đừng gộp:
- `MISSING_SCRIPT` (thiếu `greeting` HOẶC `salesPrompt`) → **chặn bật AI** — hiện 1 page
- `THIN_SCRIPT` (thiếu `tone`, hoặc `salesPrompt` <500 token) → chỉ nhắc — hiện 37 page

Gộp chung sẽ tạo bản tin 38 dòng đỏ mà không ai đọc.
Thông báo: WhatsApp (`src/wa.js` có sẵn) + banner, **gộp theo `marketer`**, 09:00/ngày.

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/kb.js` · `src/page-registry.js` · `src/readiness.js` ·
`src/admin-scripts.js` *(router riêng)* · `public/scripts.html` *(trang riêng)* ·
`test/*.test.mjs` của mình · 1 dòng mount trong `admin.js` · 1 dòng link trong `admin.html`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/ai-log.js` · `src/fast-lane.js` · `src/conv-*.js` · `src/economics.js`

> **KHÔNG sửa `public/admin.html`** ngoài 1 dòng link — đó là file 1-mảnh CSS+JS inline,
> luồng khác cũng đang thêm trang. Tạo `public/scripts.html` riêng.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l3-nhap-lieu` (nền là `fix-images`)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Không xoá đơn Pancake**; **không xoá/ghi đè kịch bản marketer đã viết** — luôn tạo
  phiên bản mới, giữ bản cũ
- **HARD_RULES luôn thắng.** Kịch bản page chỉ được đổi giọng điệu & cách bán; validator
  phải chặn mọi mưu toan ghi đè quy tắc tiền / PII / không-bịa / ngôn ngữ
- VPS chỉ ĐỌC, không ghi, không restart service

## Nghiệm thu
- [ ] `npm test` xanh (54 test hiện có không được hỏng)
- [ ] Server boot sạch, `/health` = 200
- [ ] Sửa kịch bản → có hiệu lực ≤60s, **không cần restart**
- [ ] Xuất bản kịch bản có giá lệch bảng giá → **bị chặn**, báo lỗi rõ
- [ ] Khôi phục bản cũ → tin tiếp theo dùng đúng bản đó
- [ ] Bật AI cho page thiếu `salesPrompt` → **bị từ chối**, hiện đúng lý do
- [ ] Bản tin 09:00 gộp đúng theo marketer, `MISSING_SCRIPT` và `THIN_SCRIPT` tách bạch
- [ ] **Chạy validator trên 38 kịch bản THẬT** kéo từ VPS — báo cáo cái nào vi phạm luật gì

## Cách làm việc mong đợi
Kiểm tra thực tế trước khi tin tài liệu. Tài liệu này từng sai một lần ở đúng chỗ bạn
đang làm. Nếu thấy spec lệch code thật, nói ra và sửa spec.
