import { Injectable } from '@nestjs/common';

export function truncateSeoText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  // Subtracting 3 for the '...'
  const limit = maxLength - 3;
  const truncated = text.substring(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  return truncated + '...';
}

export function sanitizeEnglishText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/Á/g, 'A')
    .replace(/É/g, 'E')
    .replace(/Í/g, 'I')
    .replace(/Ó/g, 'O')
    .replace(/Ú/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'U');
}

@Injectable()
export class TranslationService {
  /**
   * Translates text from Spanish to English using Node.js 'translate' library,
   * automatically sanitizing Spanish accents and 'ñ'/'Ñ' to standard English characters.
   */
  async translateToEnglish(text: string): Promise<string> {
    if (!text) return '';

    let translated = '';
    try {
      const translateModule = await (Function('return import("translate")')() as Promise<any>);
      const translate = translateModule.default;
      translate.engine = 'google';
      const res = await translate(text, { from: 'es', to: 'en' });
      if (res && typeof res === 'string' && res.trim()) {
        translated = res.trim();
      }
    } catch {
      // Fallback to offline translation dictionary if network or engine is unavailable
    }

    if (!translated) {
      translated = this.offlineDictionaryTranslate(text);
    }

    return sanitizeEnglishText(translated);
  }

  private offlineDictionaryTranslate(text: string): string {
    const dictionaryEntries: [string, string][] = [
      ['pan de queso ecuatoriano', 'Ecuadorean cheese bread'],
      ['pan de queso', 'cheese bread'],
      ['doradito, suave y extra relleno', 'golden, soft and extra filled'],
      ['doradito', 'golden'],
      ['suave', 'soft'],
      ['extra relleno', 'extra filled'],
      ['relleno', 'filled'],
      ['descubre la combinación perfecta de suavidad y tradición', 'discover the perfect combination of softness and tradition'],
      ['nuestro pan de queso está', 'our cheese bread is'],
      ['prueba de pan de casa', 'homemade bread test'],
      ['prueba de pan', 'bread test'],
      ['pan de casa', 'homemade bread'],
      ['de casa', 'homemade'],
      ['panaderia', 'bakery'],
      ['panadería', 'bakery'],
      ['pasteleria', 'pastry shop'],
      ['pastelería', 'pastry shop'],
      ['bocaditos', 'snacks'],
      ['bocadito', 'snack'],
      ['este es', 'this is'],
      ['esta es', 'this is'],
      ['prueba', 'test'],
      ['pruaba', 'test'],
      ['pan', 'bread'],
      ['panes', 'breads'],
      ['dulce', 'sweet'],
      ['dulces', 'sweets'],
      ['postre', 'dessert'],
      ['postres', 'desserts'],
      ['chocolate', 'chocolate'],
      ['tres leches', 'tres leches'],
      ['torta', 'cake'],
      ['tortas', 'cakes'],
      ['pastel', 'cake'],
      ['pasteles', 'cakes'],
      ['pastilla', 'pastry'],
      ['empanada', 'empanada'],
      ['empanadas', 'empanadas'],
      ['queso', 'cheese'],
      ['manjar', 'milk caramel'],
      ['leche', 'milk'],
      ['especias', 'spices'],
      ['tradicional', 'traditional'],
      ['artesanal', 'artisanal'],
      ['delicioso', 'delicious'],
      ['deliciosa', 'delicious'],
      ['fresco', 'fresh'],
      ['fresca', 'fresh'],
      ['ecuador', 'Ecuador'],
      ['ecuatoriano', 'Ecuadorean'],
      ['ecuatoriana', 'Ecuadorean'],
      ['estados unidos', 'United States'],
      ['importado', 'imported'],
      ['local', 'local'],
      ['harina', 'flour'],
      ['azucar', 'sugar'],
      ['azúcar', 'sugar'],
      ['huevo', 'egg'],
      ['huevos', 'eggs'],
      ['mantequilla', 'butter'],
      ['sal', 'salt'],
      ['agua', 'water'],
      ['casa', 'home'],
      ['este', 'this'],
      ['esta', 'this'],
      ['es', 'is'],
      ['con', 'with'],
      ['sin', 'without'],
      ['para', 'for'],
      ['por', 'for'],
      ['de', 'of'],
      ['solo', 'only'],
      ['sólo', 'only'],
      ['procedente', 'sourced'],
    ];

    dictionaryEntries.sort((a, b) => b[0].length - a[0].length);

    let translated = text;
    for (const [es, en] of dictionaryEntries) {
      const escapedEs = es.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedEs}\\b`, 'gi');
      translated = translated.replace(regex, (match) => {
        if (match === match.toUpperCase()) return en.toUpperCase();
        if (match[0] === match[0].toUpperCase()) return en[0].toUpperCase() + en.slice(1);
        return en;
      });
    }

    return translated;
  }

  /**
   * Generates natural SEO Titles and Descriptions in ES and EN.
   * Respects GEO principles (clara, estructurada, entendible y real).
   */
  async generateSeoAndGeo(productInfo: {
    name: string;
    categoryName: string;
    description: string;
    originCountry: string;
    allergens: string[];
    price?: number;
  }): Promise<{
    es: { metaTitle: string; metaDescription: string };
    en: { metaTitle: string; metaDescription: string };
  }> {
    const { name, categoryName, description, originCountry, allergens, price } = productInfo;

    // Translate basic info to English
    const nameEn = await this.translateToEnglish(name);
    const categoryNameEn = await this.translateToEnglish(categoryName);
    const originCountryEn = originCountry === 'Ecuador' ? 'Ecuador' : 'United States';

    // Build natural SEO components
    // Spanish
    const esTitleRaw = `${name} | El Trigal ${categoryName}`;
    const allergensTextEs = allergens.length > 0 ? ` (Alérgenos: ${allergens.join(', ')})` : '';
    const originTextEs = originCountry ? ` Procedente de ${originCountry}.` : '';
    const priceTextEs = price ? ` por solo $${price.toFixed(2)}.` : '';
    const esDescRaw = `${name} - ${description || 'Delicioso producto de El Trigal.'}${originTextEs}${allergensTextEs}${priceTextEs}`;

    // English
    const enTitleRaw = await this.translateToEnglish(`${name} | El Trigal ${categoryName}`);
    const allergensEn = allergens.map(a => this.translateAllergenToEn(a));
    const allergensTextEn = allergensEn.length > 0 ? ` (Allergens: ${allergensEn.join(', ')})` : '';
    const originTextEn = originCountryEn ? ` Sourced from ${originCountryEn}.` : '';
    const priceTextEn = price ? ` for only $${price.toFixed(2)}.` : '';
    
    // Translate description snippet
    const descEn = await this.translateToEnglish(description || 'Delicious product from El Trigal.');
    const enDescRaw = `${nameEn} - ${descEn}${originTextEn}${allergensTextEn}${priceTextEn}`;

    return {
      es: {
        metaTitle: truncateSeoText(esTitleRaw, 60),
        metaDescription: truncateSeoText(esDescRaw, 155),
      },
      en: {
        metaTitle: sanitizeEnglishText(truncateSeoText(enTitleRaw, 60)),
        metaDescription: sanitizeEnglishText(truncateSeoText(enDescRaw, 155)),
      },
    };
  }

  private translateAllergenToEn(allergen: string): string {
    const allergensMap: Record<string, string> = {
      'gluten': 'Gluten',
      'lactosa': 'Lactose',
      'huevo': 'Egg',
      'nueces': 'Tree Nuts',
      'mani': 'Peanuts',
      'soya': 'Soy',
    };
    return allergensMap[allergen.toLowerCase()] || allergen;
  }

  generateTags(productInfo: { name: string; categoryName: string; description: string; allergens: string[] }): string[] {
    const { name, categoryName, description, allergens } = productInfo;
    const tagsSet = new Set<string>();

    const nameLower = name.toLowerCase();
    const descLower = description.toLowerCase();
    const catLower = categoryName.toLowerCase();

    // 1. Category-based tags
    if (catLower.includes('panader') || catLower.includes('bakery')) {
      tagsSet.add('panaderia');
      tagsSet.add('pan-artesanal');
      tagsSet.add('pan-fresco');
    } else if (catLower.includes('pastel') || catLower.includes('pastry') || catLower.includes('torta')) {
      tagsSet.add('pasteleria');
      tagsSet.add('reposteria');
      tagsSet.add('dulce');
    } else {
      tagsSet.add(catLower.replace(/\s+/g, '-'));
    }

    // 2. Ingredient / Allergen based tags
    if (nameLower.includes('queso') || descLower.includes('queso')) {
      tagsSet.add('queso');
      tagsSet.add('queso-criollo');
    }
    if (nameLower.includes('chocolate') || descLower.includes('chocolate')) {
      tagsSet.add('chocolate');
      tagsSet.add('dulce');
    }
    if (nameLower.includes('pinllo') || descLower.includes('pinllo')) {
      tagsSet.add('pan-de-pinllo');
      tagsSet.add('horno-de-lena');
    }
    if (nameLower.includes('ambate') || descLower.includes('ambate') || nameLower.includes('allulla')) {
      tagsSet.add('allullas');
      tagsSet.add('ambato');
    }

    // 3. General descriptive tags
    tagsSet.add('el-trigal');
    tagsSet.add('hecho-en-casa');
    tagsSet.add('tradicional');
    tagsSet.add('sabor-criollo');
    tagsSet.add('fresco');

    // Return at least 5 tags
    const result = Array.from(tagsSet).map(tag => 
      tag.normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '')
         .toLowerCase()
         .replace(/[^a-z0-9-]/g, '')
    );
    
    return Array.from(new Set(result)).slice(0, 7);
  }
}
