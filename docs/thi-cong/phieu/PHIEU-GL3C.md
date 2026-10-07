# PHIẾU GL3c — Pancake lỗi KÉO DÀI không được thành «bot câm im lặng»: danh sách hội thoại nói lỗi + đếm vào ngắt page · hội thoại đọc lỗi bền ⇒ giao sale CÓ việc

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (đường bot trả lời khách + bàn giao sale; sai một chiều là khách bị bỏ không ai biết, sai chiều kia là ngập việc / ngắt oan)
**Nguồn:** README nguyên tắc 13 («MỌI điểm AI dừng phục vụ đều đổ về hàng chờ … không khách nào rơi vào khoảng trống "AI im mà người chưa biết"») ·
nợ **N-GL3B-NAP-LOI-BEN** · **N-GL3B-CONV-NUOT-LOI** · **N-GL4-NAP-KHONG-DEM** · **N-GL3B-WEBHOOK-MAPPING** (sổ §9) · sổ §5j (GL3c trước page thứ hai)
**Đụng bộ não:** không.
**Đổi hợp đồng cửa đã bàn giao:** CÓ — `docHoiThoai` của cửa Messenger đổi từ «trả mảng, lỗi nuốt thành `[]`» sang «ném `LoiDocHoiThoai`» (cùng kiểu GL3b
với `docTin`; sửa mã cho khớp ý đồ có sẵn — nguyên tắc 13; sửa `docs/v3/ban-giao/cua-messenger-v1.md` cùng commit).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review`.

## ① Thi hành đoạn nào

1. **Danh sách hội thoại nuốt lỗi.** `src/pancake.js#pkGetConversations` (`:342-345`) trả `j.conversations || []` ⇒ Pancake sập / quá hạn / 121 ⇒ bộ nạp
   (`src/queue/nap.js:389` `docHT = deps.docHoiThoai || cuaDocHoiThoai` → `messenger/index.js:154-158#docHoiThoai`) thấy «0 hội thoại» y như không ai nhắn;
   GL4 không đếm (N-GL4-NAP-KHONG-DEM — 582/582 page prod là `poll`, nên Pancake sập lúc nạp thì đèn GL4 KHÔNG BAO GIỜ đỏ: `kho-suc-khoe.js:521` tự khai).
2. **Hội thoại đọc lỗi BỀN.** GL3b cho bộ nạp lùi theo hội thoại (`nap.js:173` `luiDocTin`, `:477-526`; 30 s·2ⁿ, trần 5′) — lùi MÃI, không bao giờ thành
   việc cho sale (N-GL3B-NAP-LOI-BEN: «Thiếu mã khách hàng», 121 không ghế, Pancake sập lâu). Chỉ còn dòng `doc_tin_loi` ở «Tin bị lọc».
3. **Page webhook.** Worker tra mapping qua `docHoiThoai` (`worker.js:211`) — nuốt lỗi ⇒ `LoiChoMappingPancake` (lùi 5 s × 3) ⇒ `banGiaoLoi` cũ (tin `loi`,
   không việc, «trả AI» bị chặn). Prod 0 page webhook (đo 07/10) — vá cùng lượt vì cùng một cửa.

## ② Hợp đồng vào / ra

1. **Cửa danh sách hội thoại nói lỗi**: `pancake.js` thêm `pkDocHoiThoai(pageId)` (khuôn `pkDocTin`: `{ ok:true, conversations } | { ok:false, loi, capKenh }` —
   phân loại kênh theo CẤU TRÚC như GL4 ② 3: hết token / mọi token lỗi quyền / quá hạn / mạng / thân hỏng / 121 không mã ⇒ `capKenh:true`). `pkGetConversations`
   GIỮ NGUYÊN chữ ký (còn `src/orders/legacy.js:23` dùng). `messenger/index.js#docHoiThoai` đường mặc định gọi `pkDocHoiThoai`; `ok:false` ⇒ ném `LoiDocHoiThoai`
   (khuôn ở `loi.js`, mang `capKenh`). Giữ tham số tiêm `getConversations`: hàm tiêm trả MẢNG = đọc được.
2. **Bộ nạp** (`napTuPoll`): bắt `LoiDocHoiThoai` ở mức PAGE ⇒ không ghi mốc nào, trả kết quả có `docHoiThoaiLoi: 1` + câu lỗi; `chay-worker.js` cộng + in trong
   `inLuot` (MỘT dòng tổng). `capKenh` ⇒ gọi `ngat-page.js#ghiLoiKenh(kieu:'doc')` với khoá «mỗi VÒNG nạp là một lần» (hàm GL4 hiện đếm theo `tinId` khác nhau —
   thêm cách đếm cho sự kiện không có tin, vd `tinId = null` ⇒ luôn tính là lần mới; KHÔNG làm lệch luật «hai lượt thử của cùng một tin là MỘT lỗi»). Hai vòng nạp
   liên tiếp lỗi kênh ⇒ page ngắt vì ĐỌC 30′ (bỏ nạp theo GL4) ⇒ đèn `ngat_kenh` ĐỎ. Vòng nạp OK ⇒ `ghiDocTot`.
3. **Hội thoại đọc lỗi bền ⇒ giao sale CÓ việc**: ở `luiDocTin`, khi `lan >= LAN_GIAO_SALE` (hằng có tên — đề nghị 4: 30 s + 60 s + 120 s + 240 s ≈ 7,5′ lỗi
   liên tục) ⇒ bộ nạp (trong MỘT giao dịch, client riêng) đổi `hoi_thoai` → `SALE/HANDOFF`, `ly_do_cuoi='doc_lich_su_loi_ben'` (CHỈ khi đang `AI` + GREET/QUALIFY/
   SELLING + page `bot_ai_bat`), chèn ĐÚNG MỘT `viec_can_xu_ly` bằng hàm chèn việc DÙNG CHUNG của GL3b/GL4 (`NOT EXISTS` việc mở; `ly_do_day` «Pancake không trả
   lịch sử hội thoại này ~7′ — bot CHƯA trả lời, CHƯA gửi gì: <câu lỗi>»), ghi `nhat_ky`; rồi ghi mốc hội thoại (hết đọc lại) và xoá khỏi `luiDocTin`. UPDATE đổi
   0 dòng (sale đã giữ / CLOSING …) ⇒ chỉ ghi mốc, không việc. Page đang NGẮT vì đọc (GL4) thì không đọc ⇒ không tăng `lan` (không giao sale hàng loạt khi Pancake
   sập cả page — GL4 lo). `luiDocTin` nằm trong RAM — restart đặt lại đếm (ghi rõ, chấp nhận).
4. **Worker page webhook**: `docHoiThoai` ném `LoiDocHoiThoai` ở bước tra mapping ⇒ xử như `LoiDocLichSu` (nhánh GL3b: lùi 15 s · 30 s, hết lượt ⇒ giao sale CÓ
   việc, tin `xong` không chặn «trả AI»), KHÔNG đi `LoiChoMappingPancake`/`banGiaoLoi`. `LoiChoMappingPancake` giữ cho đúng ca «đọc được mà không có mapping duy nhất».
   Đếm GL4: theo `capKenh` như lỗi đọc lịch sử.
5. Không đổi: `pkGetConversations`, cửa sổ 60 hội thoại, mốc nạp khi đọc OK, luật GL4 cho tin.

## ③ File được đụng

```
src/pancake.js
src/channels/messenger/index.js
src/channels/messenger/loi.js
docs/v3/ban-giao/cua-messenger-v1.md
src/queue/nap.js
src/queue/chay-worker.js
src/queue/worker.js
src/queue/ngat-page.js
test/gl3c-*.test.mjs
ops/bin/nghiem-thu/gl3c.sh
```
Neo đảo-vá của `gl3b.sh` / `gl4.sh` (chuỗi nguyên văn + `count == 1`) trong `pancake.js` / `nap.js` / `worker.js` / `ngat-page.js`: KHÔNG sửa dòng neo; buộc phải sửa ⇒
DỪNG báo tổng (có thể cho cổng vào ③ với ràng buộc «chỉ đổi chuỗi neo»). Mock `pancake.js` trong `test/l2-m1-nhac-truong.test.js` có danh sách export cố định —
export mới mà nơi khác nạp tĩnh ⇒ ca đó đỏ ⇒ DỪNG báo tổng (tiền lệ GL3b N1: cho tệp vào ③ chỉ để thêm tên vào mock). Ca cũ đỏ ngoài ③ ⇒ DỪNG, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl3c.sh`, rc=0 khi đạt; hộp cát `DB="aicloser_v3_nt_gl3c_p$$"`; fetch giả, KHÔNG mạng; ≥2 token; mở van gửi CHỈ trong env tiến trình ca; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

⚠️ Đi CỬA THẬT (`motLuot` → `napTuPoll` → `docHoiThoai` thật → `pkDocHoiThoai` → `pkFetchPage` → fetch giả). Cấm tiêm `docHoiThoai`/`docTin` ở phép 1–4. Đồng hồ
lùi dùng tham số `dongHo` sẵn có của bộ nạp; giờ ngắt dùng đồng hồ CSDL (khuôn GL4). Phép phủ định kèm vế «đã chạm» (fetch giả nhận đúng URL, `ket.nap.mo === true`).

1. `/conversations` quá hạn ở mọi token 2 vòng nạp liên tiếp ⇒ `docHoiThoaiLoi` đếm + in trong log vòng; page ngắt vì ĐỌC (`ngat_vi='doc'`); đèn `ngat_kenh` ĐỎ; vòng sau
   0 lượt fetch cho page; không mốc nào bị ghi.
2. `/conversations` lỗi 1 vòng rồi OK ⇒ KHÔNG ngắt; tin khách vào hàng bình thường.
3. Hội thoại X đọc lịch sử lỗi «Thiếu mã khách hàng» liên tục (dữ liệu, `capKenh:false`), các hội thoại khác OK ⇒ page KHÔNG ngắt; tới lần lùi thứ 4 ⇒ X:
   `SALE/HANDOFF` `doc_lich_su_loi_ben`, ĐÚNG 1 việc, `nhat_ky` 1 dòng, mốc ghi, không đọc X nữa; `resumeConversation` (trả AI) THÀNH. Lần lùi 1–3 ⇒ chưa giao.
4. Như 3 nhưng X đang do SALE giữ ⇒ không việc mới, mốc ghi.
5. Page webhook (hộp cát): `docHoiThoai` lỗi ở bước tra mapping ⇒ lùi 15 s · 30 s, hết lượt ⇒ giao sale CÓ việc, «trả AI» THÀNH; KHÔNG `banGiaoLoi`. Đọc được mà không
   mapping duy nhất ⇒ vẫn `LoiChoMappingPancake` như cũ.
6. `pkGetConversations` giữ nguyên hành vi (ca `legacy.js` / ca cũ xanh).
7. Đảo-vá: cửa trả về nuốt lỗi ⇒ phép 1 đỏ; bỏ đếm GL4 ở nạp ⇒ phép 1 (ngắt) đỏ; đếm vòng lỗi đơn lẻ là ngắt ⇒ phép 2 đỏ; bỏ giao sale lỗi bền ⇒ phép 3 đỏ; giao sale ở lần
   lùi 1 ⇒ phép 3 (vế chưa giao) đỏ; giao khi sale đã giữ ⇒ phép 4 đỏ; webhook về `banGiaoLoi` ⇒ phép 5 đỏ.
8. Cổng cũ xanh (rc tách dòng): `gl4.sh` · `gl3b.sh` · `gl3.sh` · bộ ca `test/l1-m2-cua.test.js` · `test/l2-m1-hang-doi.test.js` · `test/l2-m1-nhac-truong.test.js` ·
   `test/va-p7-chay-worker.test.js` · `test/phase1-chat-flow.test.js` · `test/gl3b-*.test.mjs` · `test/gl4-*.test.mjs`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gl3c-*.test.mjs` (danh sách hội thoại lỗi kênh 2 vòng / 1 vòng · hội thoại lỗi bền dữ liệu ⇒ giao sale lần 4 · sale đã giữ · webhook mapping lỗi · pkGetConversations giữ nguyên).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

`luiDocTin` trong RAM (restart đặt lại đếm lỗi bền) · `src/orders/legacy.js` vẫn dùng `pkGetConversations` nuốt lỗi (đường đơn cũ) · thẻ/ghi chú Pancake khi giao sale
(N-GL3B-BANGIAOLOI-PANCAKE — GL6) · cảnh báo Telegram (GL6).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GL3B-NAP-LOI-BEN\|N-GL3B-CONV-NUOT-LOI\|N-GL4-NAP-KHONG-DEM\|N-GL3B-WEBHOOK-MAPPING"
(4 nợ — GL3b 07/10 · GL4 07/10)
```
Quan hệ: **trả nợ N-GL3B-NAP-LOI-BEN · N-GL3B-CONV-NUOT-LOI · N-GL4-NAP-KHONG-DEM · N-GL3B-WEBHOOK-MAPPING**.
