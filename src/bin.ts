#!/usr/bin/node

import { panic, setupTypeScriptCore } from 'typescript-core'
import { analyzerCli } from './analyzer'
import { rawCmdArgs } from './cmdargs'
import { tsCoreEnv } from './env'
import generatorCli from './generator'

setupTypeScriptCore(tsCoreEnv)

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
      input: rawCmdArgs._[1] ?? rawCmdArgs['input'] ?? rawCmdArgs['i'] ?? panic('Please provide an input path'),
      output: rawCmdArgs._[2] ?? rawCmdArgs['output'] ?? rawCmdArgs['o'] ?? panic('Please provide an output path'),
      configScriptPath:
        rawCmdArgs['config-script-path'] ??
        rawCmdArgs['c'] ??
        panic('Please provide a path for the file providing the configuration (-c <path>)'),
      configNameToImport: rawCmdArgs['config-name-to-import'] ?? rawCmdArgs['n'],
      allowAllImportExt: !!rawCmdArgs['allow-all-import-ext'],
      prettify: !!rawCmdArgs['prettify'],
      prettierConfig: rawCmdArgs['prettier-config'],
      removeOldOutputDir: !!rawCmdArgs['remove-old-output-dir'] || !!rawCmdArgs['r'],
    })
    break

  default:
    console.error('ERROR: Unknown action provided (must be either "analyze" or "generate")')
    process.exit(1)
}
