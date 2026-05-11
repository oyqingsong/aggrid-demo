import type { ICellRendererParams } from 'ag-grid-community'
import type { GroupRowData } from '../types'

/** 分组行首列渲染器 — 展示折叠/展开图标、资产类型名、行数
 *  读取/写入 expandedGroups 状态（通过 ag-grid context 透传） */
export default function GroupCellRenderer(props: ICellRendererParams<GroupRowData>) {
  const data = props.data as GroupRowData | undefined
  if (!data || data.kind !== 'group') return <span>{props.value as string}</span>

  const expandedGroups: Set<string> = props.context?.expandedGroups
  const setExpandedGroups: ((s: Set<string>) => void) | undefined = props.context?.setExpandedGroups
  const isExpanded = expandedGroups?.has(data.assetType) ?? true

  // 切换当前资产类型分组的折叠/展开状态
  const toggle = () => {
    if (!setExpandedGroups) return
    const next = new Set(expandedGroups)
    if (next.has(data.assetType)) next.delete(data.assetType)
    else next.add(data.assetType)
    setExpandedGroups(next)
  }

  return (
    <span onClick={toggle}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none', paddingLeft: 4 }}>
      <span style={{ fontSize: 10, width: 14, flexShrink: 0 }}>{isExpanded ? '▼' : '▶'}</span>
      <span style={{ fontWeight: 600, fontSize: 12 }}>{data.assetType} 汇总</span>
      <span style={{ color: '#64748b', fontSize: 11 }}>({data.rowCount})</span>
    </span>
  )
}
