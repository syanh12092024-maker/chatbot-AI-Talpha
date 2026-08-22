# NHẬT KÝ PHIẾU L2-M1 — Đường xử lý tin nền mới: hàng đợi + handler v3, MỌI outbound qua cửa

> Thợ: session L2-M1 (opus) · 22/08/2026 · Base phiếu `f4946f5` · làn 🟥
> Phiếu: `docs/thi-cong/phieu/PHIEU-L2-M1.md` (bản v2) · cổng: `ops/bin/nghiem-thu/l2-m1.sh`
> Bàn giao: `docs/v3/ban-giao/duong-tin-v1.md` · lược đồ: `luoc-do-v1.md` §9 (bản 003)

---

## 0 · Mục ⑦ — ĐÃ TRA (output máy, chạy trong chính lượt này)

```
$ ls src/queue src/chat 2>/dev/null
→ (rỗng — chưa tồn tại, đúng như phiếu khai)

$ grep -n "so_ai" src/*.js | wc -l
0                        ← không file phẳng nào ghi bảng so_ai (nền tảng của N5)

$ grep -rn "so_ai" src/ | grep -v "^src/chat/"
src/db/truy-van.js:42:  "so_ai",   ← chỉ là tên trong BANG_NGHIEP_VU_CHUAN

$ grep -n "tools.js\|scheduler-followup" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
→ 1 dòng nợ N2 (L1-M2, 22/08) — phiếu này NHẬN và đóng bằng kiến trúc
```

---

## 1 · ĐO LẠI MỤC ② TRƯỚC KHI GÕ PHÍM (bước 3 skill · án lệ #4)

Phiếu ② khai bốn lời; đo lại từng lời trên cây `a5a5411`:

| Lời khai của phiếu                                        | Đo được                                                                                                                                                      | Phán    |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| 3 chỗ gửi ngầm `tools.js:197 / :266 / :271`               | ĐÚNG TỪNG SỐ DÒNG. `:197` `pkTagByName(config.pkTags.order)` · `:266` `pkTagByName(config.pkTags.handoff)` · `:271` `await pkAddNote('🙋 AI CHUYỂN NGƯỜI…')` | ✅ đúng |
| «BA chỗ gửi ngầm còn lại»                                 | ❌ **SAI SỐ LƯỢNG — thực đo NĂM đường thoát** (xem §2)                                                                                                       | ⚠️ LỆCH |
| Đường Graph `tools.js:2` → `sendImage` của `messenger.js` | ĐÚNG. `tools.js:104` là nhánh `else` của `sendImageWithRetry` (khi thiếu `pkConvId`/`pkCustId`), không kiểm READONLY                                         | ✅ đúng |
| Cờ `state.orderCreatedThisTurn`                           | ĐÚNG. `handler.js:154` reset đầu lượt · `tools.js:191` đặt `true` sau khi chốt. Kèm `state.closed` ở `tools.js:188`                                          | ✅ đúng |
| `config.autoCreateOrder` đang TẮT                         | ĐÚNG — `.env:34 AUTO_CREATE_ORDER=0` ⇒ `config.autoCreateOrder === false`                                                                                    | ✅ đúng |

**Khuôn `state` mà `runCloser` cần** (đo từ MÃ, không chép tài liệu — `closer.js` +
`tools.js` + `fast-lane.js`, đối chiếu `handler.js:120-160`):

```
closer.js:18  lastUsage      · :28 messages      · :29 pageId/custName/psid
tools.js:97   pkConvId/pkCustId · :146 sentImages · :155 pendingImages
       :166   pendingCaption · :171 sentImageTurn · :188 closed
       :191   orderCreatedThisTurn · :262 handoff/handoffReason · :100 selfSent
fast-lane.js:262  aiTurns · lastAiText · idleMs · usedLanes · pageId
```

Ba số đo phụ, mỗi cái đổi một quyết định thiết kế:

- **`config.pkTags.*` KHÔNG rỗng** (mặc định `'AI Chốt'` / `'AI back Sale'`, `.env` không
  đè) ⇒ ba chỗ gửi ngầm **chắc chắn bay** khi nhánh chạy. Nếu chúng rỗng thì phép ④#4b/c
  sẽ xanh vì «nhánh không chạy» — đúng cái bẫy phiếu cảnh báo.
- **`classifier.js` nay 0 token** (`grep anthropic src/classifier.js` = 0 dòng, chỉ còn một
  comment nói «KHÔNG còn `__usage`»). Nhạc trưởng v3 không phải cộng token classifier.
- **`node v25.8.0` KHÔNG có `mock.module`** nếu thiếu cờ: `typeof mock.module === 'undefined'`;
  với `--experimental-test-module-mocks` thì `'function'`. Phiếu khai «node v25 có
  mock.module» — đúng một nửa. `package.json` cấm đổi ⇒ cổng truyền cờ, bộ ca tự bỏ qua
  có tuyên bố khi thiếu cờ.

---

## 2 · 🔴 PHÁT HIỆN LỚN NHẤT CỦA LƯỢT — NĂM đường thoát, không phải BA

Phiếu ② khai «BA CHỖ GỬI NGẦM còn lại nằm trong `executeTool`». Đo lại: **NĂM**. Hai chỗ
mới đều gọi **GIÁN TIẾP**, nên `grep` trong `tools.js` không thấy chúng:

| #     | Chỗ gọi                                                                                     | Làm gì                                                                               | Phát hiện bằng                                  |
| ----- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- |
| 1     | `tools.js:197`                                                                              | `pkTagByName(pkTags.order)`                                                          | đọc mã                                          |
| 2     | `tools.js:266`                                                                              | `pkTagByName(pkTags.handoff)`                                                        | đọc mã                                          |
| 3     | `tools.js:271`                                                                              | `pkAddNote('🙋 AI CHUYỂN NGƯỜI…')`                                                   | đọc mã                                          |
| **4** | `order-bridge.js:255` ← `tools.js:208 recordClosedOrder`                                    | `pkAddNote(<ghi chú đơn theo mẫu chuẩn>)`                                            | đọc mã (một tầng sâu)                           |
| **5** | `pancake-orders.js:25` và `:108` ← `tools.js:171 ordersEnabled() && conversationHasOrder()` | **fetch HTTP tới POS pages.fm bằng KHOÁ THẬT của 7 shop** trong `pancake-shops.json` | **bẫy `globalThis.fetch` trong bộ ca — 7 lượt** |

**Chỗ #5 là chỗ đắt nhất, và nó chỉ lộ ra vì bộ ca có bẫy `fetch`.** Lượt chạy đầu tiên
của `test/l2-m1-nhac-truong.test.js` in `fetch-lọt=7` ở dân số b, **trong khi bảng đếm
`pancake.js` + `messenger.js` vẫn sạch trơn**. Tức là: nếu bộ ca chỉ mock đúng hai module
mà phiếu khai, phép ④#4 sẽ **XANH GIẢ** trong khi bảy lượt HTTP mang khoá thật vẫn bay đi.

Ba thứ làm chỗ #5 nguy hơn ba chỗ kia:

- `grep -n "PANCAKE_READONLY" src/pancake-orders.js` → **0 dòng**. Van an toàn của máy dev
  (luật 1 §0a) **không phủ** đường này.
- `pancake-orders.js:113` có `catch { /* lỗi mạng → coi như chưa có, không chặn bán */ }` —
  nó hỏng **trong im lặng**, và hỏng theo chiều fail-OPEN (coi như hội thoại chưa có đơn).
- Nó là đường **ĐỌC**, nên không ai đi tìm nó khi hỏi «bot có gửi gì không».

🧭 **Bài học chưng cất:** _danh sách mock của một phép cô-lập là một lời khai, và lời khai
đó phải có chốt chặn độc lập._ Bẫy `globalThis.fetch` tốn 4 dòng và nó là thứ duy nhất
biến «0 lượt lọt ra ngoài mock» từ một câu nói thành một PHÉP ĐO. Không có nó, cả phiếu lẫn
thợ đều đã tin là xong.

Đã ghi §9 sổ. Bộ ca nay mock **ba** module (`pancake.js` · `messenger.js` ·
`pancake-orders.js`) + `stats.js` + `llm.js`, và bảng đếm in thêm cột `posDoc`.

---

## 3 · Đã làm gì

### 3.1 · `db/migrate/003_tin_cho_xu_ly` — bảng thứ 21

Năm trạng thái `cho|dang_xu|xong|loi|chan_guard`, UNIQUE `(page_id, conv_id, msg_id)`,
index bộ phận `WHERE trang_thai='cho'`. Chi tiết + lý do từng cột: `luoc-do-v1.md` §9.

`chan_guard` **tách khỏi `loi`** là quyết định về TIỀN, không phải về gọn gàng: model chạy
TRƯỚC lượt gửi, nên thử lại một tin bị cửa chặn là đốt thêm một lượt token cho một tin
chắc chắn không gửi được (N6 của phiếu).

### 3.2 · `src/queue/` — nạp + hàng đợi + worker

- `kho.js` — bộ đọc/ghi riêng (không qua tầng truy vấn chung: câu rút việc cần
  `FOR UPDATE SKIP LOCKED` **cộng** `pg_try_advisory_xact_lock(hashtext(conv_id))`).
- `nap.js` — poll qua **cửa v3** (`docHoiThoai`/`docTin`), `baoDamHoiThoai` trước, gom cụm
  tin khách theo đúng luật `pancake-poll.js:400-409`, `xepTin` lũy đẳng. **Van nguồn
  fail-closed** ở đây (N1a).
- `worker.js` — rút 1 tin → gọi nhạc trưởng → chốt trạng thái. Trần `so_lan_thu = 3`.

**Quyết định + giá phải trả (rule 13):**

1. **Không lấy được advisory lock ⇒ tin KHÔNG bị chạm.** Phiếu viết «trả tin về `cho`»;
   tôi để nó **nằm nguyên ở `cho`** ngay trong câu quét. Cùng kết quả, ít hơn một lượt ghi,
   và `so_lan_thu` không bị tăng oan. Giá: khác chữ của phiếu — ghi ở đây để không ai đọc
   thành thiếu sót.
2. **Giao dịch mở suốt lượt gọi model.** `pg_try_advisory_xact_lock` chỉ sống trong giao
   dịch, nên `moPhienRut` giữ một kết nối + một transaction vài giây. Giá: ⛔ đừng chạy
   nhiều worker hơn `max` của pool (mặc định 4) — worker thứ 5 chờ **kết nối**, và nhìn từ
   ngoài giống hệt «hàng đợi rỗng». Đã khai ở `duong-tin-v1.md` §3.
3. **Nhạc trưởng nhận `khach` (client của giao dịch), KHÔNG nhận `pool`.** Dùng `pool` là
   mở kết nối thứ hai ⇒ sổ AI ghi xong rồi giao dịch rollback thì sổ nói bot đã trả lời
   một tin vẫn đang ở `cho`.
4. **Theo đúng chữ phiếu: `pg_try_advisory_xact_lock(hashtext(conv_id))` một khoá**, không
   thêm namespace. Giá: cả CSDL dùng chung một không gian advisory lock — hiện chỉ có đúng
   chỗ này dùng (`grep -rn advisory src/` = 1 tệp); ai thêm chỗ thứ hai phải đổi cả hai.

### 3.3 · `src/chat/` — nhạc trưởng quanh bộ não DÙNG NGUYÊN

`handler-v3.js` gọi `classify` / `fastLane` / `runCloser` / `guardOutbound` / `getKBForPage`
/ `context.js` **nguyên văn qua import**, không sửa một dòng nào của chúng. Nó chỉ thay
phần ĐIỀU PHỐI: tin đi ra bằng đường nào, trạng thái ghi vào đâu.

- tin chữ → **cửa `guiTin`** (KHÔNG `pkSendReply`)
- ảnh → **cửa `guiAnh`**, tự xả `state.pendingImages` (KHÔNG `flushPendingImages` của
  `tools.js` — chính hàm đó gọi `pkSendImage`/`sendImage` mà phiếu đang đi bịt)
- tag/note bàn giao → **cửa `gatThe` + `ghiNote`**
- `so_ai` đủ 5 loại (N5) · `hoi_thoai` cập nhật qua cửa hẹp `kho.js`

**Quyết định + giá phải trả:**

5. **Cửa v3 GÁNH tag/note bàn giao KỂ CẢ khi `tools.js` đã tự làm** (phiếu ④#4c đòi vậy).
   Giá: ở VPS nhánh chuyển người sẽ có **HAI ghi chú** trên Pancake và **hai lượt gắn thẻ**.
   Thẻ lũy đẳng nên vô hại; ghi chú thì không — sale thấy hai dòng giống nhau. Ghi §9 làm
   nợ dài hạn. ⛔ Đừng «sửa» bằng cách bỏ đường cửa v3: bỏ nó là mất luôn guard, và mất
   luôn tag/note cho các nhánh bàn giao mà bộ não KHÔNG chạy tới (page chưa có KB, khiếu nại).
6. **Giữ `guardOutbound` (M09) trong v3** dù phiếu ②#3 không liệt kê nó. Nó là cửa cuối
   trước khách (chặn sai giá, lộ tiếng Việt, doạ khách). Bỏ nó là v3 gửi tin không kiểm —
   một hồi quy trên đường ra khách. Khác v2 một điểm: v3 **không xin model viết lại**
   (v2 xin 1 lần) — một lượt tin = một lượt model, và guard chặn thì ghi `spent_no_send`.
7. **`state.closed` khởi từ `false` mỗi lượt**, KHÔNG gieo từ `trang_thai='CLOSING'`. Gieo
   nó là mọi tin sau của một hội thoại đã chốt đều đẻ thêm một sự kiện `order` ⇒ đếm đơn
   phồng theo số tin, và L3-M2 đọc trên con số phồng. Câu hỏi «đã chốt trước đó chưa» đi
   bằng trường riêng `state.daChotTruoc`.
8. **Cửa hẹp thứ HAI ghi `hoi_thoai`** (`src/chat/kho.js`) vì `suaTheoId` không nhận
   `ctxHeThong()` và dữ liệu di trú đậu ở team KỸ THUẬT — **đúng nợ N3 mà L1-M1 đã ghi**,
   chạm lại nguyên vẹn. Giá: repo nay có HAI cửa hẹp cùng gốc; phải xoá cả hai khi phiếu
   `suaTheoId cho ctxHeThong` xong. Đã ghi §9.

### 3.4 · Chỗ cắm model (DI)

`layModel(pool, ctx, {vaiTro}) → {client, maModel, nguon}`. Không có dòng `cau_hinh_model`
⇒ client `llm.js` + `maModel = config.modelCloser` (**từ config THẬT**, cấm hằng bịa).
Có dòng nhưng khác nhà cung cấp / có khoá riêng ⇒ **`LoiChuaCoLopModel`, fail-CLOSED** —
im lặng gọi nhà A bằng mã model của nhà B là hoá đơn sai + một lượt 400 mà khách chỉ thấy
bot câm.

⚠️ **Lời khai đúng tầm (án lệ #32):** `client` trả về là **đúng object `anthropic` của
`llm.js`** — cùng object mà `closer.js` (CẤM SỬA) tự `import`. Nên hôm nay chỗ cắm có hiệu
lực THẬT với `maModel` (vào thẳng `so_ai.ma_model`), còn `client` mới là mặt hợp đồng cho
B ở L1-M4. Khai rõ ở `duong-tin-v1.md` §6 — **đừng đọc thành «model đã cắm xong»**.

---

## 4 · Nghiệm thu — số đo (môi trường **DEV**, máy cá nhân, sandbox tự dựng/tự dọn)

`bash ops/bin/nghiem-thu/l2-m1.sh` → **22 phép · ĐẠT 22 · TRƯỢT 0**, chạy **2 lượt** rc=0.

| Phép ④                | Số đo                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ① migration 003       | áp lượt 2 = **0 bản mới** · down gỡ được 003 = true · sau down `hoi_thoai` CÒN NGUYÊN = true · up lại có 003 = true · `schema.sql` == `sinhSchema()` = **khớp** |
| ② xếp tin lũy đẳng    | bơm cùng 1 tin 2 lần → `true\|false\|`**`1`** dòng (nội dung lượt đầu được giữ)                                                                                 |
| ③ khoá HỘI THOẠI (N2) | B rút khi A giữ = **0** · sau khi A nhả = **1** · 2 conv KHÁC nhau = **2** worker song song                                                                     |
| ③b van nguồn (N1a)    | READONLY=1, vắng V3_NAP_DEV → `mo=false`, **0 dòng**, in lý do · V3_NAP_DEV=1 → `mo=true`, **1 dòng** (đối chứng dương)                                         |
| ④ BA DÂN SỐ           | xem bảng dưới — cả ba CÓ CHẠY, **0 dân số có HTTP lọt**, **0 dân số có tin chữ đi đường ngầm**                                                                  |
| ⑤/⑥b guard đóng       | `chan_guard` \| số lần thử **1** (đứng yên) \| worker vòng sau **không nhặt lại**                                                                               |
| ⑥ sổ AI               | `{"handoff":1,"image":1,"order":1,"reply":5,"spent_no_send":1}` — đủ 5 loại · 0 dòng `ma_model` rỗng                                                            |
| ⑥ DI đổi model        | `ma_model` hai lượt = `["mo-hinh-A","mo-hinh-B"]` (đổi mock → ma_model đổi theo)                                                                                |
| ⑦ autoCreateOrder     | `false` \| `don_hang` = **0** dòng                                                                                                                              |
| ⑧ DI mặc định         | `nguon=config` \| `client===llm.anthropic` = **true** \| `maModel===config.modelCloser` = **true** \| `maModel=kimi-k2.6`                                       |
| ⑨ bộ ca               | hàng đợi **12/12** · nhạc trưởng **11/11** (23 ca, rc=0 cả hai)                                                                                                 |
| ⑩ vùng cấm            | **0** file phẳng `src/*.js` bị sửa                                                                                                                              |

**BẢNG ĐẾM BA DÂN SỐ** (phiếu ④#4 — «dân số 1 tin xanh vì nhánh không chạy không tính là đạt»):

```
[a] tin thường      GỬI NGẦM pkSendReply=0 pkSendImage=0 pkAddNote=0 pkTagByName=0 sendImage(Graph)=0 posDoc=0
                    CỬA V3   guiTin=1 guiAnh=2 ghiNote=0 gatThe=0     fetch-lọt=0
[b] ép chốt đơn     GỬI NGẦM pkSendReply=0 pkSendImage=0 pkAddNote=1 pkTagByName=1 sendImage(Graph)=0 posDoc=1
                    CỬA V3   guiTin=1 guiAnh=0 ghiNote=0 gatThe=0     fetch-lọt=0
[c] ép chuyển người GỬI NGẦM pkSendReply=0 pkSendImage=0 pkAddNote=1 pkTagByName=1 sendImage(Graph)=0 posDoc=0
                    CỬA V3   guiTin=1 guiAnh=0 ghiNote=1 gatThe=1     fetch-lọt=0
[guard] cửa ĐÓNG    GỬI NGẦM tất cả = 0                               CỬA V3 tất cả = 0   fetch-lọt=0
```

**Đọc bảng cho đúng:** cột GỬI NGẦM khác 0 ở dân số b/c **không phải lỗi của phiếu này** —
đó là bốn/năm đường thoát của bộ não CŨ bị mock GIỮ LẠI, tức phép đo đang làm việc. Thứ
phiếu này chịu trách nhiệm là: `pkSendReply=0` và `pkSendImage+sendImage(Graph)=0` ở **cả
ba** dân số (tin chữ và ảnh — thứ khách nhìn thấy — đi HẾT qua cửa v3), và `fetch-lọt=0`.

**Nhánh CHƯA đo được (HOÃN minh bạch, không giả xanh):** gọi Pancake/Meta **THẬT**. Token
121 theo IP máy cá nhân + van nguồn đóng trên dev ⇒ thuộc §7b T4 của sổ điều hành.

---

## 5 · Hồi quy — bộ ca v3 cũ

`node --test` trên 9 tệp v3 đã có: **120 ca · 118 xanh · 2 đỏ**.

Hai ca đỏ là `test/l0-m1-luoc-do.test.js` **S1** (dòng 65) và **S12** (dòng 323), CÙNG MỘT
GỐC: con số **20** + danh sách tên bảng neo cứng, nay thành **21** vì bản 003.
`ops/bin/nghiem-thu/l0-m1.sh` tụt **51/51 → ĐẠT 47 / TRƯỢT 4**, đúng 4 mục mà L1-M1 đã gặp
khi thêm bảng 20. Vá = `20 → 21` ở hai chỗ trong test + thêm `tin_cho_xu_ly` vào
`NEO_19_BANG` (test, dòng 16) và `NEO` (script, dòng 112). **Ngoài pathspec ③ (án lệ #25)
— TỔNG vá.** Đã ghi §9.

Đo thêm để TỔNG không phải đoán: bản 004 (phiếu L3-M1) **KHÔNG thêm bảng nào**
(`grep -c '^CREATE TABLE' db/migrate/004_trang_thai_don.up.sql` = **0**), nên con số đúng
là **21**, không phải 22.

---

## 6 · Va chạm với phiếu song song L3-M1 (án lệ #24 · #25)

Giữa lượt, thợ L3-M1 thêm `db/migrate/004_trang_thai_don.*` + `src/orders/` vào **cùng cây**.
Ba hệ quả đã xử:

1. **Ca S1 của bộ ca hàng đợi neo «003 là bản mới nhất» ⇒ đỏ ngay lượt đầu** (`xuong()` gỡ
   004 chứ không gỡ 003). Vá: gỡ LÙI trong vòng lặp cho tới khi 003 rời `_migrations`, rồi
   áp lại hết. Neo con số bản migration là cách chắc chắn làm bộ ca đỏ vào đúng ngày người
   khác thêm một bản.
2. **`db/schema.sql` KHÔNG commit trong lượt này** — nó sinh ra từ CẢ thư mục `migrate/`,
   nên ai commit trước là kéo migration của người kia vào commit của mình và làm HEAD mâu
   thuẫn (schema.sql khai một bản chưa có trong git). Thợ L3-M1 đã khai cùng quyết định ở
   `luoc-do-v1.md` §8. **TỔNG sinh lại MỘT LƯỢT sau khi 003 và 004 đã gộp.** File trên đĩa
   ĐÃ được sinh lại (nên ca S11 xanh cho cả hai thợ ngay lúc này).
3. **Pathspec commit không chạm `db/migrate/004_*` và `src/orders/`.** Dùng nghi thức
   private-index (`GIT_INDEX_FILE` riêng + `update-ref` CAS) để không đụng index chung.

---

## 7 · Ngoài phạm vi → đã APPEND §9 (4 dòng)

1. **Đường thoát thứ 5 — `pancake-orders.js` bắn HTTP tới POS bằng khoá thật**, không có
   `PANCAKE_READONLY`, `catch{}` nuốt lỗi. 🔴 đường ĐƠN/TIỀN.
2. **Nợ dài hạn cutover** — 5 đường thoát của bộ não vẫn đi thẳng ở VPS; nhánh chuyển người
   để lại HAI ghi chú.
3. **Thước L0-M1 đỏ vì bản 003** — `20 → 21`, TỔNG vá (giống hệt nợ N2 của L1-M1).
4. **Cửa hẹp thứ hai ghi `hoi_thoai`** — nợ N3 (`suaTheoId` cho `ctxHeThong`) lặp lại.

Không tiện tay sửa bất cứ thứ gì trong 4 mục trên.

---

## 8 · 🧭 Bài học đề nghị chưng cất vào skill `tho-thi-cong`

- **Danh sách mock của một phép cô-lập là một LỜI KHAI — phải có chốt chặn độc lập.** Bẫy
  `globalThis.fetch` (4 dòng) là thứ duy nhất biến «0 lượt lọt ra ngoài mock» từ câu nói
  thành phép đo, và nó bắt được đường thứ 5 mà cả phiếu lẫn thợ đều không biết. Quy tắc:
  phép «không gửi gì ra ngoài» phải chặn ở **tầng vận chuyển** (fetch/socket), không chỉ ở
  tầng module.
- **`grep` trong MỘT file không đo được đường gọi GIÁN TIẾP.** Hai trong năm đường thoát
  nằm cách `tools.js` một tầng hàm. Câu hỏi đúng là «module này gọi ra ngoài bằng đường
  nào», hỏi bằng cách CHẠY, không bằng cách đọc.
- **Neo số thứ tự migration trong test là lỗ hẹn giờ** khi cây có phiên song song — hỏi
  «bản của tôi đã rời `_migrations` chưa», đừng hỏi «bản mới nhất có phải của tôi không».
- **`grep -c` in `0` RỒI mới trả rc=1** — `|| echo 0` cho ra hai dòng. Vấp lại đúng lỗi (b)
  mà thợ L0-M1 đã ghi §9 cho `_chan1.sh`; nó sẽ còn tái phát tới khi vào skill.
- **Banner `console.log` lúc import trộn vào stdout** (`llm.js:41`) làm một phép so chuỗi
  trượt trong khi số đo đúng — cùng họ với án lệ #10 (`pm2 pid`). Script đo phải `tail -1`
  hoặc tách kênh.
- **Một phép đo ĐỎ chưa chắc là code sai — hỏi «thước của ca này có còn đúng tiền đề
  không»** (án lệ #27). Ca N6 đỏ với 11≠10; dòng dôi ra không phải bản sao mà là một
  `spent_no_send` THẬT do `guardOutbound` chặn tin lặp — hệ hành xử đúng, thước sai grain.

---

## 9 · Chặng 1 (`_chan1.sh l2-m1`) — và HAI sự cố THƯỚC của chính lượt nộp

### 9.1 · Phép ④ đo `base..HEAD` nên gộp phiên khác — đo lại PER-COMMIT

`_chan1.sh` phép ④ chạy `git diff --name-only <Base>..HEAD`. Base của phiếu là `f4946f5`,
cách HEAD **10 commit**, trong đó có commit của L1-M3 và L3-M1 (phiên song song). Nó báo
17 tệp «NGOÀI PHẠM VI» — toàn bộ là `src/orders/*`, `src/channels/whatsapp/*`,
`ops/bin/nghiem-thu/l1-m3.sh|l3-m1.sh`, `test/l1-m3-*`, `test/l3-m1-*`,
`docs/v3/ban-giao/cua-whatsapp-v1.md|may-trang-thai-don-v1.md`, `db/migrate/004_*` — **không
tệp nào của L2-M1**. Đây đúng lỗi (c) mà thợ L0-M1 đã ghi §9 cho `_chan1.sh`.

Đo lại đúng grain (chỉ commit của mình), chạy **bằng bash**:

```
$ git show --name-only --format= 4261900   →  19 tệp
$ (so từng tệp với khối pathspec ③ của phiếu)
④ per-commit 4261900: NGOÀI PHẠM VI = 0 / 19 tệp
```

🧭 **Cái thước cũng phải qua cổng (án lệ #1).** Lượt đo per-commit đầu tiên tôi chạy trong
**zsh** và nó báo 2/19 ngoài phạm vi — sai. Nguyên nhân: `case "$f" in $p)` với `$p` là
biến, **zsh KHÔNG diễn giải kết quả expansion thành pattern** (cần `setopt globsubst`),
còn bash thì có. Chạy lại y nguyên script bằng `bash -c` → **0/19**. `_chan1.sh` có
`#!/usr/bin/env bash` nên nó luôn đúng; chỉ câu đo tay của tôi sai vỏ. Cùng họ với án lệ
«bash 3.2 + LANG=C.UTF-8» đã ghi trong trí nhớ dài hạn: **ghi TÊN VỎ vào chính câu kết luận**.

### 9.2 · 🔴 Suýt lặp lại nợ N8 của L1-M1 — INDEX CHÍNH stale sau private-index commit

Commit bằng nghi thức private-index (`GIT_INDEX_FILE` riêng) **không cập nhật index CHÍNH**.
Ngay sau commit `4261900`, `git status --porcelain` báo **19 tệp vừa thêm là `D ` (đã xoá)**
và hai tệp dùng chung (`SO-DIEU-HANH-THI-CONG.md`, `luoc-do-v1.md`) là `MM` với bản staged
LÀ BẢN TRƯỚC KHI TÔI APPEND (`git diff --cached HEAD` = `-70 dòng` và `-64 dòng`).

Nghĩa là: **bất kỳ session nào chạy `git commit` không pathspec, hoặc commit hai tệp dùng
chung đó, sẽ XOÁ 19 tệp của L2-M1 khỏi cây và nuốt luôn phần append §9/§10** — đúng kịch
bản `b356f7b` đã làm với L1-M2 (nợ N8, §9 sổ).

Đã sửa ngay bằng phép hẹp, không đụng phần staged của ai:

```
$ git reset -q -- <đúng 19 đường dẫn của phiếu>
$ git status --porcelain          →  chỉ còn ` M db/schema.sql` và ` M <sổ>` (worktree)
```

🧭 **Luật rút ra: private-index commit PHẢI kết bằng `git reset -- <pathspec>` để đồng bộ
index chính.** Nghi thức hiện tại dừng ở `update-ref` là để lại một quả mìn hẹn giờ cho
session kế tiếp — và nó đã nổ một lần rồi.

### 9.3 · Phép ⑩ của cổng L2-M1 tự đỏ vì đúng chuyện đó — đã vá

Phép ⑩ («0 file phẳng `src/*.js` bị sửa») vòng 1 viết bằng `git status --porcelain -- 'src/*.js'`.
Hai lỗi trong một dòng: (a) nó đọc INDEX nên đỏ vì index stale ở 9.2; (b) pathspec
`src/*.js` của git dùng fnmatch **không** có `FNM_PATHNAME` ⇒ `*` ăn cả dấu `/` và khớp
luôn `src/queue/nap.js`. Vá: `git diff --name-only HEAD | grep -E '^src/[^/]+\.js$'` —
so CÂY với HEAD (không qua index), lọc bằng regex đúng một cấp.

**Sau vá: cổng `l2-m1.sh` = 22 phép ĐẠT 22 / TRƯỢT 0, rc=0.**
