import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube2,
  FileText,
  History,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '대시보드' },
  { to: '/tests', icon: TestTube2, label: '테스트 탐색' },
  { to: '/features', icon: FileText, label: '기능 명세' },
  { to: '/history', icon: History, label: '실행 기록' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <nav className="space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 pt-8 border-t border-gray-200">
        <div className="px-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            요약
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">전체 테스트</span>
              <span className="font-medium">184</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">기능 명세</span>
              <span className="font-medium">10</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">모듈</span>
              <span className="font-medium">14</span>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
