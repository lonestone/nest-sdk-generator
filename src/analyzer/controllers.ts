/**
 * @file Analyzer for the source API's controllers
 */

import * as os from 'os'
import * as path from 'path'
import { Project } from 'ts-morph'
import { findFileAbove } from '../fileUtils'
import { debug, format, panic, warn } from '../logging'
import { analyzeController, SdkController } from './controller'
import { getModuleName } from './module'

export type SdkModules = Map<string, Map<string, SdkController>>

export function analyzeControllers(controllers: string[], absoluteSrcPath: string, project: Project): SdkModules {
  /** Hierarchised SDK informations */
  const collected = new Map<string, Map<string, SdkController>>()

  /**
   * Modules cache: contains for a given directory the nearest module file's path and name
   * This allows to avoid having to analyze the whole directory structure for each controller
   */
  const modulesCache = new Map<string, string>()

  /**
   * Path of the declared modules
   * When a module is detected and put in the cache, its name is registered here along with its path
   * This allows to ensure there is no name clash between two different modules
   */
  const declaredModulesPath = new Map<string, string>()

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

    let moduleName = modulesCache.get(basePath)

    // Check if the module's name is in cache
    if (!moduleName) {
      // Else, find the nearest module file
      const absoluteModulePath = findFileAbove(/^.*\.module\.ts$/, path.resolve(absoluteSrcPath, basePath))

      if (absoluteModulePath === null) {
        panic('No module file was found for controller at path: {yellow}', absoluteControllerPath)
      }

      const relativeModulePath = path.relative(absoluteSrcPath, absoluteModulePath)

      // Get the module's name
      moduleName = getModuleName(project, relativeModulePath, absoluteSrcPath)

      debug('Discovered module: {yellow}', moduleName)

      // Ensure this module is unique
      const cachedModulePath = declaredModulesPath.get(moduleName)

      if (cachedModulePath) {
        panic(
          `Two modules were declared with the same name {yellow}:\n` + `- One in {yellow}\n` + `- One in {yellow}`,
          moduleName,
          cachedModulePath,
          relativeModulePath
        )
      }

      modulesCache.set(basePath, moduleName)
    }

    if (moduleName in {}) {
      panic(`Detected module whose name {yellow} collides with a JavaScript's native object property`, moduleName)
    }

    let moduleSdkInfos = collected.get(moduleName)

    if (!moduleSdkInfos) {
      moduleSdkInfos = new Map()
      collected.set(moduleName, moduleSdkInfos)
    }

    if (i === 0) {
      if (process.platform === 'linux' && os.release().toLocaleLowerCase().includes('microsoft') && absoluteSrcPath.startsWith('/mnt/')) {
        warn("NOTE: On WSL, the first type analysis on a project located in Windows's filesystem may take a long time to complete.")
      }
    }

    const metadata = analyzeController(project, relativeControllerPath, absoluteSrcPath)

    if (metadata instanceof Error) {
      throw new Error(format('Failed to analyze controller at path {magenta}:\n{}', relativeControllerPath, metadata.message))
    }

    if (metadata) {
      if (metadata.registrationName in {}) {
        panic(
          `Detected controller whose registration name {yellow} collides with a JavaScript's native object property`,
          metadata.registrationName
        )
      }

      moduleSdkInfos.set(metadata.camelClassName, metadata)
    }
  })

  return collected
}
