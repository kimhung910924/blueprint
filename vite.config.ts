import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import parseHandler from './api/parse';

declare const process: {
  cwd: () => string;
  env: Record<string, string | undefined>;
};

function readRequestBody(req: any) {
  return new Promise<string>((resolve, reject) => {
    const chunks: BlobPart[] = [];
    req.on('data', (chunk: BlobPart) => chunks.push(chunk));
    req.on('end', async () => resolve(await new Blob(chunks).text()));
    req.on('error', reject);
  });
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.ANTHROPIC_API_KEY ||= env.ANTHROPIC_API_KEY;

  return {
    plugins: [
      react(),
      {
        name: 'blueprint-local-api',
        configureServer(server) {
          server.middlewares.use('/api/parse', async (req: any, res: any) => {
            const body = await readRequestBody(req);
            const response = await parseHandler(
              new Request('http://localhost/api/parse', {
                method: req.method,
                headers: req.headers,
                body: body || undefined,
              }),
            );

            res.statusCode = response.status;
            response.headers.forEach((value, key) => res.setHeader(key, value));
            res.end(await response.text());
          });
        },
      },
    ],
  };
});
