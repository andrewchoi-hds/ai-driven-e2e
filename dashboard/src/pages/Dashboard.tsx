import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Play,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RunSummary, ModuleStats } from '../types';

const COLORS: Record<string, string> = {
  passed: '#22c55e',
  failed: '#ef4444',
  skipped: '#f59e0b',
  '통과': '#22c55e',
  '실패': '#ef4444',
  '스킵': '#f59e0b',
};

export default function Dashboard() {
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [moduleStats, setModuleStats] = useState<ModuleStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, statsRes] = await Promise.all([
        fetch('/api/results/latest'),
        fetch('/api/results/stats'),
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setModuleStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = summary
    ? [
        { label: '전체', value: summary.total, icon: Clock, color: 'text-gray-600' },
        { label: '통과', value: summary.passed, icon: CheckCircle2, color: 'text-green-600' },
        { label: '실패', value: summary.failed, icon: XCircle, color: 'text-red-600' },
        { label: '스킵', value: summary.skipped, icon: AlertCircle, color: 'text-yellow-600' },
      ]
    : [
        { label: '전체', value: 184, icon: Clock, color: 'text-gray-600' },
        { label: '통과', value: '-', icon: CheckCircle2, color: 'text-green-600' },
        { label: '실패', value: '-', icon: XCircle, color: 'text-red-600' },
        { label: '스킵', value: '-', icon: AlertCircle, color: 'text-yellow-600' },
      ];

  const pieData = summary
    ? [
        { name: '통과', value: summary.passed },
        { name: '실패', value: summary.failed },
        { name: '스킵', value: summary.skipped },
      ].filter(d => d.value > 0)
    : [];

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
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-gray-500">테스트 실행 현황 요약</p>
        </div>
        <Link
          to="/tests"
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Play className="w-4 h-4" />
          테스트 실행
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
              </div>
              <Icon className={`w-10 h-10 ${color} opacity-20`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Result Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">결과 분포</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              아직 테스트 결과가 없습니다. 테스트를 실행해주세요.
            </div>
          )}
        </div>

        {/* Module Stats Bar Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">모듈별 테스트</h3>
          {moduleStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={moduleStats.slice(0, 8)} layout="vertical">
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="passed" stackId="a" fill={COLORS.passed} name="통과" />
                <Bar dataKey="failed" stackId="a" fill={COLORS.failed} name="실패" />
                <Bar dataKey="skipped" stackId="a" fill={COLORS.skipped} name="스킵" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-400">
              모듈 통계가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <Link
          to="/tests"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover group"
        >
          <h3 className="font-semibold text-gray-900 mb-2">테스트 탐색</h3>
          <p className="text-sm text-gray-500 mb-4">
            14개 모듈, 184개 테스트 케이스 탐색 및 실행
          </p>
          <div className="flex items-center text-primary-600 text-sm font-medium">
            테스트 보기
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/features"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover group"
        >
          <h3 className="font-semibold text-gray-900 mb-2">기능 명세</h3>
          <p className="text-sm text-gray-500 mb-4">
            10개 Gherkin 기능, 58개 시나리오 확인
          </p>
          <div className="flex items-center text-primary-600 text-sm font-medium">
            명세 보기
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/history"
          className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover group"
        >
          <h3 className="font-semibold text-gray-900 mb-2">실행 기록</h3>
          <p className="text-sm text-gray-500 mb-4">
            과거 테스트 실행 내역 및 트렌드 분석
          </p>
          <div className="flex items-center text-primary-600 text-sm font-medium">
            기록 보기
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Last Run Info */}
      {summary && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-2">최근 실행</h3>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span>
              <strong>시간:</strong>{' '}
              {new Date(summary.timestamp).toLocaleString('ko-KR')}
            </span>
            <span>
              <strong>소요:</strong> {(summary.duration / 1000).toFixed(1)}초
            </span>
            <span>
              <strong>통과율:</strong>{' '}
              {((summary.passed / summary.total) * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
