import { defineConfig } from 'vite';
import externalGlobals from 'rollup-plugin-external-globals';

const config = defineConfig({
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  plugins: [
      externalGlobals({
        jquery: '$'
      }),
  ],

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
      },
    },
  },

  build: {

    rollupOptions: {
      input: {
        //main: './index.html',
        main: './examples/summernote-sm.html'
      },
      output: {
        entryFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        chunkFileNames: `[name].js`,
        external: ['jquery', 'underscore'],
      },

    },
  },
});

export default config;