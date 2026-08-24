/**
 * One-time dev tool: renders each source .glb in assets/3d-source/ to a
 * 36-frame WebP turntable sequence in public/turntable/<name>/. Not part
 * of the deployed app - run manually after a source model changes.
 *
 * Requires a local Chrome/Edge install (path override via CHROME_PATH)
 * and puppeteer-core + sharp as devDependencies.
 *
 * Usage: node scripts/render-model-frames.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer-core');
const sharp = require('sharp');

const FRAME_COUNT = 36;
const WIDTH = 480;
const HEIGHT = 360;
const SOURCE_DIR = path.resolve(__dirname, '../assets/3d-source');
const OUTPUT_DIR = path.resolve(__dirname, '../public/turntable');
const MODEL_VIEWER_CDN = 'https://unpkg.com/@google/model-viewer@4.3.1/dist/model-viewer.min.js';

const MODELS = [
  { name: 'boda', file: '3d-boda.glb' },
  { name: 'car', file: '3d-car-icon.glb' },
];

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('No Chrome/Edge found. Set CHROME_PATH env var to a browser executable.');
  }
  return found;
}

function startStaticServer(dir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        const ext = path.extname(filePath);
        const type = ext === '.html' ? 'text/html' : ext === '.glb' ? 'model/gltf-binary' : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function harnessHtml(glbFilename) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<script type="module" src="${MODEL_VIEWER_CDN}"></script>
<style>
  html,body{margin:0;background:transparent;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;}
  model-viewer{width:${WIDTH}px;height:${HEIGHT}px;--poster-color:transparent;}
</style></head>
<body>
  <model-viewer id="mv" src="${glbFilename}" camera-orbit="0deg 70deg 105%" shadow-intensity="1" exposure="0.9" disable-zoom interaction-prompt="none"></model-viewer>
</body></html>`;
}

async function renderModel(browser, serverPort, model) {
  const outDir = path.join(OUTPUT_DIR, model.name);
  fs.mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

  await page.goto(`http://127.0.0.1:${serverPort}/${model.name}.html`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });
  await page.waitForFunction(
    () => {
      const mv = document.getElementById('mv');
      return mv && mv.loaded === true;
    },
    { timeout: 30000 },
  );

  for (let i = 0; i < FRAME_COUNT; i++) {
    const angle = Math.round((360 / FRAME_COUNT) * i);
    await page.evaluate((deg) => {
      const mv = document.getElementById('mv');
      mv.cameraOrbit = `${deg}deg 70deg 105%`;
      mv.jumpCameraToGoal();
    }, angle);
    // let the camera settle and a frame render
    await new Promise((r) => setTimeout(r, 120));

    const pngBuffer = await page.screenshot({ omitBackground: true });
    const outPath = path.join(outDir, `frame-${String(i).padStart(2, '0')}.webp`);
    await sharp(pngBuffer).resize(WIDTH, HEIGHT).webp({ quality: 72 }).toFile(outPath);
    process.stdout.write(`  ${model.name} frame ${i + 1}/${FRAME_COUNT}\r`);
  }
  console.log(`  ${model.name}: ${FRAME_COUNT} frames written to ${outDir}`);
  await page.close();
}

(async () => {
  console.log('Starting local static server for source models...');
  const htmlDir = path.join(require('os').tmpdir(), 'smartride-render-harness');
  fs.mkdirSync(htmlDir, { recursive: true });

  for (const model of MODELS) {
    fs.copyFileSync(path.join(SOURCE_DIR, model.file), path.join(htmlDir, model.file));
    fs.writeFileSync(path.join(htmlDir, `${model.name}.html`), harnessHtml(model.file));
  }

  const server = await startStaticServer(htmlDir);
  const port = server.address().port;
  console.log(`Static server on 127.0.0.1:${port}`);

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  try {
    for (const model of MODELS) {
      console.log(`Rendering ${model.name}...`);
      await renderModel(browser, port, model);
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(htmlDir, { recursive: true, force: true });
  }

  console.log('Done.');
})().catch((err) => {
  console.error('Render failed:', err);
  process.exit(1);
});
