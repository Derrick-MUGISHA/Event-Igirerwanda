/* Global test setup: load .env.local so integration tests (real Atlas,
   Cloudinary, Gmail) have the same credentials the app and seed use.
   Runs before any test module is imported, so route handlers that read env
   at load time see the right values. */
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI may inject env directly */
}
