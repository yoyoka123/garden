/**
 * UI 消息配置
 * 包含 ChatUI 和其他 UI 组件使用的文本
 */

export const UIMessages = {
  // ChatUI 消息
  chat: {
    // 聊天头部
    header: {
      activeTitle: '对话对象：{name}',
      activeStatus: '想和你聊聊~',
      inactiveTitle: '无对话对象',
      inactiveStatus: '点击成熟的花朵开始对话'
    },

    // 错误消息
    errors: {
      noAgentConfig: '该花朵没有配置对话',
      chatError: '出错了：{message}'
    }
  },

  // 采摘成功
  harvest: {
    icon: '',
    defaultMessage: '采摘成功！'
  },

  // 状态消息
  status: {
    noBouquetSelected: '请先选择一个花束',
    placeDecoration: '点击场景放置装饰物',
    cancelDecoration: '已取消放置装饰物',
    appStarted: '语义农场已启动'
  },

  // 空状态提示
  empty: {
    decorations: '暂无装饰物',
    bouquets: '暂无花束，请上传图片添加',
    grass: '暂无草皮素材',
    bouquetDropdown: '请先添加花束'
  }
};

export default UIMessages;
