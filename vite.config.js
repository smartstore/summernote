import { defineConfig } from 'vite';
import externalGlobals from 'rollup-plugin-external-globals';
import banner from 'vite-plugin-banner';
import { readFileSync } from 'fs';
import vitePostCSSSourceMap from './scripts/vite-plugins/vitePostCSSSourceMap.mjs';


const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const version = pkg.version;
const date = (new Date()).toISOString().replace(/:\d+\.\d+Z$/, 'Z');
const banners = {
  'default': `
Super simple WYSIWYG editor v${version}
https://summernote.org

Copyright 2013- Hackerwins and contributors
Summernote may be freely distributed under the MIT license.

Date: ${date}
`,
  'minimal': `Summernote v${version} | (c) 2013- Hackerwins and contributors | MIT license`,
};

const styles = [
  'sm',
  'lite',
  'bs3', 'bs4', 'bs5',
];
const defaultStyle = 'sm';

let configs = {};
for (const style of styles.slice(0, 1)) {
  configs[style] = defineConfig({
    // prevent to build twice while calling `build` function manually
    configFile: false,

    resolve: {
      alias: {
        '@': '/src',
      },
    },

    plugins: [
      externalGlobals({
        jquery: '$',
        underscore: '_'
      }),
      banner((fileName) => {
        if (fileName.endsWith('.min.js')) return banners['minimal'];
        if (fileName.endsWith('.js')) return banners['default'];
      }),
      vitePostCSSSourceMap(),
    ],

    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern',
        },
      },
    },

    build: {
      sourcemap: true,
      minify: true,

      lib: {
        entry: `./src/styles/${style}/summernote-${style}.js`,
        name: 'summernote',
        formats: ['iife'],
        fileName: (format, entryName) => `${entryName}.js`,
      },

      rollupOptions: {
        external: (id) => {
          const lid = id.toLowerCase();
          if (
            lid.includes('jquery') || 
            lid.includes('codemirror') || 
            //lid.includes('popper') || 
            //lid.includes('underscore') || 
            //lid.includes('bootstrap') ||
            //lid.includes('globalinit') ||
            id.startsWith('./font/')) {
            // Do not bundle some external libs like jQuery, CodeMirror etc.
            return true;
          }
          // if (id === 'jquery') return true; // do not bundle jQuery
          // if (id === 'underscore') return true; // do not bundle underscore
          // if (id.includes('codemirror')) return true; // do not bundle CodeMirror
          // if (id.startsWith('./font/')) return true; // do not bundle font files
          return false;
        },

        output: {
          assetFileNames: `summernote-${style}.[ext]`,
          globals: {
            jquery: 'jQuery',
          },
        },
      },
    },
  });
}

export default configs[defaultStyle];
export {
  configs,
  banners,
  version,
};
