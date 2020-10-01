#!/usr/bin/node

require('../build/env').setupEnv()

switch (process.argv[2]) {
  case 'analyze':
    require('../build/analyzer').default()
    break

  case 'generate':
    require('../build/generator').default()
    break

  default:
    console.error('ERROR: Unknown action provided (must be either "analyze" or "generate")')
    process.exit(1)
}
