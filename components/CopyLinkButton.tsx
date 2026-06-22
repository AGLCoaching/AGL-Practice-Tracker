'use client'

export default function CopyLinkButton({ url, label = 'Copy Link' }: { url: string; label?: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(url)}
      className="text-xs px-3 py-1.5 rounded border font-medium"
      style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }}
    >
      {label}
    </button>
  )
}
