#!/usr/bin/node

import * as path from 'path'
import { Option, println, setupTypeScriptCore } from 'typescript-core'
import { analyzerCli } from './analyzer'
import { loadConfigFile } from './config-loader'
import { tsCoreEnv } from './env'
import generatorCli from './generator'

async function main() {
  setupTypeScriptCore(tsCoreEnv)

  const config = loadConfigFile(Option.maybe(process.argv[3]).expect('Please provide a path to the configuration file'))

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
