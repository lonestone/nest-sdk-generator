import { Decoders as d, JsonDecoder, JsonDecoders as j, Option } from 'typescript-core'

export interface Config {
  readonly verbosity: Option<'verbose' | 'default' | 'warnings' | 'silent' | 'full-silent'>
  readonly noColor: boolean
  readonly logFile: Option<string>

  readonly analyzer: AnalyzerConfig
  readonly generator: GeneratorConfig
}

export interface AnalyzerConfig {
  readonly input: string
  readonly jsonOutput: string
  readonly pretty: boolean
  readonly magicTypes: Array<MagicType>
}

export interface GeneratorConfig {
  readonly output: string
  readonly configScriptPath: string
  readonly configNameToImport: Option<string>
  readonly prettify: boolean
  readonly prettierConfig: Option<string>
  readonly removeOldOutputDir: boolean
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

export const analyzerConfigDecoder: JsonDecoder<AnalyzerConfig> = j.mapped({
  input: j.string,
  jsonOutput: j.string,
  pretty: j.boolean,
  magicTypes: j.arrayOf(magicTypeDecoder),
})

export const generatorConfigDecoder: JsonDecoder<GeneratorConfig> = j.mapped({
  output: j.string,
  configScriptPath: j.string,
  configNameToImport: j.maybe(j.string),
  prettify: j.boolean,
  prettierConfig: j.maybe(j.string),
  removeOldOutputDir: j.boolean,
})

export const configDecoder: JsonDecoder<Config> = j.mapped({
  verbosity: j.maybe(
    d.then(j.string, d.oneOf(['verbose' as const, 'default' as const, 'warnings' as const, 'silent' as const, 'full-silent' as const]))
  ),
  noColor: j.boolean,
  logFile: j.maybe(j.string),

  analyzer: analyzerConfigDecoder,
  generator: generatorConfigDecoder,
})
