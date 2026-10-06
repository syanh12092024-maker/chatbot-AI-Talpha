# Nhật ký phiếu GSP3c — đóng hai lỗ làm bộ đếm «page chưa chuyển xong» về 0 sớm (điều kiện trước GSP4)

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-a6ba25dce9dff4d2f`, nhánh `worktree-agent-a6ba25dce9dff4d2f`) · base phiếu
`e68a62e` (nhánh dựng từ `64a13a9`) · làn 🟥 · skill: `tho-thi-cong` + `viet-thuoc`, xong chạy `/code-review high`.
Môi trường mọi số đo dưới đây: **máy dev**, Postgres hộp cát `aicloser_v3_test_gsp3c_p<pid>` (dẫn từ `DATABASE_URL_V3` của `.env` =
`127.0.0.1:5432` — sổ ghi 5433, lệch, không ảnh hưởng), cây = worktree trên. Không đo prod, không gửi tin, `PANCAKE_READONLY=1` giữ nguyên.

## Dựng worktree (ghi lại vì lệch đề bài)
- HEAD lúc nhận là `0c6c1ed` (commit 16/09) — KHÔNG chứa `64a13a9`/`e68a62e`. Cây sạch ⇒ `git reset --hard 64a13a9` trên nhánh worktree.
- `node_modules` = symlink sang repo chính · `.env` chép từ repo chính (không commit, không in). Không phải chép thêm tệp gitignore nào
  khác: 22 ca `npm test` BỎ QUA (không đỏ) vì thiếu `pages.json`/`conv-state.json`/`ai-enabled.json` (D1–D11, Y4-1..5, D-Y9a–c) +
  DV2 «cần CSDL sandbox» + 2 ca fixture env — giống hệt trước/sau.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GSP3-DOI-MON\|N-GSP3B-NEN\|F4\|F6 mở rộng\|N-GSP3C"
1145:    **F6 mở rộng N-GSP3-DOI-MON:** thêm một món ĐÃ CÓ GIÁ vào gốc sau đối soát ⇒ cửa tiền MỞ ở giá món đó (K8) — không phải «vẫn ĐÓNG».
1146:  - **N-GSP3B-NEN** (đối kháng GSP3b, …): F3 câu chỉ đường …
1148:    F4 «Kéo danh mục» (`dongBoTuPos`) ghi hết hàng vào bản sao của page ĐÃ GẮN không qua chốt rồi đẩy món chưa giá sang bot …
1166:  - **N-GSP3-DOI-MON** (/code-review R4) dấu đối soát hiệu lực theo CHỮ gốc × shop ⇒ gỡ món x khỏi gốc G rồi gắn món y …
```
Không có `N-GSP3C*` cũ; G1/G2/G3 của review (a) chưa vào §9 ⇒ ghi ở mục Nợ dưới. Quan hệ: **trả nợ** N-GSP3-DOI-MON (+F6) + N-GSP3B-NEN F4.

## Bước 3 — đo lại nguyên liệu đề bài (bẫy #4)
1. **Chuỗi rỗng `page.san_pham_goc_ma = ''` (④5b · N4) KHÔNG dựng được trên lược đồ thật**: CHECK 014 `ma_goc <> ''` + FK 015
   `(team_id, san_pham_goc_ma) → san_pham_goc` ⇒ không có gốc `''` để FK trỏ tới. Luật `COALESCE(…,'') = ''` vẫn theo đúng `catalog.js`
   (phòng thủ, phiếu đòi); ca P5b gỡ FK 015 TRONG hộp cát để dựng cảnh, rồi dựng lại.
2. **`demDauCu` theo đúng định nghĩa phiếu (`san_pham.sua_luc` của món > `doi_soat_luc`) là CẬN TRÊN, không phải số đúng.** Đo bằng
   đọc mã: `sua_luc` của món POS còn nhảy khi (a) lượt kéo đổi tồn kho/tên/SKU — `doc-danh-muc.js` `suaTheoIdPos … sua_luc: new Date()`
   (đồng hồ MÁY, không phải CSDL); (b) sửa giá món — `src/admin-v3/operations.js:264` `gia_tay=true,sua_luc=now()`; (c) gắn lại món vốn
   thuộc gốc. Ba việc đó KHÔNG đổi tập món. Và nó KHÔNG thấy món đã gỡ hẳn (gỡ thuần không mở giá mới). Tôi theo đúng chữ phiếu (chiều
   lỗi an toàn tiền: thừa, không thiếu cho đường tiền) và khai trong JSDoc; `ds` trả từng dòng kèm `monDoi` để người soát trước khi bỏ dấu.
   Đề xuất cho tổng: đối chiếu `ds` với nhật ký `gan_mon_pos_goc`/`go_mon_pos_goc` + `tao_luc` món trước khi xin gật bỏ dấu.
3. **Thước cũ va luật mới**: ca `test/gsp3-doi-soat.test.mjs` ④9c F1 dựng «dấu chep còn lúc bỏ gốc» bằng CHÍNH cửa `goMonPosKhoiGoc` —
   GSP3c bắt cửa đó bỏ dấu ⇒ đột biến `bo_don_dau_bo_goc` của `gsp3.sh` hết ca đỏ (đo: mục «Nới ③»). Báo tổng TRƯỚC khi sửa.

## Nới ③ (tổng duyệt 07/10 qua tin nhắn)
- Lý do: như Bước 3.3. Đo TRƯỚC (cây GSP3c chưa vá ca, `gsp3.sh` đầy đủ, 720 s): `== ĐỎ 1 / XANH 42` — dòng đỏ duy nhất
  `🔴 ④đảo-vá-bo_don_dau_bo_goc ⇒ «④9c F1 ·» đỏ fail=0`; ⑥ gsp1/gsp2/ve8b/ll15d rc=0, va-r2/l3-m4 rc=1 ĐỎ SẴN y hệt base `b0b82d7`.
- Vá (đúng một dòng ca): `await goMonPosKhoiGoc(pool, T, E0.id, '111:e1');` → `await q("UPDATE san_pham SET ma_goc=NULL WHERE team_id=$1
  AND ma='111:e1'", [T]);` + chú thích (cửa gỡ từ GSP3c tự bỏ dấu; ca này canh lớp dọn của `boSanPhamGoc`). Khẳng định giữ nguyên.
- Đo SAU: ca GSP3 28/0; đột biến `bo_don_dau_bo_goc` trên bản sao tạm ⇒ `✖ ④9c F1` (pass 26 fail 2 — ca + ca cha); `gsp3.sh` đầy đủ: xem ⑥.
- Phép ③ của `gsp3.sh` so trong khoảng commit cũ `b0b82d7..0f2c4bf` ⇒ không đổi (xanh, mục ⑥). Cổng `gsp3c.sh` thêm phép ③c: tệp
  đó chỉ được mất đúng một dòng — lời gọi gỡ e1 của ④9c F1.

## Thay đổi (commit mã `bf71c6e` + cổng `2940c00`) — mỗi chỗ một lý do
- `src/products/san-pham-goc.js`
  - `boDauDoiSoatGocShop(db, teamId, maGoc, shop)` — MỘT hàm dùng chung (② Ra 3): NULL bốn cột dấu của bản sao `nguon<>'pos'`,
    `doi_soat IN ('chep','giu_gia_mon')`, `doi_soat_goc`=gốc, `doi_soat_shop`=shop, **kẹp `team_id`** (N3); `bo_qua` không đụng; không chạm
    `sua_luc` bản sao; lưới 032 ⇒ 0 không ném; chú thích N5 «sửa giá KHÔNG bỏ dấu» + lý do. Trả số bản sao bị bỏ dấu.
  - `ganMonPosVaoGoc`: gọi trong giao dịch sẵn có, CHỈ khi món thật sự vào gốc (`daCo` ⇒ 0 — N3); trả thêm `boDauDoiSoat`.
  - `goMonPosKhoiGoc`: bọc GIAO DỊCH (trước là một `pool.query`) — gỡ + bỏ dấu theo mã gốc CŨ (`RETURNING g.ma_goc` — N3).
  - `demDauCu(db)` — quét lùi CHỈ ĐỌC toàn hệ (② Ra 6 · N1), trả `{ co032, so, ds[] }`; lệnh chạy prod ghi trong JSDoc (đã thử trên
    hộp cát tạm: in `so: 1` + dòng `ds` đúng).
  - `coCotDoiSoat` (riêng tư) — câu dò 032 cho hai hàm mới (cùng khuôn `chuyen-ban-sao.js#coCot032`, hàm đó không export).
- `src/pos/doc-danh-muc.js` (C1): món MỚI mang gốc hoặc `ma_goc` NULL → gốc ⇒ ghi gốc vào `gocDoiMon`; **cuối lượt** gọi hàm bỏ dấu
  cho từng gốc × shop của lượt, trong giao dịch khoá danh mục (lý do «cuối lượt»: mục Mâu thuẫn 1).
- `src/products/noi-pos.js` (Ra 2 · N4): câu chọn `LEFT JOIN page … AND COALESCE(pg.san_pham_goc_ma,'') = ''` (dòng không page / page
  team khác giữ như cũ: đổi `het_hang`, không đẩy) + **cửa ra**: trong giao dịch từng page đọc lại page `FOR SHARE` (thứ tự khoá page →
  san_pham như GSP3b), page vừa được gắn sau câu chọn ⇒ ROLLBACK, không ghi, không đẩy, `kq.pageDaGanBoQua += 1`.
- `v3/src/ui/san-pham/kho-goc.js` (N2): nhật ký gắn/gỡ món: `sau.boDauDoiSoat` + câu « · bỏ dấu đối soát N bản sao (gốc × shop S) —
  page của chúng về «chờ đối soát»» (chỉ khi N > 0 — câu cũ giữ nguyên khi không bỏ dấu).
- `test/gsp3-doi-soat.test.mjs` — nới ③, một dòng (mục trên).
- `test/gsp3c-doi-mon.test.mjs` (14 ca) · `ops/bin/nghiem-thu/gsp3c.sh`.
- KHÔNG đụng: `chuyen-ban-sao.js` (`daQuyet` nguyên — cổng ③b đo), năm tệp bộ não, màn `san-pham.html`, `keo-danh-muc.js`.

### Mâu thuẫn / đánh đổi đã chọn (luật 13)
1. **Bỏ dấu ở CUỐI lượt kéo, không «ở nhánh».** ③ ghi «doc-danh-muc.js: CHỈ gọi hàm bỏ dấu ở nhánh món đổi `ma_goc`». Bản đầu gọi ngay
   tại nhánh; `/code-review` #2 chỉ ra và ca P1c ĐO được: lượt kéo khoá dòng món suốt lượt, gắn/gỡ khoá dòng món rồi mới ghi bản sao ⇒
   bỏ dấu giữa lượt = khoá bản sao trước một món chưa tới ⇒ **40P01, Postgres huỷ TRỌN lượt kéo** (đo: «lượt kéo: 40P01 · lượt gắn: thành»).
   Chọn: ở nhánh chỉ GHI NHỚ gốc, gọi hàm cuối lượt (cùng giao dịch). Giá: lệch chữ ③ một chút (vẫn chỉ «gọi hàm bỏ dấu cho món đổi
   `ma_goc`»), thêm một `Set`. Được thêm: một câu mỗi gốc thay vì mỗi biến thể (/code-review #6).
2. **`demDauCu` theo chữ phiếu (cận trên)** — Bước 3.2.
3. **`dongBoTuPos` hai lớp + trường mới `pageDaGanBoQua`.** Phiếu chỉ đòi lọc; lọc ở câu chọn thôi thì page được gắn GIỮA câu chọn và
   giao dịch (lượt đẩy từng page qua mạng — vài giây; H-GSP đang gắn page hàng loạt) vẫn bị ghi + đẩy món POS chưa giá — đúng F4 trong khe
   đua (bẫy 31: phanh ở cửa ra). Trường đếm để «nói ra» và để thước đo được từng lớp riêng.
4. **Không thêm số «bỏ dấu» vào kết quả `docDanhMuc`/màn Kết nối** — ③ «CHỈ gọi», và `keo-danh-muc.js` (cộng dồn cho màn) ngoài ③ ⇒ nợ.
5. **Không gộp bốn bản câu dò 032** (`boSanPhamGoc` · `ganPageVaoGoc` · `chuyen-ban-sao.js` · bản mới) — ③ «CHỈ» bốn hàm ⇒ nợ.

## Danh sách ca (viết trước, rồi mới viết ca chi tiết)
- CHO-QUA: D0 E/E2/F «xong» nhờ dấu, B `bo_qua` · P2b gắn lại món vốn thuộc gốc ⇒ dấu giữ · P1b lượt kéo chỉ đổi tồn kho ⇒ dấu giữ ·
  P3 đổi món shop khác ⇒ dấu shop này giữ · P4 `bo_qua` giữ · P5 page chưa gắn vẫn đổi + đẩy, dòng không page vẫn đổi.
- CHẶN/HÀNH VI (đọc CSDL + `dsViecChuyen` thật — bộ đếm GSP4): P1 gỡ (cửa thật kho-goc, vai + nhật ký) ⇒ NULL 4 cột · cho_doi_soat ·
  chuaXong +2 (đúng số page) · gắn y sau đó không «sống lại» · P2 thêm món ĐÃ CÓ GIÁ · P1b kéo bù `ma_goc` + món mới mang SKU gốc ·
  P5 page đã gắn không đổi, không đẩy.
- BIÊN: P2b team khác cùng mã gốc + cùng shop · P5b chuỗi rỗng · P5c page được gắn đúng khe giữa câu chọn và giao dịch (xen kẽ tất định) ·
  P1c kéo song song gắn (xen kẽ tất định, đo 40P01) · P5d mốc thời gian hai phía (ép đồng hồ CSDL: dấu −2h, món −3h / −1h), giu_gia_mon,
  team khác, shop khác, «không ghi một byte» (băm san_pham trước = sau mỗi lượt) · P6 CSDL chưa áp 032.
- Hai múi giờ: cổng chạy bộ ca dưới `TZ`+`PGOPTIONS -c TimeZone=` = UTC và Pacific/Kiritimati (+14), đọc lại múi giờ phiên ca in ra.
- Nhánh KHÔNG chạm: nối dây `v3/chay-that.js` (cần cả hệ) · màn (không đổi) · vế `doi_soat IN (…)` của câu bỏ dấu (không đường thật nào
  ghi `bo_qua` có goc/shop — `boQuaPage` đặt NULL ⇒ đột biến bỏ vế đó KHÔNG đỏ — khai ở Đảo-vá) · «cùng giao dịch» của gắn/gỡ (không
  có ca bơm lỗi giữa hai câu).

## Nghiệm thu — số đo (máy dev, hộp cát)
### Trên BASE (bộ ca mới, 4 tệp mã lấy từ `64a13a9`, bản sao tạm): `pass 2 · fail 12`
D0 · P4 xanh (dựng + không hồi quy); đỏ đúng lý do: P1/P2/P3/P1b «dấu vẫn `chep`/gold/111», P5 «bản sao của page đã gắn bị ghi
(true)», P5c «true ≠ false», P5d «thiếu demDauCu», P2b/P5b/P6 thiếu trường mới, P1c dấu không về NULL.

### Bộ ca trên cây GSP3c
```
$ node --env-file-if-exists=.env --import ./test/_an-toan.mjs --experimental-test-module-mocks --test test/gsp3c-doi-mon.test.mjs
  ✔ D0 · ✔ P1 · ✔ P2 · ✔ P2b · ✔ P3 · ✔ P4 · ✔ P1b · ✔ P1c · ✔ P5 · ✔ P5b · ✔ P5c · ✔ P5d · ✔ P6
ℹ tests 14 · ℹ pass 14 · ℹ fail 0
```
Hai múi giờ (trong cổng): `@UTC pass=14 fail=0 · TimeZone phiên CSDL=UTC` · `@Pacific/Kiritimati pass=14 fail=0 · TimeZone phiên CSDL=Pacific/Kiritimati`.

### Cổng `ops/bin/nghiem-thu/gsp3c.sh`
**Lượt cuối trên HEAD `2940c00` (①–⑤, `CHAY_CONG_CU=0`, 49 s): `== ĐỎ 0 / XANH 36 · rc=0`.**
```
✅ ①bộ-ca-gsp3c@UTC pass=14 fail=0 (sàn ≥14) · TimeZone phiên CSDL=UTC
✅ ①bộ-ca-gsp3c@Pacific/Kiritimati pass=14 fail=0 (sàn ≥14) · TimeZone phiên CSDL=Pacific/Kiritimati
✅ ②phép-④-có-ca-xanh 13/13
✅ ③phạm-vi-③-phiếu 2 commit mang mã GSP3c · tệp ngoài ③: 0
✅ ③c-nới-③-chỉ-ca-④9c-F1 dòng cũ bị sửa/xoá trong test/gsp3-doi-soat.test.mjs=1 (đòi ≤1, đúng lời gọi gỡ e1 của ④9c F1)
✅ ③b-không-đụng-chuyen-ban-sao-và-bộ-não số tệp cấm bị đụng=0 (đòi 0)
✅ ④0-lượt-chứng-bản-sao-tạm-xanh pass=14 fail=0
✅ ④đảo-vá-… 16/16 đỏ ĐÚNG tập đã khai (bảng dưới)
✅ ④z-khôi-phục-bản-sao-xanh-lại fail=0 · ✅ ④cây-làm-việc-không-dính-đột-biến
✅ ⑤ca-cũ ×11 (ll13 8 · mn8 5 · ve8a 6 · keo-danh-muc 4 · l1-m1 12 · gsp2 10 · gsp3 28 · gsp3b 13 · ll13-màn 7 · gsp1 5 · ll15d 5) fail=0
```
**Hai lượt ĐẦY ĐỦ (kèm ⑥ cổng cũ, trên `bf71c6e` — mã giống HEAD, chỉ khác cổng):** mỗi lượt `ĐỎ 1 / XANH 40`, và dòng đỏ là MỘT dòng
con lồng sâu, KHÁC nhau mỗi lượt, chạy riêng đều xanh (máy đang có thợ GL2 chạy cổng ở cây chung — tranh CPU/Postgres):

| ⑥ cổng cũ | lượt 1 (2439 s) | lượt 2 (5976 s) | chạy riêng |
|---|---|---|---|
| gsp2 | rc=0 | rc=0 | — |
| gsp3 | rc=0 | rc=0 | — (trước nới ③: ĐỎ 1 dòng bo_don_dau_bo_goc — mục Nới ③) |
| gsp3b | rc=0 | 🔴 «② 41/42 · thiếu H8» (lượt này tôi giết tay ca `ve8b-man` treo 24′ 0% CPU trong chuỗi con) | 4 tệp ca 45/0 có H8 · `gsp3b.sh` riêng: `ĐỎ 1 / XANH 54` — đỏ ⑥ve8b «ll18-khung fail=1» (ll18-khung riêng 16/0 · `ve8b.sh` riêng `ĐỎ 0 / XANH 16 rc=0`) |
| ve8a | 🔴 «③thước ve2b-page-gop fail=1 · ④cổng-trước ve7b» | rc=0 | `ve8a.sh` riêng `ĐỎ 0 / XANH 18 rc=0` · ve2b-page-gop riêng 17/0 |
| ll13 | rc=0 | rc=0 | — |

Các tệp ca đỏ chập chờn (ve2b-page-gop · ll18-khung · H8 · ve8b-man treo) KHÔNG import tệp nào GSP3c sửa (grep). Kết luận (máy dev):
không có dòng đỏ nào do GSP3c; chuỗi cổng cũ dài chập chờn như đã biết (N-VAI-B-NOI-DAY-CHAP-CHON). Lượt 2 còn để lại MỒ CÔI (gsp3 →
ll15b treo 51′ dưới PID 1, cwd worktree đối chứng tạm `gsp3b-base.zcD949`) ⇒ tôi đã giết 10 tiến trình + gỡ worktree đó (chỉ của chuỗi
tôi — xác minh qua symlink `.env` trỏ về `gsp3c-base.*`); hai worktree `gsp3-base.*` khác (của repo chính / wt-chan1-tt1) để nguyên.
Vá khuôn: `gsp3c.sh` thêm `giet_cay` (commit `2940c00`; thử riêng: chỉ kill nhóm còn 2 tiến trình, giet_cay còn 0) · nợ N-GSP3C-CONG-MO-COI.

### `npm test` (worktree)
- TRƯỚC (cây `64a13a9`, chưa sửa): `tests 2489 · pass 2467 · fail 0 · skipped 22` (25 s).
- SAU (cây GSP3c, sau vòng /code-review): `tests 2503 · pass 2481 · fail 0 · skipped 22` (31 s) — +14 ca GSP3c, 0 đỏ mới.

### Đảo-vá — «đột biến nào KHÔNG đỏ?»
- 16 đột biến trong cổng, mỗi cái MỘT tiến trình node mới trên bản sao tạm, đỏ ĐÚNG tập đã khai (bảng trong cổng). Năm đột biến ④7
  phiếu: `go_bo_don` ⇒ P1·P2b·P3 · `gan_bo_don` ⇒ P2·P3 · `keo_bo_don` ⇒ P1b · `bo_kep_team` ⇒ P1·P2b (P1 đỏ thêm: đếm 3 thay vì 2) ·
  `dong_bo_bo_loc_da_gan` (bỏ CẢ hai lớp) ⇒ P5·P5c.
- Vòng /code-review (bẫy 26 — đo bản SAU vá): `keo_bo_dau_giua_luot` (bỏ dấu tại nhánh như bản đầu) ⇒ P1c đỏ VÌ 40P01.
- **KHÔNG đỏ (đã biết, chấp nhận):** (a) bỏ vế `doi_soat IN ('chep','giu_gia_mon')` — `bo_qua` thật luôn goc/shop NULL; (b) gọi hàm bỏ dấu
  bằng `pool` thay vì `khach` (ra ngoài giao dịch) — không ca bơm lỗi giữa hai câu; (c) `keo_bo_don` không làm P1c đỏ — lượt gắn trong P1c
  tự bỏ dấu (P1c đo khoá chết, không đo bỏ dấu của kéo — việc đó P1b đo).

## /code-review (high) — 9 phát hiện, kiểm chứng từng cái trước khi sửa
| # | Phát hiện | Kiểm chứng | Xử lý |
|---|---|---|---|
| 1 | page đã gắn mất lượt đẩy hết hàng tự động sau kéo | đúng — chính là review (a) G2; phiếu ② Ra 2 cố ý | nợ N-GSP3C-DAY-HET-HANG |
| 2 | khoá chết kéo ↔ gắn/gỡ (thứ tự khoá ngược) | DỰNG LẠI được: ca P1c xen kẽ tất định ⇒ «lượt kéo: 40P01» | SỬA — bỏ dấu cuối lượt; P1c + đột biến |
| 3 | `demDauCu` không có cửa chạy | đúng (phiếu chỉ đòi hàm) | SỬA nhẹ — lệnh một dòng trong JSDoc, đã thử trên hộp cát |
| 4 | lượt kéo gắn lại món người vừa gỡ (gỡ không bền) | đúng — có từ VE8/CR-15/09, review (a) đã nêu | nợ N-GSP3C-GO-KHONG-BEN |
| 5 | số bỏ dấu ở cửa kéo không nói ra | đúng | nợ N-GSP3C-NOI-RA (cùng màn Sản phẩm) |
| 6 | dò information_schema mỗi biến thể | đúng ở bản đầu | SỬA — hết theo #2 (một câu mỗi gốc mỗi lượt) |
| 7 | bốn bản câu dò 032 | đúng | nợ N-GSP3C-COT032 (③ CHỈ) |
| 8 | vá rải ba cửa, không gốc rễ (trigger / vân tay tập món) | đúng là thiết kế phiếu chọn (review (a) C1 đề 3 hướng) | nợ N-GSP3C-VAN-TAY |
| 9 | `const daGanGoc` chen giữa JSDoc và hàm | đúng | SỬA |

## Nợ ghi §9 (APPEND — đoạn «07/10 · GSP3c (thợ)»)
N-GSP3C-DAY-HET-HANG · N-GSP3C-GO-KHONG-BEN · N-GSP3C-NOI-RA · N-GSP3C-COT032 · N-GSP3C-VAN-TAY · N-GSP3C-DUA-DOI-SOAT ·
N-GSP3C-CHUYEN-TEAM (review (a) G1) · N-GSP3C-GIA-POS-DE (review (a) G3) · N-GSP3C-CONG-MO-COI (khuôn `chay_con` gsp3/gsp3b) —
chi tiết ở §9.

## Commit (theo thứ tự) · chặng 1
- `bf71c6e` fix(san-pham): GSP3c — mã + bộ ca + cổng + nới ③ một dòng ca GSP3.
- `2940c00` fix(nghiem-thu): GSP3c — cổng giết trọn cây cổng con khi quá trần.
- commit nhật ký này + §9 (9 nợ) + §10 (3 dòng).
- `_chan1.sh gsp3c` CHƯA chạy: ④ của nó đọc khối ③ trong tệp phiếu — `test/gsp3-doi-soat.test.mjs` (nới ③ qua tin nhắn tổng) chưa có
  trong phiếu ⇒ sẽ đỏ đúng chỗ đó cho tới khi tổng ghi nới ③ vào phiếu; ⑦ của nó chạy lại cổng đầy đủ (~40–100′ trên máy đang tải).

## Lệnh tổng chạy trước GSP4 (② Ra 6 — CHỈ ĐỌC, máy chủ, gốc repo)
```
node -e "import('./db/ket-noi.js').then(async ({ voiPool }) => { const { demDauCu } = await import('./src/products/san-pham-goc.js'); console.log(JSON.stringify(await voiPool((p) => demDauCu(p)), null, 1)); })"
```
Khác 0 ⇒ soát từng dòng `ds` (cận trên — Bước 3.2) rồi xin gật người quyết bỏ dấu đúng các dòng đó (một câu, có nhật ký).
