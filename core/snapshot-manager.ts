import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface Snapshot {
  id: string;
  url: string;
  html: string;
  timestamp: Date;
  testFile?: string;
  metadata?: Record<string, unknown>;
}

export interface SnapshotComparison {
  before: Snapshot;
  after: Snapshot;
  htmlDiff: string;
  changesSummary: string[];
}

export class SnapshotManager {
  private snapshotDir: string;
  private retentionDays: number;

  constructor(
    snapshotDir: string = './tests/snapshots',
    retentionDays: number = 30
  ) {
    this.snapshotDir = snapshotDir;
    this.retentionDays = retentionDays;
  }

  /**
   * 스냅샷 저장
   */
  async save(snapshot: Omit<Snapshot, 'id' | 'timestamp'>): Promise<Snapshot> {
    await this.ensureDir();

    const timestamp = new Date();
    const id = this.generateId(snapshot.url, timestamp);

    const fullSnapshot: Snapshot = {
      ...snapshot,
      id,
      timestamp,
    };

    const filePath = this.getFilePath(id);
    await fs.writeFile(filePath, JSON.stringify(fullSnapshot, null, 2));

    return fullSnapshot;
  }

  /**
   * 스냅샷 로드
   */
  async load(id: string): Promise<Snapshot | null> {
    try {
      const filePath = this.getFilePath(id);
      const content = await fs.readFile(filePath, 'utf-8');
      const snapshot = JSON.parse(content) as Snapshot;
      snapshot.timestamp = new Date(snapshot.timestamp);
      return snapshot;
    } catch {
      return null;
    }
  }

  /**
   * URL에 대한 최신 스냅샷 가져오기
   */
  async getLatest(url: string): Promise<Snapshot | null> {
    const snapshots = await this.listByUrl(url);
    if (snapshots.length === 0) return null;

    // 시간순 정렬 후 최신 반환
    snapshots.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return snapshots[0];
  }

  /**
   * URL에 대한 이전 스냅샷 가져오기 (n번째 이전)
   */
  async getPrevious(url: string, n: number = 1): Promise<Snapshot | null> {
    const snapshots = await this.listByUrl(url);
    if (snapshots.length <= n) return null;

    snapshots.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    return snapshots[n];
  }

  /**
   * URL에 대한 모든 스냅샷 목록
   */
  async listByUrl(url: string): Promise<Snapshot[]> {
    await this.ensureDir();

    const files = await fs.readdir(this.snapshotDir);
    const snapshots: Snapshot[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.snapshotDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const snapshot = JSON.parse(content) as Snapshot;

        if (snapshot.url === url) {
          snapshot.timestamp = new Date(snapshot.timestamp);
          snapshots.push(snapshot);
        }
      } catch {
        // 파일 읽기 실패 무시
      }
    }

    return snapshots;
  }

  /**
   * 두 스냅샷 비교
   */
  async compare(
    beforeId: string,
    afterId: string
  ): Promise<SnapshotComparison | null> {
    const before = await this.load(beforeId);
    const after = await this.load(afterId);

    if (!before || !after) return null;

    // 간단한 라인별 diff
    const beforeLines = before.html.split('\n');
    const afterLines = after.html.split('\n');
    const diffLines: string[] = [];
    const changes: string[] = [];

    const maxLines = Math.max(beforeLines.length, afterLines.length);
    let addedCount = 0;
    let removedCount = 0;

    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';

      if (beforeLine !== afterLine) {
        if (beforeLine && !afterLine) {
          diffLines.push(`- ${beforeLine}`);
          removedCount++;
        } else if (!beforeLine && afterLine) {
          diffLines.push(`+ ${afterLine}`);
          addedCount++;
        } else {
          diffLines.push(`- ${beforeLine}`);
          diffLines.push(`+ ${afterLine}`);
          addedCount++;
          removedCount++;
        }
      }
    }

    if (addedCount > 0) changes.push(`${addedCount} lines added`);
    if (removedCount > 0) changes.push(`${removedCount} lines removed`);

    return {
      before,
      after,
      htmlDiff: diffLines.join('\n'),
      changesSummary: changes,
    };
  }

  /**
   * 오래된 스냅샷 정리
   */
  async cleanup(): Promise<number> {
    await this.ensureDir();

    const files = await fs.readdir(this.snapshotDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    let deletedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.snapshotDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const snapshot = JSON.parse(content) as Snapshot;
        const timestamp = new Date(snapshot.timestamp);

        if (timestamp < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch {
        // 파일 처리 실패 무시
      }
    }

    return deletedCount;
  }

  /**
   * 테스트 파일에 연관된 스냅샷 가져오기
   */
  async getByTestFile(testFile: string): Promise<Snapshot[]> {
    await this.ensureDir();

    const files = await fs.readdir(this.snapshotDir);
    const snapshots: Snapshot[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      try {
        const filePath = path.join(this.snapshotDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const snapshot = JSON.parse(content) as Snapshot;

        if (snapshot.testFile === testFile) {
          snapshot.timestamp = new Date(snapshot.timestamp);
          snapshots.push(snapshot);
        }
      } catch {
        // 파일 읽기 실패 무시
      }
    }

    return snapshots.sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  private generateId(url: string, timestamp: Date): string {
    const urlHash = crypto
      .createHash('md5')
      .update(url)
      .digest('hex')
      .slice(0, 8);
    const timeStr = timestamp.toISOString().replace(/[:.]/g, '-');
    return `snapshot-${urlHash}-${timeStr}`;
  }

  private getFilePath(id: string): string {
    return path.join(this.snapshotDir, `${id}.json`);
  }

  private async ensureDir(): Promise<void> {
    try {
      await fs.access(this.snapshotDir);
    } catch {
      await fs.mkdir(this.snapshotDir, { recursive: true });
    }
  }
}

// 기본 인스턴스
let defaultManager: SnapshotManager | null = null;

export function getSnapshotManager(
  snapshotDir?: string,
  retentionDays?: number
): SnapshotManager {
  if (!defaultManager) {
    defaultManager = new SnapshotManager(snapshotDir, retentionDays);
  }
  return defaultManager;
}
