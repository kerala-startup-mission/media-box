function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Only images carry bytes. A PDF arrives as metadata alone, so the backend
 * records its filename but cannot place it in Drive - unchanged from the
 * original behaviour.
 */
export async function serializeUpload(file) {
  const attachment = {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size
  };

  if (attachment.type.startsWith("image/")) {
    attachment.dataUrl = await fileToDataUrl(file);
  }

  return attachment;
}

export function serializeUploads(files) {
  return Promise.all(Array.from(files || []).map((file) => serializeUpload(file)));
}
