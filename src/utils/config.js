import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..', '..');
const envPath = join(projectRoot, '.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`Warning: Could not load .env file from ${envPath}`);
  console.error('Error:', result.error.message);
}

const defaultConfig = JSON.parse(
  readFileSync(join(__dirname, '..', '..', 'config', 'default.json'), 'utf-8')
);

export const config = {
  liveperson: {
    accountId: process.env.LP_ACCOUNT_ID,
    clientId: process.env.LP_CLIENT_ID,
    clientSecret: process.env.LP_CLIENT_SECRET,
    username: process.env.LP_USERNAME,
    password: process.env.LP_PASSWORD,
    domainApiBase: process.env.LP_DOMAIN_API_BASE || defaultConfig.liveperson.domainApiBase,
    ...defaultConfig.liveperson
  },
  output: defaultConfig.output
};


export function validateConfig() {
  const required = ['accountId', 'clientId', 'clientSecret'];
  const missing = required.filter(key => !config.liveperson[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(k => `LP_${k.toUpperCase().replace(/([A-Z])/g, '_$1')}`).join(', ')}\n` +
      'Please create a .env file based on .env.example'
    );
  }
  
  return true;
}
