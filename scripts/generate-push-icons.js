const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');

function createIcon(size) {
  const fontSize = Math.round(size * 0.6);
  const textY = Math.round(size * 0.72);
  const svg = `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1E40AF"/>
  <text x="50%" y="${textY}" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">T</text>
</svg>`;
  return sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(publicDir, `icon-${size}.png`));
}

async function main() {
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  await createIcon(192);
  await createIcon(72);
  console.log('Created public/icon-192.png and public/icon-72.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
