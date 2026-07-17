/* Vite injects import.meta.glob at build time; declare it so tsc accepts the
   route-discovery smoke test without pulling in the full vite/client types. */
interface ImportMeta {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}
