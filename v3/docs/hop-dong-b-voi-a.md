# HỢP ĐỒNG GIỮA NGƯỜI B VÀ NGƯỜI A

> Người B viết. Đây là **những gì B hứa giao cho A** và **những gì B cần A giao lại**.
> A đọc file này trước khi viết `v3/db/schema.sql` và `v3/src/db/*`.
> Chốt ngày 22/08/2026. Chỗ nào A muốn đổi thì báo — B sửa đúng một file bộ chuyển đổi,
> không phải sửa cả năm module.

---

## 0 · Code v3 nằm ở đâu

`src/` ở gốc repo là **bản đang chạy, phục vụ 51 page khách thật** — không ai đụng.
Toàn bộ code v3 nằm trong thư mục **`v3/`**, và bên trong nó giữ đúng cây thư mục mà
`docs/v3/05-PHAN-VIEC.md` đã ghi:

```
v3/
  db/                  ← A      lược đồ và di trú
  src/db/              ← A      tầng truy vấn
  src/pos/             ← A
  src/channels/        ← A
  src/chat/            ← A
  src/orders/          ← A
  src/queue/           ← A
  src/model/           ← B      lớp model (L1-M4)
  src/auth/            ← B      đăng nhập, team, vai (L0-M3)
  src/audit/           ← B      nhật ký thao tác (L0-M4)
  src/ui/dispatch/     ← B      bảng điều phối (L4-M1, L4-M2)
  testkit/             ← B      bản cài giả để chạy test (không phải file test)
  test/b/              ← B      test của B
  test/a/              ← A      test của A
  docs/                ← chung  hợp đồng và spec
```

**Vì sao `testkit/` tách khỏi `test/`:** bộ chạy test của Node coi **mọi** file `.js`/`.mjs`
nằm dưới một thư mục tên `test/` là file test. Để bản cài giả trong đó thì nó bị chạy như
một bài test rỗng. Nên fake và tiện ích nằm ở `v3/testkit/`.

**`npm test`:** B đã sửa `package.json` ở gốc, đổi `node --test test/` thành
`node --test test/ v3/test/`. Đây là **file dùng chung duy nhất B đụng tới** — hai dòng,
ghi ở đây để A biết mà không phải đi tìm.

---

## 1 · B GIAO CHO A — bối cảnh team (điểm bàn giao #5)

Sau khi đăng nhập, B dựng ra một đối tượng **bối cảnh** và đưa vào mọi lời gọi xuống
tầng truy vấn. A **không tự dựng** đối tượng này, và cũng không đọc `team_id` từ query
string hay body.

```js
// v3/src/auth/boi-canh.js
/**
 * @typedef {Object} BoiCanh
 * @property {string}   nguoiDungId   id người đang đăng nhập
 * @property {string}   tenDangNhap
 * @property {string}   teamId        team ĐANG chọn — điều kiện team lấy từ đây
 * @property {string[]} vai           ['quan_tri'] | ['sale'] | cả hai
 * @property {number}   capLuc        mốc ms lúc phát vé, để A biết vé cũ tới đâu
 * @property {string}   nguon         'phien' (người thật) | 'may' (việc nền, cron, bot)
 * @property {string=}  ip
 */
```

Ba hàm A dùng được ngay:

```js
import { batBuocBoiCanh, boiCanhMay, cuaBoiCanh } from '../auth/boi-canh.js';

batBuocBoiCanh(bc)          // không hợp lệ → NÉM LỖI LoiThieuBoiCanh. Không bao giờ trả rỗng.
boiCanhMay(teamId, lyDo)    // vé cho việc nền: cron, hàng đợi, bot trả lời. nguon='may'
cuaBoiCanh(req)             // Express: đọc req.boiCanh, chưa đăng nhập → ném LoiChuaDangNhap
```

**Luật:** truy vấn không có bối cảnh phải **ném lỗi**, không trả mảng rỗng. Trả rỗng nguy
hiểm hơn — nó trông như "không có dữ liệu" thay vì "gọi sai".

**Việc nền cũng phải có vé.** Bot trả lời khách lúc 3 giờ sáng không có ai đăng nhập, nhưng
vẫn phải đi qua điều kiện team. Đó là việc của `boiCanhMay()` — `nguon:'may'` để nhật ký
phân biệt được người làm và máy làm.

---

## 2 · B GIAO CHO A — lớp model (điểm bàn giao #4)

Một lời gọi duy nhất. A **không** import SDK của nhà cung cấp nào nữa.

```js
import { goiModel } from '../model/index.js';

const kq = await goiModel({
  boiCanh,                 // BẮT BUỘC. Thiếu → ném lỗi
  viec: 'chot',            // 'chot' = tư vấn & chốt (model chính)
                           // 'nen'  = việc nền: mổ hội thoại, đề xuất kịch bản, chạy đêm (model rẻ)
  yeuCau: {                // ĐÚNG hình dạng Anthropic messages.create mà closer.js đang dùng
    system, messages, max_tokens, tools, tool_choice, stop_sequences,
    temperature,           // KHÔNG đặt thì lấy độ ngẫu nhiên cấu hình của team
  },
  nhan: { pageId, custId, lane },   // để ghi Sổ AI, không bắt buộc
});
```

Trả về:

```js
{
  traLoi,          // nguyên bản trả về, ĐÃ quy về hình dạng Anthropic (content[], stop_reason, usage)
  maModel,         // 'kimi-k2.6' — mã model THẬT đã chạy, không phải mã đã cấu hình
  nhaCungCap,      // 'kimi' | 'claude' | 'openai' | 'deepseek'
  token: { vao, ra, cacheDoc, cacheGhi },
  tienUsd, tienVnd,
  daChuyenDuPhong, // true khi nhà chính hỏng và lời gọi này chạy bằng dự phòng
  doNgauNhien,     // temperature thật đã dùng
  msChay,
}
```

`kq.traLoi` **thay thẳng** giá trị `anthropic.messages.create()` đang trả về, nên
`closer.js` · `tools.js` · `classifier.js` dùng nguyên, không sửa một dòng.

### Sổ AI — mã model ghi bằng cách nào

`so_ai` là bảng của A, B không ghi thẳng vào. Thay vào đó, lúc dựng ứng dụng A **tiêm một
cái phễu** vào lớp model:

```js
import { datPheuSoAi } from '../model/index.js';
datPheuSoAi((ban) => ghiSoAi(ban));   // ban = { maModel, nhaCungCap, token, tienUsd, tienVnd,
                                      //         daChuyenDuPhong, doNgauNhien, msChay, nhan, teamId }
```

Tiêm một lần lúc khởi động thì **không lượt nào quên ghi mã model**. Không tiêm thì lớp
model kêu cảnh báo mỗi 100 lượt chứ không im lặng.

**Cột `so_ai` cần có thêm** so với sổ hiện tại (`ai-messages.jsonl`):
`ma_model` · `nha_cung_cap` · `do_ngau_nhien` · `da_chuyen_du_phong` · `tien_usd` ·
`token_cache_ghi`. Thiếu `ma_model` thì sau này **không so được model nào rẻ hơn thật** —
đây là lý do tồn tại của cả lớp model.

---

## 3 · B CẦN A GIAO — cổng dữ liệu (điểm bàn giao #2)

B **không gọi thẳng** xuống cơ sở dữ liệu. Mọi module của B nhận một đối tượng `db` từ
ngoài vào (tiêm phụ thuộc), nên khi A xong tầng truy vấn thì chỉ phải nối đúng một chỗ.

Hình dạng B cần — **đề xuất**, A chốt lại khác thì B sửa đúng file
`v3/src/*/cong-du-lieu.js` cho khớp:

```js
const db = taoTruyVan(boiCanh);        // A cung cấp. Thiếu boiCanh → ném lỗi

await db.chon(bang, dieuKien, tuyChon) // → mảng bản ghi. tuyChon: { sapXep, giamDan, gioiHan, buoc }
await db.mot(bang, dieuKien)           // → một bản ghi hoặc null
await db.dem(bang, dieuKien)           // → số
await db.them(bang, banGhi)            // → bản ghi vừa tạo (đã có id)
await db.sua(bang, dieuKien, thayDoi)  // → số dòng đã đổi
await db.giaoDich(async (db2) => {})   // giao dịch, db2 vẫn gắn điều kiện team
```

Ba điều B trông cậy vào A:

1. **`team_id` do tầng truy vấn tự chèn.** Nơi gọi không được truyền.
2. **Truyền tay `team_id` khác** trong `dieuKien` → **ném lỗi**, không im lặng bỏ qua.
   B cũng chặn ở phía mình một lần nữa (chặn hai lớp) và ghi nhật ký.
3. **`bang` là tên bảng dạng chuỗi**, đúng tên trong `docs/v3/02-KE-HOACH-CODE.md`.
4. **`tuyChon.giamDan`** (bổ sung 22/08 sau khi làm L0-M4): sắp giảm dần. Nhật ký và bảng
   điều phối đều cần "mới nhất trước", mà đảo ở phía B thì phải kéo hết bảng về rồi mới đảo —
   sai ngay khi có phân trang. A không làm thì B đảo phía mình và chấp nhận giới hạn đó.

Trong lúc chờ A, B chạy bằng bản cài giả ở `v3/testkit/db-gia.js` — cùng đúng giao diện
trên, giữ dữ liệu trong RAM. Bản giả **cũng** ném lỗi khi thiếu bối cảnh, nên test của B
kiểm được đúng những tiêu chí nghiệm thu, không phải kiểm cho có.

---

## 4 · B CẦN A GIAO — cột trong lược đồ (điểm bàn giao #1)

### `nguoi_dung` · `vai` · `thanh_vien_team` — dùng chung, không có `team_id`

| Bảng | Cột B cần |
|---|---|
| `nguoi_dung` | `id` · `ten_dang_nhap` (duy nhất) · `mat_khau_bam` · `ho_ten` · `email` · `bat` (bool) · `tao_luc` |
| `vai` | `id` · `ma` (`quan_tri`\|`sale`) · `ten` |
| `thanh_vien_team` | `nguoi_dung_id` · `team_id` · `vai_id` — khoá chính ba cột · một người vào được nhiều team, mỗi team một vai |

`mat_khau_bam` là chuỗi `scrypt$<N>$<r>$<p>$<muối base64>$<băm base64>`. B băm và kiểm,
A chỉ cần cột `text`. **Không có bảng phiên** — B dùng vé ký HMAC, xem mục 6.

### `cau_hinh_model` — mới, có `team_id`

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | | |
| `team_id` | | mỗi team đúng một dòng |
| `chinh_ma_model` `chinh_nha` | text | model tư vấn & chốt |
| `du_phong_ma_model` `du_phong_nha` | text | tự chuyển khi nhà chính lỗi |
| `nen_ma_model` `nen_nha` | text | model rẻ cho việc nền |
| `do_ngau_nhien` | numeric | 0–1, mặc định 0.3 |
| `do_ngau_nhien_nen` | numeric | mặc định 0.1 |
| `khoa_ma_hoa` | jsonb | `{ claude: {...}, openai: {...}, deepseek: {...}, kimi: {...} }` — **đã mã hoá**, xem mục 5 |
| `sua_luc` | timestamptz | B đọc cột này để **nạp nóng**, xem mục 7 |

### `nhat_ky` — có `team_id`, chỉ thêm

| Cột | Ghi chú |
|---|---|
| `id` `team_id` `thoi_gian` | |
| `tac_nhan` | `'nguoi'` \| `'may'` |
| `nguoi_dung_id` | null khi máy làm |
| `hanh_dong` | `'dang_nhap'` `'doi_model'` `'chan_xuyen_team'` `'chuyen_du_phong'` `'dong_viec'`… |
| `doi_tuong_loai` `doi_tuong_id` | ví dụ `'viec_can_xu_ly'` + id |
| `truoc` `sau` | jsonb, giá trị trước và sau khi đổi |
| `ip` `ghi_chu` | |

**A phải chặn `UPDATE` và `DELETE` trên bảng này ở tầng truy vấn.** B chặn thêm ở phía
mình, nhưng chặn ở tầng dưới mới là chặn thật. Chỗ chắc nhất là quyền của người dùng
cơ sở dữ liệu: cấp `INSERT`+`SELECT`, không cấp `UPDATE`/`DELETE`.

### `viec_can_xu_ly` — A ghi, B đọc **và đóng** (điểm bàn giao #3)

Đây là chỗ hai bên dễ dẫm chân nhau nhất, nên chia rõ:

| Cột | Ai ghi |
|---|---|
| `id` `team_id` `loai` (`hoi_thoai`\|`don`) | **A** — lúc bot đẩy việc sang |
| `ly_do` `ly_do_ma` | **A** — lý do bot dừng, ví dụ `khieu_nai`, `doi_tra`, `loi_ky_thuat` |
| `page_id` `cust_id` `conv_id` `don_hang_id` | **A** |
| `tao_luc` `han_luc` | **A** — `han_luc = tao_luc + 10 phút` |
| `trang_thai` | `'cho'` → `'dang_xu'` → `'da_xu'`. **A** đặt `'cho'`, **B** đổi hai bước sau |
| `nhan_boi` `nhan_luc` | **B** |
| `ket_qua` `ket_qua_ly_do` `ghi_chu` | **B** |
| `chi_phi_dong` | **B** — ô ghi chi phí khi đóng đơn |
| `dong_luc` | **B** |

**B không bao giờ `INSERT` vào bảng này, và không bao giờ `DELETE`.** B chỉ `UPDATE` đúng
chín cột ở nửa dưới. Nếu A cần B chèn dòng (ví dụ sale tự tạo việc), báo trước — đó là đổi
hợp đồng, không phải đổi code.

### Bảng B chỉ ĐỌC

`khach` · `hoi_thoai` · `don_hang` · `page` · `san_pham` · `so_ai` — B đọc để dựng màn chi
tiết. B **không ghi** vào bảng nào trong số này.

**Ba tên cột của `so_ai` mà màn chi tiết trông vào — chốt sớm, đây là chỗ dễ trượt nhất
lúc di trú.** Sổ AI hiện tại (`ai-messages.jsonl`) ghi khoá là `page` và `cust`; nếu di trú
giữ nguyên hai tên đó thì đoạn chat trên màn chi tiết **im lặng trống rỗng** — không lỗi,
không cảnh báo, chỉ là không có tin nào. Đã dính thật lúc chạy thử.

| Cột | B trông vào |
|---|---|
| `page_id` `cust_id` | khoá tra đoạn chat của một khách trên một page |
| `thoi_gian` | mốc ms, dùng để sắp và hiển thị (đoán theo `nhat_ky`) |
| `ben` | `'bot'` \| `'khach'` — ai nói |
| `chu` | nội dung tin |
| `lane` `ma_model` | hiện kèm mỗi tin của bot |

B đọc rộng tay vài tên thay thế (`luc`/`tao_luc`/`t` cho thời gian, `noi_dung`/`tin` cho nội
dung, `vai_tro`/`huong` cho bên) để đỡ vỡ lúc chưa chốt — nhưng `page_id`/`cust_id` thì
**không có đường lui**. A đổi tên khác thì báo, B sửa `COT_THOI_GIAN_SO_AI` và hàm tra
trong `v3/src/ui/dispatch/chi-tiet.js`.

---

## 5 · Khoá API mã hoá thế nào

`khoa_ma_hoa` là jsonb, mỗi nhà một mục:

```json
{ "kimi": { "v": 1, "iv": "…base64…", "the": "…base64…", "mat": "…base64…" } }
```

`AES-256-GCM`. Khoá chủ đọc từ biến môi trường **`V3_KHOA_CHU`** (32 byte, base64).
Thiếu biến này thì lớp model **ném lỗi lúc khởi động**, không âm thầm lưu nguyên văn.
Khoá thật không bao giờ đi ra khỏi `v3/src/model/kho-khoa.js`: API trả về cho màn hình chỉ
có `{ daCo: true, duoi: '…a3f9' }` — bốn ký tự cuối để người ta nhận ra mình dán đúng khoá nào.

---

## 6 · Vé đăng nhập — không có bảng phiên

Vé là chuỗi `<payload base64url>.<HMAC-SHA256 base64url>`, ký bằng **`V3_KHOA_VE`**.
Payload: `{ nguoiDungId, teamId, vai, capLuc, hetHan, v }`. Hạn 8 tiếng.

**Vì sao không dùng bảng phiên:** 18 bảng trong kế hoạch không có bảng phiên, và thêm bảng
là đổi lược đồ của A. Vé ký tự chứng thực đủ cho giai đoạn 1 — đổi team là phát vé mới,
đăng xuất là xoá cookie. Đổi vai hoặc khoá tài khoản mà cần cắt vé đang sống ngay lập tức
thì **giai đoạn 2 thêm bảng phiên**; đã ghi vào sổ tay vai B mục "Chỗ tự quyết".

---

## 7 · Đổi model không cần khởi động lại

Tiêu chí nghiệm thu: *đổi model của một team trong cấu hình → lượt chat tiếp theo đi đúng
model mới, KHÔNG phải khởi động lại.*

Cách làm: lớp model giữ bộ nhớ đệm cấu hình theo team với hạn **5 giây**, và mỗi lần ghi
cấu hình thì **xoá đệm của đúng team đó ngay**. Nên trong cùng một tiến trình, đổi xong là
lượt kế tiếp đã đúng. Nhiều tiến trình thì chậm nhất 5 giây — vẫn không phải khởi động lại.

A không phải làm gì cho việc này, chỉ cần `cau_hinh_model.sua_luc` được cập nhật mỗi lần ghi.

---

## 8 · Việc A cần làm để nối vào code của B — **một lời gọi**

```js
import express from 'express';
import { dungPhanB } from './v3/src/vai-b.js';

const app = express();
dungPhanB(app, {
  taoTruyVan,             // BẮT BUỘC · cổng có chèn điều kiện team (mục 3)
  taoTruyVanHeThong,      // BẮT BUỘC · cổng KHÔNG gắn team, chỉ 4 bảng dùng chung (mục 4)
  ghiSoAi,                // để mọi lượt gọi model tự ghi mã model vào Sổ AI (mục 2)
  canhBao,                // nơi nhận báo khi tự chuyển model dự phòng
  express,                // để tự gắn express.json()
});
```

Xong. Không phải nhớ mười hai chỗ tiêm, không phải nhớ thứ tự middleware.

**Vì sao có file này.** Bốn module của vai B cố ý không import lẫn nhau, nên ai dựng ứng
dụng cũng phải nối tay mười hai chỗ. Trong lúc chạy thử 22/08, **cả hai cách nối sai đều đã
xảy ra thật**, và cả hai đều hỏng theo kiểu tệ nhất — im lặng hoặc muộn:

| Nối sai | Hỏng thế nào |
|---|---|
| `lopBoiCanh()` đặt **sau** router đăng nhập | `/api/toi` trả 401 → màn chọn team đá ngược về đăng nhập → **người thuộc nhiều team không bao giờ vào được**, không một dòng lỗi |
| Tiêm **cái chắn đã dựng** thay vì hàm dựng | `Cannot read properties of undefined (reading 'boiCanh')` — nổ giữa lúc có khách bấm, stack trace phun ra trình duyệt |

`dungPhanB` **ném ngay lúc nối** nếu thiếu cổng dữ liệu, và **kêu ra** nếu thiếu phễu Sổ AI
hoặc phễu cảnh báo — thiếu phễu cảnh báo nghĩa là nhà chính hết tiền thì tự chuyển dự phòng
mà không ai được báo, đúng cảnh 06/08/2026.

Muốn nối tay từng chỗ thì vẫn được, mọi hàm `dat…` đều còn xuất ra. Đọc `v3/src/vai-b.js`
để lấy đúng thứ tự.

