import { layoutText } from './glyphs.js';

/**
 * Build the outrun logo as an SVG string: a chrome title word with a neon subtitle line under it.
 * Pure function so the same markup is used on the site and in previews.
 */
export function logoSvg({ title = 'DYNASTY', subtitle = 'LEAGUE · IDP SF' } = {}) {
    const pad = 18;
    const skew = 18; // horizontal room the italic slant needs (tan(10deg) * 100)
    const depth = { x: 5, y: 6 };

    const main = layoutText(title);
    const subScale = 0.3;
    const sub = layoutText(subtitle, 26);
    const subWidth = sub.width * subScale;

    const width = Math.ceil(main.width + skew + depth.x + pad * 2);
    const titleTop = pad;
    const subTop = titleTop + 100 + 22;
    const height = Math.ceil(subTop + 100 * subScale + pad);
    const titleLeft = pad + skew;
    const subLeft = (width - subWidth) / 2;
    const ruleY = subTop + 15;

    const titleD = main.paths.join('');
    const subD = sub.paths.join('');
    const y = (f) => titleTop + 100 * f;

    return `<svg class="outrunLogo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} ${subtitle}">
  <defs>
    <!-- measured in the letters' own coordinates: 0 = top of the letters, 100 = bottom -->
    <linearGradient id="orl-chrome" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="100">
      <stop offset="0" stop-color="#effaff"/>
      <stop offset="0.36" stop-color="#7cc8ff"/>
      <stop offset="0.48" stop-color="#e4f5ff"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="0.505" stop-color="#2a0846"/>
      <stop offset="0.66" stop-color="#9b2fcf"/>
      <stop offset="0.84" stop-color="#ff5c9e"/>
      <stop offset="1" stop-color="#ffd6ea"/>
    </linearGradient>
    <linearGradient id="orl-rule-l" x1="0" x2="1">
      <stop offset="0" stop-color="#05d9e8" stop-opacity="0"/>
      <stop offset="1" stop-color="#05d9e8"/>
    </linearGradient>
    <linearGradient id="orl-rule-r" x1="1" x2="0">
      <stop offset="0" stop-color="#05d9e8" stop-opacity="0"/>
      <stop offset="1" stop-color="#05d9e8"/>
    </linearGradient>
    <mask id="orl-slits" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}">
      <rect width="${width}" height="${height}" fill="#fff"/>
      <rect y="${y(0.64)}" width="${width}" height="2" fill="#000"/>
      <rect y="${y(0.74)}" width="${width}" height="3" fill="#000"/>
      <rect y="${y(0.85)}" width="${width}" height="4" fill="#000"/>
    </mask>
    <filter id="orl-glow" x="-10%" y="-40%" width="120%" height="180%">
      <feMorphology operator="dilate" radius="3" in="SourceAlpha" result="grown"/>
      <feGaussianBlur in="grown" stdDeviation="6" result="blur"/>
      <feFlood flood-color="#ff2a6d" flood-opacity="0.85"/>
      <feComposite in2="blur" operator="in"/>
    </filter>
    <filter id="orl-subglow" x="-10%" y="-80%" width="120%" height="260%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur"/>
      <feFlood flood-color="#05d9e8"/>
      <feComposite in2="blur" operator="in"/>
    </filter>
  </defs>
  <g transform="translate(${titleLeft} ${titleTop}) skewX(-10)">
    <g filter="url(#orl-glow)"><path d="${titleD}" fill="#000" fill-rule="evenodd"/></g>
    <path d="${titleD}" transform="translate(${depth.x} ${depth.y})" fill="#12002b" fill-rule="evenodd" stroke="#12002b" stroke-width="6" stroke-linejoin="miter"/>
    <path d="${titleD}" fill="none" stroke="#1b0636" stroke-width="6" stroke-linejoin="miter"/>
  </g>
  <g mask="url(#orl-slits)">
    <g transform="translate(${titleLeft} ${titleTop}) skewX(-10)">
      <path d="${titleD}" fill="url(#orl-chrome)" fill-rule="evenodd"/>
    </g>
  </g>
  <rect x="${pad}" y="${ruleY - 1}" width="${subLeft - 14 - pad}" height="2" fill="url(#orl-rule-l)"/>
  <rect x="${subLeft + subWidth + 14}" y="${ruleY - 1}" width="${subLeft - 14 - pad}" height="2" fill="url(#orl-rule-r)"/>
  <g transform="translate(${subLeft} ${subTop}) scale(${subScale})">
    <path d="${subD}" fill="none" stroke="#1b0636" stroke-width="16" stroke-linejoin="miter"/>
    <path d="${subD}" filter="url(#orl-subglow)" fill="#05d9e8" fill-rule="evenodd"/>
    <path d="${subD}" fill="#c9fdff" fill-rule="evenodd"/>
  </g>
</svg>`;
}
