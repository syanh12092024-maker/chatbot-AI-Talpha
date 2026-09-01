#!/usr/bin/env node
// `npm run di-tru` — đọc JSON thật ở gốc repo, ghi vào nền v3. CHẠY LẠI ĐƯỢC.
//
//   node db/di-tru/index.js
//   node db/di-tru/index.js --so-ai=/opt/aicloser/ai-messages.jsonl --ma-model-cu=kimi-k2.6
//
// In ra HAI VẾ của từng phép (nguồn ↔ đích) và LIỆT KÊ mọi thứ bị bỏ qua.
// ⛔ Chỉ ĐỌC các tệp nguồn. Không sửa, không xoá, không ghi ngược.
import nodePath from "node:path";
import { fileURLToPath as nodeFileURLToPath } from "node:url";
import { voiPool, GOC } from "../ket-noi.js";
import { diTruTatCa } from "./nap.js";
import { napSoAi } from "./so-ai.js";
import { diTruKetNoiPos, TEP_NGUON as TEP_SHOP } from "./ket-noi-pos.js";
import { seedBoLuatVaKyNang } from "./bo-luat-va-ky-nang.js";
import { noiKhachChoHoiThoai } from "../../src/chat/ho-so-khach.js";

function thamSo(ten) {
  const p = process.argv.find((a) => a.startsWith(`--${ten}=`));
  return p ? p.slice(ten.length + 3) : null;
}

export async function chay(
  pool,
  goc = GOC,
  { soAi = null, maModelCu = null } = {},
) {
  const kq = await diTruTatCa(pool, goc);
  const dem = async (bang) =>
    Number((await pool.query(`SELECT count(*) c FROM ${bang}`)).rows[0].c);
  kq.dich = {
    page: await dem("page"),
    pageBatAi: Number(
      (await pool.query("SELECT count(*) c FROM page WHERE bot_ai_bat")).rows[0]
        .c,
    ),
    hoiThoai: await dem("hoi_thoai"),
    kichBan: await dem("kich_ban"),
  };
  kq.ketNoiPos = await diTruKetNoiPos(pool, goc);
  // B-Y9 — NỐI HỘI THOẠI VỀ HỒ SƠ KHÁCH (`hoi_thoai.khach_id`).
  //
  // Cột có trong lược đồ từ 013 nhưng chưa lần nào được ghi: đo 28/08 là 0/28.953. Hai kênh
  // kia (khách ↔ đơn) đã nối và chạy, nên màn «Hồ sơ khách hàng» hiện kênh thứ ba là «chưa
  // biết» cho MỌI khách — đúng, nhưng là một sự thật do chưa ai chạy job chứ không phải do
  // dữ liệu. `noiKhachChoHoiThoai` (A7-2) đã có sẵn và idempotent; chỗ thiếu là một đường
  // CHẠY nó. Đặt ở đây vì di trú là lượt duy nhất đã đi qua mọi team và CHẠY LẠI ĐƯỢC.
  //
  // Nối được bao nhiêu thì nối; phần còn lại ĐẾM RA (thiếu nước · sđt không đọc được · mất
  // tranh). Phiếu B-Y9 ⑤ nói thẳng: nối sai còn tệ hơn không nối — nên không có nhánh nào
  // đoán theo tên hay theo page.
  kq.noiHoSoKhach = await noiHoSoKhachMoiTeam(pool);
  // L2-M3 — seed mồi bo_luat_chung v1 (rút từ prompts.js) + ky_nang "hỏi size".
  kq.boLuatVaKyNang = await seedBoLuatVaKyNang(pool);
  if (soAi) kq.soAi = await napSoAi(pool, soAi, { maModelCu });
  return kq;
}

/**
 * Chạy `noiKhachChoHoiThoai` cho MỌI team, cộng dồn thống kê.
 *
 * ⚠️ LƯỚI MIGRATION (án lệ #7). Bộ nối cần `khach.thi_truong` + `hoi_thoai.khach_id` của
 * migration 013. Cây code luôn đi trước CSDL ở ít nhất một máy: bản đầu của bước này ném
 * `column "thi_truong" does not exist` và làm CHẾT cả lượt `npm run di-tru` trên một CSDL
 * mới ở 007 — tức một bước THÊM VÀO đã phá bộ di trú vốn đang chạy tốt. Nay thiếu cột thì
 * BỎ QUA và nói ra, không chết.
 */
async function noiHoSoKhachMoiTeam(pool) {
  const cot = await pool.query(
    `SELECT
       (SELECT count(*) FROM information_schema.columns
         WHERE table_name='khach' AND column_name='thi_truong')::int      AS co_thi_truong,
       (SELECT count(*) FROM information_schema.columns
         WHERE table_name='hoi_thoai' AND column_name='khach_id')::int    AS co_khach_id`,
  );
  const { co_thi_truong: coTt, co_khach_id: coKid } = cot.rows[0];
  if (!coTt || !coKid) {
    return {
      chuaCoCot: true,
      thieu: [!coTt && "khach.thi_truong", !coKid && "hoi_thoai.khach_id"].filter(Boolean),
      noi: "chưa áp migration 013 — BỎ QUA bước nối, không phải «không nối được cái nào»",
    };
  }
  const teams = (await pool.query("SELECT id, slug FROM team ORDER BY id")).rows;
  const tong = {
    team: teams.length, xet: 0, noiMoi: 0, noiVaoCoSan: 0, khachMoi: 0,
    thieuNuoc: 0, sdtKhongDocDuoc: 0, mataTranh: 0, chamTran: [], pageThieuShop: [],
  };
  for (const t of teams) {
    const r = await noiKhachChoHoiThoai(pool, { teamId: t.id, job: "di-tru" });
    for (const k of ["xet", "noiMoi", "noiVaoCoSan", "khachMoi", "thieuNuoc", "sdtKhongDocDuoc", "mataTranh"]) {
      tong[k] += Number(r[k] || 0);
    }
    if (r.chamTran) tong.chamTran.push(t.slug);
    for (const p of r.pageThieuShop || []) {
      if (!tong.pageThieuShop.includes(p)) tong.pageThieuShop.push(p);
    }
  }
  const con = await pool.query(
    "SELECT count(*)::int c FROM hoi_thoai WHERE khach_id IS NULL",
  );
  tong.conChuaNoi = con.rows[0].c;
  return tong;
}

function inBaoCao(kq) {
  const d = kq.dich;
  console.log("── DI TRÚ v3 ──────────────────────────────────────────────");
  console.log(
    `page          nguồn pages.json = ${kq.page.nguon}   →  bảng page = ${d.page}`,
  );
  console.log(
    `công tắc AI   nguồn ai-enabled.json = ${kq.congTac.nguon}   →  page.bot_ai_bat = ${d.pageBatAi}`,
  );
  console.log(
    `hội thoại     nguồn conv-state.json = ${kq.hoiThoai.nguon}   →  bảng hoi_thoai = ${d.hoiThoai}`,
  );
  console.log(
    `kịch bản      nguồn ${kq.kichBan.soTepLichSu} tệp script-versions (${kq.kichBan.nguon} bản)` +
      ` + ${kq.kichBan.soMucKb} mục kb-overrides  →  bảng kich_ban = ${d.kichBan}`,
  );
  const kn = kq.ketNoiPos;
  if (kn?.chuaCoBang) {
    console.log(
      `kết nối POS  nguồn ${TEP_SHOP} = ${kn.nguon} thị trường  →  BỎ QUA: chưa áp migration 002_ket_noi_pos`,
    );
  } else if (kn) {
    console.log(
      `kết nối POS  nguồn ${TEP_SHOP} = ${kn.nguon} thị trường  →  bảng ket_noi_pos = ${kn.dich}` +
        `  (thêm ${kn.them} · cập nhật ${kn.capNhat} · giữ nguyên ${kn.giuNguyen})`,
    );
  }
  const bl = kq.boLuatVaKyNang;
  if (bl) {
    console.log(
      `bộ luật chung nguồn prompts.js#CORE (${bl.boLuatChung.doDai} ký tự) → ` +
        `bo_luat_chung v${bl.boLuatChung.phienBan} ` +
        `(${bl.boLuatChung.them ? "vừa thêm" : "đã có, giữ nguyên"})`,
    );
    console.log(
      `kỹ năng "hỏi size"  → ky_nang thêm ${bl.kyNang.them.length} team ` +
        `(${bl.kyNang.them.join(", ") || "-"}) · giữ nguyên ${bl.kyNang.giuNguyen.length} ` +
        `(${bl.kyNang.giuNguyen.join(", ") || "-"})`,
    );
  }
  const nk = kq.noiHoSoKhach;
  if (nk?.chuaCoCot) {
    console.log(
      `hồ sơ khách   BỎ QUA — thiếu cột ${nk.thieu.join(", ")} (${nk.noi})`,
    );
  } else if (nk) {
    console.log(
      `hồ sơ khách   xét ${nk.xet} hội thoại có SĐT (${nk.team} team)  →  nối ${nk.noiMoi + nk.noiVaoCoSan}` +
        ` (${nk.noiVaoCoSan} vào khách có sẵn · ${nk.noiMoi} kèm khách mới ${nk.khachMoi})`,
    );
    console.log(
      `              CHƯA nối: ${nk.conChuaNoi} hội thoại — thiếu nước ${nk.thieuNuoc}` +
        ` · sđt không đọc được ${nk.sdtKhongDocDuoc} · mất tranh ${nk.mataTranh}` +
        (nk.chamTran.length ? ` · CHẠM TRẦN ở team ${nk.chamTran.join(", ")} (chạy lại để nối tiếp)` : ""),
    );
    if (nk.pageThieuShop.length) {
      console.log(
        `              page chưa nối shop POS (không tra được nước): ${nk.pageThieuShop.join(", ")}`,
      );
    }
  }
  if (kq.soAi) {
    console.log(
      `sổ AI         nguồn ${kq.soAi.soDongTep} dòng  →  thêm mới ${kq.soAi.them} (hỏng ${kq.soAi.hong.length})`,
    );
  } else {
    console.log(
      "sổ AI         BỎ QUA — tệp chỉ có trên VPS, nạp ở đợt cutover (nợ §9 sổ điều hành)",
    );
  }

  console.log("── ĐÃ SỬA / ĐÃ BỎ QUA (liệt kê, cấm nuốt im) ──────────────");
  console.log(
    `chuỗi phải vá surrogate lẻ (→ U+FFFD): kịch bản ${kq.kichBan.soVaSurrogate}` +
      ` · hội thoại ${kq.hoiThoai.soVaSurrogate}`,
  );
  console.log(
    `page LẠC (có dữ liệu, KHÔNG có trong pages.json): ${kq.pageLac.length}`,
  );
  for (const p of kq.pageLac)
    console.log(`   · ${p.pageId}  ← ${p.nguon.join(" · ")}`);
  console.log(
    `công tắc AI trỏ page không có dòng page: ${kq.congTac.khongCoDongPage.length}` +
      (kq.congTac.khongCoDongPage.length
        ? ` → ${kq.congTac.khongCoDongPage.join(", ")}`
        : ""),
  );
  console.log(
    `hội thoại bỏ vì page lạc: ${kq.hoiThoai.boQuaPageLac.length}` +
      `  · khoá conv-state sai khuôn: ${kq.hoiThoai.khoaLa.length}`,
  );
  console.log(`bản kịch bản bỏ vì page lạc: ${kq.kichBan.boQuaPageLac.length}`);
  for (const b of kq.kichBan.boQuaPageLac) console.log(`   · ${b}`);
  console.log(
    `mục kb-overrides chỉ có sản phẩm (0 kịch bản): ${kq.kichBan.kbKhongCfg.length}` +
      (kq.kichBan.kbKhongCfg.length
        ? ` → ${kq.kichBan.kbKhongCfg.join(", ")}`
        : ""),
  );
  console.log(
    `mục kb-overrides có kịch bản mà chưa có tệp lịch sử: ${kq.kichBan.kbRieng.length}` +
      (kq.kichBan.kbRieng.length ? ` → ${kq.kichBan.kbRieng.join(", ")}` : ""),
  );
}

async function main() {
  await voiPool(async (pool) => {
    const kq = await chay(pool, GOC, {
      soAi: thamSo("so-ai"),
      maModelCu: thamSo("ma-model-cu"),
    });
    inBaoCao(kq);
  });
}

/** So `import.meta.url` với script đang chạy bằng ĐƯỜNG DẪN đã giải mã — chịu được dấu
 *  cách, dấu tiếng Việt và mọi ký tự bị percent-encode trong URL. */
function laChayTrucTiep(metaUrl) {
  if (!process.argv[1]) return false;
  try {
    return (
      nodePath.resolve(process.argv[1]) ===
      nodePath.resolve(nodeFileURLToPath(metaUrl))
    );
  } catch {
    return false;
  }
}

// Chạy trực tiếp hay bị import? So bằng ĐƯỜNG DẪN, không bằng chuỗi URL ghép tay.
// Án lệ 25/08 (G2-A2): `file://${process.argv[1]}` KHÔNG bằng `import.meta.url` khi đường
// dẫn có DẤU CÁCH — `import.meta.url` mã hoá `%20`, `process.argv[1]` thì không. Cây làm
// việc thật của dự án là «/Users/…/Chat Bot AI/messenger-closer», nên ở máy đó `npm run
// migrate` và `npm run di-tru` THOÁT 0 MÀ KHÔNG LÀM GÌ — im lặng hoàn toàn. Trên VPS
// (/opt/aicloser, không dấu cách) thì chạy, nên chỗ này lọt suốt.
if (laChayTrucTiep(import.meta.url)) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
