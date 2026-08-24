// Renders an article body from the block data in content/education/bodies.
// Used only by the article page. Every block type the extractor can emit has a
// case here, and anything unrecognised is skipped rather than guessed at.
//
// Nothing here uses dangerouslySetInnerHTML. The source is a scrape of a site
// we do not control, and the whole point of extracting it to blocks was so the
// renderer never has to trust it.

// One run of text with its marks applied.
// Marks nest rather than compose into a single class, so bold inside italic
// survives without needing a case for every combination.

function Span({ span }) {
  if (span.break) return <br />

  let node = span.text

  for (const mark of span.marks || []) {
    if (mark === 'strong') node = <strong className="font-semibold text-ihealthBlue">{node}</strong>
    else if (mark === 'em') node = <em>{node}</em>
  }

  return node
}

function Spans({ spans }) {
  return spans.map((span, index) => <Span key={index} span={span} />)
}

function BlockList({ ordered, items, isNested = false }) {
  const Tag = ordered ? 'ol' : 'ul'

  return (
    <Tag
      className={`w-full flex flex-col gap-3 ${ordered ? 'list-decimal' : 'list-disc'} ${
        isNested ? 'mt-3 pl-6' : 'my-6 pl-6'
      }`}
    >
      {items.map((item, index) => (
        <li key={index} className="text-[clamp(16px,1.66vw,18px)] leading-[1.75] text-[#525B67] pl-1.5">
          <Spans spans={item.spans} />
          {item.list && <BlockList ordered={item.list.ordered} items={item.list.items} isNested />}
        </li>
      ))}
    </Tag>
  )
}

export default function ArticleBody({ blocks }) {
  return (
    <div className="w-full">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <h2
              key={index}
              className="text-[clamp(20px,2.22vw,24px)] font-semibold text-ihealthBlue mt-10 mb-4 first:mt-0"
            >
              {block.text}
            </h2>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p
              key={index}
              className="text-[clamp(16px,1.66vw,18px)] leading-[1.75] text-[#525B67] mb-5 last:mb-0"
            >
              <Spans spans={block.spans} />
            </p>
          )
        }

        if (block.type === 'list') {
          return <BlockList key={index} ordered={block.ordered} items={block.items} />
        }

        return null
      })}
    </div>
  )
}
