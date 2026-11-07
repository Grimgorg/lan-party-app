import { useMemo, useState } from 'react'

export type SortValue = number | string | null | undefined
export type SortDir = 'asc' | 'desc'

/**
 * Sort rows by a keyed accessor. Missing values (null/undefined) always go last,
 * whichever direction is chosen.
 */
export function useSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => SortValue>,
  initialKey: string,
  initialDir: SortDir = 'desc'
) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: initialKey, dir: initialDir })
  const key = accessors[sort.key] ? sort.key : initialKey

  const sorted = useMemo(() => {
    const get = accessors[key]
    if (!get) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      const ma = va === null || va === undefined
      const mb = vb === null || vb === undefined
      if (ma || mb) return ma === mb ? 0 : ma ? 1 : -1
      if (typeof va === 'string' && typeof vb === 'string') {
        return va.localeCompare(vb, undefined, { sensitivity: 'base' }) * factor
      }
      return ((va as number) - (vb as number)) * factor
    })
    // accessors is rebuilt every render; rows/key/dir are what matter.
  }, [rows, key, sort.dir])

  /** Click handler for a header: toggles direction, or switches column (text asc, numbers desc). */
  const toggle = (k: string, textColumn = false) =>
    setSort((s) =>
      s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: textColumn ? 'asc' : 'desc' }
    )

  return { sorted, sortKey: key, sortDir: sort.dir, toggle }
}
