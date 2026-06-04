import { db } from '../lib/mapDb';
import { guardianAI } from './guardianAI';

export interface LocalKnowledge {
  id?: number;
  source: string;
  title: string;
  content: string;
  url: string;
  scrapedAt: string;
  category: 'disaster' | 'procedure' | 'announcement' | 'contact';
}

export class KnowledgeService {
  private static instance: KnowledgeService;
  private scrapeInterval: NodeJS.Timeout | null = null;

  static getInstance() {
    if (!KnowledgeService.instance) KnowledgeService.instance = new KnowledgeService();
    return KnowledgeService.instance;
  }

  // Start scheduled scraping
  startScheduledScraping() {
    if (this.scrapeInterval) return;
    this.scrapeInterval = setInterval(async () => {
      console.log("🔄 Running scheduled knowledge update for Mamburao...");
      await this.preloadMamburaoKnowledge();
    }, 6 * 60 * 60 * 1000); // 6 hours
  }

  stopScheduledScraping() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
    }
  }

  // Helper for delay
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Scrape using Firecrawl API
  async scrapeSource(url: string, category: LocalKnowledge['category'], retries = 3) {
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        const { fetchAPI } = await import('./apiBase');
        const data = await fetchAPI('scrape', {
          method: 'POST',
          body: JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
          })
        });

        if (data.success === false) throw new Error("Scrape failed server-side");

        const knowledge: LocalKnowledge = {
          source: new URL(url).hostname,
          title: data.metadata?.title || 'Untitled',
          content: data.markdown || data.content,
          url,
          scrapedAt: new Date().toISOString(),
          category,
        };

        await db.localKnowledge.add(knowledge);
        console.log(`✅ Scraped and cached: ${knowledge.title}`);

        return knowledge;
      } catch (error) {
        attempt++;
        if (attempt >= retries) {
          console.error(`❌ Firecrawl scrape failed after ${retries} attempts:`, url, error);
          return null;
        }
        
        const delayMs = Math.pow(2, attempt) * 1000;
        console.warn(`⚠️ Scraping failed for ${url}. Retrying in ${delayMs}ms (attempt ${attempt}/${retries})...`);
        await this.delay(delayMs);
      }
    }
    return null;
  }

  async getRelevantKnowledge(query: string, limit = 3): Promise<string> {
    const allItems = await db.localKnowledge.toArray();
    
    // Simple relevance scoring (keyword + recency)
    const scored = allItems.map(item => {
      const queryWords = query.toLowerCase().split(' ');
      const contentWords = item.content.toLowerCase();
      const score = queryWords.filter(word => contentWords.includes(word)).length 
                    + (new Date().getTime() - new Date(item.scrapedAt).getTime()) / 86400000 * -0.01; // recency boost
      return { ...item, score };
    });

    const topResults = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return topResults.map(r => 
      `Source: ${r.title} (${r.source})\nContent: ${r.content.substring(0, 600)}...`
    ).join('\n\n---\n\n');
  }

  async askWithLocalKnowledge(question: string) {
    const context = await this.getRelevantKnowledge(question);
    
    const prompt = `You are Guardian AI for Mamburao, Occidental Mindoro.
Use ONLY the following local knowledge to give accurate, actionable answers:

${context}

Question: ${question}

Answer in simple Tagalog or English. Be direct and helpful.`;

    return guardianAI.generateResponse(prompt);
  }

  async preloadMamburaoKnowledge() {
    const sources = [
      { url: "https://mamburao.gov.ph", category: "announcement" as const },
      { url: "https://occidentalmindoro.gov.ph", category: "disaster" as const },
      { url: "https://www.pagasa.dost.gov.ph", category: "disaster" as const },
    ];

    for (const source of sources) {
      try {
        await this.scrapeSource(source.url, source.category);
      } catch (e) {
        console.warn(`Failed to scrape ${source.url}`);
      }
    }
  }
}

export const knowledgeService = KnowledgeService.getInstance();
