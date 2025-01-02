import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                index: resolve(__dirname, 'index.html'),
                ardoni: resolve(__dirname, 'ardoni.html'),
                magnorite: resolve(__dirname, 'magnorite.html'),
            },
        },
    },
})