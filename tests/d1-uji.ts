// D1 palsu di memori untuk menguji handler functions/api langsung di Node:
// node:sqlite menjalankan SQL yang sama persis seperti D1 (termasuk
// RETURNING, ON CONFLICT, dan batch atomik), jadi kontrak diuji sungguhan.
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const berkasSkema = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations', '0001_skema.sql')

/** Hasil statement D1: objek dengan all/first/run setelah bind. */
export type D1Terikat = {
  all: () => Promise<{ results: Record<string, unknown>[] }>
  first: () => Promise<Record<string, unknown> | null>
  run: () => Promise<{ success: boolean; meta: { changes: number } }>
}

export type D1Palsu = {
  prepare: (sql: string) => { bind: (...args: unknown[]) => D1Terikat }
  batch: (stmts: D1Terikat[]) => Promise<{ success: boolean; meta: { changes: number } }[]>
  eksekusi: (sql: string) => void
}

export function d1Palsu(): D1Palsu {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(berkasSkema, 'utf8'))

  const jalankan = (sql: string, args: unknown[]) => {
    const s = db.prepare(sql)
    return s.run(...(args as never[]))
  }

  const terikat = (sql: string, args: unknown[]): D1Terikat => ({
    all: async () => ({ results: db.prepare(sql).all(...(args as never[])) as Record<string, unknown>[] }),
    first: async () => (db.prepare(sql).get(...(args as never[])) as Record<string, unknown> | null) ?? null,
    run: async () => {
      const r = jalankan(sql, args)
      return { success: true, meta: { changes: Number(r.changes) } }
    },
  })

  return {
    prepare: (sql: string) => ({ bind: (...args: unknown[]) => terikat(sql, args) }),
    batch: async (stmts: D1Terikat[]) => {
      db.exec('BEGIN')
      const hasil: { success: boolean; meta: { changes: number } }[] = []
      try {
        for (const s of stmts) hasil.push(await s.run())
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
      return hasil
    },
    eksekusi: (sql: string) => db.exec(sql),
  }
}

/** Lingkungan handler dengan binding DB palsu. */
export function envD1(db: D1Palsu) {
  return { DB: db }
}
