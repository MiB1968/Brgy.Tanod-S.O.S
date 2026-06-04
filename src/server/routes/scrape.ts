import express from "express";
import { authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = express.Router();

router.post("/", authenticate, async (req, res) => {
  const { url, formats = ["markdown"] } = req.body;

  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const response = await fetch("https://api.firecrawl.dev/v0/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats,
        onlyMainContent: true,
      }),
    });

    if (!response.ok) throw new Error("Firecrawl API failed");

    const data = await response.json() as any;
    logger.info(`Scraped: ${url}`);

    res.json({
      success: true,
      data: {
        content: data.data?.markdown || data.data?.html,
        title: data.data?.title,
        url: data.data?.url,
      },
    });
  } catch (error: any) {
    logger.error("Firecrawl scrape failed", error);
    res.status(500).json({ error: "Failed to scrape page" });
  }
});

router.post("/search", authenticate, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    const response = await fetch("https://api.firecrawl.dev/v0/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({ query, limit: 6 }),
    });

    const data = await response.json() as any;
    res.json({ success: true, results: data.data || [] });
  } catch (error) {
    logger.error("Firecrawl search failed", error);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
