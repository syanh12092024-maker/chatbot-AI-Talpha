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
//   đọc lịch sử lỗi     | cho / xong     | có, lùi 15 s · 30 s; hết lượt ⇒ giao sale + dòng việc (GL3b)
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
import { PHUT_HAN_VIEC } from "../admin-v3/operations.js";
import { ghiLoiKenh, ghiDocTot, ghiGuiTot, locPageNgat, cauLyDoDoc, cauLyDoGui, LY_DO_VIEC_GUI_LOI } from "./ngat-page.js";

// Bàn giao khi lượt xử lý CÓ THỂ ĐÃ GỬI (lỗi sau HTTP, chưa rõ kết quả) ⇒ người đối chiếu. KHÔNG dùng cho đọc lịch
// sử lỗi (GL3b — xem `banGiaoDocLoi`): ở đó chắc chắn chưa gửi gì, và sale cần một DÒNG VIỆC chứ không phải đối chiếu.
async function banGiaoLoi(db, tin) {
  await db.query(`UPDATE hoi_thoai h SET chu_so_huu='SALE',trang_thai='HANDOFF',
          ly_do_cuoi='loi_xu_ly_can_doi_chieu',nguoi_that_luc=now(),sua_luc=now()
          FROM page p WHERE h.page_id=p.id AND h.team_id=$1 AND p.page_id=$2 AND h.psid=$3
            AND h.chu_so_huu='AI' AND h.trang_thai IN ('GREET','QUALIFY','SELLING')`,
          [tin.team_id, tin.page_id, tin.psid]);
}

/** Trần số lượt RÚT một tin. Chạm trần ⇒ `loi` vĩnh viễn, không quay lại `cho` nữa. */
export const TRAN_THU = 3;

// ── ĐỌC LỊCH SỬ PANCAKE LỖI (PHIẾU GL3b) ────────────────────────────────────────────
// Lùi DÀI theo tiền lệ `LoiChoMappingPancake.treMs`: lượt 1 → 15 s, lượt 2 → 30 s — ba lượt phủ ≥ 45 s cộng thời gian
// đọc, cùng chiều người quyết chốt cho GL4 «tin tồn giữ ở chờ». Lùi 1 s/2 s mặc định thì Pancake chập vài giây là bàn
// giao. Phần tử thứ n = độ lùi sau lượt RÚT thứ n+1 thất bại.
export const TRE_DOC_LICH_SU_MS = Object.freeze([15_000, 30_000]);
const LY_DO_VIEC_DOC_LOI = "Pancake không trả lịch sử — bot CHƯA trả lời, CHƯA gửi gì";

/**
 * Hết lượt đọc lịch sử ⇒ giao sale TRONG CÙNG giao dịch (client `khach` của phiên rút) + MỘT dòng việc. Chỉ khi bot
 * LẼ RA phải trả lời (UPDATE đổi ĐÚNG 1 dòng) — cùng điều kiện cửa đầu của handler (`handler-v3.js`: `bot_ai_bat` ·
 * `aiDuocTraLoi` · nguồn khớp): sale đang giữ / CLOSING / POST_SALE / page đã tắt bot / page đổi nguồn thì dù đọc
 * được bot cũng im, đẻ việc «bot CHƯA trả lời» là nhiễu (và lật SALE một hội thoại bot vốn không giữ). Chèn việc theo
 * đúng khuôn `admin-v3/operations.js#handoffConversation` (NOT EXISTS việc chưa đóng cùng hội thoại, hạn
 * `PHUT_HAN_VIEC`), ghi nhật ký như các nhánh khác của worker. Ném khi SQL lỗi — nơi gọi về đường cũ (`loi` +
 * `banGiaoLoi`), KHÔNG chốt `xong`.
 * @returns {Promise<{banGiao: boolean, viecMoi: boolean}>}
 */
async function banGiaoDocLoi(db, tin, lyDo) {
  const ht = await db.query(`UPDATE hoi_thoai h SET chu_so_huu='SALE',trang_thai='HANDOFF',
          ly_do_cuoi='doc_lich_su_loi',nguoi_that_luc=now(),sua_luc=now()
          FROM page p WHERE h.page_id=p.id AND h.team_id=$1 AND p.page_id=$2 AND h.psid=$3
            AND p.bot_ai_bat = true AND ($4 = '' OR p.nguon_tin = $4)
            AND h.chu_so_huu='AI' AND h.trang_thai IN ('GREET','QUALIFY','SELLING')
          RETURNING h.id`,
          [tin.team_id, tin.page_id, tin.psid, String(tin.nguon || "")]);
  if (ht.rowCount !== 1) return { banGiao: false, viecMoi: false };
  const viecMoi = await chenViec(db, tin.team_id, ht.rows[0].id, LY_DO_VIEC_DOC_LOI);
  await ghiNhatKyHangDoi(db, {
    teamId: tin.team_id,
    hanhDong: "tin_doc_loi_ban_giao",
    tinId: tin.id,
    ghiChu: String(lyDo).slice(0, 400),
    sau: { hoi_thoai_id: String(ht.rows[0].id), chu_so_huu: "SALE", viec_moi: viecMoi },
  });
  return { banGiao: true, viecMoi };
}

/**
 * MỘT câu chèn việc cho mọi nhánh bàn giao của worker (đọc lỗi GL3b · gửi lỗi GL4) — khuôn
 * `admin-v3/operations.js#handoffConversation`: NOT EXISTS việc chưa đóng cùng hội thoại, hạn `PHUT_HAN_VIEC`.
 * @returns {Promise<boolean>} có chèn việc MỚI không.
 */
async function chenViec(db, teamId, hoiThoaiId, lyDo) {
  const viec = await db.query(
    `INSERT INTO viec_can_xu_ly (team_id, loai, hoi_thoai_id, ly_do_day, han_luc)
       SELECT $1, 'hoi_thoai', $2, $3, now() + ($4 || ' minutes')::interval
       WHERE NOT EXISTS (
         SELECT 1 FROM viec_can_xu_ly
          WHERE team_id = $1 AND loai = 'hoi_thoai' AND hoi_thoai_id = $2 AND dong_luc IS NULL
       )
     RETURNING id`,
    [teamId, hoiThoaiId, lyDo, String(PHUT_HAN_VIEC)],
  );
  return viec.rowCount > 0;
}

/**
 * PHIẾU GL4 ② 6 — tin GỬI lỗi (sổ gửi có lượt tin/ảnh KHÔNG RÕ đã tới khách — `soGuiTin`) ⇒ MỘT dòng việc cho sale, BẤT KỂ `banGiaoLoi` đổi bao
 * nhiêu dòng (R2-N4): handler đã lưu CLOSING/HANDOFF trước khi ném (`handler-v3.js` catch → `luuLai`) — đúng cảnh «đơn vừa chốt mà
 * tin xác nhận gửi hỏng», sale phải biết nhất. Trước GL4 nhánh này `banGiaoLoi` trơn, không việc (N-GL3B-BANGIAOLOI-PANCAKE); ngắt
 * page biến nó thành lặp mỗi chu kỳ 30′.
 */
async function viecGuiLoi(db, tin) {
  const ht = await db.query(
    `SELECT h.id FROM hoi_thoai h JOIN page p ON p.id = h.page_id
      WHERE h.team_id = $1 AND p.page_id = $2 AND h.psid = $3`,
    [tin.team_id, tin.page_id, tin.psid]);
  if (ht.rowCount) await chenViec(db, tin.team_id, ht.rows[0].id, LY_DO_VIEC_GUI_LOI);
}

/**
 * GL4 — sổ gửi TIN/ẢNH của một tin sau khi lượt hỏng: đã có lượt Pancake XÁC NHẬN (`da_gui` ⇒ kênh gửi chạy, xoá chuỗi gửi dù bước
 * sau — thẻ/ghi chú/ảnh không url — hỏng) · có lượt KHÔNG RÕ (`dang_gui`/`khong_ro` ⇒ việc «Gửi không rõ…»). Chỉ thẻ/ghi chú hỏng
 * thì tin của khách đã tới chắc chắn — không đẻ việc «gửi không rõ» (/code-review #4 #5). Đọc hỏng ⇒ chiều an toàn: không xoá chuỗi,
 * vẫn đẻ việc.
 */
async function soGuiTin(db, tin) {
  try {
    const r = await db.query(
      `SELECT coalesce(bool_or(trang_thai = 'da_gui'), false) AS da_gui,
              coalesce(bool_or(trang_thai IN ('dang_gui', 'khong_ro')), false) AS khong_ro
         FROM lan_gui WHERE team_id = $1 AND tin_id = $2 AND loai IN ('guiTin', 'guiAnh')`,
      [tin.team_id, tin.id]);
    return { daGuiThat: r.rows[0]?.da_gui === true, khongRo: r.rows[0]?.khong_ro === true };
  } catch {
    return { daGuiThat: false, khongRo: true };
  }
}

/**
 * Chạy ĐÚNG MỘT vòng: rút 1 tin (nếu có) → xử lý → chốt trạng thái.
 * @returns {Promise<null|{tinId: string, ketQua: string, lyDo: string, dem: object, soLanThu: number}>}
 *          `null` = hàng đợi không có tin nào rút được LÚC NÀY (rỗng, hoặc mọi hội thoại
 *          còn tin đang bị worker khác giữ khoá).
 */
export async function chayMotVong(pool, deps = {}) {
  // GL4 ② 4 — lọc page NGẮT KÊNH ngay trước MỖI lượt rút (bộ nhớ chung của tiến trình: `ghiLoiKenh` ghi vào NGAY khi ngắt,
  // `motLuot` đọc lại CSDL mỗi vòng) ⇒ tin 3..50 của cùng vòng `chayToiKhiHet` và cả ba vòng xử thấy ngay; tin của page ngắt
  // giữ `cho`. `pageIds = null` (chỉ bộ ca gọi trần — tiến trình thật luôn truyền mảng) không lọc được: câu rút không có vế «trừ».
  const kenh = {};
  const r = await xuMotVong(pool, { ...deps, pageIds: locPageNgat(deps.pageIds ?? null) }, kenh);
  await ghiKenhSauLuot(deps.poolGui || pool, kenh);
  return r;
}

/**
 * GL4 ② 2 — ghi bộ đếm kênh SAU KHI phiên rút đã chốt, trên pool RIÊNG (ngoài giao dịch tin; mọi hàm nuốt lỗi): gửi THẬT
 * SỰ OK ⇒ xoá cả hai chuỗi; đọc OK ⇒ chỉ chuỗi đọc; lỗi kênh ⇒ đếm (đọc OK chạy TRƯỚC — không bao giờ xoá chuỗi gửi).
 */
async function ghiKenhSauLuot(p, k) {
  if (!k.tin) return;
  const dinh = { teamId: k.tin.team_id, pageId: k.tin.page_id };
  if (k.guiOk) await ghiGuiTot(p, dinh);
  else if (k.docOk) await ghiDocTot(p, dinh);
  if (k.loi) await ghiLoiKenh(p, { ...dinh, tinId: k.tin.id, ...k.loi });
}

async function xuMotVong(pool, deps, kenh) {
  const khoaWorker = deps.khoaWorker || `w-${process.pid}`;
  const phien = await moPhienRut(pool, { khoaWorker, pageIds: deps.pageIds ?? null });
  if (!phien) return null;

  const { tin, khach } = phien;
  kenh.tin = tin;
  const poolGui = deps.poolGui || pool;
  let batchIds = [];   // ngoài `try`: nhánh đọc-lịch-sử-lỗi trong `catch` chốt cả cụm gom theo tin chính
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
    // đã sửa thông tin. GL3b: cửa `docTin` NÉM `LoiDocLichSu` khi Pancake không trả lịch
    // sử (bản trước trả `[]` ⇒ lời khai này sai) ⇒ `catch` dưới: lùi DÀI (15 s · 30 s),
    // không gọi model, không gửi; hết lượt ⇒ giao sale CÓ dòng việc.
    let lichSu = [];
    if (deps.docLichSu !== false) {
      const docT = deps.docTin || cuaDocTin;
      lichSu = (await docT(khach, ctxHeThong(), {
        pageId: tin.page_id, psid: tin.psid, convId: tinXuLy.conv_id, custId: tinXuLy.cust_id,
      }, deps.depsPancake || {})) || [];
      kenh.docOk = true;
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
    //    hay lịch sử rỗng THẬT thì KHÔNG suy ra "page đã nói" — đoán sai ở đây là bot câm
    //    với khách thật. (API lỗi thì từ GL3b cửa NÉM `LoiDocLichSu`, không tới được đây.)
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
    // GL4 (R2-N3): chỉ lượt THẬT SỰ gửi tin/ảnh mới xoá chuỗi gửi — nhường page / `khong_gui` / cửa ra chặn cũng là XONG mà không
    // gửi gì; diễn tập ghi sổ rồi dừng, không tới Pancake.
    kenh.guiOk = !dangDienTap() && (Number(kq.dem?.guiTin) || 0) + (Number(kq.dem?.guiAnh) || 0) > 0;
    return { tinId: tin.id, ...kq, soLanThu: tin.so_lan_thu };
  } catch (e) {
    // Lỗi SQL sau HTTP cũng không được tự gửi lại. Mất kết nối với sổ gửi = chưa rõ.
    const daGui = await daBatDauGui(poolGui, tin).catch(() => true);
    // Trần thử lại. `tin.so_lan_thu` đã được câu rút CỘNG 1 rồi, nên so trực tiếp.
    const hetLuot = daGui || e?.khongThuLai === true || [400,401,403,404,422].includes(Number(e?.status)) || Number(tin.so_lan_thu) >= TRAN_THU;
    const trangThai = hetLuot ? TRANG_THAI.LOI : THU_LAI;
    const lyDo = `${e?.name || "Error"}: ${e?.message || ""}`;
    // GL4 ② 3 — lỗi KÊNH (đếm vào ngắt page), theo CẤU TRÚC: đọc ⇒ `LoiDocLichSu.capKenh` (phân loại của `pkDocTin`); gửi ⇒
    // `cause.kenh` do `lan-gui.js#bocCuaGuiBen` gắn khi cửa ĐÃ gọi Pancake cho tin/ảnh. Lượt rút lại sau crash (`LoiCanDoiChieuGui`
    // trần ở đầu `try`, 0 lượt Pancake) · thiếu thẻ · ghi chú · cổng ghi chặn: không dấu ⇒ không đếm.
    if (e?.name === "LoiDocLichSu" && e.capKenh === true) kenh.loi = { kieu: "doc", lyDo: cauLyDoDoc(e.message) };
    else if (e?.cause?.kenh === true) kenh.loi = { kieu: "gui", lyDo: cauLyDoGui(e.cause.chiTiet) };
    // Lượt đã gửi được tin/ảnh rồi mới hỏng ở bước sau ⇒ kênh gửi CHẠY (xoá chuỗi gửi TRƯỚC khi đếm lỗi của chính lượt này).
    const so = daGui ? await soGuiTin(poolGui, tin) : { daGuiThat: false, khongRo: false };
    if (so.daGuiThat) kenh.guiOk = true;
    try {
      // ── GL3b · ĐỌC LỊCH SỬ LỖI — nhánh RIÊNG, tách khỏi `banGiaoLoi` (dành cho «có thể đã gửi») ──
      // `daBatDauGui` đứng đầu `try` nên tới đây chắc chắn chưa gửi gì (`!daGui` là lưới thứ hai). SQL nào trong nhánh
      // này lỗi ⇒ ném ⇒ catch lồng dưới về ĐƯỜNG CŨ với `trangThai` gốc (`loi` + `banGiaoLoi` khi hết lượt) — `xong` chỉ
      // được chốt SAU KHI việc đã chèn thành.
      if (e?.name === "LoiDocLichSu" && !daGui) {
        const lan = Number(tin.so_lan_thu);
        if (lan < TRAN_THU) {
          const tre = TRE_DOC_LICH_SU_MS[Math.min(lan, TRE_DOC_LICH_SU_MS.length) - 1];
          await phien.ketThuc(THU_LAI, lyDo, tre);
          return { tinId: tin.id, ketQua: "thu_lai", lyDo, dem: {}, soLanThu: lan };
        }
        const bg = await banGiaoDocLoi(khach, tin, lyDo);
        const lyDoTin = bg.banGiao ? "doc_loi:ban_giao" : "doc_loi:khong_thuoc_ai";
        // Cụm tin gom theo (webhook) chung số phận tin chính — để `cho` thì tới lượt gặp SALE ⇒ `chan_guard` ⇒ chặn
        // «trả AI» của sale (`reconcile.js#resumeConversation` coi `chan_guard` là còn tồn).
        if (batchIds.length) await khach.query(`UPDATE tin_cho_xu_ly SET trang_thai='xong',
          ly_do=$3,sua_luc=now() WHERE team_id=$1 AND id=ANY($2::bigint[])`,
          [tin.team_id, batchIds, `gom_vao_tin:${tin.id}`]);
        // GL3b vòng 2 (đối kháng F1) · page POLL: tin khách nhắn THÊM trong lúc tin này lùi (15 s · 30 s) là HÀNG RIÊNG (gom
        // cụm ở trên chỉ chạy cho webhook) — để `cho` thì tới lượt gặp SALE ⇒ `chan_guard` ⇒ «trả AI» bị từ chối. Chúng thuộc
        // dòng việc sale vừa nhận ⇒ chốt theo, cùng giao dịch, chỉ đúng (team, page, psid) này, id lớn hơn (FIFO: id nhỏ hơn
        // không thể còn `cho`). Chỉ nhánh giao sale CÓ việc: `khong_thuoc_ai` không có việc mới ⇒ tin theo đi đường thường.
        // Ghi nhật ký danh sách tin đã chốt theo — tin khách bot không trả lời không được biến mất im lặng.
        const theo = bg.banGiao ? await khach.query(`UPDATE tin_cho_xu_ly SET trang_thai='xong', ly_do=$5, sua_luc=now()
          WHERE team_id=$1 AND page_id=$2 AND psid=$3 AND id>$4 AND trang_thai='cho' RETURNING id`,
          [tin.team_id, tin.page_id, tin.psid, tin.id, `${lyDoTin}:theo_tin:${tin.id}`]) : null;
        if (theo?.rowCount) await ghiNhatKyHangDoi(khach, {
          teamId: tin.team_id, hanhDong: "tin_doc_loi_chot_theo", tinId: tin.id,
          ghiChu: `${theo.rowCount} tin khách nhắn thêm lúc tin ${tin.id} đang lùi — chốt theo dòng việc bàn giao, bot không trả lời`,
          sau: { tin_theo: theo.rows.map((x) => String(x.id)) },
        });
        await phien.ketThuc(TRANG_THAI.XONG, lyDoTin);
        return {
          tinId: tin.id,
          ketQua: bg.banGiao ? "doc_loi_ban_giao" : "doc_loi_khong_thuoc_ai",
          lyDo: `${lyDoTin} · ${lyDo}`,
          dem: {},
          soLanThu: lan,
        };
      }
      if (hetLuot) await banGiaoLoi(khach, tin);
      if (so.khongRo) await viecGuiLoi(khach, tin);   // GL4 ② 6 — tin/ảnh gửi KHÔNG RÕ ⇒ việc, bất kể banGiaoLoi đổi mấy dòng
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
      if (so.khongRo && recovered?.rowCount) await viecGuiLoi(pool, tin).catch(() => {});   // GL4 ② 6 · R2-N4 (a): cả đường cứu
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
