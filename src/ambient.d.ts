declare module '*/_worker.js' {
  const app: ExportedHandler<Cloudflare.Env>;
  export default app;
}
