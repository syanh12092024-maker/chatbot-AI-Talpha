// KHO NGƯỜI DÙNG — đọc bốn bảng dùng chung: `nguoi_dung` `thanh_vien_team` `vai` `team`.
//
// ┌── ĐỌC KỸ CHỖ NÀY TRƯỚC KHI TƯỞNG `datCongDanhTinh` LÀ CỬA HẬU ──────────────────────┐
// │ CON GÀ VÀ QUẢ TRỨNG:                                                                 │
// │   · Muốn có bối cảnh team thì phải biết người này thuộc team nào.                     │
// │   · Muốn hỏi cơ sở dữ liệu thì phải có bối cảnh team.                                 │
// │ Vòng luẩn quẩn. Gỡ bằng MỘT CỔNG RIÊNG, HẸP, CHỈ ĐỌC, chỉ cho bốn bảng trên —         │
// │ bốn bảng KHÔNG CÓ cột `team_id` (hợp đồng mục 4), nên đọc chúng không phá lớp team.   │
// │                                                                                      │
// │ Ba hàng rào của cổng này, đừng gỡ cái nào:                                            │
// │   1. Bảng ngoài danh sách → NÉM LỖI. Không phải "bỏ qua", là ném.                     │
// │   2. Chỉ có `chon` `mot` `dem`. KHÔNG có `them`/`sua`/`xoa` — tạo tài khoản là việc    │
// │      quản trị của giai đoạn 2, không đi qua đây.                                      │
// │   3. Chỉ tầng đăng nhập gọi. Mọi thứ SAU bước đăng nhập đi bằng cổng có bối cảnh team. │
// └──────────────────────────────────────────────────────────────────────────────────────┘
//
// BẪY ĐÃ DẪM: cổng truy vấn (cả bản giả lẫn bản thật) XOÁ điều kiện `team_id` khi bảng
// nằm trong nhóm dùng chung — xem `v3/testkit/db-gia.js` hàm `gan()`. Nên lọc theo team
// trên `thanh_vien_team` PHẢI làm bằng tay trong file này; đưa `team_id` vào điều kiện là
// bị bỏ qua âm thầm rồi trả về membership của MỌI team.

let _taoCongDanhTinh = null;

/** Bốn bảng dùng chung — đúng bằng `BANG_DUNG_CHUNG` của cổng truy vấn. */
export const BANG_DANH_TINH = Object.freeze(['nguoi_dung', 'thanh_vien_team', 'vai', 'team']);
const CHO_PHEP = new Set(BANG_DANH_TINH);

/**
 * Nối cổng danh tính. `fn()` (KHÔNG tham số) → cổng truy vấn không gắn team, do người A giao.
 * Gọi một lần lúc dựng ứng dụng — xem `docs/hop-dong-b-voi-a.md` mục 8.
 */
export function datCongDanhTinh(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('datCongDanhTinh: cần một hàm fn() → cổng truy vấn cấp hệ thống.');
  }
  _taoCongDanhTinh = fn;
}

export function daNoiCongDanhTinh() {
  return typeof _taoCongDanhTinh === 'function';
}

function cong() {
  if (!_taoCongDanhTinh) {
    throw new Error(
      'Chưa nối cổng danh tính. Gọi datCongDanhTinh(fn) lúc dựng ứng dụng — hợp đồng mục 8.',
    );
  }
  const g = _taoCongDanhTinh();
  if (!g || typeof g.chon !== 'function') {
    throw new Error('datCongDanhTinh: hàm trả về không phải cổng truy vấn (thiếu .chon).');
  }
  const chan = (bang) => {
    if (!CHO_PHEP.has(bang)) {
      throw new Error(
        `Cổng danh tính chỉ được đọc ${BANG_DANH_TINH.join(' · ')}. ` +
        `Bảng "${bang}" phải đi bằng cổng có bối cảnh team.`,
      );
    }
  };
  return {
    chon: (bang, dieuKien, tuyChon) => { chan(bang); return g.chon(bang, dieuKien, tuyChon); },
    mot: (bang, dieuKien) => { chan(bang); return g.mot ? g.mot(bang, dieuKien) : g.chon(bang, dieuKien, { gioiHan: 1 }).then((r) => r[0] || null); },
    dem: (bang, dieuKien) => { chan(bang); return g.dem(bang, dieuKien); },
  };
}

/** `bat === false` (hoặc 0 / 'false') là tài khoản đã khoá. Thiếu cột → coi như đang bật. */
const biTat = (nd) => nd.bat === false || nd.bat === 0 || nd.bat === 'false' || nd.bat === 'f';

/**
 * Tìm theo tên đăng nhập. Tài khoản khoá (`bat === false`) trả `null` — **coi như không
 * tồn tại**, để đường đăng nhập trả đúng một thông điệp cho cả ba ca: không có tài khoản,
 * tài khoản khoá, sai mật khẩu. Khác nhau là chỉ điểm cho người dò tài khoản.
 * @returns {Promise<{id:string,ten_dang_nhap:string,mat_khau_bam:string,ho_ten:string|null,bat:boolean}|null>}
 */
export async function timTheoTen(tenDangNhap) {
  const ten = String(tenDangNhap ?? '').trim();
  if (!ten) return null;
  const nd = await cong().mot('nguoi_dung', { ten_dang_nhap: ten });
  if (!nd || biTat(nd)) return null;
  return {
    id: String(nd.id),
    ten_dang_nhap: String(nd.ten_dang_nhap),
    mat_khau_bam: nd.mat_khau_bam == null ? '' : String(nd.mat_khau_bam),
    ho_ten: nd.ho_ten == null ? null : String(nd.ho_ten),
    bat: true,
  };
}

/**
 * Các team người này thuộc về, kèm vai trong từng team.
 * Team mà không tra ra vai nào thì BỊ LOẠI khỏi danh sách — vào team mà không có vai thì
 * `taoBoiCanh` sẽ ném; loại sớm ở đây để màn chọn team không hiện cái thẻ bấm vào là lỗi.
 * @returns {Promise<Array<{teamId:string, tenTeam:string, vai:string[]}>>}
 */
export async function teamCuaNguoi(nguoiDungId) {
  const id = String(nguoiDungId ?? '').trim();
  if (!id) return [];
  const db = cong();

  // KHÔNG lọc team_id ở đây — bảng dùng chung, cổng sẽ xoá điều kiện đó (xem ghi chú đầu file).
  const dsTV = await db.chon('thanh_vien_team', { nguoi_dung_id: id });
  if (!dsTV.length) return [];

  const maVai = new Map((await db.chon('vai')).map((v) => [String(v.id), String(v.ma)]));
  const tenTeam = new Map((await db.chon('team')).map((t) => [String(t.id), String(t.ten ?? t.id)]));

  const gom = new Map();
  for (const r of dsTV) {
    if (String(r.nguoi_dung_id) !== id) continue; // chắn thêm một lần, phòng cổng lọc lỏng
    const teamId = String(r.team_id ?? '');
    if (!teamId) continue;
    if (!gom.has(teamId)) gom.set(teamId, { teamId, tenTeam: tenTeam.get(teamId) || teamId, vai: [] });
    const ma = maVai.get(String(r.vai_id)) || (r.vai_ma ? String(r.vai_ma) : null);
    const o = gom.get(teamId);
    if (ma && !o.vai.includes(ma)) o.vai.push(ma);
  }

  const ra = [];
  for (const t of gom.values()) {
    if (!t.vai.length) {
      console.warn(`[auth] người ${id} có dòng thanh_vien_team ở team ${t.teamId} nhưng không tra ra vai — bỏ qua team này.`);
      continue;
    }
    ra.push(t);
  }
  ra.sort((a, b) => a.tenTeam.localeCompare(b.tenTeam, 'vi'));
  return ra;
}

/**
 * Vai của một người TRONG MỘT TEAM. Không thuộc team đó → `[]` (nơi gọi trả 403).
 * @returns {Promise<string[]>}
 */
export async function vaiTrongTeam(nguoiDungId, teamId) {
  const t = String(teamId ?? '').trim();
  if (!t) return [];
  const ds = await teamCuaNguoi(nguoiDungId);
  const o = ds.find((x) => x.teamId === t);
  return o ? [...o.vai] : [];
}
