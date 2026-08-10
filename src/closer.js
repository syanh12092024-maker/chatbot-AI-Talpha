import { anthropic, aiExtras } from './llm.js';
import { config } from './config.js';
import { buildSystem } from './prompts.js';
import { toolDefs, executeTool } from './tools.js';
import { sanitizeMessages, sanitizeSystem } from './text.js';

// Chạy closer (Sonnet) theo manual tool-use loop. Đọc/ghi vào state.messages.
// Trả về chuỗi text cuối cùng để gửi cho khách.
export async function runCloser(ctx) {
  const { kb, state } = ctx;
  // LỚP CHẶN CUỐI (xem text.js): nửa emoji hoặc lượt rỗng lọt vào đây là Claude trả 400
  // invalid_request_error — lỗi bị coi là "không tự hồi phục" nên bot không thử lại và khách
  // ngồi im. Dọn ngay trước cửa gọi API thì mọi đường vào đều được chặn, kể cả đường mới thêm sau này.
  const system = sanitizeSystem(buildSystem(kb));

  // ĐO TOKEN THẬT theo lượt (cộng dồn mọi vòng tool) — CỘNG TIẾP vào bộ đếm handler đã khởi tạo
  // (đã chứa token classifier); pancake-poll ghi vào Sổ AI để thống kê chi phí bằng SỐ ĐO.
  const usage = state.lastUsage || (state.lastUsage = { tin: 0, tout: 0, cread: 0, calls: 0 });

  let iterations = 0;
  let askedForText = false; // đã xin model viết chữ khép lượt lần nào chưa
  while (true) {
    if (iterations++ >= config.maxToolIterations) {
      return 'Em cần hỗ trợ thêm từ đồng nghiệp, anh/chị chờ em chút nhé ạ.';
    }

    const { messages, fixed } = sanitizeMessages(state.messages);
    if (fixed) console.warn(`[text] đã dọn ${fixed} mảnh emoji lẻ trước khi gọi Claude (page ${state.pageId} · khách ${state.custName || state.psid})`);
    state.messages = messages; // giữ bản sạch để lượt sau không phải dọn lại

    const res = await anthropic.messages.create({
      model: config.modelCloser,
      // 400, hạ từ 1024 (11/08/2026 — M08 §4). Đo trên Sổ AI: tin trung bình 182 token,
      // chỉ 6,3% vượt 300. Trần thấp buộc model viết ngắn — đúng quy tắc "1-3 câu" của
      // CORE §1 và hợp Messenger mobile. Đây là TRẦN, không phải ép hành vi bằng code:
      // model vẫn tự quyết viết gì, chỉ không được viết dài lê thê.
      max_tokens: 400,
      system,
      tools: toolDefs,
      messages,
      ...aiExtras, // Kimi: tắt thinking, nếu không tin trả về rỗng
    });

    usage.calls++;
    usage.tin += res.usage?.input_tokens || 0;
    usage.tout += res.usage?.output_tokens || 0;
    usage.cread += res.usage?.cache_read_input_tokens || 0;

    // Lưu lượt assistant (gồm cả tool_use) vào lịch sử.
    state.messages.push({ role: 'assistant', content: res.content });

    if (res.stop_reason !== 'tool_use') {
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      if (text) return text;
      // LƯỢT KẾT THÚC MÀ KHÔNG CÓ CHỮ — hay xảy ra ngay sau khi gọi tool gửi ảnh: model coi
      // như đã xong việc. Trước đây code lấp bằng '...' nên khách nhận mấy tấm ảnh rồi đúng
      // ba dấu chấm (đo được: 465/905 lần gửi ảnh rơi vào cảnh này). Xin thêm 1 lượt viết chữ.
      if (!askedForText) {
        askedForText = true;
        state.messages.push({
          role: 'user',
          content: 'Bạn vừa kết thúc mà chưa nói gì với khách. VIẾT NGAY 1-2 câu ngắn bằng ĐÚNG ngôn ngữ của khách để tư vấn tiếp hoặc hỏi chốt đơn. Không gọi tool nữa, chỉ viết chữ.',
        });
        continue;
      }
      // Vẫn không viết được → thà IM còn hơn gửi "..." cho khách.
      console.warn(`[closer] không soạn được tin chữ (page ${state.pageId} · khách ${state.custName || state.psid})${state.sentImageTurn ? ' — khách đã nhận ảnh kèm caption' : ''}`);
      return '';
    }

    // Thực thi mọi tool_use trong lượt này, gom kết quả trả lại.
    const toolUses = res.content.filter((b) => b.type === 'tool_use');
    const results = [];
    for (const tu of toolUses) {
      const out = await executeTool(tu.name, tu.input, ctx);
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: out.content,
        ...(out.isError ? { is_error: true } : {}),
      });
    }
    state.messages.push({ role: 'user', content: results });
  }
}
