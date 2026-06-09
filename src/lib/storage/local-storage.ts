/**
 * LocalStorage — the dev-mode `Storage`. Writes a file at
 * `public/uploads/analyzed/<hash>.<ext>` and returns `/uploads/analyzed/<hash>.<ext>`.
 *
 * Por qué `public/uploads/analyzed/` y no `./uploads/` (como antes):
 * Next.js sólo sirve estáticos desde `public/`. Escribir fuera de ahí
 * funcionaba en disco pero la URL devuelta daba 404 al renderizar la
 * imagen en `/historial/[id]` o `/analizar/[id]`. La carpeta `analyzed/`
 * sigue gitignored (ver `.gitignore`), sólo el sub-folder `seed/` se
 * commitea como dataset estable.
 *
 * Idempotente: si el archivo existe para el mismo hash, se reusa en vez
 * de re-escribirse — clave para el dedup-path de `persist`.
 */
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { mimeToExtension, type Storage, type StorageSaveResult } from './types';

export class LocalStorage implements Storage {
  private readonly baseDir: string;
  private readonly urlPrefix: string;

  /**
   * @param baseDir absolute path to the directory where files land. Defaults
   *   to `<cwd>/public/uploads/analyzed`. Tests pass a tmpdir.
   * @param urlPrefix public URL prefix returned with the path. Defaults to
   *   `/uploads/analyzed`. Tests can override for assertions.
   */
  constructor(
    baseDir = resolve(process.cwd(), 'public', 'uploads', 'analyzed'),
    urlPrefix = '/uploads/analyzed',
  ) {
    this.baseDir = baseDir;
    this.urlPrefix = urlPrefix;
  }

  async save(buffer: Buffer, mime: string, hash: string): Promise<StorageSaveResult> {
    const ext = mimeToExtension(mime);
    const filename = `${hash}.${ext}`;
    const absPath = join(this.baseDir, filename);

    if (!existsSync(absPath)) {
      await mkdir(this.baseDir, { recursive: true });
      await writeFile(absPath, buffer);
    }

    return {
      path: `${this.urlPrefix}/${filename}`,
      mime,
      bytes: buffer.length,
    };
  }
}
