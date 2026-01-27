/**
 * 日志系统
 * 记录资源加载、错误、性能等信息
 */

class Logger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // 最多保存1000条日志
    this.startTime = Date.now();
    
    // 监听全局错误
    this.setupErrorHandlers();
  }

  /**
   * 设置错误处理器
   */
  setupErrorHandlers() {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      this.error('Global Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // 捕获 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        error: event.reason?.stack || String(event.reason)
      });
    });

    // 拦截 fetch 请求
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      const startTime = Date.now();
      
      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;
        
        if (!response.ok) {
          this.warn('Fetch Failed', {
            url,
            status: response.status,
            statusText: response.statusText,
            duration: `${duration}ms`
          });
        } else {
          this.debug('Fetch Success', {
            url,
            status: response.status,
            duration: `${duration}ms`
          });
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.error('Fetch Error', {
          url,
          error: error.message,
          duration: `${duration}ms`
        });
        throw error;
      }
    };
  }

  /**
   * 添加日志
   * @param {string} level - 日志级别: 'debug', 'info', 'warn', 'error'
   * @param {string} category - 日志分类
   * @param {string} message - 日志消息
   * @param {Object} data - 附加数据
   */
  log(level, category, message, data = {}) {
    const timestamp = Date.now();
    const elapsed = timestamp - this.startTime;
    
    const logEntry = {
      timestamp,
      elapsed: `${elapsed}ms`,
      level,
      category,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.logs.push(logEntry);
    
    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 同时输出到控制台
    const consoleMethod = console[level] || console.log;
    const prefix = `[${category}]`;
    if (Object.keys(data).length > 0) {
      consoleMethod(prefix, message, data);
    } else {
      consoleMethod(prefix, message);
    }
  }

  /**
   * 调试日志
   */
  debug(category, message, data) {
    this.log('debug', category, message, data);
  }

  /**
   * 信息日志
   */
  info(category, message, data) {
    this.log('info', category, message, data);
  }

  /**
   * 警告日志
   */
  warn(category, message, data) {
    this.log('warn', category, message, data);
  }

  /**
   * 错误日志
   */
  error(category, message, data) {
    this.log('error', category, message, data);
  }

  /**
   * 记录资源加载
   */
  logResourceLoad(url, success, error = null, duration = null) {
    if (success) {
      this.info('Resource', `Loaded: ${url}`, {
        url,
        duration: duration ? `${duration}ms` : null
      });
    } else {
      this.error('Resource', `Failed to load: ${url}`, {
        url,
        error: error?.message || String(error),
        duration: duration ? `${duration}ms` : null
      });
    }
  }

  /**
   * 记录模块导入
   */
  logModuleImport(modulePath, success, error = null) {
    if (success) {
      this.debug('Module', `Imported: ${modulePath}`);
    } else {
      this.error('Module', `Failed to import: ${modulePath}`, {
        modulePath,
        error: error?.message || String(error)
      });
    }
  }

  /**
   * 获取所有日志
   */
  getAllLogs() {
    return this.logs;
  }

  /**
   * 获取指定级别的日志
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * 获取指定分类的日志
   */
  getLogsByCategory(category) {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * 获取错误日志
   */
  getErrors() {
    return this.getLogsByLevel('error');
  }

  /**
   * 获取警告日志
   */
  getWarnings() {
    return this.getLogsByLevel('warn');
  }

  /**
   * 导出日志为 JSON
   */
  exportJSON() {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      logs: this.logs,
      summary: {
        total: this.logs.length,
        errors: this.getErrors().length,
        warnings: this.getWarnings().length,
        info: this.getLogsByLevel('info').length,
        debug: this.getLogsByLevel('debug').length
      }
    }, null, 2);
  }

  /**
   * 导出日志为文本
   */
  exportText() {
    const lines = [
      `=== Garden Log Export ===`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
      `User Agent: ${navigator.userAgent}`,
      `Total Logs: ${this.logs.length}`,
      `Errors: ${this.getErrors().length}`,
      `Warnings: ${this.getWarnings().length}`,
      ``,
      `=== Logs ===`,
      ``
    ];

    this.logs.forEach(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = Object.keys(log.data).length > 0 
        ? ` | Data: ${JSON.stringify(log.data)}` 
        : '';
      lines.push(`[${time}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${dataStr}`);
    });

    return lines.join('\n');
  }

  /**
   * 下载日志文件
   */
  downloadLogs(format = 'json') {
    const content = format === 'json' ? this.exportJSON() : this.exportText();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garden-log-${Date.now()}.${format === 'json' ? 'json' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 清空日志
   */
  clear() {
    this.logs = [];
    this.startTime = Date.now();
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      total: this.logs.length,
      errors: this.getErrors().length,
      warnings: this.getWarnings().length,
      info: this.getLogsByLevel('info').length,
      debug: this.getLogsByLevel('debug').length,
      uptime: `${Date.now() - this.startTime}ms`
    };
  }
}

// 导出单例
export const logger = new Logger();

// 暴露到全局，方便控制台使用
if (typeof window !== 'undefined') {
  window.gardenLogger = logger;
  console.log('📝 Logger initialized. Use window.gardenLogger to access it.');
  console.log('📥 Export logs: window.gardenLogger.downloadLogs()');
  console.log('📊 View stats: window.gardenLogger.getStats()');
}
