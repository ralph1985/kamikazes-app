import fs from "node:fs";
import { execFileSync } from "node:child_process";
import argon2 from "argon2";
import { parse } from "dotenv";

const [envFile, displayName, username] = process.argv.slice(2);
const password = process.env.INITIAL_PASSWORD;

if (!envFile || !displayName || !username || !password) {
  throw new Error(
    "Uso: INITIAL_PASSWORD=... node scripts/provision-initial-account.mjs ENV_FILE DISPLAY_NAME USERNAME",
  );
}

const env = { ...process.env, ...parse(fs.readFileSync(envFile, "utf8")) };
const databaseUrl = env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
if (!databaseUrl) throw new Error("No database URL found");
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;

const existing = execFileSync(
  "psql",
  [databaseUrl, "-X", "-Atc", `select count(*) from accounts where username = ${quote(username)};`],
  { env },
)
  .toString()
  .trim();
if (existing !== "0") throw new Error(`Username already exists: ${username}`);

const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
const sql = [
  "begin;",
  `with new_member as (insert into members (display_name) values (${quote(displayName)}) returning id)`,
  `insert into accounts (member_id, username, password_hash, is_active, must_change_password, failed_login_attempts)`,
  `select id, ${quote(username)}, ${quote(passwordHash)}, true, true, 0 from new_member;`,
  "commit;",
].join("\n");

execFileSync("psql", [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1"], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
  env,
});

console.log(`Created initial account ${username} for ${displayName}; password change required.`);
