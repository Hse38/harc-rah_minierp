const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const publicDir = path.join(__dirname, "..", "public");
const svgPath = path.join(publicDir, "icon.svg");

if (!fs.existsSync(svgPath)) {
  console.error("public/icon.svg not found");
  process.exit(1);
}

const sizes = [192, 72];

async function run() {
  const svg = fs.readFileSync(svgPath);
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(publicDir, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
