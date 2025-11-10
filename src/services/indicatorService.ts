import { listCategoriesWithIndicators, findIndicatorBySlug } from '../repositories/indicatorRepository';
import { AppError } from '../utils/errors';

export interface IndicatorResponse {
  id: number;
  slug: string;
  name: string;
  unit: string;
  referenceRange: {
    min: number | null;
    max: number | null;
    male?: { min: number | null; max: number | null };
    female?: { min: number | null; max: number | null };
  };
  referenceText: string | null;
}

export interface IndicatorCategoryResponse {
  id: number;
  slug: string;
  color: string | null;
  indicators: IndicatorResponse[];
}

export async function getIndicatorCatalog(language: string): Promise<IndicatorCategoryResponse[]> {
  const rows = await listCategoriesWithIndicators(language);
  const categoriesMap = new Map<number, IndicatorCategoryResponse>();

  rows.forEach(row => {
    if (!categoriesMap.has(row.category_id)) {
      categoriesMap.set(row.category_id, {
        id: row.category_id,
        slug: row.category_slug,
        color: row.default_color,
        indicators: [],
      });
    }

    const category = categoriesMap.get(row.category_id)!;

    if (row.indicator_id) {
      category.indicators.push({
        id: row.indicator_id,
        slug: row.indicator_slug!,
        name: row.translated_name ?? row.indicator_display_name ?? row.indicator_slug ?? '',
        unit: row.indicator_unit ?? '',
        referenceRange: {
          min: row.reference_min,
          max: row.reference_max,
          male: row.reference_male_min !== null || row.reference_male_max !== null
            ? { min: row.reference_male_min, max: row.reference_male_max }
            : undefined,
          female: row.reference_female_min !== null || row.reference_female_max !== null
            ? { min: row.reference_female_min, max: row.reference_female_max }
            : undefined,
        },
        referenceText: row.translated_reference_text ?? null,
      });
    }
  });

  return Array.from(categoriesMap.values());
}

export async function ensureIndicatorExists(slug: string) {
  const indicator = await findIndicatorBySlug(slug);
  if (!indicator) {
    throw new AppError(400, `Indicator not found: ${slug}`);
  }
  return indicator;
}

