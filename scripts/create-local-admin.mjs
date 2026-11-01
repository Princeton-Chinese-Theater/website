import { createLocalStorage } from './local-storage.mjs';
import { handleApi } from '../worker/api.js';

if (!process.env.AUTH_PASSWORD_PEPPER || process.env.AUTH_PASSWORD_PEPPER.length < 32) {
  throw new Error('Set a local AUTH_PASSWORD_PEPPER of at least 32 random characters in .env.local first. Keep this value unchanged.');
}
const storage = createLocalStorage('.local-data');
const token = crypto.randomUUID() + crypto.randomUUID();
try {
  const response = await handleApi(new Request('http://127.0.0.1:3000/api/auth/bootstrap', {
    method: 'POST', headers: { 'x-bootstrap-token': token },
  }), { ...storage, AUTH_PASSWORD_PEPPER: process.env.AUTH_PASSWORD_PEPPER, ADMIN_BOOTSTRAP_TOKEN: token, PCT_LOCAL_AUTH: true });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  console.log('Local-only administrator activation link (valid for 24 hours):');
  console.log('http://127.0.0.1:3000/admin/activate/#token=' + result.invitationToken);
} finally { storage.close(); }
