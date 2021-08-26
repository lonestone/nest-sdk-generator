/**
 * @file Entrypoint of the source API analyzer, used to generate the final SDK
 */

import * as fs from 'fs'
import * as path from 'path'
import { Project } from 'ts-morph'
import { debug, format, JsonValue, panic } from 'typescript-core'
import { Config } from '../config'
import { findFilesRecursive, findJsonConfig } from '../fileUtils'
import { analyzeControllers, SdkModules } from './controllers'
import { flattenSdkResolvedTypes, locateTypesFile, TypesExtractor, TypesExtractorContent } from './extractor'

export interface SdkContent {
  readonly modules: SdkModules
  readonly types: TypesExtractorContent
}

export interface MagicType {
  readonly package: string
  readonly typeName: string
  readonly content: string
}

export async function analyzerCli(config: Config): Promise<SdkContent> {
  const started = Date.now()

  const sourcePath = path.resolve(process.cwd(), config.apiInputPath)

  if (!sourcePath) panic('Please provide a source directory')

  if (!fs.existsSync(sourcePath)) panic('Provided source path does not exist')
  if (!fs.lstatSync(sourcePath).isDirectory()) panic('Provided source path is not a directory')

  debug(`Analyzing from source directory {yellow}`, sourcePath)

  if (config.jsonOutput.isSome()) {
    const jsonOutputParentDir = path.dirname(path.resolve(process.cwd(), config.jsonOutput.data))

    if (!fs.existsSync(jsonOutputParentDir)) {
      panic("Output file's parent directory {magentaBright} does not exist.", jsonOutputParentDir)
    }

    debug('Writing output to {yellow}', config.jsonOutput.data, config.jsonPrettyOutput ? 'beautified' : 'minified')
  }

  // ====== Find & parse 'tsconfig.json' ====== //
  const tsConfig = findJsonConfig('tsconfig.json', sourcePath).unwrapWith(() =>
    format('No {yellow} file found in provided source path {yellow}', 'tsconfig.json', sourcePath)
  )

  debug('Found {yellow} file at {yellow}', 'tsconfig.json', tsConfig.path)

  debug('Looking for source files...')

  // Create a 'ts-morph' project
  const project = new Project({
    compilerOptions: tsConfig as any,
  })

  // Get the list of all TypeScript files in the source directory
  const sourceTSFiles = findFilesRecursive(/^.*\.ts$/, sourcePath)
  debug(`Found {magentaBright} source files.`, sourceTSFiles.length)

  // Add them
  debug('\nAdding them to the source project...')

  let progressByTenth = 0
  let strLen = sourceTSFiles.length.toString().length

  const hasProgress = (filesTreated: number) => filesTreated / sourceTSFiles.length >= (progressByTenth + 1) / 10

  const controllers = []

  for (let i = 0; i < sourceTSFiles.length; i++) {
    const file = sourceTSFiles[i]
    project.addSourceFileAtPath(path.resolve(sourcePath, file))

    if (file.endsWith('.controller.ts')) {
      controllers.push(file)
    }

    if (hasProgress(i + 1)) {
      while (hasProgress(i + 1)) progressByTenth++

      debug(
        '| Progress: {yellow} ({magentaBright} files) - {green} controller{} found',
        (progressByTenth * 10).toString().padStart(3, ' ') + '%',
        `${(i + 1).toString().padStart(strLen, ' ')} / ${sourceTSFiles.length}`,
        controllers.length.toString().padStart(strLen, ''),
        controllers.length > 1 ? 's' : ''
      )
    }
  }

  debug('All files were added successfully.\n')

  const modules = analyzeControllers(controllers, sourcePath, project)

  const typesCache = new TypesExtractor(project, sourcePath, config.magicTypes)

  const typesToExtract = locateTypesFile(flattenSdkResolvedTypes(modules))

  debug('\n==== Extracting {} type' + (typesToExtract.length > 1 ? 's' : '') + ' ====\n', typesToExtract.length)

  for (const loc of typesToExtract) {
    typesCache.extractType(loc).unwrap()
  }

  const content: SdkContent = {
    modules,
    types: typesCache.extracted,
  }

  if (config.jsonOutput.isSome()) {
    fs.writeFileSync(
      config.jsonOutput.data,
      JsonValue.stringify(content, config.jsonPrettyOutput.unwrapOr(false) ? 4 : 0).unwrapWith(
        (err) => err.error + ' | at:\n' + err.path.join('\n ')
      ),
      'utf8'
    )
  }

  debug('\n===== Done in {green}! ====', ((Date.now() - started) / 1000).toFixed(2) + 's')

  return content
}
