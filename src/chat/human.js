import { messageTime } from './history.js';
import { looksHuman } from '../conv-owner.js';
import { docHoiThoaiTheoPageText, suaHoiThoai } from './kho.js';
import { aiDuocTraLoi } from './trang-thai.js';

/** Nhận diện theo lịch sử mới từ kênh, đối chiếu tin AI đã gửi trong DB. */
export async function nhanDienSale(pool, { teamId, pageId, psid, messages = [] }) {
  const ht = await docHoiThoaiTheoPageText(pool, { teamId, pageIdText: pageId, psid });
  if (!aiDuocTraLoi(ht)) return false;
  const candidates = messages.filter(m => String(m.from?.id) === String(pageId));
  if (!candidates.length) return false;
  const sent = await pool.query(`SELECT g.noi_dung FROM lan_gui g JOIN tin_cho_xu_ly t
    ON t.id=g.tin_id AND t.team_id=g.team_id WHERE t.team_id=$1 AND t.page_id=$2 AND t.psid=$3
    AND g.trang_thai='da_gui' ORDER BY g.id DESC LIMIT 30`, [teamId, String(pageId), String(psid)]);
  const ours = [ht.ai_noi_gi, ...sent.rows.flatMap(r => [r.noi_dung?.text, r.noi_dung?.caption])].filter(Boolean);
  // Sau lần trả AI chủ động, không để tin sale cũ khóa lại hội thoại.
  const since = Math.max(Date.now() - 24 * 3600_000,
    Date.parse(ht.ho_so?.aiResumedAt || '') || 0, new Date(ht.ai_noi_luc || 0).getTime());
  const human = candidates.some(m => {
    const at = messageTime(m);
    // `m.from` là payload THÔ của Pancake (pkGetMessages không bóc gì) — đưa cả vào để
    // `looksHuman` đọc được nhãn `admin_name`/`app_id` thay vì đoán qua chữ.
    return at > since && looksHuman(m.original_message || m.message || '', ours, m.from);
  });
  if (!human) return false;
  return !!await suaHoiThoai(pool, { teamId, id: ht.id,
    neu: { xmin: ht.phien_ban, chu_so_huu: 'AI' },
    giaTri: { trang_thai: 'HANDOFF', chu_so_huu: 'SALE', nguoi_that_luc: new Date(), ly_do_cuoi: 'sale_tiep_quan_tren_kenh' },
    hanhDong: 'chat_sale_tiep_quan' });
}
