# PHIẾU BH8 — HAI BẢN: người đọc tiếng Việt, model đọc tiếng Anh gọn · đích ≤50đ/lượt

**Base:** `32f645b` · **Làn:** 🟥 (đổi chữ model đọc ở MỌI page — CORE, kịch bản, tool)
· thợ **opus** · người quyết gật 28/09
**Đụng bộ não:** `src/prompts.js` `src/tools.js` `src/context.js` — CORE, mô tả tool và
khối hồ sơ khách là ba khối model đọc mỗi lượt; bản tiếng Anh phải thay đúng ở đó.

> Thợ nạp `tho-thi-cong` + `viet-thuoc`. Chạm cách bot NÓI ⇒ rào ② §0a luật 4 (đo model thật).
> ⚠️ **Chồng phạm vi:** BH3 (cắt CORE — `prompts.js` `tools.js`) và BH6 (cache — `prompts.js`
> `tools.js`). BH8 **nhận phần «cắt CORE» của BH3 ②.6 và toàn bộ phần cache của BH6**; hai
> phiếu kia khi nhận phải rebase lên BH8 và bỏ các mục đó. Tổng sửa bảng §5c.
> ⚠️ **Hạn mức Kimi 1,5 triệu token/NGÀY cho cả tổ chức** (chạm 28/09 lúc đo BH7). Mọi
> phép đo model của phiếu này phải tính ngân sách trước và DỪNG khi gặp lỗi TPD — xem ④.

## ① Thi hành

Đo 28/09 (dev, Minty KSA, Kimi k2.6 thật — nhật ký BH7 + phiên đối chiếu):

| Số đo | Giá trị | Nguồn |
|---|---|---|
| Tiền TB một lượt | **102đ** = không-cache 61đ + cache 29đ + ra 12đ | 46 lượt `so_ai` |
| Token CORE (tiếng Việt) — **Kimi đếm thật** | **4.331** (ước theo ký tự chỉ 2.315) | gọi `max_tokens:1` |
| Kịch bản Minty · KB · tools | ~1.560 · ~660 · **~1.210** | như trên |
| Cache trúng ở lượt thật | **6.144** / 7.761 token cố định | 3 request thật bắt bằng bẫy `fetch` |

Cơ chế cache Kimi đã đo (không đoán):
1. `system` và `tools` **giống hệt byte** giữa các lượt — chỉ `messages` khác.
2. Kimi giữ điểm cache DÙNG CHUNG ở **cuối khối system**, làm tròn xuống bội 512
   (6.549 → **6.144**). **Tools nằm SAU điểm đó** ⇒ ~1.210 token tools + ~400 token lẻ
   cuối system bị tính giá đầy đủ MỖI lượt ≈ **40đ/lượt**.
3. `cache_control` đặt ở tool cuối: **không tác dụng** (4 cặp neo/đối chứng, cả hai 6.144).
   ⇒ Ý «hai điểm neo cache» của BH6 **không áp được trên Kimi**.
4. Tiếng Việt tốn ~1,9× token so với ước lượng ký tự ⇒ viết cho model bằng tiếng Việt là
   trả gấp đôi cho cùng một luật.

Người quyết: **marketer vẫn viết và đọc tiếng Việt**; model đọc bản tiếng Anh gọn do AI
dịch MỘT lần lúc lưu, bản tiếng Việt giữ để người theo dõi.

Hạ tầng đã có một nửa: `kich_ban.noi_dung_nguoi` + `noi_dung_may`
(`v3/src/ui/kich-ban/kho-kich-ban.js:3-12` — «Marketer viết tiếng Việt → bấm một nút ra bản
cho máy → cả hai bản đều lưu», cấm sửa tay bản máy). Nhưng: `dungBanChoMay`
(`db/di-tru/nguon.js:212`) chỉ GHÉP KHUÔN, không dịch; và bộ ráp prompt KHÔNG đọc
`noi_dung_may` (`rap-prompt.js` lấy `noi_dung_nguoi` làm `config`, `buildSystem` dựng lại).

## ② Vào/ra

**Vào (ĐO LẠI trước khi code — bẫy #4):** `prompts.js#CORE` + `buildSystem` ·
`tools.js#toolDefs` (5 tool) · `context.js#buildProfileBlock` · `db/di-tru/nguon.js#dungBanChoMay`
· `src/chat/rap-prompt.js` (đọc kịch bản/bộ luật) · `kho-kich-ban.js#luuBan` · bảng
`kich_ban` (`db/schema.sql:271`) · `bo_luat_chung`. Đếm token bằng **Kimi thật**
(`max_tokens:1`, đọc `usage.input_tokens`) — CẤM dùng `estimateTokens` (lệch 1,9× với tiếng Việt).

**Ra:**

1. **Kịch bản page — hai bản thật.** Nút «tạo bản cho máy» (`luuBan`) gọi model **một lần**:
   dịch + nén `noi_dung_nguoi` sang tiếng Anh ngắn → `noi_dung_may`. Kèm mã băm của bản
   người (`bam_nguoi`). Bộ ráp prompt đọc `noi_dung_may` khi băm khớp; lệch/thiếu/lỗi dịch
   ⇒ **lùi về bản tiếng Việt như hôm nay** (fail-safe, cùng khuôn `khoiBoLuat`).
2. **Giữ nguyên văn khi dịch** (luật cứng của bộ dịch, và MÁY KIỂM sau dịch — lệch là
   từ chối lưu bản máy, không lên LIVE): mọi chuỗi trong ngoặc kép/«» (câu gửi khách, vốn
   là tiếng Anh/Tagalog), mọi con số, giá + đơn vị tiền, tên gói, URL, SĐT, emoji trong
   câu mẫu. Phép kiểm: tập {số, tiền, URL, chuỗi trong ngoặc} của hai bản phải BẰNG nhau.
3. **Màn Kịch bản** hiện hai cột Việt | máy (chỉ đọc cột máy), cờ «bản máy CŨ — bản
   Việt đã sửa sau lần dịch cuối», nút «dịch lại». Không cho sửa tay bản máy (giữ luật cũ).
4. **CORE — cùng khuôn, trong code.** `CORE_VI` = bản tiếng Việt (nguồn người đọc/duyệt,
   giữ nguyên 14 nguyên tắc) · `CORE` = bản tiếng Anh gọn, sinh bằng
   `ops/bin/dich-ban-may.mjs` rồi COMMIT (không dịch lúc chạy). Test giữ băm của `CORE_VI`
   trong bản EN: sửa bản Việt mà không dịch lại ⇒ đỏ. Đích **≤1.500 token Kimi đếm**.
   `bo_luat_chung` (CSDL) đi cùng khuôn với kịch bản (mục 1) nếu team có bản riêng.
5. **Mô tả tool + khối hồ sơ khách:** viết thẳng tiếng Anh gọn (chỉ dev đọc; chú thích
   tiếng Việt trong code). Tools đích **≤500 token** (từ ~1.210). Màn «Kimi đọc gì» vẫn
   hiện nhãn tiếng Việt — dịch ở tầng MÀN, không ở prompt.
6. **Canh điểm cache.** Sau khi rút gọn, đo lại tổng token system; nếu phần lẻ sau bội 512
   gần nhất >200 token thì dời khối/rút chữ cho điểm cache rơi sát cuối system. Ghi con số
   trước/sau vào nhật ký — **không** thêm `cache_control` mới (đã chứng minh vô tác dụng).
7. **Câu song sinh BH7 sót:** `dungBanChoMay` còn «dùng khi khách mới nhắn» — sửa giống
   `prompts.js` (BH7), vì từ phiếu này bot sẽ đọc bản máy.

## ③ Pathspec

```
src/prompts.js                          ← đã khai «Đụng bộ não»
src/tools.js                            ← đã khai «Đụng bộ não» — CHỈ chữ mô tả, không đổi schema/hành vi
src/context.js                          ← đã khai «Đụng bộ não» — (lượt này KHÔNG đụng, xem «Lệch»)
db/di-tru/nguon.js                      ← dungBanChoMay
db/di-tru/bo-luat-va-ky-nang.js         ← seed bo_luat_chung = CORE_VI
src/chat/rap-prompt.js
src/chat/dich-ban-may.js                ← MỚI: dịch + máy-kiểm giữ nguyên văn
v3/src/ui/kich-ban/
v3/src/vai-b.js                         ← CHỈ mối nối tuỳ chọn `dichBanMay`
v3/chay-that.js                         ← CHỈ nối `dichBanMay`
ops/bin/dich-ban-may.mjs                ← MỚI: dịch bản máy của kịch bản LIVE (dev)
ops/bin/dem-token-kimi.mjs              ← MỚI: đếm token thật từng khối, có ngân sách + dừng khi TPD
ops/bin/gia-lap-mot-minh.mjs            ← CHỈ thêm: dừng ở lỗi TPD đầu tiên
test/bh8-hai-ban.test.mjs
test/l4-prompt.test.mjs                 ← bảng 14 nguyên tắc đối chiếu trên CORE_VI + mẩu EN tương ứng
test/l2-m3-rap-prompt.test.js           ← CHỈ ca ⑥ (seed = CORE_VI)
v3/test/b/kich-ban.test.mjs             ← bỏ bản chép tay dungBanChoMay + 2 ca bộ dịch
ops/bin/nghiem-thu/bh8.sh
docs/thi-cong/nhat-ky/phieu-bh8.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```

**Lệch so với bản phiếu đầu (thợ ghi, 28/09):**
- KHÔNG migration `bam_nguoi`: bản người và bản máy luôn được ghi CÙNG một dòng, CÙNG một
  lần lưu ⇒ không thể lệch nhau; thứ cần biết chỉ là «bản máy đã dịch chưa» — dấu
  `DAU_BAN_MAY` ở đầu `noi_dung_may` trả lời việc đó, không cần cột mới, không cần deploy
  lược đồ.
- CORE EN do thợ dịch TAY, trung thành (không qua `dich-ban-may.mjs`): CORE là luật sống
  còn, cần người soát từng câu; băm `CORE_VI_BAM` vẫn canh lệch như phiếu dặn.
- Khối hồ sơ khách CHƯA chuyển tiếng Anh: ~120 token ≈ 3đ/lượt, trong khi màn «Kimi đọc
  gì» cho người vận hành đọc chính khối này và ~15 ca test đọc chữ của nó. Để phiếu sau.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh8.sh` + đo model

Máy (0 token):
- G1 bộ dịch GIỮ NGUYÊN VĂN: 5 kịch bản thật (Minty + 4 page đông nhất) — tập {số, tiền,
  URL, chuỗi trong ngoặc} hai bản bằng nhau; ca đột biến (bộ dịch đổi 109→110, mất một
  câu mẫu) ⇒ từ chối lưu.
- G2 fail-safe: `noi_dung_may` rỗng / băm lệch / lỗi dịch ⇒ prompt dùng bản tiếng Việt,
  và NÓI ra (`kb.banMayBiBo` + lý do), không im.
- G3 `CORE` sinh từ `CORE_VI` hiện hành (băm khớp); 14 nguyên tắc còn đủ ở CẢ hai bản.
- G4 `dungBanChoMay` không còn «khách mới nhắn».

Kimi thật — **ngân sách trước khi chạy**: đếm token ≤10 lời gọi (~90k token); phát lại
**30 lượt** Minty (không phải 60) × 3 lượt model ≈ 3 × 30 × ~6k ≈ **540k token**. Tổng
≤650k — chạy vào đầu ngày hạn mức, và `gia-lap-mot-minh.mjs` phải DỪNG ở lỗi TPD đầu tiên
(thêm cờ nếu chưa có — script đo, ngoài bộ não).

Đích (so nền BH7 trên cùng tập lượt):
- **≤50đ/lượt TB** · phần đầu vào KHÔNG cache ≤900 token/lượt (nền 2.466)
- CORE ≤1.500 · tools ≤500 · khối hồ sơ ≤250 — token **Kimi đếm**
- KHÔNG tụt: tin bị cửa ra chặn vì giá (`PRICE_MISMATCH`) không tăng; tin trả lời bằng
  đúng ngôn ngữ khách (không lọt tiếng Việt, không đổi sang tiếng Anh khi khách viết
  Tagalog) ≥ nền; ký tự p50 ≤ nền BH7 (253)
- 3 lượt không lệch nhau >15% ở đ/lượt

## ⑤ Nhánh test KHÔNG chạm

- Chất lượng dịch về NGHĨA (máy chỉ kiểm được con số/nguyên văn) — marketer soát trên màn
  hai cột; ghi rõ trong nhật ký là CHƯA có thước nghĩa.
- Khách thật phản ứng — gate deploy.

## ⑥ Ngoài phạm vi

`max_tokens` + cắt ở câu (BH3) · dọn tin ở cửa ra (BH3) · mở rộng mẫu 0 đồng (phiếu sau)
· sửa kịch bản Minty dạy ngược CORE (việc marketer — §9 N-BH7) · deploy.
