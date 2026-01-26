/**
 * Claude Code CLI Executor
 * 通过子进程调用 claude -p 命令
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

/**
 * 执行 Claude Code headless 模式
 * @param {string} prompt - 发送给 Claude 的提示
 * @returns {Promise<{text: string, toolCalls: Array}>}
 */
export async function executeClaudeCode(prompt) {
  return new Promise((resolve, reject) => {
    // 使用 stdin 传递 prompt，避免 shell 转义问题
    const args = [
      '--output-format', 'json',
      '--dangerously-skip-permissions'
    ];

    console.log('[Executor] Running: claude (prompt via stdin)');
    console.log('[Executor] Prompt length:', prompt.length);

    const claude = spawn('claude', args, {
      cwd: PROJECT_ROOT,
      env: { ...process.env },
      shell: false,  // 不使用 shell，避免转义问题
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // 通过 stdin 发送 prompt
    claude.stdin.write(prompt);
    claude.stdin.end();

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    claude.on('close', (code) => {
      if (code !== 0 && !stdout) {
        console.error('[Executor] Claude exited with code', code);
        console.error('[Executor] stderr:', stderr);
        reject(new Error(`Claude exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const result = parseClaudeOutput(stdout);
        resolve(result);
      } catch (e) {
        console.error('[Executor] Parse error:', e.message);
        // 回退：作为纯文本处理
        resolve({ text: stdout.trim(), toolCalls: [], raw: stdout });
      }
    });

    claude.on('error', (err) => {
      console.error('[Executor] Spawn error:', err);
      reject(err);
    });
  });
}

/**
 * 解析 Claude Code 的 JSON 输出
 */
function parseClaudeOutput(output) {
  let text = [];
  const toolCalls = [];

  // 尝试解析 JSON
  let data;
  try {
    data = JSON.parse(output);
  } catch {
    // 如果不是 JSON，直接返回文本
    return { text: output.trim(), toolCalls: [], raw: output };
  }

  // 处理不同的输出格式
  if (Array.isArray(data)) {
    // 数组格式：[{type: 'text', text: '...'}, {type: 'tool_use', ...}]
    for (const item of data) {
      if (item.type === 'text' && item.text) {
        text.push(item.text);
      } else if (item.type === 'tool_use') {
        toolCalls.push({
          id: item.id,
          name: item.name,
          arguments: item.input || item.arguments || {}
        });
      } else if (item.type === 'function_call') {
        toolCalls.push({
          id: item.id,
          name: item.name,
          arguments: item.arguments || {}
        });
      }
    }
  } else if (data.result) {
    // 简单结果格式
    text.push(data.result);
  } else if (data.content) {
    // content 数组格式
    if (Array.isArray(data.content)) {
      for (const item of data.content) {
        if (item.type === 'text') {
          text.push(item.text);
        } else if (item.type === 'tool_use') {
          toolCalls.push({
            id: item.id,
            name: item.name,
            arguments: item.input || {}
          });
        }
      }
    } else {
      text.push(String(data.content));
    }
  } else if (typeof data === 'string') {
    text.push(data);
  }

  // 合并文本
  let fullText = text.join('\n').trim();

  // 从文本中提取 ```action``` 块并转换为 toolCalls
  const { cleanText, actionCalls } = extractActionBlocks(fullText);
  toolCalls.push(...actionCalls);

  return {
    text: cleanText,
    toolCalls,
    raw: output
  };
}

/**
 * 从文本中提取 ```action``` 代码块
 * @param {string} text - 原始文本
 * @returns {{cleanText: string, actionCalls: Array}}
 */
function extractActionBlocks(text) {
  const actionCalls = [];
  // 匹配 ```action ... ``` 代码块
  const pattern = /```action\s*([\s\S]*?)```/g;

  const cleanText = text.replace(pattern, (match, jsonStr) => {
    try {
      const action = JSON.parse(jsonStr.trim());
      // 支持 action.action 或 action.type 作为动作名称
      const toolName = action.action || action.type;
      if (toolName) {
        const args = { ...action };
        delete args.action;
        delete args.type;

        // 标准化参数名称
        normalizeActionArgs(toolName, args);

        actionCalls.push({
          id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: toolName,
          arguments: args
        });
      }
    } catch (e) {
      console.warn('[Executor] 解析 action 块失败:', e.message, jsonStr);
    }
    return ''; // 从文本中移除
  }).trim();

  return { cleanText, actionCalls };
}

/**
 * 标准化动作参数
 * 处理 Claude 返回的各种格式变体
 */
function normalizeActionArgs(toolName, args) {
  // 处理 plant 动作
  if (toolName === 'plant') {
    // flower: {color: "pink"} -> bouquetKey: "粉花"
    if (args.flower?.color) {
      args.bouquetKey = normalizeFlowerType(args.flower.color);
      delete args.flower;
    }
    // flowerType -> bouquetKey
    if (args.flowerType) {
      args.bouquetKey = normalizeFlowerType(args.flowerType);
      delete args.flowerType;
    }
    // item -> bouquetKey
    if (args.item && !args.bouquetKey) {
      args.bouquetKey = normalizeFlowerType(args.item);
      delete args.item;
    }
    // 确保 count 存在
    if (!args.count) {
      args.count = 1;
    }
    // 清理不需要的字段
    delete args.position;
    delete args.note;
  }

  // 处理 harvest 动作
  if (toolName === 'harvest') {
    // 确保 reason 存在（从用户消息中获取）
    if (!args.reason && args.message) {
      args.reason = args.message;
      delete args.message;
    }
    // 如果没有 reason，使用默认值
    if (!args.reason) {
      args.reason = '用户满足采摘条件';
    }
    // target -> 清理（flowerId 由前端提供）
    delete args.target;
  }

  return args;
}

/**
 * 标准化花朵类型名称
 * 将英文或简写转换为系统使用的中文类型名
 */
function normalizeFlowerType(type) {
  const mapping = {
    'pink': '粉花',
    'purple': '紫花',
    'red': '红花',
    'yellow': '黄花',
    'blue': '蓝花',
    'tree': '小树',
    '粉花': '粉花',
    '紫花': '紫花',
    '红花': '红花',
    '黄花': '黄花',
    '蓝花': '蓝花',
    '小树': '小树',
  };
  return mapping[type?.toLowerCase?.()] || mapping[type] || type;
}
