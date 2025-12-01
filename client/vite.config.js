import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'url';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        }
    };
});
