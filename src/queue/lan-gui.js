export class LoiCanDoiChieuGui extends Error {
  constructor() {
    super('Lượt đã bắt đầu gửi; cần đối chiếu kênh trước khi xử lý lại');
    this.name = 'LoiCanDoiChieuGui';
    this.khongThuLai = true;
  }
}

export async function daBatDauGui(pool, tin) {
  const r = await pool.query('SELECT 1 FROM lan_gui WHERE team_id=$1 AND tin_id=$2 LIMIT 1',
    [tin.team_id, tin.id]);
  return r.rowCount > 0;
}

/* ═══ DIỄN TẬP — chạy thật, đo thật, KHÔNG gửi ═══════════════════════════════════════
 *
 * `V3_DIEN_TAP=1`: bot xử lý hội thoại thật, soạn xong tin, GHI VÀO SỔ rồi DỪNG — không
 * một lượt gọi mạng nào tới Pancake. Dùng để đo «hiểu hội thoại · chất lượng tư vấn · độ
 * trễ» trước khi cho chạm khách.
 *
 * Đặt chốt Ở ĐÂY chứ không ở cửa Messenger, vì đây là chỗ DUY NHẤT mọi lượt gửi của đường
 * v3 đi qua (worker bọc cả bốn thao tác: tin · ảnh · ghi chú · thẻ), và cũng là chỗ nội
 * dung định gửi vốn đã được ghi xuống trước khi gọi mạng.
 *
 * ⚠️ DIỄN TẬP THẮNG MỌI CỜ KHÁC. Bật nó thì dù `V3_PANCAKE_GUI=1` cũng không gửi. Một cờ
 *    «giả vờ» mà vẫn có đường bay ra thật thì tệ hơn là không có cờ nào.
 *
 * Trả về `{ ok: true }` giả để vòng xử lý đi tiếp BÌNH THƯỜNG — trạng thái hội thoại, hồ sơ
 * khách, sổ AI đều được ghi như một lượt thật. Đó chính là thứ cần đo. Chỗ duy nhất khác
 * một lượt thật: `provider_id` rỗng, và trạng thái `dien_tap`.
 */
export const dangDienTap = (env = process.env) => env.V3_DIEN_TAP === '1';

/** pool phải độc lập với transaction xử lý tin. Không dùng transaction client. */
export function bocCuaGuiBen(pool, tin, cua, { env = process.env } = {}) {
  let buoc = 0;
  const dienTap = dangDienTap(env);
  return Object.fromEntries(['guiTin', 'guiAnh', 'ghiNote', 'gatThe'].map(loai => [loai,
    async (...args) => {
      const r = await pool.query(
        `INSERT INTO lan_gui(team_id,tin_id,buoc,loai,noi_dung,trang_thai)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,
        [tin.team_id, tin.id, ++buoc, loai, JSON.stringify(args[2]), dienTap ? 'dien_tap' : 'dang_gui']);
      if (!r.rowCount) throw new LoiCanDoiChieuGui();
      const id = r.rows[0].id;
      // DỪNG ĐÚNG Ở ĐÂY. Nội dung đã nằm trong sổ, và không hàm nào của `cua` được gọi.
      if (dienTap) return { ok: true, id: null, dienTap: true };
      try {
        const result = await cua[loai](...args);
        if (result?.ok !== true) throw new LoiCanDoiChieuGui();
        await pool.query("UPDATE lan_gui SET trang_thai='da_gui',provider_id=$2,sua_luc=now() WHERE id=$1 AND team_id=$3",
          [id, result.id == null ? null : String(result.id), tin.team_id]);
        return result;
      } catch (cause) {
        await pool.query("UPDATE lan_gui SET trang_thai='khong_ro',sua_luc=now() WHERE id=$1 AND team_id=$2",
          [id, tin.team_id]).catch(() => {});
        throw new LoiCanDoiChieuGui();
      }
    },
  ]));
}
