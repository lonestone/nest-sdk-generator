import * as fs from 'fs'
import * as path from 'path'
import { debug, JsonValue, None, panic, println } from 'typescript-core'
import { SdkContent } from '../analyzer'
import { Config } from '../config'
import { CENTRAL_FILE } from './central'
import { generateSdkModules } from './genmodules'
import { generateSdkTypeFiles } from './gentypes'
import { findPrettierConfig, prettify } from './prettier'

export default async function generatorCli(config: Config, sdkContent: SdkContent): Promise<void> {
  const prettifyOutput = config.dontPrettify.match({
    Some: (dont) => !dont,
    None: () => true,
  })

  if (!prettifyOutput) {
    debug('NOTE: files will not be prettified with Prettier')
  }

  const output = path.resolve(process.cwd(), config.sdkOutput)

  if (fs.existsSync(output)) {
    if (config.dontOverwriteOldOutputDir.unwrapOr(false)) {
      panic("Please provide an output directory that doesn't exist yet")
    } else {
      if (!fs.existsSync(path.join(output, 'central.ts'))) {
        panic("Provided output path exists but doesn't seem to contain an SDK output. Please check the output directory.")
      } else {
        fs.rmSync(output, { recursive: true })
      }
    }
  }

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
      prettifyOutput ? prettify(utf8Content, prettierConfig, file.endsWith('.json') ? 'json' : 'typescript') : utf8Content,
      'utf8'
    )
  }

  const prettierConfig = prettifyOutput ? findPrettierConfig(config) : None<JsonValue>()

  println('> Generating type files...')

  for (const [file, content] of generateSdkTypeFiles(sdkContent.types)) {
    writeScriptTo('_types', file, content)
  }

  println('> Generating modules...')

  for (const [file, content] of generateSdkModules(sdkContent.modules)) {
    writeScriptTo(null, file, content)
  }

  const configScriptPath = path.resolve(process.cwd(), config.configScriptPath)

  writeScriptTo(null, 'central.ts', CENTRAL_FILE(path.relative(output, configScriptPath), config.configNameToImport))
}
