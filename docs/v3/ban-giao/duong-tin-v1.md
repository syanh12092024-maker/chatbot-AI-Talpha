# BÀN GIAO — ĐƯỜNG TIN v1 (hàng đợi + nhạc trưởng + chỗ cắm model)

> Phiếu **L2-M1** · dựng 22/08/2026 · nguồn sự thật của file này là `src/queue/*.js` +
> `src/chat/*.js` + `db/migrate/003_tin_cho_xu_ly.up.sql`.
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l2-m1.sh` (22 phép).
> Đọc trước: [`cua-messenger-v1.md`](./cua-messenger-v1.md) (6 hàm cửa, `psid ≠ convId`,
> guard `V3_PANCAKE_GUI`) · [`tang-truy-van-v1.md`](./tang-truy-van-v1.md) (ctx) ·
> [`luoc-do-v1.md`](./luoc-do-v1.md) (lược đồ, §8 bản 003).

## 0 · Hình dạng đường tin — ba chặng, ba chủ

```
   Pancake                src/queue/nap.js            tin_cho_xu_ly           src/queue/worker.js
  (hoặc webhook,   ──►  ĐỌC qua cửa v3, xếp    ──►   (hàng đợi bền)   ──►   rút 1 tin: khoá DÒNG
   H2 sau này)          idempotent. KHÔNG                                   + khoá HỘI THOẠI
                        gọi model, KHÔNG gửi.                                      │
                                                                                   ▼
                                                                        src/chat/handler-v3.js
                                                                        (NHẠC TRƯỞNG — gọi bộ não
                                                                         CŨ nguyên văn, mọi lượt
                                                                         GỬI đi qua CỬA v3)
```

**Vì sao tách ba chặng** (02 §L2): bản đang chạy xử lý tin ngay trong vòng poll
(`pancake-poll.js` → `handleIncoming` → `pkSendReply`), nên một lượt model chậm giữ luôn
slot của vòng poll, một tiến trình chết giữa lượt là tin biến mất, và không chỗ nào nhớ
được «tin này đã xử chưa» ngoài RAM. Đổi nguồn tin sang WEBHOOK (điểm kiểm H2, §8 sổ) chỉ
phải viết lại `nap.js`; `worker.js` và `handler-v3.js` không đụng tới.

## 1 · Import từ đâu

```js
import {
  napTuPoll,
  nguonDangMo, // bộ NẠP
  chayMotVong,
  chayToiKhiHet, // WORKER
  xepTin,
  moPhienRut,
  demTheoTrangThai,
  docTinTheoId,
  TRANG_THAI,
} from "../../queue/index.js";

import {
  xuLyMotTin,
  KET_QUA, // NHẠC TRƯỞNG
  layModel,
  LoiChuaCoLopModel, // chỗ cắm model
  ghiSoAi,
  demSoAiTheoLoai,
  LOAI,
  KHONG_GOI_MODEL,
  baoDamHoiThoai,
  suaHoiThoai, // cửa hẹp ghi hoi_thoai
} from "../../chat/index.js";
```

## 2 · Bảng `tin_cho_xu_ly` — năm trạng thái, và tại sao là NĂM chứ không phải bốn

| Trạng thái   | Nghĩa                           | Worker có nhặt lại không           |
| ------------ | ------------------------------- | ---------------------------------- |
| `cho`        | chờ tới lượt                    | CÓ                                 |
| `dang_xu`    | một worker đang giữ             | không (khoá dòng + khoá hội thoại) |
| `xong`       | đã trả lời khách                | không                              |
| `loi`        | hỏng, đã chạm trần `so_lan_thu` | không                              |
| `chan_guard` | **CỬA GỬI ĐÓNG**                | ⛔ **KHÔNG BAO GIỜ**               |

⛔ `chan_guard` tách khỏi `loi` là quyết định về TIỀN, không phải về gọn gàng: lượt gọi
model chạy TRƯỚC lượt gửi, nên mỗi lần thử lại một tin bị cửa chặn là đốt thêm một lượt
token thật cho một tin chắc chắn không gửi được. Gộp nó vào `loi` biến một cái van đóng
thành máy đốt tiền chạy tới khi chạm trần. Người vận hành mở van (`V3_PANCAKE_GUI=1`) rồi
thì `UPDATE ... SET trang_thai='cho' WHERE trang_thai='chan_guard'` **bằng tay, có chủ
đích** — không có đường tự động nào.

**Chống trùng:** `UNIQUE (page_id, conv_id, msg_id)` + `ON CONFLICT DO NOTHING`. Vòng poll
6 giây/lần trả lại y nguyên tin cũ; thiếu vế này là khách nhận n câu trả lời cho một câu
hỏi. `napTuPoll` trả về `{them, trung}` — con số `trung` CÀNG CAO càng tốt ở chế độ chạy
đều, nó là bằng chứng chống-trùng đang làm việc.

## 3 · HAI KHOÁ của worker — khoá dòng KHÔNG đủ

```sql
UPDATE tin_cho_xu_ly t SET trang_thai='dang_xu', so_lan_thu = t.so_lan_thu + 1, ...
 WHERE t.id = ( SELECT c.id FROM tin_cho_xu_ly c
                 WHERE c.trang_thai = 'cho'
                   AND pg_try_advisory_xact_lock(hashtext(c.conv_id))   -- ⬅ KHOÁ THỨ HAI
                 ORDER BY c.id FOR UPDATE SKIP LOCKED LIMIT 1 )
```

`FOR UPDATE SKIP LOCKED` khoá **DÒNG** — nó chống «hai worker cùng lấy MỘT tin», nhưng
KHÔNG chống «hai worker cùng lấy HAI tin của CÙNG MỘT hội thoại»: hai tin là hai dòng, hai
khoá khác nhau, cả hai worker đều rút được. Hậu quả: hai bên cùng dựng `state` từ một dòng
`hoi_thoai`, cùng gọi model, khách nhận hai câu trả lời, và `moc_luot_llm` (sổ ngân sách
24h của M11) bị hai bên ghi đè lẫn nhau ⇒ ngân sách lượt trừ SAI theo chiều có lợi cho
việc đốt token.

Không lấy được advisory lock ⇒ hàng bị **bỏ qua ngay trong câu quét**: tin vẫn ở `cho`,
KHÔNG đổi trạng thái, KHÔNG tăng `so_lan_thu`, worker đi tìm hội thoại khác. (Phiếu viết
«trả tin về `cho`» — cùng kết quả, ít hơn một lượt ghi.)

**Giá phải trả:** advisory lock kiểu `_xact_` chỉ sống trong giao dịch, nên `moPhienRut`
giữ **một giao dịch mở suốt lượt gọi model** (vài giây). Mỗi worker giữ đúng một kết nối;
⛔ đừng chạy nhiều worker hơn `max` của pool (mặc định 4) — worker thứ 5 đứng chờ **kết
nối**, không phải chờ việc, và nhìn từ bên ngoài giống hệt «hàng đợi rỗng».

⚠️ Advisory lock dùng chung MỘT không gian khoá cho cả CSDL. Hiện chỉ có đúng chỗ này dùng
(`grep -rn advisory src/` = 1 tệp). Ai thêm chỗ thứ hai phải đổi CẢ HAI sang dạng hai khoá
`(namespace, hashtext(...))`.

## 4 · Van NGUỒN fail-closed — và vì sao nó nằm ở bộ NẠP

```
napTuPoll enqueue được  ⟺  PANCAKE_READONLY !== '1'  HOẶC  V3_NAP_DEV === '1'
```

Cửa Messenger v3 guard nhóm **GỬI/GHI**, nhưng `docHoiThoai`/`docTin` là đường **ĐỌC** và
không bị guard đó chặn (cua-messenger §4). Nếu không có van ở bộ NẠP thì máy dev vẫn nạp
được tin THẬT vào hàng đợi, worker sẽ chạy bộ não trên chúng, và bộ não còn năm đường
thoát ra ngoài (§5). Van này là tầng chặn (a) của phiếu.

`V3_NAP_DEV=1` **chỉ đặt trong harness test**. VPS KHÔNG đặt (VPS không READONLY). Bảng
khai duy nhất: [`bien-moi-truong-v3.md`](./bien-moi-truong-v3.md).

## 5 · ⚠️ NĂM ĐƯỜNG THOÁT CÒN LẠI CỦA BỘ NÃO — nợ dài hạn, đọc trước khi cutover

Nhạc trưởng route được mọi thứ NÓ chủ động làm qua cửa v3. Nhưng bộ não gọi thẳng ra ngoài
từ trong lòng `executeTool`, và `tools.js` là file **CẤM SỬA** (luật 4 §0a sổ điều hành):

| #   | Chỗ gọi                                           | Làm gì                                                    | Đo bằng                                |
| --- | ------------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| 1   | `tools.js:197`                                    | `pkTagByName(pkTags.order)` — thẻ «AI Chốt»               | `[b] pkTagByName=1`                    |
| 2   | `tools.js:266`                                    | `pkTagByName(pkTags.handoff)`                             | `[c] pkTagByName=1`                    |
| 3   | `tools.js:271`                                    | `pkAddNote('🙋 AI CHUYỂN NGƯỜI…')`                        | `[c] pkAddNote=1`                      |
| 4   | `order-bridge.js:255` ← `tools.js:208`            | `pkAddNote(<ghi chú đơn>)`                                | `[b] pkAddNote=1`                      |
| 5   | `pancake-orders.js:25` và `:108` ← `tools.js:171` | **fetch HTTP tới POS pages.fm** bằng khoá thật của 7 shop | bẫy `fetch` — **7 lượt** ở lượt đo đầu |

**Phiếu L2-M1 ② khai BA chỗ; đo lại ra NĂM.** Hai chỗ mới (#4, #5) gọi **gián tiếp** nên
`grep` trong `tools.js` không thấy chúng. Riêng #5 nguy hơn cả: nó không phải đường gửi tin
nên không ai nghĩ tới, nhưng **không một dòng `PANCAKE_READONLY` nào canh nó**
(`grep PANCAKE_READONLY src/pancake-orders.js` = 0 dòng) và `catch {}` ở dòng 113 nuốt mọi
lỗi ⇒ nó hỏng TRONG IM LẶNG. Nếu bộ ca chỉ mock `pancake.js` + `messenger.js` như phiếu
khai thì phép ④#4 XANH GIẢ trong khi 7 lượt HTTP vẫn bay đi.

**Ở VPS (môi trường ĐƯỢC PHÉP gửi) cả năm chỗ vẫn đi thẳng.** Hệ quả cụ thể phải biết
trước khi cutover:

- Nhánh **chuyển người** để lại **HAI ghi chú** trên Pancake (một của `tools.js:271`, một
  của cửa v3 ở handler v3) và gắn thẻ **hai lượt**. Gắn thẻ là thao tác lũy đẳng nên vô
  hại; **ghi chú thì không** — sale sẽ thấy hai dòng giống nhau.
- ⛔ Đừng «sửa» bằng cách bỏ đường cửa v3 ở handler v3 — bỏ nó là mất luôn guard, và mất
  luôn đường tag/note cho các nhánh bàn giao mà bộ não KHÔNG chạy tới (page chưa có KB,
  khiếu nại). Cách sửa đúng là mở phiếu bọc `tools.js`/`order-bridge.js`/`pancake-orders.js`
  ở đợt cutover.

## 6 · Chỗ cắm MODEL (DI) — hợp đồng cho L1-M4 của người B

```ts
layModel(pool, ctx: { teamId }, { vaiTro?: 'chinh'|'du_phong'|'nen' })
  → { client, maModel, nguon: 'cau_hinh_model' | 'config' }
```

Bản mặc định của L2-M1 làm ĐÚNG BA việc, không hơn (lớp model đa-nhà/dự-phòng/độ-ngẫu-nhiên
là L1-M4):

1. `SELECT` `cau_hinh_model` theo `(team_id, vai_tro, bat)`.
2. **Không có dòng** ⇒ `{ client: anthropic (llm.js), maModel: config.modelCloser,
nguon:'config' }`. `maModel` lấy từ **config THẬT đang chạy**, ⛔ cấm hằng gõ tay —
   hằng tay làm `so_ai.ma_model` khai một model trong khi hệ gọi một model khác, và mọi
   phép so «model nào rẻ hơn» sau này chạy trên số bịa.
3. **Có dòng** nhưng `nha_cung_cap` khác `config.aiProvider`, hoặc có `khoa_api_ma` riêng
   ⇒ ném **`LoiChuaCoLopModel`** (fail-CLOSED). L2-M1 không dựng nổi client cho nhà khác;
   im lặng gọi nhà A bằng mã model của nhà B là hoá đơn sai + một lượt 400 mà khách chỉ
   thấy bot câm.

⚠️ **ĐỌC KỸ TRƯỚC KHI TIN**: `client` trả về là **đúng object `anthropic` của
`src/llm.js`** — cùng object mà `src/closer.js` và `src/classifier.js` tự import thẳng.
`closer.js` là file CẤM SỬA và nó **hardcode** `import { anthropic } from './llm.js'`, nên
nó **KHÔNG đọc** `ctx.model` mà handler v3 truyền xuống. Nghĩa là hôm nay chỗ cắm này có
hiệu lực thật với **`maModel`** (đi thẳng vào `so_ai.ma_model` — kế toán chi phí đúng), còn
**`client`** mới chỉ là mặt hợp đồng. B ở L1-M4 muốn ĐỔI ĐƯỢC model thật phải thay cả
đường closer đọc client (viết closer v3, hoặc thay `llm.js` ở tầng module). Đừng đọc file
này thành «model đã cắm xong».

Đo lại chỗ cắm còn sống hay không: `ops/bin/nghiem-thu/l2-m1.sh` phép ⑧ + ca `N3b`
(tiêm `deps.layModel` hai lần với hai mã khác nhau → `so_ai.ma_model` in ra
`["mo-hinh-A","mo-hinh-B"]`).

## 7 · Sổ AI — năm loại sự kiện, và NEO idempotent của đường runtime

Handler v3 tự ghi `so_ai`. **Bắt buộc phải tự ghi**: `executeTool` có gọi `logAi(...)` cho
`order`/`handoff`/`image`, nhưng `logAi` ghi vào `ai-messages.jsonl` (sổ JSONL của bản
đang chạy), **KHÔNG** vào bảng `so_ai` — đo: `grep -n "so_ai" src/*.js` → **0 dòng**.

| Loại            | Khi nào ghi                                                                  | `ma_model`                                               |
| --------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------- |
| `reply`         | tin chữ ĐÃ qua cửa                                                           | model thật, hoặc `khong-goi-model` khi Fast Lane trả lời |
| `image`         | mỗi lượt xả hàng đợi ảnh (`du_lieu.n`)                                       | như trên                                                 |
| `order`         | cờ `state.orderCreatedThisTurn`/`closed`                                     | model thật                                               |
| `handoff`       | cờ `state.handoff`                                                           | model thật / `khong-goi-model`                           |
| `spent_no_send` | guard chặn (cửa ĐÓNG hoặc M09 chặn nội dung), hoặc model không viết được chữ | tuỳ nhánh                                                |

**Neo idempotent runtime:** `nguon_tep = 'tin_cho_xu_ly:<loại>'` · `nguon_dong = <id tin>`.
Bảng `so_ai` có `UNIQUE (nguon_tep, nguon_dong)` — dùng chung một `nguon_tep` cho mọi loại
sẽ chỉ cho phép ĐÚNG MỘT dòng cho mỗi tin, mà một lượt sinh tới 4 sự kiện. Tách theo loại
cho ra đúng thứ cần: «mỗi tin, mỗi loại, nhiều nhất một dòng» ⇒ worker chết giữa chừng rồi
thử lại KHÔNG đẻ bản ghi thứ hai.

**`ma_model = 'khong-goi-model'`** là NHÃN VẮNG MẶT tường minh cho lượt 0 token (Fast Lane).
Cột `NOT NULL` nên phải khai gì đó; ghi mã model đang cấu hình vào đó là lời khai SAI (sổ
sẽ thấy model X «chạy» cho lượt nó chưa từng được gọi, và mọi phép cắt chi phí theo model
cộng nhầm lượt 0 đồng vào model đó).

⚠️ `nguon_dong` là `int` (không phải bigint) ⇒ trần 2.147.483.647 dòng `tin_cho_xu_ly`.
Rất xa, nhưng CÓ THẬT — chạm trần thì ghi sổ ném lỗi, không im lặng.

## 8 · Cửa hẹp ghi `hoi_thoai` (`src/chat/kho.js`) — và nợ N3

`suaTheoId` của tầng truy vấn **không nhận `ctxHeThong()`** (tang-truy-van-v1.md §3), mà
đường worker là job nền (không có NGƯỜI), và 100% dữ liệu di trú đậu ở team KỸ THUẬT
`chua-phan` (ctx người dùng mang team kỹ thuật bị ném `LoiThieuBoiCanhTeam`). ⇒ **không còn
đường UPDATE hợp lệ nào qua tầng chung.** Giữ một cửa hẹp, đúng khuôn `src/pos/kho.js` mà
L1-M1 đã phải dựng vì cùng lý do (nợ N3, §9 sổ):

- danh sách **cột cho phép**, deny-by-default (cột lạ ⇒ ném lỗi, không âm thầm bỏ qua);
- LUÔN kẹp `team_id` trong `WHERE`;
- mọi lượt ghi để lại một dòng `nhat_ky` qua cửa chung `ghiNhatKy` (ghi TÊN CỘT đã đổi,
  **không** ghi nội dung — `ho_so` mang SĐT/địa chỉ khách, và `nhat_ky` là bảng CHỈ-INSERT);
- không có hàm xoá.

⛔ Repo nay có **HAI** cửa hẹp cùng lý do (`src/pos/kho.js`, `src/chat/kho.js`). Khi phiếu
«`suaTheoId` cho `ctxHeThong`» xong thì **XOÁ CẢ HAI**.

## 9 · Bản đồ cột `hoi_thoai` ↔ trường `state` của bộ não

Khai MỘT CHỖ (`src/chat/trang-thai.js`), đừng đoán lại ở chỗ khác:

| cột `hoi_thoai` | trường `state` / nghĩa                                               |
| --------------- | -------------------------------------------------------------------- |
| `trang_thai`    | conv-state `state` (GREET/QUALIFY/SELLING/CLOSING/HANDOFF/POST_SALE) |
| `chu_so_huu`    | conv-state `owner` (AI/SALE/BOTCAKE)                                 |
| `moc_luot_llm`  | **MẢNG MỐC THỜI GIAN** (không phải số đếm) — sổ ngân sách 24h M11    |
| `luot_llm`      | `= moc_luot_llm.length`                                              |
| `luot_ai`       | MỌI lượt bot đã nói (kể cả Fast Lane) = `state.botTurns`             |
| `ho_so`         | `prof` của `src/context.js` (M07, hồ sơ nén ~150 token)              |
| `ai_noi_gi/luc` | `state.lastAiText` / lần AI nói gần nhất                             |

⚠️ **`state.aiTurns` ≠ `hoi_thoai.luot_ai`.** `handler.js:239` truyền vào `fastLane` giá trị
`Math.max(state.aiTurns, state.botTurns)` — tức «bot đã nói chưa», khác hẳn «đã tiêu bao
nhiêu lượt đắt tiền». v3 giữ đúng phân biệt đó: `aiTurns` = số lượt GỌI MODEL trong 24h
(đếm từ `moc_luot_llm`), `botTurns` = `luot_ai`. Gộp hai cái là cách rẻ nhất làm ngân sách
lượt trừ sai.

⚠️ **`state.closed` khởi từ `false` MỖI LƯỢT** — nó là cờ «bộ não vừa chốt đơn TRONG LƯỢT
NÀY» (tools.js:188), không phải «hội thoại này đã từng chốt». Gieo nó bằng
`trang_thai==='CLOSING'` thì mọi tin sau của một hội thoại đã chốt đều đẻ thêm một sự kiện
`order` ⇒ đếm đơn PHỒNG theo số tin, và L3-M2 (lọc trùng chéo) đọc trên con số phồng đó.
Câu hỏi «đã chốt trước đó chưa» hỏi cột `trang_thai` (`state.daChotTruoc`).

## 10 · Cái phiếu này KHÔNG làm (đừng tưởng có)

- **Không** có tiến trình worker chạy nền. `chayMotVong`/`chayToiKhiHet` là hàm; ai gọi nó
  trong vòng lặp có ngủ là việc của đợt cutover.
- **Không** có post-sale router / lead scoring / ngân sách lượt theo độ nóng của
  `handler.js` cũ (M11/M12/M13). Nhạc trưởng v3 chạy đúng chuỗi mà phiếu khai:
  KB → Fast Lane → classify → runCloser → outbound-guard → cửa. Các tầng kia là L2-M2/M3.
- **Không** đổi nguồn tin sang webhook (H2 chưa đo). Nạp vẫn qua POLL.
- **Không** bật tạo đơn: `config.autoCreateOrder` GIỮ TẮT; hàng chờ tạo đơn là L3-M4.

## 11 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l2-m1.sh                    # 22 phép của ④, tự dựng/dọn sandbox
node --test test/l2-m1-hang-doi.test.js             # 12 ca hàng đợi
node --experimental-test-module-mocks --test test/l2-m1-nhac-truong.test.js   # 11 ca nhạc trưởng
```

⚠️ Bộ ca nhạc trưởng **cần cờ `--experimental-test-module-mocks`** — node v25 chưa bật
`mock.module` mặc định (đo 22/08: `typeof mock.module === 'undefined'` khi thiếu cờ), và
`package.json` không được đổi ở phiếu này. Thiếu cờ ⇒ bộ ca **tự bỏ qua có tuyên bố**,
không giả xanh; cổng `l2-m1.sh` tự truyền cờ.

Nhánh gọi Pancake/Meta **THẬT** chưa đo (token 121 theo IP máy cá nhân, và van nguồn đóng
trên dev) — đo thật thuộc §7b T4 của sổ điều hành.

## 12 · Bậc từ khoá v3 (L2-M2) — đấu vào TRƯỚC Fast Lane

Phiếu L2-M2 chêm một bậc mới vào TRƯỚC bước "Fast Lane" của chuỗi §10 (`src/chat/lop-tu-khoa.js`,
gọi ở handler-v3.js bước "── 4b"). Chuỗi ĐẦY ĐỦ nay là:

```
KB (bước 4, kb.noData) → LỚP TỪ KHOÁ v3 (bước 4b, MỚI) → Fast Lane → classify → runCloser
→ outbound-guard → cửa
```

Ba luật, cùng một hàm thuần `lopTuKhoa({text, kb})` (không đọc DB, không gọi model):

1. **Thật/giả** — Botcake cũ bắt được, lớp 0 đồng hiện có (`fast-lane.js`) thì KHÔNG
   (đo 01-QUYET-DINH.md §2: 0/10 page). Trả lời từ `kb.config.fastLaneAuth`.
2. **Hỏi size** — cùng tình trạng 0/10. Trả lời từ `kb.config.fastLaneSize`.
3. **Vá `paano mag order`** — biến thể TÁCH CHỮ tiếng Philippines mà `ASK_HOWTO` của
   `fast-lane.js` bỏ sót (01-QUYET-DINH.md §12). Trả lời từ `kb.config.fastLaneHowto`
   (field CŨ, đã có sẵn) — có khung mặc định 3 ngôn ngữ khi trang chưa tự viết.

**Quy ước KB MỚI:** `kb.config.fastLaneAuth` / `kb.config.fastLaneSize` — cùng khuôn
`fastLanePrice/fastLaneShip/fastLaneHowto` đã có trong `kb.js` (`SCRIPT_FIELDS`), nhưng
CHƯA được thêm vào `SCRIPT_FIELDS` (ngoài pathspec L2-M2 — `kb.js` không nằm trong ③).
⚠️ Hệ quả: `kb.js#cleanConfig` chỉ giữ đúng 6 cột của `SCRIPT_FIELDS` khi ghi qua dashboard
(`updatePageConfig`/`saveDraft`), nên hai field mới hôm nay CHỈ sống được nếu ghi thẳng vào
`kb-overrides.json` (đường mà ⑤ phiếu L2-M2 đã dùng để rút bộ từ khoá thật) — dashboard chưa
có ô nhập cho chúng. Ghi §9 sổ điều hành.

**Không bịa:** hai luật thật/giả + hỏi size NHƯỜNG (trả `handled:false`, không đụng gì) khi
trang chưa có field tương ứng — pipeline chạy tiếp y như chưa có bậc này. `paano` là vá một
câu trả lời ĐÃ AN TOÀN có sẵn (khung "cách đặt hàng" của Fast Lane) nên KHÔNG nhường, dùng
khung mặc định khi trang chưa tự viết.

Câu trả lời của bậc này đi qua **cùng cửa `d.kiemTinRa` (M09)** với Fast Lane/AI — không
được miễn kiểm nội dung. Bắt được thì ghi `so_ai` loại `reply`, `lane='tu_khoa_v3'`,
`ma_model='khong-goi-model'` (0 token, cùng khuôn Fast Lane).

Đo lại: `bash ops/bin/nghiem-thu/l2-m2.sh` (6 phép của ④ phiếu L2-M2) ·
`node --test test/l2-m2-lop-tu-khoa.test.js` (đơn vị, không cần DB) ·
`node --test test/l2-m2-handler.test.js` (nối vào `xuLyMotTin` thật, cần sandbox DB).
