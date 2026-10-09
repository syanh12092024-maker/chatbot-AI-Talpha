# NHẬT KÝ PHIẾU GL8 — cắt chữ ghi sổ không đứt emoji · lưới jsonb · công cụ ops đọc env như `node --env-file`

**Thợ:** agent thi công (worktree riêng `agent-acada247d1dc24218`, nhánh `worktree-agent-acada247d1dc24218`) · **Ngày:** 09/10/2026 ·
**Base phiếu:** `33c04ac` (phiếu sau soát (a) ở `5c0e3aa` — worktree reset về đó trước khi làm) · **Làn:** 🟥 · **Đụng bộ não:** không.

## Commit

| hash | nội dung |
| --- | --- |
| `f089b07` | `test(gl8)` — THƯỚC TRƯỚC: `ops/bin/nghiem-thu/gl8.sh` + 4 tệp ca `test/gl8-*.test.mjs` (mã vẫn là base ⇒ đỏ) |
| `1847062` | `fix(gl8)` — `catChu` + `jsonLanh` (`src/text.js`) · 8 chỗ cắt · lưới 3 cửa jsonb · 9 công cụ `util.parseEnv` + dòng «cờ đã đọc» |
| (commit này) | `docs(nhat-ky)` — nhật ký này |

## ⑦ Đã tra chưa (đầu lượt)

`ops/bin/tra_no.py`, `docs/thi-cong/SO-NO.md`, `CLAUDE.md` KHÔNG tồn tại trong cây (đo `ls` ⇒ «No such file»). Tra thay trong sổ:

```
$ grep -nE "surrogate|nửa cặp|nửa emoji|parseEnv|chú thích đuôi|GL8|docEnvTuyetDoi" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
388:## §5j · ĐIỀU KIỆN GO-LIVE (GL1–GL8) — người quyết «triển khai» 05/10
488:  `channels/messenger#cuaDangMo` không export ⇒ chép ở `nap.js#docEnvTuyetDoi` +
3574:- 05/10 · ĐIỀU KIỆN GO-LIVE (GL) → ⬜ chưa phát — … GL8 gộp hai bộ điều kiện sẵn sàng
```
Dòng 488 = nợ VA-R1 (4) «`db/ket-noi.js#docEnv` không export ⇒ chép ở `nap.js#docEnvTuyetDoi`» — cùng họ với nợ N-GL8-DOC-ENV-TUYET-DOI
phiếu đã khai ở ⑥; KHÔNG trùng việc của phiếu này (phiếu này chỉ chạm 9 công cụ ops). Không nợ/phán nào trùng phần A.

## Đo lại nguyên liệu đề bài (bước 3) — trên base, hộp cát dev

Ca W2 chạy trên mã base (`f089b07`, trước bản vá) — khớp từng chi tiết với tái hiện của soát (a):

```
[gl8w] model-971: {"ketQua":"loi","lyDo":"error: invalid input syntax for type json","tin":[{"trang_thai":"loi",…}],
  "ht":{"trang_thai":"HANDOFF","chu_so_huu":"SALE","ly_do_cuoi":"loi_xu_ly_can_doi_chieu"},"so":[],"model":1,"post":1,"gui":[201]}
```
⇒ khách nhận 1 tin (201 đơn vị, đủ) · tin `loi` · hội thoại sang SALE với `loi_xu_ly_can_doi_chieu` · `so_ai` 0 dòng. Nhánh cắt TRƯỚC khi gửi
(`:906` cửa ra · `:717`/`:647` câu mẫu bị chặn · `hang-cho.js:479` chốt đơn) trên base: tin `cho` (thử lại) — `cua-ra-906` model=1 sau một
vòng, sẽ bị gọi lại khi tới `thu_lai_luc` (tiền). Lượt chốt đơn: `hc:0` (mất dòng `hang_cho_tao_don`).

Phần B, đo trên `.env` dev (chỉ in TÊN khoá): 21 khoá; bộ đọc cũ vs `util.parseEnv` lệch **6** khoá — `APP_SECRET · FASTLANE ·
FASTLANE_TEMPLATES · FASTLANE_INTRO · PAGE_REGISTRY · HUMAN_TAKEOVER` (đều vì chú thích đuôi). `PANCAKE_READONLY` · `DATABASE_URL_V3` không lệch.

## Danh sách ca (viết trước ca chi tiết)

| ca | nhóm | kịch bản | nhánh |
| --- | --- | --- | --- |
| C1 | BIÊN | 201 đơn vị, đơn vị 200 = `\ud83d` ⇒ ≤200, lành, đúng 199 đơn vị đầu (cả n=600, n=60) | `catChu` |
| C2 | CHO-QUA | chuỗi lành (ASCII · tiếng Việt · Ả Rập · emoji trọn cặp · n=0…10000) ⇒ y hệt `slice` | `catChu` |
| C3 | CHẶN | nửa cặp lẻ có sẵn ⇒ xoá; `cleanText` giữ hành vi cũ (bóc HTML, cắt trước dọn sau) | `boNuaCapLe` · `cleanText` |
| J1 | CHẶN+CHO-QUA | nửa cặp ở giá trị/mảng/lồng ⇒ JSON lành; dữ liệu lành ⇒ y hệt `JSON.stringify`; bẫy `toWellFormed` sau stringify | `jsonLanh` |
| W2 | HÀNH VI | worker thật, model trả 201 đơn vị ⇒ tin `xong` · 1 `so_ai reply` lành · `AI` · `ly_do_cuoi≠loi_xu_ly…` · khách nhận ĐỦ 201 đơn vị | `:971` |
| W3a/W3b | HÀNH VI | lớp từ khoá (KB `fastLaneAuth`) / Fast Lane (tiêm) 201 đơn vị ⇒ như W2, 0 model | `:668` · `:744` |
| W3c | HÀNH VI | cửa ra giết câu model 601 đơn vị ⇒ tin `xong`, model ĐÚNG 1, `spent_no_send` lành | `:906` |
| W3d/W3e | HÀNH VI | câu mẫu 601 đơn vị bị cửa ra chặn ⇒ tin `xong`, `spent_no_send` lành | `:717` · `:647` |
| W5 | HÀNH VI | lượt CHỐT ĐƠN, tin khách có dấu hiệu đơn ngoài + emoji ở chỗ cắt 60 ⇒ dòng `hang_cho_tao_don` CÒN, nguồn (d) `duong` | `hang-cho.js:479` |
| L4a/b/c | CHẶN | gọi thẳng `ghiSoAi` · `suaHoiThoai` (ho_so, diem_lead) · `vaoHangCho` (hồ sơ + lỗi nguồn (e)) với nửa cặp lẻ ⇒ ghi được, đọc lại lành | lưới 3 cửa |
| E1 | tham chiếu | `util.parseEnv` = `node --env-file` trên tệp tạm (`0   # tắt`→`"0"` · `"x # y"` · `B=1#2`→`"1"`) | Node |
| E2a–i | HÀNH VI | chạy THẬT từng công cụ (móc `--import` dừng ở `new pg.Pool`, 0 kết nối, `fetch` ném) ⇒ chuỗi nối sạch chú thích; 6 công cụ chép env ⇒ `FASTLANE_TEMPLATES="0"` … | 9 công cụ |
| E3 | HÀNH VI | `gia-lap-mot-minh` in đúng 1 dòng «cờ đã đọc» đủ 8 cờ | `gia-lap-mot-minh` |

Nhánh KHÔNG chạm: bộ nạp thật (tin xếp tay `xepTin`) · cửa Messenger thật (tiêm — `lan_gui` vẫn đi qua `bocCuaGuiBen` thật) · bộ não thật
(`chayCloser` tiêm) · đường DUYỆT hàng chờ (`duyet()`) · `:663` (`dem0Dong` khi bộ đếm lớp 0 đồng ném — không dựng được lỗi đó từ ca;
lưới `so-ai.js` phủ). Không ca hai múi giờ: không ca nào đụng ngày/giờ (`hoanMs:0`, không so mốc).

## Số đo (máy dev · hộp cát Postgres `127.0.0.1:5432` `aicloser_v3_test_gl8{w,l}_p<pid>` · cây worktree · node v24.19.0)

**Bộ ca trên base** (thước mới, mã cũ): `tests 25 · pass 1 · fail 24` — xanh duy nhất E1 (tham chiếu Node, không đo mã).

**Cổng trên base** (`BO_DAO_VA=1 ./ops/bin/nghiem-thu/gl8.sh`, HEAD `5c0e3aa` + thước):
```
🔴 ①phép-1 … pass=0 fail=4        🔴 ②phép-2·3 … pass=0 fail=7      🔴 ③phép-4 … pass=0 fail=3
🔴 ④phép-5 … pass=1 fail=10 (xanh: E1)   🔴 ⑤c slice còn=6 · catChu(=0   🔴 ⑤d =0   🔴 ⑤e còn=9/9
✅ ⓪ ✅ ⑤a ✅ ⑤b ✅ ⑤f            == ĐỎ 7 / XANH 4
```

**Cổng sau vá** (`./ops/bin/nghiem-thu/gl8.sh`, HEAD `1847062`, chạy hai lần — lần 2 sau commit):
```
✅ ⓪.env-PANCAKE_READONLY=1 đọc được: '1'
✅ ①phép-1 pass=4 fail=0 · xanh: C1 C2 C3 J1
✅ ②phép-2·3 pass=7 fail=0 · xanh: W2 W3a W3b W3c W3d W3e W5
✅ ③phép-4 pass=3 fail=0 · xanh: L4a L4b L4c
✅ ④phép-5 pass=11 fail=0 · xanh: E1 E2a E2b E2c E2d E2e E2f E2g E2h E2i E3
✅ ⑤a bộ não không đổi từ 33c04ac · ✅ ⑤b worker.js không đổi · ✅ ⑤c slice còn=0 · catChu( =7 · ✅ ⑤d =1 · ✅ ⑤e còn=0/9 · ✅ ⑤f 1 regex
✅ ⑥a…⑥i (18 đảo-vá, bảng dưới) · ✅ ⑥0 bản sao nguyên vẹn pass=25 fail=0
== ĐỎ 0 / XANH 29
```
Dòng lượt thật sau vá (trích): `model-971: tin xong · ht QUALIFY/AI · so ["reply/AI"] · model 1 · post 1 · gui [201]` ·
`cua-ra-906: tin xong · so ["spent_no_send/AI","handoff/AI"] · model 1 · post 0` · `chot-don-479: tin xong · hc 1 · so ["order/AI","reply/AI"]`.

**npm test** (`npm test`, cùng máy, cùng cây):
- TRƯỚC (mã base, KHÔNG có `test/gl8-*`): `tests 2801 · pass 2779 · fail 0 · skipped 22` · rc=0 · 32,7 s
- SAU (`1847062`): `tests 2826 · pass 2804 · fail 0 · skipped 22` · rc=0 · 33,4 s (+25 = đúng 25 ca GL8; 0 ca cũ đổi màu)

**`_chan1.sh gl8`** (sau commit nhật ký, HEAD `a7ee226` trước khi bổ sung dòng này): `✅ ①phiếu ✅ ②Base=33c04ac ✅ ④pathspec-⊆-③ (21 tệp) ✅ ⑤bộ-não ✅ ⑥marker=0 ✅ ⑦gl8.sh rc=0 (ĐỎ 0/XANH 29) ✅ ⑧a ✅ ⑧b` ⇒ **== ĐỎ 0 / XANH 8**. ⚠️ ⑧b xanh nhờ dòng §10 ngày 05/10 có chữ «GL8» (đề xuất ĐIỀU KIỆN GO-LIVE) — chưa có dòng nộp phiếu GL8; tổng ghi §10 (thợ không sửa sổ theo lệnh giao việc).

## Đảo-vá (④6 + thêm) — mỗi đột biến một tiến trình node mới trên bản sao tạm

| # | đột biến | đỏ thật | đòi |
| --- | --- | --- | --- |
| ⑥a | `:971` về `slice` + bỏ lưới `so-ai.js` | W2 | W2 |
| ⑥b | bỏ lưới 3 cửa (so-ai · kho · hang-cho), GIỮ hàm cắt | L4a L4b L4c | L4a L4b L4c |
| ⑥c | `:668`/`:744` + `:906` về `slice` + bỏ lưới | W3a W3b W3c | W3a W3b W3c |
| ⑥d ×9 | từng công cụ trả khối đọc env cũ | E2a … E2i (mỗi công cụ đỏ đúng ca của nó) | như vậy |
| ⑥e | `:647`/`:717` về `slice` + bỏ lưới | W3d W3e | W3d W3e |
| ⑥f | `hang-cho.js:479` về `slice` + bỏ lưới hàng chờ | W5 | W5 |
| ⑥g | `catChu` thành `slice` trần + bỏ lưới | C1 W2 | C1 W2 |
| ⑥h | lưới dọn SAU stringify (`boNuaCapLe(JSON.stringify(x)).toWellFormed()` — bẫy ②2) | J1 L4a L4b L4c | J1 L4a L4b L4c |
| ⑥i | bỏ dòng «cờ đã đọc» | E3 | E3 |

**Đột biến nào KHÔNG đỏ** (đo tay trên bản sao tạm, cùng cách):
1. `:971` + `:663` về `slice` mà GIỮ lưới ⇒ **0 đỏ** (14/14 xanh — `gl8-luot-emoji` · `gl8-luoi-jsonb` · `gl8-cat-chu`). Đúng thiết kế
   HAI LỚP: lưới ở `so-ai.js` một mình đã cứu lượt (và cũng cắt nửa cặp lơ lửng thành 199 đơn vị y như `catChu`). Hệ quả: các ca W chỉ đỏ
   khi gỡ CẢ HAI lớp — đó là lý do mọi đột biến chỗ cắt ở bảng trên đều kèm «bỏ lưới».
2. Gỡ lưới `kho.js` một mình ⇒ chỉ L4b đỏ; không ca W nào đỏ — ca worker không đưa emoji vào `ho_so` (hồ sơ do `context.js` hút,
   tệp bộ não — không dựng được nửa cặp qua đường đó mà không đụng bộ não). Lưới `kho.js` chỉ được canh bằng ca gọi thẳng.
3. `:663` một mình về `slice` ⇒ không ca nào đỏ (nhánh bộ đếm lớp 0 đồng NÉM không dựng được từ ca); lưới phủ.
4. E1 không đo mã repo — nó là tham chiếu (`util.parseEnv` ≡ `node --env-file` của cùng bản Node; hai đường dùng chung bộ đọc dotenv
   của Node). Hợp đồng B được canh bởi E2a–i/E3.

## Lệch phiếu / giả định (ghi tại chỗ quyết)

1. **Thêm `:663`** (`dem0Dong = catChu(\`loi:…\`, 120)`) — ngoài danh sách ① A nhưng cùng khuôn (chữ lỗi → `so_ai.du_lieu` jsonb). Đổi để lời
   khai đầu tệp («mọi chữ cắt ghi vào `so_ai.du_lieu` đi `catChu`») đúng; ⑤c đếm 7 chỗ. **`:1033` giữ `slice`**: vào `so_ai.ly_do` — cột
   TEXT; pg tự thay nửa cặp bằng U+FFFD, không vỡ (lời khai này có phép đo: L4a ghi `lyDo:"cột text \ud83d"` ⇒ đọc lại `"cột text �"`).
2. **Thêm hàm `boNuaCapLe`** (export) ở `src/text.js` — một regex xoá nửa cặp duy nhất; `cleanText` gọi lại nó (hành vi giữ nguyên: C3 +
   `npm test` 0 đỏ). `catChu(s, n)` = `boNuaCapLe(s.slice(0, n))` ⇒ nửa đầu lơ lửng ở cuối bị xoá = «cắt lùi một đơn vị» của ②1; chuỗi có
   sẵn nửa cặp lẻ ở giữa cũng bị xoá (cùng luật `cleanText`). Không dùng `toWellFormed` (②1).
3. **Lưới `hang-cho.js` chỉ ở cửa VÀO** (`vaoHangCho`, :708-720 theo ②2). Sau cửa vào còn 6 lượt `JSON.stringify` trần trong 4 câu —
   `duyet()` :869-870 · :970-971, `ghiSuKienTaoDon` :1080 (INSERT `so_ai` THẲNG, không qua `ghiSoAi`), `loai()` :1128 — KHÔNG lưới: `cua_kiem` tính lại đi qua cùng `:479` đã vá; còn `boSung` của sale + `e.message` ⇒ nợ đề nghị
   N-GL8-LUOI-DUYET (không mở rộng phạm vi đường tiền khi phiếu không ghi).
4. **④3 «model gọi ĐÚNG 1 lần»** đo bằng: sau vòng 1, vòng worker thứ 2 rút `null` + bộ đếm model = 1 + tin `xong` (không chờ hết
   `thu_lai_luc` để đếm 3 lượt trên base — base đã lộ ở `tin=cho`).
5. **Ca thêm ngoài ④**: W3d/W3e (`:717`/`:647` có trong ① A), W5 (vế chốt đơn của ②3) — đi worker thật, không gọi thẳng `vaoHangCho`.
6. **`gia-lap-mot-minh` in dòng cờ NGAY sau khi trộn `.env`**, trước cả lượt từ chối `V3_DIEN_TAP` — người vận hành thấy cờ cả khi bị từ chối.
   Ba công cụ (`dien-tap-hoi-thoai` · `do-lop-0-dong` · `gia-lap-dong-thoi-gian`) chỉ giữ `env` cục bộ, không chép vào `process.env` — giữ
   nguyên (không đổi hành vi khác ngoài cách đọc); `util.parseEnv` cũng nhận khoá chữ thường/`export K=` mà bộ cũ bỏ qua (dev `.env` không có
   dòng nào như vậy — đo: 0 dòng ngoài mẫu `^[A-Z0-9_]+=`).
7. **Node**: máy dev v24.19.0; prod v20.20.2 (phiếu). `util.parseEnv` có từ 20.12 — KHÔNG chạy được ca trên 20.20.2 tại máy này. Giả định
   ghi rõ: trong cùng một bản Node, `util.parseEnv` và `--env-file` dùng chung bộ đọc, nên E1 đúng ở mọi bản có cả hai.
8. Không cập nhật design-pack: ③ không có tệp tài liệu nào ngoài nhật ký; hành vi đổi chỉ ở sổ ghi (không chạm khách).

## Nợ đề nghị §9 (tổng ghi — thợ không sửa sổ)

- **N-GL8-DOC-ENV-TUYET-DOI** (phiếu ⑥ đã đặt tên, MỞ RỘNG): repo còn **3** bộ đọc `.env` tay cùng giữ chú thích đuôi — `src/queue/nap.js:44-56`
  `docEnvTuyetDoi` (lớp chặn cuối `PANCAKE_READONLY` ở `handler-v3.js:65`/cổng HTTP ghi, `V3_LAN_CHOT_MODEL`, `V3_NAP_*`), `db/ket-noi.js:17-30`
  `docEnv` (`DATABASE_URL_V3`), `src/pos/moi-truong.js:17-30` `docBien` (`V3_KHOA_MA_HOA`). `PANCAKE_READONLY=1   # …` trên một máy mà
  `process.env` vắng biến ⇒ đọc thành `"1   # …"` ⇒ van coi là MỞ (fail-OPEN). Hôm nay `.env` dev không có chú thích đuôi ở ba khoá đó (đo trên).
- **N-GL8-LUOI-DUYET**: `hang-cho.js` sau cửa vào ghi jsonb bằng `JSON.stringify` trần — `duyet()` :869-870 · :970-971, `ghiSuKienTaoDon`
  :1080 (INSERT `so_ai` thẳng, vòng qua lưới `ghiSoAi`), `loai()` :1128. `boSung` của sale/`e.message` mang nửa cặp ⇒ duyệt/loại hỏng. Dùng `jsonLanh`.
- **N-GL8-RECONCILE-HO-SO**: `src/queue/reconcile.js:31` ghi `ho_so=JSON.stringify(extractFromText(tin.noi_dung,…))` — cùng chữ khách bị
  `context.js` cắt (`:167-168` · `:174` · `:232-236`) mà KHÔNG qua lưới `kho.js` ⇒ đường đối chiếu tin lỗi có thể vỡ y hệt bệnh GL8.
- **N-GL8-NHAT-KY-JSONB**: `src/db/nhat-ky.js:42-43` stringify `truoc`/`sau` trần — người gọi hôm nay chỉ ghi tên cột/mã, nhưng không lưới.
- **N-GL8-LAN-GUI-JSONB** (thấp): `src/queue/lan-gui.js:91` ghi `noi_dung=JSON.stringify(args[2])` TRƯỚC khi gửi — chữ gửi khách đủ (không cắt)
  nên không dính GL8; chỉ vỡ nếu chính model trả nửa cặp lẻ ⇒ tin thử lại + gọi lại model.
- Giữ nguyên hai nợ phiếu ⑥ đã nêu: đổi luật «lỗi sổ sau gửi ⇒ giao sale» (`worker.js` catch — `doi-y-do`) · đo lại các lượt giả lập cũ
  (Minty 28/09 · BH7 · BH8) với bộ đọc env đúng (6 khoá lệch trên dev, gồm `FASTLANE_TEMPLATES` · `FASTLANE_INTRO` · `HUMAN_TAKEOVER`).

## Môi trường đo (luật 7 viet-thuoc)

Mọi số trên: **máy dev**, worktree `…/.claude/worktrees/agent-acada247d1dc24218` (ca in `tệp đo …/agent-acada247d1dc24218/src/chat/handler-v3.js`),
hộp cát `aicloser_v3_test_gl8w_p<pid>` / `aicloser_v3_test_gl8l_p<pid>` trên Postgres `127.0.0.1:5432` (tự dựng tự dọn) — KHÔNG đo `aicloser_v3`,
KHÔNG đo prod. `.env` worktree chép từ `.env` dev (gitignore), `PANCAKE_READONLY=1` (⓪). `node_modules` là symlink sang cây chính (chỉ gói
ngoài; không có liên kết ngược vào mã repo — đo `find -maxdepth 2 -type l`: chỉ `.bin/*`).

## Sau đối kháng chặng 2 (ĐẠT — tổng giao thêm F1 · F4 · đổi tên ca) — commit `6874875`

- **F1 — ca W6** (`test/gl8-luot-emoji.test.mjs`): hồ sơ cắt ở BỘ NÃO đi worker thật — `chayCloser` tiêm đẩy `tool_use create_draft_order` +
  `tool_result {ok, order}` với `name`/`city`/`variant` = 39 đơn vị + emoji ⇒ `absorbToolUses` (`context.js:232-236`, KHÔNG sửa) cắt `slice(0, 40)`
  để lại nửa đầu ở cả ba trường ⇒ chạm CẢ BA cửa jsonb (`so_ai(order).du_lieu.ho_so` · `du_lieu_don` · `hoi_thoai.ho_so`). Helper `chay` nay
  chạy tới `vongToiDa` vòng, đặt lại `thu_lai_luc` giữa các vòng (W6 dùng 4) — bản lỗi lộ đủ số lượt gọi model.
  - **Base** (bản sao tạm, 5 tệp `src` lấy từ `5c0e3aa`): `kqs ["thu_lai","thu_lai","loi"] · tin loi · HANDOFF/SALE/loi_xu_ly_can_doi_chieu ·
    so [] · hc 0 · model 3 · post 0` ⇒ W6 ĐỎ — khớp mô tả của người đối kháng (RF-D).
  - **Bản vá**: `kqs ["xong:tra_loi"] · so ["order/AI","reply/AI"] · hc 1 · model 1 · post 1`; `ho_so` = `["M"×39, "D"×39, "V"×39]` lành.
  - Đảo-vá mới — gỡ TỪNG lưới riêng lẻ: ⑥j chỉ bỏ lưới `so-ai.js` ⇒ W6 đỏ · ⑥k chỉ bỏ lưới `kho.js` ⇒ W6 đỏ · ⑥l chỉ bỏ lưới hàng chờ ⇒ W6 đỏ
    ⇒ đóng mục «đột biến KHÔNG đỏ» số 2 ở trên (lưới `kho.js` trước đây chỉ canh bằng ca gọi thẳng L4b; nay có ca worker canh).
- **F4** — sửa LỜI `src/text.js` (khối trên `boNuaCapLe`): «xoá» là cách của ĐƯỜNG BOT, không phải của cả repo; ghi rõ hai công cụ dữ liệu cố ý
  thay bằng U+FFFD — `db/di-tru/nguon.js:38` (regex; thay ở :44, có đếm) · `ops/bin/dong-bo-kich-ban.mjs:30`. Hai tệp đó không đổi. Nhãn ⑤f của
  cổng đổi theo («một regex xoá nửa cặp cho đường bot»).
- **Đổi tên ca** (tên khách thật) → «Annabelle» (cùng 9 chữ ⇒ mọi phép cắt theo n giữ nguyên) ở 3 tệp ca; repo công khai. Phiếu GL8 (tệp của tổng)
  vẫn trích câu thật có tên đó — thợ không sửa phiếu.
- **Số đo sau đối kháng** (máy dev, hộp cát, HEAD `6874875`): cổng `gl8.sh` **ĐỎ 0 / XANH 32** (② pass=8 gồm W6 · 21 đảo-vá đỏ đúng · ⑥0
  pass=26) · `npm test` **2827 ca · 2805 pass · 0 fail · 22 skipped** (rc=0; +1 so với 2826 = W6) · `_chan1.sh gl8` chạy sau commit nhật ký này
  (kết quả báo tổng trong câu trả lời).
