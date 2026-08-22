// Đường nối tới Postgres v3. MỘT chỗ đọc chuỗi nối, một chỗ duy nhất.
//
// ⛔ Chỉ đọc `DATABASE_URL_V3` (.env dòng 80 — container `talpha-pg`, cổng 5433).
//    Không rơi về `DATABASE_URL` hay localhost mặc định: hai CSDL khác của máy này
//    đang nằm ở 5544 và 5434, một cú rơi im lặng là ghi nhầm dự án khác.
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const GOC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

// Đọc .env theo kiểu CHỈ-ĐỌC, không nạp vào process.env của cả tiến trình để tránh
// đè biến người gọi cố ý đặt (test dựng CSDL sandbox riêng bằng biến môi trường).
function docEnv(ten) {
  if (process.env[ten]) return process.env[ten];
  try {
    const raw = fs.readFileSync(path.join(GOC, ".env"), "utf8");
    for (const dong of raw.split("\n")) {
      const m = dong.match(/^\s*([A-Za-z_0-9]+)\s*=\s*(.*)$/);
      if (m && m[1] === ten) return m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* không có .env thì coi như thiếu biến */
  }
  return "";
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

export function taoPool(url = chuoiNoi()) {
  return new pg.Pool({ connectionString: url, max: 4 });
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
