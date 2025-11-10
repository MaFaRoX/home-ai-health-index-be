import { RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export interface IndicatorCategoryRow extends RowDataPacket {
  category_id: number;
  category_slug: string;
  default_color: string | null;
  indicator_id: number | null;
  indicator_slug: string | null;
  indicator_display_name: string | null;
  indicator_unit: string | null;
  translated_name: string | null;
  translated_reference_text: string | null;
  reference_min: number | null;
  reference_max: number | null;
  reference_male_min: number | null;
  reference_male_max: number | null;
  reference_female_min: number | null;
  reference_female_max: number | null;
}

export interface IndicatorRow extends RowDataPacket {
  id: number;
  slug: string;
  display_name: string;
  unit: string;
  reference_min: number | null;
  reference_max: number | null;
  reference_male_min: number | null;
  reference_male_max: number | null;
  reference_female_min: number | null;
  reference_female_max: number | null;
  reference_text: string | null;
}

export async function listCategoriesWithIndicators(language: string) {
  const [rows] = await pool.query<IndicatorCategoryRow[]>(
    `
    SELECT
      c.id AS category_id,
      c.slug AS category_slug,
      c.default_color,
      i.id AS indicator_id,
      i.slug AS indicator_slug,
      i.display_name AS indicator_display_name,
      i.unit AS indicator_unit,
      i.reference_min,
      i.reference_max,
      i.reference_male_min,
      i.reference_male_max,
      i.reference_female_min,
      i.reference_female_max,
      t.translated_name,
      t.translated_reference_text
    FROM indicator_categories c
    LEFT JOIN indicators i ON i.category_id = c.id
    LEFT JOIN indicator_translations t
      ON t.indicator_id = i.id AND t.language = ?
    ORDER BY c.id ASC, i.id ASC
    `,
    [language],
  );

  return rows;
}

export async function findIndicatorBySlug(slug: string): Promise<IndicatorRow | null> {
  const [rows] = await pool.query<IndicatorRow[]>(
    `
    SELECT id, slug, display_name, unit,
           reference_min, reference_max,
           reference_male_min, reference_male_max,
           reference_female_min, reference_female_max,
           reference_text
    FROM indicators
    WHERE slug = ?
    LIMIT 1
    `,
    [slug],
  );
  return rows[0] ?? null;
}

