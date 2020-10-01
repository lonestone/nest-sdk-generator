import * as fs from 'fs'
import * as path from 'path'
import { JsonValue, Option, println, unimplemented } from 'typescript-core'

import { SdkContent, analyze } from '../analyzer'
import { CENTRAL_FILE } from './central'
import { cmdArgs } from './cmdargs'
import { decodeSdkContent } from './decode'
import { generateSdkModules } from './genmodules'
import { generateSdkTypeFiles } from './gentypes'
import { findPrettierConfig, prettify } from './prettier'

export default async function cli(): Promise<void> {
  const started = Date.now()

  if (cmdArgs.prettify) {
    println("NOTE: '--prettify' option was provided, files will be prettified with Prettier")
  }

  const sdkContent: SdkContent = await Option.bool(fs.existsSync(cmdArgs.input) && fs.lstatSync(cmdArgs.input).isFile()).match({
    Some: async () => {
      println("> Decoding SDK's content...")

      return decodeSdkContent(
        JsonValue.parse(fs.readFileSync(cmdArgs.input, 'utf8')).expect('Input file is not a valid JSON file!')
      ).unwrapWith((err) => 'Failed to decode JSON input file:\n' + err.render().replace(/\t/g, '  '))
    },

    None: async () => {
      println('> Analyzing project to generate a SDK model...')

      return analyze({
        input: cmdArgs.input,
        output: undefined,
        pretty: false,
        allowAllImportExt: cmdArgs.allowAllImportExt,
      })
    },
  })

  if (fs.existsSync(cmdArgs.output)) {
    unimplemented("Please provide an output directory that doesn't exist yet")
  }

  fs.mkdirSync(cmdArgs.output)

  const writeScriptTo = (parentDir: null | string, file: string, utf8Content: string) => {
    const fullPath = path.resolve(cmdArgs.output, parentDir ?? '', file)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, prettify(utf8Content, prettierConfig), 'utf8')
  }

  const prettierConfig = findPrettierConfig()

  println('> Generating type files...')

  for (const [file, content] of generateSdkTypeFiles(sdkContent.types)) {
    writeScriptTo('types', file, content)
  }

  println('> Generating modules...')

  for (const [file, content] of generateSdkModules(sdkContent.modules)) {
    writeScriptTo('modules', file, content)
  }

  // TODO: Populate 'central.ts'!
  writeScriptTo(null, 'central.ts', CENTRAL_FILE)

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}
