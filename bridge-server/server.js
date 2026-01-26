/**
 * Garden Bridge Server
 * 连接网页应用和 Claude Code 的桥梁
 */

import express from 'express';
import cors from 'cors';
import { executeClaudeCode } from './claude-executor.js';
import { serializeGardenState } from './state-serializer.js';
import { createGardenContext } from './garden-context.js';
import { AgentContext } from '../src/agent/AgentContext.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 初始化花园上下文（用于工具执行）
const gardenContext = createGardenContext();
console.log('[Bridge] Garden context initialized');

// 存储花园状态（内存中）
let gardenState = {
  gold: 0,
  gardenSnapshot: null,
  focusedEntity: null,
  availableBouquets: []
};

// 对话历史（简单存储）
let conversationHistory = [];

/**
 * 更新花园状态
 */
app.post('/api/state', (req, res) => {
  gardenState = { ...gardenState, ...req.body };
  console.log('[Bridge] State updated:', {
    gold: gardenState.gold,
    flowers: gardenState.gardenSnapshot?.summary?.total || 0
  });
  res.json({ success: true });
});

/**
 * 主聊天端点
 */
app.post('/api/chat', async (req, res) => {
  const { message, context, interaction } = req.body;

  try {
    // 合并上下文
    const fullState = { ...gardenState, ...context };

    // 序列化状态为 prompt
    const statePrompt = serializeGardenState(fullState);

    // 构建用户消息
    let userMessage = '';
    if (interaction) {
      // 交互事件
      userMessage = `[用户${interaction.type === 'click' ? '点击' : '操作'}了 ${interaction.entityName || '某物'}]\n`;
      if (interaction.descriptor) {
        userMessage += `实体信息：${interaction.descriptor}\n`;
      }
      if (message) {
        userMessage += `用户说：${message}`;
      }
    } else {
      userMessage = message;
    }

    // 添加到历史
    conversationHistory.push({ role: 'user', content: userMessage });

    // 构建完整 prompt
    const fullPrompt = buildPrompt(statePrompt, userMessage, conversationHistory.slice(-6));

    console.log('[Bridge] Calling Claude Code...');
    console.log('[Bridge] User message:', userMessage.substring(0, 100));

    // 调用 Claude Code
    const result = await executeClaudeCode(fullPrompt);

    console.log('[Bridge] Claude response:', result.text?.substring(0, 100));
    console.log('[Bridge] Tool calls:', result.toolCalls?.length || 0);

    // 处理 harvest 工具调用：确保 reason 是用户的原话
    if (result.toolCalls) {
      for (const call of result.toolCalls) {
        if (call.name === 'harvest') {
          // reason 应该是用户说的话（满足采摘条件的那句）
          // 覆盖 Claude 可能生成的描述性 reason
          call.arguments.reason = message || userMessage;
        }
      }
    }

    // 添加助手回复到历史
    if (result.text) {
      conversationHistory.push({ role: 'assistant', content: result.text });
    }

    // 保持历史在合理长度
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }

    res.json({
      text: result.text || '',
      toolCalls: result.toolCalls || [],
      raw: result.raw
    });

  } catch (error) {
    console.error('[Bridge] Chat error:', error);
    res.status(500).json({
      error: error.message,
      text: '（花园精灵似乎走神了...）'
    });
  }
});

/**
 * 清空对话历史
 */
app.post('/api/reset', (req, res) => {
  conversationHistory = [];
  console.log('[Bridge] Conversation reset');
  res.json({ success: true });
});

/**
 * 注册工具执行器（主应用调用此端点注册工具）
 */
app.post('/register-executor', (req, res) => {
  const { skillName, toolName, callbackUrl } = req.body;

  if (!skillName || !toolName || !callbackUrl) {
    return res.status(400).json({
      success: false,
      message: '缺少必要参数: skillName, toolName, callbackUrl'
    });
  }

  const key = `${skillName}.${toolName}`;
  toolExecutors.set(key, callbackUrl);

  console.log(`[Bridge] Registered executor: ${key} -> ${callbackUrl}`);
  res.json({ success: true, message: `Executor ${key} registered` });
});

/**
 * 执行工具（供 Claude Code Skill 调用）
 */
app.post('/execute-tool', async (req, res) => {
  const { skill, tool, args } = req.body;

  try {
    console.log(`[Bridge] Executing tool: ${skill}.${tool}`, args);

    // 构造工具名称（skill.tool 格式）
    const toolName = tool;

    // 创建一个简单的上下文对象
    const agentContext = new AgentContext();

    // 执行工具
    const result = await gardenContext.skillRegistry.executeTool(
      toolName,
      args,
      agentContext
    );

    console.log(`[Bridge] Tool result:`, result);
    res.json(result.result);

  } catch (error) {
    console.error('[Bridge] Tool execution error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * 构建发送给 Claude 的完整 prompt
 */
function buildPrompt(statePrompt, userMessage, recentHistory) {
  const parts = [];

  // 重要指令
  parts.push('【重要指令】');
  parts.push('这是一个纯文本对话。你只需要返回文本回复。');
  parts.push('不要执行任何代码、不要读取任何文件、不要使用任何 Claude Code 工具。');
  parts.push('如果需要执行操作（种花、采摘等），在回复末尾添加 ```action``` JSON 块表达意图。');
  parts.push('');

  // 花园状态
  parts.push(statePrompt);
  parts.push('');

  // 最近对话历史
  if (recentHistory.length > 1) {
    parts.push('# 最近对话');
    for (const msg of recentHistory.slice(0, -1)) {
      const role = msg.role === 'user' ? '用户' : '你';
      parts.push(`${role}: ${msg.content}`);
    }
    parts.push('');
  }

  // 当前用户消息
  parts.push('# 当前用户消息');
  parts.push(userMessage);
  parts.push('');
  parts.push('请用友好俏皮的方式回复，回复控制在50字以内。如需执行操作，在回复末尾加 ```action``` JSON 块。');

  return parts.join('\n');
}

const PORT = process.env.PORT || 8002;
app.listen(PORT, () => {
  console.log(`[Bridge] Garden Bridge Server running on http://localhost:${PORT}`);
  console.log('[Bridge] Endpoints:');
  console.log('  POST /api/chat   - Send message to Claude Code');
  console.log('  POST /api/state  - Update garden state');
  console.log('  POST /api/reset  - Clear conversation history');
  console.log('  GET  /api/health - Health check');
});
