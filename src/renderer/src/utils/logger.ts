// 日志工具类，解决中文乱码问题
class Logger {
  private static encode(message: unknown): string {
    if (typeof message === 'string') {
      // 确保字符串以 UTF-8 编码
      return message
    }
    return JSON.stringify(message, null, 2)
  }

  static log(...args: unknown[]): void {
    const encodedArgs = args.map((arg) => this.encode(arg))
    console.log(...encodedArgs)
  }

  static error(...args: unknown[]): void {
    const encodedArgs = args.map((arg) => this.encode(arg))
    console.error(...encodedArgs)
  }

  static warn(...args: unknown[]): void {
    const encodedArgs = args.map((arg) => this.encode(arg))
    console.warn(...encodedArgs)
  }

  static info(...args: unknown[]): void {
    const encodedArgs = args.map((arg) => this.encode(arg))
    console.info(...encodedArgs)
  }

  static debug(...args: unknown[]): void {
    const encodedArgs = args.map((arg) => this.encode(arg))
    console.debug(...encodedArgs)
  }
}

export default Logger
