import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type UploadedAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  contentPath: string;
};

const UPLOAD_DIR = '/opt/projects/pan-ui/.data/uploads';

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function metaPath(id: string) {
  return path.join(UPLOAD_DIR, `${id}.json`);
}

function contentPath(id: string) {
  return path.join(UPLOAD_DIR, `${id}.bin`);
}

export function saveUpload(file: { name: string; size: number; type: string; content: string }) {
  ensureDir();
  const id = crypto.randomUUID();
  const binaryPath = contentPath(id);
  fs.writeFileSync(binaryPath, file.content, 'utf-8');
  const upload: UploadedAttachment = {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    content: file.content,
    contentPath: binaryPath,
  };
  fs.writeFileSync(metaPath(upload.id), JSON.stringify({ ...upload, content: undefined }), 'utf-8');
  return upload;
}

export function getUpload(id: string) {
  ensureDir();
  const filePath = metaPath(id);
  if (!fs.existsSync(filePath)) return null;
  const meta = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Omit<UploadedAttachment, 'content'> & { content?: string };
  const content = fs.existsSync(meta.contentPath) ? fs.readFileSync(meta.contentPath, 'utf-8') : '';
  return { ...meta, content } as UploadedAttachment;
}
