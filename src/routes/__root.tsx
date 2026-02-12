import { createRootRoute, Outlet, HeadContent, Scripts } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <html>
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