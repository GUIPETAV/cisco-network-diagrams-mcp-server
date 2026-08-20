import { readFileSync } from "node:fs";
import path from "node:path";
import { ASSETS_DIR, ICONS_JSON_PATH } from "../constants.js";
import type { IconCatalog, IconEntry } from "../types.js";

/**
 * Loads and indexes the Cisco icon catalog once at module load time.
 * The catalog is small (~300 entries, no image bytes), so it is safe
 * to keep fully in memory. Image bytes are read from disk lazily,
 * only when a specific icon is requested via get_icon.
 */
class IconStore {
  private readonly catalog: IconCatalog;
  private readonly byId: Map<string, IconEntry>;

  constructor() {
    const raw = readFileSync(ICONS_JSON_PATH, "utf-8");
    this.catalog = JSON.parse(raw) as IconCatalog;
    this.byId = new Map(this.catalog.icons.map((icon) => [icon.id, icon]));
  }

  getCategories(): Record<string, string> {
    return this.catalog.categories;
  }

  getTotalCount(): number {
    return this.catalog.icons.length;
  }

  getById(id: string): IconEntry | undefined {
    return this.byId.get(id);
  }

  /**
   * Normalizes a search term: lowercase, strips accents. Cisco's original
   * names are in English, so callers should try both the Portuguese term
   * and a plausible English equivalent if the first search comes up empty.
   */
  private normalize(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  search(query: string, options: { curatedOnly?: boolean; category?: string } = {}): IconEntry[] {
    const q = this.normalize(query);
    return this.catalog.icons.filter((icon) => {
      if (options.curatedOnly && !icon.curated) return false;
      if (options.category && icon.category !== options.category) return false;
      const haystack = this.normalize(
        [icon.id, icon.name, icon.glossary_name, icon.description, icon.function, icon.when_to_use]
          .filter(Boolean)
          .join(" ")
      );
      return haystack.includes(q);
    });
  }

  list(options: { curatedOnly?: boolean; category?: string } = {}): IconEntry[] {
    return this.catalog.icons.filter((icon) => {
      if (options.curatedOnly && !icon.curated) return false;
      if (options.category && icon.category !== options.category) return false;
      return true;
    });
  }

  readImageBase64(icon: IconEntry): string {
    const absolutePath = path.resolve(ASSETS_DIR, "..", icon.file);
    const buffer = readFileSync(absolutePath);
    return buffer.toString("base64");
  }
}

export const iconStore = new IconStore();
