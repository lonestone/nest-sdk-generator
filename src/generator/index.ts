import * as fs from 'fs'
import * as path from 'path'
import { JsonValue, None, Option, panic, println } from 'typescript-core'
import { analyzerCli, SdkContent } from '../analyzer'
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

  if (args.input && !fs.existsSync(args.input)) {
    panic('Input path does not exist.')
  }

  const output = path.resolve(process.cwd(), args.output)

  if (fs.existsSync(output)) {
    if (args.removeOldOutputDir) {
      if (!fs.existsSync(path.join(output, 'nsdk.json')) || !fs.existsSync(path.join(output, 'central.ts'))) {
        panic('Provided output path exists but not seem to contain an SDK output. Please check the output directory.')
      } else {
        fs.rmdirSync(output, { recursive: true })
      }
    } else {
      panic("Please provide an output directory that doesn't exist yet")
    }
  }

  const sdkContent: SdkContent = await Option.bool(fs.lstatSync(args.input).isFile()).match({
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

  Option.maybe(output)
    .map((dir) => path.dirname(dir))
    .ifSome((dir) => !fs.existsSync(dir) && panic("Output directory's parent {magentaBright} does not exist.", path.dirname(dir)))

  fs.mkdirSync(output)

  const writeScriptTo = (parentDir: null | string, file: string, utf8Content: string) => {
    const fullPath = path.resolve(output, parentDir ?? '', file)
    fs.mkdirSync(path.dirname(fullPath), { recursive: true })
    fs.writeFileSync(
      fullPath,
      args.prettify ? prettify(utf8Content, prettierConfig, file.endsWith('.json') ? 'json' : 'typescript') : utf8Content,
      'utf8'
    )
  }

  const prettierConfig = args.prettify ? findPrettierConfig(args) : None<JsonValue>()

  println('> Generating type files...')

  for (const [file, content] of generateSdkTypeFiles(sdkContent.types)) {
    writeScriptTo('_types', file, content)
  }

  println('> Generating modules...')

  for (const [file, content] of generateSdkModules(sdkContent.modules)) {
    writeScriptTo(null, file, content)
  }

  writeScriptTo(null, 'central.ts', CENTRAL_FILE(args.configScriptPath, args.configNameToImport ?? null))

  writeScriptTo(
    null,
    'nsdk.json',
    JsonValue.stringify(sdkContent).unwrapWith((err) => err.error + ' | at:\n' + err.path.join('\n '))
  )

  println('{green}', '@ Done in ' + ((Date.now() - started) / 1000).toFixed(2) + 's')
}
