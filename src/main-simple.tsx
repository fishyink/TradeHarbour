import ReactDOM from 'react-dom/client'

function SimpleApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Trading Dashboard</h1>
      <p>The People's Dashboard – Bringing the Daviddtech community together</p>
      <p>React is working! ✅</p>
    </div>
  )
}

console.log('main-simple.tsx loaded')
console.log('Looking for root element:', document.getElementById('root'))

try {
  const root = document.getElementById('root')
  if (root) {
    console.log('Root element found, creating React root')
    ReactDOM.createRoot(root).render(<SimpleApp />)
    console.log('React app rendered successfully')
  } else {
    console.error('Root element not found!')
  }
} catch (error) {
  console.error('Error rendering React app:', error)
}