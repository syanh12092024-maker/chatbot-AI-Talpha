import { ghiNhatKy } from '../db/index.js';
// Thao tác quản trị cục bộ: đối chiếu lượt lỗi, không tự gửi lại HTTP chưa rõ kết quả.
import { ghiNhatKyHangDoi } from './kho.js';
import { extractFromText, emptyProfile } from '../context.js';

const check = ({ teamId, id, reason }) => {
  if (!/^\d+$/.test(String(teamId)) || !/^\d+$/.test(String(id)) ||
      typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 300)
    throw new Error('Cần team, id hợp lệ và lý do đối chiếu 5–300 ký tự (không ghi PII)');
};
async function lock(client, teamId, pageId, psid) {
  const r = await client.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS ok',
    [`${teamId}:${pageId}:${psid}`]);
  if (!r.rows[0].ok) throw new Error('Hội thoại đang được xử lý; thử lại sau');
}
export async function handoffFailedMessage(pool, { teamId, id, reason, nguoiDungId = null }) {
  check({ teamId, id, reason });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const tin = (await c.query('SELECT * FROM tin_cho_xu_ly WHERE team_id=$1 AND id=$2 FOR UPDATE NOWAIT', [teamId, id])).rows[0];
    if (!tin || !['loi', 'chan_guard'].includes(tin.trang_thai)) throw new Error('Không có tin lỗi/chặn của team này');
    await lock(c, teamId, tin.page_id, tin.psid);
    const ht = (await c.query(`SELECT h.* FROM hoi_thoai h JOIN page p ON p.id=h.page_id
      WHERE h.team_id=$1 AND p.page_id=$2 AND h.psid=$3 FOR UPDATE OF h`, [teamId, tin.page_id, tin.psid])).rows[0];
    if (!ht) throw new Error('Thiếu hội thoại');
    const profile = extractFromText(tin.noi_dung, { ...emptyProfile(), ...ht.ho_so });
    await c.query(`UPDATE hoi_thoai SET chu_so_huu='SALE',
      trang_thai=CASE WHEN trang_thai IN ('CLOSING','POST_SALE') THEN trang_thai ELSE 'HANDOFF' END,
      nguoi_that_luc=now(),ly_do_cuoi='doi_chieu_tin_loi',ho_so=$3,sua_luc=now()
      WHERE team_id=$1 AND id=$2`, [teamId, ht.id, JSON.stringify(profile)]);
    // xong nghĩa là đã xử lý bằng bàn giao, KHÔNG khẳng định đã gửi thành công.
    await c.query(`UPDATE tin_cho_xu_ly SET trang_thai='xong',ly_do='doi_chieu:ban_giao_sale',sua_luc=now()
      WHERE team_id=$1 AND id=$2`, [teamId, id]);
    await ghiNhatKyHangDoi(c, { teamId, tinId: id, hanhDong: 'tin_doi_chieu_ban_giao', ghiChu: reason,
      truoc: { trang_thai: tin.trang_thai }, sau: { chu_so_huu: 'SALE', gui_lai: false } });
    await ghiNhatKy(c, { teamId, nguoiDungId, tacNhan: nguoiDungId ? `nguoi:${nguoiDungId}` : 'quan_tri:doi_chieu', doiTuong: 'hoi_thoai', doiTuongId: String(ht.id), hanhDong: 'chat_doi_chieu_nguoi', sau: { tin_id: String(id) } });
    await c.query('COMMIT');
    return { ok: true, hoiThoaiId: ht.id, owner: 'SALE', resent: false };
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}

export async function resumeConversation(pool, { teamId, id, reason, nguoiDungId = null }) {
  check({ teamId, id, reason });
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const ht = (await c.query(`SELECT h.*,p.page_id AS page_text FROM hoi_thoai h JOIN page p ON p.id=h.page_id
      WHERE h.team_id=$1 AND h.id=$2 FOR UPDATE OF h NOWAIT`, [teamId, id])).rows[0];
    if (!ht || ht.trang_thai !== 'HANDOFF' || ht.chu_so_huu !== 'SALE') throw new Error('Chỉ nhận lại chat đang HANDOFF/SALE');
    await lock(c, teamId, ht.page_text, ht.psid);
    const pending = await c.query(`SELECT 1 FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND psid=$3
      AND trang_thai IN ('cho','dang_xu','loi','chan_guard') LIMIT 1`, [teamId, ht.page_text, ht.psid]);
    const order = await c.query('SELECT 1 FROM hang_cho_tao_don WHERE team_id=$1 AND hoi_thoai_id=$2 LIMIT 1', [teamId, id]);
    if (pending.rowCount || order.rowCount || ht.chot_don_luc || ht.ho_so?.ordered)
      throw new Error('Còn tin chưa xử lý hoặc có thông tin đơn; phải giải quyết trước khi trả AI');
    await c.query(`UPDATE hoi_thoai SET chu_so_huu='AI',trang_thai='SELLING',ly_do_cuoi='sale_tra_ai',
      ho_so=ho_so || jsonb_build_object('aiResumedAt',now()),sua_luc=now() WHERE team_id=$1 AND id=$2`, [teamId, id]);
    await ghiNhatKy(c, { teamId, nguoiDungId, tacNhan: nguoiDungId ? `nguoi:${nguoiDungId}` : 'quan_tri:doi_chieu', doiTuong: 'hoi_thoai',
      doiTuongId: String(id), hanhDong: 'chat_tra_ai', ghiChu: reason,
      sau: { hoi_thoai_id: String(id), chu_so_huu: 'AI' } });
    await c.query('COMMIT');
    return { ok: true, owner: 'AI' };
  } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
  finally { c.release(); }
}
