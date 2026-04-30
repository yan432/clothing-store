'use client'
import { useRef, useEffect, useState } from 'react'

function normaliseFaqHtml(html) {
  if (!html || !html.includes('<div class="faq-item">')) return html
  return html.replace(
    /<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g,
    (_, q, a) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`
  )
}

// DOMPurify requires a browser DOM — sanitize only on the client
function sanitize(html) {
  if (typeof window === 'undefined') return html
  try {
    // Dynamic require so the module is never evaluated during SSR
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DOMPurify = require('dompurify')
    const purify = DOMPurify.default ?? DOMPurify
    if (typeof purify.sanitize !== 'function') return html
    return purify.sanitize(html, {
      ALLOWED_TAGS: ['details', 'summary', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h3', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    })
  } catch {
    return html
  }
}

export default function FaqAccordion({ html }) {
  const ref = useRef(null)
  const [safe, setSafe] = useState('')

  const processed = normaliseFaqHtml(html)

  // Sanitize on the client after mount so SSR can render the raw HTML safely
  useEffect(() => {
    setSafe(sanitize(processed || ''))
  }, [processed])


  if (!processed) return <p style={{ color: '#aaa', fontSize: 14 }}>No FAQ items yet.</p>

  return (
    <div ref={ref} className="faq-content" dangerouslySetInnerHTML={{ __html: safe || processed }} />
  )
}
