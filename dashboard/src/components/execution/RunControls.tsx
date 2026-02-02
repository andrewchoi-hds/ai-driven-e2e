import { Play, Trash2, Loader2 } from 'lucide-react';

interface RunControlsProps {
  selectedCount: number;
  isRunning: boolean;
  onRun: () => void;
  onClear: () => void;
}

export default function RunControls({
  selectedCount,
  isRunning,
  onRun,
  onClear,
}: RunControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {selectedCount > 0 && (
        <span className="text-sm text-gray-500">
          {selectedCount}개 선택됨
        </span>
      )}

      <button
        onClick={onClear}
        disabled={selectedCount === 0 || isRunning}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 className="w-4 h-4" />
        선택 해제
      </button>

      <button
        onClick={onRun}
        disabled={selectedCount === 0 || isRunning}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isRunning
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            실행 중...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            선택 실행
          </>
        )}
      </button>
    </div>
  );
}
