# BÀN GIAO — MÁY TRẠNG THÁI ĐƠN v1 (cho L3-M2, L3-M3, L3-M4 và màn L4 của B)

> Phiếu **L3-M1** · dựng 22/08/2026 · nguồn sự thật của file này là `src/orders/*.js`.
> Số nào ở đây cũng đo lại được bằng `bash ops/bin/nghiem-thu/l3-m1.sh`.
> Đọc trước: [`./luoc-do-v1.md`](./luoc-do-v1.md) (`don_hang`, bảng 14 mã POS đã xác minh) ·
> [`./tang-truy-van-v1.md`](./tang-truy-van-v1.md) (`ctx`, `ctxHeThong()`) ·
> [`./cua-whatsapp-v1.md`](./cua-whatsapp-v1.md) (`guiTinMau`, `LoiSaiNguonDon`).

## 0 · Import từ đâu

```js
import {
  chuyen,
  apDung,
  taiDon,
  dayChoSale, // máy trạng thái
  nhanPhanHoi,
  baoHetLuot,
  donMessengerDaTao, // ba hook cho L3-M3 / L3-M4
  quetDonMoi,
  batDauQuet, // job quét ≤5 phút
  docLivePos,
  ghiNguocPos, // cầu nối cửa POS thật (dùng làm deps)
  BANG_CHUYEN,
  NGUON,
  TAP_TIEN_IN,
  MA_POS_CHO_IN,
  LY_DO_KHONG_GUI,
  KET_QUA_PHAN_HOI,
  LoiSaiNhanhNguon,
  LoiChuyenNgoaiBangDon,
  LoiThieuNguonDon,
} from "../../src/orders/index.js"; // (sửa số cấp `../` theo vị trí file gọi)
```

⛔ **`donId` ở MỌI hàm là `don_hang.id` NỘI BỘ**, không phải id đơn của POS. Id POS là
dãy riêng từng shop và chồng nhau (Saudi 62.029 · UAE 47.421 · Kuwait 13.922 · Taiwan
344 — cùng đếm từ 1); khoá đúng là `ma_pos = "<shop_id>:<id POS>"`. Chỗ DUY NHẤT cần id
POS trần nằm trong `src/orders/cua-pos.js`, không lộ ra interface nào.

## 1 · Hai nhánh — khai CỨNG theo `don_hang.nguon`, không suy lúc chạy

`don_hang.nguon` là `NOT NULL` + `CHECK IN ('trang_ban_hang','messenger')`, ghi MỘT LẦN
lúc cửa POS tạo dòng. Máy trạng thái tra bảng chuyển **per-nguồn**; đơn không quyết được
nguồn thì máy **TỪ CHỐI nhận** (`LoiThieuNguonDon`) — không đoán, vì đoán sai có đúng hai
kết cục: bỏ rơi 37,4% BUY NOW, hoặc bom hàng cho người chưa ai nói chuyện (01 §1).

### BẢNG CHUYỂN — sinh ra từ `BANG_CHUYEN`, cổng ⑤ diff lại từng dòng

<!-- BANG-CHUYEN-MAY -->

```
trang_ban_hang | moi_tu_pos --vao_may--> moi
trang_ban_hang | moi --bat_dau_gui--> cho_gui_wa
trang_ban_hang | cho_gui_wa --gui_xong--> da_gui_wa
trang_ban_hang | cho_gui_wa --gui_hong--> gui_wa_loi
trang_ban_hang | gui_wa_loi --thu_lai--> cho_gui_wa
trang_ban_hang | gui_wa_loi --qua_tran--> cho_sale
trang_ban_hang | da_gui_wa --xac_nhan--> day_cho_in
trang_ban_hang | da_gui_wa --tu_choi--> dong
trang_ban_hang | da_gui_wa --het_luot--> cho_sale
trang_ban_hang | da_gui_wa --doi_sua--> cho_sale
trang_ban_hang | da_gui_wa --khong_ro--> cho_sale
trang_ban_hang | da_gui_wa --pos_lech--> cho_sale
messenger | moi_tu_pos --da_tao--> day_cho_in
```

Đọc: `nguồn | trạng-thái-đang-đứng --sự-kiện-vừa-xảy-ra--> trạng-thái-mới`.
`moi_tu_pos` là giá trị cửa POS **gieo một lần** lúc tạo dòng (L1-M1) — cửa vào của cả
hai nhánh, và là trạng thái duy nhất không có sự kiện kích tới nó.

- **Cặp ngoài bảng ⇒ ném lỗi có tên**, và lượt BỊ CHẶN vẫn ghi `nhat_ky`
  (`hanh_dong='don_chuyen_bi_chan'`) — im lặng thì không ai biết đã có người thử.
- **Ép đơn sang nhánh của nguồn khác ⇒ `LoiSaiNhanhNguon`** (nói đúng bệnh), khác với
  `LoiChuyenNgoaiBangDon` (đi sai BƯỚC trong đúng nhánh).
- Nhánh messenger có **ĐÚNG MỘT** chuyển. Pre-duyệt (đơn bot chốt chưa được sale duyệt)
  **không tồn tại trong `don_hang`** — nó sống ở `hang_cho_tao_don`, **đất L3-M4**; phiếu
  này cố ý không mô hình nó, và cổng ①c đếm dòng `don_hang` messenger ở trạng thái
  pre-duyệt = 0.

## 2 · Ba hook — hợp đồng cho L3-M3 / L3-M4

```ts
nhanPhanHoi(pool, ctx, { donId, ket_qua }, deps)   // L3-M3 bộ đọc ý
   ket_qua ∈ xac_nhan | tu_choi | doi_sua | khong_ro   (ngoài bốn ⇒ ném NGAY)
baoHetLuot(pool, ctx, { donId }, deps)             // L3-M3 hàng đợi nhắc bắn hết lượt
donMessengerDaTao(pool, ctx, { donId }, deps)      // L3-M4 sale duyệt xong ⇒ đơn ĐÃ tạo
```

`deps` (tiêm — RUNTIME trỏ cửa thật ở `src/orders/cua-pos.js`, TEST trỏ mock):

| deps          | dùng khi             | mặc định                                  |
| ------------- | -------------------- | ----------------------------------------- |
| `docLivePos`  | `xac_nhan`           | KHÔNG có — thiếu là ném (không đoán live) |
| `ghiNguocPos` | `xac_nhan`           | KHÔNG có — thiếu là ném                   |
| `huyLichNhac` | `xac_nhan`/`tu_choi` | no-op trả `{camChua:false}` — xem §5      |

Trả về: `{ nguon, tu, sang, sukien, don, teamId, posGhi, live?, lyDo?, viecId?, huyLichNhac? }`.
`posGhi` là **số lượt gọi cửa ghi POS** của lượt đó (0 hoặc 1) — đọc được ngay, không
phải suy.

## 3 · `xac_nhan` — CAS THEO LIVE, và cái giá của nó

Đồ thị chuyển thật (1.400 đơn, 22/08) là `0 → 1 → 12 → 8`: sale bấm duyệt tay **xen giữa**
lúc bot đang chờ khách trả lời là chuyện thường. Nên vế `tu` của compare-and-set **không
lấy từ `don_hang.trang_thai_pos`** (ảnh chụp trong CSDL luôn có thể cũ hơn POS) mà đọc
LIVE ngay trước lượt ghi.

```
live = docLivePos(...)
live ∈ TAP_TIEN_IN = [0, 1]   →  ghiNguocPos { tu: live, sang: 12 }  →  day_cho_in
live ∉ TAP_TIEN_IN            →  0 lượt ghi POS · cho_sale · lý do `pos_trang_thai_la=<live>`
cửa POS NÉM (van đóng/cặp ngoài bảng/POS im)
                              →  0 lượt ghi POS · cho_sale · lý do `pos_tu_choi_ghi:<TênLỗi>`
```

**`TAP_TIEN_IN = [0, 1]` là số ĐO ĐƯỢC, không phải số đoán** — bảng 14 mã đã xác minh
(`luoc-do-v1.md` §7.2, 3.546 đơn/7 shop, đọc bằng chính `status_name` của API POS):
`0 = new` (Chờ xác nhận) · **`1 = submitted`** (Đã gửi/đã duyệt). Mã 8 = `packing` là một
bước TIẾN nhưng vẫn **ngoài** tập tiền-in: đơn đã đóng gói thì không ai được đẩy ngược
về Chờ in.

> 🔴 **NỢ ĐANG MỞ — `TAP_TIEN_IN` rộng hơn bảng cho phép của cửa POS.**
> `src/pos/ma-trang-thai.js#CHUYEN_CHO_PHEP` (L1-M1) chỉ có `0→12` và `12→0`. Cặp
> **`1→12` CHƯA có**, nên ngoài đời ca `live=1` đi vào nhánh «cửa POS ném
> `LoiChuyenNgoaiBang`» ⇒ `cho_sale`, **không phải** `day_cho_in`. Máy trạng thái xử
> đúng (không nuốt lỗi, lý do đọc được trên màn sale), nhưng đó là một đơn phải cho
> người làm tay. Vá = thêm cặp `1→12` vào bảng đã xác minh — **đất phiếu L1-M1, đã ghi
> §9 sổ điều hành**. Cổng ③c và ca test `C5` đo đúng con số đó và sẽ ĐỎ khi ai vá xong
> (đó là lúc quay lại đọc lại mục này).

`tu_choi` = «hủy» theo nghĩa 02 §L3: đơn sang `dong`, đóng dấu `dong_luc`, và **KHÔNG
chạm POS lượt nào** — bảng cho phép của cửa POS không có đường tới 6/7, và luật 2 §0a sổ
điều hành cấm xoá đơn POS ở mọi trạng thái. Hủy trên POS là việc NGƯỜI.

## 4 · Job quét — `quetDonMoi` / `batDauQuet`

```js
await quetDonMoi(pool, { gioiHan }, { guiTinMau, tranThuLai, tenMau });
const dung = batDauQuet(pool, { nhipMs }); // nhipMs > 5' ⇒ ném ngay lúc khai
```

- Quét **CHỈ** `nguon='trang_ban_hang'` (vế này là vế không được rơi ra khi ai chép câu
  `CAU_QUET` đi) ở `trang_thai_he='moi_tu_pos' AND trang_thai_pos='0'`, cộng đơn
  `gui_wa_loi` còn trong trần thử lại.
- `NHIP_QUET_MS = 4 phút`, trần khai `TRAN_QUET_MS = 5 phút` (02 §L3 «trong vòng 5 phút»).
- **Rebind ctx PER-ĐƠN**: lượt quét dùng một câu RAW (không có team nào để scope trước),
  rồi **mỗi đơn** mang `team_id` của CHÍNH nó vào mọi lượt ghi + `nhat_ky` kế tiếp. Lý do
  đo được: 26/26 đơn thật đang ở team KỸ THUẬT `chua-phan`, mà ctx NGƯỜI bị chặn trên
  team kỹ thuật ⇒ không tồn tại ctx người hợp lệ để chạy job này.
- **Một đơn hỏng không làm hỏng cả lô** — đơn lỗi nhánh (`LoiSaiNguonDon`,
  `LoiDonKhongThuocTeam`) được LIỆT KÊ ra `kq.donSaiNhanh` rồi đi tiếp.
- Trả về bảng đếm `{ quet, daGui, hong, quaTran, saiNhanh, theoLyDo, donSaiNhanh }`.

### Ba lý do không gửi — cột `ly_do_khong_gui` (migration 004)

| lý do            | khi nào                                    | cửa WA có bị gọi không |
| ---------------- | ------------------------------------------ | ---------------------- |
| `thieu_so_wa`    | đơn chưa nối khách, hoặc khách không có số | **KHÔNG** (0 lượt)     |
| `mau_chua_duyet` | cửa WA ném `LoiMauChuaDuyet`               | có                     |
| `loi_kenh`       | mọi hỏng còn lại của đường gửi             | có                     |

Hai ràng buộc ở **tầng CSDL** (không phải quy ước trong code):
`CHECK ly_do_khong_gui IN (ba giá trị)` — thêm lý do thứ tư phải qua một migration; và
`CHECK ly_do_khong_gui IS NULL OR trang_thai_he='gui_wa_loi'` — lý do cũ không đeo bám
sau khi đơn rời trạng thái thất bại (nếu không, mọi phép đếm theo lý do đọc ra số cao
hơn sự thật). `so_lan_thu_wa integer NOT NULL DEFAULT 0`; chạm `TRAN_THU_LAI` (mặc định 3) ⇒ `cho_sale` + một dòng `viec_can_xu_ly`.

> ⚠️ **HÔM NAY MỌI ĐƠN THẬT ĐỀU DỪNG Ở `mau_chua_duyet`** — `BANG_MAU_TIN` của cửa WA là
> `Object.freeze({})`, chưa mẫu nào được Meta duyệt (thủ tục WhatsApp Business Account là
> việc NGƯỜI, chưa bắt đầu — `cua-whatsapp-v1.md` §3). Đây là hiện trạng ĐO ĐƯỢC, không
> phải bug của job; cấm bịa mẫu «cho chạy được».

## 5 · `viec_can_xu_ly` — A ghi, B đọc (màn L4)

Mọi đường vào `cho_sale` đều kèm **đúng một** dòng `viec_can_xu_ly`
(`loai='don_hang'`, `han_luc = now + 10 phút`) với `ly_do_day` **nguyên văn**, tiền tố =
đúng tên sự kiện để grep được bằng một từ vựng duy nhất:

```
doi_sua: …            khong_ro: …             het_luot_nhac: …
pos_trang_thai_la=8: …          pos_tu_choi_ghi (LoiVanGhiDong): …
qua_tran_thu_lai (3/3) — lý do cuối: loi_kenh
```

`huyLichNhac` được GỌI khi `xac_nhan`/`tu_choi` tới (khách đã trả lời thì lượt nhắc còn
hẹn là tin rác). Bảng `lich_nhac` là **đất L3-M3** — phiếu này KHÔNG đụng, nên mặc định
là một no-op trả `{camChua:false}` **nói ra rằng chưa cắm**; L3-M3 tiêm bản thật vào.

## 6 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l3-m1.sh                         # 7 phép của PHIẾU L3-M1 ④
node --test test/l3-m1-may-trang-thai.test.js test/l3-m1-quet-don.test.js   # 28 ca
```

Cả cổng lẫn test tự dựng CSDL sandbox riêng rồi `DROP DATABASE` khi xong — **không** đo
trên `aicloser_v3` dev (26 đơn thật + dữ liệu của thợ song song ở đó). Không lượt nào
chạm mạng: hai cửa ngoài (WhatsApp, POS) đều đi qua `deps`.

**Chưa đo được ở lượt này (nói thẳng, đừng để người sau tưởng đã đủ):** gửi WhatsApp
THẬT (endpoint chưa chốt — §7b **T1**) và ghi ngược POS THẬT (§7b **T2**, cần
`V3_POS_GHI=1` + đơn nháp). Cổng in `⏸ HOÃN` cho hai nhánh đó, không giả xanh.

---

## 7 · HAI TRONG «BỐN CỬA KIỂM» CHỐNG TRÙNG — hợp đồng cho L3-M4 (phiếu L3-M2, 23/08)

`hang_cho_tao_don.cua_kiem` (jsonb) giữ kết quả bốn cửa. L3-M2 cấp **hai** cửa; hai cửa
còn lại là đất L3-M4. Import từ cùng một chỗ:

```js
import {
  kiemTrung,
  chamTiLeHoan,
  chamTang,
  chuanHoaSdt,
} from "../../src/orders/index.js";
```

### 7.1 · Cửa #1 — `kiemTrung` (lọc trùng CHÉO hai luồng)

```ts
kiemTrung(pool, ctx, { soDienThoai, sanPhamId?, keo_ngay?, teamId? })
  → { trung, don[], nguon_trung, ly_do, sdt_chuan, so_don_xet, chamTran }
```

- `ctx` = ctx NGƯỜI (mang `teamId`) **hoặc** `ctxHeThong()` **cộng** `teamId` tường minh.
  Thiếu bối cảnh ⇒ **NÉM** `LoiThieuBoiCanhTeam`, không trả «không trùng» (một kết quả
  rỗng vì gọi sai trông y hệt một kết quả sạch).
- `sanPhamId` = mã biến thể POS `"<shop_id>:<variation_id>"`, cùng khoá `san_pham.ma`.
- `keo_ngay` mặc định **7** (đo: bắt 17/20 cặp trùng chéo thật, còn p75 nhịp mua lại của
  cùng một khách là 12,16 ngày ⇒ cửa sổ nằm DƯỚI nhịp mua lại, không nuốt lượt mua lại).
- `nguon_trung` ∈ `trang_ban_hang` | `messenger` | `ca_hai` | `null`.
- `ly_do` — **tập đóng**, grep theo đúng năm chuỗi này (`LY_DO_TRUNG`):

  | `ly_do`                       | `trung` | nghĩa                                                           |
  | ----------------------------- | ------- | --------------------------------------------------------------- |
  | `chua_co_sdt`                 | false   | khách Messenger giữa chừng chưa đưa số — **cửa CHƯA phán được** |
  | `sdt_khong_doc_duoc`          | false   | có chuỗi nhưng không còn chữ số nào                             |
  | `khong_trung`                 | false   | đã tra, không đơn nào khớp                                      |
  | `trung_khop_san_pham`         | true    | trùng ĐÃ XÁC MINH: cùng khách + cùng SP + trong cửa sổ          |
  | `nghi_trung_chua_ro_san_pham` | true    | cùng khách + trong cửa sổ, **vế SP không đọc được**             |

⚠️ **Hai giá trị `true` KHÔNG được gộp.** `nghi_trung_chua_ro_san_pham` là fail-CLOSED:
đơn trong CSDL chưa khai sản phẩm (hoặc lượt gọi không biết mình hỏi SP nào), hệ **không**
đọc cột rỗng thành «khác SP ⇒ sạch». L3-M4 hiện lý do NGUYÊN VĂN cho sale.

⛔ `trung: true` **không phải một lệnh chặn** — nó là một kết quả. Ai chặn, chặn thế nào
là quyết định của L3-M4 + người.

### 7.2 · Cửa #2 — `chamTiLeHoan` (chấm tỉ lệ hoàn, BỐN TẦNG)

```ts
chamTiLeHoan(pool, { cauHinh? })        // job đêm, mọi team
chamTiLeHoanMotTeam(pool, { teamId, cauHinh?, moc? })
chamTang(tiLePhanTram, soDonKet, cauHinh?) → tên tầng     // HÀM THUẦN, test được không cần DB
batDauChamDem(pool, { nhipMs? })        // trả hàm dừng
```

L3-M4 **ĐỌC** kết quả ở bốn cột của `khach` (không gọi lại job): `ti_le_hoan` (PHẦN TRĂM
0–100) · `tang_hoan` · `so_don_ket`/`so_don_hoan` (tử/mẫu, để tra ngược) · `cham_hoan_luc`.

| `tang_hoan`   | khoảng        | ghi chú                                                         |
| ------------- | ------------- | --------------------------------------------------------------- |
| `chua_du_don` | —             | **không phải tầng** — dưới sàn `toi_thieu_don_ket` (mặc định 2) |
| `tot`         | [0 %, 15 %)   |                                                                 |
| `binh_thuong` | [15 %, 30 %)  |                                                                 |
| `canh_bao`    | [30 %, 65 %)  | ← đúng vế 01 §11 gọi tên («144 khách bị gộp nhầm»)              |
| `rui_ro_cao`  | [65 %, 100 %] |                                                                 |

⛔⛔ **KHÔNG có nhánh chặn nào trong v3 đọc `tang_hoan`** — 01 §11 xếp «chặn cứng khách
hoàn cao» vào bảng ĐÃ QUYẾT KHÔNG LÀM, ghi chú **«Chờ chốt»**. Tầng chỉ để ĐỌC. Ai thêm
một `if (tang === 'rui_ro_cao') return chan()` là tự ký một quyết định chưa ai ký.

### 7.3 · Hai chỗ CHƯA đủ (đọc trước khi tin kết quả)

1. **`don_hang.khach_id` = 0/26 trên dữ liệu thật** — cửa POS chưa tạo hồ sơ `khach`
   (`khach` có **0 dòng**, đo 23/08 trên `aicloser_v3`). Cả hai cửa đều nối qua cột đó,
   nên hôm nay chúng chạy đúng nhưng ra tập RỖNG trên dữ liệu thật. Nợ §9, đất L1-M1.
2. **`don_hang.san_pham_ma` chưa có người ghi** — POS THẬT có sẵn (`items[].variation_id`
   trên 4.935/5.144 đơn), chỉ thiếu lượt ghi ở `src/pos/doc-don.js`. Nợ §9, đất L1-M1.

Đo lại cả hai bằng `bash ops/bin/nghiem-thu/l3-m2.sh` (13 phép, 2 mục in `⏸ HOÃN`).

---

## §lịch-nhắc · HÀNG ĐỢI NHẮC + BỘ ĐỌC Ý — chỗ chờ ở §5 đã CẮM THẬT (phiếu L3-M3, 23/08)

`huyLichNhac` ở §5 (mặc định no-op `{camChua:false}`) nay có bản THẬT:
`src/orders/lich-nhac.js` + `src/orders/doc-y.js` + `src/orders/nhan-phan-hoi-wa.js`, cùng
import từ `src/orders/index.js`.

```js
import {
  datLichNhac, // (pool, ctx, {donId}, deps) — đặt lịch đầu tiên, idempotent
  quetLichNhac, // (pool, tuyChon, deps) — MỘT lượt quét (bước ①+②, xem dưới)
  batDauQuetLich, // (pool, {nhipMs?}, deps) — job định kỳ, unref()
  taoHuyLichNhac, // (pool, {job?}) => huyLichNhac(donId) — bản THẬT để tiêm vào nhanPhanHoi
  docY, // (text, {ngonNgu?}) => {ket_qua, do_tin} — HÀM THUẦN, 4 nhánh
  nhanPhanHoiWa, // (pool, ctx, {donId, text}, deps) — cầu nối trọn vòng
  CACH_NHAC_MS,
  TRAN_NHAC,
  MAU_NHAC, // 2h · 5 lần · mẫu NHẮC (KHÁC MAU_XAC_NHAN của quet-don-moi.js)
} from "../../src/orders/index.js";
```

### Vì sao KHÔNG có hook tự động trong `quet-don-moi.js` khi đơn vào `da_gui_wa`

Pathspec L3-M3 cấm đụng `may-trang-thai.js`/`quet-don-moi.js`. Nên **"đặt lịch khi đơn vào
`da_gui_wa`" không phải một sự kiện gắn vào lượt chuyển trạng thái** — `quetLichNhac` tự
quét (bước ①): mỗi lượt, nó tìm đơn `trang_thai_he='da_gui_wa'` **CHƯA có bất kỳ dòng
`lich_nhac` nào** rồi tự gọi `datLichNhac` cho đơn đó. Bước ② mới là quét lịch **tới
hạn** để gửi nhắc/báo hết lượt. `batDauQuetLich` chạy cả hai bước mỗi nhịp
(`NHIP_QUET_LICH_MS = 5 phút`). Hệ quả: có độ trễ tối đa một nhịp quét giữa lúc đơn vào
`da_gui_wa` và lúc lịch đầu tiên được tạo — chấp nhận được, cùng bản chất với độ trễ quét
của chính `quet-don-moi.js`.

### Chu kỳ nhắc

`da_gui_wa` (chưa có lịch) → `datLichNhac` tạo dòng `lan_thu=1, hen_luc=+2h, trạng_thái='cho'`
→ tới hạn → gửi qua `guiTinMau(..., tenMau: MAU_NHAC)` (mẫu NHẮC riêng, **không phải**
`MAU_XAC_NHAN` của lượt gửi đầu) → đánh dấu dòng đó `'da_gui'` → `lan_thu < 5` thì tạo dòng
kế tiếp (`lan_thu+1`, `+2h`); `lan_thu = 5` thì gọi `baoHetLuot` thay vì tạo dòng thứ 6.
Mỗi lần nhắc là **một dòng riêng** trong `lich_nhac` (không phải một dòng tự tăng
`lan_thu`) — đếm dòng của một đơn sau khi hết lượt phải đúng **5**, không hơn.

**Lưới an toàn:** nếu lúc quét tới hạn mà đơn đã rời `da_gui_wa` qua đường khác (lịch mồ
côi — hiếm, vì `huyLichNhac` đã huỷ TRONG CÙNG LƯỢT phản hồi), `quetLichNhac` huỷ êm dòng
đó (`huy_ly_do='don_da_roi_da_gui_wa:<trạng_thái>'`), **không gửi**.

### HUỶ NGAY — bù cho hai nhánh `nhanPhanHoi` không tự gọi `huyLichNhac`

`nhanPhanHoi` (L3-M1, đã chốt, gate riêng `l3-m1.sh` ④c `huyGoi=2`) chỉ tự gọi
`huyLichNhac` ở nhánh `xac_nhan`/`tu_choi`. 02 §L3 đòi huỷ ngay cho khách "trả lời giữa
chừng" nói chung — nên `nhanPhanHoiWa` **bù thêm** một lượt gọi `huyLichNhac` cho
`doi_sua`/`khong_ro`. `huyLichNhac` idempotent nên không sợ bị gọi "thừa". Kết quả đo
được: lịch active (`trang_thai='cho'`) của đơn về **0 ngay trong lượt gọi
`nhanPhanHoiWa`**, không chờ `quetLichNhac` chạy tới.

### Cửa ghi hẹp THỨ NĂM (nợ kỹ thuật, đã ghi §9 sổ điều hành)

`suaTheoId` (L0-M2) không hỗ trợ `ctxHeThong()`, mà job quét lịch bắt buộc chạy dưới
`ctxHeThong` (không có người đăng nhập đứng sau một tin WA tự động tới). `lich-nhac.js` tự
có `ghiLich` (UPDATE hẹp, allow-list `trang_thai`/`huy_ly_do`, luôn kẹp `team_id`) — cùng
khuôn `ghiDon` của `may-trang-thai.js`. Đây là cửa hẹp thứ **năm** sau `suaTheoId` gốc,
`suaTheoIdPos` (L1-M1), `ghiDon` (L3-M1), `CAU_GHI_CHAM` (L3-M2/`ti-le-hoan.js`).

### docY — bốn nhánh, luật từ khoá, 0 model

`docY(text, {ngonNgu?}) → {ket_qua, do_tin}` là **hàm thuần** (không pool/await/đồng hồ).
Khớp theo TỪ/CỤM TỪ có biên khoảng trắng (không phải substring trần — "no" không khớp
trong "know"). 0 nhánh khớp hoặc ≥2 nhánh khớp mâu thuẫn ("yes but actually no") đều trả
`khong_ro` — không đoán liều. Bộ từ khoá EN/AR (+ PH) sống trong `TU_KHOA` (export), tự
kiểm khớp `KET_QUA_PHAN_HOI` lúc nạp module (bắt drift ngay, không đợi test).

### Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l3-m3.sh   # 23 phép của PHIẾU L3-M3 ④, tự dựng/dọn sandbox
node --test test/l3-m3-doc-y.test.js test/l3-m3-lich-nhac.test.js test/l3-m3-nhan-phan-hoi-wa.test.js
```

Không lượt nào chạm mạng thật (WA/POS đều spy tiêm qua `deps`). Đo trên
`aicloser_v3_nt_l3m3` (sandbox tự dựng/dọn), **không phải** `aicloser_v3` dev — cổng ⑥b
xác nhận `aicloser_v3` còn 0 dòng `lich_nhac` sau khi chạy.

---

## §hàng-chờ · HÀNG CHỜ TẠO ĐƠN MESSENGER — NĂM cửa + `duyet()` = TẠO ĐƠN POS THẬT (phiếu L3-M4, 23/08)

`donMessengerDaTao` ở §2 nay có người GỌI: `src/orders/hang-cho.js#duyet`. Đây là đường
**DUY NHẤT** của v3 đẻ ra một đơn POS mới. Nguyên tắc gốc §7.3 `TONG-QUAN-HE-THONG.md`:
**«THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM»** — mọi nguồn `unknown` đều đọc là **ĐÓNG**.

```js
import {
  vaoHangCho, // (pool, ctx, {hoiThoaiId, hoSo, convId, tinId, teamId}, deps)
  duyet, // (pool, ctx, {hangChoId, boSung?, teamId, nguoiDuyetId?}, deps)
  loai, // (pool, ctx, {hangChoId, lyDo, teamId, nguoiDuyetId?})
  docHangCho, // (pool, ctx, {hangChoId, teamId}) — màn L4 đọc `cua_kiem` nguyên văn
  chayNamCua, // chạy 5 cửa mà KHÔNG ghi gì (dùng để xem trước / để đo)
  NGUON_CHONG_TRUNG,
  KET_NGUON,
  TRUONG_BAT_BUOC,
  LoiHangChoDaXuLy,
  LoiThieuHangCho,
} from "../../src/orders/index.js";
import {
  taoDon,
  MA_CHO_IN,
  LoiThieuThamChieuSanPham,
  LoiDonDaTao,
} from "../../src/pos/index.js";
```

### 1 · NĂM cửa — `hang_cho_tao_don.cua_kiem` (jsonb) khai đủ, sale đọc được

| khoá trong `cua_kiem.cong` | là gì                                                | `unknown` nghĩa là gì               |
| -------------------------- | ---------------------------------------------------- | ----------------------------------- |
| `1_du_truong`              | tên · SĐT · địa chỉ · SL · tổng (`TRUONG_BAT_BUOC`) | — (thiếu thì liệt kê `thieu_truong`) |
| `2_tien`                   | tổng khớp **ĐÚNG MỘT** `goi_gia` của page            | chưa có bảng giá ⇒ **ĐÓNG**          |
| `3_chong_trung`            | **NĂM** nguồn (dưới)                                  | bất kỳ nguồn nào unknown ⇒ **ĐÓNG**  |
| `4_hang_cho`               | chính dòng này                                        | —                                    |
| `5_tao_don`                | `{da_chay:false}` lúc vào · `{ma_pos,status}` sau duyệt | —                                  |

`cua_kiem.qua_het` (bool) + `cua_kiem.chan_vi` (mảng chuỗi `cua<n>:<lý do>`) là hai thứ
màn L4 hiện cho sale. ⚠️ **Dòng bị chặn là ĐÚNG HÀNH VI, không phải lỗi hệ** — vẽ băng đỏ
«hệ hỏng» ở đây là dạy sale bỏ qua cảnh báo.

### 2 · NĂM nguồn chống trùng (bản cũ §7.3 có BỐN — nguồn (e) là mới)

| nguồn                    | đọc gì                                                        | `unknown` khi              |
| ------------------------ | ------------------------------------------------------------- | -------------------------- |
| `a_so_ai`                | `so_ai` loại `order` của (page, psid), **TRỪ** lượt chốt này  | câu tra hỏng               |
| `b_pos_song`             | **GET đơn thẳng từ API POS** theo `conversation_id`           | timeout · thiếu market/conv |
| `c_trang_thai_hoi_thoai` | `hoi_thoai.trang_thai = 'POST_SALE'`                          | (không) — xem ⚠️ dưới      |
| `d_fb_commerce`          | dấu hiệu đơn ngoài trong `tin_cho_xu_ly.noi_dung` + `ai_noi_gi` | 0 tin đọc được             |
| `e_kiem_trung`           | `kiemTrung` §7.1 (chéo hai luồng)                             | `chua_co_sdt` · hàm ném    |

- **`tinId` KHÔNG phải tham số cho vui.** Nhạc trưởng ghi `so_ai(order)` cho lượt chốt
  **TRƯỚC** khi gọi `vaoHangCho`; không trừ dòng đó ra thì nguồn (a) tự bắt chính nó và
  **mọi** dòng hàng chờ đều báo trùng. `du_lieu_don.tin_id` giữ lại để `duyet()` trừ y hệt.
- **(b) đọc POS SỐNG, KHÔNG đọc gương `don_hang`.** Sale tạo tay 09:00, `docDon` chưa quét,
  09:05 duyệt ⇒ đơn đúp. Gương chỉ là cache tham khảo.
- ⚠️ **(c) mới có MỘT vế.** v3 không có cột nào giữ THẺ SỐ của hội thoại Pancake
  (`ORDER_STOP_TAGS` −1/−2/−3/−11/−12/−20 của bản cũ); cửa Messenger v3 chỉ có `gatThe`
  (ghi), không có đường đọc. Kết quả khai `the_hoi_thoai: "chua_co_cot"`. Vế đó **cố ý
  KHÔNG** tính là unknown-chặn-tất (tính thì mọi dòng chết vĩnh viễn); rủi ro còn lại do
  nguồn (b) phủ trực tiếp và chắc hơn. Nợ §9.

### 3 · `taoDon` — BỐN cửa an toàn (khuôn `ghi-nguoc.js`), `status: 12` TƯỜNG MINH

```
(a) van `V3_POS_GHI`   vắng/≠1 ⇒ LoiVanGhiDong, 0 lượt gọi API   (cùng van với ghi-ngược)
(b) payload đủ         thiếu san_pham_ma/kho_hang/hệ-số-tệ ⇒ LoiThieuThamChieuSanPham
                       shop của mã biến thể ≠ shop kết nối ⇒ chặn (tạo nhầm shop)
                       ⛔ status = 12 «Chờ in», KHÔNG bê `status: 0` của khuôn cũ
(c) idempotent theo hangChoId — BA lớp:
      ① `don_hang_id` đã có ⇒ LoiDonDaTao(lop:'c1')
      ② `duyet()` giữ dòng bằng SELECT … FOR UPDATE suốt lượt
      ③ KIỂM TRƯỚC POST: `nhat_ky` còn `pos_tao_don_bat_dau` MỒ CÔI ⇒ LoiDonDaTao(lop:'c3')
         — lớp DUY NHẤT sống sót qua rollback (nhật ký ghi trên POOL, ngoài giao dịch)
(d) nhật ký hai pha `pos_tao_don_bat_dau` / `pos_tao_don_ket_qua` (bảng CHỈ-INSERT)
```

⚠️ **`variation_id` của POS là UUID, KHÔNG phải số** (đo 23/08: `san_pham.ma` 137/137,
`don_hang.san_pham_ma` 4.581/4.581 phần tử; số thuần = **0**). `tachMaBienThe` siết
`shop_id` là số nhưng giữ `variation_id` NGUYÊN CHUỖI, và payload **không** `Number(...)`
nó — ép kiểu là gửi `NaN` cho mọi đơn thật.

### 4 · `duyet()` — thứ tự BẮT BUỘC, đổi là mở một lỗ tiền

`BEGIN` → `SELECT … FOR UPDATE` dòng hàng chờ **TRƯỚC MỌI VIỆC** → nhận `boSung` → **CHẠY
LẠI đủ cửa ①②③** → `taoDon` → `INSERT don_hang` (`nguon='messenger'`, `trang_thai_pos='12'`)
→ gắn `don_hang_id` → `donMessengerDaTao` (`moi_tu_pos --da_tao--> day_cho_in`) → `so_ai`
→ `nhat_ky` → `COMMIT`. Còn chặn ⇒ ghi lại `cua_kiem` mới, COMMIT, trả `{tao:false,
chan_vi}` — **không ném**, vì bị chặn là kết quả nghiệp vụ chứ không phải sự cố.

`so_ai` của lượt duyệt dùng **neo riêng** `('hang_cho_tao_don:order', hangChoId)` — KHÔNG
dùng `ghiSoAi` của `src/chat/so-ai.js` (neo của nó là `('tin_cho_xu_ly:<loại>', id tin)`,
xài lại với `hangChoId` sẽ ĐỤNG dòng của một tin thật cùng số). Cùng án lệ
`lich_nhac:phan_hoi` của L3-M3.

`loai(pool, ctx, {hangChoId, lyDo})` ⇒ `trang_thai='tu_choi'` + `cua_kiem.ket_thuc.ly_do`.
KHÔNG xoá dòng nào (luật 2 §0a). `duyet` sau `loai` ⇒ `LoiHangChoDaXuLy`.

### 5 · Chỗ đấu trong `src/chat/`

`handler-v3.js` bước **11b**, ngay sau `ghi(LOAI.ORDER, …)` trong nhánh
`state.orderCreatedThisTurn || state.closed`. Tiêm qua `deps.vaoHangCho` +
`deps.depsHangCho`. Một TIN nhiều nhất MỘT dòng hàng chờ (neo `du_lieu_don.tin_id`) — worker
thử lại không nhân đôi.

### 6 · HÔM NAY nó chặn ở đâu (hiện trạng ĐO ĐƯỢC 23/08, không phải bug)

- **`goi_gia` = 0 dòng toàn hệ** (danh mục POS giá 0, nợ L1-M1) ⇒ cửa ② `unknown` cho MỌI
  dòng ⇒ **mọi lượt duyệt bị chặn**. Đó là cách phiếu này sống chung với nợ đó.
- **Kết nối POS tra được cho 112/502 page** (`page.pos_shop_id`); nhãn `page.thi_truong`
  (`KSA`·`Khác`·rỗng) khớp `ket_noi_pos.market` (`Saudi`…) đúng **0/502** ⇒ 390 page cho
  nguồn (b) `unknown` ⇒ ĐÓNG.
- **`kho_hang` (warehouse_id) không có nguồn nào trong v3** ⇒ cửa (b) của `taoDon` ném cho
  tới khi sale `boSung` hoặc có phiếu cấp nguồn.

### 7 · Nghiệm thu — đo lại bằng gì

```bash
bash ops/bin/nghiem-thu/l3-m4.sh          # 62 phép, tự dựng/dọn sandbox; ⏸ 1 HOÃN (§7b T7)
node --test test/l3-m4-hang-cho.test.js test/l3-m4-duyet.test.js   # 44 ca
```

⛔ **Chưa có lượt POST THẬT nào tới POS** — `nap` tiêm ở mọi phép. Phép thật là §7b **T7**
(cần `V3_POS_GHI=1` + người chọn shop; đơn nháp đánh dấu TEST **để nguyên**, luật 2 cấm xoá).
