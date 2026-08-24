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

/**
 * Cờ boolean đọc từ cơ sở dữ liệu. Trình điều khiển này trả `true/false`, trình khác trả
 * `'t'`/`1`/`'true'` — nhận hết. `undefined` (cột không được chọn) KHÔNG phải `false`, nơi
 * gọi tự quyết mặc định.
 */
const co = (v) => v === true || v === 1 || v === '1' || v === 't' || v === 'true' || v === 'y';

/** `hoat_dong = false` là tài khoản đã khoá. Thiếu cột → coi như đang bật (mặc định của lược đồ). */
const biTat = (nd) => nd.hoat_dong != null && !co(nd.hoat_dong);

/**
 * Tìm theo EMAIL (`nguoi_dung.email` là cột UNIQUE của lược đồ thật — không có cột tên
 * đăng nhập).
 *
 * SO KHỚP ĐÚNG NGUYÊN VĂN, chỉ cắt khoảng trắng. KHÔNG hạ chữ thường ở đây: cột là `text`
 * UNIQUE thường, không phải `citext`, và không có index trên `lower(email)` — hạ chữ thường
 * phía JS thì người có email lưu dạng có chữ hoa sẽ không bao giờ tra ra, mà cửa hỏng lại
 * trả đúng câu "sai email hoặc mật khẩu" nên không ai lần ra. (Bộ đếm thử sai thì VẪN khoá
 * theo bản hạ chữ thường — chỗ đó cố tình gộp, xem `router.js`.)
 *
 * Trả `null` — **coi như không tồn tại** — ở cả ba ca dưới đây, để đường đăng nhập chỉ có
 * đúng MỘT thông điệp cho mọi kiểu hỏng. Khác nhau là chỉ điểm cho người dò tài khoản:
 *   · không có dòng nào
 *   · `hoat_dong = false`      (tài khoản khoá)
 *   · `mat_khau_hash IS NULL`  (**chưa đặt mật khẩu** — lược đồ để cột nullable, xem
 *     `001_nen.up.sql:29`. Trả null ở đây để nơi gọi chạy nhánh băm giả, giữ nguyên độ trễ;
 *     trả chuỗi rỗng thì `kiem()` về ngay và thời gian phản hồi tự khai ca này.)
 *
 * @returns {Promise<{id:string,email:string,mat_khau_hash:string,ten:string|null,hoat_dong:boolean}|null>}
 */
export async function timTheoEmail(email) {
  const e = String(email ?? '').trim();
  if (!e) return null;
  const nd = await cong().mot('nguoi_dung', { email: e });
  if (!nd || biTat(nd)) return null;
  if (nd.mat_khau_hash == null || String(nd.mat_khau_hash) === '') return null;
  return {
    id: String(nd.id),
    email: String(nd.email),
    mat_khau_hash: String(nd.mat_khau_hash),
    ten: nd.ten == null ? null : String(nd.ten),
    hoat_dong: true,
  };
}

/**
 * Các team người này thuộc về, kèm vai trong từng team.
 *
 * HAI CHỖ BỊ LOẠI KHỎI DANH SÁCH:
 *
 *  ① Team không tra ra vai nào — vào team mà không có vai thì `taoBoiCanh` sẽ ném; loại sớm
 *    ở đây để màn chọn team không hiện cái thẻ bấm vào là lỗi.
 *
 *  ② ⛔ TEAM KỸ THUẬT (`team.la_ky_thuat`) — đây là chỗ đậu của TOÀN BỘ dữ liệu di trú chưa
 *    chốt chủ (502 page · 18.790 hội thoại · 69 bản kịch bản, team `chua-phan`). Một người
 *    chọn được nó là nhìn thấy khách của cả ba team nghiệp vụ cùng lúc. Cơ sở dữ liệu đã có
 *    trigger cấm gán thành viên vào team kỹ thuật, nhưng picker mù vẫn là một đường rò ở
 *    tầng màn hình — nên chặn ở CẢ HAI tầng. Hàm này là nguồn duy nhất của danh sách team
 *    (cả `/api/toi`, cả `chon-team.html`, cả `vaiTrongTeam`), nên lọc ở đây là lọc mọi chỗ.
 *
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
  // Giữ cả cờ kỹ thuật, không chỉ tên: quyết định loại hay không nằm ngay ở dòng team.
  const bangTeam = new Map((await db.chon('team')).map((t) => [
    String(t.id), { ten: String(t.ten ?? t.id), laKyThuat: co(t.la_ky_thuat) },
  ]));

  const gom = new Map();
  for (const r of dsTV) {
    if (String(r.nguoi_dung_id) !== id) continue; // chắn thêm một lần, phòng cổng lọc lỏng
    const teamId = String(r.team_id ?? '');
    if (!teamId) continue;
    const th = bangTeam.get(teamId);
    if (th && th.laKyThuat) {
      console.warn(`[auth] người ${id} có dòng thanh_vien_team ở TEAM KỸ THUẬT ${teamId} — loại khỏi danh sách chọn team.`);
      continue;
    }
    if (!gom.has(teamId)) gom.set(teamId, { teamId, tenTeam: th ? th.ten : teamId, vai: [] });
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
 *
 * Đi qua `teamCuaNguoi` nên **team kỹ thuật cũng ra `[]`** — gõ thẳng `teamId` của
 * `chua-phan` vào `POST /api/chon-team` bị xử đúng như chọn một team không thuộc về:
 * 403 + một dòng nhật ký `chan_xuyen_team`.
 * @returns {Promise<string[]>}
 */
export async function vaiTrongTeam(nguoiDungId, teamId) {
  const t = String(teamId ?? '').trim();
  if (!t) return [];
  const ds = await teamCuaNguoi(nguoiDungId);
  const o = ds.find((x) => x.teamId === t);
  return o ? [...o.vai] : [];
}
