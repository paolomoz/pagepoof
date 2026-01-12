/**
 * Imagen 3 AI Client
 * Generates images using Google Vertex AI Imagen 3
 *
 * Ported from: ../materialised-web/workers/generative-cerebras/src/ai-clients/imagen.ts
 */

export interface ImagenEnv {
  GOOGLE_SERVICE_ACCOUNT_JSON: string;
  VERTEX_PROJECT_ID: string;
  VERTEX_LOCATION: string;
  IMAGES: R2Bucket;
  baseUrl?: string; // Base URL for serving images (e.g., https://pagepoof-api.workers.dev)
}

export interface ImageRequest {
  id: string;
  prompt: string;
  size: 'hero' | 'card' | 'column' | 'thumbnail';
  slug: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  size: string;
  prompt: string;
  success: boolean;
}

// Size configurations with aspect ratios
const SIZE_CONFIG = {
  hero: { width: 2000, height: 800, aspectRatio: '16:9' },
  card: { width: 750, height: 562, aspectRatio: '4:3' },
  column: { width: 600, height: 400, aspectRatio: '3:2' },
  thumbnail: { width: 300, height: 225, aspectRatio: '4:3' },
};

// Fallback images from Unsplash (high-quality food/kitchen photography)
const FALLBACK_IMAGES = {
  hero: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=2000&h=800&fit=crop',
    'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=2000&h=800&fit=crop',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=2000&h=800&fit=crop',
  ],
  card: [
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=750&h=562&fit=crop',
    'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=750&h=562&fit=crop',
    'https://images.unsplash.com/photo-1589733955941-5eeaf752f6dd?w=750&h=562&fit=crop',
  ],
  column: [
    'https://images.unsplash.com/photo-1638439430466-b2bb7fdc1d67?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?w=600&h=400&fit=crop',
  ],
  thumbnail: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=225&fit=crop',
  ],
};

// Token cache
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Generate an image using Imagen 3
 */
export async function generateImage(
  request: ImageRequest,
  env: ImagenEnv
): Promise<GeneratedImage> {
  try {
    const accessToken = await getAccessToken(env);
    const config = SIZE_CONFIG[request.size];
    const fullPrompt = buildFullPrompt(request.prompt, request.size);

    const response = await fetch(
      `https://${env.VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${env.VERTEX_PROJECT_ID}/locations/${env.VERTEX_LOCATION}/publishers/google/models/imagen-3.0-generate-001:predict`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: fullPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: config.aspectRatio,
            safetyFilterLevel: 'block_only_high',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Imagen API error:', error);
      return getFallbackImage(request);
    }

    const data = await response.json() as {
      predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>;
    };

    if (!data.predictions?.[0]?.bytesBase64Encoded) {
      console.error('No image in Imagen response');
      return getFallbackImage(request);
    }

    // Decode base64 image
    const imageData = data.predictions[0].bytesBase64Encoded;
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

    // Store in R2
    const imagePath = `${request.slug}/${request.id}.png`;
    await env.IMAGES.put(imagePath, imageBytes, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Build URL (absolute if baseUrl provided, else relative)
    const imageUrl = env.baseUrl
      ? `${env.baseUrl}/images/${imagePath}`
      : `/images/${imagePath}`;

    return {
      id: request.id,
      url: imageUrl,
      size: request.size,
      prompt: request.prompt,
      success: true,
    };
  } catch (error) {
    console.error('Image generation error:', error);
    return getFallbackImage(request);
  }
}

/**
 * Generate multiple images in parallel with concurrency limit
 */
export async function generateImages(
  requests: ImageRequest[],
  env: ImagenEnv,
  concurrencyLimit = 3
): Promise<GeneratedImage[]> {
  const results: GeneratedImage[] = [];

  for (let i = 0; i < requests.length; i += concurrencyLimit) {
    const batch = requests.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(req => generateImage(req, env))
    );
    results.push(...batchResults);
  }

  // Apply sibling fallback for failed images
  const successfulBySize = new Map<string, GeneratedImage[]>();
  for (const img of results) {
    if (img.success) {
      const list = successfulBySize.get(img.size) || [];
      list.push(img);
      successfulBySize.set(img.size, list);
    }
  }

  // Replace failed images with successful siblings or fallbacks
  return results.map(img => {
    if (img.success) return img;

    const siblings = successfulBySize.get(img.size);
    if (siblings && siblings.length > 0) {
      const sibling = siblings[Math.floor(Math.random() * siblings.length)];
      return { ...img, url: sibling.url };
    }

    return img;
  });
}

/**
 * Get access token for Vertex AI (with caching)
 */
async function getAccessToken(env: ImagenEnv): Promise<string> {
  // Check cache (with 60s buffer)
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60000) {
    return cachedAccessToken.token;
  }

  const serviceAccount = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);

  // Create JWT payload
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  // Create JWT
  const jwt = await createJWT(payload, serviceAccount.private_key);

  // Exchange for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token error: ${response.status}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };

  // Cache token
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Create JWT for service account auth
 */
async function createJWT(
  payload: Record<string, unknown>,
  privateKey: string
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Parse PEM private key
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  // Import key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${signingInput}.${encodedSignature}`;
}

/**
 * Base64url encode
 */
function base64urlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Build full prompt with style guidance
 */
function buildFullPrompt(basePrompt: string, size: 'hero' | 'card' | 'column' | 'thumbnail'): string {
  const contentType = detectContentType(basePrompt);
  const sizeStyle = getSizeStyle(size);
  const contentStyle = getContentStyle(contentType);

  return `${basePrompt}

${sizeStyle}

${contentStyle}

Style: Professional food photography, natural lighting, shallow depth of field, high-end kitchen setting.
Quality: 4K resolution, photorealistic, vibrant colors, crisp details.
Avoid: Text, logos, watermarks, people's faces, brand names.`;
}

/**
 * Detect content type from prompt
 */
function detectContentType(prompt: string): 'smoothie' | 'soup' | 'recipe' | 'product' | 'lifestyle' {
  const lower = prompt.toLowerCase();

  if (/smoothie|shake|blend|fruit|berry|green/.test(lower)) return 'smoothie';
  if (/soup|hot|warm|steaming|broth/.test(lower)) return 'soup';
  if (/recipe|dish|food|meal|cook/.test(lower)) return 'recipe';
  if (/blender|product|vitamix|machine|appliance/.test(lower)) return 'product';
  return 'lifestyle';
}

/**
 * Get size-specific style guidance
 */
function getSizeStyle(size: 'hero' | 'card' | 'column' | 'thumbnail'): string {
  switch (size) {
    case 'hero':
      return 'Composition: Wide cinematic shot, horizontal layout, dramatic lighting, plenty of negative space on left for text overlay.';
    case 'card':
      return 'Composition: Centered subject, clean background, eye-level angle, appetizing presentation.';
    case 'column':
      return 'Composition: Tight crop, detail-focused, artistic angle, ingredient highlight.';
    case 'thumbnail':
      return 'Composition: Simple, recognizable, high contrast, single focal point.';
  }
}

/**
 * Get content-specific style guidance
 */
function getContentStyle(contentType: 'smoothie' | 'soup' | 'recipe' | 'product' | 'lifestyle'): string {
  switch (contentType) {
    case 'smoothie':
      return 'Subject: Vibrant smoothie in glass with fresh ingredients around it. Condensation on glass, garnish on top. Bright, energetic mood.';
    case 'soup':
      return 'Subject: Steaming bowl of soup with visible steam, garnished herbs. Warm, cozy lighting. Crusty bread or spoon as props.';
    case 'recipe':
      return 'Subject: Beautifully plated dish with fresh ingredients. Garnishes and texture visible. Professional food styling.';
    case 'product':
      return 'Subject: Vitamix blender as hero product, clean modern kitchen background. Subtle reflections, premium feel.';
    case 'lifestyle':
      return 'Subject: Modern kitchen scene with Vitamix blender. Fresh ingredients, warm morning light, healthy living vibe.';
  }
}

/**
 * Get consistent fallback image based on request ID
 */
function getFallbackImage(request: ImageRequest): GeneratedImage {
  const fallbacks = FALLBACK_IMAGES[request.size];

  // Use hash for consistent selection
  let hash = 0;
  for (let i = 0; i < request.id.length; i++) {
    hash = ((hash << 5) - hash) + request.id.charCodeAt(i);
  }

  const index = Math.abs(hash) % fallbacks.length;

  return {
    id: request.id,
    url: fallbacks[index],
    size: request.size,
    prompt: request.prompt,
    success: false,
  };
}

/**
 * Extract image requests from rendered blocks
 */
export function extractImageRequests(
  html: string,
  slug: string
): ImageRequest[] {
  const requests: ImageRequest[] = [];
  const imgRegex = /<img[^>]+data-image-hint="([^"]+)"[^>]*>/g;

  let match;
  let index = 0;

  while ((match = imgRegex.exec(html)) !== null) {
    const hint = match[1];
    const isHero = match[0].includes('placeholder-hero');
    const size: ImageRequest['size'] = isHero ? 'hero' : 'card';

    requests.push({
      id: `img-${index++}`,
      prompt: hint,
      size,
      slug,
    });
  }

  return requests;
}
