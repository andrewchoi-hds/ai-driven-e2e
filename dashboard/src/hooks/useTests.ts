import { useState, useEffect, useCallback } from 'react';
import type { TestCase, Feature, TestFeatureMapping } from '../types';

export function useTests() {
  const [tests, setTests] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tests');
      if (!res.ok) throw new Error('Failed to fetch tests');
      const data = await res.json();
      setTests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return { tests, loading, error, refetch: fetchTests };
}

export function useFeatures() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/features');
      if (!res.ok) throw new Error('Failed to fetch features');
      const data = await res.json();
      setFeatures(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  return { features, loading, error, refetch: fetchFeatures };
}

export function useMappings() {
  const [mappings, setMappings] = useState<TestFeatureMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mappings');
      if (!res.ok) throw new Error('Failed to fetch mappings');
      const data = await res.json();
      setMappings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return { mappings, loading, error, refetch: fetchMappings };
}
