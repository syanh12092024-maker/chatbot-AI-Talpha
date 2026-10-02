# CR-02-10 · MỘT BẢN — BỎ THẾ SONG SONG v1/v3

> Trạng thái: **ĐÓNG 02/10 09:19 CEST** — MB1–MB4 ✅ (MB4 lên prod `bd6459a`, GIỮ; nhật ký `docs/thi-cong/nhat-ky/phat-hanh-20261002-mb4.md`). Áp trọn theo «áp, nới luật hay gì cũng được — quy về 1 mối» (02/10); MB4 bỏ chờ 3 ngày theo «làm MB4 luôn đi». Lệch so với bảng dưới: `src/wa.js` GIỮ (pancake-tool import trên prod — `N-MB-CHUNG-PANCAKE-TOOL`).
> Yêu cầu: người quyết, 02/10/2026 — *«Mình cần phần bên mình không bị nhập nhằng v1 và v3 nữa.
> Chuyển sang 1 bản hiện tại thôi. Cái nào update thì update luôn.»* Kèm: *«ai_sale đang chạy thì
> để nguyên vì của team khác.»*

## 1 · Câu đổi

**Từ** hai bản đứng cạnh nhau — tiến trình bot v1 (`aicloser.service` · `src/server.js` · cổng
3100 · màn `/admin` · công tắc `ai-enabled.json`) và v3 (`aicloser-v3` cổng 3102 + `aicloser-worker-v3`),
trong đó v3 phải gọi sang v1 qua cầu HTTP `v3/src/noi-day/cau-bot-v1.js` để đọc/ghi công tắc AI,
kịch bản, khối chung, sẵn sàng, đơn, chi phí, kho token… —
**sang** MỘT bản: chỉ còn `aicloser-v3` (giao diện + API) và `aicloser-worker-v3` (trả lời khách);
mọi việc v3 đang mượn của v1 chạy NGAY TRONG tiến trình v3; «page này do bot của mình trả lời»
có đúng MỘT công tắc trong CSDL; `aicloser.service` tắt hẳn; code chỉ-v1 gỡ khỏi cây,
**vì** v1 đã thôi trả lời khách từ **28/08** (đo 02/10: `ai-enabled.json` = `[]`, Sổ AI
`ai-messages.jsonl` đứng im từ 28/08 11:56, `V3_LEGACY_POLL_OFF=1` nên poll/follow-up/miner đã
tắt) — lý do của thế song song (02-KE-HOACH nguyên tắc 4, §0a luật 4 «62 file phẳng đang phục vụ
51 page khách thật») không còn đúng, mà giữ hai bản làm người vận hành nhập nhằng: hai màn quản
trị, **sáu chỗ** cùng nói «ai trả lời page này» (`ai-enabled.json` · `page.bot_ai_bat` ·
`page.v3_ai_bat` · `page.giao_bot_moi` · `V3_PAGE_XU_LY` · `V3_GIAO_PAGE_TREN_MAN`), và chữ
«bot cũ / bot mới / v1» trên 39 tệp màn hình.

**Luật mới (một câu, để thước canh):** *Phía mình chỉ có MỘT bot và MỘT giao diện; không màn nào,
không cửa nào phải hỏi một tiến trình thứ ba để biết hay đổi điều bot đang làm.*

**Phạm vi âm — CR này KHÔNG đụng:**
- `/opt/pancake-tool` · `ai_sale.py` · 8 dịch vụ `aisale-chat-*` · `pancake-len-don` — của team khác, để nguyên.
  Khi page Kuwait Luxe Charm đủ điều kiện, người quyết báo bên đó tắt page rồi v3 mới vào.
- Cách bot NÓI: năm file bộ não (`prompts.js` `closer.js` `tools.js` `fast-lane.js`
  `outbound-guard.js`) giữ nguyên hành vi — CR này chỉ đổi NƠI CHẠY, không khai «Đụng bộ não».
- Van gửi khách: `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0` · `V3_POS_GHI=0` giữ nguyên. Mở pilot
  là phiếu `mo-van` riêng, sau CR này.
- Dữ liệu cũ: không xoá tệp JSON nào — dời vào lưu trữ chỉ đọc.
- `aicloser-v3-xemthu` (bản xem thử dữ liệu giả) — không phải v1, để nguyên.

## 2 · Tác động năm lớp

Lệnh đã chạy (02/10): đồ thị import tĩnh + động từ `src/server.js` vs `v3/chay-that.js` ·
`src/queue/chay-worker.js` · `v3/xem-thu.js` (script ở scratchpad phiên) ·
`grep -noE "/admin/api/…" v3/src v3/chay-that.js` · `tr '\0' '\n' < /proc/<pid>/environ` ba tiến
trình prod · `ls -la *.json *.jsonl` /opt/aicloser · SQL đếm cột công tắc `page` ·
`grep -rlE "cau-bot-v1|bot cũ|bot v1|aicloser\.service|V3_LEGACY_POLL_OFF|ai-enabled|V3_GIAO_PAGE_TREN_MAN|bot_ai_bat|src/server\.js|/admin/api"` docs · skills · `v3/src/ui`.

| Lớp | Chỗ nào | Phải làm gì | Ai | Ước |
|---|---|---|---|---|
| 1 Ý đồ | `02-KE-HOACH-CODE.md:15` nguyên tắc 4 «Chạy song song, không chuyển đứt» | Gạch, trỏ CR: song song nay là với **ai_sale** (team khác) theo từng page, không phải v1 | Tổng | S |
| 1 Ý đồ | `01-QUYET-DINH.md:231-232` «`kb-overrides.json` chỉ máy ghi (bản chép bot v1 đọc)» | Sửa: bản chép do **chính v3** ghi cho bộ não đọc — không còn «bot v1» | Tổng | S |
| 1 Ý đồ | Sổ §0a luật 4 — «KHÔNG đụng 62 file phẳng `src/` … đang phục vụ 51 page» (57 file còn cấm) | Nới: file phẳng **dùng chung** (31) sửa được có khai; file **chỉ-v1** (24) được gỡ. Năm file não giữ rào 16/09 | Người quyết | S |
| 2 Điều hành | `H9` bộ biến cutover · `LL12` «cutover / đợt tắt Botcake» · `LL8` gỡ màn thừa | H9 gộp vào MB2; LL12/LL8 đổi phụ thuộc «cutover» → «MB3» | Tổng | S |
| 2 Điều hành | BH2–BH6 🎫 (chạm năm file não) | Không đụng nhau: CR này không sửa file não. Thợ BH không phải đổi gì | — | — |
| 3 Hợp đồng | `ban-giao/bien-moi-truong-v3.md` — `V3_LEGACY_POLL_OFF` · `V3_GIAO_PAGE_TREN_MAN` · `V3_PAGE_XU_LY` · `V3_GHI_KHO_BOT` · `V3_SHEET_CHI_DANH_BA` (2 tệp · 19 chỗ trong `ban-giao/`) | Gỡ biến thừa, `V3_PAGE_XU_LY` thành phanh khẩn (tuỳ chọn), sửa cùng commit với code đọc nó | Thợ | S |
| 3 Hợp đồng | `.claude/skills/` 6 tệp · 14 chỗ (`mo-van`, `chatbot/references/*`) · `v3/docs` 5 chỗ · `03-MAN-HINH.md` 1 chỗ | Sửa đường lùi/kiến trúc cho đúng một bản | Thợ | S |
| 4 Máy · tiến trình | `src/server.js` còn làm: đồng bộ Sheet (`V3_SHEET_CHI_DANH_BA=1` → chỉ danh bạ) · nạp token page FB 10′ · quét registry page · nối kho token CSDL · `/webhook` (gắn `src/queue/webhook.js` của v3) · `/admin` + `/admin/api` · `/uploads` | Dời phần còn dùng sang `v3/chay-that.js`; phần không ai dùng thì bỏ. `/webhook` không có proxy công khai (nginx không trỏ 3100) ⇒ dời là việc nội bộ, không sửa app Meta | Thợ | M |
| 4 Máy · cầu | `cau-bot-v1.js` ~15 đường HTTP sang v1: `/pages/:id/ai` · `/kb/:id` · `/kb-chung` · `/readiness` · `/ops/conv-state` · `/orders` · `/token-cost` · `/pages` · `/pancake-tokens` · `/health` · `/uploads`; người dùng: `vai-b.js` · `chay-that.js` (6 chỗ) · `page-bot/cong-tac.js` · `kho-page.js` · `ket-noi/kho-ket-noi.js` · `van-hanh-v3.js` · `kich-ban/kho-kich-ban.js` · `nguon-khach/kho-nguon.js` · `bao-cao` · `chung/bot-bat-that.js` | Thay từng đường bằng gọi HÀM trực tiếp (cùng repo: `readiness.js#computeReadiness`, `kb.js`, `token-pancake.js`…), giữ nguyên hình dạng dữ liệu màn đang nhận | Thợ | L |
| 4 Máy · công tắc | 6 nguồn «ai trả lời page» (xem §1) · `page-routing.js` · `cong-tac.js#giaoPage` (tắt bot cũ rồi đọc lại xác nhận) | MỘT cột CSDL là nguồn của worker; bỏ nhánh `ai-enabled.json`, bỏ bước «tắt bot cũ» | Thợ | M |
| 4 Máy · code | **24 file chỉ-v1, 7.084 dòng**: `admin*.js` (7) · `ai-convs` · `botcake` · `experiment` · `followup` · `handler` · `health` · `import-script` · `miner` · `page-registry` · `pancake-poll` · `readiness` · `scheduler-followup` · `scheduler-miner` · `server` · `store` · `template-learner` · `wa`. **8 file mồ côi** (428 dòng): `approve-templates` `fix-dup-products` `fix-tier-labels` `local-chat` `report-cli` `subscribe-pages` `wa-login` `web`. `public/` 7 trang `/admin` | Gỡ SAU khi MB3 chạy ổn. Hàm nào v3 cần (`computeReadiness`, quét registry) thì DỜI vào thư mục v3 trước khi gỡ tệp | Thợ | M |
| 4 Máy · code | 31 file phẳng dùng chung (não + `kb` `pancake` `config` `ai-log` `pages`…) | Ở lại; hết là «file của v1» — gọi là lõi chung | — | — |
| 4 Máy · màn | `v3/src/ui` 39 tệp · 143 chỗ nhắc «bot cũ / v1 / cầu / bot_ai_bat / /admin/api» | Đổi chữ + gỡ đèn «cầu sang bot» | Thợ | M |
| 4 Thước | 11 tệp bộ ca import file chỉ-v1 · 2/66 cổng nghiệm thu nhắc cầu/`ai-enabled`/`V3_LEGACY_POLL_OFF` · `package.json` `start`/`dev` = `src/server.js` + 8 script mồ côi | Bộ ca theo tệp gỡ thì gỡ cùng; ca của hàm được dời thì dời theo; thêm cổng `mb.sh` canh luật mới (đảo-vá: dựng lại một đường `/admin/api` ⇒ đỏ) | Thợ | M |
| 5 Dữ liệu | Cột `page`: `bot_ai_bat` 0 · `v3_ai_bat` 0 · `giao_bot_moi` 0 trên **582 page** | Gộp công tắc **không phải di trú giá trị** (toàn 0). Migration gỡ cột thừa SAU MB3 | Thợ | S |
| 5 Dữ liệu | Tệp đứng im từ 28/08: `ai-enabled.json` · `ai-messages.jsonl` (15,5 MB — **bàn hội thoại v3 còn đọc** làm «mã khách» `docSoAiBotCu`) · `stats.json` (2,2 MB) · `conv-state.json` (4,9 MB, 16/09 — màn Nguồn khách đọc qua `/ops/conv-state`) · `ai-convs` · `ai-order-queue` · `miner-*` · `template-*` | Dời vào `luu-tru/v1/` chỉ đọc; hai chỗ v3 còn đọc thì đọc thẳng từ lưu trữ (hoặc nạp một lượt vào CSDL — người chọn ở MB1) | Thợ | S |
| 5 Dữ liệu | Tệp còn SỐNG do v3 ghi: `kb-overrides.json` (30/09) · `kb-chung.json` (28/09) — bộ não đọc qua `kb.js` (tự nạp lại theo mtime) · `pages.json` (27/09, registry) | Giữ — đổi người ghi từ «v1 qua HTTP» sang «v3 gọi `kb.js` trực tiếp». Không đổi định dạng | Thợ | S |

**Tin tốt:** v1 không ghi gì cho khách từ 28/08 và cả ba tiến trình đang `PANCAKE_READONLY=1` ⇒
tắt v1 không làm câm page nào; không có dữ liệu hai bên đang cùng sửa để phải hoà giải.

## 3 · Giá phải trả

- **Màn `/admin` cũ (cổng 3100, 7 trang) mất.** MB1 phải liệt kê từng nút ở đó mà v3 CHƯA có
  (nghi: A/B thí nghiệm, báo cáo miner, hướng dẫn khoá Botcake, duyệt mẫu template) — người quyết
  chọn dời hay bỏ. Chưa đo xong ⇒ chưa hứa.
- **Lịch nền v1 mất hẳn**: follow-up L5, miner đêm, template-learner. Hôm nay đã tắt
  (`V3_LEGACY_POLL_OFF=1`) nên không mất gì đang chạy; nhưng muốn có lại thì phải dựng trong v3.
- **Tiến trình v3 nặng thêm**: tự tính bảng sẵn sàng (~10 giây khi nóng máy, hôm nay v1 gánh) và
  nạp KB vào RAM. Hai tiến trình v3 cùng đọc `kb-overrides.json` — đã có cơ chế nạp lại theo mtime.
- **Nới luật 4 §0a** cho 57 file phẳng: người quyết phải gật **tường minh** (bẫy 3 của quy trình).
  Năm file não KHÔNG nằm trong lần nới này.
- **Đường lùi hẹp lại sau MB4** (đã gỡ code): lùi phải dựng lại từ tag git, không bật lại một công tắc.

## 4 · Không làm ngay ⇒ §9 SỔ NỢ

- `N-MB-LICH-NEN` — follow-up / miner / template-learner dựng trong v3 hay bỏ hẳn (neo: MB4).
- `N-MB-SO-AI-CU` — nạp `ai-messages.jsonl` vào CSDL để bàn hội thoại hết đọc tệp (neo: MB1).
- `N-MB-PAGE-TOKEN-FB` — `loadPageTokens` (token page Facebook, 10′/lần) còn ai cần không, khi kênh là Pancake (neo: MB1).

## 5 · Phiếu cần đẻ

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| MB1 | Dời việc v3 đang mượn của v1 vào tiến trình v3: thay ~15 đường `cau-bot-v1.js` bằng gọi hàm; dời `/webhook` · `/uploads` · nối kho token sang `chay-that.js`; kiểm kê nút `/admin` v3 chưa có | 🟨 | — |
| MB2 | MỘT công tắc: một cột CSDL là nguồn của worker; bỏ `ai-enabled.json`/`bot_ai_bat`/`V3_GIAO_PAGE_TREN_MAN`/`V3_LEGACY_POLL_OFF`; `giaoPage` bỏ bước «tắt bot cũ»; sửa `bien-moi-truong-v3.md` cùng commit | 🟥 | MB1 |
| MB3 | **Mở van**: deploy MB1+MB2, `systemctl disable --now aicloser`, restart hai tiến trình v3, đo mốc +1′/+5′/+15′ | 🟥 | MB2 · người gật |
| MB4 | Gỡ 24 file chỉ-v1 + 8 mồ côi + 7 trang `public/` + script `package.json`; dời bộ ca; lưu trữ tệp JSON đứng im; đổi chữ 39 tệp màn; cổng `mb.sh`; migration gỡ cột thừa; đóng CR | 🟨 | MB3 chạy ổn ≥ 3 ngày |

## 6 · Đường lùi

- **MB1–MB2** chỉ thêm đường gọi trực tiếp, v1 vẫn chạy song song ⇒ lùi = revert commit, restart `aicloser-v3`.
- **MB3** ⇒ lùi = `systemctl enable --now aicloser` (code v1 còn nguyên trong cây tới MB4), restart `aicloser-v3`. Không có dữ liệu nào đổi hình.
- **MB4** ⇒ trước khi gỡ, đặt tag `truoc-mot-ban`; lùi = checkout tệp từ tag + bật lại dịch vụ + chép lại tệp JSON từ `luu-tru/v1/`. Migration gỡ cột có `down` (cột toàn 0 nên không mất giá trị).
