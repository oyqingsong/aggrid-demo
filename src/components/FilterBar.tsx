import { Form, Select, Input, Button, Space } from 'antd'
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

/** 筛选栏：四个多选筛选项 + 关键词输入 + 查询/清除按钮 */
export default function FilterBar({
  filters, setFilters, setAssetType, setCounterparty,
  availableCounterparties, onQuery, onClear,
}: FilterBarProps) {
  const selectStyle: React.CSSProperties = { minWidth: 140 }

  return (
    <div className="filter-bar">
      <Form layout="inline" style={{ flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
        <Form.Item label="管理证券账户">
          <Select
            mode="multiple"
            placeholder="请选择..."
            value={filters.investType}
            onChange={(v: string[]) => setFilters(p => ({ ...p, investType: v }))}
            options={ALL_INVEST_ACCOUNTS.map(s => ({ value: s, label: s }))}
            allowClear
            showSearch
            style={selectStyle}
            size="small"
          />
        </Form.Item>
        <Form.Item label="证券账户">
          <Select
            mode="multiple"
            placeholder="请选择..."
            value={filters.account}
            onChange={(v: string[]) => setFilters(p => ({ ...p, account: v }))}
            options={ALL_ACCOUNTS.map(s => ({ value: s, label: s }))}
            allowClear
            showSearch
            style={selectStyle}
            size="small"
          />
        </Form.Item>
        <Form.Item label="证券分类">
          <Select
            mode="multiple"
            placeholder="请选择..."
            value={filters.assetType}
            onChange={setAssetType}
            options={ALL_ASSET_TYPES.map(s => ({ value: s, label: s }))}
            allowClear
            showSearch
            style={selectStyle}
            size="small"
          />
        </Form.Item>
        <Form.Item label="证券二级分类">
          <Select
            mode="multiple"
            placeholder="请选择..."
            value={filters.counterparty}
            onChange={setCounterparty}
            options={availableCounterparties.map(s => ({ value: s, label: s }))}
            allowClear
            showSearch
            style={selectStyle}
            size="small"
            disabled={availableCounterparties.length === 0}
          />
        </Form.Item>
        <Form.Item label="标的名称/代码">
          <Input
            placeholder="输入名称或代码"
            value={filters.keyword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(p => ({ ...p, keyword: e.target.value }))}
            onPressEnter={onQuery}
            style={{ width: 140 }}
            size="small"
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button size="small" onClick={onClear}>清除</Button>
            <Button size="small" type="primary" onClick={onQuery}>查询 / 刷新</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}
