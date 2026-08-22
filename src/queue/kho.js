// KHO của bảng `tin_cho_xu_ly` — bộ đọc/ghi RIÊNG, không đi qua tầng truy vấn L0-M2.
//
// VÌ SAO RIÊNG (cùng tiền lệ `src/pos/ket-noi.js` cho `ket_noi_pos` và
// `ghiCauHinhModel` cho `cau_hinh_model`): câu rút việc của worker cần
// `FOR UPDATE SKIP LOCKED` CỘNG `pg_try_advisory_xact_lock(...)`, hai thứ mà
// `layNhieu/suaTheoId` của tầng chung không có cách nào diễn đạt. Đưa bảng này vào
// `BANG_NGHIEP_VU_CHUAN` rồi lách bằng SQL tay ở chỗ khác thì tệ hơn: hai đường ghi
// cho một bảng, một đường có rào team, một đường không.
//
// LUẬT CỦA KHO NÀY (tự áp, vì không có tầng chung áp hộ):
//   1. Mọi câu ĐỌC/GHI theo team đều kẹp `team_id` tường minh.
//   2. Không có hàm XOÁ. Hàng đợi là sổ, dọn rác là việc của một phiếu khác.
//   3. `team_id` của một tin lấy từ `page.team_id` lúc NẠP (xem `nap.js`), không
//      bao giờ suy lại ở worker — suy lại là mở đường cho tin đổi chủ giữa chừng.
import { ghiNhatKy } from "../db/index.js";

/** Năm trạng thái hợp lệ — khai một chỗ, CHECK ở tầng CSDL là bản sao thứ hai cố ý. */
export const TRANG_THAI = Object.freeze({
  CHO: "cho",
  DANG_XU: "dang_xu",
  XONG: "xong",
  LOI: "loi",
  CHAN_GUARD: "chan_guard",
});

const COT = `id, team_id, page_id, psid, conv_id, cust_id, msg_id, noi_dung,
             trang_thai, so_lan_thu, khoa_worker, ly_do, thoi_diem, sua_luc`;

/**
 * Xếp MỘT tin vào hàng đợi. Idempotent theo UNIQUE (page_id, conv_id, msg_id):
 * vòng poll 6 giây một lần trả lại y nguyên tin cũ, nên `DO NOTHING` là phần
 * KHÔNG được quên — thiếu nó là khách nhận n câu trả lời cho một câu hỏi.
 * @returns {Promise<{them: boolean, id: string|null}>} them=false ⇒ đã có sẵn.
 */
export async function xepTin(pool, tin) {
  const r = await pool.query(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, cust_id, msg_id, noi_dung)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (page_id, conv_id, msg_id) DO NOTHING
     RETURNING id`,
    [
      tin.teamId,
      String(tin.pageId),
      String(tin.psid),
      String(tin.convId),
      String(tin.custId ?? ""),
      String(tin.msgId),
      String(tin.noiDung ?? ""),
    ],
  );
  return { them: r.rowCount > 0, id: r.rowCount ? r.rows[0].id : null };
}

// ── CÂU RÚT VIỆC — HAI KHOÁ, KHÔNG PHẢI MỘT ──────────────────────────────────────
// `FOR UPDATE SKIP LOCKED` khoá DÒNG. Nó chống được «hai worker cùng lấy MỘT tin»,
// nhưng KHÔNG chống được «hai worker cùng lấy HAI tin của CÙNG MỘT hội thoại» — hai
// tin là hai dòng, hai khoá dòng khác nhau, cả hai worker đều rút được. Hậu quả đo
// được trên chính kiến trúc này: hai worker cùng dựng `state` từ một dòng `hoi_thoai`,
// cùng gọi model, khách nhận hai câu trả lời, và `moc_luot_llm` (sổ ngân sách 24h)
// bị hai bên ghi đè lẫn nhau — tức ngân sách lượt trừ SAI theo chiều có lợi cho việc
// đốt token.
//
// Nên khoá thứ hai là `pg_try_advisory_xact_lock(hashtext(conv_id))`: khoá theo HỘI
// THOẠI, giữ tới khi giao dịch kết thúc. Không lấy được ⇒ hàng bị BỎ QUA ngay trong
// câu quét (tin vẫn nằm ở 'cho', không đổi trạng thái, không tăng `so_lan_thu`) và
// worker đi tìm hội thoại khác.
//
// ⚠️ Advisory lock của Postgres dùng chung MỘT không gian khoá cho cả CSDL. CSDL v3
//    hiện chỉ có đúng chỗ này dùng advisory lock (grep `advisory` trong repo). Ai thêm
//    chỗ thứ hai phải đổi cả hai sang dạng hai khoá `(namespace, hashtext(...))`.
const SQL_RUT = `
  UPDATE tin_cho_xu_ly t
     SET trang_thai  = 'dang_xu',
         khoa_worker = $1,
         so_lan_thu  = t.so_lan_thu + 1,
         sua_luc     = now()
   WHERE t.id = (
           SELECT c.id
             FROM tin_cho_xu_ly c
            WHERE c.trang_thai = 'cho'
              AND pg_try_advisory_xact_lock(hashtext(c.conv_id))
            ORDER BY c.id
            FOR UPDATE SKIP LOCKED
            LIMIT 1
         )
  RETURNING ${COT}`;

/**
 * Mở một PHIÊN rút việc. Trả `null` khi không có tin nào rút được.
 *
 * Phiên = MỘT giao dịch mở, vì `pg_try_advisory_xact_lock` chỉ sống trong giao dịch.
 * Đó cũng là cái giá của khoá hội thoại: giao dịch mở suốt lượt gọi model (vài giây).
 * Chấp nhận được vì mỗi worker giữ đúng MỘT kết nối và pool mặc định là 4 — nhưng
 * đừng nâng số worker lên quá `max` của pool, worker thứ 5 sẽ đứng chờ kết nối chứ
 * không phải chờ việc.
 *
 * Người gọi BẮT BUỘC kết bằng `ketThuc(...)` hoặc `huy()` — không thì kết nối rò và
 * khoá hội thoại không bao giờ nhả.
 */
export async function moPhienRut(pool, { khoaWorker }) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    const r = await khach.query(SQL_RUT, [String(khoaWorker)]);
    if (!r.rowCount) {
      await khach.query("ROLLBACK");
      khach.release();
      return null;
    }
    const tin = r.rows[0];
    return {
      tin,
      khach,
      /** Chốt trạng thái cuối rồi COMMIT (nhả luôn advisory lock). */
      async ketThuc(trangThai, lyDo = "") {
        try {
          await khach.query(
            `UPDATE tin_cho_xu_ly
                SET trang_thai = $2, ly_do = $3, khoa_worker = NULL, sua_luc = now()
              WHERE id = $1 AND team_id = $4`,
            [tin.id, trangThai, String(lyDo).slice(0, 500), tin.team_id],
          );
          await khach.query("COMMIT");
        } catch (e) {
          await khach.query("ROLLBACK").catch(() => {});
          throw e;
        } finally {
          khach.release();
        }
      },
      /** Bỏ lượt: ROLLBACK ⇒ tin quay về 'cho' NGUYÊN TRẠNG (kể cả `so_lan_thu`). */
      async huy() {
        try {
          await khach.query("ROLLBACK");
        } finally {
          khach.release();
        }
      },
    };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    khach.release();
    throw e;
  }
}

/** Trả tin về 'cho' để thử lại (dùng khi chưa chạm trần `so_lan_thu`). */
export const THU_LAI = "cho";

/** Đếm theo trạng thái — dùng cho cổng nghiệm thu và bảng điều khiển. */
export async function demTheoTrangThai(pool, { teamId } = {}) {
  const r = teamId
    ? await pool.query(
        `SELECT trang_thai, count(*)::int n FROM tin_cho_xu_ly
          WHERE team_id = $1 GROUP BY trang_thai ORDER BY trang_thai`,
        [teamId],
      )
    : await pool.query(
        `SELECT trang_thai, count(*)::int n FROM tin_cho_xu_ly
          GROUP BY trang_thai ORDER BY trang_thai`,
      );
  return Object.fromEntries(r.rows.map((x) => [x.trang_thai, x.n]));
}

/** Đọc lại một tin (cổng nghiệm thu + test đọc `so_lan_thu`/`ly_do`). */
export async function docTinTheoId(pool, id, teamId) {
  const r = await pool.query(
    `SELECT ${COT} FROM tin_cho_xu_ly WHERE id = $1 AND team_id = $2`,
    [id, teamId],
  );
  return r.rows[0] || null;
}

/**
 * Ghi nhật ký một lượt worker — dùng CHUNG cửa `ghiNhatKy` của tầng L0-M2
 * (`docs/v3/ban-giao/tang-truy-van-v1.md` §5: "cửa RA DUY NHẤT của bảng nhat_ky").
 */
export async function ghiNhatKyHangDoi(
  pool,
  { teamId, hanhDong, tinId, ghiChu, truoc, sau },
) {
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:l2-worker",
    nguoiDungId: null,
    hanhDong,
    doiTuong: "tin_cho_xu_ly",
    doiTuongId: String(tinId),
    truoc,
    sau,
    ghiChu,
  });
}
