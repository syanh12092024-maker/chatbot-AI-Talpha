// TẦNG TRUY VẤN v3 — mọi hàm đọc/ghi bảng NGHIỆP VỤ phải đi qua ĐÂY, để điều kiện team
// được TỰ CHÈN đúng MỘT CHỖ (01-QUYET-DINH.md §8: "điều kiện team nằm ở TẦNG TRUY VẤN,
// tự chèn theo người đang đăng nhập — không phải bộ lọc trên màn hình"). Không viết
// SELECT/INSERT/UPDATE tay có team_id ở nơi khác trong code v3 — đó đúng cái lỗ mà
// 06-PROMPT-GIAO-VIEC.md §"LỚP TEAM" cảnh báo: "sót MỘT chỗ là team này nhìn thấy khách
// team kia".
//
// BA HỢP ĐỒNG đo được (PHIẾU L0-M2 ② + docs/v3/ban-giao/luoc-do-v1.md):
//   1. ctx thiếu/sai (rỗng, team không tồn tại, team KỸ THUẬT) → LoiThieuBoiCanhTeam.
//      Cấm trả mảng rỗng — rỗng trông như "không có dữ liệu", che mất "sai cách gọi".
//   2. Truyền tay team_id KHÁC ctx.teamId trong dieuKien/duLieu → LoiXuyenTeam + ghi
//      đúng 1 dòng nhat_ky (hanh_dong='chan_xuyen_team').
//   3. `bo_luat_chung` ĐỌC bằng (team_id = ctx.teamId OR team_id IS NULL) — MỌI bảng
//      khác đọc một vế `team_id = ctx.teamId`. Quên vế NULL là bug N3 đã có án lệ thật
//      (khối prompt dùng chung tàng hình với mọi team) — đặc cách nằm NGAY TRONG hàm đọc
//      chung của tầng này, không phải một hàm khác dễ quên gọi. GHI vào bo_luat_chung
//      (themMoi/suaTheoId) KHÔNG có đặc cách này — một team chỉ ghi/sửa dòng của chính
//      nó, không bao giờ chạm dòng team_id IS NULL (luật toàn hệ) qua ctx thường.
//   4. `layNhieu` nhận giá trị MẢNG và `null` trong `dieuKien` (PHIEU-B-Y1 mục 2):
//      mảng → `= ANY($n)` · mảng RỖNG → `false` (0 dòng) · `null` → `IS NULL`.
//      Không có nó thì mọi mẻ đọc gom id của màn hình phải đọc TRỌN bảng của team rồi
//      lọc trong JS — `hoi_thoai` hôm nay 28.953 dòng (đo 25/08 trên `aicloser_v3` của
//      VPS), và đường vòng đó đang nằm thật ở `v3/src/noi-day/cong-du-lieu-that.js`.
//   4b. `ctxHeThong({ ghiNhatKy: false })` tắt dòng nhật ký của lệnh ĐỌC — và CHỈ của
//      lệnh đọc. Lệnh GHI luôn để lại dấu vết, không có cờ nào tắt được (B-Y5).
//   5. `suaTheoId` nhận `{ neu }` (điều kiện thêm) VÀ nhận `ctxHeThong()` (B-Y1 mục 1).
//      `neu` là cách duy nhất diễn đạt SO-VÀ-ĐẶT qua tầng này. Không có nó thì hai sale
//      bấm «Nhận việc» cùng lúc CẢ HAI CÙNG THẮNG, và ở dòng `loai='don_hang'` nghĩa là
//      hai người cùng duyệt một đơn ⇒ hai kiện COD. Đây là nợ N3: mở 22/08, cắn BỐN lần
//      (L1-M1 · L2-M1 · VA-R3/RF-13 · L4-M2) và đẻ ra ba cửa UPDATE tạm. Phiếu này mở
//      đường; xoá ba cửa tạm là phiếu G2-A3, mỗi cửa một chủ.
//
// KHÔNG bao phủ ở đây: `team` `nguoi_dung` `vai` (dùng chung — xem team.js, không đòi
// ctx) và `thanh_vien_team` (việc của người B ở L0-M3: xác định ctx.teamId TỪ đăng nhập
// — dùng bảng này qua một ctx là chuyện con-gà-quả-trứng, ngoài phạm vi phiếu này).
//
// KHÔNG có hàm xoá (`xoaTheoId`) — ② hợp đồng chỉ nói "đọc/ghi", chưa đòi xoá; thêm ra
// là abstraction ngoài phạm vi phiếu (skill tho-thi-cong luật 12).
import { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
import { ghiNhatKy } from "./nhat-ky.js";

// NEO NGOÀI — 15 bảng nghiệp vụ trích từ `docs/v3/ban-giao/luoc-do-v1.md` §2 (gõ tay,
// KHÔNG đọc từ information_schema: hai vế cùng sinh từ một nguồn thì phép so luôn xanh
// và không bắt được bảng bị đánh rơi khỏi lược đồ — án lệ N5 của L0-M1, giữ nguyên cách
// làm ở `test/l0-m1-luoc-do.test.js`). Đổi lược đồ (thêm/bớt bảng nghiệp vụ) mà không
// sửa danh sách này ⇒ hàm bị chặn nhầm hoặc mở nhầm — CỐ Ý, để lỗi hiện ra ngay thay vì
// âm thầm chấp nhận một tên bảng lạ (skill tho-thi-cong án lệ #22: deny-by-default).
export const BANG_NGHIEP_VU_CHUAN = new Set([
  "cau_hinh_model",
  "page",
  "san_pham",
  "goi_gia",
  "khach",
  "hoi_thoai",
  "so_ai",
  "don_hang",
  "viec_can_xu_ly",
  "hang_cho_tao_don",
  "kich_ban",
  "bo_luat_chung",
  "ky_nang",
  "lich_nhac",
  "nhat_ky",
]);

const RE_TEN_HOP_LE = /^[a-z_][a-z0-9_]*$/;

function kiemTraTenBang(tenBang) {
  if (!BANG_NGHIEP_VU_CHUAN.has(tenBang)) {
    throw new Error(
      `"${tenBang}" không nằm trong BANG_NGHIEP_VU_CHUAN của tầng truy vấn v3 ` +
        `(src/db/truy-van.js) — bảng dùng chung/thanh_vien_team có hàm riêng, bảng lạ ` +
        `thì không đoán, phải sửa neo này trước.`,
    );
  }
}

function kiemTraTenCot(ten) {
  if (typeof ten !== "string" || !RE_TEN_HOP_LE.test(ten)) {
    throw new Error(
      `tên cột "${ten}" không hợp lệ (chỉ chữ thường/số/gạch dưới, không bắt đầu bằng số).`,
    );
  }
  return ten;
}

// ─── Bộ dựng MỘT vế điều kiện — DÙNG CHUNG cho `layNhieu.dieuKien` và `suaTheoId.neu`.
// Một bản khai, không hai: hai chỗ cùng luật mà gõ tay hai lần là bom hẹn giờ (bài học 2
// của giai đoạn 2; án lệ `NHOM_HUY_HOAN` §9 — «bản khai thứ hai cùng giá trị»).
function veDieuKien(k, v, params) {
  // Cửa RA của tên cột vào chuỗi SQL. Nơi gọi đã kiểm sớm một lượt rồi, nhưng phanh đặt
  // ở cửa RA mới là phanh (án lệ #31) — cửa VÀO là tập mở, cửa ra chỉ có đúng chỗ này.
  kiemTraTenCot(k);
  if (Array.isArray(v)) {
    // Mảng RỖNG → hằng `false`, KHÔNG dựng `= ANY('{}')` rồi phó mặc Postgres: câu trả
    // lời đúng cho «lấy các dòng có id thuộc tập RỖNG» là 0 dòng, và tầng này tự nói câu
    // đó ra chứ không mượn hành vi của một bản cài CSDL để nói hộ.
    if (v.length === 0) return "false";
    params.push(v);
    return `${k} = ANY($${params.length})`;
  }
  if (v === null) return `${k} IS NULL`;
  if (v === undefined) {
    // `cot = NULL` KHÔNG BAO GIỜ đúng trong SQL. Dịch thẳng `undefined` thành tham số thì
    // lời gọi khớp 0 dòng và IM — mà `undefined` ở đây luôn là một biến chưa gán của nơi
    // gọi, không bao giờ là ý đồ. Ném to; muốn hỏi «cột này rỗng» thì viết `null`.
    throw new Error(
      `điều kiện "${k}" mang giá trị undefined — tầng truy vấn không đoán. Viết null ` +
        `tường minh nếu muốn IS NULL.`,
    );
  }
  if (
    typeof v === "object" &&
    !(v instanceof Date) &&
    !Buffer.isBuffer(v)
  ) {
    // Người B diễn đạt so sánh bằng object `{ ">=": moc }` (xem `laToanTu` ở
    // `v3/src/noi-day/cong-du-lieu-that.js`). Tầng này CHƯA làm toán tử — B-Y1 ⑥ để
    // ngoài phạm vi có chủ đích. Nếu cứ đẩy xuống thì `pg` tuần tự hoá object thành
    // JSON và câu SQL thành `cot = '{">=":5}'`: khớp 0 dòng, KHÔNG lỗi, KHÔNG ai biết.
    // Nói ra là hơn — nơi gọi còn biết đường lọc ở JS như hiện nay.
    throw new Error(
      `điều kiện "${k}" là object — tầng truy vấn chưa nhận toán tử so sánh ` +
        `(chỉ: giá trị thường · mảng · null). Xem PHIEU-B-Y1 ⑥.`,
    );
  }
  params.push(v);
  return `${k} = $${params.length}`;
}

// Kiểm tên cột TRƯỚC mọi lượt chạm CSDL: tên rác là lỗi GỌI SAI của code, không đáng tốn
// một vòng hỏi bảng `team`, và càng không đáng đẻ một dòng nhat_ky `chan_xuyen_team` cho
// một lời gọi vốn đã hỏng cú pháp (phép ④#7 của PHIEU-B-Y1: «KHÔNG chạm CSDL»).
function kiemTraTenCotSom(vat) {
  for (const k of Object.keys(vat ?? {})) kiemTraTenCot(k);
}

function coTruyenTayTeamId(vat) {
  return (
    vat != null &&
    Object.prototype.hasOwnProperty.call(vat, "team_id") &&
    vat.team_id != null &&
    vat.team_id !== ""
  );
}

// Cửa DUY NHẤT xác định team_id thật sự dùng cho câu SQL + thi hành rào N2 (ctx sai) và
// N-xuyên-team (truyền tay khác ctx). `dieuKienHayDuLieu` là điều kiện đọc HOẶC dữ liệu
// ghi — hàm chỉ soi khoá `team_id` của nó.
async function xacDinhTeamId(pool, ctx, tenBang, dieuKienHayDuLieu) {
  if (ctx?.laHeThong) {
    // Cửa thoát job nền (ctxHeThong): không có một team cố định để suy luận hộ — đòi
    // tường minh trong dieuKien/duLieu. KHÔNG kiểm la_ky_thuat: job nền (di trú...) được
    // phép chạm team kỹ thuật, đó chính là lý do cửa thoát này tồn tại.
    if (!coTruyenTayTeamId(dieuKienHayDuLieu)) {
      throw new LoiThieuBoiCanhTeam(
        "ctxHeThong() bắt buộc kèm team_id tường minh trong dieuKien/duLieu — job nền " +
          "không có một team cố định để suy luận hộ (xem src/db/boi-canh.js).",
      );
    }
    const teamId = dieuKienHayDuLieu.team_id;
    const r = await pool.query("SELECT id FROM team WHERE id = $1", [teamId]);
    if (!r.rowCount) {
      throw new LoiThieuBoiCanhTeam(
        `ctxHeThong: team_id=${teamId} không tồn tại.`,
      );
    }
    return { teamId, laHeThong: true };
  }

  if (!ctx || ctx.teamId == null || ctx.teamId === "") {
    throw new LoiThieuBoiCanhTeam(
      "Thiếu bối cảnh team (ctx.teamId rỗng) — truy vấn từ chối chạy, KHÔNG trả mảng " +
        "rỗng (rỗng trông như 'không có dữ liệu' thay vì 'sai cách gọi').",
    );
  }
  const r = await pool.query("SELECT la_ky_thuat FROM team WHERE id = $1", [
    ctx.teamId,
  ]);
  if (!r.rowCount) {
    throw new LoiThieuBoiCanhTeam(
      `ctx.teamId=${ctx.teamId} không tồn tại trong bảng team.`,
    );
  }
  if (r.rows[0].la_ky_thuat) {
    throw new LoiThieuBoiCanhTeam(
      `ctx.teamId=${ctx.teamId} là team KỸ THUẬT (chua-phan) — cấm dùng làm bối cảnh ` +
        `truy vấn (rào N2, docs/v3/ban-giao/luoc-do-v1.md §1(i)).`,
    );
  }

  if (
    coTruyenTayTeamId(dieuKienHayDuLieu) &&
    String(dieuKienHayDuLieu.team_id) !== String(ctx.teamId)
  ) {
    await ghiNhatKy(pool, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId ?? "?"}`,
      nguoiDungId: ctx.nguoiDungId ?? null,
      hanhDong: "chan_xuyen_team",
      doiTuong: tenBang,
      doiTuongId: String(dieuKienHayDuLieu.team_id),
      ghiChu: `ctx.teamId=${ctx.teamId} truyền tay team_id=${dieuKienHayDuLieu.team_id} trong tham số/filter — bị chặn`,
    });
    throw new LoiXuyenTeam(
      `Bị chặn: ctx thuộc team ${ctx.teamId} nhưng truyền tay team_id=` +
        `${dieuKienHayDuLieu.team_id} trong tham số/filter.`,
    );
  }
  return { teamId: ctx.teamId, laHeThong: false };
}

async function ghiNhatKyHeThong(pool, teamId, hanhDong, tenBang) {
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:tang-truy-van",
    hanhDong,
    doiTuong: tenBang,
    ghiChu: "gọi qua ctxHeThong() — mọi lượt gọi đều ghi (01-QUYET-DINH.md §9)",
  });
}

// vế team_id trong WHERE — CHỈ bo_luat_chung có đặc cách 2 vế (N3), và CHỈ ở phía ĐỌC.
function veTeamKhiDoc(tenBang, teamId, params) {
  params.push(teamId);
  return tenBang === "bo_luat_chung"
    ? `(team_id = $${params.length} OR team_id IS NULL)`
    : `team_id = $${params.length}`;
}

/**
 * Đọc nhiều dòng của `tenBang` trong bối cảnh `ctx`.
 * tuyChon.dieuKien — điều kiện thêm ngoài team_id (vd { trang_thai: 'GREET' }).
 *   giá trị MẢNG  → `= ANY($n)`  ·  mảng RỖNG → 0 dòng  ·  `null` → `IS NULL`
 *   `undefined`   → ném Error (xem `veDieuKien`, đó luôn là biến chưa gán của nơi gọi).
 * tuyChon.thuTu    — tên MỘT cột để ORDER BY (tăng dần).
 */
export async function layNhieu(pool, ctx, tenBang, tuyChon = {}) {
  kiemTraTenBang(tenBang);
  const { dieuKien = {}, thuTu } = tuyChon;
  kiemTraTenCotSom(dieuKien);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, dieuKien);
  const params = [];
  const mauTeam = veTeamKhiDoc(tenBang, resolved.teamId, params);
  const dkKhac = Object.entries(dieuKien)
    .filter(([k]) => k !== "team_id")
    .map(([k, v]) => veDieuKien(k, v, params));
  const whereSql = [mauTeam, ...dkKhac].join(" AND ");
  const orderSql = thuTu ? ` ORDER BY ${kiemTraTenCot(thuTu)}` : "";
  const r = await pool.query(
    `SELECT * FROM ${tenBang} WHERE ${whereSql}${orderSql}`,
    params,
  );
  // Cờ `ghiNhatKy` của `ctxHeThong` CHỈ có tác dụng ở đây — đường ĐỌC. Đường GHI bên dưới
  // không đọc cờ này: tắt dấu vết của một lượt GHI là chuyện khác hẳn (B-Y5).
  if (resolved.laHeThong && ctx?.ghiNhatKy !== false)
    await ghiNhatKyHeThong(pool, resolved.teamId, "doc", tenBang);
  return r.rows;
}

/** Đọc một dòng theo id (đã áp rào team) — null nếu không có hoặc không thuộc team.
 *  KHÔNG hỗ trợ ctxHeThong (không có chỗ truyền team_id tường minh qua tham số `id`) —
 *  job nền cần tra theo id thì dùng layNhieu(ctx, tenBang, { dieuKien: { id, team_id } }). */
export async function layMotTheoId(pool, ctx, tenBang, id) {
  kiemTraTenBang(tenBang);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, {});
  if (resolved.laHeThong) {
    throw new LoiThieuBoiCanhTeam(
      "layMotTheoId không hỗ trợ ctxHeThong — dùng layNhieu(ctx, tenBang, " +
        "{ dieuKien: { id, team_id } }) để tra theo id trong job nền.",
    );
  }
  const params = [];
  const mauTeam = veTeamKhiDoc(tenBang, resolved.teamId, params);
  params.push(id);
  const r = await pool.query(
    `SELECT * FROM ${tenBang} WHERE ${mauTeam} AND id = $${params.length}`,
    params,
  );
  return r.rows[0] ?? null;
}

/** Thêm một dòng. team_id ghi xuống DB LUÔN LÀ giá trị SERVER tính ra (resolved.teamId),
 *  không tin thẳng field `team_id` caller đưa trong duLieu dù nó có khớp ctx hay không —
 *  giá trị cuối cùng đi qua xacDinhTeamId trước, duLieu.team_id chỉ được SOI, không được
 *  DÙNG trực tiếp. */
export async function themMoi(pool, ctx, tenBang, duLieu = {}) {
  kiemTraTenBang(tenBang);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, duLieu);
  const cot = ["team_id"];
  const giuCho = ["$1"];
  const params = [resolved.teamId];
  for (const [k, v] of Object.entries(duLieu)) {
    if (k === "team_id") continue;
    kiemTraTenCot(k);
    params.push(v);
    cot.push(k);
    giuCho.push(`$${params.length}`);
  }
  const r = await pool.query(
    `INSERT INTO ${tenBang} (${cot.join(",")}) VALUES (${giuCho.join(",")}) RETURNING *`,
    params,
  );
  if (resolved.laHeThong)
    await ghiNhatKyHeThong(pool, resolved.teamId, "them", tenBang);
  return r.rows[0];
}

// `suaTheoId` soi `team_id` ở HAI chỗ (`duLieu` và `neu`) nhưng `xacDinhTeamId` chỉ nhận
// MỘT object. Gộp ở đây thay vì gọi soi hai lượt: gọi hai lượt thì một lời gọi xuyên team
// đẻ HAI dòng nhat_ky `chan_xuyen_team` cho cùng một sự việc, trong khi hợp đồng ② khai
// «đúng 1 dòng». Hai chỗ cùng khai mà khác nhau là lỗi GỌI SAI, không phải mưu xuyên team
// — nên ném Error thường, đừng gán cho nơi gọi một ý đồ mà họ không có.
function teamIdDeSoi(duLieu, neu) {
  const a = coTruyenTayTeamId(duLieu) ? String(duLieu.team_id) : null;
  const b = coTruyenTayTeamId(neu) ? String(neu.team_id) : null;
  if (a !== null && b !== null && a !== b) {
    throw new Error(
      `suaTheoId: duLieu.team_id=${a} khác neu.team_id=${b} — hai lời khai mâu thuẫn, ` +
        `tầng truy vấn không đoán hộ chọn cái nào.`,
    );
  }
  if (a !== null) return { team_id: a };
  if (b !== null) return { team_id: b };
  return {};
}

/** Sửa một dòng theo id, CHỈ khi dòng đó team_id = ctx.teamId — kể cả với bo_luat_chung
 *  (đặc cách 2 vế CHỈ áp dụng khi ĐỌC, xem đầu file).
 *
 *  0 dòng khớp → trả `null`, KHÔNG ném. Ba chuyện cùng ra `null`: id không tồn tại · dòng
 *  đó thuộc team khác · điều kiện `neu` KHÔNG CÒN đúng lúc ghi (mất tranh so-và-đặt). Cả
 *  ba đều KHÁC HẲN "ctx sai"/"xuyên team" — nơi gọi phân biệt bằng việc không có ngoại lệ
 *  nào bay ra. ⚠️ Nơi gọi nào coi "mất tranh" là LỖI (máy trạng thái đơn: ảnh cũ ghi đè =
 *  hai sổ lệch) thì phải TỰ dịch `null` thành ném — tầng này không đoán hộ ngữ nghĩa đó.
 *
 *  tuyChon.datSuaLuc — thêm `sua_luc = now()` (đồng hồ CSDL) vào mệnh đề SET. MẶC ĐỊNH
 *  TẮT: xem ghi chú trong thân hàm, có hợp đồng ngược lại ở L3-M2.
 *
 *  tuyChon.neu — điều kiện THÊM, nối vào WHERE SAU vế team và vế id. Dùng CHUNG bộ dựng vế
 *  với `layNhieu` (`veDieuKien`): `null` → IS NULL · mảng → = ANY · còn lại → = $n. Đây là
 *  cách diễn đạt SO-VÀ-ĐẶT: `{ neu: { nguoi_nhan_id: null } }` chỉ chạm dòng nếu NGAY LÚC
 *  GHI nó vẫn chưa có ai nhận. Nhánh `null` là nhánh QUAN TRỌNG NHẤT của tham số này —
 *  dịch nó thành `nguoi_nhan_id = NULL` (không bao giờ đúng) là mọi lượt nhận việc đều
 *  trượt và màn hình báo «mất tranh» cho từng cú bấm, hỏng CÂM.
 *
 *  ctxHeThong() ĐƯỢC hỗ trợ (khác `layMotTheoId`): job nền có chỗ khai `team_id` tường
 *  minh — trong `duLieu` HOẶC trong `neu`. Thiếu → LoiThieuBoiCanhTeam, y hệt luật của
 *  `themMoi` (§4 bàn giao). Mọi lượt gọi bằng ctxHeThong đều ghi nhat_ky, kể cả lượt khớp
 *  0 dòng: 01-QUYET-DINH §9 đòi ghi «việc máy làm», mà một lượt CAS trượt vẫn là việc máy
 *  đã làm — bỏ nó là sổ chỉ còn kể những lần thắng. */
export async function suaTheoId(
  pool,
  ctx,
  tenBang,
  id,
  duLieu = {},
  tuyChon = {},
) {
  kiemTraTenBang(tenBang);
  const { neu, datSuaLuc = false } = tuyChon;
  if (neu != null && (typeof neu !== "object" || Array.isArray(neu))) {
    throw new Error(
      "suaTheoId: `neu` phải là object phẳng { cot: giaTri } (hoặc bỏ trống).",
    );
  }
  kiemTraTenCotSom(duLieu);
  kiemTraTenCotSom(neu);

  const resolved = await xacDinhTeamId(
    pool,
    ctx,
    tenBang,
    teamIdDeSoi(duLieu, neu),
  );

  const gan = [];
  const params = [];
  const coMang = []; // tên các cột nhận giá trị MẢNG — chỉ dùng để dịch lỗi, xem dưới
  for (const [k, v] of Object.entries(duLieu)) {
    if (k === "team_id") continue;
    kiemTraTenCot(k);
    if (Array.isArray(v)) coMang.push(k);
    params.push(v);
    gan.push(`${k} = $${params.length}`);
  }
  if (!gan.length) {
    throw new Error(
      "suaTheoId: duLieu rỗng (ngoài team_id) — không có gì để sửa.",
    );
  }
  // Đồng hồ CSDL, không đồng hồ máy. `now()` là hằng SQL cố định trong chuỗi — không có
  // giá trị nào của nơi gọi đi vào đây, nên không mở bề mặt chèn SQL nào.
  //
  // Vì sao là CỜ chứ không phải luôn-luôn: `test/l3-m2-ti-le-hoan.test.js:270` có hợp
  // đồng ngược lại — cổng ghi chậm của L3-M2 bị CẤM chạm `sua_luc`. Bật mặc định là phá
  // đúng hợp đồng đó, và phá cả những phép đo dùng `max(sua_luc)` làm vân tay «có ai ghi
  // gì không». Nơi nào cần thì tự khai (án lệ #18: cùng luật chưa đủ, còn phải cùng
  // THỜI ĐIỂM — trộn đồng hồ máy với đồng hồ CSDL trong một cột là mầm lệch).
  if (datSuaLuc) gan.push("sua_luc = now()");
  params.push(resolved.teamId);
  const dkTeam = `team_id = $${params.length}`; // MỘT vế, kể cả bo_luat_chung — xem đầu file
  params.push(id);
  const dkId = `id = $${params.length}`;
  // Vế `neu` nối SAU team và id: đọc câu SQL sinh ra là thấy ngay rào team đứng trước mọi
  // điều kiện nghiệp vụ, không phải lần theo thứ tự tham số mới biết.
  const dkThem = Object.entries(neu ?? {})
    .filter(([k]) => k !== "team_id")
    .map(([k, v]) => veDieuKien(k, v, params));
  // Mảng JS đi thẳng xuống `pg` là ĐÚNG cho cột mảng THẬT (`don_hang.san_pham_ma text[]`,
  // `ky_nang.bat_cho_nhom_sp text[]` — đo 25/08). Nhưng `pg` tuần tự hoá nó thành mảng
  // POSTGRES `{a,b}`, nên cùng giá trị đó ghi vào cột `jsonb` thì Postgres ném
  // «invalid input syntax for type json» — câu đó ĐÚNG nhưng không chỉ đường, và
  // `hoi_thoai.moc_luot_llm` là một cột jsonb nhận mảng thật (đã cắn một lần ở G2-A3).
  // Tầng này không biết kiểu cột đích, và hỏi `information_schema` mỗi lượt ghi thì đắt
  // — nên không chặn trước, chỉ DỊCH LẠI câu lỗi khi nó thật sự xảy ra. Không tốn gì ở
  // đường lành, và người gặp lỗi biết ngay phải làm gì.
  let r;
  try {
    r = await pool.query(
      `UPDATE ${tenBang} SET ${gan.join(",")} WHERE ${[dkTeam, dkId, ...dkThem].join(" AND ")} RETURNING *`,
      params,
    );
  } catch (e) {
    if (coMang.length && /invalid input syntax for type json/i.test(e?.message ?? "")) {
      throw new Error(
        `${tenBang}: cột jsonb nhận MẢNG JS — \`pg\` gửi nó thành mảng Postgres {a,b}, ` +
          `không thành JSON. JSON.stringify(...) trước khi truyền. Cột nghi vấn: ` +
          `${coMang.join(", ")}. (Cột mảng THẬT như text[] thì truyền mảng là đúng.)`,
        { cause: e },
      );
    }
    throw e;
  }
  if (resolved.laHeThong)
    await ghiNhatKyHeThong(pool, resolved.teamId, "sua", tenBang);
  return r.rows[0] ?? null;
}
