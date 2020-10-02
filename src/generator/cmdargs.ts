export interface CmdArgs {
  readonly input: string
  readonly output: string
  readonly configScriptPath: string
  readonly configNameToImport?: string
  readonly allowAllImportExt: boolean
  readonly prettify: boolean
  readonly prettierConfig?: string
}
