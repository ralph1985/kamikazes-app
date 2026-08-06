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
  console.log(`Usage: node scripts/import-shopping-excel.mjs [options]

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

const products = readShoppingRows(source).map((row) => normalizeProduct(row, year));
console.log(
  JSON.stringify(
    {
      mode: args.write ? "write" : "analysis",
      source: path.basename(source),
      year,
      ...buildReport(products),
    },
    null,
    2,
  ),
);

if (!args.write) {
  console.log("Analysis complete: no database writes performed.");
  process.exit(0);
}

const result = await importProducts(neon(databaseUrl), year, products);
console.log(JSON.stringify({ imported: result }, null, 2));

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

function readShoppingRows(source) {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "kamikazes-shopping-import-"));
  try {
    execFileSync("unzip", ["-q", source, "-d", temporaryDirectory], { stdio: "inherit" });
    const xmlDirectory = path.join(temporaryDirectory, "xl");
    const read = (file) => fs.readFileSync(path.join(xmlDirectory, file), "utf8");
    const sharedStrings = [...read("sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map(
      (match) => innerText(match[1]),
    );
    const worksheet = read("worksheets/sheet2.xml");
    const rows = [...worksheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((match) => {
      const values = {};
      let sourceRow = null;
      for (const cell of match[1].matchAll(/<c\b[^>]*r="([A-Z]+\d+)"[^>]*>[\s\S]*?<\/c>/g)) {
        const reference = cell[1];
        values[reference.replace(/\d+$/, "")] = cellValue(cell[0], sharedStrings);
        sourceRow ??= Number(reference.match(/\d+$/)?.[0]);
      }
      return { sourceRow, values };
    });
    const headerIndex = rows.findIndex((row) => row.values.A === "Lugar de Compra");
    if (headerIndex < 0) throw new Error("Sheet 'Lista compra 2026' has no shopping-list header");
    return rows
      .slice(headerIndex + 1)
      .filter((row) => row.values.D !== undefined)
      .map((row) => ({ sourceRow: row.sourceRow, ...row.values }));
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
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

function normalizeProduct(row, year) {
  const status = {
    "": "pending",
    Pendiente: "pending",
    "No se compró en 2025": "not_buying",
    "Regalado de 2024": "gifted",
  }[String(row.I ?? "").trim()];
  if (!status)
    throw new Error(`Unsupported shopping status on Excel row ${row.sourceRow}: ${row.I}`);
  const product = {
    sourceRow: row.sourceRow,
    id: stableUuid(`shopping-product:${year}:${row.sourceRow}`),
    description: String(row.D ?? "").trim(),
    category: String(row.B ?? "").trim() || null,
    store: String(row.A ?? "").trim() || null,
    assignment: String(row.C ?? "").trim() || null,
    plannedQuantity: numberOrNull(row.E),
    plannedUnitPrice: numberOrNull(row.F),
    notes: String(row.H ?? "").trim() || null,
    status,
  };
  if (!product.description) throw new Error(`Missing description on Excel row ${row.sourceRow}`);
  if (product.notes && product.notes.length > 1000)
    throw new Error(`Notes exceed 1000 characters on Excel row ${row.sourceRow}`);
  return product;
}

function numberOrNull(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!normalized) return null;
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`Invalid numeric value: ${value}`);
  return number;
}

function buildReport(products) {
  const count = (key) =>
    [...new Set(products.map((product) => product[key]).filter(Boolean))].length;
  return {
    products: products.length,
    categories: count("category"),
    stores: count("store"),
    assignments: count("assignment"),
    statuses: Object.fromEntries(
      [...new Set(products.map((product) => product.status))].map((status) => [
        status,
        products.filter((product) => product.status === status).length,
      ]),
    ),
    plannedWithoutQuantity: products.filter((product) => product.plannedQuantity === null).length,
    plannedWithoutPrice: products.filter((product) => product.plannedUnitPrice === null).length,
  };
}

async function importProducts(sql, year, products) {
  const [edition] = await sql`select id, status from editions where year = ${year} limit 1`;
  if (!edition) throw new Error(`Edition ${year} does not exist`);
  if (edition.status === "closed") throw new Error(`Edition ${year} is closed`);
  const existingCategories =
    await sql`select id, name from shopping_categories where edition_id = ${edition.id}`;
  const existingStores =
    await sql`select id, name from shopping_stores where edition_id = ${edition.id}`;
  const categories = new Map(existingCategories.map((row) => [row.name, row.id]));
  const stores = new Map(existingStores.map((row) => [row.name, row.id]));
  const categoryValues = [
    ...new Set(products.map((product) => product.category).filter(Boolean)),
  ].map((name) => ({
    id: categories.get(name) ?? stableUuid(`shopping-category:${year}:${name}`),
    name,
  }));
  const storeValues = [...new Set(products.map((product) => product.store).filter(Boolean))].map(
    (name) => ({
      id: stores.get(name) ?? stableUuid(`shopping-store:${year}:${name}`),
      name,
    }),
  );
  for (const category of categoryValues) categories.set(category.name, category.id);
  for (const store of storeValues) stores.set(store.name, store.id);

  const queries = [
    ...categoryValues.map(
      (category) => sql`
      insert into shopping_categories (id, edition_id, name)
      values (${category.id}, ${edition.id}, ${category.name})
      on conflict (id) do update set name = excluded.name, updated_at = now()
    `,
    ),
    ...storeValues.map(
      (store) => sql`
      insert into shopping_stores (id, edition_id, name)
      values (${store.id}, ${edition.id}, ${store.name})
      on conflict (id) do update set name = excluded.name, updated_at = now()
    `,
    ),
    ...products.map(
      (product) => sql`
      insert into shopping_products (
        id, edition_id, description, category_id, store_id, assignment,
        planned_quantity, real_quantity, planned_unit_price, real_unit_price,
        notes, status
      ) values (
        ${product.id}, ${edition.id}, ${product.description},
        ${product.category ? categories.get(product.category) : null},
        ${product.store ? stores.get(product.store) : null},
        ${product.assignment}, ${product.plannedQuantity}, null,
        ${product.plannedUnitPrice}, null, ${product.notes}, ${product.status}
      )
      on conflict (id) do update set
        description = excluded.description,
        category_id = excluded.category_id,
        store_id = excluded.store_id,
        assignment = excluded.assignment,
        planned_quantity = excluded.planned_quantity,
        planned_unit_price = excluded.planned_unit_price,
        notes = excluded.notes,
        status = excluded.status,
        updated_at = now()
    `,
    ),
  ];
  await sql.transaction(queries);
  return {
    editionId: edition.id,
    categories: categoryValues.length,
    stores: storeValues.length,
    products: products.length,
  };
}

function stableUuid(value) {
  const bytes = crypto.createHash("sha256").update(value).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
