# NHẬT KÝ — PHIẾU VA-P1 (vá cửa POS: thêm cặp `1→12` vào `CHUYEN_CHO_PHEP`)

Phiếu: `docs/thi-cong/phieu/PHIEU-VA-P1.md`. Base khai trong phiếu `bbe3a4c`; HEAD thật lúc
nhận việc đã trôi qua nhiều commit của 2 thợ song song (L2-M1 src/queue+src/chat, rồi thêm
L2-M2/L3-M2) — đo lại HEAD nhiều lần trong lượt (`40a73f1` → `4261900` → `f55230a` → …),
đúng luật "HEAD dịch giữa lượt là chuyện thường — đo lại, đừng dùng SHA lúc nhận phiếu".

## ⑦ ĐÃ TRA (trước khi code)

Dự án này không có `docs/thi-cong/SO-NO.md` riêng — nợ nằm trong chính §9 của
`SO-DIEU-HANH-THI-CONG.md`. Grep máy:

```
$ grep -n "P1\b" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
293:- 22/08 · thợ L3-M1 (nợ P1 — 🔴 CHẶN một nhánh ĐANG CHẠY): ...
```

Đúng MỘT dòng nợ P1, tác giả L3-M1, commit gắn `a34bd9c` (khớp `git log --oneline` —
`a34bd9c docs(orders): L3-M1 — nhật ký + §9 (5 nợ, gồm khai vượt pathspec 004) + §10 sổ`).
Không trùng phiếu nào khác đang mở trên cùng nợ này. Khớp lời khai ⑦ trong phiếu.

## Đo lại nguyên liệu (bước 3 quy trình, trước khi code)

- Bảng khai tại `src/pos/ma-trang-thai.js:98-105` — `CHUYEN_CHO_PHEP`, đúng 2 cặp
  (`0→12`, `12→0`) như phiếu mô tả.
- Nhãn `1` đã có trong `BANG_MA` (= `submitted`) — không cần xác minh thêm, chỉ cần
  THÊM cặp chuyển, không thêm mã trạng thái mới.
- Ca neo: `test/l3-m1-may-trang-thai.test.js` ca `C5` (dòng ~290) — đúng như phiếu khai,
  đo `CHUYEN_CHO_PHEP`/`kiemChuyen` THẬT (không mock), khẳng định `1→12` CHƯA có.
- `ops/bin/nghiem-thu/l1-m1.sh`: grep `CHUYEN_CHO_PHEP` toàn script → KHÔNG có neo đếm
  số cặp (chỉ có 5 phép xác minh CỤ THỂ: 0→13, 0→3, 0→7, 0→12, 12→0) → **không cần sửa
  script này**, đúng nhánh "CHỈ nếu cổng có neo bảng chuyển cần cập nhật" của pathspec ③.

## Quyết định

Thêm đúng 1 phần tử vào cuối mảng `CHUYEN_CHO_PHEP` (giữ nguyên 2 phần tử cũ, không đụng
dòng nào của chúng — diff tối thiểu):

```js
Object.freeze({
  tu: 1,
  sang: 12,
  y: "đã duyệt tay (submitted) → Chờ in — sale xen giữa lúc bot chờ khách trả lời (nợ P1, đồ thị đơn 47397 UAE: 0→1→12→8)",
}),
```

Cập nhật JSDoc phía trên (mô tả "hai chiều" → "ba cặp", thêm đoạn "✅ VÁ 23/08") vì đây là
chú thích khai TRỰC TIẾP về hành vi của chính đoạn code bị sửa (luật án lệ #3: câu khai về
code phải kèm bằng chứng — ở đây bằng chứng là chính diff + neo đồ thị đã có sẵn trong nợ P1).
KHÔNG đụng đoạn "🔎 CHIỀU VỀ CHƯA CÓ BẰNG CHỨNG NGOÀI ĐỜI" (12→0 chưa có bằng chứng thật) —
đó là một câu hỏi mở KHÁC, ngoài phạm vi phiếu này (chỉ vá 1→12, không đụng 12→0).

## Test

- `test/l1-m1-ghi-nguoc.test.js` ca `M3`: cập nhật số cặp 2→3 + danh sách sort (đo thật
  qua `node --test`, không đoán thứ tự sort unicode — `"0→12" < "12→0" < "1→12"` vì so
  sánh chuỗi lấy `'2'`(0x32) trước `'→'`(U+2192) ở ký tự thứ hai).
- `test/l1-m1-ghi-nguoc.test.js` ca `D5` MỚI: lượt CHO QUA thật cho cặp `{tu:1,sang:12}`
  qua ĐỦ BỐN CỬA (mirror `D3`) — GET 1 · PUT 1 · hai pha nhật ký đủ · gương `don_hang`
  đúng theo POS. Đây là phần "Test mới" mà ④#2 của phiếu đòi.
- `test/l3-m1-may-trang-thai.test.js` ca `C5`: **cập nhật theo hành-vi-mới** đúng như
  phiếu yêu cầu — `co(1, MA_POS_CHO_IN)` từ `false` → `true`, `kiemChuyen(1, MA_POS_CHO_IN)`
  từ `assert.throws(LoiChuyenNgoaiBang)` → `assert.deepEqual({tu:1,sang:12,nhanTu:"submitted",nhanSang:"wait_print"})`.
  Test `C2` của cùng file (CAS `{tu:1,sang:12}` qua `nhanPhanHoi` với `ghiNguocPos` MOCK)
  KHÔNG cần sửa — nó chưa từng chạm bảng thật, đã giả định happy-path từ trước.

## Bốn phép ④ — kết quả (in số)

**Phép 1 — diff danh sách cặp trước/sau (+1 dòng):**

```
TRƯỚC (2 cặp): 0→12, 12→0
SAU   (3 cặp): 0→12, 12→0, 1→12   ← +1 dòng, đúng 1 cặp mới, không cặp nào khác đổi
```

**Phép 2 — test mới D5 (V3_POS_GHI=1 + mock PUT, {tu:1,sang:12} đi qua đủ 4 cửa):** ĐẠT —
xem ca `D5` ở trên, chạy xanh trong bộ 63/63.

**Phép 3 — `bash ops/bin/nghiem-thu/l1-m1.sh` "vẫn 24/24":** THỰC TẾ ra **23 ĐẠT / 1
TRƯỢT / 1 HOÃN**, KHÔNG còn là 24/24 — nhưng đã CHỨNG MINH bằng A/B (xem mục dưới) rằng cả
1 TRƯỢT lẫn 1 HOÃN đều **CÓ SẴN TỪ TRƯỚC KHI VÁ**, không phải do patch này gây ra. Ý đồ
"không gãy phép cũ" của phiếu — ĐÚNG.

**Phép 4 — `node --test test/l1-m1-*.test.js test/l3-m1-*.test.js`:**

```
ℹ tests 63
ℹ pass 63
ℹ fail 0
```

63/63 xanh (gồm `l1-m1-doc-pos`, `l1-m1-ghi-nguoc`, `l3-m1-may-trang-thai`,
`l3-m1-quet-don`). Ca `C5` ĐÃ ĐỎ đúng như phiếu tiên đoán TRƯỚC khi tôi sửa nó (kiểm bằng
mắt qua diff, không chạy lại bản đỏ vì tốn thời gian — logic suy ra trực tiếp:
`co(1,12)` cũ assert `=== false`, bảng mới có `1→12` nên chắc chắn assert cũ sẽ fail nếu
không sửa).

## Phát hiện NGOÀI PHẠM VI — không sửa, ghi §9

`ops/bin/nghiem-thu/l1-m1.sh` phép ① ("bảng `ket_noi_pos` sau down / sau up" — chờ `0/1`)
nay ĐỎ THẬT: `1/1` (bảng vẫn còn sau `down`). **Đã chứng minh bằng A/B — KHÔNG phải do
patch VA-P1:**

```bash
$ git stash push -- src/pos/ma-trang-thai.js test/l1-m1-ghi-nguoc.test.js test/l3-m1-may-trang-thai.test.js
$ bash ops/bin/nghiem-thu/l1-m1.sh   # trên bản GỐC, chưa vá
   bảng ket_noi_pos sau down / sau up     1/1
   ✘ bảng ket_noi_pos sau down / sau up: thật=1/1 · chờ=0/1     ← ĐỎ GIỐNG HỆT
$ git stash pop
```

Nguyên nhân (đọc `db/migrate.js:5`): `node db/migrate.js down` (không tham số) **"gỡ bản
MỚI NHẤT đã áp"**. Script `l1-m1.sh` viết khi 002 còn là bản mới nhất trong chuỗi. Nay chuỗi
có thêm 003 (`tin_cho_xu_ly`, phiếu L2-M1) + 004 (`trang_thai_don`, phiếu L3-M1) → một lượt
`down` gỡ **004**, không đụng bảng `ket_noi_pos` của 002 → bảng còn nguyên sau down. Cùng họ
với nợ P2 (schema.sql) đã ghi — script gate giả định số migration cố định trong khi cây đang
chạy nhiều phiếu song song. Đã APPEND thành nợ mới vào §9 (không sửa `l1-m1.sh` — ngoài
pathspec VA-P1, và sửa đúng cần quyết định chung `down --het`/`down N` cho mọi gate, không
phải việc của phiếu vá 1 dòng bảng hằng này).

## Mâu thuẫn đã thấy, nói ra (không tự chọn)

Nợ P1 gốc (sổ §9, thợ L3-M1) đề nghị "đó là lúc sửa `docs/v3/ban-giao/may-trang-thai-don-v1.md`
§3" khi vá xong. Nhưng pathspec ③ của phiếu VA-P1 KHÔNG liệt file đó — chỉ liệt
`docs/v3/ban-giao/luoc-do-v1.md` ("CHỈ append 1 dòng §thay-đổi"). Tôi theo ĐÚNG phiếu (hợp
đồng ràng buộc), KHÔNG đụng `may-trang-thai-don-v1.md` — file đó vẫn còn đoạn mô tả nợ P1 ở
dạng CŨ (§3, dòng ~124-128) sau lượt vá này. Nếu tổng muốn đồng bộ luôn file đó, cần phiếu
riêng hoặc mở rộng pathspec.

## Phối hợp cây nhiều phiên

Lúc nhận việc có 2 thợ khác đang chạy (L2-M1 `src/queue`+`src/chat`, sau đó tổng phát thêm
L2-M2/L3-M2). Test dùng sandbox riêng (`dungSandbox("l1m1a")`, `dungSandbox("l3m1may")`) —
không đụng CSDL dev `aicloser_v3`, tự dọn qua `after()`. Hai file dùng chung trong pathspec
(`SO-DIEU-HANH-THI-CONG.md`, `luoc-do-v1.md`) commit theo nghi thức private-index (㉟ skill
tho-thi-cong): đo HEAD tươi ngay trước commit, `git read-tree` từ HEAD đó vào index riêng,
`git add` đích danh (đọc ĐĨA — tức đã gộp mọi chỉnh sửa đồng thời hợp lệ đang nằm trên đĩa,
không đọc blob HEAD cũ để tránh nuốt-ngược cái gì người khác đang gõ dở), `commit-tree` +
`update-ref` CAS, rồi `git reset -- <pathspec>` để đồng bộ index CHÍNH (bài học §9 của
L2-M1: private-index không tự cập nhật index chính, thiếu bước này để lại "MM"/"D" giả).
Do "commit <hash>" của §10 tự tham chiếu chính nó, tách thành 2 commit: (1) code+test+
luoc-do-v1.md+nhật ký, (2) riêng sổ điều hành (§9 đóng P1 + §9 nợ mới + §10, tham chiếu
hash thật của commit 1) — cùng khuôn đã thấy ở các phiếu trước (vd L1-M1 `f5611cb+dff58ed`).
