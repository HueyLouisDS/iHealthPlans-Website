'use client'

/**
 * Table with a checkbox per row and a select all in the header, shared by the
 * admin list pages that need selection.
 *
 * Kept separate from DataTable rather than added as an option, because
 * selection needs client state and the pages that only display rows should
 * stay server rendered.
 *
 * Selection is per page and deliberately not persisted across pages. A control
 * that quietly remembers rows you can no longer see, and then exports them, is
 * how somebody sends out 200 records believing they sent 12.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { StatusPill, MatchPill } from '@/components/admin/AdminUi'

/**
 * How a cell is rendered, named rather than passed as a function.
 *
 * This is not indirection for its own sake. A render function cannot cross
 * from a server component into a client one, and every page using this table
 * is a server component, so the column config has to be plain serialisable
 * data. A name is the serialisable version of a function.
 */
const FORMATTERS = {
  statusPill: (value) => <StatusPill status={value} />,
  matchPill: (value) => <MatchPill matched={value} />,
  // A zero here means nothing happened, which is worth saying rather than
  // printing a quiet 0 that reads as a real measurement
  zeroNone: (value) => (value === 0 ? <span className="text-[#6C7381]">none</span> : value),
  emptyNone: (value, column) =>
    value ? value : <span className="text-[#6C7381]">{column.emptyLabel || 'none'}</span>,
  boolLabel: (value, column) =>
    value ? column.trueLabel || 'yes' : <span className="text-[#6C7381]">{column.falseLabel || 'none'}</span>,
  // A rate calculated over a handful of records, shown at the same weight as
  // one calculated over hundreds, is how somebody moves budget onto 3 lucky
  // enrollments. The row is still shown, just marked so it cannot be read
  // straight off the page.
  thinRate: (value, column, row) =>
    row.lowVolume ? (
      <span className="text-[#6C7381]">
        {value}
        <span className="ml-1.5 text-xs font-bold uppercase tracking-[0.5px]" aria-hidden="true">
          thin
        </span>
        <span className="sr-only">, based on only {row.leads} leads, too few to read as a rate</span>
      </span>
    ) : (
      value
    ),
}

/**
 * Header checkbox. React has no declarative indeterminate attribute, so the
 * partial state has to be set on the node itself.
 */
function SelectAllBox({ checked, indeterminate, onChange }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={checked ? 'Clear selection' : 'Select all rows on this page'}
      className="w-4 h-4 accent-[#1b2a56] cursor-pointer"
    />
  )
}

/**
 * Renders the table and the bulk action bar.
 *
 * `columns` is a list of { key, label, align, nowrap, format }, all plain
 * data. `exportBase` is the export url carrying the current filters, so a
 * selection export narrows the same view rather than reaching outside it.
 */
export default function SelectableTable({
  rows,
  columns,
  // A base path rather than a function, for the same reason the columns carry
  // a format name. Functions cannot be passed from a server component to a
  // client one, and every page using this table is a server component.
  rowHrefBase,
  // Which field names a row in the checkbox label. "Select Marguerite
  // Ashcombe" is a usable announcement, "Select ld_1036" is not.
  rowLabelKey = 'id',
  exportBase,
  emptyMessage,
  selectionNoun = 'rows',
}) {
  const [selected, setSelected] = useState(() => new Set())

  // Any change to the rows underneath, a filter, a page, a sort, clears the
  // selection. Keeping ids that are no longer on screen is how a bulk action
  // ends up doing something nobody intended.
  const rowKey = useMemo(() => rows.map((row) => row.id).join('|'), [rows])
  useEffect(() => {
    setSelected(new Set())
  }, [rowKey])

  const allSelected = rows.length > 0 && selected.size === rows.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.id)))
  }

  function toggleOne(id) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white border rounded-lg px-6 py-14 text-center">
        <p className="text-lg text-[#505258]">{emptyMessage}</p>
      </div>
    )
  }

  const selectedExportHref = exportBase
    ? `${exportBase}${exportBase.includes('?') ? '&' : '?'}ids=${[...selected].join(',')}`
    : null

  return (
    <>
      {/* Only appears once something is selected, so it never occupies space
          for an action nobody has started */}
      {selected.size > 0 && (
        <div className="mb-3 bg-ihealthBlue text-white rounded-lg px-5 py-3 flex items-center gap-4 flex-wrap">
          <p className="font-semibold">
            {selected.size} {selectionNoun} selected on this page
          </p>

          {selectedExportHref && (
            <a
              href={selectedExportHref}
              className="h-10 px-4 rounded-md bg-ihealthGreen text-white font-semibold inline-flex items-center hover:brightness-95 transition-[filter]"
            >
              Export selected
            </a>
          )}

          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm font-semibold text-white/80 hover:text-white underline underline-offset-4 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-[#f7f7f7]">
              <th scope="col" className="px-4 py-3 w-10">
                <SelectAllBox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
              </th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-sm font-bold uppercase tracking-[1.2px] text-[#505258] whitespace-nowrap ${
                    column.align === 'right' ? 'text-right' : ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const isSelected = selected.has(row.id)
              const href = rowHrefBase ? `${rowHrefBase}${row.id}` : null

              return (
                <tr
                  key={row.id}
                  className={`border-b last:border-b-0 ${isSelected ? 'bg-ihealthBlue/5' : 'hover:bg-[#f7f7f7]'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row[rowLabelKey] || row.id}`}
                      className="w-4 h-4 accent-[#1b2a56] cursor-pointer"
                    />
                  </td>

                  {columns.map((column, index) => {
                    const formatter = column.format ? FORMATTERS[column.format] : null
                    // The whole row is passed as well as the cell, because some
                    // formatters need a sibling field to decide how to render,
                    // like a rate that has to know its own denominator
                    const content = formatter ? formatter(row[column.key], column, row) : row[column.key]

                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-base ${
                          column.align === 'right' ? 'text-right tabular-nums' : ''
                        } ${column.nowrap ? 'whitespace-nowrap' : ''}`}
                      >
                        {/* Only the first cell links, so the row is reachable
                            without wrapping a table row in an anchor, which is
                            invalid markup and breaks text selection */}
                        {href && index === 0 ? (
                          <Link href={href} className="text-[#105fa8] font-semibold hover:underline">
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
