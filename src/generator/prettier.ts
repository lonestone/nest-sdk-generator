/**
 * @file Interface for prettifying generated files
 */
import * as os from 'os'
import * as fs from 'fs'
import * as prettier from 'prettier'
import { Config } from '../config'
import { panic } from '../logging'
import { findFileAbove } from '../utils'

/**
 * Find a .prettierrc configuration file in the current directory or above
 */
export function findPrettierConfig(config: Config): object {
  let prettierConfigPath = config.prettierConfig ?? findFileAbove('.prettierrc', config.sdkOutput)

  if (!prettierConfigPath) {
    return {}
  }

  if (!fs.existsSync(prettierConfigPath)) {
    panic('Prettier configuration was not found at specified path {magenta}', prettierConfigPath)
  }

  const text = fs.readFileSync(prettierConfigPath, 'utf8')

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
  // Fix prettier // to /
  if (os.platform() === 'win32') {
    return prettier.format(source.replace(/\\/g, '/'), {
      parser,
      ...config,
    })
  }

  return prettier.format(source, {
    parser,
    ...config,
  })
}
