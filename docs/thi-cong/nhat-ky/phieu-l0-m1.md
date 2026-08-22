# NHẬT KÝ PHIẾU L0-M1 — lược đồ CSDL v3 (19 bảng) + di trú dữ liệu thật

**Thợ:** session thợ thi công (Opus 5) · **Ngày:** 22/08/2026
**Base:** `502766a` · **Cây lúc bắt đầu:** `3d1eed1` → lúc đo cổng: `f967076`
**Làn:** 🟥 · **Skill nạp:** `tho-thi-cong`
**Cổng:** `bash ops/bin/nghiem-thu/l0-m1.sh` → **51 phép · ĐẠT 51 · TRƯỢT 0**

---

## 1 · ĐO LẠI NGUYÊN LIỆU trước khi code (bước 3 của skill)

Phiếu bắt đo lại vì «đề bài có thể khai sai». Đo trên cây, không chép số phiếu:

| Nguồn                       | Phiếu khai                 | ĐO THẬT 22/08                                              | Kết         |
| --------------------------- | -------------------------- | ---------------------------------------------------------- | ----------- |
| `pages.json`                | 502 page                   | **502** page, khoá = page_id FB, 18 khoá/mục               | khớp        |
| `ai-enabled.json`           | mảng phẳng 47 page_id      | **47**, mảng phẳng, không trùng                            | khớp        |
| `conv-state.json`           | ~18.790 hội thoại          | **18.790** khoá hợp khuôn `<pageId>_<psid>`                | khớp        |
| `kb-overrides.json`         | ~73 mục                    | **73** mục · 71 có `config` · 2 chỉ có `products`          | khớp        |
| `script-versions/`          | ~70 tệp                    | **70** tệp = **71 bản** (1 page có 2 bản: LIVE + ARCHIVED) | khớp        |
| page LẠC ngoài `pages.json` | **1** (`1125576063976794`) | **3** — xem §2                                             | ⚠️ **LỆCH** |

Hai phép đo phụ đắt tiền, làm thay đổi thiết kế:

- `kb.config` **==** bản LIVE trong `script-versions` cho **70/70** page (so từng trường sau khi
  lấy đúng 6 trường `SCRIPT_FIELDS` của `src/kb.js`). Lần so đầu ra «31 giống / 39 khác» là do
  `kb.config` thiếu 3 khoá `fastLane*` mà `cleanConfig` điền rỗng — **so trước khi chuẩn hoá là
  so hai khuôn khác nhau**. ⇒ `kb-overrides` KHÔNG đẻ thêm dòng `kich_ban` nào.
- `pages.json.posApiKey` **đã bị che**: 112/112 giá trị dạng `***xxxx`, chỉ **6** mã khác nhau
  (= 4 ký tự cuối). Đó là vân tay, không phải khoá. Khoá POS thật nằm ở `pancake-shops.json`.
  ⇒ KHÔNG nạp cột này (ghi §9 cho L1-M1).

## 2 · Ba phát hiện lệch đề bài (án lệ #4 — «đề bài phiếu cũng khai sai nguyên liệu»)

### (a) Page LẠC không phải 1 mà là 3

| page_id            | ai-enabled | kb-overrides       | script-versions | hệ quả đo được                                         |
| ------------------ | ---------- | ------------------ | --------------- | ------------------------------------------------------ |
| `1125576063976794` | ✔          | ✔ (có config)      | ✔ v1 LIVE       | 1 công tắc AI không có đích · 1 bản kịch bản không nạp |
| `1220547807799752` | —          | ✔ (có config)      | ✔ v1 LIVE       | 1 bản kịch bản không nạp                               |
| `1100561323151723` | —          | ✔ (chỉ `products`) | —               | 0 (mục này không có kịch bản)                          |

Phiếu chỉ biết page đầu vì nó soi qua đường `ai-enabled.json`. Hai page kia lộ ra khi soi
`kb-overrides` và `script-versions`. **Quyết định:** giữ khoá ngoại `kich_ban.page_id → page.id`
(FK chặt), BỎ QUA 2 bản của page lạc, và **LIỆT KÊ RA** ở cả `npm run di-tru` lẫn cổng nghiệm
thu. Giá phải trả: `kich_ban` = 69 chứ không phải 71. Đổi lại: bảng `page` khớp đúng
`pages.json` như ④#4a đòi, và không có dòng mồ côi trỏ vào hư không. Tệp nguồn KHÔNG bị đụng
nên **không mất gì** — gỡ được ngay khi sổ cái page được vá. Đã APPEND §9.

### (b) `conv-state.llmTurns` là MẢNG MỐC THỜI GIAN, không phải số đếm

Đây là lỗi đắt nhất của lượt. Bản nháp đầu viết `luotLlm: Number(v.llmTurns || 0)` — với mảng
một phần tử, `Number([1786413515147])` ra **đúng cái mốc epoch đó**, và Postgres ném
`value "1786413515147" is out of range for type integer`. Nếu cột là `bigint` thì nó đã lọt
vào CSDL trong im lặng và mọi phanh ngân sách lượt sau này đọc sai.

`llmTurns` là **sổ ngân sách lượt/24h của M11**: mảng mốc mỗi lần gọi model (dài nhất 12 phần
tử). ⇒ tách hai cột: `luot_llm int` (= độ dài) và `moc_luot_llm jsonb` (giữ nguyên mảng mốc).
Bỏ mảng mốc thì sau cutover **mọi khách được cấp lại ngân sách đầy** — một lỗ tiền câm.

Chống tái phạm ở tầng hợp đồng, không ở tầng chú thích: `BAN_DO_CONV_STATE` khai **16/16** khoá
nguồn → cột đích, và ca `D1` đối chiếu tập khoá THẬT trong tệp với bản đồ đó. Khoá mới xuất
hiện trong bản đang chạy mà chưa khai đích ⇒ **đỏ**, không rơi im lặng.

### (c) Kịch bản của marketer chứa SURROGATE LẺ, Postgres từ chối cả câu

`𝐀𝐥𝐥 𝐃𝐚𝐲 🎀 𝐓𝐫\ud835…` — chữ toán học đậm bị cắt ngang (`.slice(80)` của bản đang chạy) để lại
nửa cặp surrogate. JS giữ được, `jsonb` thì `invalid input syntax for type json: Unicode low
surrogate must follow a high surrogate` và **cả lượt di trú chết ở dòng đầu tiên gặp phải**.
Vá bằng U+FFFD **và ĐẾM số lần vá** (đo: 4 chuỗi kịch bản · 15 chuỗi hội thoại) — im lặng đổi
chữ của marketer là sửa tài sản người khác mà không nói.

## 3 · Phán đã chốt trong lượt (tradeoff nói ra, không lặng lẽ chọn)

1. **`db/schema.sql` là bản SINH RA**, không phải bản chép tay thứ hai. `node db/migrate.js schema`
   ghép các `db/migrate/*.up.sql`; ca `S11` diff lại. Chọn thế vì hai nguồn một lược đồ là cách
   rẻ nhất để chúng trôi khỏi nhau; giá phải trả là phải nhớ chạy lệnh sinh — nên đã có cổng.
2. **Rào team kỹ thuật đặt ở tầng CSDL**, hai cửa: trigger chặn INSERT/UPDATE `thanh_vien_team`
   vào team `la_ky_thuat`, VÀ trigger chặn lật cờ kỹ thuật cho team đang có người (án lệ 31 —
   «cửa VÀO là tập mở, phanh đặt ở cửa RA»). Cổng có cả ca CHO-QUA (team nghiệp vụ vẫn nhận
   người) để rào không xanh nhờ chặn tất.
3. **`so_ai.ma_model NOT NULL` + bộ nạp fail-CLOSED.** `logAi` của bản đang chạy không ghi model
   (grep 10/10 chỗ gọi `logAi(`). Bộ nạp lấy `rec.model` nếu có, còn lại **đòi người chạy KHAI**
   `--ma-model-cu=`; thiếu thì ném lỗi kèm số dòng. Cấm đoán `kimi-k2.6` cho cả sổ — sổ có cả
   giai đoạn chạy Claude, một giá trị bịa làm mọi phép so tiền/model sai vĩnh viễn.
4. **Neo idempotent của Sổ AI là `(nguon_tep, nguon_dong)`**, không phải băm nội dung và không
   phải `(giờ, page, psid, loại)`. Hai dòng thật giống hệt nhau trong một sổ append-only là
   chuyện bình thường; băm sẽ NUỐT dòng thật và làm sai đúng cái phép «đối chiếu số dòng» mà
   02 §L0 đòi. Ca `A6` chứng minh sổ nối thêm ở cuối vẫn nạp đúng phần mới.
5. **Khoá mã hoá đọc từ `V3_KHOA_MA_HOA`, thiếu là ném lỗi.** Không sinh khoá mặc định trong mã
   nguồn — khoá nằm trong repo thì cột «đã mã hoá» chỉ là lời khai. CHECK ở tầng CSDL
   (`khoa_api_ma LIKE 'v1.%'`) là rào thứ hai: code quên gọi bộ mã hoá thì INSERT đỏ ngay.
   ⚠️ `.env` **chưa có biến này** → đã ghi §9 (việc NGƯỜI, chặn B ở L1-M4).
6. **`san_pham`/`goi_gia` để trống.** 02 khai nguồn là POS (L1-M1). Nạp `kb-overrides.products`
   bây giờ sẽ đẻ một danh mục nửa vời mà L1-M1 phải hoà giải. Ghi §9 để L1-M1 quyết.
7. **Toàn bộ dữ liệu vào team `chua-phan`.** Không đoán team theo thị trường (139/502 page có
   `market`, nhưng thị trường ≠ team). Chờ H7.
8. **CHECK trạng thái hội thoại theo 6 giá trị đo được** (`GREET·QUALIFY·SELLING·CLOSING·HANDOFF·
POST_SALE`) và chủ sở hữu theo 3 (`AI·SALE·BOTCAKE`). Giá phải trả: L2/L3 thêm trạng thái
   mới thì phải mở một bản migrate — nhìn thấy được, hơn là im lặng nuốt rác.

## 4 · Kết quả nghiệm thu ④ (đo trên sandbox `aicloser_v3_nt_l0m1`, cây `f967076`)

| Phép                                 | Số đo                                                                                                                                                  | Kết |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| ① migrate 2 lượt                     | rc lần 2 = **0** · `_migrations` **1 → 1**                                                                                                             | ✔   |
| ② danh sách bảng ↔ neo 19 tên của 02 | **19** bảng · thiếu **(không)** · thừa **(không)**                                                                                                     | ✔   |
| ③ phủ `team_id`                      | bảng nghiệp vụ thiếu cột = **0** · NULLABLE = **`bo_luat_chung`**                                                                                      | ✔   |
| ④a page                              | `pages.json` **502** ↔ `page` **502** · diff **RỖNG**                                                                                                  | ✔   |
| ④b công tắc AI                       | `bot_ai_bat` **46** ↔ file **47** · DB\file **RỖNG** · file\DB = **`1125576063976794`** (page lạc, đã vào §9)                                          | ✔   |
| ④c hội thoại                         | hợp khuôn **18.790** ↔ `hoi_thoai` **18.790** · khoá sai khuôn bỏ qua: **33**                                                                          | ✔   |
| ④d kịch bản                          | (71 bản trong 70 tệp) + (0 mục kb riêng) − (2 bản page lạc) = **69** ↔ `kich_ban` **69** · 73 mục kb không sinh dòng mới                               | ✔   |
| ④e di trú lượt 2                     | `502\|46\|18790\|69` **không đổi**                                                                                                                     | ✔   |
| ④ Sổ AI                              | **hoãn** — tệp chỉ có trên VPS (nợ §9, không tính đạt ở R0)                                                                                            | —   |
| ⑤ team + rào                         | slug = `auus,chua-phan,pialpha-eu,tieu-alpha` · thành viên team kỹ thuật = **0** · INSERT vào `chua-phan` **bị từ chối** · team nghiệp vụ **vẫn nhận** | ✔   |
| ⑥ chỉ-INSERT                         | `nhat_ky` từ chối UPDATE+DELETE · `so_ai` từ chối UPDATE+DELETE                                                                                        | ✔   |
| ⑦ `bo_luat_chung`                    | tieu-alpha **2** · auus **1** · pialpha-eu **1** (luật một-vế: **0**)                                                                                  | ✔   |
| ⑧ khoá mã hoá                        | 10 ký tự đầu đã lưu = **`v1.32K84ed`** (không `sk-`/`ey`)                                                                                              | ✔   |
| ⑨ diễn tập down                      | hội thoại trước down **18.790** (>0) · bảng còn lại sau down **0** · ②–⑧ **vẫn đạt**                                                                   | ✔   |
| ⑩ test                               | ca MỚI **30 xanh / 0 đỏ** · bộ cũ **18/23 tệp xanh**, đúng 5 tệp đỏ sẵn ở mốc nền                                                                      | ✔   |
| ⑪ (thêm) cổng không sửa nguồn        | vân tay 5 tệp/thư mục nguồn đầu ↔ cuối lượt **bằng nhau**                                                                                              | ✔   |

**TỔNG: 51 phép · ĐẠT 51 · TRƯỢT 0.**

## 5 · Test — nhánh nào chạm, nhánh nào không

**30 ca, 3 tệp** (`node --test test/l0-m1-*.test.js`):

- `l0-m1-luoc-do.test.js` (12) — hợp đồng ở tầng CSDL: neo 19 bảng · phủ `team_id` · seed ·
  rào team kỹ thuật (có ca cho-qua + ca cửa-ra) · chỉ-INSERT · hợp đồng `bo_luat_chung` 2/1/1 ·
  khoá mã hoá · `don_hang.nguon` · `khach.so_dien_thoai` NULL/UNIQUE · 1 LIVE mỗi page ·
  `schema.sql` không trôi · diễn tập down trên CSDL ĐÃ có dữ liệu.
- `l0-m1-di-tru.test.js` (11) — chạy trên **chính các tệp JSON thật**: phủ trường conv-state
  16/16 · diff hai chiều page · công tắc AI hai chiều · số hội thoại · phép quy đổi kịch bản
  (vế nguồn đo lại ĐỘC LẬP, không lấy từ hàm đang bị đo) · idempotent · page lạc · **chỉ đọc
  (vân tay tệp)** · `llmTurns` là mảng mốc · hai bản kịch bản · toàn bộ ở team kỹ thuật.
- `l0-m1-so-ai.test.js` (7) — **nhánh KHÔNG chạm được ở local**: `ai-messages.jsonl` chỉ có trên
  VPS. Chạy trên **mẫu trích 10 dòng** dựng đúng khuôn `src/ai-log.js:logAi` + 7 loại sự kiện
  của TONG-QUAN §11.2, ghi rõ trong tệp rằng đây là mẫu trích. Lượt nạp thật + đối chiếu số
  dòng chạy trên VPS đợt cutover.

Mỗi bộ ca dựng CSDL sandbox riêng (`aicloser_v3_test_<hậu tố>`) rồi tự dọn — luật 11 sổ điều
hành, và để cổng tái chạy được trên máy khác.

**Nhánh không chạm:** ① nạp Sổ AI thật (nêu trên) · ② `san_pham`/`goi_gia` (nguồn POS, L1-M1) ·
③ ghi khoá model thật (người B, L1-M4 — chỉ chạm bộ ghi bằng khoá dùng-một-lần của lượt đo).

## 6 · Ngoài phạm vi → đã APPEND §9 (cấm tiện tay sửa)

1. Page lạc **3** chứ không phải 1, kèm hệ quả đếm được.
2. **Bộ ca cũ ghi thẳng vào `conv-state.json` thật.** Phát hiện vì tệp nguồn đổi GIỮA hai lượt
   đo của chính lượt này: 18.790 khoá / 0 rác → 18.811 / 21 rác → 18.823 / 33 rác, mtime nhảy
   theo đúng lúc chạy `npm test`. Chỉ `test/l5-ab-followup.test.mjs` tự trỏ `CONV_STATE_FILE`
   đi nơi khác; 5 tệp còn lại ghi thẳng vào dữ liệu vận hành. Cổng `l0-m1.sh` **tự bảo vệ**
   bằng `CONV_STATE_FILE` tạm (đã kiểm: kết quả bộ cũ vẫn 18/5, nguồn không đổi mtime), và có
   phép ⑪ tự soi. Sửa bộ ca cũ nằm ngoài pathspec ③.
3. `npm test` (`node --test test/`) **gãy trên Node v25** + 5/23 tệp đỏ sẵn ở mốc nền +
   `node_modules` chưa từng cài. Sửa script `test` ngoài phạm vi (③ chỉ cho thêm dep `pg` và
   hai script `migrate`/`di-tru`).
4. `.env` chưa có `V3_KHOA_MA_HOA` — việc NGƯỜI, chặn B ở L1-M4.
5. `kb-overrides.products` chưa nạp + `pages.json.posApiKey` đã bị che (số đo cho L1-M1).

**Mốc nền của phép «bộ cũ không gãy»** (đo tại `3d1eed1`, SAU `npm install`, TRƯỚC mọi dòng code
của phiếu): **18 tệp xanh / 5 đỏ** — `conv-owner` · `guard-fastlane` · `intro` ·
`l8-botcake-rules` · `viec-2345`. Cổng so đúng danh sách này, không so con số.

## 7 · Việc còn treo cho lượt sau

- Nạp Sổ AI + đối chiếu số dòng **trên VPS** (nợ §9) — bộ nạp đã sẵn:
  `node db/di-tru/index.js --so-ai=/opt/aicloser/ai-messages.jsonl --ma-model-cu=<mã>`.
- H7 chốt mapping page ↔ team rồi UPDATE chuyển khỏi `chua-phan`.
- L0-M2: đọc §6 của `docs/v3/ban-giao/luoc-do-v1.md` — nghiệm thu cách ly team **không đo được**
  trên dữ liệu di trú (100% đang ở `chua-phan` ⇒ tập rỗng).

Không còn marker «cần làm rõ» (khuôn `NEEDS CLARIFICATION`) nào trong lượt này — mọi chỗ
phải đoán đều đã thành một phán có lý do ở §3, hoặc một dòng §9.
