# [L1-M4a] Lõi lớp model — giao diện chung, bốn nhà, độ ngẫu nhiên, quy giá

## Việc cần làm

Viết **lõi** của lớp model: một giao diện gọi model duy nhất, bốn bản cài nhà cung cấp
(Claude · OpenAI · DeepSeek · Kimi), bảng model kèm đơn giá, và hàm quy token ra tiền.

**KHÔNG làm** (là của module khác, L1-M4b/c):
- Đọc/ghi cấu hình model của team, kho khoá mã hoá → module sau
- Bộ chuyển dự phòng, cảnh báo, phễu Sổ AI → module sau
- Giao diện màn hình "Model AI & khoá" → giai đoạn 2

Module này chỉ trả lời đúng một câu: *cho tôi mã model, khoá, và một yêu cầu — gọi đi rồi
trả về kết quả đã chuẩn hoá kèm token và tiền.* Nó **không biết team là gì**.

## Bối cảnh

- Luồng: L1 — bốn cửa kết nối. Đây là cửa thứ tư.
- Phụ thuộc: không. Làm được ngay, không chờ lược đồ của người A.
- Chạy song song được với: L0-M4 (nhật ký), L0-M3 (đăng nhập)
- Vì sao gấp: người A cần lớp model trước khi vào L2 (điểm bàn giao #4, cuối tuần 1).

## File được đụng — tạo mới hết

- `v3/src/model/loi.js` — lỗi chuẩn của lớp model
- `v3/src/model/bang-model.js` — danh mục model + đơn giá + quy giá
- `v3/src/model/chuan-hoa.js` — quy yêu cầu/kết quả về **một** hình dạng (hình dạng Anthropic)
- `v3/src/model/nha/claude.js` · `nha/kimi.js` · `nha/openai.js` · `nha/deepseek.js`
- `v3/src/model/nha/index.js` — sổ đăng ký bốn nhà
- `v3/src/model/goi-mot-lan.js` — gọi **một** model **một** lần, không dự phòng, không cấu hình
- `v3/test/b/model-bang-gia.test.mjs` · `v3/test/b/model-nha.test.mjs` · `v3/test/b/model-goi-mot-lan.test.mjs`

## File CẤM đụng

- `v3/src/model/index.js`, `v3/src/model/cau-hinh.js`, `v3/src/model/kho-khoa.js`,
  `v3/src/model/du-phong.js`, `v3/src/model/suc-khoe.js` — **của L1-M4b/c, đừng tạo**
- `v3/src/auth/*` · `v3/src/audit/*` · `v3/src/ui/*` — của module khác
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** — bản đang chạy, 51 page khách thật
- `package.json` — **không thêm dependency nào**. Node 20 có sẵn `fetch`.
- `.env`

## Bảng dữ liệu

Không đụng bảng nào. Module này chưa biết cơ sở dữ liệu.

## Code cũ dùng lại — đọc trước khi viết

| File | Lấy gì |
|---|---|
| `src/llm.js` | **Bẫy đã trả giá bằng khách thật:** Kimi k2.6 mặc định BẬT thinking; không tắt thì phần suy nghĩ ăn sạch `max_tokens` và tin trả về **rỗng** (đo thật: `max_tokens=200` → `thinking_tokens=199`, `text=""`). Bản cài Kimi **bắt buộc** gửi kèm `thinking:{type:'disabled'}`. Claude thì không có field này. |
| `src/config.js` dòng 88–103 | Đơn giá Kimi k2.6 (`vào 0.95 · cache đọc 0.16 · ra 4.00` USD/Mtok) và tỉ giá `AI_USD_VND` mặc định **26000** |
| `src/llm-health.js` dòng 20 | Bộ nhận diện **lỗi tầng tài khoản** (hết tiền / sai khoá / bị khoá). Chép nguyên biểu thức `ACCOUNT_ERR` và danh sách status 401/402/403 sang `loi.js` — **chép, không import**: file kia là trạng thái toàn cục của bản đang chạy, nối vào là buộc bot thật vào code v3. Ghi rõ xuất xứ trong ghi chú. |
| `src/economics.js` | Cách quy USD → VND (`Math.round(usd * usdVnd)`) và tại sao đo bằng **tiền mỗi đơn** chứ không phải tiền mỗi tin |

**KHÔNG dùng `@anthropic-ai/sdk`.** Bốn nhà đều gọi bằng `fetch` thẳng. Lý do: lớp model
phải nhận **khoá theo từng team**, mà SDK dựng client một lần theo khoá lúc nạp module —
đúng chỗ hỏng đang muốn sửa. `fetch` cũng làm test không cần mạng.

## Thiết kế bắt buộc

### 1 · Một hình dạng duy nhất — hình dạng Anthropic

`closer.js` · `tools.js` · `classifier.js` (1.962 dòng, **dùng nguyên, không sửa**) đang nói
chuyện bằng hình dạng `messages.create` của Anthropic. Nên hình dạng chuẩn của lớp model
**là hình dạng đó**, và OpenAI/DeepSeek phải được dịch qua lại:

```js
// vào
{ system, messages:[{role,content}], max_tokens, temperature, tools, tool_choice, stop_sequences }
// ra
{ id, model, role:'assistant', content:[{type:'text',text}|{type:'tool_use',id,name,input}],
  stop_reason:'end_turn'|'max_tokens'|'tool_use'|'stop_sequence',
  usage:{ input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } }
```

`chuan-hoa.js` giữ hai chiều dịch cho họ OpenAI:
- `system` → tin đầu `{role:'system'}` · `content` mảng khối → chuỗi (hoặc mảng `parts`)
- `tools` kiểu Anthropic (`{name,description,input_schema}`) → `{type:'function',function:{name,description,parameters}}`
- `tool_calls` trả về → khối `{type:'tool_use', id, name, input}` (nhớ `JSON.parse` `arguments`)
- `finish_reason` `stop|length|tool_calls` → `end_turn|max_tokens|tool_use`
- `usage.prompt_tokens_details.cached_tokens` → `cache_read_input_tokens`

Dịch **không mất mát ở chiều dùng thật**: bốn công cụ của `tools.js` phải chạy qua được cả
hai họ. Có test cho đúng việc đó.

### 2 · Bảng model — `bang-model.js`

Mỗi model một dòng: `{ ma, nha, maGoiApi, giaUsd:{vao,cacheDoc,cacheGhi,ra}, nguonGia, ghiChu }`.
`ma` là mã dùng trong hệ thống và ghi vào Sổ AI; `maGoiApi` là mã gửi cho nhà cung cấp.

Bảy model, số lấy từ `docs/v3/01-QUYET-DINH.md` mục 7 (USD trên **một triệu token**):

| `ma` | `nha` | vào | cache đọc | cache ghi | ra | `nguonGia` |
|---|---|---:|---:|---:|---:|---|
| `claude-haiku-4.5` | claude | 1.00 | 0.10 | 1.25 | 5.00 | `cong-bo` |
| `claude-sonnet-5` | claude | 3.00 | 0.30 | 3.75 | 15.00 | `cong-bo` |
| `claude-opus-5` | claude | 5.00 | 0.50 | 6.25 | 25.00 | `cong-bo` |
| `kimi-k2.6` | kimi | 0.95 | 0.16 | 0.95 | 4.00 | `cong-bo` |
| `kimi-k2.5` | kimi | 0.50 | 0.08 | 0.50 | 2.00 | `suy-nguoc` |
| `gpt-5.6-luna` | openai | 0.215 | 0.0215 | 0.215 | 0.86 | `suy-nguoc` |
| `deepseek-v4-flash` | deepseek | 0.185 | 0.0185 | 0.185 | 0.74 | `suy-nguoc` |

`nguonGia:'suy-nguoc'` nghĩa là đơn giá được **giải ngược** từ cột "đ/tin" của bảng quyết
định, dùng hồ sơ token đo thật (`vào 3.053 · cache đọc 8.390 · ra 167`) và tỉ giá 26.000 —
vì chưa ai mở tài khoản hai nhà đó để lấy bảng giá công bố. Ghi chú trong code phải nói rõ
**phải thay bằng giá công bố khi mở tài khoản** (việc này nằm trong "việc làm song song"
của kế hoạch). Cho phép đè bằng biến môi trường `V3_GIA_<MA_MODEL_VIET_HOA_GACH_DUOI>` dạng
`vao,cacheDoc,cacheGhi,ra`.

Hàm:
```js
layModel(ma)                       // → dòng bảng, không có → ném LoiModelLa
danhSachModel({ nha })             // → mảng
quyTien(usage, ma, { usdVnd })     // → { usd, vnd } · usdVnd mặc định đọc env AI_USD_VND || 26000
dTinThamChieu(ma, { usdVnd })      // → đ/tin theo hồ sơ token đo thật, để đối chiếu bảng quyết định
```

**Test bắt buộc:** `dTinThamChieu` của cả bảy model phải khớp cột "đ/tin" của
`01-QUYET-DINH.md` mục 7 trong sai số **2%**. Bảng giá lệch tài liệu mà không ai biết thì
mọi so sánh model sau này đều sai — test này là cái chuông.

### 3 · Độ ngẫu nhiên — `temperature`

Hiện bản đang chạy **không đặt** `temperature`, chạy mặc định của nhà cung cấp; bot mỗi lượt
trả lời một kiểu nên khó bám kịch bản và khó đo A/B (mục 12 của `01-QUYET-DINH.md`).

`goiMotLan` **luôn** gửi `temperature`. Không truyền thì lấy `MAC_DINH_DO_NGAU_NHIEN = 0.3`.
Kết quả trả về có `doNgauNhien` ghi giá trị thật đã dùng. Chặn giá trị ngoài `[0,1]`.

### 4 · `goi-mot-lan.js`

```js
export async function goiMotLan({ ma, khoa, yeuCau, timeoutMs = 60000, fetchFn = fetch, baseUrl })
// → { traLoi, maModel, nhaCungCap, token:{vao,ra,cacheDoc,cacheGhi}, tienUsd, tienVnd,
//      doNgauNhien, msChay }
```

- Không có khoá → ném `LoiThieuKhoa` **trước khi** gọi mạng
- HTTP không 2xx → ném `LoiNhaCungCap` mang `status`, `maNha`, `thongDiep`, và
  `laLoiTaiKhoan` (true khi 401/402/403 hoặc khớp bộ nhận diện lỗi tài khoản)
- Quá `timeoutMs` → huỷ bằng `AbortController`, ném `LoiHetGio`
- **Không tự thử lại.** Thử lại và chuyển dự phòng là việc của L1-M4c.
- `fetchFn` tiêm được để test chạy không cần mạng

Điểm cuối:
| nhà | URL | xác thực | ghi chú |
|---|---|---|---|
| claude | `https://api.anthropic.com/v1/messages` | `x-api-key` + `anthropic-version: 2023-06-01` | |
| kimi | `https://api.moonshot.ai/anthropic/v1/messages` | như trên | **bắt buộc** `thinking:{type:'disabled'}` |
| openai | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer` | dịch qua `chuan-hoa.js` |
| deepseek | `https://api.deepseek.com/v1/chat/completions` | `Authorization: Bearer` | tương thích OpenAI |

`baseUrl` đè được để trỏ sang máy chủ nội bộ khi cần.

### 5 · Không rò khoá

Khoá API **không bao giờ** đi vào thông điệp lỗi, log, hay kết quả trả về. Có test: gây lỗi
rồi khẳng định chuỗi khoá không xuất hiện trong `err.message` cũng như trong `JSON.stringify(err)`.

## Tiêu chí xong — phải đo được

1. `npm test` xanh (chạy ở `messenger-closer/`, gồm cả `v3/test/`)
2. `dTinThamChieu` bảy model khớp bảng `01-QUYET-DINH.md` mục 7 trong sai số 2% — có test
3. Cùng một `yeuCau` kiểu Anthropic (có `system`, có `tools`) chạy qua **cả bốn** bản cài
   với `fetchFn` giả → cả bốn trả về **cùng một hình dạng** kết quả — có test
4. Bản cài Kimi gửi kèm `thinking:{type:'disabled'}`, bản cài Claude **không** gửi — có test
5. Không truyền `temperature` → thân yêu cầu gửi đi vẫn có `temperature: 0.3` — có test
6. Thiếu khoá → ném `LoiThieuKhoa` và **không gọi mạng** (`fetchFn` giả không được gọi) — có test
7. HTTP 402 → `LoiNhaCungCap.laLoiTaiKhoan === true`; HTTP 500 → `false` — có test
8. Khoá API không xuất hiện trong bất kỳ thông điệp lỗi nào — có test
9. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Cấu hình theo team, kho khoá, nạp nóng (L1-M4b)
- Dự phòng, cảnh báo, phễu Sổ AI (L1-M4c)
- Truyền theo dòng (streaming) — bản đang chạy không dùng
- Đếm token trước khi gọi
