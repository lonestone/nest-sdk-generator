/**
 * @file Analyzer for the source API's controllers
 */

import * as os from 'os'
import * as path from 'path'
import { Project } from 'ts-morph'
import { debug, Dictionary, panic, RecordDict, warn } from 'typescript-core'
import { findFileAbove } from '../fileUtils'
import { analyzeController, SdkController } from './controller'
import { getModuleName } from './module'

export type SdkModules = RecordDict<RecordDict<SdkController>>

export function analyzeControllers(controllers: string[], absoluteSrcPath: string, project: Project): SdkModules {
  /** Hierarchised SDK informations */
  const collected = new RecordDict<RecordDict<SdkController>>()

  /**
   * Modules cache: contains for a given directory the nearest module file's path and name
   * This allows to avoid having to analyze the whole directory structure for each controller
   */
  const modulesCache = new Dictionary<string, string>()

  /**
   * Path of the declared modules
   * When a module is detected and put in the cache, its name is registered here along with its path
   * This allows to ensure there is no name clash between two different modules
   */
  const declaredModulesPath = new Dictionary<string, string>()

  debug(`Analyzing {yellow} controllers...`, controllers.length)

  controllers.forEach((relativeControllerPath, i) => {
    const absoluteControllerPath = path.resolve(absoluteSrcPath, relativeControllerPath)

    debug(
      '\n{cyan} {yellow}: {magentaBright} {cyan}\n',
      '===== Analyzing controller',
      `${i + 1}/${controllers.length}`,
      relativeControllerPath,
      '====='
    )

    const basePath = path.dirname(absoluteControllerPath)

    // Check if the module's name is in cache
    if (!modulesCache.has(basePath)) {
      // Else, find the nearest module file
      const absoluteModulePath = findFileAbove(/^.*\.module\.ts$/, path.resolve(absoluteSrcPath, basePath))

      if (absoluteModulePath.isNone()) {
        panic('No module file was found for controller at path: {yellow}', absoluteControllerPath)
      }

      const relativeModulePath = path.relative(absoluteSrcPath, absoluteModulePath.data)

      // Get the module's name
      const moduleName = getModuleName(project, relativeModulePath, absoluteSrcPath)

      if (moduleName.isErr()) {
        panic(moduleName.err)
      }

      debug('Discovered module: {yellow}', moduleName.data)

      // Ensure this module is unique
      declaredModulesPath
        .get(moduleName.data)
        .ifSome((existingModule) =>
          panic(
            `Two modules were declared with the same name {yellow}:\n` + `- One in {yellow}\n` + `- One in {yellow}`,
            moduleName,
            existingModule,
            relativeModulePath
          )
        )

      modulesCache.set(basePath, moduleName.data)
    }

    const moduleName = modulesCache.get(basePath).unwrap()

    if (moduleName in {}) {
      panic(`Detected module whose name {yellow} collides with a JavaScript's native object property`, moduleName)
    }

    const moduleSdkInfos = collected.getOrSet(moduleName, new RecordDict())

    if (i === 0) {
      if (process.platform === 'linux' && os.release().toLocaleLowerCase().includes('microsoft') && absoluteSrcPath.startsWith('/mnt/')) {
        warn("NOTE: On WSL, the first type analysis on a project located in Windows's filesystem may take a long time to complete.")
      }
    }

    analyzeController(project, relativeControllerPath, absoluteSrcPath)
      .unwrapWith((err) => panic('Failed to analyze controller at path {magenta}:\n{}', relativeControllerPath, err))
      .ifSome((metadata) => {
        if (metadata.registrationName in {}) {
          panic(
            `Detected controller whose registration name {yellow} collides with a JavaScript's native object property`,
            metadata.registrationName
          )
        }

        moduleSdkInfos.set(metadata.camelClassName, metadata)
      })
  })

  return collected
}
