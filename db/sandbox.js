// Dựng CSDL SANDBOX từ khuôn trần cho test và cho cổng nghiệm thu — rồi tự dọn.
//
// Vì sao không đo thẳng trên `aicloser_v3`: luật 11 của sổ điều hành (hai thợ không
// chạy test đụng CSDL cùng lúc) và án lệ «script chỉ xanh trên sandbox tay của thợ là
// script không tái chạy được». Mỗi bộ ca có CSDL riêng, tên gắn với mã phiếu.
import pg from "pg";
import { chuoiNoi, taoPool } from "./ket-noi.js";
import { len } from "./migrate.js";

function doiTenCsdl(url, ten) {
  const u = new URL(url);
  u.pathname = `/${ten}`;
  return u.toString();
}

// CHỐNG ĐỤNG NHAU GIỮA CÁC PHIÊN (02/10/2026). Trước đây tên CSDL chỉ theo mã bộ ca (`aicloser_v3_test_var1`) ⇒ hai phiên chạy
// CÙNG bộ ca trên một máy thì phiên sau `DROP … WITH (FORCE)` đúng CSDL phiên trước đang dùng ⇒ ca đỏ GIẢ (đo 02/10: cửa vào LL17a
// đỏ ll5 · ll10 · ll18 rồi chạy lại xanh; phiên CR-02-10b đỏ ll13 · ve1 cùng lúc). Nay tên mang hậu tố TIẾN TRÌNH `_p<pid>` (cổng bash
// cũng vậy: `DB="aicloser_v3_nt_<mã>_p$$"`). Đổi lại: tiến trình bị giết giữa chừng để lại CSDL mồ côi ⇒ `donMoCoi()` chạy trước mỗi
// lần dựng, xoá CSDL hộp cát của tiến trình ĐÃ CHẾT trên máy này. ⚠️ Giả định Postgres hộp cát là của RIÊNG máy này (dev/CI); dùng
// chung một Postgres giữa nhiều máy thì pid của máy khác trông như «đã chết» — đừng trỏ hộp cát của hai máy vào cùng một máy chủ.
export const tenSandbox = (hau, pid = process.pid) => `aicloser_v3_test_${hau}_p${pid}`;
const MAU_HOP_CAT = /^aicloser_v3_(?:test|nt)_.+_p(\d+)$/;
const conSong = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };
export async function donMoCoi(quanLy, { laSong = conSong } = {}) {
  const r = await quanLy.query("SELECT datname FROM pg_database WHERE datname LIKE 'aicloser_v3_%_p%'");
  const chet = r.rows.map((x) => x.datname).filter((t) => {
    const m = MAU_HOP_CAT.exec(t);
    return !!m && Number(m[1]) !== process.pid && !laSong(Number(m[1]));
  });
  for (const t of chet) await quanLy.query(`DROP DATABASE IF EXISTS ${t} WITH (FORCE)`).catch(() => {});
  return chet;
}

export async function dungSandbox(hau, { migrate = true } = {}) {
  const goc = chuoiNoi();
  const ten = tenSandbox(hau);
  const quanLy = new pg.Pool({
    connectionString: doiTenCsdl(goc, "postgres"),
    max: 1,
  });
  try {
    await donMoCoi(quanLy).catch(() => []);   // dọn hỏng không được chặn việc dựng
    await quanLy.query(`DROP DATABASE IF EXISTS ${ten} WITH (FORCE)`);
    await quanLy.query(`CREATE DATABASE ${ten}`);
  } finally {
    await quanLy.end();
  }
  const url = doiTenCsdl(goc, ten);
  const pool = taoPool(url);
  if (migrate) await len(pool, { im: true });
  return {
    ten,
    url,
    pool,
    async don() {
      await pool.end();
      const q = new pg.Pool({
        connectionString: doiTenCsdl(goc, "postgres"),
        max: 1,
      });
      try {
        await q.query(`DROP DATABASE IF EXISTS ${ten} WITH (FORCE)`);
      } finally {
        await q.end();
      }
    },
  };
}
