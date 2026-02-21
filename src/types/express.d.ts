declare module 'express' {
  export interface Request {
    params: Record<string, string>;
    query: Record<string, string>;
    body: any;
    headers: Record<string, string>;
  }
  
  export interface Response {
    status(code: number): this;
    json(body: any): this;
    send(): this;
  }
  
  export interface Router {
    get(path: string, handler: (req: Request, res: Response) => void): this;
    post(path: string, handler: (req: Request, res: Response) => void): this;
    put(path: string, handler: (req: Request, res: Response) => void): this;
    delete(path: string, handler: (req: Request, res: Response) => void): this;
    use(handler: (req: Request, res: Response, next: () => void) => void): this;
  }
  
  export function Router(): Router;
}
