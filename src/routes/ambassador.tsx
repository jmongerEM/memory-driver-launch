import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/ambassador')({
  component: AmbassadorLayout,
})

function AmbassadorLayout() {
  return <Outlet />
}
