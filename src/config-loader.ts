import * as fs from 'fs'
import * as path from 'path'
import { Config } from './config'
import { panic } from './logging'

/**
 * Load an existing configuration file and decode it
 * @param configPath
 */
export function loadConfigFile(configPath: string): Config {
  if (!fs.existsSync(configPath)) {
    panic('Config file was not found at path: {yellow}', path.resolve(configPath))
  }

  const text = fs.readFileSync(configPath, 'utf8')

  try {
    config = JSON.parse(text)
  } catch (e) {
    panic('Failed to parse configuration file: ' + e)
  }

  return config
}

export let config: Config = loadConfigFile(process.argv[3] ?? panic('Please provide a path to the configuration file'))
