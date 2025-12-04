declare module '@prisma/client' {
  // Minimal ambient declaration to let the project compile when @prisma/client
  // types are not installed. This is a fallback — for full types, install
  // @prisma/client and run `npx prisma generate`.
  export class PrismaClient {
    [key: string]: any
    constructor(...args: any[])
    $on(event: string, callback: (e: any) => void): void
    $disconnect(): Promise<void>
  }
}
