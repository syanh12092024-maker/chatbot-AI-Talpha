# Tổng kết v2 — nghiệm thu, tình trạng thật, gói deploy

> Phiên tổng kết 11/08/2026 · nhánh `fix-images` @ `14cc4ee`.
> Mọi con số dưới đây **tự chạy lại** trên dữ liệu thật kéo từ VPS (chỉ đọc, 16.097 bản ghi
> Sổ AI · 39 page · 22/07→10/08) hoặc trên code thật. Con số không tự kiểm chứng được đều
> ghi rõ **⚠️ chưa kiểm chứng** — không chép lại của phiên con.
> `npm test` trước và sau phiên này: **197 test · 196 pass · 1 skip · 0 fail**. Không sửa code.

---

## ① Kết luận

> **DEPLOY ĐƯỢC — nhưng chỉ vòng 1, và phải tắt tay 1 công tắc trước khi bấm.**
> Vòng 2 (L5–L8) **chưa gộp một dòng nào**; tiền đề "đã gộp đủ 8 luồng" là sai.
> Chặn cứng lớn nhất không nằm ở code: **tài khoản Kimi hết tiền, 0/39 page đang bật AI,
> bot im từ 08/08.** Deploy xong bot vẫn không nói được cho tới khi nạp tiền.

Ba câu bắt buộc trả lời bằng số:

| Câu hỏi | Trả lời |
|---|---|
| Deploy đêm nay, cái gì vỡ cao nhất? | **M05 khoá oan hội thoại.** Đo được 30,2% hội thoại bị khoá `HANDOFF` vì tưởng sale đã tiếp quản; ngưỡng lùi của chính luồng này là >15%. Nó sẽ chạm ngưỡng ngay trong báo cáo 6h đầu. |
| Vỡ rồi bao lâu mới biết, nhìn vào đâu? | **≤6h** nếu ai đó chủ động chạy lệnh đếm `HANDOFF`. **Không có cảnh báo tự động** — M18 Ops Console nằm ở L6 chưa gộp. Nhìn: tỷ lệ `type=handoff` trong `ai-messages.jsonl` và số hội thoại `state=HANDOFF` trong `conv-state.json`. |
| Lùi về đâu, mất bao lâu? | `182745a` (đúng commit production đang chạy). **~40 giây**, xem §⑦. |

---

## ② Bảng 20 module — trạng thái thật

Kiểm bằng: có file · có test import module đó · có nối vào cây `import` từ `src/server.js` · công tắc `.env`.

**Trạng thái thật** = `CHẠY ĐƯỢC` · `CÓ CODE CHƯA NỐI` · `CHỈ CÓ SPEC` · `KHÔNG CÓ GÌ`.

| Mã | Module | File | Test | Đã nối | Công tắc (mặc định) | Trạng thái thật |
|---|---|---|---|:---:|---|---|
| M01 | Token & Page Registry | `page-registry.js` | ❌ **không có** | ✅ | `PAGE_REGISTRY` (BẬT) | CHẠY ĐƯỢC |
| M02 | Script Studio | `admin-scripts.js` + `kb.js` | ✅ `script-studio` | ✅ | `SCRIPT_REQUIRE_REVIEW` (BẬT) | CHẠY ĐƯỢC |
| M03 | Readiness Gate | `readiness.js` | ✅ `script-studio` | ✅ | `READINESS` (BẬT) · `READINESS_AUTO_DISABLE` (**TẮT**) | CHẠY ĐƯỢC |
| M04 | Ingest · debounce thích ứng | `turn-complete.js` | ✅ `turn-complete` | ✅ | `DEBOUNCE_DONE_MS=5000` / `MORE_MS` | CHẠY ĐƯỢC |
| M05 | Conversation Owner | `conv-owner.js` + `conv-state.js` | ✅ `conv-owner` | ✅ | `HUMAN_TAKEOVER` (BẬT) ⚠️ | CHẠY ĐƯỢC — **rủi ro cao** |
| M06 | Fast Lane | `fast-lane.js` | ✅ `guard-fastlane` | ✅ | `FASTLANE`, `FASTLANE_TEMPLATES` (BẬT) | CHẠY ĐƯỢC |
| M07 | Context Builder | `context.js` | ✅ `context` | ✅ | `CTX_COMPRESS` (BẬT) | CHẠY ĐƯỢC |
| M08 | AI Closer | `closer.js` + `prompts.js` | ✅ `l4-prompt` | ✅ | — | CHẠY ĐƯỢC |
| M09 | Outbound Guard | `outbound-guard.js` | ✅ `guard-fastlane` | ✅ | — (không có công tắc tắt) | CHẠY ĐƯỢC |
| M10 | Dispatcher + Sổ AI | `pancake-poll.js` + `ai-log.js` | ⚠️ chỉ `botcake-yield` | ✅ | `PK_MARK_UNREAD`, `PK_TAG_*` | CHẠY ĐƯỢC — **thủng, xem ④.3** |
| M11 | Lead Score & Turn Budget | `lead-score.js` | ✅ `lead-score` | ✅ | `LEAD_BUDGET` (BẬT) | CHẠY ĐƯỢC |
| M12 | Follow-up Engine | `followup.js` + `scheduler-followup.js` | ✅ (ở worktree L5) | ❌ | `FOLLOWUP` | **CÓ CODE CHƯA NỐI** — ngoài nhánh |
| M13 | Post-Sale Router | `post-sale.js` | ✅ `post-sale` | ✅ | `POST_SALE_ROUTER` (BẬT) | CHẠY ĐƯỢC |
| M14 | Order Bridge | `order-bridge.js` | ✅ (ở worktree L7) | ❌ | — | **CÓ CODE CHƯA NỐI** — ngoài nhánh |
| M15 | Conversation Miner | `miner.js` + `template-learner.js` | ✅ (ở worktree L7) | ❌ | — | **CÓ CODE CHƯA NỐI** — ngoài nhánh |
| M16 | Script Optimizer | — | — | ❌ | — | **CHỈ CÓ SPEC** (vòng 3 / L9) |
| M17 | Experiment Engine (A/B) | `experiment.js` | ✅ (ở worktree L5) | ❌ | — | **CÓ CODE CHƯA NỐI** — ngoài nhánh |
| M18 | Ops Console | `admin-ops.js` + `ops.html` | ✅ (ở worktree L6) | ❌ | — | **CÓ CODE CHƯA NỐI** — ngoài nhánh |
| M19 | Health Watchdog | `llm-health.js` (rút gọn) | ⚠️ gián tiếp | ✅ | — | CHẠY ĐƯỢC **(bản rút gọn)** · bản đầy đủ `health.js` ở L6 chưa nối |
| M20 | Unit Economics | `economics.js` + `admin-economics.js` | ✅ `economics` | ✅ | `ECON_WEEKLY` (BẬT) | CHẠY ĐƯỢC |

**Đếm:** 13 CHẠY ĐƯỢC · 5 CÓ CODE CHƯA NỐI · 1 CHỈ CÓ SPEC · 1 chạy được ở bản rút gọn.

Hai lỗ hổng test đáng ghi: **M01 không có test nào**, và **`handler.js` — file điều phối trung tâm,
nơi mọi cửa canh xếp hàng — không có test trực tiếp nào import nó.**

> 5 file "mồ côi" (`local-chat.js`, `report-cli.js`, `subscribe-pages.js`, `wa-login.js`,
> `web.js`) không nằm trong cây import của server — đúng thiết kế, chúng là điểm vào CLI riêng.

---

## ③ Nghiệm thu 8 luồng

### 🔴 Trước hết: 4 trong 8 luồng CHƯA ĐƯỢC GỘP

Tiền đề của phiên này ("đã gộp đủ 8 luồng") **sai**. Bằng chứng:

```
git rev-list --count 11a2361..v2/l5-ab-followup   → 0
git rev-list --count 11a2361..v2/l6-van-hanh      → 0
git rev-list --count 11a2361..v2/l7-miner-order   → 0
git rev-list --count 11a2361..v2/l8-botcake       → 0
```

Cả 4 nhánh vòng 2 đứng nguyên ở `11a2361` — **không một commit nào**. Code của chúng tồn tại
dưới dạng **thay đổi chưa commit** trong 4 worktree riêng. Mất máy là mất sạch.

| Worktree | File mới | File sửa | `npm test` riêng |
|---|---|---|---|
| `wt-l5-ab-followup` | 4 (+1 test) | `admin.js` `conv-state.js` `server.js` | 256 · 255 pass · 0 fail |
| `wt-l6-van-hanh` | 3 (+1 test) | `admin.js` `admin.html` `bot-registry.js` `llm-health.js` | 227 · 226 pass · 0 fail |
| `wt-l7-miner-order` | 5 (+1 test) | `admin.js` `admin.html` `server.js` `tools.js` `.gitignore` | 229 · 228 pass · 0 fail |
| `wt-l8-botcake` | 4 (+1 test +1 doc) | `admin.js` `admin.html` `fast-lane.js` `kb.js` | 236 · 234 pass · 0 fail |

Mỗi luồng xanh **khi chạy một mình trên nền cũ**. Chưa luồng nào được chạy cùng luồng khác.
Cả 4 worktree tụt sau `fix-images` **đúng 1 commit, và commit đó chỉ là tài liệu** → gộp
không vướng nợ kỹ thuật nào; cái vướng là nghiệm thu, không phải git.

### Vì sao KHÔNG deploy vòng 2 lần này

Ba lý do, xếp theo mức chặn:

1. **Không có gì để deploy** — 0 commit. `git push` chỉ đẩy được vòng 1.
2. **Chưa bao giờ chạy chung** — 4 luồng cùng sửa `admin.js`/`admin.html`/`server.js`, và
   mỗi luồng chạm một mảnh đường nóng khác nhau. Hệ ghép chưa chạy lần nào.
3. **Không một tiêu chí nghiệm thu nào của L5–L8 đạt** — cả 4 đều đòi *"chạy lại trên
   ≥5.000 tin khách THẬT"*, mà bước đó cần hội thoại Pancake (R7).

Rủi ro **không đồng đều** giữa 4 luồng — ghi lại để lần gộp sau xếp đúng thứ tự:

| Luồng | Chạm đường nóng | Rủi ro | Nó chữa cái gì |
|---|---|---|---|
| **L6** | `bot-registry.js` (refactor **giữ nguyên hành vi**: `isAutomationTemplate` = `matchTemplate().hit`), `llm-health.js` | **Thấp** | M18 Ops Console + M19 — **chính là bộ đo cho 48h theo dõi** ở §⑦ |
| **L7** | `tools.js` (đường ghi chú đơn) | **Vừa** | `template-learner` — vá sổ template rỗng (R4) ⇒ hạ khoá oan M05 30,2% → 8,6% (R2) |
| **L5** | `conv-state.js` | **Vừa** | M17 A/B. M12 mặc định TẮT (R8) |
| **L8** | `fast-lane.js` (94 thêm / 7 xoá) | **Cao nhất** | Bảng kịch bản — nhưng mục tiêu 45–50% dựng trên mốc xuất phát **đã sai** (⑤ #1) |

> ⚠️ **Cái giá phải trả cho quyết định này, nói thẳng:** deploy vòng 1 mà không có L6 nghĩa là
> **theo dõi 48h bằng tay** (§⑦ bước 3), và không có L7 nghĩa là **cố ý deploy một M05 què**
> — vì `HUMAN_TAKEOVER=0` chỉ là băng dán, thứ chữa gốc nằm ở `template-learner` của L7.
> Chủ dự án đã cân nhắc và **chọn giữ nguyên kế hoạch vòng 1** (11/08/2026). Ghi ở đây để
> lần sau không ai phải hỏi lại vì sao.

### Vòng 1 — đã gộp, đối chiếu từng mục

| Luồng | Tiêu chí | Kết quả | Bằng chứng |
|---|---|:---:|---|
| **L1** | `npm test` xanh + test riêng economics | ✅ | 197/196/0 · `test/economics.test.mjs` |
| L1 | Server boot sạch, `/health`=200 | ✅ | HTTP 200 `{"ok":true,"pages":3}`, 0 dòng lỗi |
| L1 | Chạy lại trên Sổ AI THẬT, khớp `/token-cost` <1% | ⚠️ | Chạy lại được trên 16.097 bản ghi thật, ra **133đ/lượt · 7.934đ/đơn**. Nhưng **không đối chiếu được** với `/token-cost` production: dashboard cần Basic Auth trên VPS đang chạy, và cùng công thức thì phép so là vòng tròn |
| L1 | Cắt được theo page × scriptVersion × lane | ⚠️ | Code cắt được (`DIMS`), nhưng **Sổ AI production có 0/9.036 bản ghi mang `lane`/`state`/`scriptVersion`** → chiều cắt rỗng cho tới khi deploy |
| L1 | 4 ngưỡng cảnh báo bắn đúng | ✅ | `ALERT_RULES` có test |
| **L2** | `npm test` xanh, không hỏng test cũ | ✅ | |
| L2 | M11: lượt AI/ngày −≥30%, khách ≥6 lượt tăng ≥3× | ⚠️ | **Chưa kiểm được** — cần chạy thật trên khách; mọi số hiện có là replay |
| L2 | M13: khách báo hàng lỗi → không quảng cáo, chuyển sale trong 1 lượt | ✅ | `test/post-sale.test.mjs` + đọc code `handler.js:184-209` — M13 chặn **trước cả** Fast Lane |
| L2 | M07: input/lượt ≤1.400 token trên ≥200 lượt thật | ⚠️ | **Chưa kiểm được** — cần hội thoại Pancake thật, token local bị Pancake từ chối (HTTP 429). Đo gián tiếp: system prompt TB **3.128 token** (44 page thật), phần ngữ cảnh chưa đo tách được |
| L2 | Chạy lại trên hội thoại THẬT | ❌ | Không kéo được hội thoại về máy (xem ⑥.R7) |
| **L3** | `npm test` xanh · boot sạch | ✅ | |
| L3 | Sửa kịch bản hiệu lực ≤60s không restart | ✅ | `writeLiveConfig()` ghi cả file lẫn `pageMap` RAM (`kb.js:224`) |
| L3 | Kịch bản giá lệch bảng giá → bị chặn | ✅ | test `script-studio` |
| L3 | Khôi phục bản cũ → tin sau dùng đúng bản | ✅ | test `script-studio` |
| L3 | Bật AI cho page thiếu `salesPrompt` → từ chối | ✅ | test `script-studio` |
| L3 | Bản tin 09:00 tách `MISSING_SCRIPT` / `THIN_SCRIPT` | ✅ | test `D2 · 37 page THIN_SCRIPT…` |
| L3 | **Validator trên 38 kịch bản THẬT từ VPS** | ✅ | Chạy lại: **41/44 page có đủ `greeting`+`salesPrompt`** · 0 page mỏng (<120 tok) · 3 page thiếu · **2/44 có `tone`**. Kịch bản TB **1.246 token** |
| **L4** | `npm test` xanh · boot sạch | ✅ | |
| L4 | Bỏ lần gọi LLM của classifier | ✅ | `classifier.js` 117 dòng, **0 lời gọi API**, giữ nguyên chữ ký `classify()` → `handler.js` không đổi dòng nào |
| L4 | Gộp `BASE`+`HARD_RULES` ~1.800 token | ✅ | **CORE đo được 1.871 token** (mốc cũ 3.290 / đo lại 4.686) |
| L4 | Không động khối kịch bản page | ✅ | `buildSystem()` giữ nguyên khối, có ghi chú cấm cắt |
| L4 | Cache anchor ở khối CUỐI | ✅ | `prompts.js:107` — `cache_control` trên khối KB, khối cuối |
| L4 | `max_tokens` 1024→400 | ✅ | `closer.js:37` |
| L4 | Bỏ `score_lead` | ✅ | Không còn khai báo, chỉ còn ghi chú lịch sử |
| L4 | **calls/lượt ≤1,2** (hiện 2,28) | ⚠️ | **Chưa kiểm được trên thật.** Sổ AI production vẫn cho **2,28** vì code chưa deploy. Suy luận cấu trúc: bỏ 1 lời gọi classifier/lượt → cận trên ~1,28; chỉ đo được sau deploy |

### Vòng 2 — không nghiệm thu được

L5–L8 **không có mục nào đánh ✅** vì tiêu chí chung của cả 4 là *"chạy lại trên ≥5.000 tin
khách THẬT"* / *"chạy khô trên dữ liệu thật từ VPS"*, mà bước đó cần hội thoại Pancake —
không lấy được (⑥.R7). Bốn luồng đều tự báo test xanh + boot sạch, và tôi **xác nhận lại được
hai mục đó** bằng cách chạy `npm test` trong từng worktree. Mọi mục còn lại: **⚠️ chưa kiểm chứng.**

Riêng L8 tự ghi trong `10-L8-BAO-CAO.md` rằng Fast Lane phải tăng 36,2% → 45–50%. Mốc xuất
phát 36,2% **đã sai** (xem ⑤) → mục tiêu này cần đặt lại trước khi nghiệm thu.

---

## ④ Mâu thuẫn giữa các luồng

### Đã được xử lý ở vòng gộp — kiểm lại thấy sạch

**1. `scriptVersion` (L1) vs phiên bản kịch bản (L3) — ĐÃ THỐNG NHẤT.**
`ai-log.js:55` lấy `getScriptDoc().live.version` của M02 làm mã (`v1`, `v2`…), chỉ băm nội
dung khi page chưa có kho phiên bản. Không còn cảnh Script Studio nói "v3" mà Sổ AI ghi
"9f2a1c04".

**2. Hai nơi cùng chấm điểm lead (L2 vs L4) — ĐÃ GỠ.**
Tool `score_lead` bị L4 bỏ hẳn; `lead-score.js` của L2 là nơi duy nhất chấm điểm, dùng bởi
`handler.js` và `context.js`. Không trùng.

**3. Ngân sách lượt bị trừ hai lần — KHÔNG XẢY RA.**
Kiểm đường đi: Fast Lane xử lý xong thì `handler.js:236/246` **return sớm**, không bao giờ
tới `checkBudget()`. Ngân sách đọc `llmTurns24h(convId)`, chỉ tăng ở `noteTurnSpent()` sau
`runCloser()`. Hai bộ đếm tách bạch đúng: `recentReplyCount` (lượt đắt tiền → M11) và
`recentBotTurns` (bot đã nói chưa → cửa im lặng Fast Lane).

**4. Sổ template: L6 sở hữu `bot-registry.js`, L7 chỉ sinh mẫu — TUÂN THỦ.**
L7 không sửa `bot-registry.js`, chỉ ghi `botcake-templates.json` rồi gọi `reloadTemplates()`.
Đúng thoả thuận `09-VONG-2-CAP-NHAT.md:95`.

### 🔴 Còn mở — phải xử lý

**5. Thứ tự cửa canh KHÁC spec.** Đọc `handler.js`, thứ tự thật là:

```
STOP_CONTACT → M13 hậu bán → M11 chấm điểm → M06 Fast Lane
  → classify (luật thuần) → M11 ngân sách → M07 ngữ cảnh → M08 → M09
```

Spec `00-TONG-QUAN.md §5` vẽ `M04→M05→M06→M11→M07→M08→M09→M10` — **không hề có M13 trong sơ đồ**.
Code đặt M13 **trước** Fast Lane và tách M11 làm hai nửa. Code có lý do viết rõ tại chỗ
(khách đã nhận hàng mà bị dội quảng cáo là lỗi nặng nhất; chấm điểm trước để chuỗi tin cụt
vẫn bị trừ điểm). **Code đúng, sơ đồ spec sai** → sửa spec.

**6. `admin.js` bị cả 4 luồng vòng 2 sửa.** Mỗi luồng thêm **đúng 1 dòng** mount router theo
quy ước `08-SONG-SONG §3` — va chạm văn bản ở cùng một mỏ neo, gỡ tay ~10 giây, **giữ cả 4 dòng**.
`public/admin.html` (3 luồng) và `src/server.js` (L5+L7) cùng kiểu. Đây là va chạm **đã được
thiết kế để rẻ**, không phải va chạm logic.

**7. Vi phạm quyền sở hữu file — 2 ca, đều nhỏ:**

| Luồng | File | Vi phạm | Đánh giá |
|---|---|---|---|
| L7 | `src/tools.js` | Không nằm trong cột "sở hữu" của L7 (là file của L4) | 5 thêm / 8 xoá — thay ghi chú tự do bằng `recordClosedOrder()` của M14. **Là điểm đấu nối bắt buộc**, không có đường nào khác. L4 đã gộp xong nên không đụng ai. Chấp nhận, nhưng phải đọc kỹ khi gộp |
| L5, L7 | `src/server.js` | Không thuộc sở hữu của luồng nào | Mỗi bên thêm 1 dòng khởi động scheduler. Cùng kiểu quy ước 1-dòng. Chấp nhận |

L6 và L8 **tuân thủ hoàn toàn**. Kiểm riêng L8 với `kb.js` (*"chỉ THÊM"*): `61 thêm / 0 xoá` ✅.

**8. Đụng số hiệu tài liệu.** L8 tạo `docs/v2/10-L8-BAO-CAO.md`, file này là
`docs/v2/10-TONG-KET-V2.md`. Hai file cùng số 10 — đổi tên báo cáo L8 khi gộp.

**9. Đường dẫn sổ template lệch nhau (tiềm ẩn).** `bot-registry.js` cắm cứng
`<repo>/botcake-templates.json`; `template-learner.js` dùng `TEMPLATE_FILE` env. Mặc định
hai bên trỏ cùng chỗ nên **hiện không sai**, nhưng ai đặt `TEMPLATE_FILE` là L7 duyệt mẫu
vào một file còn L6 đọc file khác — **mẫu duyệt xong không có tác dụng, im lặng**. Sửa khi gộp.

---

## ⑤ Sáu con số nền — mốc cũ vs đo lại

Dữ liệu: **16.097 bản ghi Sổ AI thật** (`/opt/aicloser/ai-messages.jsonl`, 39 page, 22/07→10/08),
**44 kịch bản page thật** (`kb-overrides.json` từ VPS). Kéo bằng `ssh cat`, **không ghi gì lên VPS**.

| # | Chỉ số | Mốc trong prompt | **Đo lại** | Lệch | Kết luận |
|---|---|---|---|---|---|
| 1 | Fast Lane xử lý | 36,2% | **⚠️ chưa kiểm chứng** | — | Cần ≥5.000 tin **khách**; Sổ AI chỉ lưu tin **bot**. Số gần nhất tin được: **33,7%** (`09-DO-THAT §B1`, 7.886 tin thật). **Mốc 36,2% trong prompt đã lỗi thời** |
| 2 | M09 chặn tin AI | 2,0% | **9,2% bị bắt** — 5,4% block + 3,8% rewrite | **+360%** 🔴 | Chạy lại `guardOutbound()` trên **9.036 tin AI thật**, khớp bảng giá theo **đúng `pageId`**. Đã điều tra, xem dưới |
| 3 | M05 khoá hội thoại | 45% | **⚠️ chưa kiểm chứng** | — | Cần hội thoại Pancake. Số gần nhất tin được: **30,2%** nhận nhầm (`09-DO-THAT §B3`, 2.205 hội thoại) |
| 4 | Sổ nhận diện template phủ | 32,1% | **0%** 🔴 | — | `botcake-templates.json` **không tồn tại trên VPS** (kiểm `ls /opt/aicloser/*.json`). Sổ rỗng → `isAutomationTemplate()` gần như không chặn được gì |
| 5 | M04 bắt cụm còn dở | 83,2% | **⚠️ chưa kiểm chứng** | — | Cần 1.354 tin khách có nhãn — tập đó không còn trên đĩa. `test/turn-complete.test.mjs` xanh nhưng là test tự chế |
| 6 | Chi phí/đơn | 7.502đ | **7.934đ** | +5,8% | Tái lập **chính xác 7.502đ** — rồi tìm ra vì sao nó sai, xem dưới |

### #2 — vì sao 2,0% thành 9,2%, và vì sao KHÔNG phải luật quá chặt

Bẫy "khớp KB theo `pageId`" đã tránh được: tôi trỏ `KB_PATH` vào file không tồn tại để `kb.js`
chạy đúng chế độ VPS (chỉ `kb-overrides.json`), và **chặn cứng script nếu rơi vào chế độ
`singleKB`** — đúng cái đã đẩy lần đo đầu lên 19%. Kết quả trên 9.036 tin, mọi page đều có
bảng giá riêng:

| Luật | Hành động | Số | Tỷ lệ |
|---|---|---|---|
| `EMPTY` | block | 489 | 5,4% |
| `FAKE_SCARCITY` | rewrite | 154 | 1,7% |
| `PII_ECHO` | rewrite | 139 | 1,5% |
| `PRICE_MISMATCH` | rewrite | 43 | 0,5% |
| `DELIVERY_PROMISE` | rewrite | 7 | 0,1% |
| `VIETNAMESE` | block | 1 | 0,0% |

**489 tin `"..."` AI đã thật sự gửi cho khách thật.** `FAKE_SCARCITY` bắt AI bịa
`"special 60% OFF sale"` mà KB không hề có. 9,2% không phải luật chặt — nó là **ảnh chụp AI v1
đang làm sai bao nhiêu**. Guard đang chặn đúng chỗ, và đây là lý do mạnh nhất để deploy.

Khớp sát `09-DO-THAT §B2` (5,6% / 4,0%) — chênh nhỏ vì bản đó loại 709 tin của page chưa có giá.

⚠️ **Đây là cận dưới.** Sổ AI chỉ lưu 80 ký tự đầu; **83,4%** bản ghi bị cắt đúng mốc đó, nên
luật soi phần đuôi (giá sai cuối tin, tin quá dài, trùng tin trước) bị đo thấp.

### #6 — 7.502đ và 7.934đ là CÙNG một phép đo dưới HAI bảng giá

Hai tài liệu ghi hai số và trông như mâu thuẫn. Chạy lại `economics()` trên cùng bộ dữ liệu:

| Bảng giá dùng để quy tiền | chi phí/lượt | chi phí/đơn |
|---|---|---|
| Anthropic (`in 1.0 · cache 0.1 · out 5.0`) | 125đ | **7.502đ** |
| **Kimi** (`in 0.95 · cache 0.16 · out 4.0`) | **133đ** | **7.934đ** |

**Production chạy `AI_PROVIDER=kimi`** (kiểm `.env` trên VPS) và **100% (4.115/4.115) lượt có
số đo token đều thuộc thời Kimi** — đo token bật đúng 06/08, cùng ngày chuyển sang Kimi.
⇒ **7.934đ là con số đúng. 7.502đ là số ảo do quy tiền bằng bảng giá của nhà cung cấp không chạy.**
Nguồn sai: chạy `economics()` trên máy local có `AI_PROVIDER=anthropic`, nó lặng lẽ lấy giá Anthropic.

Còn một điều phải nói rõ với người đọc: `vndPerOrder` **không phải** "tiền đã tiêu ÷ số đơn".
Công thức là `đơn giá 1 lượt × (tổng lượt / số đơn)` — nó **dự phóng** giá lượt đo được ra
toàn bộ 9.036 lượt. Tiền thật đã tiêu trên các lượt đo được ÷ 151 đơn chỉ là **3.613đ**.
Cả hai đều đúng theo định nghĩa của mình; đừng lẫn khi so với mục tiêu ≤2.000đ.

### Các số nền khác đo được luôn

| Chỉ số | Mục tiêu v2 | **Đo lại (thật)** |
|---|---|---|
| calls / lượt | ≤1,2 | **2,28** — chưa deploy nên chưa hưởng L4 |
| token vào / lượt | ≤5.000 | **12.988** (trong đó 10.082 là đọc cache) |
| % tiền vào lượt AI đầu | ≤20% | **69,7%** 🔴 |
| tỷ lệ chốt | 4,0% | **3,07%** (151 đơn / 4.913 khách) — **cao hơn mốc 2,0% trong tài liệu** |
| system prompt TB | — | **3.128 token** (tài liệu ghi 4.686 — đã lỗi thời sau L4) |
| tin bàn giao / tin AI | — | **42,7%** (3.861 / 9.036) |

---

## ⑥ Sổ rủi ro — xếp theo thiệt hại

### 🔴 R1 · Kimi hết tiền — bot đang chết, deploy không cứu được
- **Hiện tượng:** 0/39 page bật AI (`ai-enabled.json` = `[]`), tin AI cuối **08/08/2026 20:47**,
  **0 tin trong 24h qua**, 34.738 dòng lỗi credit trong log.
- **Phát hiện:** `ssh … 'cat /opt/aicloser/ai-enabled.json'` → `[]`.
- **Lùi:** không phải việc của code. **Chặn cứng, chỉ chủ dự án gỡ được.**
- ⚠️ Hệ quả cho deploy: bấm deploy xong sẽ **không quan sát được gì** vì không có lượt nào chạy.
  **Nạp tiền trước, deploy sau** — nếu không thì 48h theo dõi là 48h nhìn màn hình trống.

### 🔴 R2 · M05 khoá oan hội thoại — 30,2%, gấp đôi ngưỡng lùi
- **Hiện tượng:** khách nhắn, AI im hoàn toàn, hội thoại nằm chờ sale mà sale không biết.
  Nguyên nhân: template Botcake/RTO bị tưởng là người thật gõ tay (cùng một câu lặp ở 56
  hội thoại khác nhau).
- **Vì sao chưa vá được:** sổ nhận diện `botcake-templates.json` **không tồn tại trên VPS** (R4).
- **Phát hiện:** đếm hội thoại `state=HANDOFF` / tổng hội thoại. Ngưỡng nghi ngờ **>15%**.
- **Lùi:** đặt `HUMAN_TAKEOVER=0` rồi `systemctl restart aicloser` (~30s). Tắt riêng phần nhận
  diện người thật, **giữ nguyên mọi thứ còn lại của vòng 1**.
- 👉 **Khuyến nghị: deploy thẳng với `HUMAN_TAKEOVER=0` ngay từ đầu.** Bật lại sau khi có sổ template.

### 🔴 R3 · Chưa module nào chạy trên khách thật
- 8 luồng, 20 module, **mọi con số đều là replay**. Kể cả các số trong báo cáo này.
- Rủi ro không nằm ở module nào cụ thể mà ở **tương tác giữa chúng** — thứ replay không mô phỏng được.
- **Phát hiện:** 20 hội thoại đọc tay sau 24h (§⑦). Số liệu không bắt được "câu trả lời vô duyên".

### 🟠 R4 · Sổ nhận diện template rỗng trên production
- `botcake-templates.json` không có trên VPS → `isAutomationTemplate()` gần như vô hiệu.
- Đây là **nguyên nhân gốc của R2**. Vá nó là hạ 30,2% → 8,6% (theo `09-DO-THAT §B3`).
- Công cụ tự học nằm ở **L7 chưa gộp**.

### 🟠 R5 · Mọi công tắc v2 đều MẶC ĐỊNH BẬT, và production `.env` không có cái nào
- 8 công tắc (`FASTLANE`, `LEAD_BUDGET`, `CTX_COMPRESS`, `POST_SALE_ROUTER`, `HUMAN_TAKEOVER`,
  `BOTCAKE_YIELD_BEFORE_SEND`, `READINESS`, `PAGE_REGISTRY`) đều viết `!== '0'`.
- `.env` production **không chứa một biến nào trong số đó** → deploy = **bật hết cùng lúc**.
- **Lùi:** thêm biến `=0` rồi restart. Nhưng phải biết mà thêm **trước**, xem §⑦.

### 🟠 R6 · Vòng 2 chỉ tồn tại dưới dạng thay đổi chưa commit
- 4 worktree, ~18 file mới, 0 commit. Mất máy / lỡ tay `git checkout .` là mất sạch 5 ngày công.
- **Lùi:** không có. **Nên commit vào nhánh riêng ngay**, kể cả chưa gộp.

### 🟠 R7 · Không đo lại được các số cần hội thoại Pancake
- Token Pancake trên máy local bị từ chối (**HTTP 429** lúc thử; sổ sự cố ghi lỗi 121 trước đó).
- ⇒ 3/6 con số nền (#1 Fast Lane, #3 M05, #5 M04) **không tự kiểm chứng được ở phiên này**.
- **Lùi:** chấp nhận số của `09-DO-THAT-TRUOC-DEPLOY.md` (33,7% / 30,2%), là bản đo gần nhất
  trên dữ liệu thật — **không phải** mốc 36,2% / 45% trong prompt.

### 🟡 R8 · M12 Follow-up chủ động nhắn khách thật
- Sai là **spam người thật**, và khách đã bảo "đừng nhắn nữa" mà bị nhắn tiếp là đường ngắn nhất
  tới Block/Report — mất cả page, không phải mất một đơn.
- **Rủi ro bằng 0 ở lần deploy này** vì hai lớp: L5 chưa gộp, **và** công tắc
  `FOLLOWUP` **mặc định TẮT** (`followup.js` kiểm `=== '1'`, phải cố ý bật mới chạy).
  Đây là công tắc v2 **duy nhất** mặc định tắt — mọi công tắc khác đều mặc định bật (R5).
- Điều kiện bật (sau này): chạy khô, in ra **chính xác khách nào nhận gì**, chủ dự án duyệt từng dòng.

### 🟠 R9 · Tin doạ khách ở công cụ RTO
- Câu *"I'll be taking you to social media…"* kèm ký tự Unicode ẩn né lọc trùng của Meta.
- **Không nằm trong repo này. Không dòng code nào ở đây chặn được.** M09 chỉ chặn tin do **AI**
  soạn (`INVISIBLE_CHARS`, `THREAT`) — tin của công cụ RTO đi đường khác.
- Một khách report = mất page = mất toàn bộ traffic ads đổ vào page đó.

### 🟡 R10 · Lượt Fast Lane im lặng không được ghi Sổ AI
- `pancake-poll.js:304` `if (!reply) return;` nằm **trước** chỗ ghi sổ ⇒ 5 nhánh im lặng
  (`silent_sticker/start/affirm/thanks/greet`) không đẻ ra dòng sổ nào.
- Hệ quả: `fastLanePct` của M20 là **cận dưới**, và đúng những lượt **rẻ nhất** bị bỏ đếm.
- Code đã tự ghi chú lỗi này (`economics.js:93-99`) và **không tự sửa** vì `pancake-poll.js` là file
  luồng khác — đúng luật. **Ghi vào việc phải làm sau deploy.**

### 🟡 R11 · `main` local lệch `origin/main` 4 commit chưa đẩy
- `git checkout main && git merge fix-images && git push` sẽ **đẩy kèm 4 commit chưa ai duyệt**
  (sửa giao diện Pages, gửi nhiều ảnh hơn).
- **Lùi:** dùng đúng lệnh ở §⑦, không dùng lệnh gộp tuỳ hứng.

### 🟡 R12 · M01 và `handler.js` không có test
- `handler.js` là nơi mọi cửa canh xếp hàng. Đổi thứ tự một cửa thì **không test nào đỏ**.

---

## ⑦ Gói deploy

### Điều kiện tiên quyết (không đủ thì đừng bấm)
1. 🔴 **Nạp tiền Kimi.** Chưa có thì deploy xong cũng không quan sát được gì.
2. 🔴 **Chủ dự án duyệt bằng lời.**
3. 🟠 Commit 4 worktree vòng 2 vào nhánh riêng (R6) — làm trước cho an toàn, không liên quan deploy.

### Bước 0 · Đặt công tắc TRƯỚC khi deploy

`.env` production hiện **không có** biến nào dưới đây. Thêm nguyên khối này vào
`/opt/aicloser/.env` **trước** khi `git pull`:

```bash
# ── v2 vòng 1 · đặt 11/08/2026 ─────────────────────────────
HUMAN_TAKEOVER=0        # 🔴 TẮT — M05 nhận nhầm người thật 30,2% (ngưỡng lùi 15%). Bật lại khi có sổ template
FASTLANE=1              # BẬT — chặn 33,7% tin trước khi gọi model
FASTLANE_TEMPLATES=1    # BẬT
LEAD_BUDGET=1           # BẬT — ngân sách lượt theo độ nóng
CTX_COMPRESS=1          # BẬT — hồ sơ nén thay 20 tin thô
POST_SALE_ROUTER=1      # BẬT — khách đã nhận hàng không bị dội quảng cáo
BOTCAKE_YIELD_BEFORE_SEND=1  # BẬT — 2 cửa nhường Botcake
READINESS=1             # BẬT (bản tin), nhưng:
READINESS_AUTO_DISABLE=0     # 🔴 TẮT — đừng để hệ thống tự tắt AI page trong 48h đầu
AUTO_CREATE_ORDER=0     # 🔴 GIỮ TẮT — theo yêu cầu chủ dự án 07/08/2026
```

Ba biến đặt `=1` chỉ để **ghi rõ ý định** (mặc định đã bật). Ba biến `=0` là **bắt buộc**.

### Bước 1 · Deploy

Production đang ở `182745a` trên nhánh `main`; `origin/main` cũng `182745a`.
`fix-images` đi trước **20 commit** và **gộp được kiểu fast-forward**.

```bash
cd "/Users/syanh/Desktop/Chat Bot AI/messenger-closer" && git push origin fix-images:main
```

```bash
ssh root@169.58.33.8 'cd /opt/aicloser && git pull -q && systemctl restart aicloser && sleep 8 && systemctl is-active aicloser && curl -s localhost:3100/health'
```

Chờ `active` + `{"ok":true,...}`. Rồi bật AI lại cho page trên dashboard (hiện đang `[]`).

### Bước 2 · Lệnh LÙI — dán sẵn ra giấy trước khi bấm deploy

```bash
ssh root@169.58.33.8 'cd /opt/aicloser && git reset --hard 182745a && systemctl restart aicloser && sleep 8 && systemctl is-active aicloser'
```

**~40 giây.** `182745a` = *"Dời điểm neo cache xuống khối cuối"* — đúng commit production
đang chạy hôm nay, đã kiểm là tổ tiên của `fix-images`.

Lùi **mềm** (không mất cả gói) khi chỉ một module hư: đặt công tắc tương ứng `=0` rồi
`systemctl restart aicloser`.

### Bước 3 · 10 chỉ số theo dõi 48h đầu

Chưa có M18 Ops Console (L6 chưa gộp) ⇒ **phải chạy tay**. Mốc 6h / 24h / 48h.

| # | Chỉ số | Ngưỡng LÙI NGAY | Lùi bằng |
|---|---|---|---|
| 1 | Hội thoại `state=HANDOFF` / tổng | **>15%** | `HUMAN_TAKEOVER=0` |
| 2 | Tỷ lệ Fast Lane (`lane` ≠ `AI`) | **<25% hoặc >60%** | `FASTLANE_TEMPLATES=0` |
| 3 | M09 `block` / tin AI | **>8%** | *(không có công tắc — lùi cả gói)* |
| 4 | Bàn giao `kind=error` / ngày | **>50** (nền thường 8–12) | lùi cả gói |
| 5 | calls / lượt | **>1,5** | lùi cả gói |
| 6 | Chi phí / lượt (giá **Kimi**) | **>133đ** (không được tăng) | lùi cả gói |
| 7 | Token vào / lượt | **>6.000** | `CTX_COMPRESS=0` |
| 8 | Khách nhận **>12 lượt AI** / 24h | **≥1 ca** | `LEAD_BUDGET=0` |
| 9 | Tin AI gửi cho khách đã ở `POST_SALE` | **≥1 ca** | `POST_SALE_ROUTER=0` |
| 10 | Độ trễ trả lời TB | **>40s** | `DEBOUNCE_DONE_MS=3000` |

Lệnh đọc nhanh (chỉ đọc, chạy trên VPS):

```bash
ssh root@169.58.33.8 'cd /opt/aicloser && node -e "const fs=require(\"fs\"),n=Date.now(),r=fs.readFileSync(\"ai-messages.jsonl\",\"utf8\").split(\"\n\").filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{}}).filter(Boolean).filter(x=>n-x.t<216e5);const rep=r.filter(x=>x.type===\"reply\");const fl=rep.filter(x=>x.lane&&x.lane!==\"AI\");console.log(\"6h:\",rep.length,\"tin AI |\",(fl.length/rep.length*100).toFixed(1)+\"% FastLane |\",r.filter(x=>x.type===\"handoff\").length,\"bàn giao |\",r.filter(x=>x.type===\"handoff\"&&x.kind===\"error\").length,\"lỗi kỹ thuật\")"'
```

### Bước 4 · 20 hội thoại đọc TAY sau 24h

Số liệu không bắt được *"câu trả lời vô duyên"*. Chọn có chủ đích, không lấy ngẫu nhiên:

| Số ca | Chọn thế nào | Đang soi điều gì |
|---|---|---|
| 5 | Hội thoại bị khoá `HANDOFF` | **R2** — có đúng là người thật gõ, hay khoá oan? |
| 4 | Hội thoại Fast Lane lo **trọn vẹn** (0 lượt AI) | Câu mẫu có trả lời đúng thứ khách hỏi không? |
| 3 | Hội thoại chạm **trần ngân sách** lượt | Cắt đúng lúc hay cắt lúc khách sắp chốt? |
| 3 | Hội thoại có tin bị **M09 chặn** | Khách có bị bỏ lửng vì AI im không? |
| 3 | Hội thoại `POST_SALE` | Khách đã nhận hàng có bị chào bán lại không? |
| 2 | Hội thoại **đã tạo đơn** | Tổng tiền, thông tin có khớp không? |

---

## ⑧ Việc chỉ chủ dự án làm được — còn treo

| # | Việc | Trạng thái | Chặn cái gì |
|---|---|---|---|
| 1 | **Nạp tiền Kimi** | 🔴 bot chết từ 08/08, 0 page bật AI | Chặn **quan sát** sau deploy — deploy không có tiền là deploy mù |
| 2 | **Duyệt deploy bằng lời** | 🔴 chưa có | Chặn cứng |
| 3 | **Gỡ tin doạ khách ở công cụ RTO** | 🔴 ngoài repo | Rủi ro **mất page** — cao nhất trong tất cả, và code ở đây không chạm tới được |
| 4 | **Key Botcake cho ≥1 page THẬT** | 🟠 mới có key page nháp | Chặn nghiệm thu L8 |
| 5 | **Tắt 3 luật Botcake trùng Fast Lane** | 🟠 làm tay, thử 1 page trước | Bot đâm bot |
| 6 | Điều kiện khoá thẻ trong Botcake | ⬜ **TUỲ CHỌN** — AI đã tự nhường bằng 2 cửa | — |

### Việc kỹ thuật còn treo (không cần chủ dự án, nhưng đừng quên)

1. Commit 4 worktree vòng 2 vào nhánh riêng — **R6, làm ngay**.
2. Ghi Sổ AI cho cả lượt Fast Lane im lặng — R10, cần sửa `pancake-poll.js`.
3. Viết test cho `handler.js` và `page-registry.js` — R12.
4. Gộp vòng 2 theo thứ tự **L6 → L7 → L5 → L8**, xử 4 điểm ở §④ (5,6,7,8,9).
5. Đổi tên `10-L8-BAO-CAO.md` → `11-L8-BAO-CAO.md`.

---

## Phụ lục · Chỗ tài liệu nói khác code thật

Chưa sửa các file dưới đây — phiên này chỉ được ra **một** file (ràng buộc §3 của
`prompts/L-TONG-KET.md`). Liệt kê để sửa ở phiên sau:

| File | Chỗ sai | Sự thật đo được |
|---|---|---|
| `prompts/L-TONG-KET.md:90` | Fast Lane mốc **36,2%** | **33,7%** (`09-DO-THAT §B1`) — mốc 36,2% là replay cũ |
| `prompts/L-TONG-KET.md:91` | M09 chặn **2,0%** | **9,2% bị bắt** (5,4% block) trên 9.036 tin thật |
| `prompts/L-TONG-KET.md:92` | M05 khoá **45%** | **30,2%** nhận nhầm (`09-DO-THAT §B3`) |
| `prompts/L-TONG-KET.md:95` | Chi phí/đơn **7.502đ** | **7.934đ** — 7.502đ dùng bảng giá Anthropic, production chạy Kimi |
| `00-TONG-QUAN.md §5` | Sơ đồ luồng **không có M13** | M13 chặn **trước** Fast Lane; M11 tách làm 2 nửa (chấm điểm trước M06, ngân sách sau) |
| `00-TONG-QUAN.md §8` | Tỷ lệ chốt v1 **2,0%** | **3,07%** (151/4.913) trên Sổ AI thật |
| `00-TONG-QUAN.md` (đính chính) | system prompt **4.686 token** | **3.128 token** sau khi L4 gộp CORE (1.871) |
| `00-TONG-QUAN.md` (đính chính) | **37/38** page có kịch bản · **1/38** có tone | **41/44** có `greeting`+`salesPrompt` · **2/44** có `tone` (mẫu số khác: 44 page trong `kb-overrides`, không phải 38) |
| `06-LO-TRINH.md:18` | *"16 module còn lại ⬜ mới có spec"* | Sai nặng — **13 module CHẠY ĐƯỢC**. Bảng trạng thái này dừng ở trước vòng 1 |
| `09-VONG-2-CAP-NHAT.md:3` | *"196 test, 195 pass"* | **197 test, 196 pass, 1 skip, 0 fail** |
| `09-VONG-2-CAP-NHAT.md:46` | sổ template phủ **32,1%** | **0%** trên production — file không tồn tại |

---

*Kiểm chứng cho báo cáo này: `ssh` chỉ đọc vào `169.58.33.8` (không ghi, không restart, không
copy file vào `/opt/aicloser`) · `npm test` 197/196/1/0 trước và sau · `.env` local có
`PANCAKE_READONLY=1` · không sửa một dòng code nào · không commit · không xoá đơn Pancake ·
không log credential.*
