// VE7a · 30/09 (bản vẽ 4 «Hệ còn sống không» › «Việc vận hành»): ba con số của màn Vận hành, đọc MỘT lượt cho cả team — để
// khối ở Hệ còn sống nói «có việc chờ hay không» mà không bắt người ta mở ba tab.
//
//   · Tin cần đối chiếu = ĐÚNG tập mà nút đối chiếu xử (`src/queue/reconcile.js#handoffFailedMessage` chỉ nhận tin `loi` ·
//     `chan_guard`); kèm bao nhiêu tin trong đó có lượt gửi `khong_ro` (bot gửi mà Pancake không trả lời chắc chắn).
//   · Tin bị lọc trong 24 GIỜ (theo `lan_cuoi`) — `tomTatBoQua` cộng dồn từ đầu, không có cửa sổ; «đáng ngờ» theo cờ `ngo` của
//     từng lý do trong `LY_DO` (một nguồn với màn Vận hành).
//   · Diễn tập: số lượt từ `tomTatDienTap` (cùng hàm tab Diễn tập dùng) + cờ `V3_DIEN_TAP` đang bật không.
import { tomTatDienTap } from '../../../../src/admin-v3/dien-tap.js';
import { LY_DO } from '../../../../src/admin-v3/nap-bo-qua.js';

const LY_DO_NGO = Object.entries(LY_DO).filter(([, v]) => v.ngo).map(([k]) => k);

export async function tomTatViecVanHanh(pool, ctx, env = process.env) {
  const teamId = ctx?.teamId;
  if (teamId == null || teamId === '') throw new Error('tomTatViecVanHanh: thiếu ctx.teamId.');
  const [loi, boQua, dienTap] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS tong,
              count(*) FILTER (WHERE EXISTS (SELECT 1 FROM lan_gui g
                                              WHERE g.team_id = t.team_id AND g.tin_id = t.id AND g.trang_thai = 'khong_ro'))::int AS khong_ro
         FROM tin_cho_xu_ly t WHERE t.team_id = $1 AND t.trang_thai IN ('loi', 'chan_guard')`,
      [teamId],
    ),
    pool.query(
      `SELECT count(*)::int AS tong, count(*) FILTER (WHERE ly_do = ANY($2::text[]))::int AS dang_ngo
         FROM nap_bo_qua WHERE team_id = $1 AND lan_cuoi >= now() - interval '24 hours'`,
      [teamId, LY_DO_NGO],
    ),
    tomTatDienTap(pool, ctx),
  ]);
  return {
    tinLoi: { tong: loi.rows[0].tong, khongRo: loi.rows[0].khong_ro },
    boQua24h: { tong: boQua.rows[0].tong, dangNgo: boQua.rows[0].dang_ngo },
    dienTap: { soLuot: dienTap.soLuot, soPage: dienTap.soPage, dangBat: env.V3_DIEN_TAP === '1' },
  };
}
