import { createRootRoute, Outlet, HeadContent, Scripts, Link } from '@tanstack/react-router'
import './index.css'

function NotFoundComponent() {
  return (
    <div className="not-found-page" role="document">
      <h1>Page not found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link to="/">Return to home</Link>
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