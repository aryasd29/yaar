/** Resize and compress a photo in the browser before saving it (keeps storage small and uploads fast). */
export async function compressImage(file: File, maxSide = 960, quality = 0.8): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image. Try a JPG, PNG or HEIC photo.");
  if (file.size > 20 * 1024 * 1024) throw new Error("That photo is over 20 MB. Try a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("We couldn't read that photo. Try another one."));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
