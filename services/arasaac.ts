
const API_BASE = 'https://api.arasaac.org/api/pictograms';
const IMG_BASE = 'https://static.arasaac.org/pictograms';

export interface ArasaacSymbol {
  id: number;
  url: string;
  keywords: string[];
}

export const searchArasaacSymbols = async (query: string, lang: string = 'en'): Promise<ArasaacSymbol[]> => {
  if (!query || query.trim().length < 3) return [];

  try {
    // ARASAAC API supports language codes like 'en', 'es', 'ru', etc.
    const res = await fetch(`${API_BASE}/${lang}/search/${encodeURIComponent(query)}`);
    
    if (!res.ok) {
        if (res.status === 404) return []; // No results
        throw new Error('Network response was not ok');
    }

    const data = await res.json();
    
    // Map response to a simple structure. Limit to 20 results for performance in the modal.
    return data.slice(0, 20).map((item: any) => ({
      id: item._id,
      url: `${IMG_BASE}/${item._id}/${item._id}_300.png`, // Using 300px version
      keywords: item.keywords.map((k: any) => k.keyword)
    }));
  } catch (error) {
    console.warn("ARASAAC Search failed:", error);
    return [];
  }
};
