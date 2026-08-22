# NHẬT KÝ PHIẾU VA-T1 — Vá BỐN THƯỚC trôi theo cây sống (code nghiệp vụ KHÔNG đụng)

> Thợ **sonnet** · 22–23/08/2026 · phiếu khai base `550c4ec`, **HEAD thật lúc khởi công
> là `c391f63`** (một commit sau base — HEAD dịch giữa lượt là chuyện thường, đo lại
> theo luật) · làn 🟨 thước thuần · nghiệm thu: **13/13 cổng rc=0** (2 lượt liên tiếp
> nơi kiểm được) · `node --test` toàn bộ `l0-*,l1-*,l2-*,l3-*,va-*` **328 tests · 317
> pass · 0 fail · 11 skip** (2 lượt y hệt).

---

## 0 · Mục ⑦ phiếu — ĐÃ TRA (output máy)

Phiếu tự khai "nợ đã tra = chính 4 mục ①" (chẩn đoán tổng đã mổ sẵn), không có mục
"ĐÃ TRA CHƯA" riêng. Vẫn chạy lại theo luật để xác nhận không phiếu nào khác đã đóng
bốn chẩn đoán này trong lúc chờ:

```
$ grep -n "VA-T1\|known-answer\|l0-m1.sh\|l3-m1.sh.*⑦b\|l3-m2.sh.*005\|l2-m2-handler" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
3:> phán mới nhất: **12/12 MODULE PHẦN A XONG** ... đang chạy: VA-T1 🟨 (vá 4 thước trôi)
582:- 23/08 · TỔNG · gate toàn cục 13 cổng — 9 xanh · 4 đỏ đều là THƯỚC trôi theo cây sống
    (bo_luat +1 seed · 26→3.784 đơn · 006 sau 005 · fixture kb thiếu products + share PSID)
    → phiếu VA-T1; 1 bài học đo rc tách dòng; code nghiệp vụ 0 bug lộ ra ở gate.
```

Không phiếu nào khác đụng 4 điểm này giữa lúc soạn phiếu và lúc tôi khởi công (chỉ có
đúng dòng TỔNG lập phiếu). Xác nhận: làm thẳng theo ①, không có gì phải hỏi lại tổng
trước khi bắt tay.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code (án lệ #4)

Chạy thật cả 4 file mục tiêu trước khi sửa bất cứ gì (`node --test
test/l0-m1-luoc-do.test.js test/l0-m1-di-tru.test.js test/l0-m1-so-ai.test.js
test/l2-m2-handler.test.js`):

- **36 test, 35 pass, 1 fail** — chỉ `test/l2-m2-handler.test.js` ca "không cướp diễn
  đàn" đỏ (`actual: [], expected: ['stub AI reply']`), đúng như chẩn đoán #4. **S6 của
  `l0-m1-luoc-do.test.js` ("2/1/1") ĐANG XANH** — khác chẩn đoán #1 nói riêng cho file
  `.test.js`. Lý do đo được: `dungSandbox()` (`db/sandbox.js`) chỉ chạy `len()`
  (migration schema), KHÔNG chạy `db/di-tru/index.js` — nên seed mồi L2-M3
  (`bo_luat_chung` +1 dòng NULL) KHÔNG có mặt trong sandbox của bộ test Node. Bệnh
  "2/1/1 đếm tuyệt đối" thật sự chỉ vỡ ở **`ops/bin/nghiem-thu/l0-m1.sh`** — script đó
  CÓ gọi `node db/di-tru/index.js` ở phép ④ (di trú), nên seed mồi có mặt trước khi ⑦
  chèn 2 dòng test và đếm. "7 trượt" của chẩn đoán #1 là 7 phép trong CHÍNH SHELL SCRIPT
  (3 assert × 2 lượt gọi `kiem_2_den_8` + 1 assert bọc "⑨ vẫn đạt"), không phải 7 ca
  trong file test. Vẫn vá CẢ HAI nơi (script + file test) theo đúng khuôn phiếu đưa ra
  ("đếm DELTA... không đếm cả bảng") — file test tuy đang xanh nhưng cùng khuôn dễ vỡ
  nếu `dungSandbox()` sau này đổi cách seed; vá cùng lượt cho khỏi phải quay lại.
- **`db/migrate.js`** đọc kỹ: `xuong(pool,{het})` mặc định `het=false` → chỉ gỡ
  `xong.slice(-1)` (bản **MỚI NHẤT** theo `_migrations`), không phải bản theo số cứng.
  `ls db/migrate/` xác nhận có `006_lich_su_trang_thai.up/down.sql` (từ VA-Q12, commit
  `7c63859`) — đúng như chẩn đoán #3 nói "006 của VA-Q12". Đọc `006.up.sql`/`.down.sql`:
  chỉ 1 cột (`don_hang.status_history jsonb`), không đụng bảng/cột nào của 005 → an
  toàn để down 006 rồi down 005 rồi up lại cả hai theo đúng thứ tự.
- **`db/schema.sql` hoi_thoai:** `UNIQUE (page_id, psid)` — xác nhận khoá xác định một
  hội thoại. **`state.aiTurns`** (`src/chat/trang-thai.js:77`) = `luotLlm24h(moc_luot_llm,
now)` đọc từ ĐÚNG dòng `hoi_thoai` đó — xác nhận "ngân sách lạnh" khoá theo
  (team,page,psid), nên đổi PSID + tạo `hoi_thoai` mới là cô lập ĐỦ, không cần đổi gì
  khác (convId trong `tin_cho_xu_ly` chỉ ràng buộc UNIQUE (page_id,conv_id,msg_id), đổi
  theo cho sạch chứ không phải điều kiện của bug).

Không nguyên liệu nào của phiếu sai — 4 chẩn đoán đúng cả về HIỆN TƯỢNG lẫn NGUYÊN
NHÂN; chỉ riêng phạm vi "7 trượt" của #1 tôi xác minh lại là thuộc shell script, ghi rõ
ở đây để người sau khỏi đoán nhầm ý "test/l0-m1-*" nghĩa là ca `.test.js` đang đỏ.

---

## 2 · Bốn vá

### #1 — `ops/bin/nghiem-thu/l0-m1.sh` ⑦ + `test/l0-m1-luoc-do.test.js` S6

Đếm TUYỆT ĐỐI (2/1/1) → đếm **DELTA quanh đúng 2 dòng lượt này tự chèn** (đếm SAU trừ
đếm TRƯỚC, cho từng bối cảnh team). Bất biến với seed mồi hiện có (L2-M3) VÀ seed
tương lai (nếu di-tru thêm dòng nữa, delta vẫn đúng). Thêm helper `dem_ctx()` trong
script (định nghĩa lại mỗi lượt gọi `kiem_2_den_8`, không side-effect) — **không dùng
`declare -A`** (bash 3.2 trên macOS không có associative array, án lệ MEMORY dự án
khác) mà dùng 3 biến phẳng `T_TA/T_AU/T_PI` + `S_TA/S_AU/S_PI`.

### #2 — `ops/bin/nghiem-thu/l3-m1.sh` ⑦b

Hằng số chụp-thời-điểm `"26|26"` → bất biến `DEV_TRUOC` (đo NGAY sau khi `URL_DEV`
được chụp, TRƯỚC mọi phép ①–⑥ chạm sandbox) so với `DEV_SAU` (đo lại ở ⑦b, dùng lại
đúng câu SQL qua helper `dem_dev_don()`). So SAU≡TRƯỚC (delta=0) thay vì so với 26.
Đo thật: DEV hiện có **3.793** đơn (không phải 3.784 nhật ký L3-M4 nhắc — lệch vì có
thêm hoạt động khác trên dev giữa lúc đó và lúc tôi đo; không quan trọng vì thước mới
không neo con số nào). Cả 2 lượt chạy: `3793|3793 → 3793|3793`, khớp cả hai lượt.
Đồng thời sửa 2 chú thích đầu file còn ghi cứng "26 đơn thật" (dòng mô tả, không phải
assertion) cho khỏi trôi tiếp — GIỮ NGUYÊN dòng lịch sử ở comment ⑦b cũ ("vòng 1 …in
«26 đơn thật» ra 18|1") vì đó là tường thuật một sự kiện QUÁ KHỨ, không phải một điều
kiện đang hiệu lực.

### #3 — `ops/bin/nghiem-thu/l3-m2.sh` ⑦

`xuong(pool,{im:true})` gọi thẳng qua JS (không qua CLI `node db/migrate.js down`) nên
án lệ "gỡ bản mới nhất" vẫn trúng y hệt l1-m1.sh trước khi được vá — chỉ khác chỗ áp
khuôn: thêm vòng `while` lùi từng bản (gọi `xuong()` lặp, đọc lại `daAp(pool)`) tới khi
`xong[xong.length-1] === "005_loc_trung_va_ti_le_hoan"`, MỚI gọi `xuong()` một lần nữa
để gỡ đúng 005, đo `cotSauDown`, rồi `len()` áp lại toàn bộ phần thiếu (005 **và** 006).
Thêm chốt `bang` phụ in tên bản-chót-trước-khi-down để lượt sau nhìn thấy ngay nếu số
migration lại trôi tiếp (007, 008…) — vòng lặp có trần 10 lượt lùi, không vô hạn.
Chuỗi so sánh cũ (`chayLai=OK cotSauChayLai=5 cotSauDown=0 cotSauUp=5 bangTruoc=21
bangSau=21`) **giữ nguyên không đổi** — bằng chứng vá đúng gốc chứ không phải nới
thước cho qua.

### #4 — `test/l2-m2-handler.test.js`

6 ca CHIA SẺ một `PSID`/`hoi_thoai` (seed 1 lần ở `before()`) ⇒ `state.aiTurns`
(ngân sách lượt L2-M3 ②.2) là SỔ CHUNG của cả 6 ca. Ca "NHƯỜNG khi thiếu KB size"
(thứ 4) tiêu 1 lượt gọi `chayCloser` thật trên hội thoại chung; ca "không cướp diễn
đàn" (thứ 5) cần đi cùng đường (fastLane→classify→closer) trên CÙNG hội thoại thì bị
`conNganSach()` chặn ở bước 6b TRƯỚC khi tới `chayCloser` — không gửi gì. Đỏ cả khi cô
lập file (không phải nhiễu chéo file) vì bệnh nằm NGAY GIỮA các ca trong chính file này.

Vá: `motLuot()` tự tạo **PSID + dòng `hoi_thoai` riêng cho mỗi lượt gọi**
(`${PSID}-${msgSeq}`, insert `hoi_thoai` mới — `moc_luot_llm` mặc định rỗng ⇒ aiTurns
luôn khởi động từ 0), và `convId` cũng tách theo `msgSeq` cho nhất quán ("mỗi ca một
hội thoại riêng" đúng nghĩa đen). `before()` không còn seed 1 dòng `hoi_thoai` dùng
chung — chỉ còn seed `team`/`page` (không đổi theo ca). Rà cả 6 ca: chỉ ca 4 và 5 từng
chạm `chayCloser`; cô lập theo-ca loại bỏ toàn bộ họ bug này cho cả 4 ca còn lại, kể cả
nếu sau này ai thêm ca mới cũng chạm model.

---

## 3 · Quyết định + giả định đã ghi rõ (luật 11 skill)

- **Không lùi phạm vi lại chỉ-sửa-assertion-đỏ**: cả 4 vá đều bám ĐÚNG khuôn phiếu chỉ
  định (đếm DELTA / bất biến TRƯỚC≡SAU / lùi-bản-rồi-down / hội-thoại-riêng), không tự
  nghĩ cách khác kể cả khi cách khác ngắn hơn (vd: có thể "vá" #2 bằng cách chỉ đổi
  hằng số 26→3793, nhưng đó là lặp lại đúng bug — số lại trôi ở lượt seed tiếp theo).
- **Vá cả 2 nơi cho #1** (script VÀ file test) dù file test hiện đang xanh — xem §1,
  cùng khuôn cùng bệnh, chi phí vá gần bằng 0, để lại thì nợ tái phát đúng kiểu án lệ
  v3.1 "fix rồi, lượt mới fix lại".
- **KHÔNG đụng `ops/bin/nghiem-thu/l3-m2.sh:347`** (chuỗi "0/26 đơn" trong lý do HOÃN
  của mục ⑤ khác, đã lỗi thời sau backfill VA-Q12) — đây là text mô tả trong một
  `hoan()`, KHÔNG phải một phép `bang` bị chấm; phiếu khoanh rõ "nợ đã tra = chính 4
  mục ①", sửa thêm là mở rộng phạm vi ngoài phiếu. Không log §9 vì không ai cần hành
  động trên nó (không gate nào đọc con số đó).
- **QUÉT TRỌN HỌ (v3.1) phát hiện 2 nơi CÙNG KHUÔN "2/1/1 tuyệt đối" ngoài pathspec**:
  `ops/bin/nghiem-thu/l0-m2.sh` ⑤ và `test/l0-m2-cach-ly.test.js` C10. Cả hai ĐANG XANH
  (sandbox của chúng cũng không chạy di-tru, giống lý do S6 còn xanh ở §1) — không phải
  bug, không cần DỪNG. Đã ghi 1 dòng §9 theo đúng luật "kê danh sách nếu ngoài pathspec"
  thay vì tự tiện sửa. (Đối chứng: `ops/bin/nghiem-thu/l2-m3.sh` ② và
  `test/l2-m3-rap-prompt.test.js` ② tuy cũng đụng `bo_luat_chung` nhưng đo THEO ĐỊNH
  DANH dòng — `idDong.size===1` — không phải tổng số, KHÔNG cùng họ bug này.)
- **Không phát hiện bug code thật nào trong `src/**`** — cả 4 điểm đỏ đều là thước neo
  sai bất biến (known-answer trôi theo cây sống), đúng như chẩn đoán tổng. Không DỪNG,
  không báo — làm trọn phiếu.
- **HAI commit, không một** — pathspec ③ liệt kê docs CÙNG hàng với script/test, nhưng
  khuôn §10 đòi chính dòng nhật ký ghi `commit <hash>`, và một commit không thể tự
  tham chiếu hash của chính nó. Đối chiếu tiền lệ ngay trong repo (`git log`): mọi phiếu
  trước đều tách — `7c63859 fix(pos): VA-Q12…` rồi `bd2e78d docs(dieu-hanh): VA-Q12 —
sổ §9…+§10` ngay sau; `e97fcb1 feat(orders): L3-M4…` rồi `550c4ec docs(dieu-hanh):
L3-M4 — nhật ký…+§10`. Làm THEO ĐÚNG khuôn đã có: commit 1 = 5 file
  script/test (`9b5fadf`), commit 2 = nhật ký + §9/§10 (hash ghi trong chính §10 dưới
  đây). "commit pathspec ③" đọc là "mọi thứ trong ③ được commit, đúng luật `git add`
  theo pathspec — luật 5 §0 không nói MỘT commit" — không phải một giả định thầm lặng.

---

## 4 · Nghiệm thu

**13 cổng `ops/bin/nghiem-thu/{l*,va-*}.sh` — chạy TUẦN TỰ, rc đo TÁCH DÒNG:**

| #   | Cổng   | rc  | Nội bộ (ĐẠT/TRƯỢT/HOÃN)                         |
| --- | ------ | --- | ----------------------------------------------- |
| 1   | l0-m1  | 0   | 51/0 (chạy 2 lượt liên tiếp, y hệt)             |
| 2   | l0-m2  | 0   | 16/0                                            |
| 3   | l1-m1  | 0   | 24/0/1 hoãn                                     |
| 4   | l1-m2  | 0   | 15/0                                            |
| 5   | l1-m3  | 0   | 24/0/1 hoãn                                     |
| 6   | l2-m1  | 0   | 22/0                                            |
| 7   | l2-m2  | 0   | 8/0                                             |
| 8   | l2-m3  | 0   | 11/0                                            |
| 9   | l3-m1  | 0   | 34/0 phép/2 hoãn (chạy 2 lượt liên tiếp, y hệt) |
| 10  | l3-m2  | 0   | 14/0/2 hoãn (chạy 2 lượt liên tiếp, y hệt)      |
| 11  | l3-m3  | 0   | 23/0                                            |
| 12  | l3-m4  | 0   | 62/0/1 hoãn                                     |
| 13  | va-q12 | 0   | 17/0                                            |

13/13 rc=0, 0 dấu `✘` trong toàn bộ log (grep xác nhận), mọi HOÃN đều là hoãn CỐ Ý có
sẵn từ trước (thế-giới-thật/H1/dữ liệu chưa đủ), không liên quan 4 vá của phiếu này.

**`node --test` toàn bộ `test/l0-*.test.js test/l1-*.test.js test/l2-*.test.js
test/l3-*.test.js test/va-*.test.js` (25 file) — 2 lượt liên tiếp:**

- Lượt 1: `tests 328 · pass 317 · fail 0 · cancelled 0 · skipped 11` (rc=0)
- Lượt 2: `tests 328 · pass 317 · fail 0 · cancelled 0 · skipped 11` (rc=0) — **y hệt
  lượt 1**, không nhiễu thứ tự còn sót.

**Bất biến với dữ liệu tương lai (② của phiếu):** cả 4 thước giờ đo bằng DELTA/bất
biến TRƯỚC≡SAU/định danh bản migration — không còn thước nào neo một con số
chụp-thời-điểm. Chứng minh bằng chính lượt đo: l3-m1 ⑦b đã tự chạy trên 3.793 đơn thật
(khác hẳn 26 lúc phiếu gốc viết) mà vẫn xanh — đúng nghĩa "bơm thêm đơn không làm đỏ".

---

## 5 · Kết luận

4/4 chẩn đoán đúng, 4/4 vá theo đúng khuôn phiếu chỉ định, không sửa dòng nào trong
`src/**`. 13/13 cổng xanh, hồi quy 328 test (317 pass/11 skip có sẵn từ trước) ổn định
2 lượt. Không có finding nào cần DỪNG báo tổng.
