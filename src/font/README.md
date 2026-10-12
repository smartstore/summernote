# Editor icon font

The glyph drawings mirror Smartstore's current editor icon assignments. HI strokes
are expanded to filled paths before font generation, including stroke scaling,
rounded caps/joins, dashed insertion blocks and mirrored variants. Contours use
nonzero winding so holes survive SVG-to-font conversion. Glyphs share a 1024-unit
viewBox. The existing Summernote logo remains unchanged; the save glyph is a
monochrome version of the existing save drawing.

`sources.json` records each glyph's source concept and address at conversion time.
These are independent local drawings: building Summernote does not load Smartstore
or require its icon service. Source library licensing continues to apply.

`codepoints.json` preserves the existing note-icon classes and Unicode assignments.
For new glyphs, append an unused codepoint; do not renumber existing entries.
Additional fork slots have their own glyphs rather than sharing unrelated fallbacks.

Run `node scripts/build-fonts.js` to regenerate the font and its Sass declarations.
Run `npm run build` to rebuild both font and editor. Font URLs carry a content hash
so the local demo picks up changed drawings. The SM demo uses `/font/`; other styles
retain the relative font path. Smartstore uses its own SVG adapter and does not
load this icon font.
