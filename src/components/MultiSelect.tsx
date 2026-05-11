import { useState, useEffect, useRef } from 'react'

interface MultiSelectProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (s: string[]) => void
  disabled?: boolean
}

/** 多选下拉筛选：标签展示 + 点击外部自动关闭 */
export default function MultiSelect({ label, options, selected, onChange, disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 点击下拉框外部区域时关闭菜单
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (opt: string) => {
    if (selected.includes(opt)) onChange(selected.filter(s => s !== opt))
    else onChange([...selected, opt])
  }

  return (
    <div className="filter-dropdown" ref={ref}>
      <label className="filter-label">{label}</label>
      <div className={`filter-box ${disabled ? 'disabled' : ''}`} onClick={() => !disabled && setOpen(!open)}>
        {selected.length === 0
          ? <span className="placeholder">请选择...</span>
          : selected.map(s => (
            <span key={s} className="filter-tag">{s}
              <span className="filter-tag-x" onClick={(e) => { e.stopPropagation(); toggle(s) }}>×</span>
            </span>
          ))}
      </div>
      {open && (
        <div className="filter-menu">
          {options.map(opt => (
            <div key={opt} className="filter-item" onClick={() => toggle(opt)}>
              <input type="checkbox" checked={selected.includes(opt)} readOnly /> <span>{opt}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
