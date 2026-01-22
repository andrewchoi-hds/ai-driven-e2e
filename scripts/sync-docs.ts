#!/usr/bin/env tsx
/**
 * Documentation Sync Script
 *
 * 테스트 구조를 분석하여 문서를 자동으로 업데이트합니다.
 *
 * Usage:
 *   npx tsx scripts/sync-docs.ts
 *
 * 자동 업데이트 대상:
 *   - CLAUDE.md: 테스트 구조 섹션
 *   - reports/test-summary.md: 테스트 요약 보고서
 */

import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

interface TestModule {
  name: string;
  directory: string;
  files: string[];
  testCount: number;
  description: string;
}

interface TestSummary {
  totalFiles: number;
  totalTests: number;
  modules: TestModule[];
  lastUpdated: string;
}

// 모듈별 설명 매핑
const MODULE_DESCRIPTIONS: Record<string, string> = {
  auth: '인증 플로우 (로그인/회원가입)',
  home: '홈 페이지 (상태별 UI)',
  passport: '여권 등록 플로우',
  school: '학교 선택 및 정보 등록',
  plan: '요금제 선택 (USIM/eSIM)',
  airport: '공항 서비스',
  mypage: '마이페이지',
  navigation: '하단 네비게이션',
  life: 'Life 콘텐츠',
  benefit: 'Benefit 페이지',
  discovery: '앱 탐색/디스커버리',
};

async function countTestsInFile(filePath: string): Promise<number> {
  const content = await fs.readFile(filePath, 'utf-8');

  // test('...') 또는 test("...") 패턴 카운트
  const testMatches = content.match(/\btest\s*\(\s*['"`]/g) || [];

  // test.skip 제외
  const skipMatches = content.match(/\btest\.skip\s*\(/g) || [];

  return testMatches.length - skipMatches.length;
}

async function analyzeTestStructure(): Promise<TestSummary> {
  const specsDir = path.join(ROOT_DIR, 'tests/specs');

  // 모든 스펙 디렉토리 찾기
  const specDirs = await fs.readdir(specsDir, { withFileTypes: true });
  const modules: TestModule[] = [];
  let totalTests = 0;
  let totalFiles = 0;

  for (const dir of specDirs) {
    if (dir.isDirectory()) {
      const modulePath = path.join(specsDir, dir.name);
      const specFiles = await glob(`${modulePath}/*.spec.ts`);

      // broken 파일 제외
      const validFiles = specFiles.filter((f) => !f.includes('broken'));

      let moduleTestCount = 0;
      for (const file of validFiles) {
        const count = await countTestsInFile(file);
        moduleTestCount += count;
      }

      if (validFiles.length > 0) {
        modules.push({
          name: dir.name,
          directory: dir.name,
          files: validFiles.map((f) => path.basename(f)),
          testCount: moduleTestCount,
          description: MODULE_DESCRIPTIONS[dir.name] || dir.name,
        });

        totalTests += moduleTestCount;
        totalFiles += validFiles.length;
      }
    }
  }

  // 루트 레벨 스펙 파일
  const rootSpecs = await glob(`${specsDir}/*.spec.ts`);
  const validRootSpecs = rootSpecs.filter((f) => !f.includes('broken'));

  if (validRootSpecs.length > 0) {
    let rootTestCount = 0;
    for (const file of validRootSpecs) {
      rootTestCount += await countTestsInFile(file);
    }

    modules.push({
      name: 'root',
      directory: '.',
      files: validRootSpecs.map((f) => path.basename(f)),
      testCount: rootTestCount,
      description: '기타 테스트',
    });

    totalTests += rootTestCount;
    totalFiles += validRootSpecs.length;
  }

  // 테스트 수 기준 정렬
  modules.sort((a, b) => b.testCount - a.testCount);

  return {
    totalFiles,
    totalTests,
    modules,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

function generateTestStructureMarkdown(summary: TestSummary): string {
  const moduleLines = summary.modules
    .filter((m) => m.name !== 'root')
    .map((m) => `├── ${m.directory.padEnd(15)} # ${m.description} - ${m.files.length}개 파일, ${m.testCount}개 테스트`)
    .join('\n');

  return `### 테스트 구조

\`\`\`
tests/specs/
${moduleLines}
\`\`\`

### 주요 테스트 모듈

| 모듈 | 파일 | 테스트 수 | 설명 |
|------|------|----------|------|
${summary.modules
  .filter((m) => m.name !== 'root')
  .map((m) => `| ${m.name} | ${m.files.join(', ')} | ${m.testCount}개 | ${m.description} |`)
  .join('\n')}

> **총계**: ${summary.totalFiles}개 파일, ${summary.totalTests}개 테스트 (${summary.lastUpdated} 기준)`;
}

async function updateClaudeMd(summary: TestSummary): Promise<void> {
  const claudeMdPath = path.join(ROOT_DIR, 'CLAUDE.md');
  let content = await fs.readFile(claudeMdPath, 'utf-8');

  // 테스트 구조 섹션 찾기 및 교체
  const structureStart = content.indexOf('### 테스트 구조');
  const structureEnd = content.indexOf('### 주요 테스트 모듈');

  // 주요 테스트 모듈 다음 섹션 찾기
  const nextSectionMatch = content
    .slice(structureEnd + 20)
    .match(/\n### [^테]/);
  const nextSectionIndex = nextSectionMatch
    ? structureEnd + 20 + (nextSectionMatch.index || 0)
    : content.indexOf('\n---', structureEnd);

  if (structureStart !== -1 && nextSectionIndex !== -1) {
    const newStructure = generateTestStructureMarkdown(summary);
    content =
      content.slice(0, structureStart) +
      newStructure +
      '\n\n' +
      content.slice(nextSectionIndex);

    await fs.writeFile(claudeMdPath, content);
    console.log('✅ CLAUDE.md 테스트 구조 업데이트 완료');
  } else {
    console.log('⚠️  CLAUDE.md에서 테스트 구조 섹션을 찾을 수 없습니다');
  }

  // 마지막 업데이트 날짜 갱신
  const dateRegex = /\*마지막 업데이트: \d{4}-\d{2}-\d{2}\*/;
  if (dateRegex.test(content)) {
    content = content.replace(
      dateRegex,
      `*마지막 업데이트: ${summary.lastUpdated}*`
    );
    await fs.writeFile(claudeMdPath, content);
  }
}

async function generateTestSummaryReport(summary: TestSummary): Promise<void> {
  const reportsDir = path.join(ROOT_DIR, 'reports');
  await fs.mkdir(reportsDir, { recursive: true });

  const report = `# 테스트 요약 보고서

> 자동 생성됨: ${summary.lastUpdated}

## 전체 현황

| 항목 | 값 |
|------|-----|
| 총 테스트 파일 | ${summary.totalFiles}개 |
| 총 테스트 케이스 | ${summary.totalTests}개 |
| 테스트 모듈 | ${summary.modules.length}개 |

## 모듈별 상세

${summary.modules
  .map(
    (m) => `### ${m.name}
- **설명**: ${m.description}
- **파일**: ${m.files.join(', ')}
- **테스트 수**: ${m.testCount}개
`
  )
  .join('\n')}

## 테스트 분포

\`\`\`
${summary.modules.map((m) => `${m.name.padEnd(12)} ${'█'.repeat(Math.ceil(m.testCount / 2))} ${m.testCount}`).join('\n')}
\`\`\`

---
*이 문서는 \`npm run docs:sync\` 명령으로 자동 생성됩니다.*
`;

  const reportPath = path.join(reportsDir, 'test-summary.md');
  await fs.writeFile(reportPath, report);
  console.log(`✅ ${reportPath} 생성 완료`);
}

async function main() {
  console.log('\n📊 테스트 문서 동기화\n');

  try {
    // 테스트 구조 분석
    console.log('🔍 테스트 구조 분석 중...');
    const summary = await analyzeTestStructure();

    console.log(`   발견: ${summary.totalFiles}개 파일, ${summary.totalTests}개 테스트\n`);

    // CLAUDE.md 업데이트
    console.log('📝 문서 업데이트 중...');
    await updateClaudeMd(summary);

    // 테스트 요약 보고서 생성
    await generateTestSummaryReport(summary);

    console.log('\n✨ 문서 동기화 완료!\n');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
