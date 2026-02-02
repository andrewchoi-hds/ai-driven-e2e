import { CheckSquare, Square, FileCode } from 'lucide-react';
import type { TestCase } from '../../types';

interface TestListProps {
  tests: TestCase[];
  selectedTests: Set<string>;
  onToggleTest: (id: string) => void;
}

export default function TestList({
  tests,
  selectedTests,
  onToggleTest,
}: TestListProps) {
  return (
    <div className="space-y-1 px-3 pb-2">
      {tests.map((test) => (
        <TestItem
          key={test.id}
          test={test}
          selected={selectedTests.has(test.id)}
          onToggle={() => onToggleTest(test.id)}
        />
      ))}
    </div>
  );
}

interface TestItemProps {
  test: TestCase;
  selected: boolean;
  onToggle: () => void;
}

function TestItem({ test, selected, onToggle }: TestItemProps) {
  const statusStyles = {
    pending: 'border-gray-200',
    running: 'border-blue-300 bg-blue-50',
    passed: 'border-green-200 bg-green-50',
    failed: 'border-red-200 bg-red-50',
    skipped: 'border-yellow-200 bg-yellow-50',
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
        statusStyles[test.status || 'pending']
      }`}
      onClick={onToggle}
    >
      {selected ? (
        <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
      ) : (
        <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 truncate">{test.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <FileCode className="w-3 h-3" />
            {test.file}:{test.line}
          </span>
          {test.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {test.status && test.status !== 'pending' && (
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            test.status === 'passed'
              ? 'bg-green-100 text-green-700'
              : test.status === 'failed'
              ? 'bg-red-100 text-red-700'
              : test.status === 'running'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {test.status}
        </span>
      )}

      {test.duration !== undefined && (
        <span className="text-xs text-gray-400">
          {(test.duration / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  );
}
