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

export async function dungSandbox(hau, { migrate = true } = {}) {
  const goc = chuoiNoi();
  const ten = `aicloser_v3_test_${hau}`;
  const quanLy = new pg.Pool({
    connectionString: doiTenCsdl(goc, "postgres"),
    max: 1,
  });
  try {
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
