/**
 * Document Authoring IMS Token Service
 *
 * Manages authentication for Adobe Document Authoring API using S2S credentials.
 */

export interface DATokenEnv {
  DA_CLIENT_ID?: string;
  DA_CLIENT_SECRET?: string;
  DA_SERVICE_TOKEN?: string;
  DA_TOKEN?: string;
}

// Adobe IMS token endpoint
const IMS_TOKEN_ENDPOINT = 'https://ims-na1.adobelogin.com/ims/token/v3';

// Token cache
interface TokenCache {
  token: string;
  obtainedAt: number;
}

let cachedToken: TokenCache | null = null;

/**
 * Check if service account credentials are configured
 */
function hasServiceAccountConfig(env: DATokenEnv): boolean {
  return !!(env.DA_CLIENT_ID && env.DA_CLIENT_SECRET && env.DA_SERVICE_TOKEN);
}

/**
 * Exchange Adobe IMS credentials for an access token
 */
async function exchangeForAccessToken(
  clientId: string,
  clientSecret: string,
  serviceToken: string
): Promise<string> {
  console.log('[DATokenService] Exchanging IMS credentials for access token...');

  const formParams = new URLSearchParams();
  formParams.append('grant_type', 'authorization_code');
  formParams.append('client_id', clientId);
  formParams.append('client_secret', clientSecret);
  formParams.append('code', serviceToken);

  const response = await fetch(IMS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formParams.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DATokenService] IMS token exchange failed:', response.status, errorText);
    throw new Error(`Failed to exchange IMS credentials: ${response.status}`);
  }

  const tokenData = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!tokenData.access_token) {
    throw new Error('No access token received from IMS');
  }

  console.log('[DATokenService] Successfully obtained access token');
  return tokenData.access_token;
}

/**
 * Get DA authentication token
 */
export async function getDAToken(env: DATokenEnv): Promise<string> {
  // Check cached token
  if (cachedToken) {
    const age = Date.now() - cachedToken.obtainedAt;
    const maxAge = 23 * 60 * 60 * 1000; // 23 hours

    if (age < maxAge) {
      return cachedToken.token;
    }
    cachedToken = null;
  }

  // Try service account
  if (hasServiceAccountConfig(env)) {
    const accessToken = await exchangeForAccessToken(
      env.DA_CLIENT_ID!,
      env.DA_CLIENT_SECRET!,
      env.DA_SERVICE_TOKEN!
    );

    cachedToken = {
      token: accessToken,
      obtainedAt: Date.now(),
    };

    return accessToken;
  }

  // Fallback to direct token
  if (env.DA_TOKEN) {
    return env.DA_TOKEN;
  }

  throw new Error('DA authentication not configured');
}

/**
 * Clear cached token (on 401 errors)
 */
export function clearCachedToken(): void {
  cachedToken = null;
}
