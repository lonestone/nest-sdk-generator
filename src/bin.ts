#!/usr/bin/node

import { Option, setupTypeScriptCore } from 'typescript-core'
import { analyzerCli } from './analyzer'
import { loadConfigFile } from './config-loader'
import { tsCoreEnv } from './env'
import generatorCli from './generator'

setupTypeScriptCore(tsCoreEnv)

const config = loadConfigFile(Option.maybe(process.argv[3]).expect('Please provide a path to the configuration file'))

switch (process.argv[2]) {
  case 'analyze':
    analyzerCli(config)
    break

  case 'generate':
    generatorCli(config)
    break

  case 'analyze+generate':
    analyzerCli(config)
    generatorCli(config)
    break

  default:
    console.error('ERROR: Unknown action provided (must be either "analyze" or "generate")')
    process.exit(1)
}
