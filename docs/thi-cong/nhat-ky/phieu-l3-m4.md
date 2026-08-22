# NHẬT KÝ PHIẾU L3-M4 — Hàng chờ tạo đơn luồng Messenger (NĂM cửa + duyệt = tạo đơn POS thật)

**Thợ:** opus · **ngày** 23/08/2026 · **Base** `1865bd8` · **HEAD đầu lượt** `0145a47`
(giữa base và HEAD chỉ có 1 commit của TỔNG: `docs/thi-cong/phieu` + `nhat-ky/*.verdict.yaml`).
Làn 🟥 · phiếu CUỐI của phần việc A · không thợ nào chạy song song (cây là của một mình).

---

## 0 · Mục ⑦ ĐÃ TRA — dán OUTPUT MÁY

Repo này **không có** `docs/thi-cong/SO-NO.md` (`ls docs/thi-cong/` → `PHIEU-MAU.md`,
`SO-DIEU-HANH-THI-CONG.md`, `nhat-ky/`, `phieu/`) — sổ nợ của dây chuyền là **§9 của
`SO-DIEU-HANH-THI-CONG.md`**. Đã đọc trọn §9 (23/08) trước khi code:

- nợ **`goi_gia` giá-0** (L1-M1) — phiếu khai sẵn ở ⑦, cách sống chung: cửa tiền
  `unknown`-là-đóng. Đã thi hành đúng thế, KHÔNG chờ vá.
- nợ **Q1·Q2·Q3 ĐÃ ĐÓNG** bởi VA-Q12 (`khach` 3.218 · `don_hang.khach_id` 3.779/3.784 ·
  `san_pham_ma` có dữ liệu) ⇒ `kiemTrung` chạy THẬT được. Không trùng phiếu, không đè.
- nợ **cửa ghi hẹp thứ 3/4/5** (`suaTheoId` chưa nhận `ctxHeThong`) — phiếu này **KHÔNG đẻ
  cửa hẹp thứ SÁU**: `hang_cho_tao_don` chỉ có đúng một chủ ghi là chính file này, và
  `don_hang` thì đi qua máy trạng thái (`ghiDon`) như cũ.

`V3_POS_GHI` đo lại đầu lượt: **vắng** ở cả `process.env` lẫn `.env` (`grep -c V3_POS_GHI
.env` = 0) ⇒ fail-CLOSED đo được, không phải một lời khai.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code (bước 3 skill) — và 3 chỗ đề bài khai lệch

Đo trên `aicloser_v3` dev 23/08:

| đo                                        | số                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------- |
| `khach` / `don_hang` / trong đó messenger | 3.218 / 3.784 / 2.112                                                                       |
| `goi_gia`                                 | **0 dòng** (đúng chữ phiếu)                                                                 |
| `hang_cho_tao_don` / `so_ai` loại order   | 0 / 0                                                                                       |
| `hoi_thoai` / `page` / `ket_noi_pos`      | 18.790 / 502 / 7                                                                            |
| cặp trùng chéo known-answer VA-Q12        | khách #3057 SĐT `501984606`, đơn `1328205216:68771` (messenger) + `:68769` (trang bán hàng) |

**LỆCH ① — `variation_id` của POS là UUID, KHÔNG phải số.** Bản đầu của `tachMaBienThe`
khớp `^(\d+):(\d+)$` và payload gọi `Number(variationId)`. Đo lại:

```
san_pham.ma            : tổng 137   · số thuần   0 · uuid 137
don_hang.san_pham_ma[] : tổng 4.581 · số thuần   0 · uuid 4.581
```

⇒ bản đầu sẽ **TỪ CHỐI 100% sản phẩm thật** ở cửa (b) với lý do đọc ra là «thiếu
san_pham_ma», và nếu lọt thì gửi `variation_id: NaN` sang POS. Đã sửa: `shop_id` vẫn siết
là số (7/7 shop), `variation_id` giữ **nguyên chuỗi** — đúng như khuôn cũ
`createPancakeOrder` (nó gửi thẳng `it.variation_id` POS trả về, không ép kiểu). Neo bằng
ca `P3` lấy UUID THẬT của cặp `501984606`; đảo-vá xác nhận (mục 5).

**LỆCH ② — không tra được kết nối POS theo «thị trường».** Nguồn (b) cần một `market` để
gọi `layKetNoi`. `page.thi_truong` là nhãn NGƯỜI (`KSA`·`Khác`·rỗng), `ket_noi_pos.market`
là `Saudi`/`UAE`/… Đo độ phủ trên 502 page:

```
qua pos_shop_id : 112     qua tên thị trường : 0     mù : 390     tổng : 502
```

⇒ khoá đúng là `page.pos_shop_id → ket_noi_pos.shop_id`; tên thị trường trúng **0/502**.
`traMarketCuaPage` thử `pos_shop_id` trước, rồi mới thử tên (giữ lại vì không sai, chỉ là
hôm nay chưa trúng), không tra ra ⇒ `unknown` ⇒ ĐÓNG. **390/502 page hôm nay bị chặn ở
nguồn (b)** — đó là fail-CLOSED đúng nguyên tắc, và là một dòng nợ có tên (§9).

**LỆCH ③ — `warehouse_id` KHÔNG có nguồn nào trong v3.** Khuôn cũ học nó từ đơn cũ của page
(`productRef`). v3 không có cột nào giữ. Không phát minh một bộ «học từ đơn cũ» thứ hai
(luật 12 skill) — `taoDon` đòi `kho_hang` tường minh và ném `LoiThieuThamChieuSanPham` khi
thiếu; đường sống hôm nay là sale `boSung`. Nợ §9.

---

## 2 · Đã làm gì

| tệp                                         | việc                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/orders/hang-cho.js` (MỚI)              | `vaoHangCho` · `duyet` · `loai` · `docHangCho` · 5 cửa + 5 nguồn              |
| `src/pos/tao-don.js` (MỚI)                  | `taoDon` BỐN cửa · `dungPayload` (status 12) · `guiTaoDon` · `moCoiTruocPost` |
| `src/orders/index.js` · `src/pos/index.js`  | CHỈ thêm export                                                               |
| `src/chat/handler-v3.js`                    | CHỈ 1 chỗ đấu (bước 11b) + 1 import + 2 dòng deps                             |
| `test/l3-m4-hang-cho.test.js` (25 ca)       | 5 cửa · 5 nguồn dương một mình · neo tinId · loai · **chỗ đấu handler**       |
| `test/l3-m4-duyet.test.js` (19 ca)          | 4 cửa taoDon · payload · idempotent · RACE · boSung · van đóng                |
| `ops/bin/nghiem-thu/l3-m4.sh` (MỚI)         | 62 phép                                                                       |
| `docs/v3/ban-giao/may-trang-thai-don-v1.md` | CHỈ append §hàng-chờ                                                          |

### Quyết định tự chốt, nói ra theo luật 13 skill

1. **Nguồn (c) chỉ có MỘT vế, và tôi CỐ Ý không đọc vế thiếu thành `unknown`.** v3 không có
   cột nào giữ thẻ số của hội thoại Pancake (`ORDER_STOP_TAGS` của `conv-owner.js`); cửa
   Messenger v3 chỉ có `gatThe` (ghi). Nếu tính vế đó là `unknown` thì theo luật
   «unknown = đóng» **mọi** dòng hàng chờ sẽ chết vĩnh viễn và tính năng thành vô dụng ngay
   ngày đầu. Chọn: dùng `hoi_thoai.trang_thai='POST_SALE'` làm vế đo được, khai thẳng
   `the_hoi_thoai: "chua_co_cot"` trong `cua_kiem` (mù-có-nói-ra, án lệ #7), và ghi §9.
   **Giá phải trả:** một hội thoại được sale gắn thẻ «đơn đang xử lý» trên Pancake mà chưa
   có đơn POS nào thì nguồn (c) không bắt được — phần rủi ro đó do nguồn (b) phủ TRỰC TIẾP
   (nó đọc đơn thật, không đọc nhãn), nên tôi chấp nhận.
2. **Cửa mạng POS thứ HAI.** `src/pos/api.js` tự khai là «chỗ DUY NHẤT trong v3 chạm mạng
   của POS», nhưng nó **không nằm trong pathspec ③** (án lệ #25: không tiện tay sửa file
   phiếu khác). Nên `guiTaoDon` tạm sống trong `src/pos/tao-don.js`, trần trụi, một cửa ra
   duy nhất, đếm được. Nợ §9: phiếu sau gộp về `api.js`.
3. **Import SÂU `../pos/api.js#guiDocDon`** cho nguồn (b) — cùng án lệ đã ghi ở
   `src/orders/cua-pos.js:18` (`src/pos/index.js` chỉ export `docDon`, bản QUÉT-VÀ-GHI-DB;
   nguồn (b) cần đúng lượt GET và KHÔNG được ghi gì). Nợ §9 đã có tên từ L3-M1.
4. **`so_ai` của lượt duyệt dùng neo RIÊNG** `('hang_cho_tao_don:order', hangChoId)`, không
   gọi `ghiSoAi` của `src/chat/so-ai.js`: neo của nó là `('tin_cho_xu_ly:<loại>', id tin)`,
   dùng lại với `hangChoId` sẽ **đụng neo của một dòng tin thật cùng số**. Cùng án lệ
   `lich_nhac:phan_hoi` (L3-M3).
5. **Thêm neo idempotent «một TIN, nhiều nhất một dòng hàng chờ»** (`du_lieu_don.tin_id`).
   Không có trong chữ phiếu, nhưng worker L2-M1 CÓ thử lại tin (`so_lan_thu`) và không có
   neo này thì mỗi lượt thử lại đẻ thêm một dòng chờ duyệt giống hệt — sale không cách nào
   biết dòng nào thật.
6. **`duyet` bị chặn thì TRẢ VỀ `{tao:false, chan_vi}`, không ném.** Bị chặn là kết quả
   nghiệp vụ, không phải sự cố; ném thì màn L4 sẽ vẽ băng đỏ «hệ hỏng» cho một hành vi
   ĐÚNG. Chỉ các cửa của `taoDon` (van/payload/idempotent) mới ném — đó mới là bất thường.

---

## 3 · `tinId` — cái bẫy đắt nhất của lượt này

Nhạc trưởng ghi `so_ai(order)` cho lượt chốt **TRƯỚC** khi gọi `vaoHangCho` (khối 11 của
`handler-v3.js`). Nguồn (a) tra chính bảng đó theo `(page_id, psid, loai='order')`. Không
trừ sự kiện của chính lượt này ra thì **mọi dòng hàng chờ tự báo mình trùng** và không đơn
nào duyệt được — một lỗi câm hoàn hảo: cửa chống trùng «hoạt động», log đẹp, 0 đơn ra.

Vá: nguồn (a) loại đúng neo `('tin_cho_xu_ly:order', tinId)`; `du_lieu_don.tin_id` giữ lại
để `duyet()` trừ y hệt ở lượt chạy lại. Đo bằng ca `Ca2` + `F1`; đảo-vá xác nhận (mục 5).

---

## 4 · Ba lỗi THƯỚC tự bắt trong lượt

1. **Bộ ca truyền tên trường ALIAS trong khi `chuanHoaHoSo` ưu tiên tên CHUẨN.**
   `{...HO_SO_DU, qty: 0}` không đổi được gì vì `HO_SO_DU.so_luong` thắng ⇒ 6 ca đỏ vì
   thước sai chứ không phải code sai. Sửa thước, không nới code.
2. **Dọn `goi_gia` ở cuối thân test ⇒ một assert đỏ làm ĐỎ LÂY các ca sau.** Đã chuyển vào
   `finally`. (Cùng họ «nhiễu thứ tự test trên CSDL dùng chung».)
3. **Backtick trong NHÃN của cổng chạy như lệnh shell** — `bash: cua_kiem: command not
found` (án lệ l3-m1 lặp lại). Đã bỏ hết backtick khỏi nhãn.

Và **một lỗi thước cấp cổng**: mỗi khối `node -e` của cổng dùng CHUNG một sandbox, nên
`khach`/`don_hang` khối trước để lại làm `kiemTrung` khối sau báo trùng ⇒ ④/⑤/⑤b đỏ oan.
Vá bằng **cách ly DỮ LIỆU** (mỗi khối một SĐT sinh ngẫu nhiên trong `nen()`), không bằng
thứ tự chạy — thứ tự là thứ sẽ đổi lần sau.

---

## 5 · ĐẢO-VÁ — «đột biến nào KHÔNG đỏ?» (án lệ #19/#29/#30)

Mỗi dòng là một lượt sửa code cho SAI rồi chạy lại bộ ca, sau đó khôi phục:

| đột biến                                                  | kết quả                                   |
| --------------------------------------------------------- | ----------------------------------------- |
| bỏ `FOR UPDATE` khỏi câu giữ dòng hàng chờ                | **D3 (RACE) ĐỎ**, D2 (tuần tự) vẫn xanh ✔ |
| `payload.status` 12 → 0 (bê khuôn cũ)                     | **8 ca ĐỎ** (P1·T4·T5·T6·D1·D2·D3·…) ✔    |
| cửa ③ coi `unknown` là sạch (`qua: duong.length === 0`)   | **D7 + C9 ĐỎ** ✔                          |
| bỏ lớp (c)③ «kiểm mồ côi trước POST»                      | **T6 ĐỎ** ✔                               |
| nguồn (a) không trừ sự kiện của lượt này                  | **Ca · Ca2 · C9 ĐỎ** ✔                    |
| `tachMaBienThe` đòi `variation_id` là SỐ (bản đầu)        | **8 ca ĐỎ** (P3·T4·T5·T6·D1…) ✔           |
| `if (false) await d.vaoHangCho(...)` (gỡ chỗ đấu handler) | **F1 ĐỎ** ✔                               |

Không đột biến nào sống sót ⇒ bộ ca đo ĐƯỜNG ĐI dữ liệu, không đo hình dạng code.

---

## 6 · Kết quả đo

**Cổng `ops/bin/nghiem-thu/l3-m4.sh`: 62 phép ĐẠT / 0 TRƯỢT / 1 HOÃN · rc=0 · 2 lượt liên
tiếp** (sandbox `aicloser_v3_nt_l3m4` tự dựng/tự dọn). Số/danh sách đáng đọc:

- ① `cua_kiem` khai **đủ 5 cửa** + cửa ③ khai **đủ 5 nguồn** (so DANH SÁCH, không so số);
  thiếu trường VẪN vào hàng chờ, gắn đúng `sdt+dia_chi`.
- ② `goi_gia` rỗng ⇒ `cua2:unknown_chua_co_bang_gia`, `duyet` chặn, POST=0; seed 1 gói khớp
  ⇒ cửa mở (`khop_dung_mot_goi`).
- ②b POS timeout ⇒ `cua3:unknown_la_dong: b_pos_song` (POST=0); POS trả **đơn tay mới**
  ⇒ `cua3:trung: b_pos_song` trong khi **gương `don_hang` = 0 dòng** — đúng ca «đọc gương
  là mất cơ chế».
- ③ **6/6 ca nguồn** chặn đúng nguồn + POST=0 (in từng nguồn một).
- ③b **`kiemTrung` chạy THẬT trên `aicloser_v3`** (3.218 khách / 3.784 đơn, **cấm mock**):
  `trung=true · trung_khop_san_pham · ca_hai · 2 đơn` — danh sách đọc được
  `["1328205216:68769/trang_ban_hang","1328205216:68771/messenger"]`; nguồn (e) trong
  `chayNamCua` = `duong`. Phép này **CHỈ ĐỌC**: dev `hang_cho_tao_don` 0/0 và `don_hang`
  3784/3784 trước-sau. Kèm số phủ resolver POS: **112/502**.
- ④ đường lành: POST **1** lượt · `ma_pos=9996001:80777` · `don_hang` **+1**
  `nguon=messenger` · `trang_thai_pos=12` · `trang_thai_he=day_cho_in` · `so_ai` **+1** ·
  hàng chờ `da_duyet` nối đúng `don_hang_id`.
- ⑤ bốn cửa: van vắng ⇒ `LoiVanGhiDong` + **api 0 lượt** + 1 dòng `nhat_ky` bị chặn ·
  `payload.status=12` · duyệt lần hai (tuần tự) ⇒ `LoiHangChoDaXuLy`, POST=0, vẫn **1 đơn** ·
  nhật ký 2 pha **1/1** · mất phản hồi ⇒ **1/0 (mồ côi)** ⇒ lượt tạo lại ⇒
  `LoiDonDaTao:c3`, **POST=0**.
- ⑤b **RACE**: 2 lượt `duyet` SONG SONG ⇒ 1 thành công + 1 `LoiHangChoDaXuLy`, **tổng
  POST = 1**, **1 đơn**.
- ⑤c `boSung`: không bổ sung ⇒ chặn `cua1:thieu_truong: sdt, dia_chi` **+**
  `cua3:unknown_la_dong: e_kiem_trung` (thiếu số thì nguồn (e) cũng chưa phán được — chờ
  ĐÚNG CẢ HAI, «chỉ cửa ①» là một lời khai thiếu), POST=0; có `boSung` ⇒ tạo được đơn,
  payload mang đúng SĐT sale vừa điền.
- ⑥ `loai` ⇒ `tu_choi` + lý do nguyên văn + 1 dòng `nhat_ky`; `duyet` sau `loai` ⇒
  `LoiHangChoDaXuLy:tu_choi`, POST=0, **dòng KHÔNG bị xoá**.
- ⑦ bộ ca gộp (l3-m4 + hồi quy l3-m1·m2·m3 + l2-m1): **161 xanh / 0 đỏ**, rc=0.
  Dev `aicloser_v3`: hàng chờ **0** · đơn **3.784** · khách **3.218** — phiếu này KHÔNG ghi
  một dòng nào vào dev.
- ⑧ ⏸ **HOÃN**: tạo đơn THẬT trên POS = §7b **T7**. `V3_POS_GHI` trên máy này = _(vắng)_.

**Bộ ca riêng:** `l3-m4-hang-cho` **25/25** · `l3-m4-duyet` **19/19**.
**Hồi quy toàn v3** (26 tệp test): **326 ca · 325 xanh · 1 đỏ**. Ca đỏ duy nhất là
`test/l2-m2-handler.test.js` «không cướp diễn đàn (ở tầng handler)» — **CÓ SẴN TRƯỚC lượt
này**, đã khai ở §9 (23/08, thợ L2-M3). Chứng minh bằng A/B: `git stash push --
src/chat/handler-v3.js` (lùi đúng tệp tôi sửa về HEAD) → chạy lại → **đỏ y hệt, cùng tên
ca**; `git stash pop` → như cũ. Không phải hồi quy của L3-M4.

---

## 7 · Cái phiếu này KHÔNG làm (đừng tưởng có)

- **Không** POST một lượt nào tới POS thật. `nap` tiêm ở mọi phép — §7b **T7** mới là phép
  thật.
- **Không** migration mới (chữ phiếu ③). `hang_cho_tao_don` dùng đúng 10 cột có sẵn;
  `thieu_truong`/lý do loại/`tin_id`/`market` đều sống trong `cua_kiem`/`du_lieu_don` jsonb.
  Idempotent **không** dựa vào một UNIQUE mới mà dựa vào ba lớp có thật (dòng · `FOR UPDATE`
  · nhật ký mồ côi) — đảo-vá đo cả ba.
- **Không** có màn/khay cho sale — đó là **L4 của người B**; phiếu này cấp interface
  (`docHangCho`, `cua_kiem.chan_vi`) và khai rõ «dòng bị chặn là ĐÚNG hành vi».
- **Không** tự đọc/ghi `tin_cho_xu_ly` ngoài hai câu SELECT (nguồn (d) + tra `conv_id`).
- **Không** đụng `pancake-orders.js`/`order-bridge.js`/file phẳng `src/` (chỉ ĐỌC khuôn, và
  hai ca test neo NGUYÊN VĂN vào chúng để bắt drift: `FB_COMMERCE` và `status: 0`).
