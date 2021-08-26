import * as fs from 'fs'
import * as path from 'path'
import { JsonValue, MaybeUninit, panic } from 'typescript-core'
import { Config, configDecoder } from './config'

/**
 * Load an existing configuration file and decode it
 * @param configPath
 */
export function loadConfigFile(configPath: string): Config {
  if (!fs.existsSync(configPath)) {
    panic('Config file was not found at path: {yellow}', path.resolve(configPath))
  }

  const text = fs.readFileSync(configPath, 'utf8')
  const json = JsonValue.parse(text).unwrap()

  return config.init(json.decode(configDecoder).unwrap())
}

export const config = new MaybeUninit<Config>()
