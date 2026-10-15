// API minima BeachIn su OCI: affianca Supabase, legge la config DB dai metadati dell'istanza.
import http from 'node:http'
import oracledb from 'oracledb'

const PORT = 3000
let pool = null

async function metadati() {
  const r = await fetch('http://169.254.169.254/opc/v2/instance/metadata/', {
    headers: { Authorization: 'Bearer Oracle' },
  })
  return r.json()
}

async function getPool() {
  if (pool) return pool
  const m = await metadati()
  if (!m.db_connect) throw new Error('DB non ancora configurato (metadati db_* assenti)')
  pool = await oracledb.createPool({
    user: m.db_user,
    password: m.db_password,
    connectString: m.db_connect,
    poolMin: 0,
    poolMax: 4,
  })
  return pool
}

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

http
  .createServer(async (req, res) => {
    if (req.url === '/api/health') {
      try {
        const conn = await (await getPool()).getConnection()
        try {
          const r = await conn.execute(
            `select to_char(systimestamp, 'YYYY-MM-DD"T"HH24:MI:SSTZH:TZM') ora, banner_full versione from v$version`,
          )
          const [ora, versione] = r.rows[0]
          json(res, 200, { ok: true, db: { ora, versione } })
        } finally {
          await conn.close()
        }
      } catch (e) {
        pool = null
        json(res, 503, { ok: false, errore: String(e.message || e) })
      }
      return
    }
    json(res, 404, { ok: false, errore: 'non trovato' })
  })
  .listen(PORT, '127.0.0.1', () => console.log(`beachin-api su :${PORT}`))
