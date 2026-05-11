import { Flex, Typography, Divider } from 'antd'
import { Select } from '@chenhui996/gg-ui'

const { Text } = Typography

interface ToolbarProps {
  unit: string
  setUnit: (unit: string) => void
  detailCount: number
  groupCount: number
}

const UNIT_OPTIONS = [
  { value: '1', label: '元' },
  { value: '1000', label: '千元' },
  { value: '10000', label: '万元' },
  { value: '1000000', label: '百万元' },
  { value: '100000000', label: '亿元' },
]

export default function Toolbar({ unit, setUnit, detailCount, groupCount }: ToolbarProps) {
  return (
    <Flex className="toolbar" align="center" justify="space-between" style={{ height: 36, padding: '0 12px' }}>
      <Flex align="center" gap={12}>
        <Flex align="center" gap={6}>
          <Text type="secondary" style={{ fontSize: 12 }}>金额单位:</Text>
          <Select
            size="small"
            value={unit}
            onChange={(v: string) => setUnit(v)}
            options={UNIT_OPTIONS}
            style={{ width: 90 }}
          />
        </Flex>
        <Divider type="vertical" style={{ height: 18 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          总数据量: <Text strong>{detailCount.toLocaleString()}</Text> 条
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          分组: <Text strong>{groupCount}</Text> 类
        </Text>
      </Flex>
      <div>
        <Text type="secondary" style={{ fontSize: 11 }}>
          点击分组行任意列 → 该组内排序 | 再次点击切换 ▲▼
        </Text>
      </div>
    </Flex>
  )
}
