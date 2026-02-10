import { useState } from 'react';
import { Paperclip, File, Image as ImageIcon, X, Upload, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploadProgress: number;
  uploaded: boolean;
}

interface FileAttachmentManagerProps {
  attachments: FileAttachment[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  acceptedTypes?: string[];
  className?: string;
}

export const FileAttachmentManager = ({
  attachments,
  onAddAttachments,
  onRemoveAttachment,
  maxFileSize = 10,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.doc', '.docx', '.xls', '.xlsx'],
  className,
}: FileAttachmentManagerProps) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    if (attachments.length + files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed`);
      return { valid, errors };
    }

    files.forEach((file) => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxFileSize) {
        errors.push(`${file.name} exceeds ${maxFileSize}MB`);
      } else {
        valid.push(file);
      }
    });

    return { valid, errors };
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const { valid, errors } = validateFiles(files);

    if (errors.length > 0) {
      setError(errors.join(', '));
      setTimeout(() => setError(null), 5000);
    }

    if (valid.length > 0) {
      onAddAttachments(valid);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    return File;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-6 transition-colors',
          dragActive
            ? 'border-glow-pink bg-glow-pink/5'
            : 'border-slate-700 hover:border-slate-600'
        )}
      >
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={attachments.length >= maxFiles}
        />
        <div className="text-center">
          <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
          <p className="text-sm text-white mb-1">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-slate-500">
            Max {maxFiles} files, {maxFileSize}MB each
          </p>
        </div>
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const FileIconComponent = getFileIcon(attachment.type);

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg group"
              >
                {/* Preview/Icon */}
                {attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                ) : (
                  <div className="w-10 h-10 bg-slate-700 rounded flex items-center justify-center">
                    <FileIconComponent className="h-5 w-5 text-slate-400" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{attachment.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
                    {!attachment.uploaded && (
                      <div className="flex-1 max-w-[100px]">
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-glow-pink transition-all duration-300"
                            style={{ width: `${attachment.uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-opacity"
                >
                  <X className="h-4 w-4 text-slate-400 hover:text-white" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      {attachments.length > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {attachments.length} / {maxFiles} files
          </span>
          <span>
            {formatFileSize(attachments.reduce((sum, a) => sum + a.size, 0))} total
          </span>
        </div>
      )}
    </div>
  );
};
