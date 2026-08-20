/**
 * The small green category label that sits on every article card.
 * Shared between the featured card, the standard cards, and the compact list,
 * because all 3 render it identically and it drifts if it is copied around.
 */

/**
 * Renders the chip.
 * Colour is the brand green at 15 percent, which is the one place in the
 * design a translucent brand colour is used rather than a flat tint.
 */
export default function CategoryChip({ name }) {
  return (
    <div className="w-fit h-fit py-2 px-3 rounded-sm bg-ihealthGreen/15 text-ihealthGreen text-xs font-bold uppercase tracking-[1.2px]">
      {name}
    </div>
  )
}
