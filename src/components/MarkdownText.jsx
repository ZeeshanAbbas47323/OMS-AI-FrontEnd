import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownText.css'

/**
 * Agent replies come back as markdown — bold, bullet lists and GFM tables.
 * Rendered as plain text they showed up as literal `**Customer:**` and
 * pipe-separated rows, so anything with a table was unreadable.
 *
 * remark-gfm is what turns those pipe rows into a real table; react-markdown
 * alone ignores them. Raw HTML stays disabled (the default), so model output
 * can never inject markup into the page.
 */
export default function MarkdownText({ children, className = '' }) {
  return (
    <div className={`markdown-body ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Wide order tables must scroll inside the bubble instead of
          // stretching the chat column.
          table: ({ node, ...props }) => (
            <div className="markdown-table-wrap"><table {...props} /></div>
          ),
          // Links from model output open safely in a new tab.
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
