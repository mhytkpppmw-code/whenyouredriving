import { randomUUID } from "crypto";
import { readData, runExclusive, writeData } from "@/lib/db";
import type { Manufacturer } from "@/lib/types";
import { sanitizeInput } from "@/lib/lyric";

export function normalizeManufacturerName(name: string): string {
  return sanitizeInput(name);
}

export function manufacturerKey(name: string): string {
  return normalizeManufacturerName(name).toLowerCase();
}

export async function getOrCreateManufacturer(name: string): Promise<Manufacturer> {
  const normalized = normalizeManufacturerName(name);
  if (!normalized) {
    throw new Error("Manufacturer is required.");
  }

  return runExclusive(async () => {
    const data = await readData();
    const key = manufacturerKey(normalized);
    const existing = data.manufacturers.find((m) => m.name.toLowerCase() === key);
    if (existing) return existing;

    const manufacturer: Manufacturer = {
      id: randomUUID(),
      name: normalized,
      createdAt: new Date().toISOString(),
    };
    data.manufacturers.push(manufacturer);
    await writeData(data);
    return manufacturer;
  });
}

export function findManufacturerById(
  manufacturers: Manufacturer[],
  id: string
): Manufacturer | undefined {
  return manufacturers.find((m) => m.id === id);
}
