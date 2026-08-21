'use client'

/**
 * The lead table, with a checkbox per row and a select all in the header.
 *
 * Its own component rather than an option on DataTable, because selection
 * needs client state and the other admin tables do not. Adding it to the
 * shared table would have made every list on the site a client component to
 * serve one page that needs it.
 *
 * Selection is per page and deliberately not persisted across pages. A control
 * that quietly remembers rows you can no longer see, and then exports them, is
 * how somebody sends out 200 records believing they sent 12.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { StatusPill } from '@/components/admin/AdminUi'

/**
 * Header checkbox. React has no declarative indeterminate attribute, so the
 * partial state has to be set on the node itself.
 */
function SelectAllBox({ checked, indeterminate, onChange, disabled }) {
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
      disabled={disabled}
      aria-label={checked ? 'Clear selection' : 'Select all rows on this page'}
      className="w-4 h-4 accent-[#1b2a56] cursor-pointer"
    />
  )
}

/**
 * Renders the table and the bulk action bar.
 * `exportBase` is the export url carrying the current filters, so a selection
 * export narrows the same view rather than reaching outside it.
 */
export default function LeadTable({ leads, exportBase, emptyMessage }) {
  const [selected, setSelected] = useState(() => new Set())

  // Any change to the rows underneath, a filter, a page, a sort, clears the
  // selection. Keeping ids that are no longer on screen is how a bulk action
  // ends up doing something nobody intended.
  const rowKey = useMemo(() => leads.map((lead) => lead.id).join('|'), [leads])
  useEffect(() => {
    setSelected(new Set())
  }, [rowKey])

  const allSelected = leads.length > 0 && selected.size === leads.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((lead) => lead.id)))
  }

  function toggleOne(id) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="bg-white border rounded-lg px-6 py-14 text-center">
        <p className="text-lg text-[#505258]">{emptyMessage}</p>
      </div>
    )
  }

  const selectedExportHref = `${exportBase}${exportBase.includes('?') ? '&' : '?'}ids=${[...selected].join(',')}`

  return (
    <>
      {/* Only appears once something is selected, so it never occupies space
          for an action nobody has started */}
      {selected.size > 0 && (
        <div className="mb-3 bg-ihealthBlue text-white rounded-lg px-5 py-3 flex items-center gap-4 flex-wrap">
          <p className="font-semibold">
            {selected.size} selected on this page
          </p>

          <a
            href={selectedExportHref}
            className="h-10 px-4 rounded-md bg-white text-ihealthBlue font-semibold inline-flex items-center hover:brightness-95 transition-[filter]"
          >
            Export selected
          </a>

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
              {['Name', 'Phone', 'Zip', 'Source', 'Campaign', 'For', 'Status', 'Received'].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="px-4 py-3 text-sm font-bold uppercase tracking-[1.2px] text-[#505258] whitespace-nowrap"
                >
                  {label}
                </th>
              ))}
              <th
                scope="col"
                className="px-4 py-3 text-sm font-bold uppercase tracking-[1.2px] text-[#505258] text-right whitespace-nowrap"
              >
                Calls
              </th>
            </tr>
          </thead>

          <tbody>
            {leads.map((lead) => {
              const isSelected = selected.has(lead.id)

              return (
                <tr
                  key={lead.id}
                  className={`border-b last:border-b-0 ${isSelected ? 'bg-ihealthBlue/5' : 'hover:bg-[#f7f7f7]'}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(lead.id)}
                      aria-label={`Select ${lead.name}`}
                      className="w-4 h-4 accent-[#1b2a56] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-base">
                    <Link href={`/admin/leads/${lead.id}`} className="text-[#105fa8] font-semibold hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-base whitespace-nowrap">{lead.phone}</td>
                  <td className="px-4 py-3 text-base">{lead.zip}</td>
                  <td className="px-4 py-3 text-base">{lead.source}</td>
                  <td className="px-4 py-3 text-base">{lead.campaign}</td>
                  <td className="px-4 py-3 text-base">{lead.onBehalfOf}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={lead.status} />
                  </td>
                  <td className="px-4 py-3 text-base whitespace-nowrap">{lead.createdAtLabel}</td>
                  <td className="px-4 py-3 text-base text-right tabular-nums">
                    {lead.callCount === 0 ? <span className="text-[#6C7381]">none</span> : lead.callCount}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
