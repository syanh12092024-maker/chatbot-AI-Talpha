# PHIẾU GL9 — Phần còn lại của GL8 chạm pilot: pool CSDL không chết vì client rỗi/đang mượn bị giết · một bộ đọc `.env` (không fail-OPEN van) · lưới jsonb ở sáu cửa ghi còn trần

**Base:** `da7908e` · **Làn:** 🟥 (A: tiến trình worker chết giữa lượt; B: lớp chặn cuối của van gửi `PANCAKE_READONLY`; C: sổ gửi `lan_gui` + duyệt hàng chờ đơn — đường tin/tiền)
**Soát (a):** 15/10 — SỬA PHIẾU (8 điểm) — đã sửa vào phiếu: ① A client ĐANG MƯỢN · ② 1 hai người nghe · ② 2 chữ ký/ENOENT/trùng khoá/nháy hở · ② 3 bỏ lối `ghiSoAi` · ④ 1b · ④ 2 dòng URL + `env -i` + GOC tạm · ④ 3 `:1080` qua `duyet` · ⑥ nợ `don-cho.js:91`. Đo thử ở scratchpad `gl9/pool-thu.mjs`.
**Nguồn:** tiếp quản 14/10 (`docs/thi-cong/nhat-ky/tiep-quan-20261014.md`) + nợ GL8 §9 09/10 (N-GL8-DOC-ENV-TUYET-DOI · N-GL8-LUOI-DUYET · N-GL8-LAN-GUI-JSONB · N-GL8-RECONCILE-HO-SO · N-GL8-NHAT-KY-JSONB). Người quyết 15/10: «làm giúp tôi — cấu hình đầy đủ, chỉ việc gạt bot».
**Đụng bộ não:** không. Buộc phải sửa tệp bộ não (`src/prompts.js` `closer.js` `tools.js` `fast-lane.js` `outbound-guard.js` `context.js` `lead-score.js` `conv-owner.js`) ⇒ DỪNG, báo tổng.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

**A — worker prod chết vì client rỗi (đo thật).** `db/ket-noi.js:43-45` `taoPool` trả `new pg.Pool(...)` KHÔNG gắn `pool.on('error')`. 10/10 06:53:16 CEST
`unattended-upgrade` dừng `postgresql@16-main` ⇒ pg gửi `57P01 terminating connection due to administrator command` tới client đang RỖI trong pool ⇒
`pg-pool/index.js:62 idleListener` phát `'error'` trên `BoundPool` ⇒ không ai nghe ⇒ `Unhandled 'error' event` ⇒ `aicloser-worker-v3` thoát 1, systemd dựng lại sau 3 s
(`NRestarts=1`). Hôm đó 0 page bật nên vô hại; khi pilot chạy, mọi lượt đang dở (sau gọi model, trước/giữa gửi) bị cắt ngang. Lỗi trên client ĐANG truy vấn
đi đường reject của `query()`. **NHƯNG client ĐANG MƯỢN mà đứng giữa hai truy vấn cũng chết theo** (soát (a) đo 15/10, pg 8.23 · pg-pool 3.14 · PG local):
`pg-pool/index.js:344` `_acquireClient` GỠ `idleListener` lúc cho mượn ⇒ client bị giết lúc không có truy vấn phát `'error'` trên chính `Client` ⇒
`Emitted 'error' event on Client instance` ⇒ thoát 1 **dù đã có `pool.on('error')`**. Đây đúng là trạng thái của worker suốt lượt model:
`src/queue/kho.js:113` `moPhienRut` `pool.connect()` + `BEGIN`, rồi `src/queue/worker.js:333` `xuLyMotTin(khach, …)` giữ client qua cuộc gọi model (3 `workLoop`
song song); giao diện: `src/orders/hang-cho.js:785` `duyet` giữ client qua `taoDonFn` (`:898`, gọi POS). Nghe ở pool KHÔNG đủ — phải nghe trên TỪNG client.
`db/sandbox.js:38` có pool quản lý riêng (chỉ test) — ngoài phạm vi trừ khi dùng chung `taoPool`.

**B — ba bộ đọc `.env` tay giữ chú thích đuôi (fail-OPEN).** `src/queue/nap.js:44-56` `docEnvTuyetDoi` (lớp chặn cuối `PANCAKE_READONLY` qua
`src/chat/handler-v3.js:65` `vanGuiDangMoTuyetDoi` + `V3_LAN_CHOT_MODEL` + `V3_NAP_*`), `db/ket-noi.js:17-30` `docEnv` (`DATABASE_URL_V3`),
`src/pos/moi-truong.js:17-30` `docBien` (`V3_KHOA_MA_HOA`). Dòng `PANCAKE_READONLY=1   # chú thích` mà `process.env` vắng biến ⇒ đọc `"1   # chú thích"` ⇒
`!== "1"` ⇒ van coi là MỞ. `node --env-file` đọc `"1"`. GL8 đã chuyển 9 công cụ ops sang `util.parseEnv` (Node 20.20.2 có) — ba bộ đọc mã prod còn lại.
Mức phơi thật (soát (a)): hai unit prod chạy `node --env-file=$APP_DIR/.env` (`deploy/setup.sh:89`) ⇒ `process.env` luôn thắng ⇒ nhánh đọc tệp chỉ chạy khi
tiến trình không nạp env (cwd lạ, script tay). `.env` dev 15/10: 7 khoá mà ba bộ đọc dùng — cũ/mới KHỚP, 0 khoá trùng (đo chỉ in tên) ⇒ B là PHÒNG NGỪA, chưa phải lỗi đang chạy.

**C — sáu cửa ghi jsonb còn `JSON.stringify` trần** (GL8 đã có `jsonLanh` ở `src/text.js:54`, đã lưới `so-ai.js` · `kho.js` · `hang-cho.js` cửa vào):
- `src/queue/lan-gui.js:91` `noi_dung = JSON.stringify(args[2])` ghi TRƯỚC khi gửi ⇒ model trả nửa cặp lẻ ⇒ INSERT vỡ ⇒ tin thử lại, model bị gọi lại, rồi giao sale; khách nhận 0 tin.
- `src/orders/hang-cho.js` `duyet()` :869-870 · :970-971 · `ghiSuKienTaoDon` :1080 (INSERT `so_ai` thẳng, vòng qua lưới `ghiSoAi`) · `loai()` :1128 — sale duyệt/loại đơn có `boSung`/`e.message` mang nửa cặp ⇒ duyệt hỏng (pilot: POS đóng, sale duyệt hàng chờ rồi tạo đơn tay — đây là đường sale DÙNG).
- `src/queue/reconcile.js:31` `ho_so = JSON.stringify(profile)` — chữ khách bị `context.js` cắt mà không qua lưới.
- `src/db/nhat-ky.js:42-43` `truoc`/`sau` trần.

## ② Hợp đồng vào / ra

1. A: `taoPool` gắn HAI người nghe, cả hai ghi log (mã lỗi pg + câu, không in chuỗi nối) và KHÔNG thoát tiến trình: (i) `pool.on('error', …)` — client RỖI;
   (ii) `pool.on('connect', c => c.on('error', …))` — client ĐANG MƯỢN giữa hai truy vấn (① A). Pool tự bỏ client hỏng (hành vi pg-pool: rỗi ⇒ `idleListener`
   `_remove`; mượn ⇒ truy vấn kế reject «not queryable», `release()` thấy `!_queryable` ⇒ `_remove` — `pg-pool/index.js:392`). Mọi nơi tạo pool trong mã prod đi qua `taoPool` (thợ `grep -rn "new pg.Pool\|new Pool(" src db v3/src` — liệt kê trong nhật ký;
   chỗ nào tự `new` ⇒ chuyển sang `taoPool` hoặc gắn cùng người nghe). Tiến trình worker/giao diện sống qua một lần Postgres restart và truy vấn sau đó chạy được.
2. B: MỘT bộ đọc `.env` tuyệt đối dùng chung (đặt ở `db/ket-noi.js`, export; `nap.js` và `pos/moi-truong.js` import — không chép lần thứ tư), đọc bằng
   `util.parseEnv(fs.readFileSync(<goc>/.env, 'utf8'))` ⇒ cùng giá trị với `node --env-file`. Bộ đọc chung CHỈ tra tệp, chữ ký `(ten, goc = GOC)` ⇒ trả
   `string | undefined`; ưu tiên env nằm ở từng người gọi và GIỮ nguyên: `docEnvTuyetDoi`: `process.env[ten] != null` thắng (kể cả chuỗi rỗng); `docEnv`:
   `process.env[ten]` truthy thắng; `docBien(ten, env, goc)`: `env[ten]` (THAM SỐ, mặc định `process.env`) truthy thắng — giữ chữ ký `docBien(ten, env, goc)` và
   `moiTruongKhoa(env, goc)` (`db/di-tru/ket-noi-pos.js:36` truyền `goc`). Không nạp `.env` vào `process.env` (lý do ghi ở đầu hai tệp).
   Thiếu tệp — CHỈ `ENOENT` — ⇒ như cũ (`undefined` / `""`); lỗi khác (EACCES, `util.parseEnv` vắng, …) NÉM, không nuốt thành «vắng biến» (với
   `PANCAKE_READONLY` nuốt = van MỞ). Hai khác biệt hành vi thật so với bộ đọc cũ (đo `node` 24, khớp `--env-file`) phải ghi đầu tệp + có ca:
   (a) khoá TRÙNG: cũ lấy dòng ĐẦU, `parseEnv` lấy dòng CUỐI; (b) nháy kép HỞ (`A="abc`) nuốt MỌI dòng sau ⇒ khoá ở dưới biến mất (bộ đọc cũ vẫn thấy) ⇒
   khoá có dòng `^\s*(export\s+)?<ten>\s*=` trong tệp mà `parseEnv` không trả ⇒ NÉM «`.env` hỏng quanh <ten>», không trả `undefined` (fail-CLOSED cho van).
3. C: sáu cửa dùng `jsonLanh` tại chỗ — KHÔNG chuyển `:1080` sang `ghiSoAi` (neo `('tin_cho_xu_ly:<loại>', id)` sẽ đụng dòng tin thật cùng số —
   `hang-cho.js:1058-1062`). Chữ GỬI KHÁCH (`args` truyền cho `cua[loai]`) giữ nguyên từng byte — lưới chỉ đụng bản ghi sổ.
4. Không đổi hành vi nào khác (thứ tự gửi, trạng thái tin, luật giao sale, nội dung khách nhận).

## ③ File được đụng

```
db/ket-noi.js
src/queue/nap.js
src/pos/moi-truong.js
src/queue/lan-gui.js
src/orders/hang-cho.js
src/queue/reconcile.js
src/db/nhat-ky.js
test/gl9-*.test.mjs
ops/bin/nghiem-thu/gl9.sh
docs/thi-cong/nhat-ky/phieu-gl9.md
```
← mỗi dòng đúng một đường dẫn (phép ④ `_chan1.sh` đọc bằng awk). Cần tệp khác (vd chỗ tự `new pg.Pool` ở ② 1) ⇒ ghi «Lệch phiếu» trong nhật ký + lý do, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl9.sh`, rc=0 khi đạt)

1. A HÀNH VI (tiến trình con riêng `node -e`, đo rc + còn sống sau 1 s, rồi `pool.query('SELECT 1')` trả 1; log có ≥ 1 dòng chứa `57P01` — client rỗi có
   cả hai người nghe sẽ ghi HAI dòng, đừng đòi đúng một):
   1a. pool từ `taoPool` trên hộp cát; giữ một client RỖI (connect → lấy pid → release); từ kết nối khác `SELECT pg_terminate_backend(<pid>)`.
   1b. client ĐANG MƯỢN: `pool.connect()` + `BEGIN` + lấy pid (đúng khuôn `moPhienRut`), KHÔNG release; terminate pid đó; chờ 1 s ⇒ còn sống; truy vấn kế trên
       client đó REJECT (không treo); `release()`; `pool.query('SELECT 1')` trả 1.
   (nên) 1c. `src/queue/chay-worker.js` THẬT trên hộp cát (0 page bật, van đóng) — đợi dòng «khởi động», terminate MỌI backend của CSDL hộp cát
       (`WHERE datname = <hộp cát> AND pid <> pg_backend_pid()`) ⇒ còn sống sau 3 s và còn in dòng lượt.
   Soát (a) đã thử: 1a không người nghe ⇒ rc=1 `Emitted 'error' event on BoundPool`; 1b chỉ có `pool.on('error')` ⇒ rc=1 `Emitted 'error' event on Client`;
   đủ hai người nghe ⇒ rc=0 cả hai.
2. B — chạy trong tiến trình con `env -i PATH="$PATH" node …` (bắt buộc: `npm test` nạp `--env-file-if-exists=.env` ⇒ `process.env` đã có sẵn
   `PANCAKE_READONLY`/`DATABASE_URL_V3`/`V3_KHOA_MA_HOA` của máy dev ⇒ bộ đọc trả `process.env`, ca xanh bất kể bộ đọc), trên GOC TẠM: bộ đọc chung gọi với
   `goc` tạm; ba hàm bọc (`docEnvTuyetDoi` · `chuoiNoi` · `docBien`) và `vanGuiDangMoTuyetDoi` đo trên bản chép cây (mkdtemp + `cp -R db src package.json` +
   symlink `node_modules`, `.env` tạm ở gốc bản chép). ⛔ CẤM ghi/đổi tên/xoá `<repo>/.env`. Tệp `.env` tạm có
   `PANCAKE_READONLY=1   # chú thích` · `DATABASE_URL_V3="postgres://x # y"   # đuôi` · `V3_KHOA_MA_HOA=abc#def` · `X=` ⇒ ba bộ đọc trả `"1"` ·
   `"postgres://x # y"` · `"abc"`, `X` ⇒ `""` (bộ cũ: `"1   # chú thích"` · `postgres://x # y"   # đuôi` · `"abc#def"` — dòng URL KHÔNG có `# đuôi` thì
   bộ cũ cũng ra `postgres://x # y`, đảo-vá ở `ket-noi.js` không đỏ được). So trực tiếp với `env -i … node --env-file=<tệp> -e`. Thêm: khoá TRÙNG ⇒ dòng
   CUỐI; `export K=1` ⇒ `"1"`; nháy hở phía trên `PANCAKE_READONLY` ⇒ NÉM (② 2 b); tệp vắng ⇒ `undefined`/`""`; tệp không đọc được (chmod 000) ⇒ NÉM.
   Ngữ nghĩa ưu tiên của từng hàm giữ như ② 2 (ca riêng cho chuỗi rỗng; `docBien` với `env` tiêm). `vanGuiDangMoTuyetDoi()` với `V3_PANCAKE_GUI=1`, KHÔNG có
   `PANCAKE_READONLY` trong env + dòng có chú thích ⇒ `false` (ĐÓNG).
3. C: gọi thẳng từng cửa (`lan-gui` bọc cửa giả trả `{ok:true}` · `duyet` · `loai` · `reconcile` · `ghiNhatKy`; `ghiSuKienTaoDon` KHÔNG export ⇒ đo qua
   `duyet()` với `deps.taoDon` giả trả `maPos` mang nửa cặp) với chuỗi mang nửa cặp lẻ ⇒ ghi được, đọc lại jsonb không còn nửa cặp; với `lan-gui`, cửa giả
   nhận `args` GIỐNG HỆT đầu vào (so `===`).
4. Đảo-vá: bỏ người nghe pool ⇒ 1a đỏ; bỏ người nghe client ⇒ 1b đỏ (tiến trình thoát); trả bộ đọc cũ ở từng tệp ⇒ ca 2 của khoá tệp đó đỏ; bỏ
   `catch` ENOENT-only ⇒ ca chmod đỏ; bỏ lưới từng cửa ⇒ ca 3 cửa đó đỏ.
5. `npm test` không tụt (mốc 2827 · đỏ chập chờn đã biết: `l0-m2-gop-cua-hep` G6); `gl8.sh` · `gl3c.sh` · `gp1.sh` rc=0 (cổng lồng chạy RIÊNG nếu treo — án lệ
   N-THUOC-CHAP-CHON; `rg` phải có trên PATH — bộ nhớ «cổng bash đỏ giả»); `_chan1.sh gl9` xanh.

## ⑤ Test chạm nhánh nào

`test/gl9-*.test.mjs` — pool sống qua client RỖI và client ĐANG MƯỢN bị giết · ba bộ đọc env (chú thích đuôi · nháy · rỗng · trùng khoá · nháy hở · `export` ·
tệp vắng/không đọc được · ưu tiên env) · sáu cửa jsonb.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Tắt tự nâng cấp Postgres trên VPS (`unattended-upgrades` — việc người/hệ thống, không phải mã) · `db/sandbox.js` pool quản lý (chỉ test) · đổi luật
«lỗi sổ sau gửi ⇒ giao sale» (`worker.js` catch — `doi-y-do`) · `context.js` cắt chữ (bộ não, N-GL8-PROMPT-NUA-CAP) · cùng khuôn jsonb trần ngoài sáu cửa
(soát (a)): `v3/src/ui/van-hanh/don-cho.js:91` «Sửa đơn chờ» `JSON.stringify(d)` (chữ sale gõ — rủi ro thấp) và tham số object pg tự `JSON.stringify`
(`prepareValue`) ở cửa sửa chung `src/db/truy-van.js` ⇒ nợ N-GL9-JSONB-NGOAI-SAU-CUA · `ops/bin/*.mjs` tự `new pg.Pool` không người nghe (công cụ dev, không phải unit prod).

## ⑦ ĐÃ TRA CHƯA

```
$ journalctl -u aicloser-worker-v3 (prod, 10/10 06:53:16)   ⇒ error 57P01 · Emitted 'error' event on BoundPool · status=1/FAILURE · restart counter 1
$ journalctl 06:53:16 ⇒ «Stopping postgresql@16-main» (apt-daily-upgrade 06:51:23)
$ grep -rn "new pg.Pool\|new Pool(" src db v3/src   ⇒ db/ket-noi.js · db/sandbox.js
$ grep -n "JSON.stringify" src/orders/hang-cho.js src/queue/reconcile.js src/db/nhat-ky.js ⇒ :869 :870 :970 :971 :1080 :1128 · reconcile:31 · nhat-ky:42-43
$ grep -n "N-GL8-\|N-POOL" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   ⇒ N-GL8-DOC-ENV-TUYET-DOI · LUOI-DUYET · LAN-GUI-JSONB · RECONCILE-HO-SO · NHAT-KY-JSONB (09/10) · N-POOL-KHONG-BAT-LOI (14/10)
# soát (a) 15/10:
$ grep -rn "readFileSync(.*\.env" src db v3/src   ⇒ đúng 3 chỗ: nap.js:47 · ket-noi.js:21 · moi-truong.js:21 (deploy/inspect.sh dùng dotenv.parse — công cụ, ngoài)
$ grep -rn "taoPool\|new pg.Pool" v3/chay-that.js src/queue/chay-worker.js   ⇒ cả hai unit prod đi qua taoPool (chay-that.js:31 · chay-worker.js:200-201)
$ node pool-thu.mjs {roi|muon} <nghe pool> <nghe client>   ⇒ roi 0 0 rc=1 (BoundPool) · roi 1 0 rc=0 · muon 1 0 rc=1 (Client) · muon 1 1 rc=0
$ util.parseEnv vs env -i node --env-file (node 24.19)   ⇒ trùng giá trị mọi ca; khác bộ cũ ở: chú thích đuôi · `#` dính · trùng khoá (đầu↔cuối) · `export` · nháy hở nuốt dòng sau
```
Quan hệ: **trùng-nợ** — đóng 5 nợ N-GL8-* (trừ N-GL8-PROMPT-NUA-CAP, bộ não) + N-POOL-KHONG-BAT-LOI.
