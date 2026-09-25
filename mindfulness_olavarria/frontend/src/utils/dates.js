// El backend guarda fechas en UTC sin zona ("2026-09-25T18:00:00").
// Sin la "Z", el navegador las interpretaría como hora local.
export function parseUtc(value) {
  if (!value) return null
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(value)
  return new Date(hasZone ? value : `${value}Z`)
}

export function formatDateTime(value) {
  const d = parseUtc(value)
  if (!d) return ''
  return d.toLocaleString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
