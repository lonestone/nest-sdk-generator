import chalk = require('chalk')
import * as fs from 'fs'
import * as path from 'path'

/**
 * The configuration file's content
 * For details on what these options do, see the project's README
 */
export interface Config {
  /** Enable verbose mode */
  readonly verbose?: boolean

  /** Disable colored output */
  readonly noColor?: boolean

  /** Path to the API's source directory */
  readonly apiInputPath: string

  /** Path to generate the SDK at */
  readonly sdkOutput: string

  /** Path to the SDK interface file */
  readonly sdkInterfacePath: string

  /** List of magic types */
  readonly magicTypes?: MagicType[]

  /** Show a JSON output */
  readonly jsonOutput?: string

  /** Prettify the JSON output */
  readonly jsonPrettyOutput?: boolean

  /** Prettify the generated files (enabled by default) */
  readonly prettify?: boolean

  /** Path to Prettier's configuration file */
  readonly prettierConfig?: string

  /** Path to custom tsconfig file */
  readonly tsconfigFile?: string

  /** If the output directory already exists, overwrite it (enabled by default) */
  readonly overwriteOldOutputDir?: boolean

  /** If the SDK interface file does not exist yet, create one automatically (enabled by default) */
  readonly generateDefaultSdkInterface?: boolean

  /** Write generation timestamp in each TypeScript file (enabled by default) */
  readonly generateTimestamps?: boolean
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
    console.error(chalk.red('Config file was not found at path: ' + chalk.yellow(path.resolve(configPath))))
    process.exit(4)
  }

  const text = fs.readFileSync(configPath, 'utf8')

  try {
    return JSON.parse(text)
  } catch (e) {
    console.error(chalk.red('Failed to parse configuration file: ' + e))
    process.exit(3)
  }
}

export const configPath = process.argv[2]

if (!configPath) {
  console.error(chalk.red('Please provide a path to the configuration file'))
  process.exit(2)
}

export const config = loadConfigFile(configPath)
