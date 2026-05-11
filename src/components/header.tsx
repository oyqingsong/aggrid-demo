import { Layout, Typography } from 'antd'
import { Button, Select, Space } from '@chenhui996/gg-ui'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'

const { Text } = Typography

interface HeaderProps {
  mode: 'light' | 'dark'
  onToggleMode: () => void
  primaryColor: string
  onPrimaryColorChange: (color: string) => void
  primaryColorOptions: Record<string, string>
}

export default function Header({ mode, onToggleMode, primaryColor, onPrimaryColorChange, primaryColorOptions }: HeaderProps) {
  return (
    <Layout.Header
      className="app-header"
      style={{
        height: 40,
        lineHeight: '40px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg-header)',
      }}
    >
      <Space>
        <Text strong style={{ color: 'inherit', fontSize: 14 }}>FICC Position Blotter</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>v2.0 — Click Group Row to Sort</Text>
      </Space>
      <Space>
        <Text style={{ color: 'inherit', fontSize: 12 }}>Trading Desk: Global Macro</Text>
        <Text style={{ color: 'inherit', fontSize: 12 }}>User: Admin</Text>
        <Select
          size="small"
          value={primaryColor}
          onChange={onPrimaryColorChange}
          popupMatchSelectWidth={false}
          options={Object.entries(primaryColorOptions).map(([label, value]) => ({
            value,
            label: (
              <Space size={4}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, backgroundColor: value, verticalAlign: 'middle' }} />
                <span style={{ textTransform: 'capitalize' }}>{label}</span>
              </Space>
            ),
          }))}
          style={{ width: 90 }}
        />
        <Button
          type="text"
          icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={onToggleMode}
          style={{ color: 'inherit' }}
        />
      </Space>
    </Layout.Header>
  )
}
