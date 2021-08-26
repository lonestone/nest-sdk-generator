/**
 * @file Generate type files for the SDK
 */

import * as path from 'path'
import { TypesExtractorContent } from '../analyzer/extractor'

// Returned codes are not formatted yet
export function generateSdkTypeFiles(sdkTypes: TypesExtractorContent): Map<string, string> {
  const genFiles = new Map<string, string>()

  for (const [file, types] of sdkTypes) {
    const out = []

    const imports = new Map<string, string[]>()

    for (const extracted of types.values()) {
      for (const dep of extracted.dependencies) {
        if (dep.relativePath !== file) {
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
    }

    out.push(
      [...imports]
        .map(([depFile, types]) => {
          let depPath = path.relative(path.dirname(file), depFile).replace(/\\/g, '/')
          if (!depPath.includes('/')) depPath = './' + depPath
          return `import type { ${types.join(', ')} } from "${
            depPath.startsWith('./') || depPath.startsWith('../') ? depPath : './' + depPath
          }"`
        })
        .join('\n')
    )

    for (const extracted of types.values()) {
      out.push(extracted.content.replace(/^/gm, '  '))
    }

    genFiles.set(file, out.join('\n'))
  }

  return genFiles
}
