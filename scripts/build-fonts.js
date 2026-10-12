import { webfont } from 'webfont';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Preserve existing codepoints when glyphs are added or renamed.
const codepoints = JSON.parse(fs.readFileSync('src/font/codepoints.json', 'utf8'));
const webfontConfig = {
  files: 'src/font/icons/*.svg',
  dest: 'public/font/',
  formats: ['ttf', 'eot', 'woff', 'woff2'],
  fontName: 'summernote',
  template: 'src/font/template.scss',
  destTemplate: 'src/styles/summernote/font.scss',
  templateFontName: 'summernote',
  templateClassName: 'note-icon',
  templateFontPath: './font/',
  metadataProvider: (file, callback) => {
    const name = path.basename(file, '.svg');
    const codepoint = codepoints[name];
    if (!Number.isInteger(codepoint)) {
      callback(new Error('Missing codepoint for icon: ' + name));
      return;
    }
    callback(null, { name, unicode: [String.fromCodePoint(codepoint)] });
  },
  fixedWidth: false,
  normalize: true,
};

// eslint-disable-next-line
console.log('Building fonts...');

webfont(webfontConfig).then(result => {
  Object.keys(result).map(type => {
    if (
      type === 'config' ||
      type === 'usedBuildInTemplate' ||
      type === 'glyphsData'
    ) {
      return;
    }

    let content = result[type];
    if (type === 'template') {
      const version = createHash('sha256').update(result.woff2).digest('hex').slice(0, 12);
      content = content.replace(/summernote\.(eot|woff2?|ttf)(\?#iefix)?/g,
        (_, format, fragment) => 'summernote.' + format + '?v=' + version + (fragment ? '#iefix' : ''));
    }
    let file = null;

    if (type !== 'template') {
      file = path.resolve(path.join(webfontConfig['dest'], webfontConfig['fontName'] + '.' + type));
    } else {
      file = path.resolve(webfontConfig['destTemplate']);
    }
    // eslint-disable-next-line
    console.log('Writing ', file);

    fs.writeFileSync(file, content);
    if (type !== 'template') {
      for (const directory of ['src/styles/summernote/font', 'src/font']) {
        const target = path.join(directory, webfontConfig.fontName + '.' + type);
        if (fs.existsSync(target)) {
          fs.writeFileSync(target, content);
        }
      }
    }
  });
}).catch(error => {
  // eslint-disable-next-line
  console.log(error);
  throw error;
});
