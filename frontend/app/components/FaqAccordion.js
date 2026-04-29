'use client'
import { useRef, useEffect } from 'react'
import DOMPurify from 'dompurify'

function normaliseFaqHtml(html) {
  if (!html || !html.includes('<div class="faq-item">')) return html
  return html.replace(
    /<div class="faq-item"><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/div>/g,
    (_, q, a) => `<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`
  )
}

export default function FaqAccordion({ html }) {
  const ref = useRef(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    function handleToggle(e) {
      if (!e.target.open) return
      // Close every other <details> in the same container
      container.querySelectorAll('details.faq-item').forEach(d => {
        if (d !== e.target) d.open = false
      })
    }

    // 'toggle' doesn't bubble — use capture so it fires on the container
    container.addEventListener('toggle', handleToggle, true)
    return () => container.removeEventListener('toggle', handleToggle, true)
  }, [html])

  const processed = normaliseFaqHtml(html)
  if (!processed) return <p style={{ color: '#aaa', fontSize: 14 }}>No FAQ items yet.</p>

  // Sanitize before rendering to prevent XSS from stored HTML
  const safe = DOMPurify.sanitize(processed, {
    ALLOWED_TAGS: ['details', 'summary', 'p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h3', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  })

  return (
    <div ref={ref} className="faq-content" dangerouslySetInnerHTML={{ __html: safe }} />
  )
}
