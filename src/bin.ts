#!/usr/bin/env node

import * as path from 'path'
import { analyzerCli } from './analyzer'
import { config, configPath } from './config'
import generatorCli from './generator'
import { println } from './logging'

async function main() {
  const started = Date.now()

  process.chdir(path.dirname(path.resolve(configPath)))

  switch (process.argv[3]) {
    case '--analyze':
      await analyzerCli(config)
      break

    case '--generate':
    case undefined:
      const sdkContent = await analyzerCli(config)
      await generatorCli(config, sdkContent)
      break

    default:
      console.error('ERROR: Unknown action provided (must be either "--analyze" or "--generate")')
      process.exit(1)
  }

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}

main()
