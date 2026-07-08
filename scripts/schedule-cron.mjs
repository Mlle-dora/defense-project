import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  const env = {}
  try {
    const content = readFileSync(join(root, '.env'), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (value) env[key] = value
    }
  } catch {
    console.error('Could not read .env file')
    process.exit(1)
  }
  return env
}

const env = loadEnv()
const token = env.SUPABASE_ACCESS_TOKEN
const projectUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY

if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env')
  process.exit(1)
}
if (!projectUrl || !anonKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const sql = `
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('${projectUrl.replace(/'/g, "''")}', 'project_url', 'Cron: Supabase project URL');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'publishable_key') THEN
    PERFORM vault.create_secret('${anonKey.replace(/'/g, "''")}', 'publishable_key', 'Cron: Supabase anon key');
  END IF;
END $$;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('process-notification-queue', 'reminder-scheduler');

SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key'),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'reminder-scheduler',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/reminder-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key'),
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'publishable_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
`

const sqlPath = join(root, 'scripts', '.cron-setup.sql')
writeFileSync(sqlPath, sql, 'utf8')

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('Scheduling cron jobs on linked Supabase project...')
run('npx', ['supabase', 'link', '--project-ref', 'xeuwjprmuxqsodlakjlj'])
run('npx', ['supabase', 'db', 'query', '--linked', '-f', sqlPath])

try {
  unlinkSync(sqlPath)
} catch {
  // ignore cleanup errors
}

console.log('Cron jobs scheduled:')
console.log('  - process-notification-queue: every 5 minutes')
console.log('  - reminder-scheduler: daily at 08:00 UTC')
