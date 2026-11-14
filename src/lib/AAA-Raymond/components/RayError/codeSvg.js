import { layoutText } from '../OutrunLogo/glyphs.js';

/**
 * The error page's big status code ("404") as an SVG string, in the same chrome block letters as the site logo
 * (OutrunLogo/logo.js) but without the subtitle line. Its own ids (rre-*) so it can sit on a page with the logo.
 */
export function codeSvg(code) {
    const text = String(code ?? '').replace(/[^0-9]/g, '') || '0';
    const pad = 22;
    const skew = 18; // horizontal room the italic slant needs (tan(10deg) * 100)
    const depth = { x: 6, y: 7 };

    const main = layoutText(text, 16);
    const width = Math.ceil(main.width + skew + depth.x + pad * 2);
    const height = Math.ceil(100 + depth.y + pad * 2);
    const left = pad + skew;
    const top = pad;
    const d = main.paths.join('');
    const y = (f) => top + 100 * f;

    return `<svg class="rr-errCodeSvg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Error ${text}">
  <defs>
    <linearGradient id="rre-chrome" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
      <stop offset="0" stop-color="#effaff"/>
      <stop offset="0.36" stop-color="#7cc8ff"/>
      <stop offset="0.48" stop-color="#e4f5ff"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="0.505" stop-color="#2a0846"/>
      <stop offset="0.66" stop-color="#9b2fcf"/>
      <stop offset="0.84" stop-color="#ff5c9e"/>
      <stop offset="1" stop-color="#ffd6ea"/>
    </linearGradient>
    <mask id="rre-slits" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#fff"/>
      <rect y="${y(0.64)}" width="${width}" height="2" fill="#000"/>
      <rect y="${y(0.74)}" width="${width}" height="3" fill="#000"/>
      <rect y="${y(0.85)}" width="${width}" height="4" fill="#000"/>
    </mask>
    <filter id="rre-glow" x="-15%" y="-40%" width="130%" height="180%">
      <feMorphology operator="dilate" radius="3" in="SourceAlpha" result="grown"/>
      <feGaussianBlur in="grown" stdDeviation="7" result="blur"/>
      <feFlood flood-color="#ff2a6d" flood-opacity="0.9"/>
      <feComposite in2="blur" operator="in"/>
    </filter>
  </defs>
  <g transform="translate(${left} ${top}) skewX(-10)">
    <g filter="url(#rre-glow)"><path d="${d}" fill="#000" fill-rule="evenodd"/></g>
    <path d="${d}" transform="translate(${depth.x} ${depth.y})" fill="#12002b" fill-rule="evenodd" stroke="#12002b" stroke-width="6" stroke-linejoin="miter"/>
    <path d="${d}" fill="none" stroke="#1b0636" stroke-width="6" stroke-linejoin="miter"/>
  </g>
  <g mask="url(#rre-slits)">
    <g transform="translate(${left} ${top}) skewX(-10)">
      <path d="${d}" fill="url(#rre-chrome)" fill-rule="evenodd"/>
    </g>
  </g>
</svg>`;
}
