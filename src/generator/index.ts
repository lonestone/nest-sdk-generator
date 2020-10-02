import * as fs from 'fs'
import * as path from 'path'
import { JsonValue, None, Option, println, unimplemented } from 'typescript-core'

import { SdkContent, analyzerCli } from '../analyzer'
import { CENTRAL_FILE } from './central'
import { CmdArgs } from './cmdargs'
import { decodeSdkContent } from './decode'
import { generateSdkModules } from './genmodules'
import { generateSdkTypeFiles } from './gentypes'
import { findPrettierConfig, prettify } from './prettier'

export default async function generatorCli(args: CmdArgs): Promise<void> {
  const started = Date.now()

  if (args.prettify) {
    println("NOTE: '--prettify' option was provided, files will be prettified with Prettier")
  }

  const sdkContent: SdkContent = await Option.bool(fs.existsSync(args.input) && fs.lstatSync(args.input).isFile()).match({
    Some: async () => {
      println("> Decoding SDK's content...")

      return decodeSdkContent(
        JsonValue.parse(fs.readFileSync(args.input, 'utf8')).expect('Input file is not a valid JSON file!')
      ).unwrapWith((err) => 'Failed to decode JSON input file:\n' + err.render().replace(/\t/g, '  '))
    },

    None: async () => {
      println('> Analyzing project to generate a SDK model...')

      return analyzerCli({
        input: args.input,
        output: undefined,
        pretty: false,
        //allowAllImportExt: args.allowAllImportExt,
      })
    },
  })

  if (fs.existsSync(args.output)) {
    unimplemented("Please provide an output directory that doesn't exist yet")
  }

  fs.mkdirSync(args.output)

  const writeScriptTo = (parentDir: null | string, file: string, utf8Content: string) => {
    const fullPath = path.resolve(args.output, parentDir ?? '', file)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(fullPath, args.prettify ? prettify(utf8Content, prettierConfig) : utf8Content, 'utf8')
  }

  const prettierConfig = args.prettify ? findPrettierConfig(args) : None<JsonValue>()

  println('> Generating type files...')

  for (const [file, content] of generateSdkTypeFiles(sdkContent.types)) {
    writeScriptTo('types', file, content)
  }

  println('> Generating modules...')

  for (const [file, content] of generateSdkModules(sdkContent.modules)) {
    writeScriptTo('modules', file, content)
  }

  writeScriptTo(null, 'central.ts', CENTRAL_FILE(args.configScriptPath, args.configNameToImport ?? null))

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}
