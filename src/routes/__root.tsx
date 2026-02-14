import { createRootRoute, Outlet, HeadContent, Scripts, Link } from '@tanstack/react-router'

function NotFoundComponent() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#091F38', margin: '0 0 1rem' }}>Page not found</h1>
      <p style={{ fontSize: '1rem', color: '#3d5a6c', margin: '0 0 1.5rem' }}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" style={{ fontSize: '1rem', color: '#091F38', textDecoration: 'underline' }}>Return to home</Link>
    </div>
  )
}

const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL != null ? import.meta.env.BASE_URL : '/'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  head: () => ({
    meta: [
      { title: 'Memory Driver Launch' },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: `${baseUrl.replace(/\/?$/, '/')}logo.svg` },
    ],
  }),
})

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Everything inside here is your global layout */}
        <Outlet /> 
        <Scripts />
      </body>
    </html>
  )
}