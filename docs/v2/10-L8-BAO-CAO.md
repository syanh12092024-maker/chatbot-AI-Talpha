# L8 — Botcake (chỉ đọc) + bảng kịch bản 2 cột · BÁO CÁO BÀN GIAO

> Nhánh `v2/l8-botcake` (nền `fix-images`). **Chưa commit, chưa deploy** — đúng ràng buộc.
> `npm test`: **236 test · 234 pass · 2 skip · 0 fail** (nền cũ 197/196/1/0 giữ nguyên).
> Server boot sạch, `/health` = 200. `.env` local có `PANCAKE_READONLY=1`.

---

## 1. Đã kiểm chứng lại API Botcake — tài liệu ĐÚNG

Gọi thật lên page nháp `1194048433791745` từ **máy local** (HTTP 200, không cần VPS):

| | Kết quả |
|---|---|
| Host | `https://botcake.io/api/public_api/v1` |
| Auth | header `access-token` |
| `GET /keywords` | 200 · **6 luật** · `{id, flow_id, is_activated}` — không có chữ từ khoá |
| `GET /flows` | 200 · `{data:{flows:[…11], folders:[]}}` |
| Luật đang bật | **5/6** (luật `Size, inches` đang TẮT) |
| Từ khoá bóc được | **6/6** luật (cả 6 flow gắn keyword đều có tiền tố `"Có chứa "`) |

Ba chi tiết đáng ghi vì tài liệu chưa nói:
- `/flows` trả **object** `{data:{flows,folders}}`, không phải mảng trần. Code nhận cả hai dạng.
- Tên flow thật có rác: hai dấu cách sau dấu phẩy, và `"not faded, not faded"` lặp — đã dedupe.
- 5/11 flow không đọc được từ khoá (`LẦN 1`, `Private Replies #1`…) **không phải luật keyword** —
  chúng không nằm trong `/keywords`. Nên **vùng mù thực tế của page nháp = 0**, không phải 5/11.

**Không có một hàm ghi nào** trong `botcake.js`, kể cả `send_flow`. Có test canh việc đó
(A1 quét mã nguồn tìm `method: 'POST'|'PUT'|'PATCH'|'DELETE'` và tên hàm nghe như ghi).

---

## 2. Đã làm

| # | Việc | File |
|---|---|---|
| ① | Client Botcake **chỉ đọc**: kho key theo page · cache 10' · lỗi im · `willBotcakeAnswer()` | `src/botcake.js` *(mới)* |
| ② | Báo cáo trùng lặp Botcake ↔ Fast Lane (TRÙNG / BỔ SUNG / VÙNG MÙ) | `src/botcake.js` |
| ③ | Bảng kịch bản 2 cột: đọc tab · validator 6 nhóm CẤM · so khớp §4 · 3 chỉ số/dòng | `src/rule-store.js` *(mới)* · `src/kb.js` *(chỉ THÊM)* |
| ④ | Nối bảng kịch bản vào Fast Lane (thắng mẫu cứng, thua lớp im lặng) | `src/fast-lane.js` |
| ⑤ | Router + màn hình quản trị 3 tab | `src/admin-rules.js` · `public/rules.html` *(mới)* |
| — | 1 dòng mount `admin.js` · 1 dòng link `admin.html` | đúng luật §3 |
| — | 39 test mới | `test/l8-botcake-rules.test.mjs` |

`git diff --stat` xác nhận: `kb.js` **61 thêm / 0 xoá**, `admin.js` và `admin.html` mỗi file **đúng 1 dòng**.

### Ba lựa chọn thiết kế đáng nêu

**a) Đọc lỗi ≠ "không có luật nào".** Cả hai đều cho ra mảng rỗng nhưng kết luận NGƯỢC nhau ở
cửa bỏ chờ. Bản đầu gộp chung — test A5 bắt được: mỗi lần Botcake sập là bot mở cửa nói chồng
lên Botcake **trên mọi hội thoại**. Nay `getKeywordMap()` trả thêm cờ `read`, và mọi ca không
chắc (`không key` · `đọc lỗi` · `có luật bật mà mù từ khoá`) đều **lệch về phía CHỜ**.

**b) Kết luận thứ tư: "thiếu KB".** Đo thật trên page nháp, luật `how much` ra **BỔ SUNG** —
nhưng không phải vì Fast Lane thiếu luật, mà vì page nháp **không có bảng giá trong KB** nên
`tpl_price` không dựng được câu. Gộp vào BỔ SUNG sẽ khiến người đọc giữ một luật Botcake mà lẽ
ra chỉ cần điền KB là hết trùng. Nay có cờ `kbGap` riêng và đề xuất khác hẳn: *"ĐIỀN KB TRƯỚC"*.

**c) Cờ `risky`.** Fast Lane leo lên AI vì hai lý do khác hẳn: *"cần AI thật sự"* (Botcake phủ
vào là được việc) và *cố ý đẩy lên AI vì nguy hiểm* (phản đối giá / có SĐT / ý định mua rõ).
Cả hai vẫn là BỔ SUNG, nhưng ca thứ hai được gắn cờ — Botcake bắn mẫu vào đó là bắn vào chân mình.

---

## 3. Báo cáo trùng lặp — số đo trên page nháp

Với KB **có bảng giá** (ca production bình thường) — test A8 khoá cứng con số này:

```
BẬT  TRÙNG    how much, Magkano, Mgkanu, magkno, price      → tpl_price   → đề xuất TẮT
BẬT  TRÙNG    How many days, when deliver                   → tpl_ship    → đề xuất TẮT
BẬT  TRÙNG    Free delivery                                 → tpl_ship    → đề xuất TẮT
BẬT  BỔ SUNG  pawnable, real, original, legit, saudi gold…                → GIỮ
BẬT  BỔ SUNG  don't have any money yet                                    → GIỮ
tắt  —        Size, inches, inchs, inch                                   → (đang tắt)
```
**3 TRÙNG · 2 BỔ SUNG · 1 tắt** — khớp đúng nghiệm thu.

Chạy trên máy này (page nháp **không** nằm trong KB) ra **2 TRÙNG · 3 BỔ SUNG, trong đó 1 là
`kbGap`** — cùng một sự thật, chỉ khác chỗ thiếu bảng giá. Đây là bằng chứng cờ `kbGap` cần thiết.

**Không có route nào tự tắt luật.** API không cho, và báo cáo chỉ đề xuất — người quyết.

---

## 4. Bảng kịch bản 2 cột

Tab Google Sheet `Kịch bản tự động`, ánh xạ cột theo **tên header** (chèn/đổi cột không vỡ):
`Page ID · Tình huống · Từ khoá bắt · Câu trả lời tự động · Gợi ý cho AI · Điều kiện · Ưu tiên · Trạng thái · Nguồn`

Bốn cách kết hợp hai cột chạy đúng như §1 (test D1–D3). Thứ tự ưu tiên §4 chạy đúng (C1–C2).
Chống lặp: một dòng chỉ bắn **tối đa 1 lần/khách**; hỏi lại → lên AI **kèm gợi ý của chính dòng đó**.

### Validator — mọi lựa chọn đều lệch về phía KHÔNG BẮT

Chặn **cứng**: dòng không qua validator thì `live=false`, **không bao giờ chạy** dù người ghi `BẬT`
(test B11). 6 nhóm CẤM §2 đều có test chạy trên danh sách từ khoá thật (B1–B6), cộng:

- từ khoá **<3 ký tự** bị chặn — khớp theo **ranh giới từ** đã cứu `no` khỏi `now`, nhưng `po`
  (rải khắp mọi câu Tagalog) thì không cứu được, phải chặn thẳng;
- dòng **không có cả câu trả lời lẫn gợi ý** → vô nghĩa, chặn;
- câu trả lời phải qua **M09 Outbound Guard** + không lọt tiếng Việt;
- gợi ý cho AI bị soi **prompt-injection** (`RULE_OVERRIDE`) — HARD_RULES luôn thắng;
- **giá được soi LẠI ngay lúc bắn**, không chỉ lúc nạp: bảng giá đổi trên Sheet bất cứ lúc nào
  còn bảng luật thì cache, giữa hai lần nạp có cửa sổ một dòng đã-hợp-lệ đang nói giá đã chết
  (test D6). Đây là quy tắc tiền hạng sống còn.

### Ba chỉ số/dòng

`Lượt dùng` · `Hỏi lại ngay` · `Im sau đó` đo được **không cần sửa `handler.js`**: nhận diện hội
thoại bằng chính `state.fastLanesUsed` (mỗi khách một `Set`, sống đúng bằng đời hội thoại) qua
`WeakMap`. `Im sau đó` chỉ tính lần bắn **đã quá hạn chờ 30'** — lần vừa bắn là *chưa biết*, gộp
vào sẽ luôn thổi phồng chỉ số (test E2). Đề xuất hạ dòng chỉ bật khi **≥20 lượt** (E4).

**`Chốt sau đó` = CHƯA ĐO**, cờ `closedWired:false` nói thẳng để không ai đọc nhầm thành "chốt 0%".

---

## 5. 🔌 CÁCH NỐI — việc của L0 khi gộp

Bốn chỗ, đều nằm ở file **không thuộc quyền L8**. Không nối thì hệ thống vẫn chạy đúng như
trước, chỉ là thiếu tính năng — **không có chỗ nào gây lỗi nếu bỏ qua**.

### ① `pancake-poll.js` — bỏ chờ có chọn lọc (giá trị lớn nhất)

Hiện chờ `BOTCAKE_GRACE_MS = 6s` cho **mọi** hội thoại. Thêm ngay trước dòng chờ (~dòng 222):

```js
import { willBotcakeAnswer } from './botcake.js';
// …
if (BOTCAKE_GRACE_MS > 0 && await willBotcakeAnswer(pageId, text)) await sleep(BOTCAKE_GRACE_MS);
```

> ⛔ **CỬA ② (soi lại NGAY TRƯỚC KHI GỬI) PHẢI GIỮ NGUYÊN MÃI MÃI.** Danh sách từ khoá không cho
> biết flow có điều kiện phụ, đã chạy cho khách này chưa, và **chào tự động / auto-reply comment /
> broadcast KHÔNG đi qua keywords**. Bỏ cửa ② là mở lại đúng va chạm mà cả hai cửa sinh ra để chặn.

### ② `handler.js` — 1 dòng: truyền `pageId` vào `fastLane()`

```js
const fl = fastLane({ text, kb, pageId, /* …giữ nguyên phần còn lại… */ });
```
Không có dòng này thì **dòng kịch bản có Page ID cụ thể không bao giờ chạy** — chỉ dòng dùng chung
chạy. (Tạm thời `fast-lane.js` dò ngược từ `kb.pageName` khi tên đó là duy nhất, nhưng đó là vá,
không phải cách đúng.)

### ③ `handler.js` — nạp `aiHint` vào prompt khi leo lên AI

`fastLane()` nay trả thêm `fl.aiHint` (cột "Gợi ý cho AI" của dòng vừa khớp) ở **mọi lối leo lên
AI**, kể cả lối thoát an toàn. Nối vào `buildSystem`/messages của lượt đó. Bỏ qua trường này thì
mọi thứ chạy y như trước.

Kèm theo (tuỳ chọn): truyền `hasOrder` để điều kiện `chưa có đơn` đánh giá được — hiện trả
`'unknown'` nên dòng đó **không bắn mẫu**, chỉ đưa gợi ý (an toàn, nhưng chưa dùng hết).

### ④ `handler.js` / `ai-log.js` — đo `Chốt sau đó`

Khi `create_draft_order` thành công: `noteRuleOrder(state.fastLanesUsed)` (từ `rule-store.js`),
rồi đổi `closedWired` thành `true`. Đúng bài hơn là ghi `rule = fl.rule` vào Sổ AI như §6 bước 4
của `07-KICH-BAN-TU-DONG.md` — nhưng `ai-log.js` là file của L1.

### ⑤ 1 dòng `.gitignore` — nếu muốn số đo sống qua restart

Số đo hiện **chỉ nằm trong RAM** (cố ý: `.gitignore` không thuộc quyền L8, một file dữ liệu mới ở
gốc repo có nguy cơ bị commit nhầm). Muốn lưu bền: đặt `RULE_METRICS_FILE=rule-metrics.json`
trong `.env` **và** thêm `rule-metrics.json` vào `.gitignore`.

---

## 6. Nghiệm thu

| | Tiêu chí | |
|---|---|---|
| ✅ | `npm test` xanh, nhóm Fast Lane không hỏng | 236 test · 0 fail (nền 197 giữ nguyên) |
| ✅ | Server boot sạch, `/health` = 200 | đã chạy |
| ✅ | `botcake.js` đọc đúng 6 keyword + 11 flow với key page nháp | gọi API thật |
| ✅ | Page không có key → rỗng êm, luồng chat vẫn chạy | test A4/A5 — không gọi cả mạng |
| ✅ | Báo cáo trùng: 3 TRÙNG / 2 BỔ SUNG / 1 tắt | test A8 (KB có giá); trên máy này page nháp thiếu KB → 2/3+kbGap |
| ✅ | Validator chặn 100% từ khoá 6 nhóm CẤM | test B1–B6 trên ~60 từ khoá thật |
| ✅ | Không key nào lộ trong log / HTML / commit | quét toàn repo + log server = 0; API chỉ trả 6 ký tự đuôi |
| 🔴 | **Chạy lại trên ≥5.000 tin khách THẬT: 36,2% → 45–50%** | **CHƯA CHẠY ĐƯỢC** — xem dưới |

### Vì sao phép đo cuối chưa chạy được — và nó sẽ ra bao nhiêu

Hai chặn, **cả hai đều không nằm trong code**:

1. **Không có dữ liệu tin khách ở local.** Token Pancake ở máy này trả lỗi 121 trên mọi page;
   hội thoại thật chỉ kéo được **trên VPS**. Đã dựng sẵn test `F1` theo đúng khuôn
   `AI_LOG_FIXTURE` của `economics.test.mjs` — có dữ liệu là chạy được ngay:
   ```
   L8_MSG_FIXTURE=/đường/dẫn/tin-khach.jsonl npm test
   ```
   Mỗi dòng `{"page":"<pageId>","conv":"<convId>","text":"<tin khách>"}`.
   Test **đỏ ở cả hai đầu**: `>60%` (bắt nhầm tin cần AI) và `<25%` (có gì đó hỏng).

2. **Tab `Kịch bản tự động` chưa có dòng nào.** Đây mới là chặn thật. Cơ chế đã xong và đo được,
   nhưng **bảng rỗng thì tỷ lệ đứng nguyên 33,7%** — không có dòng kịch bản nào để bắn.

> 👉 Nói thẳng: **45–50% không thể đạt bằng code.** Nó là hàm của việc marketer điền bao nhiêu
> dòng vào tab, mà trần lý thuyết cũng chỉ ~50% (3.259 tình huống khác nhau trong 3.827 tin —
> đuôi cực dài). Con số 36,2% trong tài liệu cũng đã được L0 đo lại thành **33,7%** trên 7.886 tin
> thật. Bất kỳ báo cáo nào nói đã đạt 45–50% mà tab còn rỗng đều là báo cáo sai.

---

## 7. Việc chỉ chủ dự án làm được

| # | Việc | Vì sao |
|---|---|---|
| 1 | **Chuyển key Botcake vào `.env`** dạng `BOTCAKE_TOKENS=1194048433791745:<key>` | key thử nghiệm đang nằm ở `../file.txt` ngoài repo; code chỉ đọc từ `.env` |
| 2 | **Key Botcake cho ≥1 page THẬT** | key là **page-scoped** — 277 page = 277 key. Mới có key page nháp, chưa kiểm lại được trên page có khách thật |
| 3 | **Điền tab `Kịch bản tự động`** trên Google Sheet | không có dòng nào thì Fast Lane đứng nguyên 33,7% |
| 4 | **Tắt 3 luật Botcake trùng Fast Lane** (giá · số ngày giao · free delivery) | API không cho ghi — phải vào Botcake làm tay. Thử 1 page trước |
| 5 | **Kéo mẫu ≥5.000 tin khách từ VPS** để chạy `L8_MSG_FIXTURE` | local không đọc được Pancake (lỗi 121) |

Và hai chặn cũ của vòng 2 vẫn nguyên: **nạp tiền Kimi** · **L0 deploy + theo dõi 48h trước vòng 2**.

---

## 8. Cái CHƯA làm (có chủ ý)

- **Bước 5 của `07-KICH-BAN-TU-DONG.md` (vòng học đêm)** — đó là L9 vòng 3. Đã dựng sẵn trạng thái
  `CHỜ DUYỆT` để L9 đổ đề xuất vào mà không phải sửa `rule-store.js`.
- **Mọi phương thức ghi lên Botcake**, kể cả `send_flow`.
- **Màn hình SỬA kịch bản trên dashboard** (bước 3 §6): nguồn sự thật là Google Sheet, và M02
  Script Studio đã có ô sửa cho `kb-overrides`. Dựng thêm một ô sửa thứ hai ghi ngược lên Sheet là
  đẻ ra hai nguồn sự thật cho cùng một bảng. Thay vào đó `public/rules.html` cho **xem đầy đủ +
  validator tại chỗ + nút "Thử 1 tin" chạy khô**, còn sửa thì bấm sang Sheet.
