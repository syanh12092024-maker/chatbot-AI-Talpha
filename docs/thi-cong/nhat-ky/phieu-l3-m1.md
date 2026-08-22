# NHẬT KÝ — PHIẾU L3-M1 · Máy trạng thái đơn PHÂN NHÁNH THEO NGUỒN

**Base:** `a5a5411` · **Làn:** 🟥 · thợ **opus** · 22/08/2026
**Kết quả:** cổng `ops/bin/nghiem-thu/l3-m1.sh` = **34 phép · 0 ĐỎ · 3 HOÃN** (rc=0) ·
bộ ca `node --test test/l3-m1-*.test.js` = **28/28 xanh** · bộ v3 gộp **118/118 xanh**.

---

## 0 · Mục ⑦ của phiếu — ĐÃ TRA, dán OUTPUT MÁY

```
$ grep -n "may-trang-thai\|L3-M1\|trạng thái đơn" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep '§9'
(0 dòng)
$ grep -n "trang_thai_he" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
276:- 22/08 · thợ L1-M1 (nợ N6): `don_hang.trang_thai_he` là cột của MÁY TRẠNG THÁI L3-M1…
$ ls src/orders 2>&1
ls: src/orders: No such file or directory
```

Nợ **N6** của L1-M1 là nợ được GIAO cho phiếu này (chốt từ vựng cột `trang_thai_he`) —
không phải nợ trùng. Lượt này **đóng N6**: từ vựng chốt ở bảng chuyển
`src/orders/may-trang-thai.js#BANG_CHUYEN`, giữ nguyên `'moi_tu_pos'` làm cửa vào (không
UPDATE 26 đơn thật — xem quyết định ③ dưới).

## 1 · ĐO LẠI NGUYÊN LIỆU TRƯỚC KHI CODE (bước 3 — đề bài cũng có thể khai sai)

Bốn phép đo, cả bốn đều đổi thiết kế:

| #   | Đo cái gì                    | Kết quả                                                                                                            | Đổi gì trong thiết kế                                                                                                              |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| ①   | Cột thật của `don_hang`      | **14 cột**, không cột nào chứa được lý do/số lần thử; không cột jsonb                                              | ⇒ BẮT BUỘC có migration **004** (xem §2)                                                                                           |
| ②   | Nhãn mã `1` trong bảng 14 mã | **`1 = submitted`** (Đã gửi/đã duyệt), đồ thị thật `0 → 1 → 12 → 8`                                                | ⇒ **CHỐT `TAP_TIEN_IN = [0, 1]`** (phiếu để ngỏ «dự kiến»)                                                                         |
| ③   | Team của 26 đơn thật         | **26/26 ở team `chua-phan` (id 4, KỸ THUẬT)**; ctx NGƯỜI bị chặn trên team kỹ thuật ở CẢ tầng truy vấn lẫn cửa POS | ⇒ job quét bắt buộc `ctxHeThong()`, «rebind ctx per-đơn» = rebind **teamId tường minh**, không phải dựng ctx người                 |
| ④   | Trạng thái POS của 26 đơn    | **26/26 đang ở `trang_thai_pos='12'`** (không đơn nào ở 0)                                                         | ⇒ job quét chạy trên dev nhặt **0 đơn** — bộ ca phải TỰ CHÈN dân số, không thể «đo trên dữ liệu có sẵn» (án lệ ĐẠT RỖNG của L0-M2) |

Cộng hai phép đo về chữ ký cửa (mock cho đúng, không bịa):

- `ghiNguocTrangThai(pool, ctx, {market, donId, tu, sang, teamId}, {nap, env})` — `donId`
  là **id đơn TRÊN POS**, và **`market` bắt buộc**. Mà `don_hang` KHÔNG có cột thị
  trường ⇒ phải suy `shop_id` từ `ma_pos="<shop>:<id>"` rồi tra `ket_noi_pos`
  (`src/orders/cua-pos.js`). Đo `ket_noi_pos` trên dev: 7 dòng, `1635200759 → UAE`,
  `1328205216 → Saudi`… và **26/26 `ma_pos` đều đúng khuôn có dấu `:`**.
- `guiTinMau(pool, ctx, {soNhan, tenMau, thamSo, donHangId}, {guiMau, bangMauTin})` —
  `donHangId` là **`don_hang.id` nội bộ**. Số điện thoại lấy từ `khach.so_dien_thoai`
  (nullable) qua `don_hang.khach_id` (cũng nullable) ⇒ đó chính là nguồn của lý do
  `thieu_so_wa`.

### 🔴 PHÁT HIỆN LỆCH ĐỀ BÀI (đắt nhất của lượt này)

Phiếu ④#3 đòi ca `live=1` → CAS `{tu:1, sang:12}` → `day_cho_in`. Đo cửa POS thật:

```
$ node -e '... CHUYEN_CHO_PHEP ...'
0->12,12->0            ← chỉ HAI cặp
$ kiemChuyen(1, 12)    → ném LoiChuyenNgoaiBang
```

Nghĩa là **ngoài đời ca `live=1` KHÔNG tới `day_cho_in`** — cửa POS từ chối ở cửa (b),
và đơn rơi vào nhánh `cho_sale`. Chỉ với MOCK (đúng như phiếu viết) nó mới xanh.

Cách xử (nói ra theo luật 13 — chọn A thay B vì X, giá phải trả là Y):

- **KHÔNG sửa `src/pos/ma-trang-thai.js`** — phiếu ghi CẤM SỬA cửa đã ✅, và án lệ #25
  cấm chạm file của phiếu khác. Ghi **§9** để phiếu L1-M1 vá cặp `1→12`.
- **Code xử ĐÚNG cả hai đời**: `nhanPhanHoi` bắt mọi lỗi cửa POS ném ra → đơn sang
  `cho_sale` + `viec_can_xu_ly` mang **đúng tên lỗi** (`pos_tu_choi_ghi:LoiVanGhiDong`…),
  không nuốt, không crash.
- **Cổng đo CẢ HAI**: phép ③ đo máy trạng thái bằng mock (như phiếu), phép **③c đo cửa
  POS THẬT** và in `⏸ HOÃN` kèm lý do. Ca test `C5` là neo known-answer: nó **ĐỎ ngay khi
  ai vá xong `1→12`** — đúng lúc phải quay lại đọc lại mục §3 bàn giao.
- Giá phải trả: trong lúc chờ vá, mỗi đơn mà sale bấm duyệt tay xen giữa (POS đã sang 1)
  sẽ thành một việc cho người, thay vì tự chạy. Không im lặng — nhưng vẫn là việc tay.

## 2 · Migration 004 — vì sao vượt pathspec ③, và đã xin thế nào

Phiếu ③ **không liệt** `db/migrate/`. Đo ① ở trên cho thấy không có cột nào dùng tạm
được, nên hai lựa chọn còn lại đều tệ hơn migration:

- nhét lý do vào `trang_thai_he` ⇒ hỏng chính cột rẽ nhánh + hỏng index `don_hang_nguon`;
- nhét vào `nhat_ky` ⇒ phép đếm «3 lý do 1/1/1» phải `DISTINCT ON` trên bảng chỉ-INSERT,
  và `so_lan_thu_wa` vẫn không có chỗ đứng.

Nên: **`db/migrate/004_trang_thai_don.up.sql|.down.sql`** (số 004 do TỔNG cấp trong đề
bài — 003 là của L2-M1, KHÔNG đụng). Đã APPEND §9 khai rõ ba đường dẫn vượt pathspec:
`db/migrate/004_*` + `docs/v3/ban-giao/luoc-do-v1.md` (§8 mới, đề bài yêu cầu khai lý do).

Nội dung: `ly_do_khong_gui text CHECK IN (3 giá trị)` + `so_lan_thu_wa int NOT NULL 0
CHECK >= 0` + một **bất biến đôi** `CHECK (ly_do_khong_gui IS NULL OR trang_thai_he =
'gui_wa_loi')`. Bất biến đôi tồn tại vì thiếu nó thì lý do cũ đeo bám sau khi đơn rời
trạng thái thất bại, và mọi phép đếm theo lý do đọc ra số CAO HƠN sự thật (đúng bệnh
«cổng lỏng mà log nói dối»). Ca `G4` đo cả hai CHECK bằng SQL trần.

### ⛔ CỐ Ý KHÔNG regen `db/schema.sql`

`node db/migrate.js schema` sinh từ **toàn bộ** `db/migrate/*.up.sql` — trong đó có `003`
của thợ L2-M1 đang chạy song song và CHƯA vào git. Regen là kéo migration của người khác
vào commit của mình (án lệ #24/#25). Đo để chắc mình không làm hỏng thêm ca `S11`:

```
$ node --test test/l0-m1-luoc-do.test.js | grep '^✖'
✖ S1 ✖ S11 ✖ S12                      ← với 004 trên cây
(tạm đưa 004 ra khỏi thư mục, chạy lại)
✖ S11                                  ← VẪN ĐỎ ⇒ nguyên nhân là 003, không phải 004
```

Đã ghi §9: TỔNG chạy `node db/migrate.js schema` **một lượt duy nhất sau khi cả 003 lẫn
004 gộp**. Lưu ý thêm — trong lúc tôi làm, thợ L2-M1 **đã tự regen** `db/schema.sql`, nên
file đó hiện chứa CẢ `tin_cho_xu_ly` (của họ) lẫn `ly_do_khong_gui` (của tôi): nó là file
NÓNG hai bên, tôi không commit nó.

CSDL dev `aicloser_v3` **chưa áp 004** (áp là chạy luôn 003 của thợ kia). Không ảnh
hưởng gì: cổng và bộ ca đều tự dựng sandbox.

## 3 · Ba quyết định thiết kế (nói ra, đừng để người sau đoán)

**① Sự kiện ≠ trạng thái.** Phiếu viết `da_gui_wa → {xac_nhan → day_cho_in · tu_choi →
dong · het_luot → cho_sale}`. Đọc `xac_nhan`/`tu_choi`/`het_luot` là **SỰ KIỆN**, ba đích
là **TRẠNG THÁI** — nhất quán với `bao_het_luot → het_luot → cho_sale` («trạng thái có sự
kiện KÍCH» = `cho_sale` không mồ côi). Ca `A2` canh bất biến đó cho MỌI trạng thái.

**② `xac_nhan` có HAI đích, nên tách thành hai sự kiện.** `chuyen()` phải THUẦN, mà đích
của `xac_nhan` phụ thuộc kết quả đọc LIVE (side-effect). Giải: hàm thuần chỉ biết
`xac_nhan → day_cho_in`; khi live ngoài tập (hoặc cửa POS ném) thì bộ điều phối bắn một
sự kiện KHÁC — `pos_lech → cho_sale`. Bảng chuyển vì thế khai đúng sự thật, không có ô
nào «tuỳ hoàn cảnh».

**③ Cửa vào giữ nguyên `moi_tu_pos`, KHÔNG migrate 26 đơn thật.** Nợ N6 cho phép đổi từ
vựng bằng một câu UPDATE. Không làm: `moi_tu_pos` là giá trị cửa POS gieo, và nó là cửa
vào của CẢ HAI nhánh trong bảng chuyển — đổi tên chỉ để đẹp thì phải sửa cửa POS (cấm) và
UPDATE đơn thật (làn 🟥, không đáng). Giá phải trả: từ vựng có một cái tên mang mùi
«của POS» nằm trong bảng của L3.

**④ Một cửa ghi HẸP riêng cho máy trạng thái.** `suaTheoId` (L0-M2) không nhận
`ctxHeThong()`; `suaTheoIdPos` (L1-M1) nhận được nhưng tự ghi thêm một dòng `nhat_ky` ghi
chú **«cửa POS sửa dòng»** — với một lượt chuyển trạng thái ĐƠN thì câu đó SAI, và máy
trạng thái đã tự ghi dòng nhật ký đúng của nó (`don_doi_trang_thai`, có `truoc`/`sau`).
Nên `may-trang-thai.js` giữ một `UPDATE` ~20 dòng: **allow-list 4 cột**
(`trang_thai_he`·`ly_do_khong_gui`·`so_lan_thu_wa`·`dong_luc`), **luôn kẹp `team_id`**,
không có hàm xoá. Ca `E2` đo rằng ép ghi `nguon` bị từ chối. Giá phải trả: repo tạm có
**ba** đường UPDATE hẹp thay vì một — bản vá đúng là `suaTheoId` cho `ctxHeThong()` ở
`src/db/`, đã ghi §9.

**⑤ Import SÂU `src/pos/api.js#guiDocMotDon`.** Cửa VÀO duy nhất `src/pos/index.js`
KHÔNG re-export hàm đọc MỘT đơn (chỉ có `docDon` — quét cả shop, phân trang, ghi DB). Vế
`tu` của CAS phải đọc LIVE, nên `src/orders/cua-pos.js` import sâu đúng một hàm **CHỈ-ĐỌC**
(GET). Ghi §9: phiếu sau nên re-export `docMotDonLive` rồi xoá import sâu này.

## 4 · Nhánh test KHÔNG chạm, và vì sao

| Nhánh                      | Vì sao không chạm                                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gửi WhatsApp **THẬT**      | endpoint Pancake WhatsApp CHƯA TỒN TẠI (L1-M3 đo, adapter luôn ném `LoiChuaCoEndpoint`) — §7b **T1**, chờ H1. Cổng in `⏸ HOÃN`.                      |
| Ghi ngược POS **THẬT**     | cần `V3_POS_GHI=1` + đơn nháp; máy dev cố ý không có biến — §7b **T2**. Cổng in `⏸ HOÃN`.                                                            |
| Cặp POS `1→12` chạy thật   | cửa L1-M1 chưa cho phép cặp này (xem §1) — cổng in `⏸ HOÃN` thứ ba, kèm lý do.                                                                       |
| `lich_nhac` thật           | ĐẤT L3-M3. `huyLichNhac` là dep, mặc định là no-op **có nói ra** (`{camChua:false}`), test dùng spy.                                                 |
| `hang_cho_tao_don`         | ĐẤT L3-M4. Phiếu này chỉ nhận đơn ĐÃ TẠO qua `donMessengerDaTao`; ca `B3`/phép ①e đo rằng `don_hang` messenger có **0** dòng ở trạng thái pre-duyệt. |
| Đơn LadiPage thật chảy vào | cần collector `docDon` chạy theo nhịp trên VPS — job quét chỉ tiêu thụ thứ nó đổ.                                                                    |

Test **KHÔNG** dùng `DELETE đúng id` trên `aicloser_v3` như phiếu ④#7 gợi ý, mà dùng
**CSDL sandbox tự dựng/tự dọn** (`db/sandbox.js`, khuôn L0-M2/L1-M2/L1-M3). Mạnh hơn theo
đúng hai chiều phiếu lo: không đụng 26 đơn thật, và không đụng dữ liệu thợ L2-M1 đang
chạy song song trên cùng CSDL dev. Phép ⑦b của cổng vẫn **đo lại trên chính dev** và in
`26|26` để chứng minh điều đó bằng số.

## 5 · Sự cố trong lượt + cách gỡ

1. **Cổng vòng 1 in «26 đơn thật» ra `18|1`.** Phép ⑦b chạy sau khi script đã `export
DATABASE_URL_V3=<sandbox>` ⇒ nó đo SANDBOX trong khi câu kết luận nói «dev». Đúng án
   lệ #8 (ghi TÊN MÔI TRƯỜNG vào chính câu kết luận). Vá: chụp `URL_DEV` **trước** khi
   ghi đè biến, phép ⑦b chạy dưới `DATABASE_URL_V3="${URL_DEV}"`, và nhãn in ra mang tên
   CSDL. Đo lại: `26|26`.
2. **Ca `G7` đỏ vì `DELETE FROM nhat_ky`** — bảng CHỈ-INSERT, trigger `chan_sua_xoa` chặn
   cả DELETE. Lỗi của THƯỚC, không phải của code (án lệ #27). Vá: bỏ câu dọn, phép đo lọc
   theo `doi_tuong_id` của đúng hai đơn vừa tạo.
3. **Ca `D3` đỏ vì tiền tố lý do.** Code ghi `khach_doi_sua:` còn thước chờ `doi_sua:`.
   Chọn sửa CODE: tiền tố phải bằng **đúng tên sự kiện** để màn L4 và mọi phép đếm dùng
   MỘT từ vựng; đặt tên khác ở đó là đẻ từ vựng thứ hai cho cùng một việc.
4. **Backtick trong nhãn phép ③b** làm bash chạy `pos_trang_thai_la` như một lệnh
   (`command not found`) — phép vẫn xanh nên suýt trôi. Đã bỏ backtick.

## 6 · Cổng nghiệm thu — bảy phép của ④, số đo được

```
① NHÁNH MESSENGER SẠCH WA   đích=day_cho_in · ép sang WA=LoiSaiNhanhNguon
                            spy cửa WA=0 · job quét nhặt=0 · dòng pre-duyệt=0
② TRANG BÁN HÀNG            gửi=1 · trạng thái=da_gui_wa · spy sau 2 lượt quét=1
                            lượt quét 2 nhặt=0 · nhịp 4′ ≤ trần 5′
   tham số mẫu in ra:       mẫu=xac_nhan_don_v1 · số=+971500000101 · ma_don=9999:200001
②b BA LÝ DO                 loi_kenh=1, mau_chua_duyet=1, thieu_so_wa=1
                            đơn messenger mang lý do=0 · spy=2 (ca thiếu số KHÔNG gọi cửa)
                            quá trần → cho_sale · so_lan_thu_wa=2 · ly_do dọn về null
                            viec_can_xu_ly=1 «qua_tran_thu_lai (2/2) — lý do cuối: loi_kenh»
③ CAS THEO LIVE             live=0:day_cho_in:{tu:0,sang:12}:posGhi=1:dbPos=0
                            live=1:day_cho_in:{tu:1,sang:12}:posGhi=1:dbPos=0
                            live=8:cho_sale:KHONG-GOI:posGhi=0:dbPos=0
③c CỬA POS THẬT             0(new)->12:CHO-QUA · 1(submitted)->12:LoiChuyenNgoaiBang
                            ⏸ HOÃN — ngoài đời live=1 vào cho_sale (nợ §9, đất L1-M1)
④ BỐN NHÁNH PHẢN HỒI        tu_choi:dong · doi_sua:cho_sale:viec=1 · khong_ro:cho_sale:viec=1
                            bao_het_luot: da_gui_wa->het_luot->cho_sale:viec=1
                            posGoi=1 (chỉ ca xac_nhan) · huyGoi=2 (xac_nhan + tu_choi)
⑤ BẢNG CHUYỂN               nhảy cóc=LoiChuyenNgoaiBangDon · nhat_ky bị-chặn +1 · đơn đứng «moi»
                            bảng CODE 13 dòng = bảng BÀN GIAO 13 dòng, diff RỖNG
⑥ REBIND ctx PER-ĐƠN        quét 2 đơn/2 team → cặp 17->team1, 18->team2 (mỗi đơn ĐÚNG 1 team)
⑦ BỘ CA + ĐƠN THẬT          28 xanh / 0 đỏ · dev aicloser_v3 = 26|26 (chưa đơn nào bị đụng)

TỔNG: 34 phép · 0 ĐỎ · 3 HOÃN · rc=0
```

## 7 · Chặng 1 `_chan1.sh` — đối chiếu per-commit

Cây có **hai thợ song song** (L2-M1 ở `src/queue/` `src/chat/` `db/migrate/003`), nên
phép ④ (pathspec) và ⑥ (marker) của `_chan1.sh` đo `base..HEAD` sẽ nhặt cả file của thợ
kia. Đối chiếu per-commit của TÔI bằng `git show --name-only <hash>` — kết quả dán ở dòng
cuối file này sau khi commit.

**Marker NEEDS-CLARIFICATION trong lượt này: 0.** Chỗ duy nhất phải đoán (nhãn mã `1`) đã
ĐO được, nên không cắm marker. (Viết tên marker KHÔNG có dấu ngoặc vuông là cố ý — `_chan1.sh`
phép ⑥ `grep` chính chuỗi đó trong file nhật ký, nhắc tới nó theo nguyên văn là tự làm đỏ cổng.)

## 8 · Nợ đã APPEND §9 (4 dòng)

1. `CHUYEN_CHO_PHEP` thiếu cặp `1→12` ⇒ ca `live=1` ngoài đời vào `cho_sale` (đất L1-M1).
2. `db/schema.sql` phải regen MỘT lượt sau khi cả 003 lẫn 004 gộp; `S11` đang đỏ vì 003.
3. `suaTheoId` cho `ctxHeThong()` ở `src/db/` — gộp ba đường UPDATE hẹp về một.
4. `src/pos/index.js` nên re-export `docMotDonLive` để `src/orders/cua-pos.js` bỏ import sâu.

Cộng một dòng khai **vượt pathspec** (004 + luoc-do-v1 §8), theo đúng lệnh của đề bài.

---

## 9 · CHẶNG 1 `_chan1.sh l3-m1` — kết quả + đối chiếu per-commit (bắt buộc, cây song song)

```
$ bash ops/bin/nghiem-thu/_chan1.sh l3-m1
✅ ①phiếu-tồn-tại   ✅ ②có-Base base=5030f04
🔴 ④pathspec-⊆-③ NGOÀI PHẠM VI: db/migrate/004_trang_thai_don.down.sql
                                db/migrate/004_trang_thai_don.up.sql
                                docs/v3/ban-giao/luoc-do-v1.md
✅ ⑤vùng-cấm-src-phẳng   ✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/l3-m1.sh rc=0 (34 phép · 0 ĐỎ · 3 HOÃN)
✅ ⑧a-nhật-ký   ✅ ⑧b-§10-sổ
== ĐỎ 1 / XANH 7
```

**Phép ④ đỏ là ĐỎ THẬT, không phải nhiễu song song — và đã được khai trước.** Ba đường
dẫn kia đúng là ngoài mục ③ của phiếu; đề bài cho phép với điều kiện «APPEND §9 xin tổng
trước khi vượt pathspec», và §9 đã có dòng khai đủ ba đường dẫn + lý do đo được (14 cột,
không cột nào dùng tạm được). Tổng quyết cho qua hay bắt tách phiếu.

Đối chiếu **per-commit của tôi** (không đo cả khoảng cây — cây có thợ L2-M1 song song):

```
$ git show --name-only --format="" 1017a615
db/migrate/004_trang_thai_don.down.sql   ← khai §9 (vượt ③, đề bài cấp số 004)
db/migrate/004_trang_thai_don.up.sql     ← khai §9
docs/v3/ban-giao/luoc-do-v1.md           ← khai §9 (đề bài yêu cầu khai lý do §thay-đổi)
docs/v3/ban-giao/may-trang-thai-don-v1.md
ops/bin/nghiem-thu/l3-m1.sh
src/orders/cua-pos.js · index.js · may-trang-thai.js · quet-don-moi.js
test/l3-m1-may-trang-thai.test.js · test/l3-m1-quet-don.test.js
= 11 tệp. 8/11 nằm ĐÚNG trong ③; 3/11 là phần đã khai §9. KHÔNG tệp nào của thợ L2-M1
  (`src/queue/` `src/chat/` `db/migrate/003_*` `test/l2-m1-*` `ops/bin/nghiem-thu/l2-m1.sh`
  `docs/v3/ban-giao/duong-tin-v1.md`) lọt vào — và `db/schema.sql` CỐ Ý không có mặt.
```

Nghi thức private-index đã dùng (`GIT_INDEX_FILE` riêng + `commit-tree` + `update-ref`
CAS từ `a5a5411`). ⚠️ Sau đó phải **đồng bộ lại index chính** (`git read-tree HEAD`):
index chính vẫn giữ cây CŨ nên `git status` đọc 11 tệp vừa commit thành `D` (đã xoá) —
đúng cơ chế đã gây sự cố N8 (một `git commit` không pathspec của TỔNG sẽ XOÁ chúng khỏi
git). Đã kiểm trước khi đồng bộ: không tệp nào của thợ khác đang staged.

Commit lượt này: **`1017a615`** (code, 11 tệp) + một commit thứ hai cho sổ §9/§10 và
chính file nhật ký này — tách ra vì §10 phải mang được hash của commit code, và **cấm
`amend` khi cây có thợ song song**.
