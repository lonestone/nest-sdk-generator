import * as fs from 'fs'
import * as path from 'path'

export function findFileAbove(pattern: string | RegExp, dir: string): string | null {
  if (!path.isAbsolute(dir)) {
    // Get an absolute path to allow getting its parent using path.dirname()
    dir = path.resolve(process.cwd(), dir)
  }

  // The previous directory
  // This is used to check if we reached the top-level directory ; for instance on Linux:
  // > path.dirname('/') === '/'
  // So if the previous directory and the current one are equal, this means we reached the top-level directory
  let prevDir = dir

  let items = []

  // Search until we find the desired file
  while ((items = fs.readdirSync(dir).filter((item) => (pattern instanceof RegExp ? pattern.exec(item) : pattern === item))).length === 0) {
    // Get path to the parent directory
    dir = path.dirname(dir)

    // If the path is empty or equal to the previous path, we reached the top-level directory
    if (!dir || prevDir === dir) {
      return null
    }

    prevDir = dir
  }

  // Success!
  return path.resolve(dir, items[0])
}

/**
 * Find all files matching a pattern, recursively
 * @param pattern The pattern to look for
 * @param dir The root directory to start searching from
 * @param relative Get relative paths instead of absolute paths (default: true)
 * @returns A list of paths
 */
export function findFilesRecursive(pattern: string | RegExp, dir: string, relative = true): string[] {
  const cwd = process.cwd()

  function find(pattern: string | RegExp, rootDir: string, currDir: string): string[] {
    return fs
      .readdirSync(currDir)
      .map((item) => {
        const fullPath = path.resolve(currDir, item)

        return fs.lstatSync(fullPath).isDirectory()
          ? find(pattern, rootDir, fullPath)
          : (typeof pattern === 'string' ? item === pattern : pattern.exec(item))
          ? [relative ? path.relative(rootDir, fullPath) : path.resolve(cwd, currDir, item)]
          : []
      })
      .flat()
  }

  return find(pattern, dir, dir)
}
