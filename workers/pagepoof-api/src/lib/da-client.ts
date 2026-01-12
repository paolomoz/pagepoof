/**
 * DA (Document Authoring) API Client
 *
 * Handles creating and publishing pages in AEM's Document Authoring system.
 */

import { getDAToken, clearCachedToken, type DATokenEnv } from './da-token-service';

export interface DAEnv extends DATokenEnv {
  DA_ORG: string;
  DA_REPO: string;
}

export class DAClient {
  private baseUrl = 'https://admin.da.live';
  private org: string;
  private repo: string;
  private env: DAEnv;

  constructor(env: DAEnv) {
    this.org = env.DA_ORG;
    this.repo = env.DA_REPO;
    this.env = env;
  }

  private async getToken(): Promise<string> {
    return getDAToken(this.env);
  }

  /**
   * Create a new page with HTML content
   */
  async createPage(path: string, htmlContent: string): Promise<{ success: boolean; error?: string }> {
    const url = `${this.baseUrl}/source/${this.org}/${this.repo}${path}.html`;
    console.log(`[DAClient] Creating page at: ${url}`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const token = await this.getToken();

        const formData = new FormData();
        formData.append('data', new Blob([htmlContent], { type: 'text/html' }), 'index.html');

        const response = await fetch(url, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        const responseText = await response.text();
        console.log(`[DAClient] Response: ${response.status}`);

        if (response.status === 401 && attempt === 0) {
          clearCachedToken();
          continue;
        }

        if (!response.ok) {
          return { success: false, error: `Failed: ${response.status} - ${responseText}` };
        }

        return { success: true };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    return { success: false, error: 'Failed after retry' };
  }
}

export class AEMAdminClient {
  private baseUrl = 'https://admin.hlx.page';
  private org: string;
  private site: string;
  private ref: string;
  private env: DAEnv;

  constructor(env: DAEnv, ref: string = 'main') {
    this.org = env.DA_ORG;
    this.site = env.DA_REPO;
    this.ref = ref;
    this.env = env;
  }

  private async getToken(): Promise<string> {
    return getDAToken(this.env);
  }

  /**
   * Trigger preview for a path
   */
  async preview(path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const endpoint = `/preview/${this.org}/${this.site}/${this.ref}${path}`;
    console.log(`[AEMAdmin] Preview: ${this.baseUrl}${endpoint}`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const token = await this.getToken();
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        const responseText = await response.text();
        console.log(`[AEMAdmin] Preview response: ${response.status}`);

        if (response.status === 401 && attempt === 0) {
          clearCachedToken();
          continue;
        }

        if (!response.ok) {
          return { success: false, error: `Preview failed: ${response.status} - ${responseText}` };
        }

        return {
          success: true,
          url: `https://${this.ref}--${this.site}--${this.org}.aem.page${path}`,
        };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    return { success: false, error: 'Failed after retry' };
  }

  /**
   * Publish to live
   */
  async publish(path: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const endpoint = `/live/${this.org}/${this.site}/${this.ref}${path}`;
    console.log(`[AEMAdmin] Publish: ${this.baseUrl}${endpoint}`);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const token = await this.getToken();
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        const responseText = await response.text();
        console.log(`[AEMAdmin] Publish response: ${response.status}`);

        if (response.status === 401 && attempt === 0) {
          clearCachedToken();
          continue;
        }

        if (!response.ok) {
          return { success: false, error: `Publish failed: ${response.status} - ${responseText}` };
        }

        return {
          success: true,
          url: `https://${this.ref}--${this.site}--${this.org}.aem.live${path}`,
        };
      } catch (error) {
        return { success: false, error: (error as Error).message };
      }
    }

    return { success: false, error: 'Failed after retry' };
  }

  /**
   * Purge CDN cache
   */
  async purgeCache(path: string): Promise<boolean> {
    try {
      const token = await this.getToken();
      const response = await fetch(`${this.baseUrl}/cache/${this.org}/${this.site}/${this.ref}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Build HTML page from blocks for DA persistence
 */
export function buildDAPageHtml(
  title: string,
  description: string,
  blocks: Array<{ html: string; sectionStyle?: string }>
): string {
  const sectionsHtml = blocks
    .map((block) => {
      let sectionContent = block.html;

      if (block.sectionStyle && block.sectionStyle !== 'default') {
        sectionContent += `
      <div class="section-metadata">
        <div>
          <div>style</div>
          <div>${escapeHtml(block.sectionStyle)}</div>
        </div>
      </div>`;
      }

      return `    <div>\n${sectionContent}\n    </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
</head>
<body>
  <header></header>
  <main>
${sectionsHtml}
  </main>
  <footer></footer>
</body>
</html>`;
}

/**
 * Complete persist and publish flow
 */
export async function persistAndPublish(
  path: string,
  html: string,
  env: DAEnv
): Promise<{ success: boolean; urls?: { preview: string; live: string }; error?: string }> {
  const daClient = new DAClient(env);
  const adminClient = new AEMAdminClient(env);

  try {
    // 1. Create page in DA
    const createResult = await daClient.createPage(path, html);
    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }

    // 2. Trigger preview
    const previewResult = await adminClient.preview(path);
    if (!previewResult.success) {
      return { success: false, error: previewResult.error };
    }

    // 3. Publish to live
    const publishResult = await adminClient.publish(path);
    if (!publishResult.success) {
      return { success: false, error: publishResult.error };
    }

    // 4. Purge cache
    await adminClient.purgeCache(path);

    return {
      success: true,
      urls: {
        preview: previewResult.url!,
        live: publishResult.url!,
      },
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
