import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function analyzeDesignImages() {
  const zai = await ZAI.create();
  
  // Read both design images
  const img1 = fs.readFileSync('upload/figma_design_01.jpeg');
  const img2 = fs.readFileSync('upload/WhatsApp Image 2026-03-07 at 3.32.01 PM.jpeg');
  
  const base64Img1 = img1.toString('base64');
  const base64Img2 = img2.toString('base64');
  
  // Analyze the design images for branding elements
  const response = await zai.chat.completions.createVision({
    model: 'glm-4.6v',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze these mobile app design images and extract the branding elements:
            
1. Color scheme (primary, secondary, accent colors - exact hex codes if visible)
2. Typography (font styles, sizes, weights)
3. UI component styles (buttons, cards, navigation bars, input fields)
4. Icon styles
5. Spacing and layout patterns
6. Any gradients or shadows used
7. Overall visual theme (modern, minimalist, etc.)

Be very specific about colors and design patterns. This is for implementing the same branding in a mobile app.`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Img1}` }
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Img2}` }
          }
        ]
      }
    ],
    thinking: { type: 'disabled' }
  });
  
  console.log(response.choices[0]?.message?.content);
}

analyzeDesignImages().catch(console.error);
