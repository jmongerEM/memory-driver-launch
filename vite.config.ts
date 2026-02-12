import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nitro } from 'nitro/vite';

export default defineConfig(({ command }) => ({
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      router: {
        routesDirectory: 'routes',
        generatedRouteTree: 'routeTree.gen.ts',
      }
    }),
    // Only use Nitro for production build (aws-lambda). In dev, omitting Nitro lets
    // TanStack Start install its SSR middleware so document requests get server-rendered HTML.
    ...(command === 'build' ? [nitro({ preset: 'aws-lambda' })] : []),
  ],
}));