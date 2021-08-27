import * as chalk from 'chalk'
import { config } from './config'

export function format(message: string, ...params: Array<number | string>): string {
  return message.replace(
    /\{(black|red|green|yellow|blue|magenta|cyan|white|gray|grey|blackBright|redBright|greenBright|yellowBright|blueBright|magentaBright|cyanBright|whiteBright|)\}/g,
    (match, color) => {
      const param = params.shift() ?? panicRaw(`In message:\n> ${message}\nMissing parameter:\n> ${match}`)
      return color && config.noColor !== false ? (chalk as any)[color](param) : param
    }
  )
}

export function panicRaw(message: string): never {
  console.error(chalk.redBright('ERROR: ' + message))
  process.exit(1)
}

export function panic(message: string, ...params: Array<number | string>): never {
  panicRaw(format(message, ...params))
}

export function unreachable(message: string, ...params: Array<number | string>): never {
  panicRaw(format(message, ...params))
}

export function warn(message: string, ...params: Array<number | string>) {
  console.warn(chalk.yellow(format(message, ...params)))
}

export function println(message: string, ...params: Array<number | string>) {
  console.log(format(message, ...params))
}

export function debug(message: string, ...params: Array<number | string>) {
  if (config.verbose) {
    console.warn(chalk.cyan(format(message, ...params)))
  }
}
