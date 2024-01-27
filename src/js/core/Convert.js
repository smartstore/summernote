import $ from 'jquery';

/**
 * Returns bounds from rect
 *
 * - IE Compatibility Issue: http://goo.gl/sRLOAo
 * - Scroll Issue: http://goo.gl/sNjUc
 *
 * @param {Rect} rect
 * @return {Object} bounds
 * @return {Number} bounds.top
 * @return {Number} bounds.left
 * @return {Number} bounds.width
 * @return {Number} bounds.height
 */
function rect2bnd(rect) {
  const $doc = $(document);
  return {
    top: rect.top + $doc.scrollTop(),
    left: rect.left + $doc.scrollLeft(),
    width: rect.right - rect.left,
    height: rect.bottom - rect.top,
  };
}

const rgbaToHexString = (rgba) => {
  // TODO: Implement Convert.rgbaToHexString()
  return rgba;
}

export default {
  rect2bnd,
  rgbaToHexString
};