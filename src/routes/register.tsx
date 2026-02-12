import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/register')({
  component: RegisterPlaceholder,
})

function RegisterPlaceholder() {
  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>MD Premier – Registration</h1>
      <p>Registration form will be implemented here.</p>
      <Link to="/">← Back to home</Link>
    </div>
  )
}
