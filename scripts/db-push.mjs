import { readFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function loadEnv() {
  try {
    const content = readFileSync(join(root, '.env'), 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const value = trimmed.slice(eq + 1).trim()
      if (value && !process.env[key]) process.env[key] = value
    }
  } catch {
    console.error('Could not read .env file')
  }
}

loadEnv()

const token = process.env.SUPABASE_ACCESS_TOKEN
const projectRef = 'xeuwjprmuxqsodlakjlj'

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN in .env\n' +
      'Create one at https://supabase.com/dashboard/account/tokens'
  )
  process.exit(1)
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('Linking to Supabase project', projectRef, '...')
run('npx', ['supabase', 'link', '--project-ref', projectRef])

console.log('Pushing database migrations...')
run('npx', ['supabase', 'db', 'push'])

console.log('Database schema applied successfully.')
