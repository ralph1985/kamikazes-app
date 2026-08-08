#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import process from "node:process";
import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";

const DEFAULT_SOURCE = path.resolve(
  process.cwd(),
  "../buy-buddies-jules/Presupuesto Kamikazes 2026.xlsx",
);
const args = parseArgs(process.argv.slice(2));
const targetYear = Number(args.targetYear ?? 2026);
const sourceYear = Number(args.sourceYear ?? 2025);
const source = args.source ?? DEFAULT_SOURCE;
const locationName = args.location ?? "Pendiente de ubicar";

if (args.help) {
  console.log(`Usage: node scripts/import-leftovers-excel.mjs [options]

Options:
  --source <file>          Excel source (default: ../buy-buddies-jules/Presupuesto Kamikazes 2026.xlsx)
  --target-year <year>     Edition receiving the leftovers (default: 2026)
  --source-year <year>     Edition the leftovers came from (default: 2025)
  --location <name>        Target location (default: Pendiente de ubicar)
  --env-file <file>        Private environment file containing DATABASE_URL
  --write                  Write the idempotent import to Neon
  --help                   Show this help

The default mode is analysis only. The original Excel is never copied into the repository.
`);
  process.exit(0);
}

if (!fs.existsSync(source)) throw new Error(`Excel source not found: ${source}`);
for (const year of [targetYear, sourceYear]) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100)
    throw new Error(`Invalid year: ${year}`);
}
if (!locationName.trim()) throw new Error("Location cannot be empty");

if (args.envFile) dotenv.config({ path: args.envFile, quiet: true, override: true });
const databaseUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;
if (args.write && (!databaseUrl || databaseUrl.includes("user:password"))) {
  throw new Error("A real DATABASE_URL or POSTGRES_URL_NON_POOLING is required for --write");
}

const entries = readLeftovers(source, sourceYear);
console.log(
  JSON.stringify(
    {
      mode: args.write ? "write" : "analysis",
      source: path.basename(source),
      sourceSheet: `Sobras fiestas ${sourceYear}`,
      targetYear,
      sourceYear,
      location: locationName,
      sourceRows: entries.map((entry) => entry.sourceRow),
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
  JSON.stringify(
    {
      imported: await importLeftovers(
        neon(databaseUrl),
        targetYear,
        sourceYear,
        locationName,
        entries,
      ),
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--help") parsed.help = true;
    else if (arg === "--write") parsed.write = true;
    else if (
      ["--source", "--target-year", "--source-year", "--location", "--env-file"].includes(arg)
    ) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
      parsed[key] = argv[++index];
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function readLeftovers(sourcePath, year) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kamikazes-leftovers-import-"));
  try {
    execFileSync("unzip", ["-q", sourcePath, "-d", temporaryDirectory], { stdio: "inherit" });
    const xmlDirectory = path.join(temporaryDirectory, "xl");
    const read = (file) => fs.readFileSync(path.join(xmlDirectory, file), "utf8");
    const sharedStrings = [...read("sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
      (match) => innerText(match[1]),
    );
    const workbook = read("workbook.xml");
    const relationshipXml = read("_rels/workbook.xml.rels");
    const relationshipById = new Map(
      [...relationshipXml.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [
        match[1],
        match[2],
      ]),
    );
    const sheet = workbook.match(new RegExp(`name="Sobras fiestas ${year}"[^>]*r:id="([^"]+)"`));
    if (!sheet) throw new Error(`Sheet 'Sobras fiestas ${year}' not found`);
    const worksheet = read(relationshipById.get(sheet[1]));
    const rows = [...worksheet.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)].map(
      (match) => {
        const values = {};
        for (const cell of match[2].matchAll(/<c\b[^>]*r="([A-Z]+\d+)"[^>]*>[\s\S]*?<\/c>/g)) {
          values[cell[1].replace(/\d+$/, "")] = cellValue(cell[0], sharedStrings);
        }
        return { rowNumber: Number(match[1]), values };
      },
    );
    const headers = rows[0]?.values ?? {};
    const columns = Object.fromEntries(
      Object.entries(headers).map(([column, value]) => [
        String(value).trim().toLowerCase(),
        column,
      ]),
    );
    const productColumn = columns["¿qué sobró?"] ?? columns["qué sobró?"] ?? "A";
    const quantityColumn = columns.cantidad ?? "B";
    const notesColumn = columns.notas ?? "C";
    const entries = [];
    for (const row of rows.slice(1)) {
      const productName = String(row.values[productColumn] ?? "").trim();
      if (!productName) continue;
      const rawQuantity = String(row.values[quantityColumn] ?? "").trim();
      const parsed = parseQuantity(rawQuantity);
      const sourceNotes = String(row.values[notesColumn] ?? "").trim();
      const notes = [
        `Cantidad original en Excel: ${rawQuantity}`,
        "La fuente no indica ubicación; pendiente de confirmar.",
        sourceNotes,
      ]
        .filter(Boolean)
        .join(" ");
      entries.push({
        sourceRow: row.rowNumber,
        productName,
        quantity: parsed.quantity,
        notes,
      });
    }
    return entries;
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseQuantity(raw) {
  const numeric = Number(raw.replace(",", "."));
  if (raw && Number.isFinite(numeric) && numeric > 0) return { quantity: numeric };
  const leading = raw.match(/^(\d+(?:[.,]\d+)?)/);
  if (!leading) throw new Error(`Invalid leftover quantity: ${raw}`);
  const quantity = Number(leading[1].replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0)
    throw new Error(`Invalid leftover quantity: ${raw}`);
  return { quantity };
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

async function importLeftovers(sql, targetYearValue, sourceYearValue, targetLocationName, entries) {
  const [targetEdition] =
    await sql`select id, status from editions where year = ${targetYearValue} limit 1`;
  const [sourceEdition] =
    await sql`select id from editions where year = ${sourceYearValue} limit 1`;
  if (!targetEdition) throw new Error(`Edition ${targetYearValue} does not exist`);
  if (!sourceEdition) throw new Error(`Edition ${sourceYearValue} does not exist`);
  if (targetEdition.status === "closed") throw new Error(`Edition ${targetYearValue} is closed`);

  const [actor] = await sql`
    select member_id
    from role_assignments
    where role = 'admin' and area = 'global' and edition_id is null
    limit 1
  `;
  if (!actor) throw new Error("No global administrator available for audit");
  const [existingLocation] = await sql`
    select id from inventory_locations where edition_id = ${targetEdition.id} and name = ${targetLocationName} limit 1
  `;
  const locationId =
    existingLocation?.id ??
    stableUuid(`inventory-location:${targetYearValue}:${targetLocationName}`);
  const existingLocations = existingLocation ? 0 : 1;
  const existingItems = await sql`
    select id, product_name, source_edition_id
    from leftovers
    where edition_id = ${targetEdition.id} and location_id = ${locationId}
  `;
  const itemIds = new Map(
    existingItems.map((item) => [
      `${item.source_edition_id ?? "null"}\u0000${item.product_name}`,
      item.id,
    ]),
  );
  const queries = [];
  if (!existingLocation) {
    queries.push(sql`
      insert into inventory_locations (id, edition_id, name)
      values (${locationId}, ${targetEdition.id}, ${targetLocationName})
      on conflict (id) do nothing
    `);
  }
  for (const entry of entries) {
    const id =
      itemIds.get(`${sourceEdition.id}\u0000${entry.productName}`) ??
      stableUuid(
        `leftover:${targetYearValue}:${sourceYearValue}:${targetLocationName}:${entry.productName}`,
      );
    const afterValue = {
      editionId: targetEdition.id,
      sourceEditionId: sourceEdition.id,
      locationId,
      productName: entry.productName,
      quantity: entry.quantity.toFixed(2),
      status: "available",
      notes: entry.notes,
      sourceRow: entry.sourceRow,
    };
    queries.push(sql`
      insert into leftovers (id, edition_id, source_edition_id, location_id, product_name, quantity, status, notes)
      values (${id}, ${targetEdition.id}, ${sourceEdition.id}, ${locationId}, ${entry.productName}, ${entry.quantity.toFixed(2)}, 'available', ${entry.notes})
      on conflict (id) do update set
        source_edition_id = excluded.source_edition_id,
        location_id = excluded.location_id,
        product_name = excluded.product_name,
        quantity = excluded.quantity,
        status = excluded.status,
        notes = excluded.notes,
        updated_at = now()
    `);
    queries.push(sql`
      insert into audit_events (id, member_id, action, area, entity, entity_id, before_value, after_value)
      values (${stableUuid(`leftover-audit:${id}:${entry.sourceRow}`)}, ${actor.member_id}, 'import', 'shopping', 'leftover', ${id}, null, ${JSON.stringify(afterValue)}::jsonb)
      on conflict (id) do nothing
    `);
  }
  if (!existingLocation) {
    queries.push(sql`
      insert into audit_events (id, member_id, action, area, entity, entity_id, before_value, after_value)
      values (${stableUuid(`location-audit:${locationId}`)}, ${actor.member_id}, 'import', 'shopping', 'inventory_location', ${locationId}, null, ${JSON.stringify({ editionId: targetEdition.id, name: targetLocationName })}::jsonb)
      on conflict (id) do nothing
    `);
  }
  await sql.transaction(queries);
  return {
    editionId: targetEdition.id,
    sourceEditionId: sourceEdition.id,
    locationId,
    locations: existingLocations,
    items: entries.length,
  };
}

function stableUuid(value) {
  const bytes = crypto.createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
