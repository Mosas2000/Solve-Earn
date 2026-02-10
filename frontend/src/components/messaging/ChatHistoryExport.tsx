import { useState } from 'react';
import { Download, FileText, Calendar, Filter, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatHistoryExport {
  conversationId?: string;
  dateFrom: Date;
  dateTo: Date;
  format: 'json' | 'txt' | 'pdf' | 'csv';
  includeAttachments: boolean;
  includeMetadata: boolean;
}

interface ChatHistoryExportProps {
  onExport: (settings: ChatHistoryExport) => Promise<void>;
  conversationIds?: Array<{ id: string; name: string }>;
  className?: string;
}

export const ChatHistoryExport = ({
  onExport,
  conversationIds = [],
  className,
}: ChatHistoryExportProps) => {
  const [settings, setSettings] = useState<ChatHistoryExport>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    dateTo: new Date(),
    format: 'json',
    includeAttachments: false,
    includeMetadata: true,
  });
  const [exporting, setExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportComplete(false);
    try {
      await onExport(settings);
      setExportComplete(true);
      setTimeout(() => setExportComplete(false), 3000);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatOptions = [
    { value: 'json', label: 'JSON', description: 'Machine-readable format' },
    { value: 'txt', label: 'Text', description: 'Plain text file' },
    { value: 'pdf', label: 'PDF', description: 'Formatted document' },
    { value: 'csv', label: 'CSV', description: 'Spreadsheet format' },
  ];

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-glow-pink/20 rounded-full flex items-center justify-center">
          <Download className="h-5 w-5 text-glow-pink" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Export Chat History</h3>
          <p className="text-sm text-slate-400">Download your conversation history</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Conversation Selection */}
        {conversationIds.length > 0 && (
          <div>
            <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
              <Filter className="h-3 w-3" />
              Conversation (Optional)
            </label>
            <select
              value={settings.conversationId || ''}
              onChange={(e) => setSettings({ ...settings, conversationId: e.target.value || undefined })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            >
              <option value="">All Conversations</option>
              {conversationIds.map((conv) => (
                <option key={conv.id} value={conv.id}>
                  {conv.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              From Date
            </label>
            <input
              type="date"
              value={settings.dateFrom.toISOString().split('T')[0]}
              onChange={(e) => setSettings({ ...settings, dateFrom: new Date(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-2 block flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              To Date
            </label>
            <input
              type="date"
              value={settings.dateTo.toISOString().split('T')[0]}
              onChange={(e) => setSettings({ ...settings, dateTo: new Date(e.target.value) })}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
            />
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="text-sm text-slate-400 mb-3 block flex items-center gap-2">
            <FileText className="h-3 w-3" />
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSettings({ ...settings, format: option.value as any })}
                className={cn(
                  'p-4 rounded-lg border-2 transition-colors text-left',
                  settings.format === option.value
                    ? 'border-glow-pink bg-glow-pink/10'
                    : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                )}
              >
                <p className="text-sm font-semibold text-white mb-1">{option.label}</p>
                <p className="text-xs text-slate-400">{option.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg">
            <input
              type="checkbox"
              id="include-attachments"
              checked={settings.includeAttachments}
              onChange={(e) => setSettings({ ...settings, includeAttachments: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700"
            />
            <label htmlFor="include-attachments" className="flex-1 text-sm text-white cursor-pointer">
              Include Attachments
              <p className="text-xs text-slate-400 mt-0.5">
                Export will include all file attachments (may increase file size)
              </p>
            </label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg">
            <input
              type="checkbox"
              id="include-metadata"
              checked={settings.includeMetadata}
              onChange={(e) => setSettings({ ...settings, includeMetadata: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700"
            />
            <label htmlFor="include-metadata" className="flex-1 text-sm text-white cursor-pointer">
              Include Metadata
              <p className="text-xs text-slate-400 mt-0.5">
                Include timestamps, read receipts, and delivery status
              </p>
            </label>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={exporting || exportComplete}
          className={cn(
            'w-full px-4 py-3 font-semibold rounded-lg transition-colors flex items-center justify-center gap-2',
            exportComplete
              ? 'bg-glow-green text-white'
              : 'bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 text-white'
          )}
        >
          {exportComplete ? (
            <>
              <CheckCircle className="h-5 w-5" />
              Export Complete
            </>
          ) : exporting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              Export Chat History
            </>
          )}
        </button>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
          <FileText className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            Your exported data will be downloaded to your device. Keep your exports secure as they contain your private conversations.
          </p>
        </div>
      </div>
    </div>
  );
};
