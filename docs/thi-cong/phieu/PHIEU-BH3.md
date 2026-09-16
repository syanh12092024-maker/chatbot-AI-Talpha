# PHIẾU BH3 — Bot NÓI NHƯ NGƯỜI: tin ngắn lại, bỏ câu ép chốt, chặn 5 mẫu câu giết hội thoại

**Base:** `22561be` · **Làn:** 🟥 (đổi TRỰC TIẾP cách bot nói với 51 page
khách thật) · thợ **opus**
**Đụng bộ não:** `src/prompts.js` `src/closer.js` `src/outbound-guard.js` `src/tools.js`
— đây là phiếu về CÁCH NÓI, mà cách nói nằm trọn trong bốn file này.

> ⛔ **PHỤ THUỘC: BH1 phải ✅ trước.** Hai phiếu cùng đụng `tools.js` + `outbound-guard.js`
> ⇒ TUẦN TỰ (§0 luật 3). Thợ nạp `tho-thi-cong` + `viet-thuoc`.
> ⚠️ Phiếu này chạm cách bot nói ⇒ rào ② của §0a luật 4: **bắt buộc 3 lượt model** +
> đo lại `ops/bin/do-duong-ban.mjs`.

## ① Thi hành

Toàn bộ phiếu này thi hành **số đo 16/09 trên 719 hội thoại thật** (`do-duong-ban.mjs`),
không thi hành một tài liệu thiết kế nào — vì tài liệu đang nói NGƯỢC với dữ liệu:

| Số đo thật | Thiết kế hiện hành nói gì | Ai đúng |
|---|---|---|
| tin page **>300 ký tự** → khách trả lời **9,5%**; tin **21–80 ký tự** → **41,2%**; tin **tự soạn 151–300** → **50%** (cao nhất) | `closer.js:38` `max_tokens: 400` (≈550 ký tự; Sổ AI đo 182 token/tin) | **dữ liệu** |
| câu chốt kiểu «buy 1 get 1 hay buy 2 get 2?» : 430 lần → **71,4% khách im ngay sau**, chỉ 3% chọn gói | `CORE §9` bậc 3 dạy «chốt nhẹ bằng LỰA CHỌN, đừng hỏi có/không» | **dữ liệu** |
| hội thoại **có đơn** dùng **0,4** câu chốt/ht · **không đơn** dùng **0,7** (tương quan NGHỊCH) | `CORE §9` dạy mời chốt tối đa 3 lần | dữ liệu — giữ 3 lần nhưng ĐỔI hình thức |
| «any other questions?» → **90,5% im** · khan hiếm → **92,5% im** · «friendly reminder» → **94,3% im** · «still there?» → **78,7% im** | `CORE §9` chỉ cấm câu chờ thụ động («let me know po»), không cấm 4 mẫu này | **dữ liệu** |
| hội thoại **có đơn** nhận **1,7** ảnh · **không đơn** nhận **2,7** | `CORE §3` «GỬI NHIỀU LẦN, mỗi lần là ảnh MỚI» | **dữ liệu** |
| checklist «✔️Your full name…» là tin kéo được SĐT nhiều nhất (**64/140**), và chỉ 40,2% im sau đó — thấp nhất trong 6 mẫu | `CORE §4(c)` **cấm tuyệt đối** dán checklist | **dữ liệu** — nhưng có điều kiện, xem ②.4 |

## ② Vào/ra

**Vào (ĐO LẠI):** `prompts.js#CORE` (2.256 token, 10 mục) · `closer.js:38` ·
`outbound-guard.js` 11 luật hiện có (`EMPTY` `FAKE_SCARCITY` `PII_ECHO` `PRICE_MISMATCH`
`DELIVERY_PROMISE` `VIETNAMESE`…) · `tools.js#imageLimit` (4 ảnh/lượt, 2 cho page ngoài
pilot) · `prof.san_sang_mua` của **BH2**.

**Ra:**

1. **Trần độ dài THẬT.** `closer.js` `max_tokens: 400 → 160`, và `CORE §1` đổi
   «mỗi tin 1-3 câu» → **«mỗi tin 1–2 câu, dưới 260 ký tự»** (số đo được, không phải cảm
   giác). Đường lui: `MAX_TOKENS_TIN` trong `.env`, mặc định 160.
2. **Ladder chốt viết lại (CORE §9 mục 2).** Giữ «tối đa 3 lần, mỗi lần một góc», ĐỔI ba
   bậc:
   - ① gỡ đúng nỗi lo khách vừa nêu (giữ nguyên — đang đúng);
   - ② hạ rủi ro về 0 bằng COD (giữ nguyên — đang đúng);
   - ③ **XIN PHÉP TIẾN BƯỚC**, không bắt chọn gói: «Gusto niyo po bang i-reserve ko muna
     para sa inyo?» / «Shall I set one aside for you po?». ⛔ **Bỏ** mẫu «SET 1 or SET 2 po?».
3. **Năm luật guard MỚI** (`outbound-guard.js`), tất cả `action: 'rewrite'` — chặn thì
   khách không nhận gì, mà những câu này chỉ cần viết lại:
   - `CAU_HOI_THEM` — «any other questions / ano pa po ang gusto ninyong itanong»
   - `CAU_THUC` — «still there / still interested / just checking in»
   - `CAU_NHAC` — «friendly reminder / don't forget»
   - `CHOT_LUA_CHON` — «which combo/promo … or …» khi `!prof.san_sang_mua`
   - `TIN_QUA_DAI` — >300 ký tự ⇒ viết lại ngắn (đã có `canFixLocally` cắt tại chỗ:
     **dùng lại**, đừng gọi model)
   Khan hiếm đã có `FAKE_SCARCITY` — **không viết luật thứ hai**, chỉ mở rộng mẫu cho
   «ends at 11pm / sale ends tonight» (đo được 333 lần, 92,5% im).
4. **Checklist có ĐIỀU KIỆN** (đảo `CORE §4c`): được dán **đúng một lần/hội thoại** và
   **chỉ khi `prof.san_sang_mua === true`**; guard chặn mọi lần khác. Đây là chỗ duy nhất
   phiếu này **nới** một luật đang cấm — vì số đo nói nó là tin kéo SĐT tốt nhất, nhưng
   chỉ khi khách ĐÃ muốn mua.
5. **Ảnh: 2/hội thoại ở giai đoạn tư vấn.** `tools.js#imageLimit` đổi từ «mỗi lượt» sang
   «mỗi hội thoại khi `!san_sang_mua`»; sau khi khách muốn mua thì mở lại như cũ.
   `CORE §3` sửa «GỬI NHIỀU LẦN» → «gửi khi khách nghi ngờ hoặc xin xem; đừng rải».
6. **Cắt CORE.** Bỏ khỏi prompt những luật mà CODE đã cưỡng chế (guard/tool chặn được):
   cấm bịa mã đơn · cấm nói tổng sai · cấm đọc lại PII · cấm hứa ngày giao. Giữ nguyên
   phần DẠY BÁN. Đích: **2.256 → ≤1.500 token**, và `test/l4-prompt.test.mjs` (đối chiếu
   14 nguyên tắc) **vẫn phải xanh** — nguyên tắc chuyển từ PROMPT sang CODE thì sửa bảng
   đối chiếu trong chính test đó, không xoá nguyên tắc.

## ③ Pathspec

```
src/prompts.js                     ← đã khai «Đụng bộ não»
src/closer.js                      ← đã khai «Đụng bộ não»
src/outbound-guard.js              ← đã khai «Đụng bộ não»
src/tools.js                       ← đã khai «Đụng bộ não»
ops/bin/do-luot-model.mjs          ← MỚI: replay tin khách thật, đo tin AI sinh ra
test/bh3-noi-nhu-nguoi.test.js
test/l4-prompt.test.mjs            ← CHỈ sửa bảng đối chiếu nguyên tắc→nơi giữ
ops/bin/nghiem-thu/bh3.sh
docs/thi-cong/nhat-ky/phieu-bh3.md
README.md                          ← CHỈ bảng 14 nguyên tắc (cột «giữ ở đâu»)
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không đụng `context.js` (BH2) · `lead-score.js` (BH4) · `fast-lane.js` · `src/chat/`.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh3.sh`

```bash
node --test test/bh3-noi-nhu-nguoi.test.js      # kỳ vọng: 0 fail, ≥20 ca
node --test test/l4-prompt.test.mjs             # kỳ vọng: 0 fail — 14 nguyên tắc còn đủ

# G1 · 5 luật guard mới bắt ĐÚNG trên câu THẬT lấy từ mẫu (mỗi luật ≥3 câu thật)
# G2 · guard KHÔNG bắt nhầm: 100 tin page thật của hội thoại CÓ ĐƠN → chặn ≤8%
# G3 · checklist khi san_sang_mua=false → rewrite; =true lần 1 → pass; lần 2 → rewrite
# G4 · CORE ≤1.500 token (đo bằng chính hàm test l4 đang dùng)
# G5 · CORE không còn chuỗi "SET 1 or SET 2" / "combo 1 or combo 2"
# G6 · max_tokens đọc từ env, mặc định 160
# G7 · imageLimit: san_sang_mua=false → 2/hội thoại; =true → như cũ

# ═══ BA LƯỢT MODEL (rào ② §0a luật 4) — tốn tiền thật, chạy khi tổng gật ═══
node --env-file=.env ops/bin/do-luot-model.mjs --n 20 --lan 3
#   replay 20 tin khách THẬT (từ mau-duong-ban.json) qua runCloser với KB thật.
#   kỳ vọng, so với bản TRƯỚC khi sửa (chạy `--base` trên HEAD cũ):
#     · độ dài tin AI: p50 ≤260 ký tự   (nền: ~550)
#     · tin >300 ký tự:  ≤10%            (nền: phần lớn)
#     · câu giết/20 tin: 0               (nền: đếm ra bao nhiêu thì ghi bấy nhiêu)
#     · 3 lượt chạy KHÔNG lệch nhau quá 15% ở hai số đầu (đo tính bất định của model)
```

## ⑤ Test chạm nhánh thật

- `guardOutbound` chạy trên **tin page thật** trong `mau-duong-ban.json` (đã che PII) —
  cả chiều BẮT (câu giết) lẫn chiều KHÔNG BẮT NHẦM (tin của hội thoại có đơn). Bộ ca chỉ
  chạy một chiều là bộ ca nói dối (án lệ B-Y7: «ca khớp không chứng minh gì»).
- `runCloser` thật trong `do-luot-model.mjs` (3 lượt).
- Nhánh KHÔNG chạm được: khách thật phản ứng ra sao — đó là việc của gate deploy, không
  phải của phiếu.

## ⑥ Ngoài phạm vi

- Fast Lane cũng phát câu mẫu; mẫu của nó chưa soi bằng 5 luật mới → ghi §9.
- Kịch bản marketer trong `kb-overrides.json` **chính là nguồn** của phần lớn câu giết
  («LIMITED 60% OFF TODAY», «Do you wanna order 1 or 2 sets dear?» nằm trong `salesPrompt`
  của page). Sửa kịch bản là việc NGƯỜI (marketer), không phải việc thợ — ghi §8 việc người.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "max_tokens\|CORE" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | head -5
42:     41,2%), mà `closer.js:38` đang để `max_tokens=400`. Không sửa file não = không sửa
(còn lại là dòng của chính lượt audit 16/09 + seed CORE của L2-M3)

$ grep -rn "FAKE_SCARCITY" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(0 dòng — luật này chưa từng vào sổ nợ)
```

**Quan hệ: mới.** Neo `max_tokens` chỉ xuất hiện ở dòng 42 do chính lượt audit này viết
vào §0a, không phải nợ cũ. Phần seed `CORE` của L2-M3 là **bản dữ liệu trong CSDL**, khác
hằng `CORE` trong `prompts.js`; BH3 sửa hằng, và `khoiBoLuat()` vẫn ưu tiên bản CSDL khi
có — **phải kiểm lại quan hệ đó trong ca G4** (bản CSDL cũ dài 2.256 token vẫn thắng nếu
team đã áp; nếu vậy việc rút gọn không có tác dụng cho team đó → khai trong nhật ký).
