# PHIẾU BH2 — Hồ sơ khách ĐỌC ĐƯỢC Ý: nhu cầu · đã hỏi · đã từ chối · sẵn sàng mua

**Base:** `22561be` · **Làn:** 🟨 (chỉ đổi NGỮ CẢNH đưa vào model, không mở đường gửi)
· thợ **sonnet**
**Đụng bộ não:** `src/context.js` — hồ sơ khách sống ở đây, và đây là file cả v2 lẫn v3
cùng gọi (`handler.js:16`, `handler-v3.js:68-73`).

> Thợ nạp `tho-thi-cong` + `viet-thuoc`. Phụ thuộc: KHÔNG (làm song song BH1 được —
> khác pathspec hoàn toàn).

## ① Thi hành

- Đo 16/09 trên 719 hội thoại thật (`ops/bin/do-duong-ban.mjs`): hội thoại **có đơn** có
  9,6 tin khách và cần **7,1 lượt page** mới lấy được SĐT. Tức bot phải nhớ được khách đã
  nói gì qua 7+ lượt — hồ sơ hiện tại (`context.js#emptyProfile`) chỉ nhớ *dữ liệu đơn*
  (tên/SĐT/địa chỉ/gói/COD), **không nhớ khách CẦN GÌ**.
- `README.md` nguyên tắc 4 — «không hỏi lại thứ khách đã cho». Hiện chỉ đúng với 5 trường
  đơn hàng; khách hỏi giá 3 lần vẫn bị trả lời như lần đầu.
- `docs/v2/02-TANG-LUONG-CHAT.md` §M07 — hồ sơ nén ~150 token.

## ② Vào/ra

**Vào (ĐO LẠI):**

- `src/context.js#emptyProfile()` — 13 trường hiện có. `extractFromText` chỉ rút
  tên/SĐT/địa chỉ/tier/COD + `objections` (3 loại).
- `src/lead-score.js#scanSignals(text)` — **đã** nhận 12 tín hiệu (`price`, `ship`,
  `warranty`, `howuse`, `image`, `buy`, `obj_*`…). BH2 **dùng lại**, không viết regex thứ hai.
- `buildProfileBlock()` — khối đưa vào model, đang viết **tiếng Việt**, đo được 150–250
  token. Ngôn ngữ khách thật: **en 88,5% · tl 9,6% · ar 1,9%**.
- Ý định tin khách thật (đo 3.027 tin): hỏi giá 11,2% · ship 4,6% · muốn mua 3,6% ·
  thật/giả 1,5% · size 1,1% · giao tới đâu 1,2% · chê đắt 0,1%.

**Ra:** bốn trường mới trong `prof`, tất cả rút **bằng regex, 0 token**:

| trường | rút từ đâu | dùng để làm gì |
|---|---|---|
| `nhu_cau` | câu khách tả vấn đề (răng vàng · bụng đầy · tóc rụng · da mụn…), tối đa 60 ký tự **nguyên văn của khách** | AI tư vấn ĐÚNG cái khách đau, không dội bài chào hàng |
| `da_hoi` | `scanSignals` → `['price','ship','howuse'…]` | ⛔ không trả lời lại thứ đã trả lời |
| `da_tu_choi` | câu khách từ chối/hoãn, nguyên văn ≤60 ký tự + đếm lần | lần mời sau đổi GÓC thật, không lặp lời cũ |
| `san_sang_mua` | bật khi có tín hiệu `buy`, hoặc khách hỏi cách đặt/chốt gói | **cổng cho BH3**: chỉ khi cờ này bật mới được xin thông tin giao hàng |

Và: `buildProfileBlock()` viết lại **bằng tiếng Anh**, đích **≤110 token** (nay 150–250).
Giữ nguyên mọi trường đang có — đây là nén chữ, không phải bỏ dữ liệu.

## ③ Pathspec

```
src/context.js                     ← đã khai «Đụng bộ não»
test/bh2-ho-so-khach.test.js
ops/bin/nghiem-thu/bh2.sh
docs/thi-cong/nhat-ky/phieu-bh2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ← §9 + §10
```

⛔ Không sửa `lead-score.js` (đọc qua import) · không sửa `prompts.js` (BH3 lo) ·
không sửa `handler.js`/`handler-v3.js` — bốn trường mới đi theo `prof` sẵn có, hai handler
đã truyền `prof` rồi, không cần đổi dòng nào.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/bh2.sh`

```bash
node --test test/bh2-ho-so-khach.test.js        # kỳ vọng: 0 fail, ≥16 ca

# G1 · "my teeth are yellow and I have bad breath" → nhu_cau khớp, KHÔNG rỗng
# G2 · khách hỏi giá 3 lần → da_hoi chứa 'price' ĐÚNG MỘT lần (không nhân bản)
# G3 · "mahal po" → da_tu_choi[0] nguyên văn, lan=1; nói lại lần 2 → lan=2
# G4 · "pano mag order" / "I want to buy 2" → san_sang_mua === true
# G5 · "how much" đơn thuần → san_sang_mua === false  (hỏi giá ≠ muốn mua)
# G6 · hồ sơ ĐẦY ĐỦ mọi trường → khối prompt ≤110 token (estimateTokens)
# G7 · khối prompt KHÔNG chứa ký tự tiếng Việt có dấu (đo bằng regex)
# G8 · prof cũ (13 trường, đọc từ conv-state thật) nạp vào không ném, 4 trường mới = mặc định

# ĐO THẬT trên mẫu 719 hội thoại — không phải fixture tự dựng:
node ops/bin/do-duong-ban.mjs --json > /tmp/bh2-truoc.json   # 6 số không được xấu đi
```

## ⑤ Test chạm nhánh thật

- `hydrateProfile()` chạy trên **hội thoại thật lấy từ `mau-duong-ban.json`** (đã che PII),
  không phải mảng tin tự bịa: đó là cách duy nhất biết regex có bắt được văn phong thật
  (Taglish viết tắt, chữ hoa kiểu `ᴄᴀᴛʜᴇʀɪɴᴇ`, emoji chen giữa từ).
- Nhánh KHÔNG chạm được: `absorbToolUses` với tool thật (cần lượt model) — khai nhật ký.

## ⑥ Ngoài phạm vi

- `handler.js` vẫn gọi `extractFromText(text, prof)` **sau** `runCloser` (dòng 348), tức
  tin của lượt này chỉ vào hồ sơ ở lượt SAU. Đúng-sai chưa rõ, cần đo — ghi §9, không sửa.
- `otherBot` (5 cờ) trùng ý với `da_hoi` một phần → gộp ở phiếu sau.

## ⑦ ĐÃ TRA CHƯA — output máy

```
$ grep -n "nhu_cau\|da_tu_choi\|san_sang_mua\|buildProfileBlock" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
(0 dòng)
$ grep -rn "nhu_cau\|san_sang_mua" src/ test/
(0 dòng)
```

**Quan hệ: mới.** Không trùng phán quyết cũ, không trùng nợ.
