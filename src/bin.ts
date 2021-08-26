#!/usr/bin/node

import * as path from 'path'
import { analyzerCli } from './analyzer'
import { config } from './config-loader'
import generatorCli from './generator'
import { println } from './logging'

async function main() {
  process.chdir(path.dirname(path.resolve(process.argv[3])))

  const started = Date.now()

  switch (process.argv[2]) {
    case 'analyze':
      await analyzerCli(config)
      break

    case 'generate':
      const sdkContent = await analyzerCli(config)
      await generatorCli(config, sdkContent)
      break

    default:
      console.error('ERROR: Unknown action provided (must be either "analyze" or "generate")')
      process.exit(1)
  }

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}

main()
