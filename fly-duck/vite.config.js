import {defineConfig} from 'vite';
export default defineConfig({base:'./', build:{chunkSizeWarningLimit:1500,rollupOptions:{input:{main:'index.html',compare:'compare.html'}}}});
