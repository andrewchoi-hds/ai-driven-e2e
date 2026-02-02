import { Activity, RefreshCw } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-primary-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">테스트 대시보드</h1>
            <p className="text-sm text-gray-500">AI 기반 E2E 테스트 시스템</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            HireVisa QA 환경
          </div>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>
      </div>
    </header>
  );
}
