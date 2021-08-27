import * as fs from 'fs'
import * as path from 'path'
import { panic } from './logging'

/**
 * The configuration file's content
 */
export interface Config {
  readonly verbose?: boolean
  readonly noColor?: boolean
  readonly logFile?: string

  readonly apiInputPath: string
  readonly magicTypes: MagicType[]

  readonly sdkOutput: string
  readonly sdkInterfacePath: string

  readonly configNameToImport?: string
  readonly jsonOutput?: string
  readonly jsonPrettyOutput?: boolean
  readonly prettierConfig?: string

  readonly prettify?: boolean
  readonly overwriteOldOutputDir?: boolean
  readonly generateDefaultSdkInterface?: boolean
}

/**
 * Magic type used to replace a non-compatible type in the generated SDK
 */
export interface MagicType {
  readonly nodeModuleFilePath: string
  readonly typeName: string
  readonly placeholderContent: string
}

/**
 * Load an existing configuration file and decode it
 * @param configPath
 */
function loadConfigFile(configPath: string): Config {
  if (!fs.existsSync(configPath)) {
    panic('Config file was not found at path: {yellow}', path.resolve(configPath))
  }

  const text = fs.readFileSync(configPath, 'utf8')

  try {
    return JSON.parse(text)
  } catch (e) {
    panic('Failed to parse configuration file: ' + e)
  }
}

export const config: Config = loadConfigFile(process.argv[3] ?? panic('Please provide a path to the configuration file'))
