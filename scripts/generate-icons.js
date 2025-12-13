const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Source logo (transparent PNG). Update if your source has a different name.
const SRC = path.join(__dirname, '..', 'assets', 'images', 'Pyraxis (1).png');
const OUT_DIR = path.join(__dirname, '..', 'assets', 'images');

if (!fs.existsSync(SRC)) {
  console.error('Source logo not found:', SRC);
  process.exit(1);
}

const sizes = [1024, 512, 384, 192, 144, 96, 72, 48, 36, 24];

async function createIcon(size, outName, scale = 0.8) {
  const canvasSize = size;
  const logoSize = Math.round(canvasSize * scale);

  // Create a transparent canvas
  const canvas = {
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  };

  const logoBuffer = await sharp(SRC).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer();

  const outPath = path.join(OUT_DIR, outName);
  await sharp(canvas)
    .composite([
      { input: logoBuffer, gravity: 'centre' }
    ])
    .png()
    .toFile(outPath);

  console.log('Created', outPath);
}

(async () => {
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    // Common app icons (these are full-canvas icons where logo sits at 80% of canvas)
    for (const size of sizes) {
      await createIcon(size, `app-icon-${size}.png`, 0.8);
    }

    // Adaptive foreground images: same but kept as foreground assets (transparent background)
    for (const size of sizes) {
      await createIcon(size, `app-icon-foreground-${size}.png`, 0.8);
    }

    // Favicon 256
    await createIcon(256, 'favicon-256.png', 0.7);

    // Splash logo (1024 canvas, logo slightly smaller so it's not edge-to-edge)
    await createIcon(1024, 'splash-logo-1024.png', 0.6);

    // Create a single 1024 icon for app.json's `icon` reference (already created above as app-icon-1024)

    console.log('All icons generated.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
