import MultiSelect from './MultiSelect'
import { ALL_INVEST_ACCOUNTS, ALL_ACCOUNTS, ALL_ASSET_TYPES } from '../data'
import type { Filters } from '../types'

interface FilterBarProps {
  filters: Filters
  setFilters: (updater: (prev: Filters) => Filters) => void
  setAssetType: (selected: string[]) => void
  setCounterparty: (selected: string[]) => void
  availableCounterparties: string[]
  onQuery: () => void
  onClear: () => void
}

/** 筛选栏：四个多选筛选项 + 关键词输入 + 查询/清除按钮
 *  setAssetType/setCounterparty 来自父组件，处理 "证券分类 ↔ 二级分类" 联动 */
export default function FilterBar({
  filters, setFilters, setAssetType, setCounterparty,
  availableCounterparties, onQuery, onClear,
}: FilterBarProps) {
  return (
    <section className="filter-bar">
      <div className="filter-row">
        <MultiSelect
          label="管理证券账户"
          options={ALL_INVEST_ACCOUNTS}
          selected={filters.investType}
          onChange={(v) => setFilters(p => ({ ...p, investType: v }))}
        />
        <MultiSelect
          label="证券账户"
          options={ALL_ACCOUNTS}
          selected={filters.account}
          onChange={(v) => setFilters(p => ({ ...p, account: v }))}
        />
        <MultiSelect
          label="证券分类"
          options={ALL_ASSET_TYPES}
          selected={filters.assetType}
          onChange={setAssetType}
        />
        <MultiSelect
          label="证券二级分类"
          options={availableCounterparties}
          selected={filters.counterparty}
          onChange={setCounterparty}
          disabled={availableCounterparties.length === 0}
        />
        <div className="filter-dropdown">
          <label className="filter-label">标的名称/代码</label>
          <input
            type="text"
            className="filter-input"
            placeholder="输入名称或代码"
            value={filters.keyword}
            onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') onQuery() }}
          />
        </div>
        <div className="filter-actions">
          <button className="btn-clear" onClick={onClear}>清除</button>
          <button className="btn-query" onClick={onQuery}>查询 / 刷新</button>
        </div>
      </div>
    </section>
  )
}
