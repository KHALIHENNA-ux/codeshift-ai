import sharp from "sharp"

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0" r="1">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/>
      <stop offset="60%" stop-color="#8b5cf6" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0v48" fill="none" stroke="#1e2637" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="#05070f"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- logo mark -->
  <rect x="80" y="88" width="88" height="88" rx="20" fill="#0b101e" stroke="url(#brand)" stroke-width="2"/>
  <path d="M116 112 l-16 20 16 20 M132 112 l16 20 -16 20"
        stroke="url(#brand)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

  <text x="80" y="300" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="84" fill="#f4f6fb">Turn legacy code into</text>
  <text x="80" y="400" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="84" fill="url(#brand)">modern, shippable apps.</text>

  <text x="80" y="472" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#8a93a8">PHP → Laravel · jQuery → React · WordPress → Next.js · Python 2 → 3</text>

  <text x="80" y="556" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="34" fill="#f4f6fb">CodeShift</text>
  <text x="248" y="556" font-family="Segoe UI, Arial, sans-serif" font-size="30" fill="#8a93a8">— The AI Code Modernization Engine · codeshift.vip</text>
</svg>`

await sharp(Buffer.from(svg)).png().toFile("public/og.png")
console.log("og.png written")
