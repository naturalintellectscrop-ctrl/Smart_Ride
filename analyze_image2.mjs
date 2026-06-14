import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const IMAGE_PATH = '/home/z/my-project/upload/pasted_image_1781267302452.png';

async function main() {
  console.log('Reading image file...');
  const imageBuffer = fs.readFileSync(IMAGE_PATH);
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Image}`;
  console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

  console.log('Initializing Z-AI SDK...');
  const zai = await ZAI.create();
  
  console.log('Config baseUrl:', zai.config?.baseUrl);

  // Use a longer timeout by patching global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (url, options = {}) => {
    return originalFetch(url, { ...options, signal: AbortSignal.timeout(300000) }); // 5 min timeout
  };

  console.log('Calling vision API with extended timeout...');
  const response = await zai.chat.completions.createVision({
    model: 'qwen2.5-vl-72b-instruct',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this GitHub screenshot in detail. What page is this? What alerts, buttons, text are visible?'
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl
            }
          }
        ]
      }
    ],
    stream: false
  });

  console.log('\n=== VISION API RESPONSE ===\n');
  if (response && response.choices && response.choices[0]) {
    console.log(response.choices[0].message?.content || JSON.stringify(response, null, 2));
  } else {
    console.log(JSON.stringify(response, null, 2));
  }
}

main().catch(err => {
  console.error('Error:', err.message || err);
  if (err.cause) console.error('Cause:', err.cause);
  process.exit(1);
});
