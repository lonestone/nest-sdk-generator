/**
 * @file Generate type files for the SDK
 */

import * as path from 'path'
import { RecordDict } from 'typescript-core'
import { TypesExtractorContent } from '../analyzer/extractor'

// Returned codes are not formatted yet
export function generateSdkTypeFiles(sdkTypes: TypesExtractorContent): RecordDict<string> {
  const genFiles = new RecordDict<string>()

  for (const [file, types] of sdkTypes) {
    const out = []

    const imports = new RecordDict<string[]>()

    for (const extracted of types.values()) {
      for (const dep of extracted.dependencies) {
        if (dep.relativePath !== file && !imports.get(dep.relativePathNoExt).mapOr((types) => types.includes(dep.typename), false)) {
          imports.getOrSet(dep.relativePathNoExt, []).push(dep.typename)
        }
      }
    }

    out.push(
      imports
        .mapToArray((depFile, types) => {
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
