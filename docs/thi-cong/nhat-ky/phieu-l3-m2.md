# NHẬT KÝ PHIẾU L3-M2 — Lọc trùng CHÉO hai luồng + chấm tỉ lệ hoàn BỐN TẦNG

> Thợ **opus** · 23/08/2026 · base phiếu `f295de8`, cây lúc khởi công **`baa86f1`** (sạch)
> · làn 🟥 · nghiệm thu: `bash ops/bin/nghiem-thu/l3-m2.sh` → **13 phép ĐẠT / 0 trượt /
> 2 hoãn**; `node --test test/l3-m2-*.test.js` → **38/38**; hồi quy L3-M1 **28/28**.

---

## 0 · Mục ⑦ của phiếu — ĐÃ TRA (output máy, không phải lời khai)

```
$ grep -n "144\|ti_le_hoan\|hoàn cao" docs/v3/01-QUYET-DINH.md
218:| Chặn cứng khách hoàn cao ở một ngưỡng | Đề xuất chia bốn tầng thay vì một ngưỡng —
     144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường. **Chờ chốt** |

$ grep -n "N4\|quy đổi tiền POS" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md   # nợ tiền
266: 22/08 · thợ L1-M1 (nợ N4 — TIỀN): chưa chỗ nào trong v3 khai quy ước quy đổi tiền POS
```

Nợ **N4 (tiền)** không chạm: phiếu này **đếm TRẠNG THÁI**, không cộng/chia một đồng nào —
`tong_tien` vẫn NULL và không hàm nào của lượt này đọc nó. Nợ «144 khách gộp nhầm» chính
là phần phiếu này trả: **phần TÍNH đã xong**, phần **CHẶN vẫn chờ chốt** (xem §4).

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code — và đề bài khai THIẾU ba chỗ

Bước 3 của skill tồn tại vì án lệ #4. Lượt này đề bài trúng phần lớn, nhưng **ba nguyên
liệu không tồn tại như phiếu ② giả định**:

| Phiếu ② khai / ngầm định                     | ĐO ĐƯỢC 23/08 trên `aicloser_v3` + POS thật                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| «tra `don_hang` … theo khách + **sản phẩm**» | `don_hang` **KHÔNG có cột sản phẩm** (16 cột, không cột nào) ⇒ migration 005                         |
| «chấm per-KHÁCH từ lịch sử POS»              | bảng `khach` có **0 dòng**; `don_hang.khach_id` **0/26** ⇒ trên dữ liệu thật cả hai cửa trả tập RỖNG |
| «lịch sử trạng thái POS … thợ đo»            | `status_history` **CÓ, 5.144/5.144 đơn** — nhưng cửa POS KHÔNG lưu nó xuống cột nào                  |

Code theo đúng chữ của một đề bài sai thì luật ra đời CÂM. Cách xử của lượt này ở §3.

### 1.1 · Dữ liệu POS THẬT dùng để chốt mọi con số (5.144 đơn / 7 shop, đọc GET, 0 lượt ghi)

Đọc bằng `GET /shops/<id>/orders` trên cả 7 shop của `pancake-shops.json`
(Saudi·UAE·Kuwait·Bahrain·Oman·Qatar·Taiwan), 8 trang × 100/shop. **Không lượt ghi nào**,
`PANCAKE_READONLY=1` (đo: `.env` dòng 77).

**(a) Định dạng SĐT — lệch thật, không phải giả định của phiếu**

| lớp                        | số ca | ví dụ thật       |
| -------------------------- | ----: | ---------------- |
| `0` đầu (nội địa có trunk) | 1.068 | `0583077980`     |
| số trần (nội địa)          | 1.966 | `545769903`      |
| `+E164`                    |   270 | `+966540575011`  |
| tiền tố `00`               |    25 | `00966545454774` |
| NULL                       |    15 | —                |

Độ dài chữ số: 7 (1) · 8 (1.536) · 9 (129) · 10 (1.062) · 11 (427) · 12 (149) · 13 (19) · 14 (6).

**(b) Cắt mã quốc gia GOM THÊM 58 khách.** Chỉ bỏ `+`/`00`/số 0 đầu ⇒ hệ đếm **4.558**
«khách»; cắt thêm mã quốc gia ⇒ **4.500**. Tức 58 khách đang bị tách đôi chỉ vì hai luồng
khai số khác định dạng. Hệ quả trên chính phép của phiếu: khách có đơn ở CẢ HAI luồng
**48 → 56**, khách trùng-cùng-sản-phẩm **13 → 16**.

**(c) TRÙNG CHÉO LÀ CÓ THẬT.** 56 khách có đơn ở cả hai luồng · **16** trong đó trùng ít
nhất một sản phẩm · 20 cặp (đơn messenger, đơn trang bán hàng) cùng sản phẩm, khoảng cách
ngày: `0 · 0,01 · 0,01 · 0,03 · 0,04 · 0,71 · 1,05 · 1,43 · 1,49 · 1,5 · 1,89 · 1,93 ·
1,93 · 2,49 · 3,14 · 4,44 · 5,25 · 11,69 · 19,39 · 28,35`.
Ví dụ đọc được: SĐT `966501984606` — Messenger **#68771** và trang bán hàng **#68769**,
CÙNG sản phẩm, cách **0 ngày**. Không có cửa này thì đó là hai kiện COD.

**(d) Nhịp mua lại của cùng một khách** (565 cặp đơn liên tiếp): p50 **1,25 ngày** · p75
**12,16** · p90 50,08 · p95 80,95.

**(e) `status_history` có trên 5.144/5.144 đơn**, và «lịch sử TỪNG chạm {4,5,6,7}» khác
«hiện tại thuộc {4,5,6,7}» ở đúng **4 đơn (0,08%)**.

**(f) Mã 8 (`packing`)**: 113 đơn đang đứng ở 8; tính 8 vào nhóm hoàn thì **108 khách đổi
tỉ lệ**. Án lệ L1-M1 (nhóm đúng = `{4,5,6,7}`) được đo lại và giữ nguyên.

**(g) `items[].variation_id`** có trên **4.935/5.144 đơn (95,9%)**, một đơn nhiều dòng
hàng ⇒ cột sản phẩm phải là **MẢNG**.

---

## 2 · Bốn quyết định của lượt này (mỗi cái có số đo đứng sau)

### ① Chuẩn hoá SĐT CÓ cắt mã quốc gia — bảng mã đo từ dữ liệu, không tra sách

`chuanHoaSdt()` là **hàm THUẦN và là nguồn luật DUY NHẤT**: bỏ mọi ký tự không phải chữ
số → bỏ mọi số 0 đầu (nuốt luôn `00` quốc tế và `0` trung kế) → cắt mã quốc gia **khi và
chỉ khi độ dài tổng khớp đúng `mã + nội địa`** (deny-by-default) → số nội địa.

Bảng độ dài nội địa đo theo TỪNG shop: `966`→9 · `971`→9 · `965`→8 · `973`→8 · `968`→8 ·
`974`→8 · `886`→9. **`63` (Philippines) = 10 là số CHƯA ĐO** — `pancake-shops.json` không
có shop PH trong khi §0a khai thị trường có PH; biên này ghi ngay trong mã (`daDo: false`)
và có một ca test canh nó (án lệ #23: ghi biên vào chính câu kết luận).

Vì sao deny-by-default có giá trị: rác 12 chữ số mở đầu `123`/`256`/`990`/`916` (đo được
vài chục ca) và số nội địa 8 chữ số **không bao giờ** bị cắt nhầm.

### ② SQL chỉ lọc THÔ bằng bảy chữ số cuối — không có bản luật SQL song sinh

Viết lại luật chuẩn hoá bằng SQL để lọc được bằng index là đẻ **nguồn luật thứ hai**, và
hai nguồn một luật thì chúng trôi khỏi nhau — trôi ở đây nghĩa là một cặp trùng lọt qua,
im lặng. Nên: index biểu thức `right(regexp_replace(sdt,'[^0-9]','','g'), 7)` lọc thô,
JS phán chính xác. **An toàn MỘT CHIỀU chứng minh được**: chuẩn hoá chỉ CẮT TIỀN TỐ, nên
hai số bằng nhau sau chuẩn hoá luôn có bảy chữ số cuối bằng nhau ⇒ vế thô không bao giờ
đánh rơi một cặp trùng, nó chỉ nhận dư. (Ca `A3` canh đúng bất biến này.)

### ③ Cửa sổ ngày mặc định = 7

Bắt **17/20** cặp trùng chéo thật (85%); 3 ngày chỉ bắt 14/20; 14 ngày bắt 18/20 nhưng đã
chạm vùng mua lại hợp lệ (p75 = 12,16 ngày). Chọn 7 vì nó nằm **dưới** nhịp mua lại thật.
Config được qua `keo_ngay`; `keo_ngay` không hợp lệ thì **ném ngay lúc khai**, không âm
thầm rơi về mặc định.

### ④ Bốn tầng 15 / 30 / 65 % + sàn 2 đơn ĐÃ KẾT

Phân bố **đo trên 5.144 đơn thật, chấm bằng CHÍNH `chamTang()` đang ship**:

| sàn `toi_thieu_don_ket` | `chua_du_don` | `tot` | `binh_thuong` | `canh_bao` | `rui_ro_cao` |
| ----------------------- | ------------: | ----: | ------------: | ---------: | -----------: |
| **2 (mặc định)**        |         4.189 |    73 |             1 |    **107** |          130 |
| 1 (đối chứng)           |         1.555 | 1.884 |             1 |        107 |      **953** |

Hai điều đọc ra từ bảng này:

1. **Vế 30–65% là một CỤM THẬT** — 107 khách, cỡ khớp với «144 khách» mà 01 §11 gọi tên
   (dân số khác, thời điểm khác). Nó không phải một khoảng ai đó chia cho đẹp.
2. **Sàn là thứ giữ cho tầng có nghĩa**: hạ sàn xuống 1 thì `rui_ro_cao` nhảy
   **130 → 953** — tức **823 khách bị dán nhãn rủi ro cao bằng ĐÚNG MỘT đơn**. Cùng
   doctrine với `winner_min_orders` của hệ ads: đừng hạ sàn cho đẹp bảng.

Dưới sàn có nhãn RIÊNG `chua_du_don`, **không gộp vào `tot`** (gộp là nói dối theo chiều
dễ chịu) và **không để NULL** (NULL là im lặng). Bốn tầng + một nhãn vắng mặt = 5 giá trị
trong CHECK — nói rõ ở đây để không ai đọc thành «năm tầng».

---

## 3 · Ba chỗ đề bài khai thiếu — xử thế nào (và giá phải trả)

### 3.1 · Không có cột sản phẩm ⇒ tạo `don_hang.san_pham_ma`, nhưng KHÔNG tự ghi hộ

Chủ cột đúng là cửa POS `src/pos/doc-don.js` — **đất L1-M1**, án lệ #25 cấm tiện tay sửa
file phiếu khác (và VA-P1 đang làm ở đúng thư mục đó lúc này). Nên: 005 tạo cột, `COMMENT
ON COLUMN` khai chủ, §9 ghi nợ, và **reader không được đọc cột rỗng thành "sạch"**.

**Tradeoff nói thẳng (luật 13):** chọn **fail-CLOSED** — đơn khớp SĐT + trong cửa sổ mà
không đọc được sản phẩm thì trả `trung: true` với mã lý do RIÊNG
`nghi_trung_chua_ro_san_pham`. Giá phải trả: sale nhìn thêm một lượt. Chiều kia (đọc
thành `khong_trung`) trả giá bằng một kiện COD gửi trùng. Hai giá không cùng hạng, và
kết quả này đi vào `hang_cho_tao_don` — nơi **có người duyệt** — nên báo thừa không tự
động thành hành động. Hai mã lý do `true` cố ý KHÔNG gộp để không ai đọc nhầm «nghi» ra
«đã xác minh».

### 3.2 · `status_history` có thật nhưng không sống trong CSDL ⇒ chấm bằng `trang_thai_pos`

Job đêm **không được** tự đi gọi lại POS cho từng đơn (đó là việc của cửa POS; gọi lại là
đẻ đường ra mạng thứ hai — án lệ #31 «cửa RA đúng một cái»). Nên chấm bằng ảnh chụp
`don_hang.trang_thai_pos`. **Đo độ lệch của chính phép quy ước đó thay vì tin nó**: trên
5.144 đơn, hai cách chấm khác nhau ở **4 đơn (0,08%)**. Muốn xoá nốt 0,08% thì cửa POS
phải lưu `status_history` — ghi §9, đất L1-M1.

### 3.3 · `khach` rỗng và `khach_id` 0/26 ⇒ nhánh thật (⑤ phiếu) chạy được nhưng RỖNG

Chạy `chamTiLeHoan()` trên CSDL dev THẬT (không phải sandbox):

```
TRUOC don_hang: {"n":26,"co_khach":0,"co_sp":0,"k":"9a1e8f4b8abb9368715d31d8012a4325"}
TRUOC khach:    {"n":0}
KET QUA cham:   {"team":4,"khach":0,"capNhat":0,"theoTang":{...tất cả 0},"teamHong":[]}
SAU don_hang:   {"n":26,"co_khach":0,"k":"9a1e8f4b8abb9368715d31d8012a4325"}   ← md5 KHÔNG đổi
viec_can_xu_ly: {"n":0}
```

Đúng họ lỗi «hai đầu làm rất kỹ, phần bị bỏ luôn là phần NỐI». Nói ra bằng **hai mục
`⏸ HOÃN`** trong cổng, không giả xanh. Phần chấm-trên-dữ-liệu-thật vẫn có bằng chứng:
§2④ chấm 4.500 khách từ 5.144 đơn POS thật bằng chính hàm đang ship.

---

## 4 · CHỈ TÍNH, KHÔNG CHẶN — và cách bộ ca chứng minh điều đó

01 §11 để «chặn cứng khách hoàn cao» ở trạng thái **Chờ chốt**. Ba lớp giữ lời hứa này:

1. `ti-le-hoan.js` không import bất cứ thứ gì có thể chặn (`apDung`, `dayChoSale`, cửa WA
   đều không có mặt) — nó chỉ import `ghiNhatKy`.
2. Câu ghi `CAU_GHI_CHAM` là **một** câu UPDATE cố định 5 cột của `khach`, luôn kẹp
   `k.team_id = $7`; ca `C4` đọc thẳng chuỗi SQL và bắt đỏ nếu ai thêm `don_hang`,
   `viec_can_xu_ly`, `INSERT`, `DELETE` hay `sua_luc` vào đó.
3. Ca `C3` + phép ⑥ của cổng: chạy trọn job rồi so **DANH SÁCH** `(id, trang_thai_he,
trang_thai_pos)` của mọi đơn trước/sau (md5 của chuỗi ghép, không phải một tổng), cộng
   `count(viec_can_xu_ly)` — cả hai phải bằng.

---

## 5 · Cửa ghi hẹp thứ TƯ — nói ra, không giấu

`suaTheoId` (`src/db/`) vẫn **không nhận `ctxHeThong()`**, mà job đêm phải chạm cả team
KỸ THUẬT `chua-phan` (26/26 đơn thật ở đó, ctx NGƯỜI bị tầng truy vấn từ chối trên team
kỹ thuật). `suaTheoIdPos` (`src/pos/kho.js`) chạy được nhưng tự ghi một dòng `nhat_ky` mang
câu «cửa POS sửa dòng» — câu đó SAI cho một lượt chấm tỉ lệ hoàn («cổng lỏng mà log nói
dối là HAI lỗi»). Nên lượt này dùng một câu UPDATE cố định trong `ti-le-hoan.js`.

Repo nay có **BỐN** đường UPDATE hẹp cùng một gốc (`suaTheoIdPos` · `src/chat/kho.js` ·
`ghiDon` · câu này). Bản vá đúng vẫn là: `suaTheoId` hỗ trợ `ctxHeThong()` ở `src/db/`
(đất L0-M2) rồi **gộp cả bốn về một**. Đã ghi §9 — nối vào nợ N3/P3 sẵn có, không mở nợ mới.

**Grain của nhật ký:** MỘT dòng `cham_ti_le_hoan` cho CẢ LƯỢT của một team, không phải một
dòng mỗi khách — chi tiết từng khách đã sống trong bốn cột (tử/mẫu/tầng/mốc) nên tra ngược
được, còn n nghìn dòng mỗi đêm thì chôn mất mọi dòng nhật ký nghiệp vụ khác. Team **không
có khách nào thì không đẻ dòng nào** (ca `D2` canh: số dòng = số team CÓ khách, và phải
nhỏ hơn hẳn số khách).

---

## 6 · Lũy đẳng: cái gì được đổi mỗi đêm, cái gì không

- **Điểm số** (`ti_le_hoan` · `tang_hoan` · `so_don_ket` · `so_don_hoan`): chạy lượt thứ
  hai liền kề ⇒ `capNhat = 0` và md5 của toàn bảng không đổi (ca `C1` + phép ⑥).
- **`cham_hoan_luc`**: **CỐ Ý mới lại mỗi lượt**, kể cả khi điểm số không đổi. Nó là
  **tuổi PHÉP ĐO**, không phải tuổi lần-giá-trị-đổi (án lệ #9). Nếu chỉ cập nhật khi giá
  trị đổi thì cột này đọc thành «lần cuối chấm» trong khi thực ra là «lần cuối đổi» — một
  lời khai sai. Ca `C2` canh đúng chỗ đó: `capNhat = 0` **và** mốc vẫn mới.
- Làm tròn `numeric(5,2)` làm **ở JS** (`tron2`) trước khi ghi, để hai vế so sánh cùng độ
  chính xác; không thì lượt sau đọc «đổi» chỉ vì chữ số thứ ba và job hết lũy đẳng.

---

## 7 · Hai lỗi THƯỚC của chính lượt này (tự bắt, ghi lại)

1. **Ca `C4` đọc cột theo THỤT LỀ** (`/^\s{9}(\w+)\s*=/`) ⇒ đánh rơi `ti_le_hoan` vì dòng
   `SET` thụt khác. Thước đỏ trong khi code đúng. Vá: đọc đúng khối `SET … FROM (` rồi
   liệt mọi cột bị gán — thước không được phụ thuộc vào prettier (án lệ #27).
2. **Phép ⑥ của cổng neo cứng «15 đơn»** — con số đó phụ thuộc các phép ①④⑤ chạy trước
   trong cùng sandbox, nên nó là một hằng số ăn may và đã đỏ ngay lượt chạy đầu (thật 43).
   Vá: cổng đo **BẤT BIẾN** (`donSoDoi=false`, md5 trước/sau bằng nhau) và vẫn **in số
   thật** ra dòng riêng để đọc được — «so DANH SÁCH, không so SỐ».

---

## 8 · Nhánh test KHÔNG chạm (khai theo bước 4 của skill)

- **Đường mạng POS**: không ca nào của L3-M2 gọi POS. Số POS thật trong file này lấy bằng
  một script đo ngoài cây (scratchpad), GET, 0 lượt ghi — chúng là **bằng chứng cho quyết
  định**, không phải phép nghiệm thu chạy lại được. Ai muốn đo lại thì đọc §1.1.
- **`batDauChamDem()`**: không có ca nào chạy trọn một chu kỳ hẹn giờ (chờ 24h). Ca gián
  tiếp: `chamTiLeHoan` được gọi thẳng; phần `setInterval`/`unref` là 6 dòng cùng khuôn
  `batDauQuet` của L3-M1.
- **`chamTran` (`TRAN_DONG_TRA = 500`)**: không dựng nổi 500 đơn cùng một khách trong một
  cửa sổ 7 ngày để chạm trần. Cờ được TRẢ RA để lượt gọi đọc được, chưa có ca đo.

---

## 9 · Đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l3-m2.sh                    # 13 phép của ④ (2 mục in ⏸ HOÃN)
node --test test/l3-m2-loc-trung.test.js test/l3-m2-ti-le-hoan.test.js   # 38 ca
node --test test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js # 28 ca hồi quy
```

Cổng và bộ ca **tự dựng CSDL sandbox riêng rồi `DROP DATABASE`** — không đo trên
`aicloser_v3` dev (26 đơn thật + dữ liệu hai thợ song song), không chạm mạng lượt nào.
Migration 005 **đã áp lên CSDL dev** (`node db/migrate.js` → `[migrate] ÁP 005…`, tổng đã
áp 5) vì phiếu ⑤ đòi chạy nhánh thật; ALTER thuần cộng cột nên không đụng hai thợ song song.
