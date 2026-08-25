// MÁY TRẠNG THÁI ĐƠN — PHÂN NHÁNH THEO NGUỒN NGAY TỪ CỬA VÀO (phiếu L3-M1, làn 🟥).
//
// ═══ VÌ SAO FILE NÀY LÀ «QUYẾT ĐỊNH SỐ MỘT VỀ NGHIỆP VỤ» (01-QUYET-DINH §1) ══════
// Sai nhánh ở đây có ĐÚNG HAI kết cục, cả hai đều là tiền thật:
//   · đơn `trang_ban_hang` KHÔNG được hỏi WhatsApp ⇒ 37,4% BUY NOW rơi im lặng;
//   · đơn `messenger` BỊ hỏi lại ⇒ làm phiền khách đã chốt trong chat, hoặc tệ hơn là
//     đóng gói gửi cho người chưa ai nói chuyện (bom hàng).
// Nên nhánh KHÔNG suy ra lúc chạy: nó là cột `don_hang.nguon` (NOT NULL, CHECK hai giá
// trị), ghi MỘT LẦN lúc tạo đơn bởi cửa POS, và bảng chuyển dưới đây khai CỨNG PER-NGUỒN.
//
// ═══ BỐN QUYẾT ĐỊNH CỦA LƯỢT NÀY (đo trước, rồi mới chốt) ════════════════════════
// ① `donId` trong MỌI interface = `don_hang.id` NỘI BỘ, không phải id đơn của POS.
//    Bài học L1-M1: id POS là dãy RIÊNG từng shop và CHỒNG NHAU (Saudi 62.029 · UAE
//    47.421 · Kuwait 13.922 · Taiwan 344, cùng đếm từ 1) — `ma_pos='<shop>:<id>'` mới là
//    khoá. Chỗ duy nhất cần id POS trần là lượt gọi cửa ghi ngược: tách ra ở `cua-pos.js`.
// ② Đơn KHÔNG quyết được `nguon` ⇒ máy TỪ CHỐI nhận (`LoiThieuNguonDon`), không đoán.
//    Cửa POS đã liệt kê sẵn nhóm này (`docDon().khongSuyDuocNguon`) chứ không ghi bừa.
// ③ `tu_choi` = «hủy» theo nghĩa 02 §L3 — khách trả lời KHÔNG mua ⇒ đơn `dong`. Máy này
//    KHÔNG ghi gì lên POS ở nhánh đó (bảng chuyển của cửa POS không có đường tới 6/7, và
//    luật 2 §0a sổ điều hành cấm xoá đơn POS ở mọi trạng thái). Hủy trên POS là việc NGƯỜI.
// ④ Trạng thái HỆ nằm ở `trang_thai_he`, TÁCH HẲN `trang_thai_pos` (hai cột, hai chủ —
//    L1-M1 gieo `'moi_tu_pos'` một lần rồi không đụng lại; từ đó trở đi chủ cột là file này).
//
// ═══ SIDE-EFFECT ĐI QUA DEPS TIÊM — RUNTIME cửa thật, TEST mock ═════════════════
// `chuyen()` là hàm THUẦN (không pool, không await, không env). Mọi thứ chạm thế giới
// ngoài (gửi WhatsApp · ghi ngược POS · huỷ lịch nhắc) là tham số `deps` của các hàm
// điều phối. Đó là lý do bộ ca đo được «messenger: guiTinMau = 0 TUYỆT ĐỐI» bằng spy.
import {
  themMoi,
  layMotTheoId,
  suaTheoId,
  ctxHeThong,
  ghiNhatKy,
  LoiThieuBoiCanhTeam,
} from "../db/index.js";

// ── LỖI CÓ TÊN ───────────────────────────────────────────────────────────────
/** Ép một đơn đi vào nhánh KHÔNG PHẢI của nguồn nó (vd đơn messenger sang trạng thái WA). */
export class LoiSaiNhanhNguon extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiSaiNhanhNguon";
  }
}
/** Cặp (trạng thái, sự kiện) không có trong bảng chuyển của NGUỒN đó. */
export class LoiChuyenNgoaiBangDon extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiChuyenNgoaiBangDon";
  }
}
/** Đơn không có `nguon` hợp lệ — máy TỪ CHỐI nhận, không đoán nhánh (quyết định ②). */
export class LoiThieuNguonDon extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiThieuNguonDon";
  }
}
/**
 * CAS ở `ghiDon` thất bại (VA-R3/RF-13): `trang_thai_he` trong CSDL không còn khớp ẢNH đã
 * đọc lúc chuẩn bị ghi — một lượt khác đã đổi nó trước. TỪ CHỐI, không ghi đè lên trên.
 */
export class LoiGhiDonAnhCu extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiGhiDonAnhCu";
  }
}

// ── TRẠNG THÁI + SỰ KIỆN ─────────────────────────────────────────────────────
/** Giá trị cửa POS gieo lúc TẠO dòng (src/pos/doc-don.js) — cửa vào của cả hai nhánh. */
export const TRANG_THAI_GIEO = "moi_tu_pos";

export const NGUON = Object.freeze({
  TRANG_BAN_HANG: "trang_ban_hang",
  MESSENGER: "messenger",
});

/**
 * BẢNG CHUYỂN CHO PHÉP — KHAI CỨNG, PER-NGUỒN, deny-by-default.
 * Khuôn `CHUYEN_CHO_PHEP` của bảng-mã-đã-xác-minh (L1-M1): cặp nào không có ở đây thì
 * bị TỪ CHỐI kèm lỗi có tên, không có nhánh «trông có vẻ vô hại thì cho qua».
 *
 * Đọc theo hàng: ở trạng thái `tu`, sự kiện `sukien` xảy ra ⇒ sang trạng thái `sang`.
 * `sukien` là SỰ KIỆN (thứ vừa xảy ra), `tu`/`sang` là TRẠNG THÁI (thứ đang đứng) — hai
 * phạm trù khác nhau, cố ý không trộn tên.
 */
export const BANG_CHUYEN = Object.freeze({
  // ── NHÁNH TRANG BÁN HÀNG: khách bấm BUY NOW, CHƯA ai nói chuyện với họ ⇒ bot phải
  //    hỏi xác nhận qua WhatsApp TRƯỚC khi đẩy Chờ in (01 §1).
  [NGUON.TRANG_BAN_HANG]: Object.freeze([
    f({
      tu: TRANG_THAI_GIEO,
      sukien: "vao_may",
      sang: "moi",
      y: "job quét nhận đơn mới từ POS",
    }),
    f({
      tu: "moi",
      sukien: "bat_dau_gui",
      sang: "cho_gui_wa",
      y: "đã chọn được số + mẫu, sắp gọi cửa WA",
    }),
    f({
      tu: "cho_gui_wa",
      sukien: "gui_xong",
      sang: "da_gui_wa",
      y: "cửa WA nhận, đang chờ khách trả lời",
    }),
    f({
      tu: "cho_gui_wa",
      sukien: "gui_hong",
      sang: "gui_wa_loi",
      y: "KHÔNG gửi được — kèm ly_do_khong_gui",
    }),
    f({
      tu: "gui_wa_loi",
      sukien: "thu_lai",
      sang: "cho_gui_wa",
      y: "job quét thử lại, còn trong trần",
    }),
    f({
      tu: "gui_wa_loi",
      sukien: "qua_tran",
      sang: "cho_sale",
      y: "hết trần thử lại ⇒ người xử",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "xac_nhan",
      sang: "day_cho_in",
      y: "khách ĐỒNG Ý ⇒ đã ghi ngược POS sang 12",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "tu_choi",
      sang: "dong",
      y: "khách TỪ CHỐI (=«hủy» 02 §L3) — không đụng POS",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "het_luot",
      sang: "cho_sale",
      y: "hết lượt nhắc mà im ⇒ người xử (hook bao_het_luot)",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "doi_sua",
      sang: "cho_sale",
      y: "khách muốn ĐỔI/SỬA ⇒ ngoài tầm bot",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "khong_ro",
      sang: "cho_sale",
      y: "bộ đọc ý không phán được ⇒ người xử",
    }),
    f({
      tu: "da_gui_wa",
      sukien: "pos_lech",
      sang: "cho_sale",
      y: "khách ĐỒNG Ý nhưng POS ở trạng thái ngoài tập tiền-in",
    }),
  ]),
  // ── NHÁNH MESSENGER: bot đã chốt TRONG CHAT, sale duyệt mới TẠO đơn, và đơn sinh ra
  //    đã ở «Chờ in» trên POS ⇒ KHÔNG BAO GIỜ hỏi lại WhatsApp (01 §1).
  //    ⛔ Pre-duyệt (đơn bot chốt CHƯA được duyệt) KHÔNG sống ở `don_hang` — nó ở
  //    `hang_cho_tao_don`, ĐẤT L3-M4. File này không mô hình nó, và bộ ca đo rằng số
  //    dòng `don_hang` nguồn messenger ở trạng thái pre-duyệt = 0.
  [NGUON.MESSENGER]: Object.freeze([
    f({
      tu: TRANG_THAI_GIEO,
      sukien: "da_tao",
      sang: "day_cho_in",
      y: "L3-M4 duyệt xong ⇒ đơn ĐÃ tạo, POS đã 12",
    }),
  ]),
});

function f(o) {
  return Object.freeze(o);
}

/** Trạng thái CHỈ có ở nhánh WhatsApp — dùng để nói ĐÚNG BỆNH khi ai đó ép sai nhánh. */
export const TRANG_THAI_CHI_CUA_WA = Object.freeze([
  "moi",
  "cho_gui_wa",
  "da_gui_wa",
  "gui_wa_loi",
]);

/** Sự kiện CHỈ có ở nhánh WhatsApp (suy ra từ chính bảng chuyển — không gõ tay lần hai). */
export const SU_KIEN_CHI_CUA_WA = Object.freeze(
  [...new Set(BANG_CHUYEN[NGUON.TRANG_BAN_HANG].map((c) => c.sukien))].filter(
    (s) => !BANG_CHUYEN[NGUON.MESSENGER].some((c) => c.sukien === s),
  ),
);

/** Ba lý do KHÔNG GỬI đếm được (02 §L3) — cùng tập với CHECK của migration 004. */
export const LY_DO_KHONG_GUI = Object.freeze([
  "thieu_so_wa",
  "mau_chua_duyet",
  "loi_kenh",
]);

/**
 * HÀM THUẦN — tra bảng chuyển. Không pool, không await, không env, không đồng hồ.
 * Ném lỗi CÓ TÊN, không trả `false` im lặng (một `false` bị bỏ quên là một đơn đứng yên).
 *
 * @param don    { nguon, trang_thai_he } — chỉ đọc hai trường đó
 * @param sukien tên sự kiện
 * @returns { nguon, tu, sang, sukien, y }
 */
export function chuyen(don, sukien) {
  const nguon = don?.nguon ?? null;
  if (!nguon || !Object.prototype.hasOwnProperty.call(BANG_CHUYEN, nguon)) {
    throw new LoiThieuNguonDon(
      `đơn không có \`nguon\` hợp lệ (đang là ${JSON.stringify(nguon)}) — máy trạng ` +
        `thái TỪ CHỐI nhận. Nhánh nghiệp vụ không được đoán lúc chạy: cửa POS liệt kê ` +
        `nhóm không suy được nguồn (docDon().khongSuyDuocNguon) thay vì ghi bừa.`,
    );
  }
  const tu = don?.trang_thai_he ?? null;
  const bang = BANG_CHUYEN[nguon];
  const khop = bang.find((c) => c.tu === tu && c.sukien === sukien);
  if (khop) return { nguon, tu, sang: khop.sang, sukien, y: khop.y };

  // Nói ĐÚNG BỆNH: ép sai NHÁNH khác hẳn với đi sai BƯỚC trong đúng nhánh.
  const nguonKhac =
    nguon === NGUON.MESSENGER ? NGUON.TRANG_BAN_HANG : NGUON.MESSENGER;
  const coBenKia = BANG_CHUYEN[nguonKhac].some(
    (c) => c.sukien === sukien || c.tu === tu,
  );
  if (
    coBenKia ||
    (nguon === NGUON.MESSENGER && TRANG_THAI_CHI_CUA_WA.includes(tu))
  ) {
    throw new LoiSaiNhanhNguon(
      `đơn nguồn "${nguon}" đang ở "${tu}" bị ép sự kiện "${sukien}" — cặp này thuộc ` +
        `nhánh "${nguonKhac}", KHÔNG có trong nhánh của đơn. 01 §1: đơn messenger đã ` +
        `được khách xác nhận trong chat, không bao giờ đi vào chuỗi trạng thái WhatsApp.`,
    );
  }
  throw new LoiChuyenNgoaiBangDon(
    `cặp ("${tu}" + sự kiện "${sukien}") KHÔNG nằm trong bảng chuyển của nguồn ` +
      `"${nguon}" [${bang.map((c) => `${c.tu}--${c.sukien}->${c.sang}`).join(", ")}] — từ chối.`,
  );
}

// ── CỬA GHI HẸP CỦA MÁY TRẠNG THÁI ───────────────────────────────────────────
// ⚠️ ĐOẠN DƯỚI ĐÂY LÀ LỊCH SỬ, KHÔNG PHẢI HIỆN TRẠNG (sửa 25/08, G2-A3): hàm `ghiDon`
// NAY gọi xuống `suaTheoId` và repo còn đúng MỘT bộ dựng câu UPDATE. Giữ lại để người
// sau đọc được vì sao từng có ba đường.
// Vì sao (LÚC ĐÓ) không dùng `suaTheoId` (L0-M2) hay `suaTheoIdPos` (L1-M1):
//   · `suaTheoId` KHÔNG hỗ trợ `ctxHeThong()` (bàn giao tầng truy vấn §3 khai rõ), mà
//     job quét BẮT BUỘC chạy dưới ctxHeThong — 26/26 đơn thật đang thuộc team KỸ THUẬT
//     `chua-phan` (đo 22/08), và ctx NGƯỜI bị từ chối trên team kỹ thuật.
//   · `suaTheoIdPos` chạy được nhưng nó tự ghi thêm một dòng `nhat_ky` mang ghi chú
//     «cửa POS sửa dòng» — với một lượt chuyển trạng thái ĐƠN thì câu đó SAI, và
//     «cổng lỏng mà log nói dối là HAI lỗi». Máy trạng thái tự ghi dòng nhật ký của
//     chính nó (`don_doi_trang_thai`, có `truoc`/`sau`) nên không cần dòng thứ hai.
// Giá phải trả lúc đó: repo tạm có ba đường UPDATE hẹp thay vì một. ĐÃ TRẢ XONG —
// `suaTheoId` cho `ctxHeThong()` làm ở G2-A1, ba cửa gộp ở G2-A3.
const COT_DUOC_GHI = Object.freeze([
  "trang_thai_he",
  "ly_do_khong_gui",
  "so_lan_thu_wa",
  "dong_luc",
]);

/**
 * CỬA GHI HẸP — CAS trên `trang_thai_he` (VA-R3/RF-13). `tu` là ẢNH `trang_thai_he` đã
 * đọc lúc quyết định chuyển (`buoc.tu` của `chuyen()`) — UPDATE chỉ chạm dòng nếu CSDL
 * NGAY LÚC GHI vẫn còn đúng ảnh đó. 0 dòng chạm ⇒ một lượt khác đã ghi trước (ảnh cũ) ⇒
 * ném `LoiGhiDonAnhCu` có tên, KHÔNG ghi đè im lặng — hai sổ (POS/hệ) không bao giờ lệch.
 */
async function ghiDon(pool, { teamId, id, tu, duLieu }) {
  for (const k of Object.keys(duLieu)) {
    if (!COT_DUOC_GHI.includes(k)) {
      throw new Error(
        `máy trạng thái đơn không được ghi cột "${k}" — chỉ ${COT_DUOC_GHI.join("/")} ` +
          `(deny-by-default; \`nguon\`/\`trang_thai_pos\`/\`ma_pos\` có chủ khác).`,
      );
    }
  }

  // ═══ GỘP VỀ MỘT BỘ DỰNG SQL (25/08, G2-A3) ══════════════════════════════════
  // Khối này TỪNG tự dựng `UPDATE don_hang SET … WHERE team AND id AND trang_thai_he`
  // vì `suaTheoId` không nhận `ctxHeThong()` VÀ không nhận điều kiện thêm — hai chỗ hẹp
  // mà G2-A1 (PHIEU-B-Y1) đã mở. So-và-đặt nay diễn đạt bằng `{ neu: { trang_thai_he: tu } }`.
  //
  // ⚠️ ĐIỂM DỄ MẤT NHẤT CỦA CẢ LƯỢT GỘP: `suaTheoId` TRẢ `null` khi 0 dòng khớp, còn
  //    hợp đồng của hàm này là NÉM `LoiGhiDonAnhCu`. Hai ngữ nghĩa khác hẳn nhau: với
  //    tầng chung «0 dòng» là chuyện thường (id không có / thuộc team khác), còn ở đây
  //    nó nghĩa là MỘT LƯỢT KHÁC ĐÃ GHI TRƯỚC — ảnh cũ đè lên ảnh mới thì hai sổ POS/hệ
  //    lệch (RF-13). Quên dịch `null` → ném là biến lá chắn RF-13 thành lệnh RỖNG mà
  //    không ai thấy. Đã ghi cảnh báo này vào §9 lúc làm G2-A1, nay thi hành nó.
  const dong = await suaTheoId(
    pool,
    ctxHeThong(),
    "don_hang",
    id,
    { ...duLieu, team_id: teamId },
    { neu: { trang_thai_he: tu }, datSuaLuc: true },
  );
  if (!dong) {
    throw new LoiGhiDonAnhCu(
      `ghiDon(id=${id}): CAS thất bại — trang_thai_he không còn bằng ẢNH đã đọc lúc ` +
        `chuẩn bị ghi (${JSON.stringify(tu)}); một lượt khác đã đổi nó trước. TỪ CHỐI ` +
        `ghi đè — hai sổ (POS/hệ) không bao giờ lệch (VA-R3/RF-13).`,
    );
  }
  return dong;
}

/**
 * Nạp một đơn + xác định team hiệu lực, cho CẢ HAI kiểu ctx.
 * ctx NGƯỜI đi qua tầng truy vấn (`layMotTheoId` tự kẹp team). `ctxHeThong()` tra RAW
 * theo khoá tự nhiên rồi TỰ RÀNG team của chính đơn — cùng tiền lệ N3 của cửa Messenger
 * và `xacDinhTeamQuaDon` của cửa WhatsApp (job nền không có team mặc định để suy hộ).
 */
export async function taiDon(pool, ctx, donId) {
  if (donId == null || donId === "")
    throw new Error(
      "máy trạng thái đơn: thiếu `donId` (= don_hang.id nội bộ).",
    );
  if (ctx?.laHeThong) {
    const r = await pool.query(
      "SELECT id, team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, ly_do_khong_gui, so_lan_thu_wa FROM don_hang WHERE id = $1",
      [donId],
    );
    if (!r.rowCount)
      throw new LoiThieuBoiCanhTeam(
        `don_hang.id=${donId} không tồn tại (đường hệ-thống — chưa có team nào để ghi nhat_ky).`,
      );
    return {
      don: r.rows[0],
      teamId: String(r.rows[0].team_id),
      laHeThong: true,
    };
  }
  const don = await layMotTheoId(pool, ctx, "don_hang", donId);
  if (!don)
    throw new LoiThieuBoiCanhTeam(
      `don_hang.id=${donId} không thuộc team ${ctx?.teamId} (không tồn tại hoặc của team khác).`,
    );
  return { don, teamId: String(ctx.teamId), laHeThong: false };
}

function tacNhanCua(ctx, job) {
  return ctx?.laHeThong ? `may:${job}` : `nguoi:${ctx?.nguoiDungId ?? "?"}`;
}

/**
 * ÁP một sự kiện lên một đơn: tra bảng chuyển → ghi cột → ghi `nhat_ky`.
 * MỌI lượt chuyển đều ghi nhật ký, KỂ CẢ lượt bị chặn (④#5) — im lặng thì không ai
 * biết đã có người thử đi cửa cấm.
 *
 * @param deps.job  tên job cho `tac_nhan` khi chạy dưới ctxHeThong
 * @param them      cột phụ ghi kèm trong CÙNG lượt (vd ly_do_khong_gui, so_lan_thu_wa)
 */
export async function apDung(
  pool,
  ctx,
  { donId, sukien, don: donSan = null, them = {} } = {},
  { job = "may-trang-thai-don" } = {},
) {
  const nap = donSan
    ? {
        don: donSan,
        teamId: String(donSan.team_id),
        laHeThong: !!ctx?.laHeThong,
      }
    : await taiDon(pool, ctx, donId);
  const { don, teamId } = nap;
  const tacNhan = tacNhanCua(ctx, job);
  const nguoiDungId = ctx?.laHeThong ? null : (ctx?.nguoiDungId ?? null);

  let buoc;
  try {
    buoc = chuyen(don, sukien);
  } catch (e) {
    await ghiNhatKy(pool, {
      teamId,
      tacNhan,
      nguoiDungId,
      hanhDong: "don_chuyen_bi_chan",
      doiTuong: "don_hang",
      doiTuongId: String(don.id),
      truoc: { nguon: don.nguon, trang_thai_he: don.trang_thai_he },
      sau: { sukien },
      ghiChu: `${e.name}: ${e.message}`.slice(0, 500),
    });
    throw e;
  }

  const duLieu = { trang_thai_he: buoc.sang, ...them };
  // Bất biến của migration 004: lý do chỉ sống cùng `gui_wa_loi`. Dọn ngay trong lượt
  // rời trạng thái đó, nếu không CHECK ở tầng CSDL sẽ ném (đúng chiều — nhưng thà dọn
  // tường minh ở đây để câu lỗi không bao giờ phải xuất hiện).
  if (buoc.sang !== "gui_wa_loi" && !("ly_do_khong_gui" in duLieu))
    duLieu.ly_do_khong_gui = null;
  if (buoc.sang === "dong") duLieu.dong_luc = new Date();

  // CAS ở ghiDon (VA-R3/RF-13): 0 dòng chạm ⇒ ẢNH CŨ — TỪ CHỐI, không phải bug logic của
  // caller (khác chuyen() ném ở trên — cặp SAI thì KHÔNG retry nào cứu được). Đây là đụng
  // độ TẠM THỜI với một lượt khác đã thắng trước: log CÓ TÊN rồi trả về `ghi:false` thay vì
  // ném xuyên qua caller — job nền (quetDonMoi) đã tự bọc try/catch per-đơn nên vẫn AN
  // TOÀN nếu propagate, nhưng buộc MỌI caller (kể cả gọi trực tiếp không bọc) phải tự xử
  // một đụng độ vốn đã VÔ HẠI (bên thắng đã ghi đúng ảnh mới, hai sổ không lệch) là cái giá
  // không đáng — nói rõ theo luật 13 (tradeoff).
  try {
    const sau = await ghiDon(pool, { teamId, id: don.id, tu: buoc.tu, duLieu });
    await ghiNhatKy(pool, {
      teamId,
      tacNhan,
      nguoiDungId,
      hanhDong: "don_doi_trang_thai",
      doiTuong: "don_hang",
      doiTuongId: String(don.id),
      truoc: {
        trang_thai_he: buoc.tu,
        ly_do_khong_gui: don.ly_do_khong_gui ?? null,
      },
      sau: { trang_thai_he: buoc.sang, sukien, ...them },
      ghiChu: `nguon=${buoc.nguon} · ${buoc.y}`,
    });
    return { ...buoc, don: sau, teamId, ghi: true };
  } catch (e) {
    if (!(e instanceof LoiGhiDonAnhCu)) throw e;
    await ghiNhatKy(pool, {
      teamId,
      tacNhan,
      nguoiDungId,
      hanhDong: "don_chuyen_bi_chan",
      doiTuong: "don_hang",
      doiTuongId: String(don.id),
      truoc: { nguon: don.nguon, trang_thai_he: don.trang_thai_he },
      sau: { sukien, muonSang: buoc.sang },
      ghiChu: `${e.name}: ${e.message}`.slice(0, 500),
    });
    return { ...buoc, don, teamId, ghi: false, biTuChoiAnhCu: true };
  }
}

/** Đẩy một đơn sang hàng chờ sale, kèm lý do NGUYÊN VĂN (hiện trên mỗi dòng màn L4). */
export async function dayChoSale(
  pool,
  ctx,
  { don, teamId, lyDo, phutHan = 10 },
) {
  return themMoi(pool, ctx?.laHeThong ? ctxHeThong() : ctx, "viec_can_xu_ly", {
    team_id: teamId,
    loai: "don_hang",
    don_hang_id: don.id,
    ly_do_day: lyDo,
    han_luc: new Date(Date.now() + phutHan * 60_000),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE CHO CÁC PHIẾU SAU — đủ ba phía (verdict câu 7)
// ═══════════════════════════════════════════════════════════════════════════════

/** Bốn kết quả bộ đọc ý L3-M3 trả về. Khai một chỗ, cả hai bên đọc chung. */
export const KET_QUA_PHAN_HOI = Object.freeze([
  "xac_nhan",
  "tu_choi",
  "doi_sua",
  "khong_ro",
]);

/**
 * TẬP TRẠNG THÁI POS «TIỀN IN» HỢP LỆ cho phép CAS sang 12 (Chờ in).
 *
 * ĐO 22/08/2026 (không đoán — luoc-do-v1.md §7.2, bảng 14 mã đã xác minh trên 3.546 đơn
 * thật/7 shop bằng chính `status_name` do API POS trả):
 *   0 = `new`        (Chờ xác nhận) — trạng thái ban đầu luồng trang bán hàng, 01 §1
 *   1 = `submitted`  (Đã gửi/đã duyệt) ← NHÃN ĐÃ ĐO, phiếu để thợ chốt
 * Đồ thị chuyển thật trên 1.400 đơn cho `0 → 1 → 12 → 8`, nên **1 đứng TRƯỚC 12**: sale
 * bấm duyệt tay xen giữa lúc bot đang chờ khách trả lời là chuyện thường, không phải
 * bất thường. Mọi mã khác (kể cả 8 = `packing`, một bước TIẾN) nằm NGOÀI tập: hệ KHÔNG
 * ghi POS, đơn sang `cho_sale` kèm lý do đọc được — không im lặng, không ghi bừa.
 */
export const TAP_TIEN_IN = Object.freeze([0, 1]);
export const MA_POS_CHO_IN = 12;

/** Không có lịch nhắc để huỷ ⇒ nói ra, đừng im. Bảng `lich_nhac` là ĐẤT L3-M3. */
const huyLichNhacMacDinh = async () => ({ camChua: false, huy: 0 });

/**
 * L3-M3 (bộ đọc ý) gọi vào đây với MỘT trong bốn kết quả.
 *
 *   xac_nhan  → đọc LIVE POS → CAS {tu: live, sang: 12} → `day_cho_in`
 *               (live ngoài TAP_TIEN_IN ⇒ 0 lượt ghi POS, đơn sang `cho_sale`)
 *   tu_choi   → `dong`, KHÔNG chạm POS
 *   doi_sua / khong_ro → `cho_sale` + 1 dòng `viec_can_xu_ly` mang lý do rõ
 *
 * `huyLichNhac` được GỌI khi `xac_nhan`/`tu_choi` tới — khách đã trả lời thì mọi lượt
 * nhắc còn hẹn là tin rác gửi cho người đã xong việc.
 */
export async function nhanPhanHoi(
  pool,
  ctx,
  { donId, ket_qua } = {},
  deps = {},
) {
  const {
    ghiNguocPos, // (pool, ctx, {don, teamId, tu, sang}) => kết quả cửa POS
    docLivePos, // (pool, ctx, {don, teamId}) => mã trạng thái LIVE (số)
    huyLichNhac = huyLichNhacMacDinh,
    job = "may-trang-thai-don",
  } = deps;

  if (!KET_QUA_PHAN_HOI.includes(ket_qua)) {
    throw new Error(
      `nhanPhanHoi: ket_qua="${ket_qua}" không thuộc bốn kết quả ` +
        `[${KET_QUA_PHAN_HOI.join(", ")}] — bộ đọc ý phải phán một trong bốn, ` +
        `"không biết" đã có tên riêng là "khong_ro".`,
    );
  }
  const { don, teamId } = await taiDon(pool, ctx, donId);

  if (ket_qua === "tu_choi") {
    const huy = await huyLichNhac(donId);
    const kq = await apDung(
      pool,
      ctx,
      { donId, sukien: "tu_choi", don },
      { job },
    );
    return { ...kq, huyLichNhac: huy, posGhi: 0 };
  }

  if (ket_qua === "doi_sua" || ket_qua === "khong_ro") {
    const kq = await apDung(
      pool,
      ctx,
      { donId, sukien: ket_qua, don },
      { job },
    );
    const viec = await dayChoSale(pool, ctx, {
      don,
      teamId,
      lyDo:
        // Tiền tố = ĐÚNG TÊN SỰ KIỆN, để màn L4 và mọi phép đếm grep được theo một
        // từ vựng duy nhất (đặt tên khác ở đây là đẻ ra từ vựng thứ hai cho cùng một việc).
        ket_qua === "doi_sua"
          ? "doi_sua: khách muốn đổi/sửa đơn — ngoài tầm bot xác nhận"
          : "khong_ro: bộ đọc ý không phán được câu trả lời của khách",
    });
    return { ...kq, viecId: viec.id, posGhi: 0 };
  }

  // ── xac_nhan: CAS THEO LIVE ─────────────────────────────────────────────────
  const huy = await huyLichNhac(donId);
  if (typeof docLivePos !== "function")
    throw new Error(
      "nhanPhanHoi(xac_nhan): thiếu deps.docLivePos — không đọc được LIVE POS.",
    );
  const live = Number(await docLivePos(pool, ctx, { don, teamId }));

  if (!TAP_TIEN_IN.includes(live)) {
    const kq = await apDung(
      pool,
      ctx,
      { donId, sukien: "pos_lech", don },
      { job },
    );
    const viec = await dayChoSale(pool, ctx, {
      don,
      teamId,
      lyDo:
        `pos_trang_thai_la=${live}: khách ĐÃ đồng ý nhưng POS đang ở mã ${live}, ` +
        `ngoài tập tiền-in [${TAP_TIEN_IN.join(",")}] — hệ KHÔNG ghi đè, người kiểm tay.`,
    });
    return {
      ...kq,
      live,
      posGhi: 0,
      lyDo: `pos_trang_thai_la=${live}`,
      viecId: viec.id,
      huyLichNhac: huy,
    };
  }

  if (typeof ghiNguocPos !== "function")
    throw new Error(
      "nhanPhanHoi(xac_nhan): thiếu deps.ghiNguocPos — không có cửa ghi POS.",
    );
  let posKq;
  try {
    posKq = await ghiNguocPos(pool, ctx, {
      don,
      teamId,
      tu: live,
      sang: MA_POS_CHO_IN,
    });
  } catch (e) {
    // Cửa POS từ chối (van đóng · cặp ngoài bảng · live đã đổi lần nữa · POS im). KHÔNG
    // nuốt: đơn sang `cho_sale` mang đúng tên lỗi, người đọc được ngay trên màn L4.
    const kq = await apDung(
      pool,
      ctx,
      { donId, sukien: "pos_lech", don },
      { job },
    );
    const viec = await dayChoSale(pool, ctx, {
      don,
      teamId,
      lyDo: `pos_tu_choi_ghi (${e.name}): ${e.message}`.slice(0, 400),
    });
    return {
      ...kq,
      live,
      posGhi: 0,
      lyDo: `pos_tu_choi_ghi:${e.name}`,
      viecId: viec.id,
      huyLichNhac: huy,
    };
  }

  const kq = await apDung(
    pool,
    ctx,
    { donId, sukien: "xac_nhan", don },
    { job },
  );
  return { ...kq, live, posGhi: 1, pos: posKq, huyLichNhac: huy };
}

/**
 * Hook L3-M3: hàng đợi nhắc đã bắn hết lượt mà khách vẫn im ⇒ đẩy người.
 * Tồn tại để `cho_sale` không có đường vào MỒ CÔI — mọi trạng thái phải có sự kiện KÍCH.
 */
export async function baoHetLuot(pool, ctx, { donId } = {}, deps = {}) {
  const { job = "may-trang-thai-don" } = deps;
  const { don, teamId } = await taiDon(pool, ctx, donId);
  const kq = await apDung(
    pool,
    ctx,
    { donId, sukien: "het_luot", don },
    { job },
  );
  const viec = await dayChoSale(pool, ctx, {
    don,
    teamId,
    lyDo: "het_luot_nhac: đã nhắc hết lượt qua WhatsApp mà khách không trả lời",
  });
  return { ...kq, viecId: viec.id };
}

/**
 * Hook L3-M4: sale đã DUYỆT một dòng `hang_cho_tao_don` ⇒ đơn vừa được TẠO trong
 * `don_hang` (POS đã ở «Chờ in» từ lúc tạo). Máy chỉ nhận đơn ĐÃ TẠO.
 * ⛔ KHÔNG có bước WhatsApp nào ở nhánh này — 01 §1, và cửa WA cũng tự rào
 * (`LoiSaiNguonDon`). Hai tầng, hai tên lỗi, cùng một ý.
 */
export async function donMessengerDaTao(pool, ctx, { donId } = {}, deps = {}) {
  const { job = "may-trang-thai-don" } = deps;
  const { don } = await taiDon(pool, ctx, donId);
  if (don.nguon !== NGUON.MESSENGER) {
    throw new LoiSaiNhanhNguon(
      `donMessengerDaTao gọi trên đơn nguồn "${don.nguon}" — hàm này CHỈ nhận đơn ` +
        `messenger đã được sale duyệt tạo (01 §1).`,
    );
  }
  return apDung(pool, ctx, { donId, sukien: "da_tao", don }, { job });
}
