# NHẬT KÝ PHIẾU GL9 — pool CSDL sống qua client rỗi/đang mượn bị giết · MỘT bộ đọc `.env` · lưới jsonb sáu cửa

- **Thợ:** agent worktree `worktree-agent-adf1f250694cc4e73` (cây `…/.claude/worktrees/agent-adf1f250694cc4e73`) · 15/10 nhận → bị ngắt (giới hạn API, 0 thay đổi) → làm lại trọn 19/10.
- **Base:** `01a4e89` (worktree mở ở `ff3526a` cũ ⇒ `git merge --ff-only a6f670d` = base + phiếu GL9 sau soát (a) + sổ; không mã nào khác).
- **Commit:** `4edfbea` test(gl9) thước trước · `e195fd2` test(gl9) sửa thước sau đo lại · `4dfa289` fix(gl9) · (nhật ký: commit này).
- **Môi trường đo:** MÁY DEV (macOS, node v24.19.0, pg 8.23 · pg-pool 3.14 lấy từ `node_modules` của cây chính qua symlink), Postgres.app
  18.6 `127.0.0.1:5432`, mọi phép trên HỘP CÁT `aicloser_v3_test_gl9{p,w,j}_p<pid>` (tự dựng tự dọn) — KHÔNG đo `aicloser_v3`, KHÔNG prod,
  0 gọi model/Pancake/POS thật (POS + cửa gửi tiêm; worker thật chạy với bẫy `fetch`/`https` — 0 lượt bị chặn vì env tối thiểu không có token).
  `.env` chép từ cây chính, `PANCAKE_READONLY=1` (đếm `grep -c` = 1). Máy dùng chung với ≥2 agent khác đang chạy cổng/`npm test` cùng lúc (đo `ps`/`lsof cwd`).

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md        ⇒ cả hai không có (tra bằng grep sổ)
$ grep -n "N-GL8-DOC-ENV-TUYET-DOI|N-GL8-LUOI-DUYET|N-GL8-LAN-GUI-JSONB|N-GL8-RECONCILE-HO-SO|N-GL8-NHAT-KY-JSONB|N-POOL-KHONG-BAT-LOI|N-GL9" SO-DIEU-HANH-THI-CONG.md
  ⇒ :2000 N-GL8-DOC-ENV-TUYET-DOI · :2001 N-GL8-LUOI-DUYET · :2002 N-GL8-LAN-GUI-JSONB · :2003 RECONCILE-HO-SO + NHAT-KY-JSONB (+ PROMPT-NUA-CAP, bộ não)
  ⇒ :2005 N-POOL-KHONG-BAT-LOI · N-GL9* = 0 dòng
$ grep -rn "new pg.Pool|new Pool(" src db v3/src   ⇒ db/ket-noi.js (taoPool) · db/sandbox.js:38 · :58 (pool quản lý CHỈ test — ⑥ ngoài phạm vi)
$ grep -rn "taoPool|voiPool" src db v3            ⇒ chay-worker.js:200-201 · v3/chay-that.js:31 · orders/legacy.js:15 · sandbox.js:50 · migrate.js · di-tru — đều qua taoPool
$ grep -rn "readFileSync(.*\.env" src db v3/src   ⇒ base: nap.js:47 · ket-noi.js:21 · moi-truong.js:21 (3 chỗ) — sau vá: ket-noi.js:47 (1 chỗ)
```
Trùng-nợ đúng như phiếu khai — không có phán cũ nào ngược hướng.

## Đo lại nguyên liệu đề bài (bước 3)
- **Lỗi pool tái hiện y prod** trên hộp cát (base): P1a rc=1 `Emitted 'error' event on BoundPool` · P1b rc=1 `Emitted 'error' event on Client` ·
  P1c worker thật exit 1 `BoundPool` sau khi giết 4 kết nối. Khớp journalctl prod 10/10 + soát (a).
- **`.env` dev (chỉ tên):** 21 khoá · 0 khoá bị nuốt · 0 trùng; 3 khoá ba bộ đọc dùng (PANCAKE_READONLY · DATABASE_URL_V3 · V3_KHOA_MA_HOA)
  cũ/mới KHỚP; `V3_LAN_CHOT_MODEL`, `V3_NAP_*` vắng trong tệp. 6 khoá lệch cũ/mới (APP_SECRET · FASTLANE · FASTLANE_TEMPLATES · FASTLANE_INTRO ·
  PAGE_REGISTRY · HUMAN_TAKEOVER) — không bộ nào trong ba bộ đọc chúng (đi process.env). ⇒ B là phòng ngừa trên dev, đúng như phiếu.
- **Phiếu ② 2 (b) khai hơi rộng:** «nháy kép HỞ nuốt MỌI dòng sau». Đo 19/10 (node 24.19, `util.parseEnv` ≡ `--env-file`): nháy hở (`"`,
  `'`, `` ` ``) CHỈ nuốt khi ở dưới còn một dấu nháy CÙNG LOẠI — nuốt mọi dòng tới dấu đó; không có dấu đóng ⇒ giá trị là chữ `"abc`, dòng
  sau đọc bình thường. Bộ phát hiện (khoá có dòng khai mà parseEnv không trả ⇒ NÉM) đúng cho cả hai; ca E3 sửa theo (thêm dấu đóng + vế
  không đóng so trực tiếp `--env-file`). Đầu `db/ket-noi.js` khai theo số đo, không theo chữ phiếu.
- **Bẫy đo B:** nạp `src/queue/nap.js` kéo `src/config.js` ⇒ `import 'dotenv/config'` nạp `.env` của **CWD** vào process.env bằng parser của
  dotenv. Ca con chạy cwd có `.env` là đo dotenv, không đo bộ đọc ⇒ mọi tiến trình con của `gl9-doc-env` chạy cwd RỖNG (ghi đầu tệp ca).
- **pg-pool 3.14 đọc thật:** `_acquireClient` gỡ `idleListener` lúc cho mượn (`index.js` ~344), `_release` gắn lại + gỡ client `!_queryable`
  (~392); `pg` đọc `PGAPPNAME` (`connection-parameters.js:119`) — dùng để giết ĐÚNG kết nối của worker ở P1c.

## Việc đã làm
**A — `db/ket-noi.js#taoPool`:** hai người nghe, cả hai ghi `[pg] <chỗ>: <mã pg> <câu>` (không in chuỗi nối), không thoát:
`pool.on('error')` (client RỖI) + `pool.on('connect', c => c.on('error'))` (client ĐANG MƯỢN giữa hai truy vấn). Mọi pool mã prod đi qua
`taoPool` (④b cổng: chỗ tự `new Pool` ngoài `db/sandbox.js` = 1 · `db/ket-noi.js`); hai unit prod dùng `taoPool` (chay-worker 2 · chay-that 1).
**B — MỘT bộ đọc `db/ket-noi.js#docTepEnv(ten, goc = GOC)`** ⇒ `string | undefined`: `util.parseEnv(readFileSync(<goc>/.env))`; chỉ
`ENOENT` ⇒ `undefined`; lỗi khác NÉM; khoá có dòng `^\s*(export\s+)?<ten>\s*=` mà parseEnv không trả ⇒ NÉM «.env hỏng quanh <ten>».
Ba hàm bọc giữ nguyên ưu tiên: `docEnvTuyetDoi` (`process.env[ten] != null` thắng) · `docEnv`/`chuoiNoi` (truthy thắng, vắng ⇒ `""`) ·
`docBien(ten, env, goc)` (env THAM SỐ truthy thắng, vắng ⇒ `""`; `moiTruongKhoa(env, goc)` giữ chữ ký). `nap.js` · `moi-truong.js` bỏ bản chép
(bỏ import fs/path/GOC thừa). Không nạp `.env` vào process.env. Đầu `ket-noi.js` khai mọi khác biệt so với bộ cũ (chú thích đuôi · `#` dính ·
nháy có đuôi · `export` · `\n` trong nháy kép · (a) trùng khoá lấy dòng CUỐI · (b) nháy hở nuốt tới dấu cùng loại ⇒ NÉM).
**C — `jsonLanh` tại chỗ ở sáu cửa:** `lan-gui.js:95` · `hang-cho.js:869/870` (duyệt chặn) · `:970/971` (duyệt tạo đơn) · `:1080`
(`ghiSuKienTaoDon`, giữ tại chỗ — không sang `ghiSoAi`) · `:1128` (`loai`) · `reconcile.js:32` · `nhat-ky.js:46-47`. `args` gửi cửa giữ nguyên
(J1 so `===` + đảo-vá ⑤k). Không đổi gì khác (thứ tự gửi, trạng thái tin, luật giao sale): `git diff 01a4e89 -- src/queue/worker.js src/chat` = 0.
Bộ não không đổi (④a cổng). Design-pack `docs/v3/ban-giao/*` không khai chi tiết bộ đọc/pool (grep `docEnv|docBien|pool.on` = 0) ⇒ không cần sửa.

## Danh sách ca (viết trước ca chi tiết)
A `test/gl9-pool-song.test.mjs` (tiến trình con mỗi ca): P1a rỗi bị giết · P1b đang mượn (BEGIN, không release) bị giết · P1c worker THẬT
(`chay-worker.js`, 0 page, van đóng, bẫy mạng, giết theo `application_name`) · P0 cho-qua (không lỗi ⇒ không log `[pg]`).
B `test/gl9-doc-env.test.mjs` (env sạch, cwd rỗng, bản chép cây + `.env` tạm): E1 4 khoá == `--env-file` · E2 trùng/`export` · E3 nháy hở
(NÉM ở bộ chung · docEnvTuyetDoi · van gửi · van nguồn; dòng chú thích/khoá vắng ≠ hỏng; không dấu đóng ⇒ như `--env-file`) · E4 ENOENT ·
E5 chmod 000 NÉM (EACCES) ở bộ chung + 3 bọc + van; `util.parseEnv` vắng ⇒ NÉM · E6 ba bọc "1"/"postgres://x # y"/"abc", X ⇒ "", hai van ĐÓNG ·
E7 ưu tiên (env rỗng thắng ở docEnvTuyetDoi, không thắng ở chuoiNoi/docBien; docBien env tiêm + goc tham số; moiTruongKhoa goc) · E8 CHO-QUA
máy chủ (READONLY=0 có chú thích / không dòng) ⇒ hai van MỞ.
C `test/gl9-luoi-jsonb.test.mjs` (hộp cát): J1 lan-gui · J2 duyệt chặn · J3 duyệt tạo đơn (taoDon giả, maPos nửa cặp) · J4 loại · J5 đối chiếu
(tiền điều kiện: `extractFromText` thật để lại nửa cặp khi cắt 1000) · J6 ghiNhatKy (+ null giữ NULL).
Nhánh KHÔNG chạm: `coDongKhai` với tên có ký tự đặc biệt (tên biến thật chỉ `[A-Z0-9_]`) · client lỗi khi ĐANG có truy vấn (đường reject sẵn
của `query()`, phiếu nói rõ) · duyệt có lỗi POS sau tạo (ngoài phiếu).

## Kết quả — base đỏ → sau vá xanh
```
BASE (4edfbea = base + thước, chưa vá) — BO_DAO_VA=1 bash ops/bin/nghiem-thu/gl9.sh
🔴 ① pass=1 fail=3 · xanh: P0 · THIẾU P1a P1b P1c   (P1a rc=1 BoundPool · P1b rc=1 Client · P1c exitCode=1, dòng lượt 2→2)
🔴 ② pass=1 fail=7 · xanh: E8                        (E6: '1   # chú thích' · 'postgres://x # y"   # đuôi' · 'abc#def')
🔴 ③ pass=0 fail=6                                   (cả 6: invalid input syntax for type json)
🔴 ④d 3 chỗ đọc .env · 🔴 ④e JSON.stringify( còn=10   ⇒ == ĐỎ 5 / XANH 4

SAU VÁ (4dfa289) — bash ops/bin/nghiem-thu/gl9.sh  rc=0 · 38s
✅ ① pass=4 fail=0 (P1a rc=0 · 2 dòng 57P01 · P1b rc=0 · TRUY_VAN_KE=REJECT … not queryable · P1c giết 4 kết nối · exitCode=null · dòng lượt 2→8)
✅ ② pass=8 fail=0 · ✅ ③ pass=6 fail=0 · ✅ ④a–④e (chỗ đọc .env: 1 db/ket-noi.js · stringify trần 0 · jsonLanh( 12)
✅ ⑤a–⑤t 20 đảo-vá đỏ đúng · ✅ ⑤0 bản sao nguyên vẹn pass=18 fail=0      ⇒ == ĐỎ 0 / XANH 30
```

## Đảo-vá (⑤ của cổng — bản SAU vá, mỗi đột biến một tiến trình node mới trên bản sao tạm)
| đột biến | đòi đỏ | đỏ thật |
|---|---|---|
| ⑤a bỏ người nghe POOL | P1a P1c | P1a P1c |
| ⑤b bỏ người nghe CLIENT | P1b | P1b |
| ⑤c log in chuỗi nối | P1a | P1a |
| ⑤d nap.js trả bộ đọc cũ | E3 E5 E6 | E3 E5 E6 |
| ⑤e ket-noi.js docEnv trả bộ đọc cũ | E5 E6 E7 | E5 E6 E7 |
| ⑤f moi-truong.js trả bộ đọc cũ | E5 E6 E7 | E5 E6 E7 |
| ⑤g catch nuốt mọi lỗi (bỏ ENOENT-only) | E5 | E5 |
| ⑤h bỏ phát hiện nháy hở | E3 | E3 |
| ⑤i bộ chung parse tay thay util.parseEnv | E1 E2 | E1 E2 |
| ⑤j–⑤t bỏ lưới TỪNG cửa (lan-gui · 869 · 870 · 970 · 971 · 1080 · 1128 · reconcile · nk truoc · nk sau) | J1·J2·J2·J3·J3·J3·J4·J5·J6·J3J4J6 | đúng cả 10 |
| ⑤k lưới sửa cả `args` gửi khách | J1 | J1 |

**Đột biến nào KHÔNG đỏ** (đo riêng, 2 lượt mỗi đột biến, `khong-do.sh` scratchpad): bỏ người nghe CLIENT ⇒ **P1a và P1c vẫn xanh** (client
rỗi còn người nghe pool; lúc giết, kết nối của worker đều rỗi vì 0 page/0 lượt model) — chỉ P1b bắt. Bỏ người nghe POOL ⇒ P1b vẫn xanh. Tức
mỗi người nghe chỉ có ĐÚNG MỘT ca canh; P1c (worker thật) không phủ trạng thái «đang mượn giữa lượt model» — muốn phủ phải có page bật +
model giả treo giữa lượt (ngoài phiếu, đề nghị nợ N-GL9-P1C-DANG-MUON).

## Cổng cũ (④5) — chạy RIÊNG từng cổng, tuần tự (`chay-cong.sh` scratchpad, PATH có shim `rg`)
```
gl8  rc=0 · ĐỎ 0 / XANH 32
gl3c rc=0 · ĐỎ 0 / XANH 76 (259 s; lồng gl4 · gl3b chạy trong nó)
gp1  rc=1 · PHÉP=72 LỖI=1 (5776 s) — lỗi DUY NHẤT: «cổng cũ tt1 TREO quá 2700s — giết cả nhóm» (gsp2 rc=0 30 s · gsp3 rc=0 712 s · gsp3b rc=0 1477 s)
tt1  chạy riêng rc=1 · PHÉP=27 LỖI=1 (4355 s) — lỗi DUY NHẤT: cổng con gsp3b (lồng dưới tt1) rc=1 «12 dòng đỏ MỚI so với da50df6»,
     truy về: ll18-khung.test.mjs fail=1 · cổng-trước ve7a · ve7b · ve7c · ll2 (lồng 4–5 tầng). Phép riêng của tt1 ①–⑦ + lưới gần + gsp2 · gsp3 ·
     ve8b ✔ · va-r2 «ĐỎ SẴN ở da50df6: 12 dòng giống hệt base, 0 mới» (nợ cũ).
Chạy RIÊNG từng thứ đỏ: ll18-khung 16/0 (×2) · ll2 rc=0 ĐỎ 0/XANH 11 · ve7c rc=0 ĐỎ 0/XANH 17 · gsp3b chạy thẳng dưới gp1 cùng mã: rc=0 (1477 s)
⇒ chập chờn khi lồng trên máy có ≥2 agent khác đang chạy cổng/npm test (án lệ N-THUOC-CHAP-CHON) — 0 đỏ vì mã GL9.
```
Lần chạy gl8 đầu (trước khi sửa) ĐỎ 11: (1) ba đột biến `BO_LUOI_HC` «không áp được» — neo `"      jsonLanh({\n"` / `"      jsonLanh(cuaKiem),\n"`
của gl8.sh khớp THÊM dòng :870/:971 mới của tôi (chuỗi con, thụt lề sâu hơn) ⇒ dời chú thích GL9 lên cùng dòng :870/:971 (neo gl8 lại duy nhất —
đếm bằng `dem-neo.py`: mọi neo gl8/gl4/gl3b/gl9 trên tệp tôi sửa = 1); (2) 8 dòng «đỏ: không» + ⑥0 pass=5 fail=12 vì worktree KHÔNG có
`node_modules` ⇒ symlink `$GOC/node_modules` trong bản sao của gl8 treo ⇒ tạo symlink `node_modules` → cây chính trong worktree (gitignore,
không vào commit). Sau hai việc: gl8 32/0. Bẫy 27 — «thước đỏ giống hệt code đỏ»: không sửa gl8.sh (ngoài pathspec), sửa CODE cho neo cũ còn đúng.

## npm test
- Trước (mốc tổng ghi ở tiếp quản 14/10, cây chính): 2827 ca · 2822 đạt · 1 đỏ chập chờn (`l0-m2-gop-cua-hep` G6) · 4 bỏ qua.
- Sau (worktree, `npm test -- --test-force-exit`, 35 s): **2845 ca · 2823 đạt · 0 đỏ · 22 bỏ qua** · rc=0. +18 = ba tệp ca GL9 (18/18 ✔).
  22 bỏ qua = 19 ca `l0-m1-di-tru` «cần dữ liệu thật (pages.json, conv-state.json, ai-enabled.json) — tệp gitignore» (worktree không có) + 3 cần
  fixture/CSDL riêng. Chạy riêng `l0-m1-di-tru.test.js` với dữ liệu thật MƯỢN bằng symlink (gỡ ngay sau): 21 ca · 19 đạt · 2 bỏ qua · 0 đỏ ⇒ đường
  di trú (`db/di-tru/ket-noi-pos.js` → `moiTruongKhoa(env, goc)`) xanh trên bộ đọc mới. G6 lượt này xanh.

## /code-review (medium, 10 điểm) — sửa 1 · bác 9
- 1 coDongKhai báo hỏng cả giá trị nhiều dòng HỢP LỆ chứa dòng `<ten>=` — BÁC: hợp đồng ② 2 b (khoá có dòng mà parseEnv không trả ⇒ NÉM); hai trường hợp không phân biệt được bằng tệp; chiều sai là fail-CLOSED; .env dev 21 khoá 0 nuốt. Nợ đo prod.
- 2 util.parseEnv vắng (node 20.6–20.12) ⇒ ném trên đường nóng — BÁC: hợp đồng ② 2 (NÉM khi parseEnv vắng); prod node 20.20.2 (phiếu ①B); thêm ca E5 vế 2 đo đúng hành vi đó.
- 3 docEnvTuyetDoi nay có thể ném ⇒ núm cấu hình (V3_LAN_CHOT_MODEL, V3_NAP_*) làm đổ lượt — BÁC có nợ: chỉ khi .env HỎNG (nháy hở nuốt dòng khai / không đọc được); hợp đồng chọn ồn thay vì đoán; nợ N-GL9-DO-ENV-PROD đo trước deploy.
- 4 `#` dính bị cắt (`abc#def` ⇒ "abc") mà đầu tệp chỉ khai 2 khác biệt — NHẬN: sửa đầu `db/ket-noi.js` khai đủ (chú thích đuôi · # dính · nháy có đuôi · export · \n) + vì sao không phải hồi quy (prod --env-file vốn đọc vậy).
- 5 cổng HTTP ghi ném Error thường thay LoiCuaGuiDong khi .env hỏng ⇒ pancake.js xếp 'sau_gui' — BÁC có nợ: handler-v3.js ngoài pathspec; chiều sai an toàn (không gửi, chỉ xếp nhầm «có thể đã gửi» ⇒ đối chiếu/giao sale, không gửi đúp); nợ N-GL9-CONG-GHI-NEM-THUONG.
- 6 pool tự `new pg.Pool` ngoài taoPool (sandbox.js, ops/bin) — BÁC: phiếu ⑥ ngoài phạm vi; nợ N-GL9-OPS-POOL (liệt kê).
- 7 lan_gui.noi_dung lưu bản lành, cửa nhận bản thô — BÁC: hợp đồng ② 3 «chữ gửi khách giữ nguyên từng byte»; đảo-vá ⑤k canh.
- 8 ba hàm bọc ba luật ưu tiên — BÁC: hợp đồng ② 2 giữ nguyên ưu tiên từng hàm; ca E7.
- 9 đọc lại tệp mỗi lần gọi (hiệu năng) — BÁC: bộ cũ cũng readFileSync mỗi lần; «đọc env TƯƠI mỗi lượt» là ý đồ (nap.js nguonDangMo); tệp ~2 KB.
- 10 neo đột biến hc-1080 dựa vào chú thích — BÁC: neo hỏng thì cổng ĐỎ to («không áp được»), không lặng; neo mã thuần đụng neo con của gl8.sh (BO_LUOI_HC — đo: "      jsonLanh({\n" khớp 2 lần) — chính lý do dời chú thích.

## Chặng 1 máy — `ops/bin/nghiem-thu/_chan1.sh gl9` (chạy TRƯỚC khi ghi tệp này)
```
✅ ①phiếu-tồn-tại · ✅ ②có-Base 01a4e89 · ✅ ④pathspec-⊆-③ · ✅ ⑤bộ-não-phải-khai · ✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu gl9.sh rc=0 · 🔴 ⑧a-nhật-ký (tệp này chưa có lúc chạy) · ✅ ⑧b-§10-sổ   == ĐỎ 1 / XANH 7
```
⑧a xanh khi tệp này vào commit (chạy lại sau commit — số ở câu trả lời cho tổng). §10 sổ KHÔNG append (luật của lượt: tổng ghi sổ).

## Lệch phiếu
1. **Ca B chép thêm `v3/src`** (phiếu ④2: «cp -R db src package.json»): `handler-v3.js` → `src/chat/model.js` nạp `v3/src/model/bang-model.js` —
   thiếu là ERR_MODULE_NOT_FOUND, không đo được `vanGuiDangMoTuyetDoi`.
2. **P1c giết theo `application_name` (PGAPPNAME của worker)**, không theo «mọi backend `pid <> pg_backend_pid()`» của phiếu ④1c: giết mọi backend
   là giết luôn pool của tiến trình TEST — ở base (pool không người nghe) tiến trình test chết, đỏ bẩn không đọc được. Tương đương cho worker
   (mọi kết nối của cả `pool` lẫn `poolGui` đều mang PGAPPNAME). Giá: không đo «tiến trình khác cùng CSDL bị giết» — không thuộc hợp đồng.
3. **Cổng cũ ⑥ của gl9.sh mặc định HOÃN** (`CHAY_CONG_CU=1` mới chạy gl8 · gl3c · gp1): lồng cổng là án lệ treo (đúng: tt1 treo trong gp1 lượt
   này). Số ④5 ghi ở mục «Cổng cũ» trên, chạy riêng.
4. **E3 sửa SAU commit thước trước** (`e195fd2`): bản đầu dùng nháy hở không có dấu đóng — `parseEnv` không nuốt ⇒ ca sai nguyên liệu, không phải
   code sai (đo `nhay-ho.sh`). Base vẫn đỏ ca mới (đảo-vá ⑤d/⑤h).
5. Không sửa tệp nào ngoài pathspec ③ (`_chan1` ④ xanh). Symlink `node_modules`, `.env` trong worktree là môi trường, gitignore.

## Nợ đề nghị §9 (TỔNG ghi — thợ không append sổ)
- **N-GL9-DO-ENV-PROD** — trước deploy GL9: đo `.env` prod bằng bộ đọc mới, CHỈ IN TÊN: khoá có dòng mà `parseEnv` không trả (bộ chung sẽ NÉM ở
  mọi lượt đọc khoá đó — `docEnvTuyetDoi` ở cổng HTTP ghi, bộ nạp, `lanChotNhuongModel`) + khoá lệch cũ/mới. Prod: `PANCAKE_READONLY` vắng cả
  env lẫn tệp ⇒ mỗi lượt gọi đều đọc tệp (như bộ cũ). Kịch bản 10 dòng ở scratchpad thợ `do-env-truoc-deploy.cjs` (đo dev: 21 khoá · nuốt 0).
- **N-GL9-CONG-GHI-NEM-THUONG** — `handler-v3.js:108` cổng HTTP ghi: `vanGuiDangMoTuyetDoi()` NÉM (.env hỏng) ⇒ ném `Error` thường, không phải
  `LoiCuaGuiDong` ⇒ `pancake.js:149` xếp «sau_gui» thay «ket_noi» ⇒ khongRo/đối chiếu dù chưa rời máy. Chiều an toàn (không gửi), sai phân loại.
  Vá: bọc lời gọi, ném `LoiCuaGuiDong` kèm lý do. (handler-v3 ngoài pathspec GL9.)
- **N-GL9-OPS-POOL** — tự `new pg.Pool` không người nghe ngoài `taoPool`: `db/sandbox.js:38/58` (test) · `ops/bin/{dich-ban-may, gia-lap-mot-minh,
  bao-cao-24h, do-goi-y-gan, dien-tap-hoi-thoai, do-lop-0-dong, dem-token-kimi, phat-lai-lich-su, gia-lap-dong-thoi-gian, nap-khoa-nha,
  nap-page-de-do, local-dev}.mjs` · `ops/bin/phat-hanh.sh` · vài cổng `nghiem-thu/*.sh`. Postgres restart giữa lượt ⇒ công cụ chết. Gộp về `taoPool`.
- **N-GL9-JSONB-NGOAI-SAU-CUA** (phiếu ⑥ đặt tên) — `v3/src/ui/van-hanh/don-cho.js:91` · `prepareValue` của `src/db/truy-van.js`.
- **N-GL9-DOTENV-CWD** — `src/config.js:1` `import 'dotenv/config'` nạp `.env` của CWD vào process.env bằng parser dotenv (bộ đọc thứ tư, khác
  `parseEnv` ở ca biên). Unit prod đã `--env-file` nên không đè; script chạy từ cwd lạ thì process.env có thể mang giá trị dotenv và thắng bộ đọc
  chung. Đo: ca B phải chạy cwd rỗng mới đo được bộ đọc.
- **N-GL9-P1C-DANG-MUON** — chưa ca nào giết kết nối worker ĐANG MƯỢN giữa lượt model thật (P1c chỉ phủ client rỗi — đảo-vá ⑤b không đỏ ở P1c).
- (giữ của phiếu ⑥) tắt `unattended-upgrades` Postgres trên VPS — việc người.

## Trả nợ (đề nghị tổng gạch)
N-POOL-KHONG-BAT-LOI · N-GL8-DOC-ENV-TUYET-DOI · N-GL8-LUOI-DUYET · N-GL8-LAN-GUI-JSONB · N-GL8-RECONCILE-HO-SO · N-GL8-NHAT-KY-JSONB
(N-GL8-PROMPT-NUA-CAP còn — bộ não).
