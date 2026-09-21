import { nhanDienSale } from '../chat/human.js';
// WORKER — rút MỘT tin khỏi hàng đợi rồi giao cho nhạc trưởng (phiếu L2-M1 ②.2b).
//
// Hai khoá (khoá DÒNG + khoá HỘI THOẠI) nằm ở `kho.js`; file này quyết định
// TRẠNG THÁI CUỐI của tin, và đó là toàn bộ giá trị của nó:
//
//   kết quả nhạc trưởng | trạng thái tin | thử lại?
//   --------------------|----------------|---------------------------------------------
//   xong                | xong           | không
//   chan_guard          | chan_guard     | ⛔ KHÔNG BAO GIỜ (N6)
//   ném lỗi             | cho / loi      | có, tới trần TRAN_THU
//
// ⛔ VÌ SAO `chan_guard` KHÔNG ĐƯỢC THỬ LẠI (N6): cửa đóng là một QUYẾT ĐỊNH của môi
// trường (`V3_PANCAKE_GUI` chưa đặt, hoặc `PANCAKE_READONLY=1`), không phải sự cố thoáng
// qua. Mà lượt gọi model chạy TRƯỚC lượt gửi, nên mỗi lần thử lại là đốt thêm một lượt
// token thật cho một tin chắc chắn không gửi được. Gộp nó vào `loi` là biến một cái van
// đóng thành một máy đốt tiền chạy tới khi chạm trần. Người vận hành mở van rồi thì
// UPDATE tay đám `chan_guard` về `cho` — có chủ đích, không tự động.
import { moPhienRut, TRANG_THAI, THU_LAI, ghiNhatKyHangDoi } from "./kho.js";
import { xuLyMotTin, KET_QUA, vanGuiDangMo } from "../chat/handler-v3.js";
import { docTin as cuaDocTin } from "../channels/messenger/index.js";
import { ctxHeThong } from "../db/index.js";
import * as cuaMessenger from "../channels/messenger/index.js";
import { daBatDauGui, bocCuaGuiBen, dangDienTap, LoiCanDoiChieuGui } from "./lan-gui.js";
import { gomCumTinKhach } from "./nap.js";
import { ghiSoAi, LOAI as LOAI_SO_AI, KHONG_GOI_MODEL } from "../chat/so-ai.js";

async function banGiaoLoi(db, tin) {
  await db.query(`UPDATE hoi_thoai h SET chu_so_huu='SALE',trang_thai='HANDOFF',
          ly_do_cuoi='loi_xu_ly_can_doi_chieu',nguoi_that_luc=now(),sua_luc=now()
          FROM page p WHERE h.page_id=p.id AND h.team_id=$1 AND p.page_id=$2 AND h.psid=$3
            AND h.chu_so_huu='AI' AND h.trang_thai IN ('GREET','QUALIFY','SELLING')`,
          [tin.team_id, tin.page_id, tin.psid]);
}

/** Trần số lượt RÚT một tin. Chạm trần ⇒ `loi` vĩnh viễn, không quay lại `cho` nữa. */
export const TRAN_THU = 3;

/**
 * Chạy ĐÚNG MỘT vòng: rút 1 tin (nếu có) → xử lý → chốt trạng thái.
 * @returns {Promise<null|{tinId: string, ketQua: string, lyDo: string, dem: object, soLanThu: number}>}
 *          `null` = hàng đợi không có tin nào rút được LÚC NÀY (rỗng, hoặc mọi hội thoại
 *          còn tin đang bị worker khác giữ khoá).
 */
export async function chayMotVong(pool, deps = {}) {
  const khoaWorker = deps.khoaWorker || `w-${process.pid}`;
  const phien = await moPhienRut(pool, { khoaWorker, pageIds: deps.pageIds ?? null });
  if (!phien) return null;

  const { tin, khach } = phien;
  const poolGui = deps.poolGui || pool;
  try {
    // Dấu gửi sống qua crash/rollback. Không chạy lại model để tạo câu trả lời khác.
    if (await daBatDauGui(poolGui, tin)) throw new LoiCanDoiChieuGui();
    // VA-R1 · RF-2: worker ĐỌC VAN GỬI trước khi giao tin cho nhạc trưởng. Van đóng ⇒
    // chốt `chan_guard` NGAY (0 lượt đọc lịch sử, 0 token, 0 HTTP) — không chờ tới lượt
    // cửa chặn ở cuối. Bản cũ không đọc van: mọi tin lọt vào hàng đợi (V3_NAP_DEV, cwd
    // lạ) đều được chạy trọn bộ não trước khi cửa nói «đóng». Chỉ áp khi dùng CỬA THẬT
    // (cửa TIÊM = harness, tự gánh van) — cùng luật với bước 7 của handler-v3.
    // DIỄN TẬP đi qua được chốt này — và đó là đúng: chốt sinh ra để khỏi đốt token cho
    // tin không giao được, còn diễn tập thì token chi ra CHÍNH LÀ thứ đang đo. Lượt gửi
    // vẫn không bay: cửa gửi (`bocCuaGuiBen`) ghi sổ rồi dừng, và cổng HTTP ghi của
    // `handler-v3` vẫn chặn mọi POST tới pages.fm — lưới cuối KHÔNG gỡ khi diễn tập.
    if (!deps.cua && !vanGuiDangMo() && !dangDienTap()) {
      const lyDo =
        `Van GỬI đóng (V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} · ` +
        `PANCAKE_READONLY=${JSON.stringify(process.env.PANCAKE_READONLY)}) — worker không ` +
        `giao tin cho bộ não. Mở van rồi UPDATE tay tin chan_guard về cho.`;
      await ghiNhatKyHangDoi(khach, {
        teamId: tin.team_id,
        hanhDong: "tin_chan_guard",
        tinId: tin.id,
        ghiChu: lyDo.slice(0, 400),
      });
      await phien.ketThuc(TRANG_THAI.CHAN_GUARD, lyDo);
      return {
        tinId: tin.id,
        ketQua: KET_QUA.CHAN_GUARD,
        lyDo,
        dem: { goiModel: 0 },
        soLanThu: tin.so_lan_thu,
      };
    }
    let tinXuLy = tin;
    let batchIds = [];
    if (tin.nguon === 'webhook') {
      const page = (await khach.query('SELECT nguon_tin FROM page WHERE team_id=$1 AND page_id=$2',
        [tin.team_id, tin.page_id])).rows[0];
      if (page?.nguon_tin !== 'webhook') {
        await phien.ketThuc(TRANG_THAI.CHAN_GUARD, 'Page đã đổi nguồn nhận tin');
        return { tinId: tin.id, ketQua: KET_QUA.CHAN_GUARD, lyDo: 'nguon_da_doi', dem: {}, soLanThu: tin.so_lan_thu };
      }
      // Không đoán conv_id = psid: chỉ dùng mapping mà Pancake xác nhận.
      const ds = await (deps.docHoiThoai || cuaMessenger.docHoiThoai)(khach,
        ctxHeThong(), { pageId: tin.page_id }, deps.depsPancake || {});
      const matches = (ds || []).filter(c => String(c.from_psid) === String(tin.psid));
      const c = matches.length === 1 ? matches[0] : null;
      if (!c?.id || !c.customers?.[0]?.id) {
        const e = new Error('Pancake chưa trả mapping duy nhất cho khách webhook');
        e.name = 'LoiChoMappingPancake';
        e.treMs = 5000;
        throw e;
      }
      tinXuLy = { ...tin, conv_id: String(c.id), cust_id: String(c.customers[0].id) };
    }
    if (tin.nguon === 'webhook') {
      // Gom tối đa 5 tin đã chờ sẵn, không thêm debounce làm chậm tin đầu.
      // Giữ mọi raw event; chỉ đánh dấu cùng xử lý sau khi lượt chính thành công.
      const more = await khach.query(`SELECT id,noi_dung,nguon,trang_thai,thu_lai_luc FROM tin_cho_xu_ly
        WHERE team_id=$1 AND page_id=$2 AND psid=$3 AND id>$4
          AND trang_thai NOT IN ('xong','chan_guard')
        ORDER BY id LIMIT 5 FOR UPDATE NOWAIT`, [tin.team_id, tin.page_id, tin.psid, tin.id]);
      const selected = [];
      let length = String(tin.noi_dung || '').length;
      for (const item of more.rows) {
        if (item.nguon !== 'webhook' || item.trang_thai !== 'cho' || new Date(item.thu_lai_luc).getTime() > Date.now()) break;
        if (length + item.noi_dung.length > 20000) break;
        selected.push(item); length += item.noi_dung.length + 1;
      }
      batchIds = selected.map(r => r.id);
      tinXuLy = { ...tinXuLy, noi_dung: [tin.noi_dung, ...selected.map(r => r.noi_dung)].join('\n') };
    }
    // Không trả lời mù khi API lịch sử lỗi: có thể sale đã tiếp quản hoặc khách
    // đã sửa thông tin. Retry có backoff trước khi tốn token.
    let lichSu = [];
    if (deps.docLichSu !== false) {
      const docT = deps.docTin || cuaDocTin;
      lichSu = (await docT(khach, ctxHeThong(), {
        pageId: tin.page_id, psid: tin.psid, convId: tinXuLy.conv_id, custId: tinXuLy.cust_id,
      }, deps.depsPancake || {})) || [];
    }

    await nhanDienSale(khach, { teamId: tin.team_id, pageId: tin.page_id, psid: tin.psid, messages: lichSu });

    // ── NHƯỜNG BOTCAKE/SALE — kiểm NGAY TRƯỚC khi tốn token ────────────────────────
    //
    // Bộ nạp đã bỏ qua hội thoại mà page nói cuối, nhưng đó là ảnh chụp lúc NẠP. Giữa
    // lúc xếp hàng và lúc worker rút việc còn một khoảng (chờ gõ xong + hàng đợi), và
    // đúng khoảng đó Botcake hay chen vào. `pancake-poll.js` §"CHỜ TỚI KHI BOTCAKE IM
    // HẲN" đo 11/08: **50% tiền token chảy vào nhóm tin bị vứt** vì page đã trả lời rồi.
    //
    // Ở v1 phải ngủ rồi hỏi lại API. Ở đây KHÔNG tốn gì thêm: `lichSu` vài dòng trên vừa
    // đọc lại từ Pancake đúng lúc này. `gomCumTinKhach` trả `null` ⇔ tin cuối là của
    // page — cùng một phép của bộ nạp, nên hai nơi không thể kết luận khác nhau.
    //
    // ⚠️ Chỉ chặn khi CHẮC CHẮN đọc được lịch sử. `docLichSu === false` (bộ ca truyền vào)
    //    hay API lỗi trả mảng rỗng thì KHÔNG suy ra "page đã nói" — đoán sai ở đây là bot
    //    câm với khách thật.
    if (deps.docLichSu !== false && lichSu.length && !gomCumTinKhach(lichSu, tin.page_id)) {
      // VÀO SỔ AI. Lượt nhường KHÔNG tốn đồng nào, và đó CHÍNH LÀ con số đáng biết: màn
      // chi phí phải đếm được "đã nhường bao nhiêu lượt" bên cạnh "đã tiêu bao nhiêu".
      // Không ghi thì tiền tiết kiệm được là một con số không ai nhìn thấy. Sổ đã có sẵn
      // loại `yielded` cho đúng việc này (`so-ai.js#LOAI`).
      await ghiSoAi(khach, {
        teamId: tin.team_id, tinId: tin.id, loai: LOAI_SO_AI.YIELDED,
        maModel: KHONG_GOI_MODEL, pageId: tin.page_id, psid: tin.psid,
        lyDo: "page da tra loi truoc",
      });
      await ghiNhatKyHangDoi(khach, {
        teamId: tin.team_id,
        hanhDong: "tin_nhuong_page",
        tinId: tin.id,
        ghiChu: "page (Botcake/sale/POS) đã trả lời sau khi tin vào hàng đợi",
      });
      if (batchIds.length) {
        await khach.query(
          `UPDATE tin_cho_xu_ly SET trang_thai='xong', ly_do=$3, sua_luc=now()
            WHERE team_id=$1 AND id=ANY($2::bigint[])`,
          [tin.team_id, batchIds, `gom_vao_tin:${tin.id}`],
        );
      }
      const lyDo = "page đã trả lời trước — nhường, không gọi model";
      await phien.ketThuc(TRANG_THAI.XONG, lyDo);
      return { tinId: tin.id, ketQua: KET_QUA.NHUONG_PAGE, lyDo, soLanThu: tin.so_lan_thu };
    }

    // ⚠️ Truyền `khach` (client của giao dịch đang mở), KHÔNG phải `pool`: mọi lượt ghi
    // của nhạc trưởng phải nằm TRONG cùng giao dịch với việc chốt trạng thái tin. Dùng
    // `pool` là mở một kết nối thứ hai — nó sẽ ĐỨNG CHỜ chính hàng `tin_cho_xu_ly` mà
    // giao dịch này đang khoá nếu có ai đụng tới, và tệ hơn: sổ AI ghi xong rồi giao
    // dịch rollback thì sổ nói bot đã trả lời một tin vẫn đang ở 'cho'.
    const cua = bocCuaGuiBen(poolGui, tin, { ...cuaMessenger, ...deps.cua });
    const kq = await xuLyMotTin(khach, tinXuLy, { ...deps, cua, lichSu });

    if (kq.ketQua === KET_QUA.CHAN_GUARD) {
      await ghiNhatKyHangDoi(khach, {
        teamId: tin.team_id,
        hanhDong: "tin_chan_guard",
        tinId: tin.id,
        ghiChu: String(kq.lyDo).slice(0, 400),
      });
      await phien.ketThuc(TRANG_THAI.CHAN_GUARD, kq.lyDo);
      return { tinId: tin.id, ...kq, soLanThu: tin.so_lan_thu };
    }
    if (batchIds.length) await khach.query(`UPDATE tin_cho_xu_ly SET trang_thai='xong',
      ly_do=$3,sua_luc=now() WHERE team_id=$1 AND id=ANY($2::bigint[])`,
      [tin.team_id, batchIds, `gom_vao_tin:${tin.id}`]);
    await phien.ketThuc(TRANG_THAI.XONG, kq.lyDo);
    return { tinId: tin.id, ...kq, soLanThu: tin.so_lan_thu };
  } catch (e) {
    // Lỗi SQL sau HTTP cũng không được tự gửi lại. Mất kết nối với sổ gửi = chưa rõ.
    const daGui = await daBatDauGui(poolGui, tin).catch(() => true);
    // Trần thử lại. `tin.so_lan_thu` đã được câu rút CỘNG 1 rồi, nên so trực tiếp.
    const hetLuot = daGui || e?.khongThuLai === true || [400,401,403,404,422].includes(Number(e?.status)) || Number(tin.so_lan_thu) >= TRAN_THU;
    const trangThai = hetLuot ? TRANG_THAI.LOI : THU_LAI;
    const lyDo = `${e?.name || "Error"}: ${e?.message || ""}`;
    try {
      if (hetLuot) await banGiaoLoi(khach, tin);
      await phien.ketThuc(trangThai, lyDo, e.treMs || Math.min(30000, 1000 * 2 ** (Number(tin.so_lan_thu) - 1)));
    } catch {
      // Giao dịch SQL đã abort: rollback trước, rồi lưu attempt ngoài giao dịch
      // để một lỗi SQL lặp lại không làm reset ngân sách thử mãi về 0.
      await phien.huy().catch(() => {});
      // SQL lỗi làm rollback cả attempt counter. Ghi lại ngoài giao dịch hỏng,
      // có CAS để không ghi đè nếu worker khác đã rút tin sau khi khóa nhả.
      const recovered = await pool.query(
        `UPDATE tin_cho_xu_ly SET trang_thai=$3,so_lan_thu=$4,ly_do=$5,khoa_worker=NULL,
          sua_luc=now(),thu_lai_luc=now()+interval '5 seconds'
         WHERE id=$1 AND team_id=$2 AND trang_thai='cho' AND so_lan_thu=$4-1`,
        [tin.id, tin.team_id, trangThai, Number(tin.so_lan_thu), lyDo.slice(0, 500)],
      ).catch(() => null);
      if (hetLuot && recovered?.rowCount) await banGiaoLoi(pool, tin).catch(() => {});
    }
    return {
      tinId: tin.id,
      ketQua: trangThai === TRANG_THAI.LOI ? KET_QUA.LOI : "thu_lai",
      lyDo,
      dem: {},
      soLanThu: Number(tin.so_lan_thu),
    };
  }
}

/**
 * Chạy nhiều vòng cho tới khi hết việc (hoặc chạm `toiDa`). Trả bảng đếm theo kết quả.
 * Đây là hình dạng mà một tiến trình worker thật sẽ gọi trong vòng lặp có ngủ.
 */
export async function chayToiKhiHet(pool, { toiDa = 100, dongThoi = 1, ...deps } = {}) {
  const dem = { vong: 0, xong: 0, chan_guard: 0, loi: 0, thu_lai: 0 };
  // Dành kết nối cho sổ gửi nếu caller không cấp pool riêng.
  const max = Math.max(1, (pool.options?.max || 4) - (deps.poolGui && deps.poolGui !== pool ? 0 : 1));
  const workers = Math.min(max, Math.max(1, Math.floor(Number(dongThoi) || 1)), Math.max(1, toiDa));
  let reserved = 0;
  await Promise.all(Array.from({ length: workers }, async () => {
    while (reserved++ < toiDa) {
      const r = await chayMotVong(pool, deps);
      if (!r) return;
      dem.vong++;
      dem[r.ketQua] = (dem[r.ketQua] || 0) + 1;
    }
  }));
  return dem;
}

export { TRANG_THAI };
