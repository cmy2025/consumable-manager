// types/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    username: string;
    // 可以根据需要添加更多自定义属性
  }
}