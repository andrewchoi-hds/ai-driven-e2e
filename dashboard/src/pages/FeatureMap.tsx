import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, MousePointer, Monitor, ChevronRight, List } from 'lucide-react';
import type { Feature, TestFeatureMapping } from '../types';

// 스텝을 사용자 친화적인 형태로 변환
function parseStepToFriendly(step: string): { category: 'check' | 'action' | 'screen'; text: string } {
  let text = step
    .replace(/^(Given|When|Then|And|But|만약|주어진|그러면|그리고|하지만)\s+/i, '')
    .trim();

  if (text.includes('표시') || text.includes('보인다') || text.includes('있다') || text.includes('나타')) {
    text = text
      .replace(/가 표시된다$/, ' 확인')
      .replace(/이 표시된다$/, ' 확인')
      .replace(/표시된다$/, ' 표시됨');
    return { category: 'check', text };
  }

  if (text.includes('클릭') || text.includes('입력') || text.includes('선택') || text.includes('누른다') || text.includes('터치')) {
    return { category: 'action', text };
  }

  if (text.includes('이동') || text.includes('화면') || text.includes('페이지')) {
    return { category: 'screen', text };
  }

  return { category: 'check', text };
}

export default function FeatureMap() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [mappings, setMappings] = useState<TestFeatureMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'features' | 'mappings'>('features');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [featuresRes, mappingsRes] = await Promise.all([
        fetch('/api/features'),
        fetch('/api/mappings'),
      ]);

      if (featuresRes.ok) {
        const data = await featuresRes.json();
        setFeatures(data);
        if (data.length > 0) {
          setSelectedFeature(data[0]);
        }
      }

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalScenarios = features.reduce((acc, f) => acc + f.scenarios.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Map</h2>
          <p className="text-gray-500">
            {features.length}개 기능 • {totalScenarios}개 테스트 시나리오
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('features')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'features'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            기능별 보기
          </button>
          <button
            onClick={() => setViewMode('mappings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'mappings'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            매핑 테이블
          </button>
        </div>
      </div>

      {viewMode === 'features' ? (
        <div className="flex gap-6 h-[calc(100vh-220px)]">
          {/* Left: Feature List */}
          <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <List className="w-4 h-4" />
                기능 목록
              </h3>
            </div>
            <div className="flex-1 overflow-auto">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => {
                    setSelectedFeature(feature);
                    setSelectedScenario(null);
                  }}
                  className={`w-full text-left p-4 border-b border-gray-100 transition-colors ${
                    selectedFeature?.id === feature.id
                      ? 'bg-indigo-50 border-l-4 border-l-indigo-500'
                      : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`font-medium ${
                        selectedFeature?.id === feature.id ? 'text-indigo-700' : 'text-gray-900'
                      }`}>
                        {feature.name}
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {feature.scenarios.length}개 시나리오
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${
                      selectedFeature?.id === feature.id ? 'text-indigo-500' : 'text-gray-300'
                    }`} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Feature Detail */}
          <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {selectedFeature ? (
              <>
                {/* Feature Header */}
                <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-500">
                  <h3 className="text-xl font-bold text-white">{selectedFeature.name}</h3>
                  <p className="text-indigo-100 text-sm mt-1">
                    📄 {selectedFeature.file}
                  </p>
                </div>

                {/* Scenarios */}
                <div className="flex-1 overflow-auto p-5">
                  <div className="grid gap-4">
                    {selectedFeature.scenarios.map((scenario, idx) => {
                      const isExpanded = selectedScenario === scenario.id;
                      const parsedSteps = scenario.steps.map(parseStepToFriendly);
                      const checks = parsedSteps.filter(s => s.category === 'check');
                      const actions = parsedSteps.filter(s => s.category === 'action');
                      const screens = parsedSteps.filter(s => s.category === 'screen');

                      return (
                        <div
                          key={scenario.id}
                          className={`rounded-xl border transition-all ${
                            isExpanded
                              ? 'border-indigo-200 shadow-md'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Scenario Header - Always Visible */}
                          <button
                            onClick={() => setSelectedScenario(isExpanded ? null : scenario.id)}
                            className="w-full text-left p-4 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 font-bold rounded-lg text-sm">
                                {idx + 1}
                              </span>
                              <div>
                                <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {actions.length > 0 && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                      👆 {actions.length}개 행동
                                    </span>
                                  )}
                                  {checks.length > 0 && (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                      ✓ {checks.length}개 확인
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`} />
                          </button>

                          {/* Scenario Detail - Expandable */}
                          {isExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
                              {actions.length > 0 && (
                                <div className="bg-amber-50 rounded-lg p-3">
                                  <h5 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                                    <MousePointer className="w-4 h-4" />
                                    사용자가 하는 일
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {actions.map((item, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                                        <span className="mt-0.5">👆</span>
                                        <span>{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {screens.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-3">
                                  <h5 className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                                    <Monitor className="w-4 h-4" />
                                    화면 이동
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {screens.map((item, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                                        <span className="mt-0.5">📱</span>
                                        <span>{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {checks.length > 0 && (
                                <div className="bg-green-50 rounded-lg p-3">
                                  <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    확인하는 것들
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {checks.map((item, i) => (
                                      <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                                        <span className="mt-0.5">✓</span>
                                        <span>{item.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {scenario.tags.length > 0 && (
                                <div className="flex gap-1 pt-2">
                                  {scenario.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                    >
                                      {tag.replace('@', '#')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                왼쪽에서 기능을 선택하세요
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Mapping Table View */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">테스트 파일 ↔ Feature 파일 연결 현황</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">모듈</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">테스트 파일</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Feature 파일</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">테스트 수</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">시나리오 수</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((mapping) => (
                  <tr key={mapping.testFile} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                        {mapping.module}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {mapping.testFile}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">
                      {mapping.featureFile || (
                        <span className="text-gray-400 italic">미연결</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {mapping.testCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {mapping.scenarioCount || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {mapping.featureFile ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          ✓ 연결됨
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                          미연결
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
