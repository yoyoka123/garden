/**
 * Garden State Serializer
 * 将花园状态序列化为 Claude 可读的文本格式
 */

/**
 * 序列化花园状态
 * @param {Object} state - 花园状态对象
 * @returns {string} 格式化的状态文本
 */
export function serializeGardenState(state) {
  const lines = [];

  // 花园全局状态标题
  lines.push('# 花园全局状态');
  lines.push(`金币: ${state.gold || 0}`);
  lines.push('');

  // 焦点实体
  if (state.focusedEntity) {
    lines.push('## 当前关注的对象');
    lines.push(`名称: ${state.focusedEntity.name || '未知'}`);
    lines.push(`类型: ${state.focusedEntity.type || 'unknown'}`);

    if (state.focusedEntity.description) {
      lines.push(`描述: ${state.focusedEntity.description}`);
    }

    // 采摘规则
    const harvestRule = state.focusedEntity.customData?.harvestRule;
    if (harvestRule) {
      lines.push('');
      lines.push('## 采摘规则');
      lines.push(`只有当用户满足以下条件时，才能采摘：${harvestRule}`);
    }

    // 花朵性格
    const personality = state.focusedEntity.customData?.personality;
    if (personality) {
      lines.push('');
      lines.push(`### 花朵性格: ${personality}`);
    }

    // 问候语
    const greeting = state.focusedEntity.customData?.greeting;
    if (greeting) {
      lines.push(`### 问候语: ${greeting}`);
    }

    lines.push('');
  }

  // 花朵分布
  const snapshot = state.gardenSnapshot;
  if (snapshot?.cellMap) {
    lines.push('## 花朵分布');

    // 将 cellMap 转换为数组并排序
    const cells = Object.entries(snapshot.cellMap);
    cells.sort((a, b) => {
      const [colA, rowA] = a[0].split(',').map(Number);
      const [colB, rowB] = b[0].split(',').map(Number);
      return rowA - rowB || colA - colB;
    });

    for (const [key, flowers] of cells) {
      if (!flowers || flowers.length === 0) {
        lines.push(`格子(${key}): (空)`);
      } else {
        const descs = flowers.map(f => {
          const status = f.isHarvestable
            ? '可采摘'
            : `成长中 ${f.growthPercent || 0}%`;
          return `${f.name}[${f.id}](${status})`;
        });
        lines.push(`格子(${key}): ${descs.join(', ')}`);
      }
    }
    lines.push('');

    // 统计信息
    if (snapshot.summary) {
      const { total, harvestable, growing } = snapshot.summary;
      lines.push(`统计: 共${total}朵花, ${harvestable}朵可采摘, ${growing}朵成长中`);
      lines.push('');
    }
  }

  // 装饰物信息
  if (state.decorations && state.decorations.length > 0) {
    lines.push('## 装饰物');
    for (const d of state.decorations) {
      const position = `位置(${d.position.x}, ${d.position.z})`;
      const personality = d.personality ? ` - ${d.personality}` : '';
      lines.push(`- ${d.name}[${d.id}]: ${d.type}, ${position}${personality}`);
    }
    lines.push('');

    // 装饰物统计
    if (state.decorationsSummary?.byType) {
      const types = Object.entries(state.decorationsSummary.byType)
        .map(([type, count]) => `${type} x${count}`)
        .join(', ');
      lines.push(`装饰物统计: ${types}`);
      lines.push('');
    }
  }

  // 可用花束类型
  if (state.availableBouquets && state.availableBouquets.length > 0) {
    lines.push('## 可种植的花束类型');
    for (const b of state.availableBouquets) {
      const personality = b.personality ? ` - ${b.personality}` : '';
      lines.push(`- ${b.key}: ${b.name || b.key}${personality}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
