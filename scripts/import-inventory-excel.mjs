#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

const DEFAULT_SOURCE = path.resolve(
  process.cwd(),
  "../buy-buddies-jules/Presupuesto Kamikazes 2026.xlsx",
);
const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node scripts/import-inventory-excel.mjs [options]

Options:
  --source <file>       Excel source (default: ../buy-buddies-jules/Presupuesto Kamikazes 2026.xlsx)
  --env-file <file>     Private environment file containing DATABASE_URL
  --year <year>         Edition year (default: 2026)
  --write               Write the idempotent import to Neon
  --help                Show this help

The default mode is analysis only. The original Excel is never copied into the repository.
`);
  process.exit(0);
}

const year = Number(args.year ?? 2026);
if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error("Invalid --year");
const source = args.source ?? DEFAULT_SOURCE;
if (!fs.existsSync(source)) throw new Error(`Excel source not found: ${source}`);

if (args.envFile) dotenv.config({ path: args.envFile, quiet: true, override: true });
const databaseUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (args.write && (!databaseUrl || databaseUrl.includes("user:password"))) {
  throw new Error("A real DATABASE_URL or POSTGRES_URL_NON_POOLING is required for --write");
}

const entries = readInventoryEntries(source, year);
console.log(
  JSON.stringify(
    {
      mode: args.write ? "write" : "analysis",
      source: path.basename(source),
      year,
      locations: [...new Set(entries.map((entry) => entry.location))].length,
      items: entries.length,
      entries,
    },
    null,
    2,
  ),
);

if (!args.write) {
  console.log("Analysis complete: no database writes performed.");
  process.exit(0);
}

console.log(
  JSON.stringify({ imported: await importInventory(neon(databaseUrl), year, entries) }, null, 2),
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--help") parsed.help = true;
    else if (arg === "--write") parsed.write = true;
    else if (["--source", "--env-file", "--year"].includes(arg)) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
      parsed[key] = argv[++index];
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function readInventoryEntries(source, year) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kamikazes-inventory-import-"));
  try {
    execFileSync("unzip", ["-q", source, "-d", temporaryDirectory], { stdio: "inherit" });
    const xmlDirectory = path.join(temporaryDirectory, "xl");
    const read = (file) => fs.readFileSync(path.join(xmlDirectory, file), "utf8");
    const sharedStrings = [...read("sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
      (match) => innerText(match[1]),
    );
    const worksheet = read("worksheets/sheet5.xml");
    const rows = [...worksheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(
      (match) => {
        const values = {};
        for (const cell of match[2].matchAll(/<c\b[^>]*r="([A-Z]+\d+)"[^>]*>[\s\S]*?<\/c>/g)) {
          const reference = cell[1];
          values[reference.replace(/\d+$/, "")] = cellValue(cell[0], sharedStrings);
        }
        return { rowNumber: Number(match[1]), values };
      },
    );
    const headers = rows[0]?.values ?? {};
    const columns = Object.entries(headers).filter(([, value]) => String(value).trim());
    if (!columns.length) throw new Error("Sheet 'Inventario' has no location headers");
    const entries = [];
    for (const row of rows.slice(1)) {
      for (const [column, locationValue] of columns) {
        const raw = String(row.values[column] ?? "").trim();
        if (!raw) continue;
        const parsed = parseInventoryCell(raw);
        entries.push({
          sourceRow: row.rowNumber,
          location: String(locationValue).trim(),
          productName: parsed.productName,
          quantity: parsed.quantity,
          id: stableUuid(`inventory-item:${year}:${locationValue}:${parsed.productName}`),
        });
      }
    }
    const duplicateKeys = new Set();
    for (const entry of entries) {
      const key = `${entry.location}\u0000${entry.productName}`;
      if (duplicateKeys.has(key))
        throw new Error(`Duplicate inventory entry: ${entry.location} / ${entry.productName}`);
      duplicateKeys.add(key);
    }
    return entries;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseInventoryCell(raw) {
  const leading = raw.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (leading) return { quantity: numberOrNull(leading[1]), productName: leading[2].trim() };
  const trailing = raw.match(/^(.+?)\s+\((\d+(?:[.,]\d+)?)\)$/);
  if (trailing) return { quantity: numberOrNull(trailing[2]), productName: trailing[1].trim() };
  return { quantity: 1, productName: raw };
}

function numberOrNull(value) {
  const number = Number(String(value).replace(",", "."));
  if (!Number.isFinite(number) || number <= 0)
    throw new Error(`Invalid inventory quantity: ${value}`);
  return number;
}

function cellValue(cell, sharedStrings) {
  const type = cell.match(/\bt="([^"]+)"/)?.[1];
  const value = cell.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "";
  if (type === "s") return sharedStrings[Number(value)] ?? "";
  if (type === "inlineStr") return innerText(cell);
  return decodeXml(value);
}

function innerText(xml) {
  return [...xml.matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function decodeXml(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

async function importInventory(sql, year, entries) {
  const [edition] = await sql`select id, status from editions where year = ${year} limit 1`;
  if (!edition) throw new Error(`Edition ${year} does not exist`);
  if (edition.status === "closed") throw new Error(`Edition ${year} is closed`);

  const existingLocations = await sql`
    select id, name from inventory_locations where edition_id = ${edition.id}
  `;
  const locationIds = new Map(existingLocations.map((location) => [location.name, location.id]));
  const locationValues = [...new Set(entries.map((entry) => entry.location))].map((name) => ({
    id: locationIds.get(name) ?? stableUuid(`inventory-location:${year}:${name}`),
    name,
  }));
  for (const location of locationValues) locationIds.set(location.name, location.id);

  const existingItems = await sql`
    select id, location_id, product_name
    from inventory_items
    where edition_id = ${edition.id}
  `;
  const itemIds = new Map(
    existingItems.map((item) => [`${item.location_id}\u0000${item.product_name}`, item.id]),
  );
  const queries = [
    ...locationValues.map(
      (location) => sql`
        insert into inventory_locations (id, edition_id, name)
        values (${location.id}, ${edition.id}, ${location.name})
        on conflict (id) do update set name = excluded.name, updated_at = now()
      `,
    ),
    ...entries.map((entry) => {
      const locationId = locationIds.get(entry.location);
      const itemId = itemIds.get(`${locationId}\u0000${entry.productName}`) ?? entry.id;
      return sql`
        insert into inventory_items (id, edition_id, location_id, product_name, quantity, notes)
        values (${itemId}, ${edition.id}, ${locationId}, ${entry.productName}, ${entry.quantity.toFixed(2)}, null)
        on conflict (id) do update set
          location_id = excluded.location_id,
          product_name = excluded.product_name,
          quantity = excluded.quantity,
          updated_at = now()
      `;
    }),
  ];
  await sql.transaction(queries);
  return { editionId: edition.id, locations: locationValues.length, items: entries.length };
}

function stableUuid(value) {
  const bytes = crypto.createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
