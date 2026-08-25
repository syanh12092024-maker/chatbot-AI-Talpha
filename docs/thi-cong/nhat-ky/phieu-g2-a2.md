# NHẬT KÝ PHIẾU G2-A2 — thi hành `PHIEU-B-Y2` (khoá API một bản mỗi nhà)

> Thợ: người A (trục dữ liệu) · 25/08/2026 · nhánh `main`
> Phiếu: `docs/thi-cong/phieu/PHIEU-B-Y2.md` · phương án **(a)** — bảng thứ 22 `khoa_nha`
> Môi trường đo: **VPS 169.58.33.8 · PostgreSQL 16.15** (sandbox tự dựng, tự dọn)

---

## 0 · ĐO LẠI NGUYÊN LIỆU — đề bài đúng hướng, thiếu một nơi đọc

| Đề bài khai | Máy trả về |
|---|---|
| «`khoa_api_ma` NULL ở mọi dòng ⇒ di trú giá bằng KHÔNG» | **`cau_hinh_model` có 0 DÒNG** — còn rẻ hơn |
| Khe migration **008** trống | ✅ `_migrations` = 001…007, `grep 008_` chỉ ra chữ trong phiếu |

**Chỗ phiếu khai thiếu:** pathspec ③ không có `src/chat/model.js`, nhưng file đó
`SELECT ... khoa_api_ma FROM cau_hinh_model` ở dòng 55 và dùng nó làm **cờ fail-CLOSED**
(«team có khoá riêng ⇒ client cũ không phục vụ được ⇒ ném»). Bỏ cột mà không sửa chỗ đó là
ship một hệ vỡ; bỏ luôn cả cái cờ thì team có khoá Kimi riêng sẽ **âm thầm được phục vụ
bằng client Anthropic cũ**. `src/chat/*` nằm trong danh sách file người A được đụng, nên
lượt này gộp vào và khai rõ ở đây.

## 1 · LÀM GÌ

**Migration 008** — bảng `khoa_nha (team_id · nha_cung_cap · khoa_api_ma · sua_luc)`,
`UNIQUE (team_id, nha_cung_cap)`; `cau_hinh_model` **bỏ cột** `khoa_api_ma`.

- Rào `CHECK (khoa_api_ma LIKE 'v1.%')` **đi theo cột** sang bảng mới. Nó là chỗ bắt «code
  quên gọi `maHoa()`» ở tầng CSDL — rơi mất nó thì «đã mã hoá» chỉ còn là lời khai.
- Câu di trú dữ liệu **vẫn viết**, dù hôm nay 0 dòng: migration còn chạy lại trên bản sao
  CSDL cũ, và ở đó cái bug hai-bản có thể đã xảy ra rồi. Hai bản khoá LỆCH nhau thì lấy
  `sua_luc` mới nhất và **`RAISE WARNING`** — chọn hộ trong im lặng là làm mất một khoá mà
  không ai biết.
- Chiều `down` rót ngược từ `khoa_nha` vào **mọi** dòng vai trò dùng nhà đó, và **dựng lại
  rào** — gỡ mà làm mất rào thì lượt `up` sau chạy trên một cột đã hở.

**`db/khoa.js`** — ba cửa, tách theo thứ chúng thật sự cần:

| Cần gì | Hàm | Đòi `V3_KHOA_MA_HOA`? |
|---|---|---|
| Ghi/đổi khoá của một nhà | `ghiKhoaNha` | có |
| Lấy khoá nguyên văn để gọi API | `docKhoaNha` | có |
| Chỉ hỏi «có khoá riêng không» | `coKhoaNha` | **không** |

Tách `coKhoaNha` ra là có chủ đích: câu hỏi «có khoá riêng không» là câu hỏi **định tuyến**,
không phải câu hỏi bí mật. Bản trước kéo cả bản mã vào tiến trình chat chỉ để `if` một cái —
mở rộng bề mặt rò rỉ mà chẳng được gì.

**`src/chat/model.js`** — `layModel` đổi sang `LEFT JOIN khoa_nha` và đọc
`(k.khoa_api_ma IS NOT NULL) AS co_khoa_rieng`. Hành vi fail-CLOSED giữ **nguyên**.

**`khoa_nha` CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN`** — nó chứa khoá, nên chỉ đi qua `db/khoa.js`,
đúng tiền lệ `ket_noi_pos` (002). Vì vậy `src/db/index.js` **không đổi một dòng nào**, dù
pathspec của phiếu có liệt kê nó.

## 2 · LƯỚI MIGRATION (án lệ #7) — chỗ dễ chết nhất của lượt này

`layModel` nằm trên **đường chat sống**. Deploy code trước khi áp 008 thì `khoa_nha` chưa
tồn tại, câu JOIN ném `42P01`, và **mọi lượt trả lời khách chết**. Đúng án lệ K2: *«reader
mới không bọc ⇒ deploy code trước migration = job chết mỗi 3h trên MỌI dự án»*.

Nên bắt đúng mã `42P01` và lui về cột cũ, kèm một dòng **kêu ra** — mù thì phải nói, đừng
câm. Trong cửa sổ deploy đó `cau_hinh_model.khoa_api_ma` vẫn còn, nên đường lui đọc được
đúng thứ cần đọc.

## 3 · MỘT LỖI IM LẶNG BẮT ĐƯỢC DỌC ĐƯỜNG — `npm run migrate` không chạy gì

Đang chạy `node db/migrate.js schema` để sinh lại lược đồ thì nó trả **rc=0 và không in gì**,
tệp không đổi. Đo ra:

```
import.meta.url = file:///Users/syanh/Desktop/Chat%20Bot%20AI/messenger-closer/probe.mjs
argv1           = /Users/syanh/Desktop/Chat Bot AI/messenger-closer/probe.mjs
khớp?           = false
```

Cửa `if (import.meta.url === \`file://${process.argv[1]}\`)` **không bao giờ khớp khi đường
dẫn có DẤU CÁCH** — `import.meta.url` mã hoá `%20`, `process.argv[1]` thì không. Cây làm
việc thật của dự án là `…/Chat Bot AI/messenger-closer`, nên **ở máy đó `npm run migrate` và
`npm run di-tru` thoát 0 mà không làm gì**. Trên VPS (`/opt/aicloser`, không dấu cách) thì
chạy — nên chỗ này lọt suốt từ L0-M1 tới nay.

Đúng hai tệp mắc bệnh (`db/migrate.js` · `db/di-tru/index.js`), cả hai ở `db/` — đất người A.
Vá bằng `laChayTrucTiep()` so **đường dẫn đã giải mã**, không so chuỗi URL ghép tay.

## 4 · CỔNG NGHIỆM THU — lại chết câm, và lại là mốc nền mục

`ops/bin/nghiem-thu/l0-m1.sh` cùng bệnh với `l0-m2.sh` của G2-A1: **6 lời gọi
`docker exec talpha-pg`**, container không còn ở đâu ⇒ cổng `exit 2`. Vá cùng cách (nói
chuyện với CSDL bằng gói `pg` của repo), và thay nốt mốc nền gõ tay 5 tệp «đỏ sẵn» bằng luật
**«0 tệp đỏ»**.

Thêm một cái phải tự sửa: phép cũ «khoá lưu dạng mã hoá» hỏi `cau_hinh_model.khoa_api_ma`.
Sau 008 nó `LOI-PSQL` ⇒ cổng đỏ **vì bảng đổi chỗ, không phải vì khoá lưu sai** — người đọc
cổng sẽ đi tìm nhầm chỗ. Sửa luật thì phải sửa cả thước (án lệ #27).

## 5 · MỘT THƯỚC RỖNG CỦA CHÍNH TÔI, BẮT ĐƯỢC Ở VÒNG ĐO ĐẦU

Vòng đo đầu của ④#1b in:

```
═══ ④#1b · down 008 → up 008 : lược đồ khớp BYTE-FOR-BYTE ═══
KHỚP — 0 dòng cột, 0 khác biệt
```

**«KHỚP» trên 0 dòng là không đo gì** — câu chụp lược đồ của tôi hỏng cú pháp, hai tệp rỗng
thì tất nhiên bằng nhau (án lệ #29). Bản đóng gói trong cổng nay in kèm **SỐ CỘT** và
**TRƯỢT nếu số đó < 100**, để một cái thước rỗng không bao giờ đọc được thành đạt nữa.

## 6 · BẰNG CHỨNG MÁY

```
CỔNG L0-M1 · TỔNG: 59 phép · ĐẠT 58 · TRƯỢT 1
   ✔ cột khoa_api_ma còn lại trên cau_hinh_model = 0
   ✔ ràng buộc UNIQUE trên khoa_nha = 1
   ✔ rào LIKE 'v1.%' đi theo cột sang bảng mới = 1
   ✔ chinh + nen cùng nhà kimi → số bản khoá lưu = 1
   ✔ số ô model dùng nhà kimi = 2
   ✔ số ô đọc ra khoá MỚI sau 1 lượt đổi = 2      ← ④#4, cái lỗi 008 sinh ra để vá
   ✔ vân tay lược đồ đếm 242 cột (thước có đo thật)
   ✔ lược đồ trước ↔ sau round-trip 008 = 242:e3bf0b37c84284f9e03f85664043864f
   ✔ bộ ca cũ: 0 tệp đỏ trên 23 tệp
```

```
npm run migrate trên CSDL trắng: 001→008 áp trọn, «áp mới: 8 · tổng đã áp: 8», rc=0
INSERT khoa_api_ma='sk-tran-trui' → BỊ TỪ CHỐI (rào CHECK còn ăn)
```

Bộ ca (Postgres thật):

```
l0-m1-luoc-do   13 pass / 0 fail   (12 → 13: thêm S7b «đổi khoá một lần đủ cho mọi ô»)
l0-m1-so-ai      7 pass / 0 fail
l0-m2-boi-canh  17 pass / 0 fail
l0-m2-cach-ly   24 pass / 0 fail
l2-m1-nhac-truong · l2-m2-handler · l2-m3-handler · l3-m4-hang-cho · va-r1-van-gui
                 41 pass / 0 fail  ← năm bộ đụng `layModel`, nơi đọc khoá vừa đổi
```

## 7 · ĐỎ CÒN LẠI

`D7` (`test/l0-m1-di-tru.test.js:145`) — **cùng một đỏ với G2-A1**, đã A/B chứng minh là
điều kiện DỮ LIỆU của VPS, không phải hồi quy. Đất L0-M1, ngoài pathspec. Đã ở §9.

## 8 · NGOÀI PHẠM VI — KHÔNG ĐỤNG

- `v3/src/model/*` là đất B. B tự sửa `cau-hinh.js` theo hình dạng mới.
- Thống nhất `V3_KHOA_CHU`(B) ↔ `V3_KHOA_MA_HOA`(A): B tự bỏ bản của B, không phải việc A.
- `do_ngau_nhien CHECK BETWEEN 0 AND 2` giữ nguyên — B nới theo A, đã chốt ở phiếu.
