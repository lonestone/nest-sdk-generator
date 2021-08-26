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
  readonly configScriptPath: string

  readonly configNameToImport?: string
  readonly jsonOutput?: string
  readonly jsonPrettyOutput?: boolean
  readonly prettierConfig?: string

  readonly dontPrettify?: boolean
  readonly dontOverwriteOldOutputDir?: boolean
}

/**
 * Magic type used to replace a non-compatible type in the generated SDK
 */
export interface MagicType {
  readonly nodeModuleFilePath: string
  readonly typeName: string
  readonly placeholderContent: string
}
