import * as fs from 'fs'
import * as path from 'path'
import { debug, JsonValue, None, Option, panic, println } from 'typescript-core'
import { analyzerCli, SdkContent } from '../analyzer'
import { Config } from '../config'
import { CENTRAL_FILE } from './central'
import { decodeSdkContent } from './decode'
import { generateSdkModules } from './genmodules'
import { generateSdkTypeFiles } from './gentypes'
import { findPrettierConfig, prettify } from './prettier'

export default async function generatorCli(config: Config): Promise<void> {
  const started = Date.now()

  if (config.generator.prettify) {
    debug("NOTE: '--prettify' option was provided, files will be prettified with Prettier")
  }

  const output = path.resolve(process.cwd(), config.generator.output)

  if (fs.existsSync(output)) {
    if (config.generator.removeOldOutputDir) {
      if (!fs.existsSync(path.join(output, 'nsdk.json')) || !fs.existsSync(path.join(output, 'central.ts'))) {
        panic('Provided output path exists but not seem to contain an SDK output. Please check the output directory.')
      } else {
        fs.rmSync(output, { recursive: true })
      }
    } else {
      panic("Please provide an output directory that doesn't exist yet")
    }
  }

  const sdkContent: SdkContent = await Option.bool(fs.existsSync(config.analyzer.jsonOutput)).match({
    Some: async () => {
      println("> Decoding SDK's content...")

      return decodeSdkContent(
        JsonValue.parse(fs.readFileSync(config.analyzer.jsonOutput, 'utf8')).expect('Input file is not a valid JSON file!')
      ).unwrapWith((err) => 'Failed to decode JSON input file:\n' + err.render().replace(/\t/g, '  '))
    },

    None: async () => {
      println('> Analyzing project to generate a SDK model...')
      return analyzerCli(config)
    },
  })

  const outputParentDir = path.dirname(output)

  if (!fs.existsSync(outputParentDir)) {
    panic("Output directory's parent {magentaBright} does not exist.", outputParentDir)
  }

  fs.mkdirSync(output)

  const writeScriptTo = (parentDir: null | string, file: string, utf8Content: string) => {
    const fullPath = path.resolve(output, parentDir ?? '', file)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(
      fullPath,
      config.generator.prettify ? prettify(utf8Content, prettierConfig, file.endsWith('.json') ? 'json' : 'typescript') : utf8Content,
      'utf8'
    )
  }

  const prettierConfig = config.generator.prettify ? findPrettierConfig(config) : None<JsonValue>()

  println('> Generating type files...')

  for (const [file, content] of generateSdkTypeFiles(sdkContent.types)) {
    writeScriptTo('_types', file, content)
  }

  println('> Generating modules...')

  for (const [file, content] of generateSdkModules(sdkContent.modules)) {
    writeScriptTo(null, file, content)
  }

  writeScriptTo(null, 'central.ts', CENTRAL_FILE(config.generator.configScriptPath, config.generator.configNameToImport))

  writeScriptTo(
    null,
    'nsdk.json',
    JsonValue.stringify(sdkContent).unwrapWith((err) => err.error + ' | at:\n' + err.path.join('\n '))
  )

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}
