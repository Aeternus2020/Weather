import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function getManualChunk(id: string): string | undefined {
    if (!id.includes('node_modules')) {
        return
    }

    if (id.includes('@nivo/')) {
        return 'nivo-vendor'
    }

    if (id.includes('firebase/')) {
        return 'firebase-vendor'
    }

    if (id.includes('@mui/') || id.includes('@emotion/')) {
        return 'mui-vendor'
    }

    if (
        id.includes('/react/')
        || id.includes('react-dom')
        || id.includes('react-router-dom')
        || id.includes('@tanstack/react-query')
        || id.includes('dayjs')
    ) {
        return 'app-vendor'
    }
}

function googleSiteVerificationPlugin(verificationToken?: string): Plugin {
    return {
        name: 'google-site-verification',
        transformIndexHtml(html) {
            if (verificationToken == null || verificationToken.length === 0) {
                return html
            }

            return {
                html,
                tags: [
                    {
                        tag: 'meta',
                        attrs: {
                            name: 'google-site-verification',
                            content: verificationToken,
                        },
                        injectTo: 'head',
                    },
                ],
            }
        },
    }
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_')

    return {
        plugins: [
            react(),
            googleSiteVerificationPlugin(env.VITE_GOOGLE_SITE_VERIFICATION?.trim()),
        ],
        resolve: {
            alias: {
                '@routes':     path.resolve(__dirname, 'src/routes'),
            },
        },
        build: {
            outDir: 'dist',
            rollupOptions: {
                input: {
                    main:   path.resolve(__dirname, 'index.html'),
                    london: path.resolve(__dirname, 'london/index.html'),
                    ny:     path.resolve(__dirname, 'ny/index.html'),
                    notFound: path.resolve(__dirname, '404.html'),
                },
                output: {
                    manualChunks: getManualChunk,
                },
            },
        },
    }
});
