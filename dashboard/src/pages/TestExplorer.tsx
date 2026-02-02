import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useTestRunner } from '../hooks/useTestRunner';
import TestList from '../components/tests/TestList';
import RunControls from '../components/execution/RunControls';
import LiveLog from '../components/execution/LiveLog';
import type { TestCase } from '../types';

const MODULES = [
  'auth',
  'plan',
  'mypage',
  'stay-expiry',
  'arc',
  'home',
  'school',
  'airport',
  'resilience',
  'life',
  'navigation',
  'benefit',
  'passport',
  'discovery',
];

export default function TestExplorer() {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const { isRunning, logs, runTests, clearLogs } = useTestRunner();

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data);
      }
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.file.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesModule =
      moduleFilter === 'all' || test.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const groupedTests = filteredTests.reduce<Record<string, TestCase[]>>(
    (acc, test) => {
      if (!acc[test.module]) acc[test.module] = [];
      acc[test.module].push(test);
      return acc;
    },
    {}
  );

  const toggleTest = (testId: string) => {
    setSelectedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const toggleModule = (module: string) => {
    const moduleTests = groupedTests[module] || [];
    const allSelected = moduleTests.every((t) => selectedTests.has(t.id));

    setSelectedTests((prev) => {
      const next = new Set(prev);
      moduleTests.forEach((t) => {
        if (allSelected) {
          next.delete(t.id);
        } else {
          next.add(t.id);
        }
      });
      return next;
    });
  };

  const selectAll = () => {
    if (selectedTests.size === filteredTests.length) {
      setSelectedTests(new Set());
    } else {
      setSelectedTests(new Set(filteredTests.map((t) => t.id)));
    }
  };

  const handleRunTests = () => {
    const testsToRun = tests.filter((t) => selectedTests.has(t.id));
    runTests(testsToRun);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">테스트 탐색</h2>
          <p className="text-gray-500">
            {MODULES.length}개 모듈, {tests.length}개 테스트
          </p>
        </div>
        <RunControls
          selectedCount={selectedTests.size}
          isRunning={isRunning}
          onRun={handleRunTests}
          onClear={() => setSelectedTests(new Set())}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="테스트명 또는 파일명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            필터
          </button>

          <button
            onClick={selectAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {selectedTests.size === filteredTests.length ? (
              <CheckSquare className="w-4 h-4 text-primary-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            전체 선택
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              모듈 필터
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setModuleFilter('all')}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  moduleFilter === 'all'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {MODULES.map((mod) => (
                <button
                  key={mod}
                  onClick={() => setModuleFilter(mod)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    moduleFilter === mod
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mod}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Test List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              테스트 목록 ({filteredTests.length}개)
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-auto">
            {Object.entries(groupedTests).map(([module, moduleTests]) => (
              <ModuleSection
                key={module}
                module={module}
                tests={moduleTests}
                selectedTests={selectedTests}
                onToggleTest={toggleTest}
                onToggleModule={toggleModule}
              />
            ))}
          </div>
        </div>

        {/* Live Log Panel */}
        <LiveLog logs={logs} onClear={clearLogs} />
      </div>
    </div>
  );
}

interface ModuleSectionProps {
  module: string;
  tests: TestCase[];
  selectedTests: Set<string>;
  onToggleTest: (id: string) => void;
  onToggleModule: (module: string) => void;
}

function ModuleSection({
  module,
  tests,
  selectedTests,
  onToggleTest,
  onToggleModule,
}: ModuleSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const selectedCount = tests.filter((t) => selectedTests.has(t.id)).length;
  const allSelected = selectedCount === tests.length;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="font-medium text-gray-900">{module}</span>
          <span className="text-sm text-gray-500">({tests.length})</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleModule(module);
          }}
          className="p-1"
        >
          {allSelected ? (
            <CheckSquare className="w-4 h-4 text-primary-600" />
          ) : selectedCount > 0 ? (
            <CheckSquare className="w-4 h-4 text-primary-300" />
          ) : (
            <Square className="w-4 h-4 text-gray-300" />
          )}
        </button>
      </button>

      {expanded && (
        <TestList
          tests={tests}
          selectedTests={selectedTests}
          onToggleTest={onToggleTest}
        />
      )}
    </div>
  );
}
