import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/mdlaunch/',
  plugins: [
    tsconfigPaths(),
    tanstackStart({
      client: {
        entry: 'entry-client',
      },
      server: {
        entry: 'entry-server',
      },
      router: {
        routesDirectory: 'routes',
        generatedRouteTree: 'routeTree.gen.ts',
      },
    }),
    nitro({
      preset: 'aws-lambda',
      awsLambda: { streaming: true },
    }),
  ],
});
