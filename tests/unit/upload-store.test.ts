import { describe, expect, it } from 'vitest';
import { getUpload, saveUpload } from '@/server/uploads/upload-store';

describe('upload store', () => {
  it('saves and retrieves uploads', () => {
    const upload = saveUpload({
      name: 'brief.txt',
      size: 128,
      type: 'text/plain',
      content: 'Pan workspace brief',
    });

    expect(getUpload(upload.id)?.name).toBe('brief.txt');
  });
});
