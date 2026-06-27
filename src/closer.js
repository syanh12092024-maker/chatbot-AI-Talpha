import { anthropic } from './llm.js';
import { config } from './config.js';
import { buildSystem } from './prompts.js';
import { toolDefs, executeTool } from './tools.js';

// Chạy closer (Sonnet) theo manual tool-use loop. Đọc/ghi vào state.messages.
// Trả về chuỗi text cuối cùng để gửi cho khách.
export async function runCloser(ctx) {
  const { kb, state } = ctx;
  const system = buildSystem(kb);

  let iterations = 0;
  while (true) {
    if (iterations++ >= config.maxToolIterations) {
      return 'Em cần hỗ trợ thêm từ đồng nghiệp, anh/chị chờ em chút nhé ạ.';
    }

    const res = await anthropic.messages.create({
      model: config.modelCloser,
      max_tokens: 1024,
      system,
      tools: toolDefs,
      messages: state.messages,
    });

    // Lưu lượt assistant (gồm cả tool_use) vào lịch sử.
    state.messages.push({ role: 'assistant', content: res.content });

    if (res.stop_reason !== 'tool_use') {
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      return text || '...';
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
