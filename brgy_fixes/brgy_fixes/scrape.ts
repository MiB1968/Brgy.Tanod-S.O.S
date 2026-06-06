/**
 * src/server/routes/scrape.ts
 *
 * FIX BATCH — HIGH-03
 *
 * Changes from original:
 *   The scrape and search endpoints forwarded user-supplied URLs to the
 *   Firecrawl API without any validation. A valid authenticated user could
 *   submit arbitrary URLs (internal metadata endpoints, private services,
 *   localhost, etc.) and abuse your Firecrawl API quota.
 *
 *   Fix — validateScrapableUrl():
 *     1. Only http:// and https:// schemes are accepted. file://, data://,
 *        ftp:// etc. are rejected outright.
 *     2. Private/loopback IP ranges are blocked: 127.x.x.x, 10.x.x.x,
 *        172.16-31.x.x, 192.168.x.x, ::1, and localhost variants.
 *     3. The URL must be parseable by the native URL constructor — malformed
 *        strings are rejected before they reach Firecrawl.
 *
 *   Role restriction: only tanod, admin, and super_admin may use the scrape
 *   endpoint. Residents do not need web-scraping capability.
 *
 *   The search endpoint retains authenticate-only access (no URL involved).
 */

import express from "express";
import { authenticate, requireAnyRole, AuthRequest } from "../middleware/auth";
import { logger } from "../utils/logger";

const router = express.Router();

// Private/loopback IP ranges that must never be scraped.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^\[?::1\]?$/,         // IPv6 loopback
  /^0\.0\.0\.0$/,
];

function validateScrapableUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { ok: false, reason: `Scheme '${url.protocol}' is not allowed. Only http and https are permitted.` };
  }

  const hostname = url.hostname.toLowerCase();
  for (const pattern of BLOCKED_HOSTNAME_PATTERNS) {
    if (pattern.test(hostname)) {
      return { ok: false, reason: "URL resolves to a private or loopback address" };
    }
  }

  return { ok: true, url };
}

// Only privileged roles can use scraping — residents don't need this.
const scrapeAccess = requireAnyRole(["tanod", "admin", "super_admin"] as any);

router.post("/", authenticate, scrapeAccess, async (req: AuthRequest, res) => {
  const { url: rawUrl, formats = ["markdown"] } = req.body;

  if (!rawUrl) return res.status(400).json({ error: "URL is required" });

  const validation = validateScrapableUrl(rawUrl);
  if (!validation.ok) {
    logger.warn(`[Scrape] Blocked invalid URL from ${req.user?.email}: ${rawUrl} — ${validation.reason}`);
    return res.status(400).json({ error: validation.reason });
  }

  const url = validation.url.href; // Use the normalized URL

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
    logger.info(`[Scrape] ${req.user?.email} scraped: ${url}`);

    res.json({
      success: true,
      data: {
        content: data.data?.markdown || data.data?.html,
        title: data.metadata?.title,
        url: data.data?.url,
      },
    });
  } catch (error: any) {
    logger.error("Firecrawl scrape failed", error);
    res.status(500).json({ error: "Failed to scrape page" });
  }
});

router.post("/search", authenticate, scrapeAccess, async (req: AuthRequest, res) => {
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
