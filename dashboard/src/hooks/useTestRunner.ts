import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { TestCase, LogEntry } from '../types';

let socket: Socket | null = null;

export function useTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Initialize socket connection
    if (!socket) {
      socket = io({
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      });

      socket.on('connect', () => {
        addLog('info', 'Connected to test runner');
      });

      socket.on('disconnect', () => {
        addLog('warn', 'Disconnected from test runner');
      });

      socket.on('test:start', (data: { test: string }) => {
        addLog('info', `Starting: ${data.test}`);
      });

      socket.on('test:pass', (data: { test: string; duration: number }) => {
        addLog('success', `✓ PASSED: ${data.test} (${(data.duration / 1000).toFixed(2)}s)`);
      });

      socket.on('test:fail', (data: { test: string; error: string }) => {
        addLog('error', `✗ FAILED: ${data.test}`);
        addLog('error', `  Error: ${data.error}`);
      });

      socket.on('test:skip', (data: { test: string }) => {
        addLog('warn', `○ SKIPPED: ${data.test}`);
      });

      socket.on('run:start', (data: { total: number }) => {
        addLog('info', `=== Running ${data.total} tests ===`);
        setIsRunning(true);
      });

      socket.on('run:end', (data: { passed: number; failed: number; skipped: number; duration: number }) => {
        addLog('info', '=== Test run completed ===');
        addLog(
          data.failed > 0 ? 'error' : 'success',
          `Results: ${data.passed} passed, ${data.failed} failed, ${data.skipped} skipped (${(data.duration / 1000).toFixed(2)}s)`
        );
        setIsRunning(false);
      });

      socket.on('log', (data: { message: string; level?: LogEntry['level'] }) => {
        addLog(data.level || 'info', data.message);
      });
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLogs((prev) => [...prev, { timestamp, level, message }]);
  }, []);

  const runTests = useCallback(async (tests: TestCase[]) => {
    if (!socket || tests.length === 0) return;

    addLog('info', `Preparing to run ${tests.length} tests...`);

    try {
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tests: tests.map((t) => ({ file: t.file, title: t.title })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        addLog('error', `Failed to start tests: ${error}`);
      }
    } catch (error) {
      addLog('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [addLog]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    isRunning,
    logs,
    runTests,
    clearLogs,
  };
}
