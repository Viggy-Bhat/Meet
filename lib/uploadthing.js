import { createUploadthing } from "uploadthing/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const f = createUploadthing();

export const ourFileRouter = {
  recordingUploader: f({
    audio: { maxFileSize: "500MB" },
    video: { maxFileSize: "500MB" },
  })
    .middleware(async () => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async () => {
      return { uploaded: true };
    }),
};
