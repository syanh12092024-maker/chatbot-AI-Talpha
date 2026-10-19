# PHIẾU GL10 — Gạt bot v3 tự bảo ai_sale nhường page (ghi khoá `_v3` vào tệp của pancake-tool) · chỉ trả lời tin khách đến SAU mốc bật

**Base:** `a6f670d` · **Làn:** 🟥 (cổng bật page = chỗ DUY NHẤT chạm khách thật; ghi tệp cấu hình của team khác đang phục vụ ~268 page; bộ nạp + hàng đợi tin)
**Soát (a):** chưa.
**Nguồn:** người quyết 15/10 (sổ §10 dòng 15/10: «Nút v3 tự ghi khoá ai_sale» — bật page ⇒ ghi `_v3` vào `pancake-tool/state/chung/page_gan_them.json`, chờ ai_sale nhường rồi
mới trả lời; tắt ⇒ xoá khoá) + tổng 15/10 (bot v3 CHỈ trả lời tin khách đến SAU mốc bật) + nghiên cứu `scratchpad/gat-bot-san-sang.md` §3 §4 (đo 15/10, đo lại 19/10).
**Đụng bộ não:** không. Không sửa `src/chat/handler-v3.js` (BH9 song song đụng vùng đó) và tám tệp bộ não (`prompts.js` `closer.js` `tools.js` `fast-lane.js`
`outbound-guard.js` `context.js` `lead-score.js` `conv-owner.js`). Buộc phải sửa ⇒ DỪNG, báo tổng.
**Song song:** GL9 sửa `src/queue/nap.js:44-56` (`docEnvTuyetDoi`); GL10 sửa `napTuPoll` + `gomCumTinKhach` cùng tệp, KHÔNG đụng `docEnvTuyetDoi` ⇒ người gộp sau rebase.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

**A — hai bot cùng một page.** ai_sale (`/opt/pancake-tool/ai_sale.py theo_doi <tt> --that`, 9 unit `aisale-chat*`) đang trả lời CẢ 4 page pilot. Log 12→15/10 có số
lượt trả lời: 275 = 16 · 340 = 148 · 276 = 71 · 335 = 40. ai_sale không đọc tín hiệu nào của v3: grep `aicloser_v3|bot_ai_bat|psycopg|postgres` trên `*.py` ra 0 dòng. Nó
cũng «KHÔNG nhường sale, vẫn gửi». Gạt v3 hôm nay ⇒ khách nhận tin đúp. Lối duy nhất không sửa mã pancake-tool (đo 19/10, `ai_sale.py` sửa lần cuối 18/10 17:24 — số dòng
trôi, tra bằng grep):
- `_hop_page_shop(mkey, ids)` (:13557) = `(set(ids) - _page_gan_noi_khac(mkey)) | _page_gan_them(mkey)`.
- `_page_gan_noi_khac` (:13545-13552) = `{str(p) for k, o in d.items() if k != mkey and isinstance(o, dict) for p in o}`. ⇒ một khoá lạ `_v3` có giá trị **dict
  {page_id: chuỗi}** loại page khỏi MỌI thị trường.
- ⚠️ Vế `| _page_gan_them(mkey)` (:13530-13540) CỘNG LẠI page nằm ở `d[mkey]` hoặc ở `tram_landing` có `mkey` trong `nha`/`nuoc` ⇒ page đã gắn tay theo hai đường đó
  thì `_v3` KHÔNG làm ai_sale nhường. 4 page pilot hiện không nằm ở khoá nào (đo 19/10).
- ai_sale chỉ tra lại danh sách page mỗi **600 s** (`if time.time() - pages_luc > 600` :29059). Tệp hỏng hoặc vắng ⇒ `except: return set()` ⇒ KHÔNG bỏ page nào ⇒ ai_sale
  trả lời lại mọi page.

**B — bật là trả lời tin cũ.** Bộ nạp (`src/queue/nap.js` `napTuPoll`) không có cửa tuổi tin. Đo 15/10 bằng GET `/conversations`: gạt lúc đó thì có 3 / 8 / 4 / 12 hội thoại
(275/276/335/340), đa số 2–24 giờ tuổi, vào hàng NGAY. Tắt page không dọn tin `cho` (`src/admin-v3/operations.js:106-155` `setPage` chỉ `UPDATE page`) ⇒ bật lại là trả lời tin cũ.

**C — bẫy giờ Pancake (đo prod).** Pancake trả giờ UTC KHÔNG kèm múi:
- Hội thoại: `last_customer_interactive_at` dạng `2026-10-15T09:31:58`; `updated_at` dạng `2026-10-15T09:31:58.000000`.
- Tin: `inserted_at` cùng dạng `…:58.000000`. Đo lúc `09:45:07Z` ⇒ đúng là UTC.
- Máy prod `Europe/Berlin` (+0200; từ 25/10 là +0100). `Date.parse` hiểu chuỗi không múi là giờ ĐỊA PHƯƠNG ⇒ `history.js:1-5` `messageTime` ra `07:31:58Z`, **lệch −2 giờ**.
- So thẳng với `bot_bat_luc` (đồng hồ CSDL) thì mọi tin trong 2 giờ đầu sau khi bật bị coi là «trước mốc» ⇒ bot câm 2 giờ.

## ② Hợp đồng vào / ra

**1 · Tệp ai_sale — một mô-đun mới `src/queue/ai-sale-nhuong.js` là chỗ DUY NHẤT đọc/ghi tệp.**

Đường dẫn tệp:
- Lấy từ biến mới `V3_AI_SALE_TEP_GAN` (prod: `/opt/pancake-tool/state/chung/page_gan_them.json`). Đọc `process.env` (hai unit nạp `.env`).
- **Vắng ⇒ TỪ CHỐI bật mọi page.** `pageStatus` thêm điều kiện chặn «Chưa nối ai_sale (V3_AI_SALE_TEP_GAN vắng) — bật lúc này có thể hai bot cùng trả lời».
- Lý do: tập page của ai_sale là giao của năm nguồn (token page · shop POS · gói cước · gắn tay · trạm landing). v3 không tái lập được tập đó, nên không biết page nào «không
  thuộc ai_sale» để cho bật mà không cần khoá. Vắng mà vẫn cho bật = fail-OPEN.
- Máy dev và bộ ca trỏ biến vào tệp tạm. KHÔNG có giá trị đặc biệt kiểu «khong» để bỏ cửa này (luật 1 bảng biến).

Đọc:
- `fs.readFileSync` + `JSON.parse`. Gốc phải là object.
- Khoá `_v3` nếu có phải là object. Mọi giá trị trong `_v3` phải là chuỗi.
- Hỏng (parse lỗi · gốc không phải object · `_v3` sai kiểu) ⇒ `{ok:false, loi}`, KHÔNG BAO GIỜ coi là `{}`.
- Tệp vắng (`ENOENT`) ⇒ `{ok:false, vang:true}`: không tự tạo tệp của team khác; bật bị từ chối.
- Tệp có literal số nguyên ≥ 16 chữ số ⇒ TỪ CHỐI ghi. `JSON.parse` của JS làm tròn số > 2^53 nên ghi lại sẽ đổi dữ liệu người khác. Page id là KHOÁ chuỗi nên không dính.

Ghi khoá (`ghiKhoa(tep, pageId, ghiChu)`) và xoá khoá (`xoaKhoa(tep, pageId)`):
- Đọc–sửa–ghi. Chỉ đụng `d._v3[pageId]`; mọi khoá khác giữ nguyên NGỮ NGHĨA, thứ tự khoá giữ (page id > 2^32 là khoá chuỗi, JS giữ thứ tự chèn).
- Xoá mục cuối của `_v3` ⇒ xoá luôn khoá `_v3`.
- Giá trị: `"v3 pilot — <tên page> — bật <ISO UTC>"`.
- Ghi vào tệp tạm CÙNG thư mục `<tep>.v3-<pid>-<ngẫu nhiên>.tmp` (cờ `wx`) → `fsync` → `chmod` + `chown` về mode/uid/gid của tệp gốc (unit v3 có
  `UMask=0077`: không chỉnh thì tệp thành 600) → `rename` nguyên tử → `fsync` thư mục.
- Lỗi ở bất kỳ bước nào ⇒ xoá tệp tạm, tệp đích giữ nguyên TỪNG BYTE.
- Định dạng giống `tu_gan_page_ngoai.py` (`json.dump(…, ensure_ascii=False, indent=1)`): `JSON.stringify(d, null, 1)` UTF-8. Không bắt buộc giống từng byte.
- Ghi xong ĐỌC LẠI, kiểm `_v3[pageId]` đúng và các khoá khác bằng bản đã đọc (so sâu). Lệch ⇒ báo lỗi.

Khoá chéo:
- Mọi lượt ghi của v3 đứng dưới `pg_advisory_xact_lock(hashtextextended('v3:ai_sale_tep', 0))`.
- Người ghi khác là `tu_gan_page_ngoai.py` `_ghi_gan`/`_go_gan`: đọc lại rồi `os.replace`, KHÔNG khoá. ai_sale gọi nó mỗi ≤ 30′ ngay trước lượt tra lại. v3 không ngăn được
  mất-ghi; v3 PHÁT HIỆN được (② 2).
- Nếu khoá đã bị team khác gỡ, v3 tự dừng trả lời page. Thà v3 im còn hơn hai bot cùng trả lời (② 2).

Page đã gắn tay (pid nằm dưới một khoá thị trường hoặc dưới `tram_landing`):
- `pageStatus` chặn: «page đang được gắn tay cho ai_sale ở khoá <k> trong page_gan_them.json — khoá `_v3` không đủ để ai_sale nhường; nhờ chủ pancake-tool gỡ».
- Lý do: vế cộng lại của `_hop_page_shop` (① A).

**2 · Chờ ai_sale nhường — trạng thái trên dòng `page`, worker là người xét, chỉ ĐỌC tệp.**

Mốc chờ:
- Bật ⇒ `ai_sale_cho_den = now() + 12′` (hằng `CHO_AI_SALE_MS = 720 000`).
- Cách tính: 600 s chu kỳ tra lại (`ai_sale.py:29059`) + ≤ 60 s một vòng dò + ~60 s cho lượt ai_sale đang soạn dở (đợi Botcake 15 s + soạn ~8–30 s).
- Không có biến môi trường, để khỏi có người hạ thấp.

Mỗi vòng worker (`src/queue/chay-worker.js` `motLuotTrong`):
- Lấy `choPhep` của GL2 (bật ∩ trần), lọc thêm thành `sanSang` bằng `locNhuongAiSale(pool, choPhep)` ở mô-đun mới.
- Bộ nạp VÀ lượt rút (`pageIds`) dùng `sanSang`. Phép đếm trần GIỮ NGUYÊN: page đang chờ vẫn tính «bật».
- `src/queue/page-routing.js` KHÔNG sửa (`mb.sh:65` neo đúng 1 chuỗi `WHERE bot_ai_bat = true`).

Page vào `sanSang` khi và chỉ khi:
- (i) biến có;
- (ii) đọc tệp được và không hỏng;
- (iii) `_v3[pageId]` CÒN trong tệp — đọc lại khi mtime/kích thước đổi, đệm theo `(mtime, size)`;
- (iv) `now() >= ai_sale_cho_den`;
- (v) trạng thái không phải `chua_nhuong`.

Trạng thái (`ai_sale_trang_thai`) và ai chuyển:

| Điều kiện worker thấy | Trạng thái | Kèm theo |
|---|---|---|
| Thiếu (ii) | `loi_tep` | ai_sale đọc tệp hỏng là trả lời lại mọi page ⇒ v3 phải dừng |
| Thiếu (iii) | `mat_khoa` | — |
| Khoá có lại sau `mat_khoa` / `loi_tep` | `cho` | `ai_sale_cho_den = now() + 12′` — chờ lại TRỌN, vì giữa chừng ai_sale có thể đã trả lời lại |
| Đủ (i)–(v) | `da_nhuong` | ghi một lần + nhật ký `ai_sale_da_nhuong` |

Mỗi lần chuyển trạng thái ghi `ai_sale_ly_do` (câu đọc được) + một dòng nhật ký.

Tín hiệu đo được (tuỳ chọn) — log ai_sale, chỉ được KÉO DÀI chờ, không bao giờ rút ngắn:
- Biến mới `V3_AI_SALE_LOG` = tiền tố đường dẫn (prod: `/var/log/aisale-chat` ⇒ mọi `/var/log/aisale-chat*.log`; Node 20 không có `fs.glob` nên dùng `readdir` + lọc).
- Đo 15/10: dòng ai_sale chạm hội thoại mang page id dạng `<page>/<page>_<psid>` và dòng thẻ `🏷 …`. 340 có 222 dòng trong 30 MB cuối log UAE.
- Cửa sổ quan sát mở lúc `bot_bat_luc + 10′30″`. Worker ghi offset (RAM) của từng tệp log lúc vào cửa sổ, rồi mỗi vòng đọc phần mới (≤ 8 MB/tệp/vòng; tệp nhỏ đi ⇒ xoay vòng ⇒
  offset 0).
- Phần mới chứa chuỗi page id ⇒ `ai_sale_cho_den = max(cũ, now() + 2′)` + `ai_sale_ly_do` «ai_sale còn chạm page lúc HH:MM (giờ VN)».
- `now() − bot_bat_luc > 30′` mà vẫn thấy ⇒ `chua_nhuong`, NGỪNG gia hạn, v3 vẫn KHÔNG trả lời cho tới khi người tắt/bật lại.
- KHÔNG lưu, KHÔNG in dòng log (có tên khách) — chỉ đếm + mốc giờ.
- Vắng biến ⇒ chỉ chờ theo giờ, màn nói «chỉ chờ theo giờ — chưa nối log ai_sale».
- Restart worker ⇒ offset ghi lại từ đầu (chỉ làm chờ lâu hơn).

Màn Page & Bot:
- `v3/src/ui/page-bot/kho-page.js` mang `aiSale: {trangThai, choDen, lyDo, nhan}` theo khuôn `ngatKenh` (:373-382). `trang/page-bot.html` hiện nhãn:

| Trạng thái | Nhãn |
|---|---|
| `cho` | «Đang chờ bot cũ nhường — còn N phút» |
| `da_nhuong` | «Bot cũ đã nhường — bot v3 đang trả lời» |
| `mat_khoa` | (ĐỎ) «Khoá ai_sale mất — ai_sale đang trả lời lại; bot v3 im. Tắt rồi bật để ghi lại» |
| `loi_tep` | (ĐỎ) «Tệp ai_sale hỏng — bot v3 im» |
| `chua_nhuong` | (ĐỎ) «ai_sale chưa nhường sau 30′ — bot v3 im» |
| `xoa_hong` | (ĐỎ, page đã tắt) «Khoá ai_sale CHƯA xoá — ai_sale chưa trả lời lại page này» + nút «Thử xoá lại» (= gạt tắt lần nữa) |

- Dòng chưa có cột (CSDL chưa 035) ⇒ không có `aiSale`.

**3 · Mốc bật — cột mới, migration `035_page_ai_sale_nhuong` (CHỈ THÊM + nới CHECK; lên TRƯỚC mã).**

Cột thêm trên `page`:
- `bot_bat_luc timestamptz NULL` — mốc bật lần gần nhất.
- `ai_sale_cho_den timestamptz NULL`.
- `ai_sale_trang_thai text NOT NULL DEFAULT ''`, CHECK `IN ('', 'cho', 'da_nhuong', 'chua_nhuong', 'mat_khoa', 'loi_tep', 'xoa_hong')`.
- `ai_sale_ly_do text NOT NULL DEFAULT ''`.

Thêm `'truoc_moc_bat'` vào CHECK `nap_bo_qua_ly_do_check` (khuôn 033). Không điền ngược: page đang bật lúc áp 035 (prod 0/582) ⇒ `ai_sale_cho_den` NULL ⇒ không vào `sanSang` tới
khi gạt lại. `.down.sql` gỡ đúng các thứ trên. Chép khối vào `db/schema.sql` theo khuôn 034.

Chịu được cột chưa có (khuôn `gl4-chua-034`):
- Worker bắt `42703` / dòng thiếu thuộc tính ⇒ `sanSang = []`, cảnh báo MỘT lần «CSDL chưa áp 035 — bot v3 không trả lời page nào», không sập.
- `pageStatus` ⇒ chặn «CSDL chưa áp 035».
- Tắt vẫn chạy: bỏ phần cột mới, vẫn đóng tin + xoá khoá.

Giờ Pancake:
- Một hàm mới `thoiDiemPancake(x)` trong `ai-sale-nhuong.js` (hoặc tệp tiện ích v3 mới): số ⇒ epoch (giây ⇒ ms như `messageTime`); chuỗi có `Z`/`±hh:mm` ⇒ `Date.parse`; chuỗi
  KHÔNG múi ⇒ coi là UTC (thêm `Z`).
- Không đọc được ⇒ `NaN` ⇒ coi như «trước mốc» (bỏ). Luật tổng: chỉ trả lời tin CHỨNG MINH được là đến sau mốc.
- KHÔNG sửa `history.js#messageTime` (nợ ⑥).

Bộ nạp (`napTuPoll`):
- Câu tra page (`nap.js` `SELECT id, team_id, nguon_tin FROM page WHERE page_id = $1`) lấy thêm `bot_bat_luc`.
- Mức hội thoại: `thoiDiemPancake(moc0(c)) <= bot_bat_luc` ⇒ bỏ, ghi `nap_bo_qua` `truoc_moc_bat`, ghi `mocDaXu` (không đọc lại cho tới khi mốc đổi), KHÔNG gọi `GET /messages`.
- Mức cụm: `gomCumTinKhach(msgs, pageId, { sauMoc })` (tham số TUỲ CHỌN; vắng ⇒ hành vi cũ từng byte — `worker.js:299` gọi không tham số) chỉ gom tin khách có
  `thoiDiemPancake(inserted_at…) > sauMoc`. Tin page vẫn là điểm dừng. Không còn tin nào ⇒ `null` ⇒ bỏ (`truoc_moc_bat`).

Hàng đợi:
- **Bật** (cùng giao dịch `setPage`) ⇒ `UPDATE tin_cho_xu_ly SET trang_thai='xong', ly_do='bo_qua:truoc_moc_bat', sua_luc=now() WHERE team_id=$1 AND page_id=$2 AND
  trang_thai='cho'`.
- **Tắt** ⇒ cùng câu với `ly_do='bo_qua:tat_bot'`.
- Đếm số dòng vào nhật ký. KHÔNG đụng `dang_xu` (lượt đang chạy tự dừng ở `assertCanAct` `handler-v3.js:401-410`, đọc lại `bot_ai_bat` trước mỗi lượt gửi) và `loi`
  (cần đối chiếu).
- Tin xếp trong lúc chờ (webhook — prod đang tắt) đến SAU mốc nên được xử sau khi `da_nhuong`.

**4 · Thứ tự bật / tắt (`src/admin-v3/operations.js` `setPage` + `v3/src/ui/page-bot/cong-tac.js`).**

**BẬT:** cổng cũ (`pageStatus` + trần GL2) → điều kiện mới ② 1 / ② 3 → trong giao dịch: khoá tư vấn tệp → `ghiKhoa` → `UPDATE page SET bot_ai_bat=true, bot_bat_luc=now(),
ai_sale_cho_den=now()+12′, ai_sale_trang_thai='cho', ai_sale_ly_do=…` → đóng tin `cho` cũ → nhật ký `ai_sale_ghi_khoa` → COMMIT.
- `ghiKhoa` lỗi ⇒ ném 409 kèm câu lỗi tệp, page không bật.
- Ghi khoá xong mà COMMIT/UPDATE lỗi ⇒ BÙ: `xoaKhoa` (cố gắng, log nếu hỏng) rồi ném lại. Không để page mất cả hai bot.
- Đáp: `{botAiBat:true, aiSale:{trangThai:'cho', choDen}}`.

**TẮT:** giao dịch 1: `UPDATE page SET bot_ai_bat=false, ai_sale_cho_den=NULL, ai_sale_trang_thai=''` + đóng tin `cho` + nhật ký → COMMIT; giao dịch 2 (khoá tư vấn tệp):
`xoaKhoa`.
- Vì sao xoá khoá SAU khi tắt v3: không có khoảnh khắc nào hai bot cùng bật. Lỗi giữa chừng chỉ để lại «không bot nào» (Botcake + sale vẫn trực), không bao giờ «hai bot».
- `xoaKhoa` lỗi (tệp hỏng/vắng/không ghi được/biến vắng) ⇒ v3 VẪN tắt. `ai_sale_trang_thai='xoa_hong'` + `ai_sale_ly_do`, nhật ký `ai_sale_xoa_khoa_hong`, đáp `ok:true` kèm
  `canhBao` nêu đúng việc người phải làm (gỡ `_v3.<pid>` tay hoặc «Thử xoá lại»).
- TẮT không bao giờ bị cổng nào chặn (giữ luật cũ). Gạt tắt trên page ĐÃ tắt vẫn thử `xoaKhoa` (lũy đẳng, khoá vắng = thành công).

**5 · Thứ tự triển khai (ghi trong nhật ký, việc của bước mở van, KHÔNG phải của thợ):**
1. `node --env-file=.env db/migrate.js` (035).
2. Mã.
3. `.env` thêm `V3_AI_SALE_TEP_GAN=/opt/pancake-tool/state/chung/page_gan_them.json` (+ `V3_AI_SALE_LOG=/var/log/aisale-chat` nếu dùng).
4. Restart CẢ HAI unit.

Cả hai unit chạy root (không có `User=`), tệp `root:root 644`, thư mục `root:root 755` ⇒ ghi được.

**6 · Không đổi hành vi nào khác.** Nội dung gửi khách; luật nhường Botcake/sale; trần GL2; ngắt kênh GL4; công tắc TẮT.

## ③ File được đụng

```
db/migrate/035_page_ai_sale_nhuong.up.sql
db/migrate/035_page_ai_sale_nhuong.down.sql
db/schema.sql
src/queue/ai-sale-nhuong.js
src/queue/chay-worker.js
src/queue/nap.js
src/admin-v3/operations.js
v3/src/ui/page-bot/cong-tac.js
v3/src/ui/page-bot/kho-page.js
v3/src/ui/page-bot/trang/page-bot.html
v3/src/noi-day/van-hanh-v3.js
v3/src/ui/san-sang/kho-san-sang.js
docs/v3/ban-giao/bien-moi-truong-v3.md
test/gl10-*.test.mjs
ops/bin/nghiem-thu/gl10.sh
docs/thi-cong/nhat-ky/phieu-gl10.md
```
← mỗi dòng đúng một đường dẫn hoặc mẫu glob (phép ④ `_chan1.sh` so bằng `case … in $p`). `van-hanh-v3.js` · `kho-san-sang.js` · `kho-page.js`: câu chặn mới của `pageStatus` PHẢI có mã
trong `MA_CUA_CAU` + nhãn ở hai bảng từ vựng (bộ ca `gd1-mot-nguon` đỏ nếu thiếu). Cần tệp khác ⇒ «Lệch phiếu» trong nhật ký + báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gl10.sh`, rc=0 khi đạt)

Hộp cát Postgres (khuôn `db/sandbox.js`) + Pancake giả qua `deps`. Tệp `page_gan_them.json` TẠM (mkdtemp) có đủ ba dáng khoá thật: `_ghi_chu` (chuỗi) · `uae` (dict pid→chuỗi)
· `tram_landing` (dict pid→dict). ⛔ CẤM đọc/ghi `/opt/pancake-tool` hay bất kỳ tệp ngoài thư mục tạm.

1. **Ghi khoá giữ khoá lạ + đúng ngữ nghĩa ai_sale.**
   - Bật page P ⇒ `_v3[P]` có; mọi khoá khác so sâu bằng bản trước.
   - `python3 -I -c` chạy BẢN CHÉP nguyên văn `_page_gan_noi_khac` + `_hop_page_shop` + `_page_gan_them` (ghi nguồn `ai_sale.py`, đo 19/10) trên tệp tạm ⇒ P KHÔNG còn trong
     tập của `uae` lẫn `saudi`.
   - Bản chép `tu_gan_page_ngoai._ghi_gan` ghi thêm một page khác ⇒ `_v3` còn.
   - Tắt ⇒ `_v3[P]` mất (mục cuối ⇒ khoá `_v3` mất), các khoá khác so sâu bằng.
2. **Nguyên tử + quyền.**
   - (a) Tiêm lỗi sau khi đã ghi một phần tệp tạm (deps fs ném ở lần ghi thứ 2) ⇒ tệp đích giống từng byte bản trước, không sót `*.v3-*.tmp`.
   - (b) Tiến trình `process.umask(0o077)`, tệp gốc `chmod 644` ⇒ sau ghi vẫn `644`, cùng uid/gid.
   - (c) Tệp có số nguyên 17 chữ số ⇒ từ chối ghi, tệp nguyên byte.
3. **Tệp hỏng/vắng/biến vắng/page gắn tay ⇒ từ chối bật, không ghi đè.**
   - Tệp cụt (`{"uae": {`) · gốc là mảng · `_v3` là chuỗi ⇒ `POST /api/page-bot/:id/bot {bat:true}` = 409, câu nêu đường tệp + lỗi; tệp giống từng byte; `bot_ai_bat=false`.
   - Tệp vắng ⇒ 409, KHÔNG tạo tệp. Biến vắng ⇒ 409 «Chưa nối ai_sale».
   - P nằm dưới `uae` hoặc `tram_landing` ⇒ 409 «gắn tay».
4. **Trong thời gian chờ: không nạp, không xử.**
   - Ngay sau bật: `motLuot` THẬT (không tiêm `dsChoPhep`), `docHoiThoai` giả đếm lời gọi ⇒ 0 lời gọi cho P; một tin `cho` của P chèn tay sau mốc ⇒ 0 lượt rút.
   - API danh sách Page & Bot trả `aiSale.trangThai='cho'` + phút còn lại.
   - Đặt `ai_sale_cho_den` về quá khứ (UPDATE trong ca) ⇒ vòng sau: `docHoiThoai` được gọi, tin được rút, trạng thái `da_nhuong`.
   - Trần GL2 vẫn đếm P là «bật» trong lúc chờ.
5. **Mốc bật — chạy DƯỚI CẢ `TZ=Europe/Berlin` LẪN `TZ=UTC`.** Pancake giả, giờ dạng thật KHÔNG múi (`2026-10-15T09:31:58` / `….000000`), mốc bật = T:
   - A: khách nói cuối lúc T−3′ ⇒ không vào hàng, `nap_bo_qua.ly_do='truoc_moc_bat'`, 0 lời gọi `docTin` cho A.
   - B: khách nói lúc T+5′ ⇒ vào hàng.
   - C: cụm hai tin (T−2′ · T+1′) ⇒ vào hàng với ĐÚNG chữ tin T+1′.
   - D: B nhưng T+60′ ⇒ vào hàng. Đây là ca bắt bẫy −2 giờ: dùng `messageTime`/`Date.parse` thẳng thì dưới Berlin D bị bỏ.
   - Giờ không đọc được ⇒ bỏ.
6. **Tắt.**
   - P có 2 tin `cho` + 1 `dang_xu`, page Q có 1 tin `cho` ⇒ tắt P: hai tin của P thành `xong` `bo_qua:tat_bot`, `dang_xu` và tin của Q không đổi; khoá mất; nhật ký có số dòng.
   - Tắt khi `xoaKhoa` hỏng (tệp hỏng / thư mục `chmod 555`) ⇒ `bot_ai_bat=false`, `ai_sale_trang_thai='xoa_hong'`, đáp có `canhBao`; sửa xong gạt tắt lần nữa ⇒ khoá mất,
     trạng thái `''`.
   - Tiêm lỗi `UPDATE page` ở giao dịch 1 ⇒ khoá VẪN còn và `bot_ai_bat` vẫn true. Không bao giờ «v3 bật + khoá mất».
7. **Bật lại không trả lời tin cũ.** P tắt còn sót 1 tin `cho` (chèn tay `thoi_diem` cũ) ⇒ bật ⇒ tin đó `xong` `bo_qua:truoc_moc_bat`, handler không được gọi.
8. **Khoá mất / tệp hỏng giữa chừng.** P `da_nhuong`:
   - Xoá `_v3[P]` khỏi tệp (mô phỏng mất-ghi) ⇒ vòng kế: P rời `sanSang` (0 lượt rút), `mat_khoa`.
   - Ghi lại khoá ⇒ `cho` với `ai_sale_cho_den ≈ now()+12′`.
   - Làm hỏng tệp ⇒ `loi_tep`, 0 lượt rút.
9. **Bù khi COMMIT hỏng sau ghi khoá.** Tiêm lỗi ở `UPDATE page` lượt bật ⇒ khoá bị gỡ lại, `bot_ai_bat=false`.
10. **Log ai_sale (`V3_AI_SALE_LOG` = tiền tố tệp log tạm).**
    - Dòng chứa page id ghi vào log SAU khi cửa sổ quan sát mở ⇒ `ai_sale_cho_den` lùi ≥ 2′ và `ai_sale_ly_do` có giờ.
    - `bot_bat_luc` lùi > 30′ mà vẫn ghi ⇒ `chua_nhuong`, không gia hạn nữa, 0 lượt rút.
    - Biến vắng ⇒ chỉ theo giờ.
    - Không dòng log nào xuất hiện trong stdout/nhật ký.
11. **CSDL chưa áp 035** (hộp cát không chạy 035): bật 409 «chưa áp 035»; `motLuot` không sập, cảnh báo đúng 1 lần, 0 lượt rút; tắt vẫn chạy.
12. **Đảo-vá (mỗi dòng ⇒ ca nêu ĐỎ):**
    - Ghi thẳng vào tệp đích ⇒ 2a.
    - Bỏ `chmod`/`chown` ⇒ 2b.
    - Bỏ kiểm số lớn ⇒ 2c.
    - Tệp hỏng coi là `{}` ⇒ 3.
    - Bỏ từ chối «gắn tay» ⇒ 3.
    - Bỏ lọc `sanSang` ở `chay-worker.js` ⇒ 4.
    - Bỏ lọc mốc ở bộ nạp ⇒ 5A.
    - Đổi `thoiDiemPancake` sang `Date.parse` thẳng ⇒ 5D (dưới Berlin).
    - Bỏ đóng tin khi tắt ⇒ 6.
    - Đảo thứ tự tắt (xoá khoá trước) ⇒ 6 (ca tiêm lỗi).
    - Bỏ đóng tin khi bật ⇒ 7.
    - Bỏ kiểm khoá mỗi vòng ⇒ 8.
    - Bỏ bù ⇒ 9.
    - Bỏ gia hạn theo log ⇒ 10.
    - Bỏ bắt `42703` ⇒ 11.
13. **Cổng cũ.**
    - `gl2.sh` rc=0 (đòi buộc).
    - `mb.sh` · `gl4.sh` · `gl3c.sh` · `gl3b.sh` · `l2-m1.sh` · `va-r1.sh` · `gl1.sh` · `gd1.sh` KHÔNG thêm dòng đỏ so với chính chúng chạy trên base `a6f670d` (nợ cũ đã
      biết: `l2-m1` 3 · `va-r1` 2). Cổng lồng treo ⇒ chạy riêng (N-THUOC-CHAP-CHON); `rg` phải có trên PATH.
    - `npm test` không tụt (mốc 2827; đỏ chập chờn đã biết `l0-m2-gop-cua-hep` G6).
    - `_chan1.sh gl10` xanh.

## ⑤ Test chạm nhánh nào

`test/gl10-*.test.mjs` — mô-đun tệp ai_sale (đọc · ghi · xoá · nguyên tử · quyền · hỏng · vắng · số lớn · gắn tay) · cổng bật/tắt qua HTTP thật · lọc `sanSang` của worker (chờ ·
đã nhường · mất khoá · tệp hỏng · log) · lọc mốc của bộ nạp dưới hai múi giờ · đóng tin khi bật/tắt · CSDL chưa 035.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

- **N-GL10-GIO-PANCAKE**: `src/chat/history.js:1-5` `messageTime` lệch −2 giờ trên prod (CEST; −1 giờ từ 25/10). Đụng `chat/human.js:18-27` (cửa sổ 24 giờ nhận diện sale) và mọi
  nơi so giờ tin Pancake. Vá chung một bộ đọc giờ sau khi đo ảnh hưởng.
- ai_sale tự đọc `aicloser_v3.page.bot_ai_bat` (mã pancake-tool, team khác).
- Khoá chống mất-ghi với `tu_gan_page_ngoai.py` (không khoá phía họ — v3 chỉ phát hiện).
- Đèn Sức khoẻ cho trạng thái ai_sale.
- `dsPageDeNap LIMIT 500` trên 582 page (`chay-worker.js:49-55`).
- `pageStatus` không bắt «mọi món hết hàng» (page 335 qua cổng mà `rapKb` `noData`).
- Cửa sổ vài ms giữa `assertCanAct` và POST khi tắt đúng lúc đang gửi.
- `PK_TAG_HANDOFF=AI CHAT` + `V3_NAP_THE_CHAN=Đã gửi,AI CHAT` là cấu hình `.env` ở bước mở van, không phải mã phiếu này.

## ⑦ ĐÃ TRA CHƯA

```
# prod, chỉ đọc
$ stat page_gan_them.json · state/chung            ⇒ root:root 644 7809 B (15/10 04:11) · thư mục root:root 755 (đo lại 19/10: không đổi)
$ python3: kiểu khoá page_gan_them.json             ⇒ dict 7 khoá: _ghi_chu(str) · uae/taiwan/saudi/japan/qatar(dict pid→str) · tram_landing(dict pid→dict)
$ python3: 4 page pilot nằm dưới khoá nào           ⇒ [] cả 4 (19/10)
$ grep -n "_page_gan_noi_khac\|_hop_page_shop\|_page_gan_them\|pages_luc > 600" ai_sale.py   ⇒ :13545 :13557 :13530 :29059 (tệp sửa 18/10 17:24)
$ grep -rn page_gan_them --include=*.py             ⇒ người ghi DUY NHẤT: tu_gan_page_ngoai.py:55-78 (đọc lại + os.replace, không khoá); người đọc: ai_sale · ai_sale_thu_thang · auto_len_don (bỏ khoá "_") · landing_vao_chat · the_nuoc_wa (chỉ tram_landing)
$ grep "^User=" aisale-chat*.service + 2 unit v3    ⇒ không dòng nào (root) · /proc/<pid aicloser-v3>/status ⇒ Uid 0 · Umask 0077
$ timedatectl ; node: Intl tz · getTimezoneOffset   ⇒ Europe/Berlin · −120 (19/10 sau khởi động lại máy 18/10 16:52)
$ GET /conversations + /messages page 340 (bọc fetch chặn ghi) ⇒ last_customer_interactive_at "2026-10-15T09:31:58" · updated_at/inserted_at "…:58.000000" lúc now=09:45:07Z ⇒ UTC không múi; messageTime ⇒ 07:31:58Z (−2 h)
$ tail -c 30MB aisale-chat.log | grep -c <page>      ⇒ 275: 60 · 340: 222 dòng; dạng che chữ: «✔ … <page>/<page>_<psid>» · «🏷 … 'AI CHAT'»
# repo
$ grep -c 'WHERE bot_ai_bat = true' src/queue/page-routing.js ⇒ 1 (neo mb.sh:65) · nap_bo_qua CHECK (033) 7 lý do · migration cuối 034
```
Quan hệ: **mới** (đóng bẫy «bật lại trả lời tin cũ» + «hàng tồn lúc gạt» của `scratchpad/gat-bot-san-sang.md` §9.4–9.5).
