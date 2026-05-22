const FIRECRAWL_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;

export const scrapePage = async (url: string) => {
  const res = await fetch("/api/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
};

export const searchWeb = async (query: string) => {
  const res = await fetch("/api/scrape/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
};
