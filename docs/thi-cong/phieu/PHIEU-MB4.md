# PHIẾU MB4 — GỠ bot v1 khỏi cây, đóng CR-02-10

**Base:** `3226477` (sau MB3 GIỮ) · **Làn:** 🟨 (gỡ mã không còn tiến trình nào chạy + một migration gỡ cột toàn 0)
**Nguồn:** CR-02-10 · `01-QUYET-DINH.md` §14 · sổ §5g
**Đụng bộ não:** không — `git status` năm file `prompts.js` `closer.js` `tools.js` `fast-lane.js` `outbound-guard.js` = 0 dòng.
**Điều kiện «MB3 ổn ≥ 3 ngày»:** người quyết bỏ chờ — «làm MB4 luôn đi» (02/10). Bù lại: MB3 đo +1′/+5′/+15′ lỗi 0, và
đường lùi MB4 dựng sẵn bằng tag `truoc-mot-ban`.

## ① Vì sao

Sau MB3 tiến trình `aicloser` (v1) đã tắt trên prod nhưng MÃ của nó vẫn nằm trong cây: 29 tệp `src/` + 7 trang
`public/` + 8 script `package.json` + chữ «bot cũ / tiến trình bot» trên màn. Người đọc mã vẫn thấy hai bot;
`npm start` vẫn chạy `src/server.js`; một số đường của v3 vẫn đọc tệp/cột chỉ v1 ghi.

## ② Làm gì

1. **Gỡ tệp** (git rm): `server` `admin` `admin-{economics,experiments,ops,orders,rules,scripts}` `handler` `pancake-poll`
   `store` `wa` `wa-login` `web` `botcake` `experiment` `followup` `miner` `template-learner` `scheduler-{followup,miner}`
   `health` `import-script` `local-chat` `report-cli` `subscribe-pages` `approve-templates` `fix-{dup-products,tier-labels}`
   (`src/*.js`) · `public/{admin,economics,index,ops,orders,rules,scripts}.html` · 4 tệp ca chỉ-v1.
2. **Đổi tên cầu** `v3/src/noi-day/cau-bot-v1.js` → `loi-bot.js` (giữ tên hàm + hình dạng; tiêm `datLoiBot` cho ca).
3. **Gỡ phần v1 trong tệp còn sống:** `readiness.js` (digest/sweep/autoDisable/WhatsApp) · `config.js` (`ADMIN_*` bắt buộc,
   `PORT`, `V3_LEGACY_POLL_OFF`, khoá chết `pancakePollMs` `respectAssignee` `markUnread`) · `report.js#fetchPageNames`
   (gọi `/admin/api`) · `page-routing.js#pageThuocV3` · `so-lieu-bot-cu.js` (thôi `listAiEnabled`) · `economics.js` (nhãn
   đối chiếu trỏ `/admin/api/token-cost`).
4. **Vá lỗi đếm:** `db/noi-dung.js#demPageBatBot` đọc `ai-enabled.json` làm sự thật ⇒ màn Bộ luật đếm «page bị ảnh hưởng»
   sai khi tệp và cột lệch. Nay đếm cột `page.bot_ai_bat` (`nguon: 'cot_csdl'`). `bot-bat-that.js` · `kho-team` ·
   `kho-bo-luat` · `kho-kich-ban` cùng một nguồn.
5. **Migration 030** `DROP COLUMN IF EXISTS giao_bot_moi, v3_ai_bat` (có `down`; đo 02/10 cả hai cột = 0 trên 582 page).
6. **Bộ cài:** `deploy/setup.sh` chỉ dựng `aicloser-v3` + `aicloser-worker-v3`; `preflight.mjs` bỏ `ADMIN_*`; `local-dev.mjs`
   chỉ UI; `package.json` `start`/`dev` → `v3/chay-that.js`, gỡ script `web/chat/subscribe/report/wa:login/fix-*/tpl-approve`.
7. **Chữ trên màn** (29 tệp `v3/src/ui` sửa, kể cả đổi nguồn đếm ở ②4): «tiến trình bot» → «lõi bot»; «bot cũ / bot mới» → «đang tắt / đang bật bot»; số chi phí/đơn
   của v1 → «Sổ AI cũ (ghi tới 28/08)».
8. **Tài liệu sống:** `README.md` (kiến trúc + bảng 14 nguyên tắc trỏ đúng tệp v3; nguyên tắc 9 nói thật phần v3 còn thiếu) ·
   `.env.example` · `docs/local-dev.md` · `deploy/README.md` · skill `chatbot` (SKILL + 5 tham chiếu) · biển cảnh báo đầu
   `docs/TONG-QUAN-HE-THONG.md` (ảnh chụp v1) · `bien-moi-truong-v3.md` (dòng `PUBLIC_URL`).
9. **Cổng mới** `ops/bin/nghiem-thu/mb.sh` — 16 phép, sáu chỗ trôi về được (xem đầu tệp).

## ③ Không làm

Không đổi cách bot nói · không mở van gửi · không bật page nào · không đụng `ai_sale` (pancake-tool) · không nạp Sổ AI cũ
vào CSDL (`N-MB-SO-AI-CU`) · không dựng lại follow-up/miner trong v3 (`N-MB-LICH-NEN`).

## ④ Nghiệm thu

- `bash ops/bin/nghiem-thu/mb.sh` → **16/16**.
- `l0-m2-noi-dung` N18 (một nguồn đếm): đảo-vá — trả `demPageBatBot` về đọc `ai-enabled.json` ⇒ **đỏ**.
- `npm test` không thêm ca đỏ.

## ⑤ Lên prod (theo `mo-van`, cùng lượt)

Tag `truoc-mot-ban` · sao lưu (`deploy/backup.mjs`) · checkout · `db/migrate.js` (030) · restart hai dịch vụ v3 · sao lưu rồi
gỡ `/etc/systemd/system/aicloser.service` · gỡ hai dòng cron `src/report-cli.js` (8h/17h — 115/115 lượt lỗi `WA_GROUP_JID`,
chưa từng gửi được; tệp đã gỡ ở ②1) · `PUBLIC_URL` `:3100` → `:3102` (đo 02/10: ngoài vào `:3100/uploads` = 000,
`:3102/uploads` = 200 — từ MB3 ảnh sản phẩm không tải được; 0 page bật nên chưa khách nào chịu) · chuyển tệp không còn mã
nào đọc vào `/opt/aicloser/luu-tru/v1/`: `ai-enabled.bak-truoc-v2.json` `ai-created-orders.json` `health-state.json`
`miner-reports.jsonl` `miner-state.json` `page-product-cache.json` `template-candidates.json` `template-learn-reports.jsonl`
`kb-overrides.bak-*.json` (3) `wa-auth/`. Giữ tại chỗ: mọi tệp còn mã đọc (`ai-messages.jsonl` `stats.json` `conv-state.json`
`ai-convs.json` `kb-overrides.json` `kb-chung.json` `pages.json` `page-shop-cache.json` `pancake-shops.json`
`pancake-page-tokens.json` `botcake-templates.json` `ai-order-queue.json` `sheet.json` `tokens.json`) + `ai-enabled.json`
(bộ di trú còn dò page lạc, 2 byte).

## ⑥ Báo cáo (02/10)

- 40 tệp gỡ · 1 đổi tên · 92 tệp sửa · `+498 / −12 201` dòng (trước tài liệu).
- `mb.sh` 16/16 · `npm test` **2306 ca · 2302 xanh · 0 đỏ · 4 bỏ qua** (giảm so với MB2 vì gỡ ca chỉ-v1: 4 tệp + ca v1 trong
  `import-offers` `l6-van-hanh` `l7-miner-order` `l8-botcake-rules` `phase0-webhook-delivery` `script-studio`).
- Phát hiện khi gỡ (ghi §9): v3 **chưa có** ngắt cả page 30′ khi kênh lỗi liên tiếp (nguyên tắc 9 — v1 có) ⇒
  `N-MB-NGAT-PAGE`; hai bộ điều kiện sẵn sàng (`readiness.js` cho page tắt · `pageStatus` cho page bật) ⇒
  `N-MB-HAI-BO-DIEU-KIEN`; logic «lệch» chết ở `kho-san-sang` · `bat-dau` · `chi-phi` và gói `baileys` thừa ⇒ `N-MB-DON-SAU`.
