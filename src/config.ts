import { Decoders as d, JsonDecoder, JsonDecoders as j, Option } from 'typescript-core'

export interface Config {
  readonly verbosity: Option<'verbose' | 'default' | 'warnings' | 'silent' | 'full-silent'>
  readonly noColor: Option<boolean>
  readonly logFile: Option<string>

  readonly apiInputPath: string
  readonly magicTypes: Array<MagicType>

  readonly sdkOutput: string
  readonly configScriptPath: string
  readonly configNameToImport: Option<string>
  readonly jsonOutput: Option<string>
  readonly jsonPrettyOutput: Option<boolean>
  readonly prettierConfig: Option<string>

  readonly dontPrettify: Option<boolean>
  readonly dontOverwriteOldOutputDir: Option<boolean>
}

export interface MagicType {
  readonly nodeModuleFilePath: string
  readonly typeName: string
  readonly placeholderContent: string
}

export const magicTypeDecoder: JsonDecoder<MagicType> = j.mapped({
  nodeModuleFilePath: j.string,
  typeName: j.string,
  placeholderContent: j.string,
})

export const configDecoder: JsonDecoder<Config> = j.mapped({
  verbosity: j.optional(
    d.then(j.string, d.oneOf(['verbose' as const, 'default' as const, 'warnings' as const, 'silent' as const, 'full-silent' as const]))
  ),
  noColor: j.optional(j.boolean),
  logFile: j.optional(j.string),

  apiInputPath: j.string,
  magicTypes: j.arrayOf(magicTypeDecoder),

  sdkOutput: j.string,
  configScriptPath: j.string,
  configNameToImport: j.optional(j.string),
  prettierConfig: j.optional(j.string),
  jsonOutput: j.optional(j.string),
  jsonPrettyOutput: j.optional(j.boolean),

  dontOverwriteOldOutputDir: j.optional(j.boolean),
  dontPrettify: j.optional(j.boolean),
})
