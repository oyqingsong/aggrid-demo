# ag-grid-demo 主题系统迁移设计

## 概述

将当前基于纯 CSS 变量的亮/暗主题切换，升级为基于 Ant Design v6 Design Token + `@chenhui996/gg-ui` ConfigProvider 的二维主题矩阵（亮/暗 × 主色预设），同时用 `@chenhui996/gg-ui` 组件替换现有全部自定义 UI 组件。

## 架构

### 层次结构

```
@chenhui996/gg-ui ConfigProvider (theme 入口)
  ├── mode: 'light' | 'dark'                    ← gg-ui 加载对应完整 token
  ├── theme.token.colorPrimary                   ← 主色预设覆盖
  ├── theme.cssVar: { prefix: 'ant' }            ← 启用 CSS Variable 模式
  │
  ▼ 输出 CSS 变量到 :root
  --ant-color-primary: #1677ff
  --ant-color-bg-container: #ffffff
  --ant-color-bg-layout: #f5f5f5
  --ant-color-border: #d9d9d9
  --ant-color-text: #141414
  ...
       │
       ▼ 消费方
  ├── gg-ui 组件 (Button/Select/Form/Input)     ← 自动读取
  ├── antd 组件 (Layout/Typography/Flex)         ← 自动读取
  ├── ag-grid (themeQuartz.withParams)           ← var(--ant-xxx)
  └── 自定义 CSS (index.css/ag-overrides.css)    ← var(--ant-xxx)
```

### 主题矩阵

| 维度 | 取值 | 实现 |
|---|---|---|
| 模式 (mode) | `light` / `dark` | gg-ui ConfigProvider 的 `mode` prop |
| 主色 (primary) | `blue` / `green` / `purple` / `orange` | `theme.token.colorPrimary` |

### 运行时切换流程

```
用户操作 → setMode('dark') / setPrimaryColor('green')
    ↓
ConfigProvider 接收新的 theme 配置
    ↓
├── gg-ui/antd 组件即时重渲染
├── CSS 变量实时更新 → ag-grid 引用自动生效
└── data-theme 属性 (少量 ag-grid 专属变量保持同步)
```

## 依赖变更

### package.json 新增

```json
{
  "dependencies": {
    "@chenhui996/gg-ui": "file:../code/gz-ui",
    "@ant-design/icons": "^6.0.0",
    "antd": "^6.3.6"
  }
}
```

### 导入源规则

| 导入源 | 组件 |
|---|---|
| `@chenhui996/gg-ui` | Button, Select, Form, Input, Space, Switch, Tag, Segmented, Dropdown, Tooltip, Popover, message, Modal, ConfigProvider |
| `antd` | Layout, Typography, Flex, Divider |
| `@ant-design/icons` | SunOutlined, MoonOutlined, 及其他图标 |

## 组件替换映射

### Header

**当前**: 纯 div + CSS 变量 + 手动 theme toggle 按钮
**替换**:
- Layout.Header (antd)
- Button (gg-ui) — 亮暗切换
- Select (gg-ui) — 主色选择，自定义 optionRender 显示色块
- Typography.Text (antd)

### MultiSelect × 4 → Select mode="multiple"

**当前**: 自定义 MultiSelect 组件 (useState + useEffect + 手动下拉)
**替换**: Select (gg-ui) `mode="multiple"` + `showSearch` + `allowClear`
**删除文件**: `src/components/MultiSelect.tsx`

### FilterBar

**当前**: 纯 div + CSS 布局
**替换**: Form (gg-ui) `layout="inline"` + Row/Col 布局，内部嵌入 Select + Input + Button

### Toolbar

**当前**: 纯 div + CSS
**替换**: Flex (antd) + Typography.Text (antd) + Select (gg-ui) + Divider (antd)

### 查询/清除按钮

**当前**: 纯 button + CSS
**替换**: Button (gg-ui) `type="primary"` / `type="default"`

## CSS 变量集成

### 变量映射

| 当前 CSS 变量 | Ant Design v6 变量 | 说明 |
|---|---|---|
| `--bg-body` | `--ant-color-bg-layout` | 页面背景 |
| `--bg-surface` | `--ant-color-bg-container` | 容器背景 |
| `--bg-header` | (保留自定义) | Header 背景色，gg-ui 有定制 |
| `--border` | `--ant-color-border` | 边框 |
| `--border-input` | `--ant-color-border-secondary` | 输入框边框 |
| `--text-primary` | `--ant-color-text` | 主文字 |
| `--text-secondary` | `--ant-color-text-secondary` | 次要文字 |
| `--text-muted` | `--ant-color-text-quaternary` | 占位文字 |
| `--bg-hover` | `--ant-color-fill-secondary` | 悬停背景 |
| `--bg-btn-query` | `--ant-color-primary` | 查询按钮背景 |
| `--bg-btn-query-hover` | `--ant-color-primary-hover` | 查询按钮 hover |

### 保留的自定义变量

以下 ag-grid 业务变量无 Ant Design 对应项，保留手动亮/暗切换：

```css
:root {
  --bg-group-row: #f1f5f9;
  --bg-group-row-hover: #e2e8f0;
  --color-positive: #16a34a;
  --color-negative: #dc2626;
  --color-dash: #94a3b8;
  --color-sort-active: inherit;
}
[data-theme='dark'] {
  --bg-group-row: #1e293b;
  --bg-group-row-hover: #334155;
  --color-positive: #4ade80;
  --color-negative: #f87171;
  --color-dash: #64748b;
  --color-sort-active: #fbbf24;
}
```

### ag-grid theme 集成

```ts
const myTheme = themeQuartz.withParams({
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
})
```

### 暗色模式 data-theme 属性

保留 `data-theme` 属性同步，仅用于少量 ag-grid 专属变量的开关：

```ts
useEffect(() => {
  document.documentElement.setAttribute('data-theme', mode)
}, [mode])
```

不在需要根据 mode 分支设置 myTheme 参数。

## 主色预设

| 名称 | 色值 | 适合场景 |
|---|---|---|
| Blue | `#1677ff` | 默认，专业稳重 |
| Green | `#00b96b` | 金融风格，正向关联 |
| Purple | `#722ed1` | 现代独特 |
| Orange | `#fa8c16` | 交易桌风格，高活力 |

预设值通过 gg-ui ConfigProvider 的 `theme.token.colorPrimary` 注入，Ant Design 自动派生 hover/active 等梯度色。

## 状态管理

```tsx
const [mode, setMode] = useState<'light' | 'dark'>('light')
const [primaryColor, setPrimaryColor] = useState<string>('#1677ff')

const themeConfig = useMemo(() => ({
  token: { colorPrimary: primaryColor },
  cssVar: { prefix: 'ant' },
}), [primaryColor])

// ConfigProvider 使用
<ConfigProvider mode={mode} theme={themeConfig}>
  <App />
</ConfigProvider>
```

持久化方案：`localStorage` 存储 mode + primaryColor，页面加载时恢复。

## 主色选择 UI 控件

放在 Header 右侧区域，与亮暗切换按钮并列：
- 使用 Select (gg-ui) 或 Segmented (gg-ui)
- 自定义选项渲染：色块 + 中文标签
- 选择后即时切换全站主题色

## 文件变更清单

### 新增依赖
- `@chenhui996/gg-ui` (file:../code/gz-ui)
- `antd` (gg-ui peer dependency)
- `@ant-design/icons`

### 修改文件
- `package.json` — 新增依赖
- `src/main.tsx` — 包裹 ConfigProvider
- `src/App.tsx` — 主题状态管理 + 调整 myTheme
- `src/components/header.tsx` — 替换为 antd/gg-ui 组件
- `src/components/FilterBar.tsx` — 替换为 Form + Select + Input + Button
- `src/components/Toolbar.tsx` — 替换为 Flex + Typography + Select
- `src/index.css` — CSS 变量迁移至 Ant Design 变量
- `src/ag-overrides.css` — 引用 --ant-* 变量

### 删除文件
- `src/App.css` (已空)
- `src/components/MultiSelect.tsx` (被 Select mode="multiple" 替代)
