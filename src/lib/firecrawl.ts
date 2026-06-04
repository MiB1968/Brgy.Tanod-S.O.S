import { fetchAPI } from '../services/apiBase';

const FIRECRAWL_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;

export const scrapePage = async (url: string) => {
  return await fetchAPI("scrape", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
};

export const searchWeb = async (query: string) => {
  return await fetchAPI("scrape/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
};
