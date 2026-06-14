import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const IMAGE_PATH = '/home/z/my-project/upload/pasted_image_1781267302452.png';

async function main() {
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;

  const zai = await ZAI.create();

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe this GitHub screenshot in detail. What page is this? What alerts, buttons, options, text are visible?' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ],
    thinking: { type: 'disabled' }
  });

  console.log(JSON.stringify(response, null, 2));
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
