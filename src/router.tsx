import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

// RENAME THIS FROM createRouter TO getRouter
export function getRouter() {
  return createTanStackRouter({
    routeTree,
    basepath: '/mdlaunch',
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter> // Update this too
  }
}