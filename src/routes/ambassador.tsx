import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/ambassador')({
  component: AmbassadorPlaceholder,
})

function AmbassadorPlaceholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Ambassador Program</h1>
      <p>Ambassador sign-up form will be implemented here.</p>
      <Link to="/">← Back to home</Link>
    </div>
  )
}
