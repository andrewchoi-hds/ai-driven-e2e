import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TestExplorer from './pages/TestExplorer';
import FeatureMap from './pages/FeatureMap';
import RunHistory from './pages/RunHistory';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tests" element={<TestExplorer />} />
        <Route path="/features" element={<FeatureMap />} />
        <Route path="/history" element={<RunHistory />} />
      </Routes>
    </Layout>
  );
}

export default App;
