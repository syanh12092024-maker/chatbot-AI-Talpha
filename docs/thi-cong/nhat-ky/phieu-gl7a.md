# Nhật ký phiếu GL7a — phép ⑤ của `_chan1.sh` theo luật file phẳng sau CR-02-10 (07/10/2026 · thợ GL7a)

**Môi trường đo:** máy dev macOS (Node v24.19.0, bash hệ thống), cây chung `vao-ui-v3-17-09`. Không CSDL, không mạng, không prod.
Ca và cổng dựng repo git TẠM trong `os.tmpdir()`/`mktemp -d` (git cô lập: `GIT_CONFIG_GLOBAL=/dev/null`, `core.hooksPath=/dev/null`,
không ký) rồi chạy `_chan1.sh` THẬT với cwd = repo tạm. ④7 chạy trên clone `--shared --no-checkout` của chính repo này (chỉ đọc kho
đối tượng). Làn 🟩. Base `aef9fb6` (phiếu `05d6b33`). Commit mã: **`2db6f07`**.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ ls ops/bin/tra_no.py docs/thi-cong/SO-NO.md        → cả hai không tồn tại
$ grep -n "⑤vùng-cấm-src-phẳng\|_chan1.*⑤\|⑤.*_chan1" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
7:   «Đụng bộ não» trong phiếu, cổng `_chan1.sh` ⑤ canh) …            (nhịp tim 16/09 — luật cũ)
58:  `_chan1.sh` phép ⑤ đỏ nếu đụng mà không khai) …                    (§0a luật 4, rào ① 16/09)
403: | GL7a | Phép ⑤ `_chan1.sh` theo luật file phẳng CR-02-10 … | 🔨 phát 07/10 · cây chung |
404: | GL7  | Đồng bộ tài liệu + rào cũ (… hook `canh-file-cam.sh` · phép ⑤ `_chan1.sh`) | GL1–GL5 | ⬜ |
3380: … `_chan1` ⑤ đỏ cho src/pancake.js = rào cũ …                      (§10 GL3)
3400: - 07/10 · GL3b chặng 1 `_chan1` 7/8 (⑤ rào cũ) …                  (§10 GL3b)
```
Quan hệ: mới (tách phần rào khỏi GL7 — đúng phiếu). Không trùng nợ cũ. Phần còn lại của GL7 (hook, `deploy/README.md`, `README.md:95`,
unit mẫu cũ, `docs/v3/00-BAT-DAU-TU-DAY.md`) ĐÃ nằm ở dòng GL7 §5j ⇒ không ghi nợ trùng.

## Bước 3 — đo lại nguyên liệu đề bài (ở `aef9fb6`)
- `_chan1.sh:49-70` = phép ⑤ đúng như phiếu tả: mọi `src/*.js` phẳng là cấm trừ tệp NAO khi `grep -c '^\*\*Đụng bộ não:\*\*'` ≥ 1 ✔.
- **Lệch đề bài:** phiếu/sổ/brief nói «NĂM tệp bộ não», NAO trong script có **BẢY** (`prompts closer tools fast-lane outbound-guard`
  + `context lead-score`, thêm ở BH1 `22561be`); hook `canh-file-cam.sh` cũng bảy. Phiếu ②1 «giữ nguyên danh sách NAO» ⇒ giữ 7, ghi nợ
  N-GL7A-NAM-HAY-BAY.
- Kho phiếu thật: 28 dòng `**Đụng bộ não:**` ở cột 0 — 21 dạng «không» (`không.` ×18 · `không. (…)` · `không (KHÔNG sửa src/fast-lane.js…)` ·
  `không — git status năm file prompts.js…`), 7 dạng khai tên tệp (BH1–BH8 trừ BH5). Hai dạng «không» có thật CHỨA chữ khác và chứa cả tên
  tệp não ⇒ luật «dòng có chữ khác "không" là đã khai» theo nghĩa đen sẽ tính nhầm chúng là đã khai (xem Quyết định a).
- Repro đỏ giả trên cây thật, TRƯỚC sửa (HEAD `05d6b33`): `_chan1.sh gl3b` ⇒ `🔴 ⑤vùng-cấm-src-phẳng ĐỤNG (chưa khai «Đụng bộ não» trong
  phiếu): src/pancake.js` · `== ĐỎ 2 / XANH 6` (đỏ kia là ④ — HEAD trôi, xem nợ N-CHAN1-HEAD-TROI).

## Danh sách ca (viết trước — `test/gl7a-chan1-bo-nao.test.mjs`, mỗi ca × 2 locale `C` / `en_US.UTF-8`)
| Ca | Kịch bản | Chờ | Nhóm |
| --- | --- | --- | --- |
| ④1 | chạm `src/pancake.js`, khai «không.» | ⑤ ✅, không nêu pancake | CHO-QUA thật (đỏ giả hôm nay) |
| ④1b | chạm `pancake` + `kb` + `config`, không có dòng khai | ✅ | CHO-QUA |
| ④2 | chạm `src/prompts.js`, khai «không.» | 🔴, nêu tên tệp, câu nói «không» không tính | CHẶN (lỗ hôm nay) |
| ④2b | 10 biến thể: `không` · `Không.` · `KHÔNG.` · `khong.` · `**không**` · 3 dòng «không…» có thật trong kho · dòng trống · chỉ khoảng trắng | 🔴 cả 10 | BIÊN |
| ④2c | chạm đủ 7 NAO + pancake, khai «không.» | 🔴 nêu ĐỦ 7 tên, KHÔNG nêu pancake | CHẶN + canh danh sách NAO + câu đỏ không nói dối |
| ④2d | DỜI `src/prompts.js` → `src/chat/prompts.js`, khai «không.» | 🔴 nêu `src/prompts.js` | BIÊN (dời = đụng) |
| ④3 | chạm `src/prompts.js`, khai «CÓ — src/prompts.js …»; và khai dạng BH (`` `src/prompts.js` `src/tools.js` — … ``) + pancake | ✅ | CHO-QUA khi đã khai |
| ④4 | chạm `src/prompts.js`, không có dòng khai (thân phiếu nhắc «Đụng bộ não» GIỮA dòng) | 🔴 nêu tên | CHẶN |
| ④5 | chỉ `src/queue/*.js` · `src/chat/*.js` · `v3/…`, có và không có dòng «không.» | ✅ | CHO-QUA |

Hành vi trọn đường: mọi ca chạy `_chan1.sh` thật trên repo git thật (commit thật, `git diff base..HEAD` thật, phiếu thật trong cây tạm);
đáp án không lấy từ code bị đo. Nhánh test KHÔNG chạm: các phép ①②③④⑥⑦⑧ (phiếu ②4 cấm đổi; ca chỉ đọc dòng ⑤).

## Đã làm (commit `2db6f07`, 3 tệp — đúng ③)
- `ops/bin/nghiem-thu/_chan1.sh` — phép ⑤ đổi nhãn `⑤vùng-cấm-src-phẳng` → **`⑤bộ-não-phải-khai`**. Chỉ tệp trong NAO (giữ nguyên 7) bị
  canh; tệp phẳng dùng chung / thư mục con / ngoài `src/` đi qua. «Đã khai» = có ít nhất một dòng cột 0 `**Đụng bộ não:**` mà phần sau nhãn
  (tước khoảng trắng và `*`/`_` in đậm đầu) KHÔNG trống và KHÔNG mở đầu bằng `không|Không|KHÔNG|khong|Khong|KHONG`. Danh sách tệp cho ⑤ lấy
  riêng `git diff --name-only --no-renames base..HEAD` (dời tệp não lộ đường cũ). Câu đỏ: `ĐỤNG BỘ NÃO mà phiếu chưa khai (cần dòng
  `**Đụng bộ não:** <tệp> — <lý do>`; dòng «không» hoặc trống không tính): <tệp>`; câu xanh nêu `(chạm bộ não ĐÃ khai: <tệp>)` khi có.
  Chú thích đầu phép ghi luật mới + nguồn (sổ §0a luật 4, «SỬA 02/10 — CR-02-10») + biên đã biết. Phép khác không đổi một byte
  (`git diff` chỉ một khối @@ 46–76).
- `ops/bin/nghiem-thu/gl7a.sh` — cổng 22 phép theo khuôn nhà (`bang`/`san` phân biệt HỎNG với TRƯỢT, in cây đo, `GIU_SANDBOX=1`).
- `test/gl7a-chan1-bo-nao.test.mjs` — 9 ca × 2 locale = 18; `GL7A_CHAN1=<bản khác>` để đảo-vá.

## Bằng chứng (output máy, dán nguyên dòng kết)
Bộ ca trên BASE (`_chan1.sh` của `aef9fb6`) — ĐỎ đúng chỗ:
```
✖ ④1 · ④1b · ④2 · ④2b · ④2c · ④2d · ④3   (× 2 locale)     ✔ ④4 · ④5 (hành vi cũ vốn đúng)
ℹ tests 18 · ℹ pass 4 · ℹ fail 14
④1: AssertionError: 🔴 ⑤vùng-cấm-src-phẳng ĐỤNG (chưa khai «Đụng bộ não» trong phiếu): src/pancake.js
④2b: dòng «**Đụng bộ não:** không» bị tính là đã khai: ✅ ⑤vùng-cấm-src-phẳng
④3 đỏ vì vế 2 có pancake.js · ④2d đỏ vì rename chỉ lộ tên mới trong thư mục con
```
Bộ ca SAU sửa (cùng cờ `npm test`: `--env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks`):
```
ℹ tests 18 · ℹ pass 18 · ℹ fail 0
```
Cổng `gl7a.sh`:
```
bản của cây (sau):    PHÉP=22 LỖI=0 · == ĐẠT (GL7a, máy dev, repo tạm + clone chỉ-đọc) · rc=0 (42 s)
GL7A_CHAN1=<bản base>: PHÉP=22 LỖI=12 · rc=1 — ✘ ④1 · ✘ ④2 [C]/[UTF-8] trạng thái + tên tệp · ✘ ④6·0 pass 4/fail 14 · ✘ ④7 bản của cây 🔴
```
④7 trong cổng (clone chỉ-đọc mốc `aef9fb6`):
```
bản của cây · dòng ⑤      ✅ ⑤bộ-não-phải-khai
bản cũ aef9fb6 · dòng ⑤   🔴 ⑤vùng-cấm-src-phẳng ĐỤNG (chưa khai «Đụng bộ não» trong phiếu): src/pancake.js
```
`_chan1.sh gl3b` trên CÂY THẬT (đọc, không ghi; ⑦ chạy lại cả `gl3b.sh` ~2′, rc=0 49/49):
```
TRƯỚC (05d6b33, _chan1 cũ):  🔴 ⑤vùng-cấm-src-phẳng ĐỤNG (chưa khai «Đụng bộ não» trong phiếu): src/pancake.js · == ĐỎ 2 / XANH 6
SAU   (05d6b33, _chan1 mới): ✅ ⑤bộ-não-phải-khai                                                        · == ĐỎ 1 / XANH 7
                             (đỏ còn lại = ④pathspec 25 tệp của GL2 · GSP3c … — HEAD trôi, ngoài phạm vi)
```
Chặng 1 của chính phiếu: `_chan1.sh gl7a` ⇒ `✅ ④pathspec-⊆-③` · `✅ ⑤bộ-não-phải-khai` · `✅ ⑦ gl7a.sh rc=0 (PHÉP=22 LỖI=0)` ·
`== ĐỎ 0 / XANH 8`, rc=0 (lượt chạy có sổ §10 + nhật ký trong cây làm việc, trước commit tài liệu).
Phân loại 28 dòng khai thật bằng đúng câu mới, hai locale: `C: 21×0 7×1` · `en_US.UTF-8: 21×0 7×1` — 7 dòng «đã khai» = đúng 7 phiếu BH
có tên tệp (không phiếu cũ nào đổi kết quả ⑤ vì luật «không»).

## Đảo-vá (mỗi lượt một tiến trình `node --test` mới; bản đột biến là BẢN SAO trong thư mục tạm/scratchpad, tệp của cây không đổi)
| Đột biến | Bộ ca | Cổng `gl7a.sh` (chạy cả cổng với `GL7A_CHAN1=`) |
| --- | --- | --- |
| m1 trả ⑤ về bản base `aef9fb6` | fail 14 | LỖI 12 — ④1 đỏ (phiếu ④6 vế 1 ✔) |
| m2 «không» tính là khai (`grep -c` cũ) | fail 8 | LỖI 5 — ④2 lật ✅ cả hai locale (phiếu ④6 vế 2 ✔) |
| m3 câu đếm trả hằng `khai_nao=0` | fail 2 | LỖI 4 — ④3 đỏ |
| m4 đảo dấu `-ge 1` → `-lt 1` | fail 12 | LỖI 8 — ④2 ④3 ④4 đỏ |
| m5 bỏ `--no-renames` | fail 2 (④2d) | LỖI 3 — chỉ qua ④6·0 (cảnh ④1–5 không có dời tệp) |
| x1 rút `src/lead-score.js` khỏi NAO | fail 2 (④2c) | — |
| x2 bỏ `khong/KHONG` không dấu | fail 2 (④2b) | — |
| x3 bỏ «trống không tính» (`^$`) | fail 4 (④2b · ④4) | — |
| x5 bỏ tước khoảng trắng/in đậm đầu | fail 8 | — |
| x4 bỏ hậu tố từ-biên `([^[:alpha:]]\|$)` sau «không» | **fail 0 — KHÔNG đỏ** | ⇒ hậu tố là mã chết (âm tiết tiếng Việt cách nhau bằng dấu cách, không từ nào «không»+chữ); **đã GỠ**, đảo-vá chạy lại trên bản sau gỡ: m1–m5 + x1 x2 x3 x5 vẫn đỏ đúng như bảng |

Đột biến/biên KHÔNG đỏ còn lại (đã biết, có chủ đích):
1. Khai tệp A, sửa thêm tệp não B ⇒ ✅ — đúng chữ ②1, nợ **N-GL7A-KHAI-THEO-TEP**.
2. Dòng trộn chuẩn Unicode: nhãn NFC + «không» NFD ⇒ tính là đã khai (đo: `grep -cv` ra 1). Cả dòng NFD thì nhãn không khớp ⇒ «không có dòng»
   ⇒ đỏ (an toàn). Kho phiếu hôm nay 0/57 tệp không-NFC (python `unicodedata` quét `docs/thi-cong/phieu/*.md`). Không vá — chỉ ghi.
3. Khai kiểu nhiều dòng (`**Đụng bộ não:**` trống, danh sách ở dòng sau) ⇒ ĐỎ oan (fail-closed). Chưa phiếu nào viết thế.

## Quyết định / giả định (ghi tại chỗ quyết)
a. **«Chưa khai» = mở đầu bằng «không», không phải «không có chữ nào khác ngoài "không"».** Phiếu ②1 viết «dòng khai có chữ khác «không»».
   Theo nghĩa đen, `không (KHÔNG sửa src/fast-lane.js…)` và `không — git status năm file prompts.js…` (có thật, BH-sau) CÓ chữ khác ⇒ bị tính
   là đã khai ⇒ đúng cái lỗ ②2 muốn bịt. Chọn đọc theo Ý ĐỒ (②2: dòng «không» không được tính); giá: một dòng khai THẬT mà mở đầu bằng chữ
   «không» (vd «không chỉ prompts.js mà cả tools.js») sẽ đỏ — người viết phiếu sửa thành tên tệp trước. Khuôn §0a đòi `<danh sách tệp> — <lý do>`.
b. **Trống = chưa khai** (fail-closed). Ca ④2b canh.
c. **`--no-renames` chỉ trong ⑤** (dời/xoá tệp não là đụng). ④ vẫn dùng `danh_sach` cũ — ②4 «không đổi các phép khác».
d. **Không đối chiếu tên tệp** — ngoài ②1, ghi nợ thay vì tự nới hợp đồng.
e. **④7 trong cổng chạy trên clone chỉ-đọc mốc `aef9fb6`, không trên HEAD cây thật** (lệch chữ phiếu). Lý do đo được: chính lượt cây thật hôm
   nay đã đỏ ④ vì 25 tệp của phiếu sau GL3b ⇒ `base..HEAD` trôi theo lịch; một phiếu sau khai não hợp lệ sẽ làm GL3B («không.») đỏ ⑤ ĐÚNG luật
   và cổng GL7a đỏ theo lịch chứ không theo mã (viet-thuoc luật 4). Clone chỉ lấy 3 tệp điều hành ra cây ⇒ ⑦ «gl3b.sh KHÔNG TỒN TẠI» tức thì,
   không chạy lại `gl3b.sh` ~2′/Postgres trong mỗi lượt cổng. Lượt cây thật đúng chữ phiếu đã chạy TAY trước/sau và dán ở mục Bằng chứng.
f. Câu xanh có thêm «(chạm bộ não ĐÃ khai: …)» — người đọc chặng 1 thấy phiếu nào đang sửa não dù ⑤ xanh.
g. Ca × 2 locale: luật đọc chữ có dấu — regex byte (C) và ký tự (UTF-8) phải cùng kết quả; cổng chạy ④2 ở cả hai.

## Lệch
- «Năm tệp» (phiếu, sổ, brief) ≠ 7 tệp NAO trong script/hook — giữ 7 theo ②1, nợ N-GL7A-NAM-HAY-BAY.
- ④7: cổng đo trên lịch sử thật đóng băng ở `aef9fb6` (Quyết định e); lượt HEAD cây thật làm tay.
- ④6 «coi dòng «không» là đã khai ⇒ phép 2 đỏ»: cổng đo đúng nghĩa — cảnh ④2 lật thành ✅ (chờ 🔴) — và thêm bộ ca fail ≥ 1.
- Phiếu ④1–5 nói «⑤ ĐỎ (nêu tên tệp)»: cổng đếm số lần tên tệp xuất hiện trong dòng ⑤ = 1 (không chỉ «có chữ»).
- `npm test` toàn bộ KHÔNG chạy: làn 🟩, tệp ca mới độc lập (chỉ git + bash, không CSDL, không module dự án), máy đang có 2 thợ worktree
  tranh CPU/Postgres (sổ §0 luật 6 / bẫy 24). Tệp ca chạy riêng với đúng cờ `npm test`: 18/18.

## Nợ (đã APPEND §9 sổ, khối «07/10 · GL7a (thợ)»)
- **N-GL7A-KHAI-THEO-TEP** — ⑤ không đối chiếu tên tệp khai với tệp não chạm.
- **N-GL7A-NAM-HAY-BAY** — «năm» hay «bảy» tệp bộ não: sổ §0a vs `_chan1.sh`/hook.
- **N-CHAN1-HEAD-TROI** — `_chan1` đo `base..HEAD` ⇒ chạy lại cho phiếu đã xong thì ④/⑤ đỏ theo lịch; đề nghị mốc trên `base..<xong>`.
