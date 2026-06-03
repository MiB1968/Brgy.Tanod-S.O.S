import React, { useState } from "react";
import { searchWeb } from "../lib/firecrawl";
import { Loader2, RefreshCw, ExternalLink } from "lucide-react";

export default function NewsUpdates() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLatestNews = async () => {
    setLoading(true);
    try {
      const result = await searchWeb(
        "Philippines typhoon OR flood OR earthquake OR barangay emergency OR weather alert"
      );
      setNews(result.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 mt-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xl font-bold flex items-center gap-2">
          📡 Latest Updates
        </h3>
        <button
          onClick={fetchLatestNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm"
        >
          {loading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {news.length > 0 ? (
        <div className="space-y-4">
          {news.map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-gray-700 hover:border-gray-600 rounded-2xl p-4 transition-all hover:bg-gray-900"
            >
              <div className="font-medium text-white flex items-start justify-between">
                {item.title}
                <ExternalLink className="w-4 h-4 mt-1 opacity-60" />
              </div>
              <p className="text-sm text-gray-400 line-clamp-2 mt-1.5">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          Tap "Refresh" to load latest emergency & weather updates
        </div>
      )}
    </div>
  );
}
