// Đường nối tới Postgres v3. MỘT chỗ đọc chuỗi nối, một chỗ duy nhất.
//
// ⛔ Chỉ đọc `DATABASE_URL_V3` (.env dòng 80 — container `talpha-pg`, cổng 5433).
//    Không rơi về `DATABASE_URL` hay localhost mặc định: hai CSDL khác của máy này
//    đang nằm ở 5544 và 5434, một cú rơi im lặng là ghi nhầm dự án khác.
//
// ══ BỘ ĐỌC `.env` DÙNG CHUNG (GL9 ② 2) ══════════════════════════════════════════════════
// `docTepEnv(ten, goc)` là chỗ DUY NHẤT mã prod đọc tệp `.env`: `docEnv` dưới (DATABASE_URL_V3), `src/queue/nap.js#docEnvTuyetDoi`
// (PANCAKE_READONLY — lớp chặn cuối của van gửi `handler-v3.js#vanGuiDangMoTuyetDoi`, van nguồn `nguonDangMo`) và
// `src/pos/moi-truong.js#docBien` (V3_KHOA_MA_HOA) cùng gọi nó. Nó CHỈ tra tệp — ưu tiên `process.env`/env tiêm nằm ở từng người gọi.
// Đọc bằng `util.parseEnv` ⇒ CÙNG giá trị với `node --env-file` (hai unit prod chạy bằng cờ đó — `deploy/setup.sh`). Bộ đọc tay
// trước GL9 giữ chú thích: `PANCAKE_READONLY=1   # …` ⇒ "1   # …" ⇒ `!== "1"` ⇒ van MỞ (fail-OPEN). So với bộ cũ, `parseEnv` (và
// `--env-file`): bỏ chú thích đuôi (đích của GL9) · cắt cả `#` DÍNH khi giá trị không bọc nháy (`abc#def` ⇒ "abc" — giá trị có `#`
// phải bọc nháy; prod chạy `--env-file` vốn đã đọc như vậy, chỉ script tay không cờ mới từng thấy "abc#def") · gỡ nháy cả khi có đuôi
// sau nháy đóng · nhận `export K=` · `\n` trong nháy kép thành xuống dòng. Hai khác biệt nữa phải biết (đo node 24.19, khớp
// `--env-file`; ca `test/gl9-doc-env`):
//   (a) khoá TRÙNG: bộ cũ lấy dòng ĐẦU, `parseEnv` lấy dòng CUỐI;
//   (b) nháy HỞ (`A="abc`; cả `'` và `` ` ``) mà ở dưới còn một dấu nháy CÙNG LOẠI ⇒ nuốt mọi dòng tới dấu đó ⇒ khoá ở giữa biến
//       mất (bộ cũ vẫn thấy; không có dấu đóng thì không nuốt — giá trị là chữ `"abc`) ⇒ khoá có dòng `<ten>=` trong tệp mà
//       `parseEnv` không trả ⇒ NÉM «.env hỏng quanh <ten>» (fail-CLOSED cho van), không trả `undefined`.
// Thiếu tệp — CHỈ `ENOENT` — ⇒ `undefined` (như cũ). Lỗi khác (EACCES, `util.parseEnv` vắng ở node cũ, …) NÉM: với PANCAKE_READONLY,
// nuốt lỗi thành «vắng biến» là MỞ van.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { fileURLToPath } from "node:url";

export const GOC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Tệp có một dòng KHAI `<ten>=` (bỏ qua dòng chú thích) — để phân biệt «khoá vắng» với «khoá bị nháy hở nuốt». */
function coDongKhai(raw, ten) {
  const t = String(ten).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^[ \\t]*(?:export[ \\t]+)?${t}[ \\t]*=`, "m").test(raw);
}

/**
 * Giá trị của `ten` trong `<goc>/.env` — `string` (kể cả `""`) hoặc `undefined` khi tệp không có khoá / không có tệp.
 * CHỈ tra tệp, không nhìn `process.env`. Ném khi tệp đọc lỗi khác ENOENT, hoặc khoá có dòng khai mà bộ đọc không thấy (đầu tệp).
 */
export function docTepEnv(ten, goc = GOC) {
  let raw;
  try {
    raw = fs.readFileSync(path.join(goc, ".env"), "utf8");
  } catch (e) {
    if (e?.code === "ENOENT") return undefined;
    throw e;
  }
  const bang = util.parseEnv(raw);
  if (Object.hasOwn(bang, ten)) return bang[ten];
  if (coDongKhai(raw, ten)) throw new Error(
    `.env hỏng quanh ${ten}: tệp có dòng «${ten}=» mà bộ đọc (như node --env-file) không thấy — thường do một dấu nháy mở chưa ` +
      "đóng ở dòng trên. Sửa .env; không đoán giá trị.",
  );
  return undefined;
}

// Đọc .env theo kiểu CHỈ-ĐỌC, không nạp vào process.env của cả tiến trình để tránh
// đè biến người gọi cố ý đặt (test dựng CSDL sandbox riêng bằng biến môi trường).
// `process.env` có giá trị (truthy) thì thắng; rỗng/vắng ⇒ tra tệp.
function docEnv(ten) {
  if (process.env[ten]) return process.env[ten];
  return docTepEnv(ten) ?? "";
}

export function chuoiNoi() {
  const url = docEnv("DATABASE_URL_V3");
  if (!url) {
    throw new Error(
      "Thiếu DATABASE_URL_V3 (.env hoặc biến môi trường). Không đoán chuỗi nối — " +
        "máy này còn CSDL của dự án khác ở cổng 5544/5434.",
    );
  }
  return url;
}

// NGƯỜI NGHE LỖI (GL9 ② 1). Postgres cắt kết nối (restart, `pg_terminate_backend`, 57P01 — đo 10/10 trên prod: `unattended-upgrade`
// dừng postgresql ⇒ worker thoát 1 vì `Unhandled 'error' event`) thì pg phát 'error' ở MỘT trong hai chỗ, và chỗ nào không ai nghe là
// tiến trình chết:
//   (i)  client RỖI trong pool — `pg-pool` chuyển lỗi lên POOL (`idleListener`) ⇒ `pool.on('error')`;
//   (ii) client ĐANG MƯỢN mà đứng giữa hai truy vấn (worker giữ client + BEGIN suốt lượt gọi model — `kho.js#moPhienRut`; `hang-cho.js#duyet`
//        giữ client qua cuộc gọi POS) — `pg-pool` GỠ `idleListener` lúc cho mượn ⇒ lỗi phát trên chính CLIENT ⇒ nghe trên TỪNG client
//        (`pool.on('connect')`, mỗi client mới đúng một lần). Client rỗi có cả hai người nghe ⇒ một lỗi in HAI dòng.
// Không thoát, không thử lại: pool tự bỏ client hỏng (rỗi ⇒ `idleListener` gỡ; mượn ⇒ truy vấn kế bị từ chối «not queryable» và
// `release()` thấy `!_queryable` ⇒ gỡ), lượt sau mở kết nối mới. Log chỉ mã pg + câu — KHÔNG in chuỗi nối.
function ghiLoiPg(noi, e) {
  console.error(`[pg] ${noi}: ${e?.code ?? "-"} ${e?.message ?? e}`);
}

export function taoPool(url = chuoiNoi()) {
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  pool.on("error", (e) => ghiLoiPg("client rỗi (pool)", e));
  pool.on("connect", (c) => c.on("error", (e) => ghiLoiPg("trên client", e)));
  return pool;
}

// Chạy một lượt việc rồi ĐÓNG pool — dùng cho script CLI và test.
export async function voiPool(viec, url = chuoiNoi()) {
  const pool = taoPool(url);
  try {
    return await viec(pool);
  } finally {
    await pool.end();
  }
}
