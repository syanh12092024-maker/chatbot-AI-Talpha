// CHẤM TỈ LỆ HOÀN PER-KHÁCH TỪ LỊCH SỬ ĐƠN POS — job đêm (phiếu L3-M2, làn 🟥).
// Cửa kiểm #2 của L3-M4.
//
// ⛔⛔ FILE NÀY CHỈ TÍNH, PHÂN TẦNG VÀ LƯU. **KHÔNG CÓ MỘT NHÁNH CHẶN NÀO.**
// `01-QUYET-DINH.md` §11 xếp «Chặn cứng khách hoàn cao ở một ngưỡng» vào bảng ĐÃ CÂN
// NHẮC RỒI QUYẾT ĐỊNH KHÔNG LÀM, với ghi chú **«Chờ chốt»**: đề xuất chia BỐN TẦNG thay
// vì một ngưỡng, vì 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường. Viết
// một `if (tang === 'rui_ro_cao') return chan()` ở đây là tự ký một quyết định người
// quyết CHƯA ký. Tầng chỉ để L3-M4 ĐỌC và ghi vào `hang_cho_tao_don.cua_kiem`.
//
// ═══ BỐN QUYẾT ĐỊNH ĐO ĐƯỢC (đo 23/08/2026, 5.144 đơn thật / 7 shop POS) ═════════
// ① NHÓM HỦY/HOÀN = {4,5,6,7}, **KHÔNG CÓ 8** — án lệ L1-M1. `8 = packing` là một
//    bước TIẾN (`status_history` đơn 47397 UAE: 0→1→12→8). Đo lại trong chính lượt này
//    trên 5.144 đơn: 113 đơn đang đứng ở mã 8, và tính thêm 8 vào nhóm hoàn thì **108
//    khách đổi tỉ lệ**. Bản ĐANG CHẠY (`src/pancake-orders.js:13`) vẫn khai {4,5,6,7,8}
//    — đó là nợ N1 §9, không phải chuẩn để chép theo.
// ② MẪU SỐ = ĐƠN ĐÃ KẾT, không phải mọi đơn. Đơn còn đang chạy (0·1·2·9·11·12·20…)
//    chưa có kết cục nào để đếm; nhét chúng vào mẫu số làm loãng tỉ lệ theo đúng chiều
//    nguy hiểm (khách vừa hoàn 1/1 mà đang có 3 đơn dở trông như 25%). «Grain của phép
//    đo phải bằng grain của dữ liệu».
// ③ SÀN `toi_thieu_don_ket = 2`. Đo: 859 khách có ĐÚNG MỘT đơn đã kết và đơn đó hoàn
//    ⇒ 100%; chỉ 100 khách đạt 100% trên ≥2 đơn. Xếp tầng bằng một điểm dữ liệu là
//    biến nhiễu thành bản án — cùng doctrine với sàn `winner_min_orders` của hệ ads.
//    Dưới sàn thì có nhãn RIÊNG `chua_du_don`, KHÔNG gộp vào `tot` (gộp vào `tot` là
//    nói dối theo chiều dễ chịu) và KHÔNG để NULL (NULL là im lặng).
// ④ RANH GIỚI TẦNG mặc định 15 / 30 / 65 (%). Vế 30–65 là vế 01 §11 GỌI TÊN. Phân bố
//    đo được trên khách có ≥2 đơn đã kết (283 khách): 0% → 63 · 0–15% → 0 · 15–30% → 1
//    · **30–65% → 100** · ≥65% → 119. Con số 100 khớp cỡ với «144 khách» mà 01 §11
//    nói (dân số khác, thời điểm khác) và nó là một CỤM THẬT, không phải một khoảng
//    trống ai đó chia cho đẹp. Ranh giới khai config, đổi được mà không sửa mã.
//
// ═══ NGUỒN SỐ: `don_hang.trang_thai_pos`, VÀ VÌ SAO THẾ LÀ ĐỦ ════════════════════
// Phiếu ② hỏi «POS có `status_history` không?» — CÓ, 5.144/5.144 đơn đều có. Nhưng
// cửa POS (`src/pos/doc-don.js`, đất L1-M1) KHÔNG lưu mảng đó xuống cột nào, và job
// đêm không được phép tự đi gọi lại POS cho từng đơn (đó là việc của cửa POS, gọi lại
// là đẻ đường ra mạng thứ hai — án lệ #31 «cửa RA đúng một cái»).
// Nên lượt này chấm bằng `trang_thai_pos` (ảnh chụp mã POS hiện tại). ĐO ĐỘ LỆCH của
// phép quy ước đó, đừng tin: trên 5.144 đơn, «lịch sử TỪNG chạm {4,5,6,7}» khác «hiện
// tại thuộc {4,5,6,7}» ở đúng **4 đơn (0,08%)**. Tức hai cách chấm ra cùng một kết
// quả trên 99,92% dân số thật. Muốn xoá nốt 0,08% thì cửa POS phải lưu `status_history`
// — đã ghi §9 sổ điều hành, đất L1-M1.
import { ghiNhatKy } from "../db/index.js";

/** Nhóm hủy/hoàn ĐÃ XÁC MINH (luoc-do-v1.md §7.2) — quyết định ① đầu file. */
export const MA_HOAN = Object.freeze([4, 5, 6, 7]);
/** Kết cục THÀNH CÔNG: 3 = delivered · 16 = received_money. */
export const MA_THANH_CONG = Object.freeze([3, 16]);
/** MẪU SỐ — đơn đã có kết cục (quyết định ②). */
export const MA_DA_KET = Object.freeze([...MA_HOAN, ...MA_THANH_CONG]);

/** Bốn tầng + MỘT nhãn vắng mặt. Cùng tập với CHECK `khach_tang_hoan_hop_le` (005). */
export const TANG_HOAN = Object.freeze([
  "chua_du_don", // chưa đủ đơn ĐÃ KẾT để xếp tầng — KHÔNG phải tầng thứ năm
  "tot",
  "binh_thuong",
  "canh_bao", // ← vế 30–65% mà 01 §11 gọi tên
  "rui_ro_cao",
]);

/**
 * Cấu hình mặc định — mọi số ở đây đổi được mà không sửa mã (phiếu ②.2).
 * Đơn vị của ba ngưỡng là PHẦN TRĂM 0–100, đúng đơn vị cột `khach.ti_le_hoan`
 * (CHECK `khach_ti_le_hoan_phan_tram` của migration 005 kẹp cùng một đơn vị).
 */
export const CAU_HINH_TANG = Object.freeze({
  toi_thieu_don_ket: 2,
  nguong_tot: 15,
  nguong_binh_thuong: 30,
  nguong_canh_bao: 65,
});

/** Nhịp job đêm (02 §L3 «quét lại mỗi đêm»). */
export const NHIP_DEM_MS = 24 * 60 * 60 * 1000;

/**
 * Kiểm cấu hình NGAY LÚC KHAI, không đợi tới lúc chạy sai — cùng khuôn `batDauQuet`
 * ném khi `nhipMs > TRAN_QUET_MS`. Ngưỡng lộn ngược thì mọi tầng vẫn có tên và mọi
 * phép đếm vẫn ra số, chỉ có ý nghĩa là sai — kiểu hỏng câm nhất.
 */
export function kiemCauHinh(ch) {
  const {
    toi_thieu_don_ket: san,
    nguong_tot: a,
    nguong_binh_thuong: b,
    nguong_canh_bao: c,
  } = ch;
  if (!Number.isInteger(san) || san < 1)
    throw new Error(
      `cấu hình tầng hoàn: toi_thieu_don_ket=${san} phải là số nguyên ≥ 1 — sàn 0 nghĩa ` +
        `là xếp tầng cho cả khách chưa có đơn nào đã kết.`,
    );
  for (const [ten, v] of [
    ["nguong_tot", a],
    ["nguong_binh_thuong", b],
    ["nguong_canh_bao", c],
  ]) {
    if (!Number.isFinite(v) || v < 0 || v > 100)
      throw new Error(
        `cấu hình tầng hoàn: ${ten}=${v} ngoài khoảng 0–100 (đơn vị là PHẦN TRĂM, ` +
          `không phải phân số 0–1 — xem CHECK khach_ti_le_hoan_phan_tram).`,
      );
  }
  if (!(a < b && b < c))
    throw new Error(
      `cấu hình tầng hoàn: ba ngưỡng phải TĂNG DẦN, đang là ${a} / ${b} / ${c} — ` +
        `ngưỡng lộn ngược làm một tầng biến mất mà không ai thấy.`,
    );
  return ch;
}

/**
 * HÀM THUẦN — xếp tầng. Không pool, không await, không đồng hồ.
 * Biên đọc theo chiều DƯỚI-ĐÓNG/TRÊN-MỞ: `tot` = [0, 15) · `binh_thuong` = [15, 30)
 * · `canh_bao` = [30, 65) · `rui_ro_cao` = [65, 100]. Đúng 45% ⇒ `canh_bao`.
 *
 * @param tiLe    PHẦN TRĂM 0–100
 * @param soDonKet số đơn ĐÃ KẾT (mẫu số) — dưới sàn thì tỉ lệ không được xếp tầng
 */
export function chamTang(tiLe, soDonKet, cauHinh = CAU_HINH_TANG) {
  const ch = { ...CAU_HINH_TANG, ...cauHinh };
  if (!Number.isFinite(soDonKet) || soDonKet < ch.toi_thieu_don_ket)
    return "chua_du_don";
  if (tiLe < ch.nguong_tot) return "tot";
  if (tiLe < ch.nguong_binh_thuong) return "binh_thuong";
  if (tiLe < ch.nguong_canh_bao) return "canh_bao";
  return "rui_ro_cao";
}

/** Làm tròn về đúng độ chính xác của cột `numeric(5,2)` — hai vế phải bằng nhau, nếu
 *  không thì lượt chạy sau đọc «đổi» chỉ vì chữ số thứ ba, và job hết lũy đẳng. */
function tron2(x) {
  return Math.round(x * 100) / 100;
}

/**
 * Câu ĐẾM — in ra được, grep được.
 * ⛔ Vế KHÔNG ĐƯỢC RƠI RA khi ai chép câu này đi: `LEFT JOIN` (khách chưa có đơn nào
 *    vẫn phải ra một dòng, để họ nhận nhãn `chua_du_don` thay vì biến mất khỏi lượt
 *    chấm và giữ mãi tầng của tháng trước), và `d.team_id = k.team_id` (thiếu nó là
 *    đếm đơn của team khác vào hồ sơ khách team này).
 * `NULLIF(regexp_replace(...))` vì `trang_thai_pos` là TEXT: một giá trị rác không
 * được làm cả câu ném — nó thành NULL và rơi ra ngoài cả hai bộ đếm, đếm được.
 */
export const CAU_DEM_HOAN = `
  SELECT k.id,
         k.ti_le_hoan, k.tang_hoan, k.so_don_ket, k.so_don_hoan,
         count(ma.v) FILTER (WHERE ma.v = ANY($2::int[])) AS hoan,
         count(ma.v) FILTER (WHERE ma.v = ANY($3::int[])) AS ket,
         count(d.id)                                      AS tong_don,
         count(d.id) FILTER (WHERE ma.v IS NULL)          AS ma_khong_doc_duoc
    FROM khach k
    LEFT JOIN don_hang d ON d.khach_id = k.id AND d.team_id = k.team_id
    LEFT JOIN LATERAL (
      SELECT NULLIF(regexp_replace(COALESCE(d.trang_thai_pos, ''), '[^0-9]', '', 'g'), '')::int AS v
    ) ma ON true
   WHERE k.team_id = $1
   GROUP BY k.id`;

/**
 * Câu GHI — cửa ghi HẸP của job này.
 * Deny-by-default theo CẤU TRÚC, không theo một mảng allow-list: danh sách cột nằm
 * ngay trong câu, cố định, và mọi lượt ghi kẹp `k.team_id = $7`. Vì sao không dùng
 * `suaTheoId` (src/db/): nó KHÔNG nhận `ctxHeThong()`, mà job đêm phải chạm cả team
 * KỸ THUẬT `chua-phan` — 26/26 đơn thật đang ở đó (đo 23/08), và ctx NGƯỜI bị tầng
 * truy vấn từ chối trên team kỹ thuật. Vì sao không dùng `suaTheoIdPos` (src/pos/):
 * nó tự ghi thêm một dòng `nhat_ky` mang câu «cửa POS sửa dòng» — câu đó SAI cho một
 * lượt chấm tỉ lệ hoàn («cổng lỏng mà log nói dối là HAI lỗi»).
 * ⚠️ Repo nay có BỐN đường UPDATE hẹp cùng một gốc — đã ghi §9 (nợ N3/P3 lặp lại).
 * ⛔ KHÔNG đụng `sua_luc`: job này không phải một lượt sửa hồ sơ khách, và một cột
 *    «sửa lúc» nhảy mỗi đêm cho toàn bộ bảng là mất luôn ý nghĩa của cột đó.
 */
export const CAU_GHI_CHAM = `
  UPDATE khach k
     SET ti_le_hoan    = v.ti,
         tang_hoan     = v.tang,
         so_don_ket    = v.ket,
         so_don_hoan   = v.hoan,
         cham_hoan_luc = $6
    FROM (SELECT * FROM unnest($1::bigint[], $2::numeric[], $3::text[], $4::int[], $5::int[])
            AS t(id, ti, tang, ket, hoan)) v
   WHERE k.id = v.id AND k.team_id = $7`;

/**
 * Chấm MỘT team. Trả bảng đếm — cổng in số, không in chữ «xong».
 *
 * @returns {{teamId, khach, capNhat, chamLai, theoTang, maKhongDocDuoc, donDaXet}}
 *   `capNhat` = số khách có ĐIỂM SỐ đổi (tỉ lệ/tầng/tử/mẫu). Lượt thứ hai liền kề
 *   phải ra 0 — đó là phép lũy đẳng. `chamLai` = số khách được đóng dấu mốc chấm
 *   (luôn = `khach`): mốc chấm là TUỔI CỦA PHÉP ĐO, phải mới lại mỗi lượt kể cả khi
 *   điểm số không đổi (án lệ #9 — tuổi phép đo ≠ tuổi sự việc).
 */
export async function chamTiLeHoanMotTeam(
  pool,
  { teamId, cauHinh = CAU_HINH_TANG, moc = null, job = "cham-ti-le-hoan" } = {},
) {
  if (teamId == null || teamId === "")
    throw new Error("chamTiLeHoanMotTeam: thiếu teamId.");
  const ch = kiemCauHinh({ ...CAU_HINH_TANG, ...cauHinh });
  const mocCham = moc ?? new Date();

  const r = await pool.query(CAU_DEM_HOAN, [
    teamId,
    [...MA_HOAN],
    [...MA_DA_KET],
  ]);

  const id = [];
  const ti = [];
  const tang = [];
  const ket = [];
  const hoan = [];
  const theoTang = Object.fromEntries(TANG_HOAN.map((t) => [t, 0]));
  let capNhat = 0;
  let maKhongDocDuoc = 0;
  let donDaXet = 0;

  for (const d of r.rows) {
    const nKet = Number(d.ket);
    const nHoan = Number(d.hoan);
    const tiLe = nKet > 0 ? tron2((nHoan / nKet) * 100) : 0;
    const t = chamTang(tiLe, nKet, ch);
    theoTang[t]++;
    maKhongDocDuoc += Number(d.ma_khong_doc_duoc);
    donDaXet += Number(d.tong_don);

    const cuTi = d.ti_le_hoan == null ? null : Number(d.ti_le_hoan);
    if (
      cuTi !== tiLe ||
      d.tang_hoan !== t ||
      Number(d.so_don_ket) !== nKet ||
      Number(d.so_don_hoan) !== nHoan
    )
      capNhat++;

    id.push(d.id);
    ti.push(tiLe.toFixed(2));
    tang.push(t);
    ket.push(nKet);
    hoan.push(nHoan);
  }

  if (id.length)
    await pool.query(CAU_GHI_CHAM, [id, ti, tang, ket, hoan, mocCham, teamId]);

  // MỘT dòng nhật ký cho CẢ LƯỢT của team, không phải một dòng mỗi khách: chi tiết
  // từng khách đã sống trong chính bốn cột (tử/mẫu/tầng/mốc) nên tra ngược được, còn
  // n nghìn dòng `nhat_ky` mỗi đêm thì chôn mất mọi dòng nhật ký nghiệp vụ khác.
  if (id.length)
    await ghiNhatKy(pool, {
      teamId,
      tacNhan: `may:${job}`,
      hanhDong: "cham_ti_le_hoan",
      doiTuong: "khach",
      sau: { khach: id.length, capNhat, theoTang, cauHinh: ch },
      ghiChu:
        `nhóm hoàn ${JSON.stringify([...MA_HOAN])} (KHÔNG có 8 — án lệ L1-M1) · ` +
        `mẫu số = đơn đã kết ${JSON.stringify([...MA_DA_KET])} · CHỈ TÍNH, không chặn (01 §11 chờ chốt)`,
    });

  return {
    teamId: String(teamId),
    khach: id.length,
    capNhat,
    chamLai: id.length,
    theoTang,
    maKhongDocDuoc,
    donDaXet,
  };
}

/**
 * JOB ĐÊM — chấm MỌI team, kể cả team KỸ THUẬT `chua-phan` (26/26 đơn thật đang ở đó).
 * Một team hỏng KHÔNG làm hỏng cả lượt: liệt kê ra `teamHong` rồi đi tiếp (án lệ
 * «phán per-THẺ chứ không per-LÔ — một phần tử mù hoãn cả lô là fail-OPEN trá hình»).
 */
export async function chamTiLeHoan(
  pool,
  { cauHinh = CAU_HINH_TANG, job = "cham-ti-le-hoan" } = {},
) {
  const ch = kiemCauHinh({ ...CAU_HINH_TANG, ...cauHinh });
  const moc = new Date();
  const teams = (await pool.query("SELECT id, slug FROM team ORDER BY id"))
    .rows;
  const kq = {
    team: 0,
    khach: 0,
    capNhat: 0,
    theoTang: Object.fromEntries(TANG_HOAN.map((t) => [t, 0])),
    maKhongDocDuoc: 0,
    theoTeam: [],
    teamHong: [],
  };
  for (const t of teams) {
    try {
      const m = await chamTiLeHoanMotTeam(pool, {
        teamId: t.id,
        cauHinh: ch,
        moc,
        job,
      });
      kq.team++;
      kq.khach += m.khach;
      kq.capNhat += m.capNhat;
      kq.maKhongDocDuoc += m.maKhongDocDuoc;
      for (const k of TANG_HOAN) kq.theoTang[k] += m.theoTang[k];
      kq.theoTeam.push({ slug: t.slug, ...m });
    } catch (e) {
      kq.teamHong.push({ slug: t.slug, loi: e.name, thongDiep: e.message });
    }
  }
  return kq;
}

/**
 * Chạy định kỳ mỗi đêm. Trả về hàm dừng — không có hàm dừng thì bộ ca không tắt được.
 * `unref()` để cái hẹn giờ không giữ tiến trình sống.
 */
export function batDauChamDem(pool, { nhipMs = NHIP_DEM_MS, ...tuyChon } = {}) {
  let dangChay = false;
  const chay = async () => {
    if (dangChay) return; // không chồng lượt
    dangChay = true;
    try {
      await chamTiLeHoan(pool, tuyChon);
    } finally {
      dangChay = false;
    }
  };
  const h = setInterval(chay, nhipMs);
  h.unref?.();
  return () => clearInterval(h);
}
