# Ant Design v6 + gz-ui Theme Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate from custom CSS variable theming to Ant Design v6 Design Token + `@chenhui996/gg-ui` theme system, replacing all custom UI components.

**Architecture:** `@chenhui996/gg-ui` ConfigProvider wraps the app, managing a 2D theme matrix (light/dark × 4 primary color presets). UI components imported from gg-ui (Select/Button/Form/Input) and antd (Layout/Typography/Flex). ag-grid references Ant Design CSS variables for automatic theme sync.

**Tech Stack:** React 19, Ant Design v6, @chenhui996/gg-ui, @ant-design/icons, ag-grid

---

## File Structure

### Files to Modify
| File | Responsibility |
|---|---|
| `package.json` | Add @chenhui996/gg-ui, antd, @ant-design/icons |
| `src/App.tsx` | Theme state (mode + primaryColor), ConfigProvider wrapper, simplified myTheme |
| `src/main.tsx` | Add gg-ui CSS import |
| `src/components/header.tsx` | Replace with antd Layout.Header + gg-ui Button/Select + Typography |
| `src/components/FilterBar.tsx` | Replace with gg-ui Form + Select + Input + Button |
| `src/components/Toolbar.tsx` | Replace with antd Flex + Typography + gg-ui Select |
| `src/index.css` | Migrate CSS variables to Ant Design --ant-* references |
| `src/ag-overrides.css` | Replace hardcoded values with --ant-* variables |

### Files to Delete
| File | Reason |
|---|---|
| `src/App.css` | Already empty, unused |
| `src/components/MultiSelect.tsx` | Replaced by Select mode="multiple" |

---

## Tasks

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1.1: Add dependencies to package.json**

Edit `package.json` to add these to `dependencies`:

```json
{
  "dependencies": {
    "@chenhui996/gg-ui": "file:../code/gz-ui",
    "@ant-design/icons": "^6.0.0",
    "antd": "^6.3.6"
  }
}
```

- [ ] **Step 1.2: Install**

Run: `cd d:/D桌面/gz/html/ag-grid-demo1 && npm install`

Expected: npm installs the new packages without errors.

---

### Task 2: main.tsx — Add gg-ui CSS import

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 2.1: Add CSS import**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@chenhui996/gg-ui/gg-ui.css'   // ← add this
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Note: ConfigProvider is placed inside App.tsx (not main.tsx) because the theme state (mode, primaryColor) is managed at the App level.

---

### Task 3: App.tsx — Theme state management + ConfigProvider

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 3.1: Add imports for ConfigProvider and theme**

Replace the import section at the top:

```tsx
import { useMemo, useState, useCallback, useEffect } from 'react'
import { AllEnterpriseModule } from 'ag-grid-enterprise'
import { AgGridReact, AgGridProvider } from 'ag-grid-react'
import type { CellClickedEvent } from 'ag-grid-community'
import { AllCommunityModule, ModuleRegistry, themeQuartz } from 'ag-grid-community'
import { ConfigProvider } from '@chenhui996/gg-ui'
import { generateMockData, buildGroupedRows, ASSET_TO_COUNTERPARTY } from './data'
import type { Row, DetailRowData, Filters, SortState } from './types'
import { buildColumns, UNITS } from './columns'
import Header from './components/header'
import FilterBar from './components/FilterBar'
import Toolbar from './components/Toolbar'
import './ag-overrides.css'
```

- [ ] **Step 3.2: Add primary color presets constant**

Add after `const defaultFilters`:

```tsx
const PRIMARY_COLORS = {
  blue:   '#1677ff',
  green:  '#00b96b',
  purple: '#722ed1',
  orange: '#fa8c16',
} as const
```

- [ ] **Step 3.3: Replace theme state + myTheme**

Replace the existing `const [theme, setTheme]` and `useEffect` and `myTheme` useMemo:

```tsx
export default function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const [primaryColor, setPrimaryColor] = useState<string>(PRIMARY_COLORS.blue)

  // 同步 data-theme 属性（用于少量自定义变量）
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode])

  // ag-grid 主题：引用 Ant Design CSS 变量，不再依赖 mode 分支
  const myTheme = useMemo(() => themeQuartz.withParams({
    fontSize: 12,
    headerFontSize: 12,
    rowHeight: 30,
    headerHeight: 32,
    wrapperBorder: false,
    cellHorizontalPadding: 8,
    headerBackgroundColor: 'var(--ant-color-bg-elevated)',
    headerTextColor: 'var(--ant-color-text)',
    borderColor: 'var(--ant-color-border)',
    oddRowBackgroundColor: 'var(--ant-color-fill-secondary)',
    backgroundColor: 'var(--ant-color-bg-container)',
    foregroundColor: 'var(--ant-color-text)',
  }), [])

  // ConfigProvider theme config
  const themeConfig = useMemo(() => ({
    token: { colorPrimary: primaryColor },
    cssVar: { prefix: 'ant' },
  }), [primaryColor])
```

- [ ] **Step 3.4: Update JSX return to wrap with ConfigProvider**

Replace the return statement to wrap with ConfigProvider and pass theme props to Header:

```tsx
  return (
    <ConfigProvider mode={mode} theme={themeConfig}>
      <div className="app-container">
        <Header
          mode={mode}
          onToggleMode={() => setMode(m => m === 'light' ? 'dark' : 'light')}
          primaryColor={primaryColor}
          onPrimaryColorChange={setPrimaryColor}
          primaryColorOptions={PRIMARY_COLORS}
        />

        <FilterBar
          filters={filters}
          setFilters={setFilters}
          setAssetType={setAssetType}
          setCounterparty={setCounterparty}
          availableCounterparties={availableCounterparties}
          onQuery={doQuery}
          onClear={doClear}
        />

        <Toolbar
          unit={unit}
          setUnit={setUnit}
          detailCount={detailCount}
          groupCount={groupCount}
        />

        <section className="grid-wrapper">
          <div className="ag-theme-alpine grid-inner" style={{ height: '100%' }}>
            <AgGridProvider modules={modules} licenseKey="AgGridLicense66fwc79n[NORMAL][v0102]_NDA3MDk2NjQwMDAwMA==80908dd5fb71b58d3ce28b2ed320216d">
              <AgGridReact<Row>
                rowData={visibleRows}
                columnDefs={columnDefs}
                defaultColDef={{ sortable: false, resizable: true }}
                onCellClicked={onCellClicked}
                getRowClass={(p) => p.data?.kind === 'group' ? 'row-group' : 'row-detail'}
                animateRows={true}
                alwaysShowVerticalScroll={true}
                context={context}
                theme={myTheme}
                overlayNoRowsTemplate={'<span style="padding:20px;color:#94a3b8;">暂无符合条件的数据</span>'}
              />
            </AgGridProvider>
          </div>
        </section>
      </div>
    </ConfigProvider>
  )
```

---

### Task 4: Header — Replace with antd/gg-ui components

**Files:**
- Modify: `src/components/header.tsx`

- [ ] **Step 4.1: Rewrite Header component**

Replace the entire file:

```tsx
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
    <Layout.Header className="app-header" style={{ height: 40, lineHeight: '40px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                <span>{label}</span>
              </Space>
            ),
          }))}
          style={{ width: 80 }}
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
```

---

### Task 5: FilterBar — Replace with gg-ui Form + Select + Input + Button

**Files:**
- Modify: `src/components/FilterBar.tsx`
- Delete: `src/components/MultiSelect.tsx`

- [ ] **Step 5.1: Rewrite FilterBar**

```tsx
import { Form, Select, Input, Button } from '@chenhui996/gg-ui'
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

export default function FilterBar({
  filters, setFilters, setAssetType, setCounterparty,
  availableCounterparties, onQuery, onClear,
}: FilterBarProps) {
  const selectStyle = { minWidth: 140 }

  return (
    <div className="filter-bar">
      <Form layout="inline" style={{ flexWrap: 'wrap', gap: 8 }}>
        <Form.Item label="管理证券账户">
          <Select
            mode="multiple"
            placeholder="请选择..."
            value={filters.investType}
            onChange={(v) => setFilters(p => ({ ...p, investType: v }))}
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
            onChange={(v) => setFilters(p => ({ ...p, account: v }))}
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
            onChange={(e) => setFilters(p => ({ ...p, keyword: e.target.value }))}
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

// Need Space from gg-ui — add to existing import or import separately
import { Space } from '@chenhui996/gg-ui'
```

Note: The `Space` import should be combined with the existing import line:
```tsx
import { Form, Select, Input, Button, Space } from '@chenhui996/gg-ui'
```

- [ ] **Step 5.2: Delete MultiSelect.tsx**

Run: `rm src/components/MultiSelect.tsx`

---

### Task 6: Toolbar — Replace with antd Flex + Typography + gg-ui Select

**Files:**
- Modify: `src/components/Toolbar.tsx`

- [ ] **Step 6.1: Rewrite Toolbar**

```tsx
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
            onChange={setUnit}
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
```

---

### Task 7: CSS variable migration

**Files:**
- Modify: `src/index.css`
- Modify: `src/ag-overrides.css`

- [ ] **Step 7.1: Migrate index.css**

Replace the CSS variable definitions to reference Ant Design's CSS variables. The `:root` block now references `--ant-*` variables, and the dark block is removed since Ant Design handles dark mode automatically.

```css
/* ─── 主题色变量（引用 Ant Design Design Token CSS 变量）─────── */
:root {
  --bg-body: var(--ant-color-bg-layout);
  --bg-surface: var(--ant-color-bg-container);
  --bg-header: #1e293b; /* 保持不变 — gg-ui 有定制 */
  --bg-group-row: #f1f5f9;
  --bg-group-row-hover: #e2e8f0;
  --bg-scrollbar-track: var(--ant-color-fill-secondary);
  --bg-scrollbar-thumb: var(--ant-color-border);
  --bg-scrollbar-thumb-hover: var(--ant-color-text-quaternary);

  --border: var(--ant-color-border);
  --border-input: var(--ant-color-border-secondary);

  --text-primary: var(--ant-color-text);
  --text-secondary: var(--ant-color-text-secondary);
  --text-muted: var(--ant-color-text-quaternary);

  --color-positive: #16a34a;
  --color-negative: #dc2626;
  --color-dash: #94a3b8;
  --color-sort-active: inherit;
}

/* ─── 暗色模式（仅少量 ag-grid 专用变量，其余由 Ant Design 管理）─ */
[data-theme='dark'] {
  --bg-group-row: #1e293b;
  --bg-group-row-hover: #334155;
  --color-positive: #4ade80;
  --color-negative: #f87171;
  --color-dash: #64748b;
  --color-sort-active: #fbbf24;
}
```

Also update the `.app-header` styles. Replace the hardcoded height/padding with the class-based approach. Remove the `.theme-toggle` button styles (now handled by antd Button). Remove the filter-bar, filter-dropdown, filter-box, filter-tag, filter-menu, filter-item, filter-input, filter-select, btn-clear, btn-query styles (now handled by gg-ui components).

The remaining styles to keep:
- `* { margin: 0; padding: 0; box-sizing: border-box; }`
- `body { ... }`
- `.app-container { ... }`
- `.app-header` — simplified, mainly background color
- `.toolbar` — simplified
- `.grid-wrapper { ... }`
- `.grid-inner { ... }`
- `::-webkit-scrollbar ...` (keep)

Remove these sections entirely (handled by gg-ui now):
- `.app-header-right`
- `.theme-toggle`
- `.filter-bar` (layout handled by Form inline now)
- `.filter-row`
- `.filter-dropdown`
- `.filter-label`
- `.filter-box`
- `.filter-tag`
- `.filter-tag-x`
- `.filter-menu`
- `.filter-item`
- `.filter-select`
- `.filter-input`
- `.filter-actions`
- `.btn-clear`
- `.btn-query`
- `.toolbar` (layout handled by antd Flex now)
- `.toolbar-left`
- `.toolbar-right`
- `.toolbar-item`
- `.toolbar-divider`
- `.toolbar-stat`
- `.toolbar-hint`

- [ ] **Step 7.2: Migrate ag-overrides.css**

Replace all `var(--bg-*)` and `var(--text-*)` references with `var(--ant-*)` equivalents where available. The ag-overrides.css already uses CSS variables from index.css, so updating index.css in Step 7.1 will automatically flow through. However, ensure the ag-grid header styles and row styles still work correctly. The main change is that `--bg-btn-query` / `--bg-btn-query-hover` are no longer defined — buttons use Ant Design's Button component now.

The `.cell-positive`, `.cell-negative`, `.cell-dash`, `.color-sort-active` variables remain the same since they reference the preserved custom variables.

---

### Task 8: Clean up

**Files:**
- Delete: `src/App.css`

- [ ] **Step 8.1: Delete App.css**

Run: `rm src/App.css`

- [ ] **Step 8.2: Verify build**

Run: `cd d:/D桌面/gz/html/ag-grid-demo1 && npx tsc -b && npx vite build`

Expected: Build succeeds with no errors.

---

### Task 9: Verify dev server

- [ ] **Step 9.1: Start dev server and verify**

Run: `cd d:/D桌面/gz/html/ag-grid-demo1 && npm run dev`

Open browser and verify:
1. Page loads with correct blue primary theme
2. Header shows correctly with antd Layout.Header styling
3. FilterBar shows Select mode="multiple" dropdowns working
4. Toolbar shows unit selector and stats
5. ag-grid renders correctly
6. Click dark mode toggle → switches to dark theme
7. Change primary color selector → primary color updates
8. ag-grid theme follows color/light-dark changes
