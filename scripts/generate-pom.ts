#!/usr/bin/env tsx
/**
 * POM Generator CLI
 *
 * Usage:
 *   npx tsx scripts/generate-pom.ts <url> [options]
 *
 * Options:
 *   --output, -o    Output file path
 *   --class, -c     Class name for the Page Object
 *   --verbose, -v   Enable verbose logging
 *
 * Example:
 *   npx tsx scripts/generate-pom.ts https://example.com/login -o tests/pages/LoginPage.ts
 */

import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { createSDETAgent } from '../agents/sdet/index.js';
import 'dotenv/config';

interface CLIOptions {
  url: string;
  output?: string;
  className?: string;
  verbose?: boolean;
}

async function parseArgs(): Promise<CLIOptions> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
POM Generator - Generate Page Object Models from web pages

Usage:
  npx tsx scripts/generate-pom.ts <url> [options]

Options:
  --output, -o    Output file path (default: stdout)
  --class, -c     Class name for the Page Object
  --verbose, -v   Enable verbose logging
  --help, -h      Show this help message

Example:
  npx tsx scripts/generate-pom.ts https://example.com/login -o tests/pages/LoginPage.ts
    `);
    process.exit(0);
  }

  const url = args[0];
  const options: CLIOptions = { url };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--output' || arg === '-o') {
      options.output = next;
      i++;
    } else if (arg === '--class' || arg === '-c') {
      options.className = next;
      i++;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  return options;
}

async function main() {
  const options = await parseArgs();

  console.log(`\n🔍 Fetching page: ${options.url}\n`);

  // 브라우저 실행
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto(options.url, { waitUntil: 'load', timeout: 60000 });
    // SPA 렌더링을 위해 추가 대기
    await page.waitForTimeout(3000);
    const html = await page.content();

    console.log('🤖 Generating Page Object Model...\n');

    // SDET Agent 생성
    const agent = createSDETAgent({ verbose: options.verbose });

    // POM 생성
    const pom = await agent.generatePOM({
      html,
      url: options.url,
      className: options.className,
    });

    // 결과 출력
    if (options.output) {
      const outputDir = path.dirname(options.output);
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(options.output, pom.code);
      console.log(`✅ Page Object saved to: ${options.output}`);
    } else {
      console.log('--- Generated Page Object ---\n');
      console.log(pom.code);
    }

    // 메타데이터 출력
    console.log('\n--- Metadata ---');
    console.log(`Class Name: ${pom.className}`);
    console.log(`Locators: ${pom.locators.length}`);
    console.log(`Actions: ${pom.actions.length}`);
    console.log(`Generated: ${pom.metadata.generatedAt.toISOString()}`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
