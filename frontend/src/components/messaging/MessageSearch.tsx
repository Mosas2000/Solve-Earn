import { useState } from 'react';
import { Search, Filter, Calendar, User, Hash, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MessageSearchFilters {
  query: string;
  fromUser?: string;
  dateFrom?: Date;
  dateTo?: Date;
  hasAttachments?: boolean;
  conversationId?: string;
}

export interface MessageSearchResult {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  timestamp: Date;
  matchedText: string;
}

interface MessageSearchProps {
  onSearch: (filters: MessageSearchFilters) => Promise<MessageSearchResult[]>;
  onSelectResult: (result: MessageSearchResult) => void;
  className?: string;
}

export const MessageSearch = ({
  onSearch,
  onSelectResult,
  className,
}: MessageSearchProps) => {
  const [filters, setFilters] = useState<MessageSearchFilters>({ query: '' });
  const [results, setResults] = useState<MessageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!filters.query.trim()) return;

    setSearching(true);
    try {
      const searchResults = await onSearch(filters);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({ query: filters.query });
    setShowFilters(false);
  };

  const activeFiltersCount = Object.keys(filters).filter(
    (key) => key !== 'query' && filters[key as keyof MessageSearchFilters] !== undefined
  ).length;

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl', className)}>
      {/* Search Bar */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus-within:border-glow-pink transition-colors">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder="Search messages..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none"
            />
            {filters.query && (
              <button
                onClick={() => setFilters({ ...filters, query: '' })}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="h-4 w-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2',
              showFilters || activeFiltersCount > 0
                ? 'bg-glow-blue text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            <Filter className="h-5 w-5" />
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={handleSearch}
            disabled={!filters.query.trim() || searching}
            className="px-6 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-800/50 rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <User className="h-3 w-3" />
                  From User
                </label>
                <input
                  type="text"
                  value={filters.fromUser || ''}
                  onChange={(e) => setFilters({ ...filters, fromUser: e.target.value || undefined })}
                  placeholder="Username or address"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-glow-pink"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <Hash className="h-3 w-3" />
                  Conversation ID
                </label>
                <input
                  type="text"
                  value={filters.conversationId || ''}
                  onChange={(e) => setFilters({ ...filters, conversationId: e.target.value || undefined })}
                  placeholder="Enter conversation ID"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:border-glow-pink"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Date From
                </label>
                <input
                  type="date"
                  value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-glow-pink"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Date To
                </label>
                <input
                  type="date"
                  value={filters.dateTo?.toISOString().split('T')[0] || ''}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-glow-pink"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-attachments"
                checked={filters.hasAttachments || false}
                onChange={(e) => setFilters({ ...filters, hasAttachments: e.target.checked || undefined })}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700"
              />
              <label htmlFor="has-attachments" className="text-sm text-white">
                Only messages with attachments
              </label>
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-glow-blue hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="max-h-[400px] overflow-y-auto">
        {results.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searching ? 'Searching...' : 'No results yet. Try searching for messages.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => onSelectResult(result)}
                className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-glow-pink to-glow-blue rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-xs">
                        {result.senderName.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{result.senderName}</p>
                      <p className="text-xs text-slate-400">{result.timestamp.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-300 line-clamp-2">
                  {result.matchedText}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
