#!/usr/bin/node

import { analyzerCli } from './analyzer'
import { rawCmdArgs } from './cmdargs'
import { setupEnv } from './env'
import generatorCli from './generator'

setupEnv()

switch (process.argv[2]) {
  case 'analyze':
    analyzerCli({
      input: rawCmdArgs._[1] ?? rawCmdArgs['input'] ?? rawCmdArgs['i'],
      output: rawCmdArgs._[2] ?? rawCmdArgs['output'] ?? rawCmdArgs['o'],
      pretty: !!rawCmdArgs['pretty'],
      //allowAllImportExt: !!rawCmdArgs['allow-all-import-ext'],
    })
    break

  case 'generate':
    generatorCli({
      input: rawCmdArgs._[1] ?? rawCmdArgs['input'] ?? rawCmdArgs['i'],
      output: rawCmdArgs._[2] ?? rawCmdArgs['output'] ?? rawCmdArgs['o'],
      allowAllImportExt: !!rawCmdArgs['allow-all-import-ext'],
      prettify: !!rawCmdArgs['prettify'],
      prettierConfig: rawCmdArgs['prettier-config'],
    })
    break

  default:
    console.error('ERROR: Unknown action provided (must be either "analyze" or "generate")')
    process.exit(1)
}
