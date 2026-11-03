import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const backendDirectory = join(projectRoot, 'backend')
const frontendDirectory = join(projectRoot, 'frontend')
const isWindows = process.platform === 'win32'
const python = join(
  backendDirectory,
  'venv',
  isWindows ? 'Scripts' : 'bin',
  isWindows ? 'python.exe' : 'python',
)
const vite = join(frontendDirectory, 'node_modules', 'vite', 'bin', 'vite.js')

if (!existsSync(python) || !existsSync(vite)) {
  console.error('Project dependencies are not installed yet.')
  console.error('Set up backend\\venv and install backend\\requirements.txt,')
  console.error('then run npm install in the frontend folder.')
  process.exit(1)
}

console.log('Starting PhishShield backend and frontend...')
console.log('Open http://localhost:5173 when the frontend is ready.')

const children = new Set()
let stopping = false
let exitCode = 0

function stop(code = 0) {
  if (stopping) return

  stopping = true
  exitCode = code
  for (const child of children) child.kill()
  if (children.size === 0) process.exit(exitCode)
}

function start(name, command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: 'inherit' })
  children.add(child)

  child.on('error', (error) => {
    children.delete(child)
    console.error(`Failed to start ${name}: ${error.message}`)
    stop(1)
  })

  child.on('exit', (code, signal) => {
    children.delete(child)
    if (!stopping) {
      console.error(`${name} stopped${signal ? ` (${signal})` : ` with exit code ${code ?? 1}`}.`)
      stop(code ?? 1)
    } else if (children.size === 0) {
      process.exit(exitCode)
    }
  })
}

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())

start('Backend', python, ['run.py'], backendDirectory)
start('Frontend', process.execPath, [vite, '--host', '127.0.0.1'], frontendDirectory)
