// CỔNG DỮ LIỆU GIẢ — bản cài trong RAM của giao diện mà người A sẽ giao (điểm bàn giao #2).
//
// KHÔNG PHẢI FILE TEST. Nằm ở `v3/testkit/` chứ không phải `v3/test/` vì bộ chạy test của
// Node coi mọi file .js/.mjs dưới một thư mục tên `test/` là bài test, và sẽ chạy file này
// như một bài test rỗng.
//
// Bản giả này CỐ Ý khắt khe đúng bằng bản thật:
//   · thiếu bối cảnh team          → ném LoiThieuBoiCanh, KHÔNG trả mảng rỗng
//   · truyền tay team_id của team khác → ném LoiXuyenTeam và gọi phễu nhật ký
//   · bảng `nhat_ky`               → cấm sửa, cấm xoá
// Khắt khe thì test của vai B mới kiểm được đúng tiêu chí nghiệm thu, chứ không phải
// kiểm cho có rồi tới lúc nối vào bản thật mới vỡ.

import {
  batBuocBoiCanh, LoiThieuBoiCanh, LoiXuyenTeam,
} from '../src/auth/boi-canh.js';

/** Ba bảng dùng chung — không có cột team_id, không chèn điều kiện team. */
export const BANG_DUNG_CHUNG = new Set(['team', 'nguoi_dung', 'vai', 'thanh_vien_team']);

/** Bảng chỉ được thêm, không được sửa, không được xoá. */
export const BANG_CHI_THEM = new Set(['nhat_ky', 'so_ai']);

/**
 * Bảng XOÁ ĐƯỢC — phải khớp `BANG_GHI_DUOC` của cổng danh tính thật
 * (`v3/src/noi-day/cong-danh-tinh.js`). Thêm 25/08 khi màn «Cấu hình team» cần rút vai.
 *
 * Bản trước cho `xoa()` ném VÔ ĐIỀU KIỆN, trong khi cổng thật xoá được đúng bảng này. Đó
 * đúng là kiểu lệch mà bài học ① giai đoạn 1 nói tới: bản giả và bản thật nói hai thứ tiếng,
 * và test xanh trên bản giả không chứng minh gì về bản thật. Ở đây bản giả lệch theo chiều
 * KHẮT KHE hơn — nghĩa là nó làm bài test của tính năng mới KHÔNG chạy được, chứ không phải
 * cho một bản hỏng đi lọt. Vẫn phải sửa: bản giả khắt khe sai chỗ thì người ta sẽ sửa CODE
 * cho vừa bản giả, và đó mới là chỗ hỏng thật.
 */
export const BANG_XOA_DUOC = new Set(['thanh_vien_team']);

let _dem = 0;
const idMoi = (bang) => `${bang}_${++_dem}`;

/**
 * Kho dữ liệu trong RAM, dùng chung cho nhiều bối cảnh — giống một cơ sở dữ liệu thật:
 * hai team cùng đọc một kho, tách nhau bằng điều kiện team chứ không bằng hai cái kho.
 */
export class KhoGia {
  constructor(hat = {}) {
    /** @type {Map<string, object[]>} */
    this.bang = new Map();
    /** phễu nhật ký — nơi ghi lại lần chặn xuyên team */
    this.nhatKy = [];
    for (const [ten, ds] of Object.entries(hat)) this.gieo(ten, ds);
  }

  gieo(ten, ds = []) {
    const cu = this.bang.get(ten) || [];
    for (const r of ds) cu.push({ id: r.id ?? idMoi(ten), ...r });
    this.bang.set(ten, cu);
    return this;
  }

  docThang(ten) { return [...(this.bang.get(ten) || [])]; }

  xoaSach() { this.bang.clear(); this.nhatKy.length = 0; }
}

function hop(banGhi, dieuKien) {
  for (const [k, v] of Object.entries(dieuKien || {})) {
    if (v === undefined) continue;
    if (Array.isArray(v)) { if (!v.map(String).includes(String(banGhi[k]))) return false; continue; }
    if (v && typeof v === 'object') {
      // toán tử tối thiểu, đủ cho màn điều phối: { '>=': x }, { '<': y }, { 'khac': z }
      for (const [op, moc] of Object.entries(v)) {
        const a = banGhi[k];
        if (op === '>=' && !(a >= moc)) return false;
        else if (op === '>' && !(a > moc)) return false;
        else if (op === '<=' && !(a <= moc)) return false;
        else if (op === '<' && !(a < moc)) return false;
        else if (op === 'khac' && String(a) === String(moc)) return false;
        else if (!['>=', '>', '<=', '<', 'khac'].includes(op)) throw new Error(`toán tử lạ: ${op}`);
      }
      continue;
    }
    if (String(banGhi[k]) !== String(v)) return false;
  }
  return true;
}

/**
 * Tạo cổng truy vấn đã gắn bối cảnh. Đây là hàm mà người A sẽ thay bằng bản thật —
 * tên và hình dạng giữ nguyên thì đổi một dòng là xong.
 *
 * @param {KhoGia} kho
 * @param {import('../src/auth/boi-canh.js').BoiCanh} boiCanh
 * @param {{ghiNhatKy?:Function}} [tuyChon]
 */
export function taoTruyVanGia(kho, boiCanh, { ghiNhatKy } = {}) {
  if (!kho) throw new Error('taoTruyVanGia: thiếu kho');
  const bc = batBuocBoiCanh(boiCanh);   // ← thiếu bối cảnh là ném ngay tại đây

  const chanXuyenTeam = (bang, teamXin) => {
    const ban = {
      thoi_gian: Date.now(), team_id: bc.teamId, tac_nhan: bc.nguon === 'may' ? 'may' : 'nguoi',
      nguoi_dung_id: bc.nguoiDungId, hanh_dong: 'chan_xuyen_team',
      doi_tuong_loai: bang, doi_tuong_id: null,
      truoc: null, sau: { team_xin: String(teamXin), team_cua: bc.teamId }, ip: bc.ip,
      ghi_chu: `chặn truy cập xuyên team ở bảng ${bang}`,
    };
    kho.nhatKy.push(ban);
    try { ghiNhatKy && ghiNhatKy(ban); } catch { /* nhật ký hỏng không được làm hỏng việc chặn */ }
    throw new LoiXuyenTeam(teamXin, bc.teamId);
  };

  /** Chèn điều kiện team, và chặn nếu nơi gọi tự truyền team_id lệch. */
  const gan = (bang, dieuKien = {}, ghiHay = false) => {
    const dk = { ...dieuKien };
    // Bảng DÙNG CHUNG: KHÔNG tự chèn `team_id` (chúng không có lớp team) — nhưng cũng
    // KHÔNG được XOÁ điều kiện `team_id` nơi gọi truyền tay. `thanh_vien_team` CÓ cột
    // `team_id` và cổng danh tính thật (`v3/src/noi-day/cong-danh-tinh.js`) dựng đúng
    // `WHERE team_id = $1` cho nó.
    //
    // Bản trước `delete dk.team_id` nên mọi câu hỏi «thành viên của team này» trên bản giả
    // đều trả về thành viên của MỌI team. Lệch theo chiều nguy nhất: bản giả DỄ TÍNH hơn
    // bản thật, nên một màn hình rò rỉ thành viên xuyên team vẫn xanh hết bài test.
    // Bài học ① giai đoạn 1, lần thứ ba. (Bắt được nhờ bài test của màn Cấu hình team.)
    if (BANG_DUNG_CHUNG.has(bang)) return dk;
    // `bo_luat_chung` có ĐẶC CÁCH HAI VẾ khi ĐỌC: `(team_id = $ctx OR team_id IS NULL)` —
    // NULL nghĩa là luật TOÀN HỆ, mọi team kế thừa. Cài sẵn trong `veTeamKhiDoc` của tầng
    // truy vấn thật (`src/db/truy-van.js`), và bản giả thiếu nó thì bản toàn hệ TÀNG HÌNH.
    //
    // Lệch theo chiều KHẮT KHE hơn bản thật — không cho bản hỏng đi lọt, nhưng vẫn nguy:
    // màn hình chạy trên bản giả sẽ báo «team chưa có bộ luật nào» trong khi bản thật đang
    // kế thừa một bản toàn hệ, và người ta sẽ sửa CODE cho vừa bản giả. Lần thứ ba của
    // bài học ①.
    if (bang === 'bo_luat_chung' && !ghiHay) {
      dk.team_id = [bc.teamId, null];     // `hop()` hiểu mảng là "một trong các giá trị"
      return dk;
    }
    if (dk.team_id != null && String(dk.team_id) !== bc.teamId) chanXuyenTeam(bang, dk.team_id);
    dk.team_id = bc.teamId;
    return dk;
  };

  // ĐỌC không được đẻ bảng. Trước đây hàm này tự `set(bang, [])` cho bảng chưa có, nên một
  // lượt ĐỌC bảng trống cũng làm kho đổi — bài test "module chỉ đọc thì kho không đổi một
  // byte" bắt được đúng chỗ đó. Bản giả mà đọc-lại-ghi thì nó nói dối về chính thứ nó canh.
  const docDs = (bang) => kho.bang.get(bang) || [];
  const ghiDs = (bang) => {
    if (!kho.bang.has(bang)) kho.bang.set(bang, []);
    return kho.bang.get(bang);
  };

  const cong = {
    boiCanh: bc,

    async chon(bang, dieuKien = {}, { sapXep, giamDan = false, gioiHan, buoc = 0 } = {}) {
      const dk = gan(bang, dieuKien);
      let ra = docDs(bang).filter((r) => hop(r, dk)).map((r) => ({ ...r }));
      if (sapXep) ra.sort((a, b) => (a[sapXep] > b[sapXep] ? 1 : a[sapXep] < b[sapXep] ? -1 : 0));
      if (giamDan) ra.reverse();
      if (buoc) ra = ra.slice(buoc);
      if (gioiHan != null) ra = ra.slice(0, gioiHan);
      return ra;
    },

    async mot(bang, dieuKien = {}) {
      const ra = await cong.chon(bang, dieuKien, { gioiHan: 1 });
      return ra[0] || null;
    },

    async dem(bang, dieuKien = {}) {
      const dk = gan(bang, dieuKien);
      return docDs(bang).filter((r) => hop(r, dk)).length;
    },

    async them(bang, banGhi = {}) {
      const dk = gan(bang, { team_id: banGhi.team_id }, true);   // GHI: không đặc cách
      const moi = { id: banGhi.id ?? idMoi(bang), ...banGhi };
      if (!BANG_DUNG_CHUNG.has(bang)) moi.team_id = dk.team_id;
      ghiDs(bang).push(moi);
      return { ...moi };
    },

    async sua(bang, dieuKien = {}, thayDoi = {}) {
      if (BANG_CHI_THEM.has(bang)) {
        throw new Error(`Bảng ${bang} chỉ được thêm, không được sửa — xem hợp đồng mục 4.`);
      }
      if ('team_id' in thayDoi && String(thayDoi.team_id) !== bc.teamId) chanXuyenTeam(bang, thayDoi.team_id);
      // GHI KHÔNG có đặc cách hai vế: một team chỉ sửa dòng của chính nó, không bao giờ
      // chạm dòng `team_id IS NULL` (luật toàn hệ) — đúng như `suaTheoId` của người A.
      const dk = gan(bang, dieuKien, true);
      let n = 0;
      for (const r of ghiDs(bang)) if (hop(r, dk)) { Object.assign(r, thayDoi); n++; }
      return n;
    },

    async xoa(bang, dieuKien = {}) {
      if (!BANG_XOA_DUOC.has(bang)) {
        throw new Error(`Vai B không xoá dữ liệu (bảng ${bang}). Xem luật 2: không xoá đơn hàng ở bất kỳ trạng thái nào.`);
      }
      // Cùng rào với cổng thật: điều kiện rỗng = xoá sạch bảng, và điều kiện rỗng gần như
      // luôn là một biến `undefined` trôi xuống chứ không phải ý định của ai.
      const khoa = Object.keys(dieuKien).filter((k) => dieuKien[k] !== undefined);
      if (!khoa.length) {
        throw new Error(`xoa(${bang}) với điều kiện RỖNG sẽ xoá sạch bảng — từ chối.`);
      }
      const dk = gan(bang, dieuKien, true);
      const ds = ghiDs(bang);
      let n = 0;
      for (let i = ds.length - 1; i >= 0; i--) {
        if (hop(ds[i], dk)) { ds.splice(i, 1); n++; }
      }
      return n;
    },

    async giaoDich(fn) {
      // Bản giả không có giao dịch thật; chụp ảnh rồi khôi phục khi ném lỗi là đủ cho test.
      const anh = new Map();
      for (const [k, v] of kho.bang) anh.set(k, v.map((r) => ({ ...r })));
      try { return await fn(cong); } catch (e) { kho.bang = anh; throw e; }
    },
  };
  return cong;
}

/** Tiện tay cho test: kho + hàm tạo truy vấn đã buộc sẵn vào kho đó. */
export function dungCongGia(hat = {}, tuyChon = {}) {
  const kho = new KhoGia(hat);
  return { kho, taoTruyVan: (bc) => taoTruyVanGia(kho, bc, tuyChon) };
}

export { LoiThieuBoiCanh, LoiXuyenTeam };
