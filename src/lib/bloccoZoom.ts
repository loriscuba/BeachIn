// Blocca lo zoom in tutte le app (staff, clienti, sito). Il viewport ha già maximum-scale=1 e user-scalable=no,
// ma Safari su iPhone/iPad ignora user-scalable: qui fermo il pizzico (il doppio tocco lo ferma touch-action in index.css).
if (typeof document !== 'undefined') {
  const ferma = (e: Event) => e.preventDefault()
  // Pizzico su Safari iOS
  for (const tipo of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(tipo, ferma, { passive: false })
  // Pizzico con due dita sugli altri browser touch
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault() }, { passive: false })
  // Ctrl + rotellina / pizzico sul trackpad del PC
  document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault() }, { passive: false })
  // Ctrl/Cmd + più, meno, zero
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) e.preventDefault()
  })
}
export {}
