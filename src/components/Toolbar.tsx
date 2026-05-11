interface ToolbarProps {
  unit: string
  setUnit: (unit: string) => void
  detailCount: number
  groupCount: number
}

/** 工具栏：金额单位切换 + 明细/分组行数统计 + 排序交互提示 */
export default function Toolbar({ unit, setUnit, detailCount, groupCount }: ToolbarProps) {
  return (
    <section className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-item">
          <label>金额单位:</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="1">元</option>
            <option value="1000">千元</option>
            <option value="10000">万元</option>
            <option value="1000000">百万元</option>
            <option value="100000000">亿元</option>
          </select>
        </div>
        <div className="toolbar-divider" />
        <span className="toolbar-stat">总数据量: <strong>{detailCount.toLocaleString()}</strong> 条</span>
        <span className="toolbar-stat">分组: <strong>{groupCount}</strong> 类</span>
      </div>
      <div className="toolbar-right">
        <span className="toolbar-hint">点击分组行任意列 → 该组内排序 | 再次点击切换 ▲▼</span>
      </div>
    </section>
  )
}
