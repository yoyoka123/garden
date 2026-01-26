# 花园项目 - Claude Code 规则

## 服务端口配置（硬性要求）

启动服务时必须使用以下端口：

| 服务 | 端口 | 地址 |
|------|------|------|
| 花园网页端 | 8001 | http://localhost:8001 |
| Bridge Server | 8002 | ws://localhost:8002 |

### 启动命令

**花园网页端：**
```bash
npx serve . -p 8001
```

**Bridge Server：**
```bash
cd bridge-server && node server.js
# 或直接在项目根目录
node bridge-server/server.js
```

## 项目结构

- `index.html` - 主页面入口
- `main.js` - 主逻辑
- `src/` - 模块化源码
- `bridge-server/` - Bridge Server (连接 Claude Code)
- `assets/` - 静态资源

## 开发注意事项

1. 修改代码后刷新页面即可生效（无需重启服务器）
2. Bridge Server 修改后需要重启
3. 状态数据保存在 localStorage，清除浏览器缓存会丢失
