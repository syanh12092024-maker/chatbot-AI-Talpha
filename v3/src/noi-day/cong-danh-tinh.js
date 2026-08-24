// CỔNG DANH TÍNH — bốn bảng DÙNG CHUNG, đọc thẳng bằng pool.
//
// Vì sao không đi qua tầng truy vấn của A: `team` `nguoi_dung` `vai` `thanh_vien_team`
// KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` (bàn giao tầng truy vấn §6), và chính A dặn
// «B viết truy vấn riêng cho bảng này ở L0-M3 (SQL trực tiếp qua db/ket-noi.js)» — vì việc
// tra "người này thuộc team nào" xảy ra TRƯỚC KHI có bối cảnh team. Con gà và quả trứng.
//
// Cổng này CỐ Ý HẸP: chỉ đọc, chỉ bốn bảng đó. Bảng khác gọi vào là ném.

const CHO_PHEP = new Set(['team', 'nguoi_dung', 'vai', 'thanh_vien_team']);
const TEN_COT = /^[a-z_][a-z0-9_]*$/;

export function taoCongDanhTinh(pool) {
  if (!pool) throw new Error('taoCongDanhTinh: thiếu pool.');

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
    async them(bang) { throw new Error(`Cổng danh tính CHỈ ĐỌC (bảng ${bang}).`); },
    async sua(bang) { throw new Error(`Cổng danh tính CHỈ ĐỌC (bảng ${bang}).`); },
    async xoa(bang) { throw new Error(`Cổng danh tính CHỈ ĐỌC (bảng ${bang}).`); },
    async giaoDich(fn) { return fn(this); },
  };
}
