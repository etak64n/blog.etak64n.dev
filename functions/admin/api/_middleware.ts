/**
 * Runs before every route of the editor's API (/admin/api/*). The API answers 404, as if it did not
 * exist, unless this deployment has the editor's settings (production only) and the request carries
 * a valid Cloudflare Access token for the editor (functions/_lib/access.ts).
 */
import { isEditorToken } from '../../_lib/access.ts';
import { readConfig } from '../../_lib/config.ts';
import { json, notFound, type Handler } from '../../_lib/http.ts';

export const onRequest: Handler = async (context) => {
  const config = readConfig(context.env);
  if (!config) return notFound();
  const token = context.request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return notFound();
  let valid: boolean;
  try {
    valid = await isEditorToken(token, config);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 503);
  }
  if (!valid) return notFound();
  context.data.config = config;
  return context.next();
};
