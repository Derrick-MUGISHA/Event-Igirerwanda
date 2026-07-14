import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(buffer: Buffer, folder: string): Promise<string> {
  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `iems/${folder}`,
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit" }],
        },
        (err, res) => (err || !res ? reject(err ?? new Error("upload failed")) : resolve(res))
      )
      .end(buffer);
  });
  return result.secure_url;
}
