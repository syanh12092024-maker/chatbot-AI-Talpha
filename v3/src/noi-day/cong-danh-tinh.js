// CỔNG DANH TÍNH — bốn bảng DÙNG CHUNG, đọc thẳng bằng pool.
//
// Vì sao không đi qua tầng truy vấn của A: `team` `nguoi_dung` `vai` `thanh_vien_team`
// KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` (bàn giao tầng truy vấn §6), và chính A dặn
// «B viết truy vấn riêng cho bảng này ở L0-M3 (SQL trực tiếp qua db/ket-noi.js)» — vì việc
// tra "người này thuộc team nào" xảy ra TRƯỚC KHI có bối cảnh team. Con gà và quả trứng.
//
// Cổng này CỐ Ý HẸP: bốn bảng đó, và ĐỌC là mặc định. Bảng khác gọi vào là ném.
//
// ─── NỚI 25/08/2026 (giai đoạn 2, sóng 0) — GHI, ĐÚNG MỘT BẢNG ────────────────────────
// Màn «Cấu hình team» phải thêm/bớt được thành viên, mà `thanh_vien_team` KHÔNG nằm trong
// `BANG_NGHIEP_VU_CHUAN` của A nên không có đường nào khác đi tới nó.
//
// Nới HẸP NHẤT có thể, và khai thẳng ranh giới ở đây thay vì rải rác trong lời gọi:
//   · GHI được: `thanh_vien_team` — và chỉ nó. Đây là bảng CẤP QUYỀN, không phải dữ liệu
//     nghiệp vụ; sửa nó là việc quản trị, không phải việc của bot.
//   · KHÔNG BAO GIỜ ghi được: `team` `nguoi_dung` `vai`. Ba bảng này là danh mục nền —
//     thêm một team hay sửa một mã vai là việc của di trú, không phải của một màn hình.
//     `vai` mà sửa được từ giao diện thì mã vai thành thứ gõ tay lần thứ hai — đúng cái
//     bom hẹn giờ mà `VAI` trong `auth/boi-canh.js` sinh ra để gỡ.
//   · KHÔNG có `sua`. `thanh_vien_team` có `UNIQUE (team_id, nguoi_dung_id, vai_id)`, nên
//     «đổi vai» thật ra là bớt một dòng và thêm một dòng — diễn đạt bằng hai lời gọi rõ
//     ràng hơn một lời gọi `UPDATE` giả vờ là một thao tác nguyên tử mà không phải.
//
// ⚠️ `xoa` ĐƯỢC MỞ ở đây, ngược với nếp «vai B không xoá dữ liệu» của cổng dữ liệu nghiệp vụ.
//    Lý do: rút quyền của một người phải có hiệu lực NGAY. `thanh_vien_team` không có cột
//    `bat`/`hoat_dong` nên không xoá mềm được (thêm cột là đổi lược đồ — đất người A). Luật 2
//    của dự án nói về ĐƠN HÀNG; đây là một dòng cấp quyền, và giữ lại một dòng cấp quyền đã
//    bị thu hồi thì tệ hơn hẳn việc xoá nó. Dấu vết nằm ở `nhat_ky` (chỉ-thêm, không xoá được).

const CHO_PHEP = new Set(['team', 'nguoi_dung', 'vai', 'thanh_vien_team']);
/** Bảng DUY NHẤT cổng này ghi được. Đọc kỹ khối chú thích trên trước khi thêm tên vào đây. */
export const BANG_GHI_DUOC = new Set(['thanh_vien_team']);
const TEN_COT = /^[a-z_][a-z0-9_]*$/;

/** Lỗi có tên cho hai rào ở tầng CSDL, để router dịch ra câu người đọc được thay vì 500. */
export class LoiTeamKyThuat extends Error {
  constructor(teamId) {
    super('Team kỹ thuật (`chua-phan`) không nhận thành viên — nó là chỗ đậu của dữ liệu '
      + 'chưa chốt chủ, cho người vào đó là cho họ nhìn thấy khách của cả ba team.');
    this.name = 'LoiTeamKyThuat';
    this.ma = 'team_ky_thuat';
    this.status = 400;
    this.teamId = teamId ?? null;
  }
}

/**
 * Dịch lỗi Postgres thành lỗi có tên. Trigger `tg_chan_tv_team_ky_thuat` ném
 * `check_violation` (SQLSTATE 23514) — không dịch thì router trả 500 và người dùng đọc được
 * đúng chữ «Internal Server Error» cho một việc họ chỉ cần biết là «chọn nhầm team».
 */
function dichLoiCsdl(e, bang) {
  const van = String(e?.message || '');
  if (e?.code === '23514' && /team ky thuat/i.test(van)) return new LoiTeamKyThuat();
  if (e?.code === '23503') {
    const x = new Error(`${bang}: khoá ngoại không tồn tại (người dùng, team hoặc vai đã bị xoá?).`);
    x.ma = 'khoa_ngoai'; x.status = 400; return x;
  }
  return e;
}

export function taoCongDanhTinh(pool) {
  if (!pool) throw new Error('taoCongDanhTinh: thiếu pool.');

  /** CHẶN TRƯỚC KHI DỰNG CÂU SQL — deny-by-default, đúng án lệ #22 của dự án. */
  function chanGhi(bang, viec) {
    if (!CHO_PHEP.has(bang)) {
      throw new Error(`Cổng danh tính chỉ cho bốn bảng dùng chung, không cho "${bang}".`);
    }
    if (!BANG_GHI_DUOC.has(bang)) {
      throw new Error(`Cổng danh tính CHỈ ĐỌC bảng "${bang}" — ${viec}() chỉ mở cho `
        + `${[...BANG_GHI_DUOC].join(', ')}. Thêm team/người dùng/vai là việc của di trú, `
        + 'không phải của một màn hình.');
    }
  }

  async function doc(bang, dieuKien = {}, thuTu) {
    if (!CHO_PHEP.has(bang)) {
      throw new Error(`Cổng danh tính chỉ cho bốn bảng dùng chung (${[...CHO_PHEP].join(', ')}), không cho "${bang}". `
        + 'Bảng nghiệp vụ phải đi qua tầng truy vấn có chèn điều kiện team.');
    }
    const params = [];
    const ve = Object.entries(dieuKien).filter(([, v]) => v !== undefined).map(([k, v]) => {
      if (!TEN_COT.test(k)) throw new Error(`tên cột không hợp lệ: ${k}`);
      if (Array.isArray(v)) { params.push(v); return `${k} = ANY($${params.length})`; }
      if (v === null) return `${k} IS NULL`;
      params.push(v); return `${k} = $${params.length}`;
    });
    const where = ve.length ? ` WHERE ${ve.join(' AND ')}` : '';
    const order = thuTu && TEN_COT.test(thuTu) ? ` ORDER BY ${thuTu}` : '';
    const r = await pool.query(`SELECT * FROM ${bang}${where}${order}`, params);
    return r.rows;
  }

  return {
    async chon(bang, dieuKien = {}, { sapXep } = {}) { return doc(bang, dieuKien, sapXep); },
    async mot(bang, dieuKien = {}) { return (await doc(bang, dieuKien))[0] || null; },
    async dem(bang, dieuKien = {}) { return (await doc(bang, dieuKien)).length; },
    async them(bang, banGhi = {}) {
      chanGhi(bang, 'them');
      const cot = [];
      const giuCho = [];
      const params = [];
      for (const [k, v] of Object.entries(banGhi)) {
        if (!TEN_COT.test(k)) throw new Error(`tên cột không hợp lệ: ${k}`);
        params.push(v); cot.push(k); giuCho.push(`$${params.length}`);
      }
      if (!cot.length) throw new Error(`them(${bang}): bản ghi rỗng.`);
      try {
        const r = await pool.query(
          `INSERT INTO ${bang} (${cot.join(',')}) VALUES (${giuCho.join(',')})
           ON CONFLICT DO NOTHING RETURNING *`, params,
        );
        // `ON CONFLICT DO NOTHING` → 0 dòng nghĩa là ĐÃ CÓ SẴN, không phải hỏng. Trả về dòng
        // đang có để nơi gọi phân biệt được «vừa thêm» với «vốn đã có» mà không phải đọc lại.
        if (r.rowCount) return r.rows[0];
        return (await doc(bang, banGhi))[0] || null;
      } catch (e) {
        throw dichLoiCsdl(e, bang);
      }
    },

    // KHÔNG mở `sua` — xem khối chú thích đầu file. Đổi vai = xoá một dòng + thêm một dòng.
    async sua(bang) {
      throw new Error(`Cổng danh tính không có \`sua\` (bảng ${bang}). `
        + '`thanh_vien_team` có UNIQUE (team, người, vai) nên đổi vai là xoá một dòng rồi thêm '
        + 'một dòng — gọi xoa() rồi them(), đừng giả vờ đó là một thao tác nguyên tử.');
    },

    async xoa(bang, dieuKien = {}) {
      chanGhi(bang, 'xoa');
      const params = [];
      const ve = Object.entries(dieuKien).filter(([, v]) => v !== undefined).map(([k, v]) => {
        if (!TEN_COT.test(k)) throw new Error(`tên cột không hợp lệ: ${k}`);
        if (v === null) return `${k} IS NULL`;
        params.push(v); return `${k} = $${params.length}`;
      });
      // ⛔ ĐIỀU KIỆN RỖNG = XOÁ SẠCH BẢNG. Chặn to ở đây: một `dieuKien` rỗng thường là biến
      //    `undefined` trôi xuống, không phải ý định thật của ai.
      if (!ve.length) {
        throw new Error(`xoa(${bang}) với điều kiện RỖNG sẽ xoá sạch bảng — từ chối. `
          + 'Truyền điều kiện tường minh (vd { team_id, nguoi_dung_id, vai_id }).');
      }
      const r = await pool.query(`DELETE FROM ${bang} WHERE ${ve.join(' AND ')}`, params);
      return r.rowCount;
    },
    async giaoDich(fn) { return fn(this); },
  };
}
