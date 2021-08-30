/**
 * @file Generate type files for the SDK
 */

import * as path from 'path'
import { TypesExtractorContent } from '../analyzer/extractor'
import { normalizeExternalFilePath } from '../analyzer/typedeps'

/**
 * Generate the non-formatted type files which will be used by the SDK's route functions
 * @param sdkTypes
 * @returns
 */
export function generateSdkTypeFiles(sdkTypes: TypesExtractorContent): Map<string, string> {
  /** Generated type files */
  const genFiles = new Map<string, string>()

  // While analyzing the controllers' content, all types used by their methods have been extracted
  // The list of these types is then provided to this function as the `sdkTypes` argument, allowing us
  //  to establish the list of all dependencies.
  for (const [file, types] of sdkTypes) {
    const out = []

    /** List of imports in the current file */
    const imports = new Map<string, string[]>()

    // Iterate over all types in the current `file`
    for (const extracted of types.values()) {
      // Iterate over all of the extracted type's dependencies
      for (const dep of extracted.dependencies) {
        // If the dependency is from the same file, then we have nothing to do
        if (dep.relativePath === file) {
          continue
        }

        // Push the typename to the list of imports
        let imported = imports.get(dep.relativePathNoExt)

        if (!imported) {
          imported = [dep.typename]
          imports.set(dep.relativePathNoExt, imported)
        }

        if (!imported.includes(dep.typename)) {
          imported.push(dep.typename)
        }
      }
    }

    // Generate an import statement for each imported type
    out.push(
      [...imports]
        .map(([depFile, types]) => {
          let depPath = path.relative(path.dirname(file), normalizeExternalFilePath(depFile)).replace(/\\/g, '/')
          if (!depPath.includes('/')) depPath = './' + depPath
          return `import type { ${types.join(', ')} } from "${
            depPath.startsWith('./') || depPath.startsWith('../') ? depPath : './' + depPath
          }"`
        })
        .join('\n')
    )

    // Add the extracted types' declaration, indented
    for (const extracted of types.values()) {
      out.push(extracted.content.replace(/^/gm, '  '))
    }

    // Generate the type file
    genFiles.set(file, out.join('\n'))
  }

  return genFiles
}
