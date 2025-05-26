const sql = require('mssql');

const config = {
  server: 'localhost',
  port: 1433,
  user: 'mdcruzb',
  password: '12345678',
  database: 'PIA_Eventos',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let pool;

async function getPool() {
  if (pool) return pool;
  try {
    pool = await sql.connect(config);
    console.log('Conectado a SQL Server');
    return pool;
  } catch (err) {
    console.error('Error al conectar con la base de datos: ', err);
    throw err;
  }
}

module.exports = {
  sql,
  getPool,
};

