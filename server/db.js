import pg from "pg";

// Tiger Data is Postgres, so a plain `pg` Pool is the whole client.
export const pool = new pg.Pool({ connectionString: process.env.TIGER_DATA_URL });
