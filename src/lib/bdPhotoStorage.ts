import { supabase } from './supabase';

export interface UploadPhotoResult {
  bucket: string;
  path: string;
  publicUrl: string | null;
}

function buildFilePath(userId: string | null, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prefix = userId ? `user_${userId}` : 'anon';
  return `${prefix}/${stamp}_${safeName}`;
}

export async function uploadBdPhotoIntakeImage(file: File, userId: string | null): Promise<UploadPhotoResult> {
  const bucket = 'bd-photo-intake';
  const path = buildFilePath(userId, file.name);

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
    cacheControl: '3600',
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? null;

  return { bucket, path, publicUrl };
}

