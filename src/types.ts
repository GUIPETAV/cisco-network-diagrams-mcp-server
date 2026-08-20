export interface IconEntry {
  id: string;
  name: string;
  file: string;
  category: string;
  curated: boolean;
  description: string;
  glossary_name?: string;
  function?: string;
  when_to_use?: string;
}

export interface IconCatalog {
  source: string;
  total_icons: number;
  curated_count: number;
  categories: Record<string, string>;
  icons: IconEntry[];
}
