import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Trash2,
  Terminal,
  Monitor,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { RunSummary } from '../types';

export default function RunHistory() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/results/history');
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm('모든 실행 기록을 삭제하시겠습니까?')) return;

    try {
      await fetch('/api/results/history', { method: 'DELETE' });
      setRuns([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const trendData = runs
    .slice(0, 20)
    .reverse()
    .map((run, idx) => ({
      name: `#${idx + 1}`,
      passRate: Math.round((run.passed / run.total) * 100),
      passed: run.passed,
      failed: run.failed,
    }));

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
          <h2 className="text-2xl font-bold text-gray-900">실행 기록</h2>
          <p className="text-gray-500">
            총 {runs.length}회 실행 기록
          </p>
        </div>
        {runs.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            기록 삭제
          </button>
        )}
      </div>

      {/* Trend Chart */}
      {trendData.length > 1 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">통과율 추이</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'passRate' ? `${value}%` : value,
                  name === 'passRate' ? '통과율' : name,
                ]}
              />
              <Line
                type="monotone"
                dataKey="passRate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Run List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">최근 실행</h3>
        </div>

        {runs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            아직 실행 기록이 없습니다. 테스트를 실행해주세요.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {runs.map((run) => (
              <RunCard
                key={run.id}
                run={run}
                expanded={expandedRun === run.id}
                onToggle={() =>
                  setExpandedRun(expandedRun === run.id ? null : run.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RunCardProps {
  run: RunSummary;
  expanded: boolean;
  onToggle: () => void;
}

function RunCard({ run, expanded, onToggle }: RunCardProps) {
  const passRate = Math.round((run.passed / run.total) * 100);
  const statusColor =
    passRate === 100
      ? 'text-green-600 bg-green-50'
      : passRate >= 80
      ? 'text-yellow-600 bg-yellow-50'
      : 'text-red-600 bg-red-50';

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-lg font-medium ${statusColor}`}>
            {passRate}%
          </div>
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(run.timestamp).toLocaleDateString('ko-KR')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(run.timestamp).toLocaleTimeString('ko-KR')}
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                run.source === 'cli'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {run.source === 'cli' ? (
                  <><Terminal className="w-3 h-3" /> CLI</>
                ) : (
                  <><Monitor className="w-3 h-3" /> Dashboard</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1">
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {run.passed} 통과
              </span>
              <span className="flex items-center gap-1 text-sm text-red-600">
                <XCircle className="w-4 h-4" />
                {run.failed} 실패
              </span>
              <span className="flex items-center gap-1 text-sm text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                {run.skipped} 스킵
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {(run.duration / 1000).toFixed(1)}s
          </span>
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && run.results.length > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    상태
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    테스트
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                    소요시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {run.results.slice(0, 10).map((result) => (
                  <tr key={result.id} className="bg-white">
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                          result.status === 'passed'
                            ? 'bg-green-100 text-green-700'
                            : result.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {result.status === 'passed' && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {result.status === 'failed' && (
                          <XCircle className="w-3 h-3" />
                        )}
                        {result.status === 'skipped' && (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {result.testId}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-right">
                      {(result.duration / 1000).toFixed(2)}s
                    </td>
                  </tr>
                ))}
                {run.results.length > 10 && (
                  <tr className="bg-white">
                    <td
                      colSpan={3}
                      className="px-4 py-2 text-sm text-center text-gray-500"
                    >
                      +{run.results.length - 10}개 더 보기
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
