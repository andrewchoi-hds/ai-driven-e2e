import { useEffect, useRef } from 'react';
import { Terminal, Trash2, Download } from 'lucide-react';
import type { LogEntry } from '../../types';

interface LiveLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function LiveLog({ logs, onClear }: LiveLogProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const downloadLogs = () => {
    const content = logs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-logs-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-green-400" />
          <h3 className="font-semibold text-white">실시간 로그</h3>
          <span className="text-sm text-gray-400">({logs.length}개)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadLogs}
            disabled={logs.length === 0}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="로그 다운로드"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClear}
            disabled={logs.length === 0}
            className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="로그 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        ref={logContainerRef}
        className="flex-1 overflow-auto p-4 font-mono text-sm"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            테스트를 실행하면 여기에 로그가 표시됩니다...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-gray-500 flex-shrink-0">
                  [{log.timestamp}]
                </span>
                <span className={`flex-shrink-0 ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase().padEnd(7)}]
                </span>
                <span
                  className={`${
                    log.level === 'error'
                      ? 'text-red-300'
                      : log.level === 'success'
                      ? 'text-green-300'
                      : 'text-gray-300'
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
