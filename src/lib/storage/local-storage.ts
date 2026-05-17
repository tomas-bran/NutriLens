/**
 * LocalStorage — the dev-mode `Storage`. Writes to `./uploads/<hash>.<ext>`
 * (gitignored) and returns `/uploads/<hash>.<ext>` so the URL can be served
 * by Next.js as a static path.
 *
 * Idempotent: if the file already exists for the same hash, re-uses it
 * instead of overwriting — saves disk writes when re-uploads hit the
 * dedup path in `persist`.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { mimeToExtension, type Storage } from './types';

export class LocalStorage implements Storage {
  private readonly baseDir: string;
  private readonly urlPrefix: string;

  /**
   * @param baseDir absolute path to the directory where files land. Defaults
   *   to `<cwd>/uploads`. Tests pass a tmpdir.
   * @param urlPrefix public URL prefix returned with the path. Defaults to
   *   `/uploads`. Tests can override for assertions.
   */
  constructor(baseDir = resolve(process.cwd(), 'uploads'), urlPrefix = '/uploads') {
    this.baseDir = baseDir;
    this.urlPrefix = urlPrefix;
  }

  async save(buffer: Buffer, mime: string, hash: string): Promise<string> {
    const ext = mimeToExtension(mime);
    const filename = `${hash}.${ext}`;
    const absPath = join(this.baseDir, filename);

    if (!existsSync(absPath)) {
      await mkdir(this.baseDir, { recursive: true });
      await writeFile(absPath, buffer);
    }

    return `${this.urlPrefix}/${filename}`;
  }
}
