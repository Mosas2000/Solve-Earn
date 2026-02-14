import { useState } from 'react';
import { QrCode, Download, Share2, Copy, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

export interface PaymentRequest {
  id: string;
  recipient: string;
  amount?: string;
  memo?: string;
  expiresAt?: Date;
  createdAt: Date;
  status: 'active' | 'paid' | 'expired';
}

interface PaymentRequestGeneratorProps {
  currentAddress: string;
  onCreateRequest?: (data: CreateRequestData) => Promise<PaymentRequest>;
  className?: string;
}

export interface CreateRequestData {
  amount?: string;
  memo?: string;
  expiresIn?: number; // hours
}

export const PaymentRequestGenerator = ({
  currentAddress,
  onCreateRequest,
  className,
}: PaymentRequestGeneratorProps) => {
  const [requestData, setRequestData] = useState<CreateRequestData>({
    amount: '',
    memo: '',
    expiresIn: 24,
  });
  const [generatedRequest, setGeneratedRequest] = useState<PaymentRequest | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateQRCode = async (data: string) => {
    try {
      const url = await QRCode.toDataURL(data, {
        width: 300,
        margin: 2,
        color: {
          dark: '#ffffff',
          light: '#0f172a',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleGenerateRequest = async () => {
    if (!onCreateRequest) {
      // Generate request locally if no callback provided
      const mockRequest: PaymentRequest = {
        id: Math.random().toString(36).substring(7),
        recipient: currentAddress,
        amount: requestData.amount,
        memo: requestData.memo,
        expiresAt: requestData.expiresIn
          ? new Date(Date.now() + requestData.expiresIn * 60 * 60 * 1000)
          : undefined,
        createdAt: new Date(),
        status: 'active',
      };
      setGeneratedRequest(mockRequest);
      
      // Generate payment URI
      const paymentUri = buildPaymentUri(mockRequest);
      await generateQRCode(paymentUri);
      return;
    }

    setLoading(true);
    try {
      const request = await onCreateRequest(requestData);
      setGeneratedRequest(request);
      
      const paymentUri = buildPaymentUri(request);
      await generateQRCode(paymentUri);
    } catch (error) {
      console.error('Failed to generate request:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildPaymentUri = (request: PaymentRequest): string => {
    const params = new URLSearchParams();
    params.append('recipient', request.recipient);
    if (request.amount) params.append('amount', request.amount);
    if (request.memo) params.append('memo', request.memo);
    return `stacks:pay?${params.toString()}`;
  };

  const getPaymentLink = (): string => {
    if (!generatedRequest) return '';
    const params = new URLSearchParams();
    params.append('recipient', generatedRequest.recipient);
    if (generatedRequest.amount) params.append('amount', generatedRequest.amount);
    if (generatedRequest.memo) params.append('memo', generatedRequest.memo);
    return `${window.location.origin}/pay?${params.toString()}`;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.download = `payment-request-${generatedRequest?.id}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleShare = async () => {
    const link = getPaymentLink();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Payment Request',
          text: `Payment request for ${generatedRequest?.amount || 'custom'} STX`,
          url: link,
        });
      } catch (error) {
        console.error('Failed to share:', error);
      }
    } else {
      handleCopy(link);
    }
  };

  const handleReset = () => {
    setGeneratedRequest(null);
    setQrCodeUrl('');
    setRequestData({ amount: '', memo: '', expiresIn: 24 });
  };

  if (generatedRequest) {
    const paymentLink = getPaymentLink();
    const isExpired = generatedRequest.expiresAt && new Date() > generatedRequest.expiresAt;

    return (
      <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Payment Request Generated</h3>
          <button
            onClick={handleReset}
            className="text-sm text-glow-blue hover:underline"
          >
            Create New
          </button>
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-xl">
              <img src={qrCodeUrl} alt="Payment QR Code" className="w-64 h-64" />
            </div>
          </div>
        )}

        {/* Request Details */}
        <div className="space-y-4 mb-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-1">Request ID</p>
            <p className="text-sm text-white font-mono">{generatedRequest.id}</p>
          </div>

          {generatedRequest.amount && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Amount</p>
              <p className="text-2xl text-white font-bold">{generatedRequest.amount} STX</p>
            </div>
          )}

          {generatedRequest.memo && (
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-xs text-slate-400 mb-1">Description</p>
              <p className="text-sm text-white">{generatedRequest.memo}</p>
            </div>
          )}

          {generatedRequest.expiresAt && (
            <div className={cn(
              'rounded-lg p-4',
              isExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-slate-800/50'
            )}>
              <p className="text-xs text-slate-400 mb-1">
                {isExpired ? 'Expired' : 'Expires'}
              </p>
              <p className={cn('text-sm font-medium', isExpired ? 'text-red-500' : 'text-white')}>
                {generatedRequest.expiresAt.toLocaleString()}
              </p>
            </div>
          )}

          {/* Payment Link */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <p className="text-xs text-slate-400 mb-2">Payment Link</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={paymentLink}
                readOnly
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-sm font-mono"
              />
              <button
                onClick={() => handleCopy(paymentLink)}
                className="p-2 hover:bg-slate-700 rounded transition-colors"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-glow-green" />
                ) : (
                  <Copy className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadQR}
            disabled={!qrCodeUrl}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download QR
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>

        {isExpired && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300">
              This payment request has expired. Create a new one to receive payments.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-glow-blue/20 rounded-full flex items-center justify-center">
          <QrCode className="h-5 w-5 text-glow-blue" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Payment Request Generator</h3>
          <p className="text-sm text-slate-400">Create a QR code for receiving payments</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-2 block">Recipient Address</label>
          <input
            type="text"
            value={currentAddress}
            readOnly
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono opacity-70"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">
            Amount (STX) - Optional
          </label>
          <input
            type="number"
            value={requestData.amount}
            onChange={(e) => setRequestData({ ...requestData, amount: e.target.value })}
            placeholder="Leave empty for custom amount"
            step="0.01"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink"
          />
          <p className="text-xs text-slate-500 mt-1">
            Leave empty to let the payer choose the amount
          </p>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">
            Description - Optional
          </label>
          <textarea
            value={requestData.memo}
            onChange={(e) => setRequestData({ ...requestData, memo: e.target.value })}
            placeholder="What is this payment for?"
            rows={3}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-glow-pink resize-none"
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-2 block">
            Expires In (hours)
          </label>
          <select
            value={requestData.expiresIn}
            onChange={(e) => setRequestData({ ...requestData, expiresIn: parseInt(e.target.value) })}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-glow-pink"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={72}>3 days</option>
            <option value={168}>7 days</option>
            <option value={0}>Never</option>
          </select>
        </div>

        <div className="flex items-start gap-2 p-3 bg-glow-blue/10 border border-glow-blue/30 rounded-lg">
          <QrCode className="h-4 w-4 text-glow-blue flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300">
            Generate a QR code that others can scan to send you STX tokens.
          </p>
        </div>

        <button
          onClick={handleGenerateRequest}
          disabled={loading}
          className="w-full px-4 py-3 bg-glow-pink hover:bg-glow-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Generating...' : 'Generate Payment Request'}
        </button>
      </div>
    </div>
  );
};
