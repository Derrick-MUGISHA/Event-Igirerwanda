import { v2 as cloudinary } from "cloudinary";

/* Configure lazily on first use so the credentials are read at call time —
   the app injects env before modules run, but the seed (tsx) loads .env.local
   after the hoisted imports evaluate, so top-level config would miss them. */
let configured = false;
function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  configured = true;
}

function uploadOnce(buffer: Buffer, folder: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `iems/${folder}`,
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit" }],
          timeout: 120000,
        },
        (err, res) => (err || !res ? reject(err ?? new Error("upload failed")) : resolve(res.secure_url))
      )
      .end(buffer);
  });
}

/* liveness check for the health-check script — resolves the account status
   without uploading anything. Throws on auth/connectivity failure. */
export async function pingCloudinary(): Promise<{ status: string }> {
  ensureConfigured();
  return cloudinary.api.ping();
}

export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  ensureConfigured();
  /* one retry — the upload can time out on a slow/flaky connection */
  try {
    return await uploadOnce(buffer, folder);
  } catch {
    return await uploadOnce(buffer, folder);
  }
}
