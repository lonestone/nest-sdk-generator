/**
 * @file Interface for prettifying generated files
 */

import * as fs from 'fs'
import * as prettier from 'prettier'
import { Config } from '../config'
import { findFileAbove } from '../fileUtils'
import { panic } from '../logging'

/**
 * Find a .prettier.rc configuration file in the current directory or above
 */
export function findPrettierConfig(config: Config): object {
  const text = config.prettierConfig
    ? fs.existsSync(config.prettierConfig)
      ? fs.readFileSync(config.prettierConfig, 'utf8')
      : panic('Prettier configuration was not found at specified path {magenta}', config.prettierConfig)
    : findFileAbove('.prettier.rc', config.sdkOutput) ?? '{}'

  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error('Failed to parse Prettier configuration: ' + e)
  }
}

/**
 * Prettify a TypeScript or JSON input
 * @param source
 * @param config
 * @param parser
 * @returns
 */
export function prettify(source: string, config: object, parser: 'typescript' | 'json'): string {
  return prettier.format(source, {
    parser,
    ...config,
  })
}
