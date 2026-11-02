import { useCallback, useEffect, useState } from 'react';

type Updater<T> = T | ((previous: T) => T);

/**
 * localStorage와 동기화되는 상태.
 * - `validate`로 저장된 값을 검사한다(다른 버전·손상된 값이면 초기값).
 * - setter는 함수형 업데이트를 지원하고 참조가 고정된다(effect 의존성에 넣어도 안전).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): [T, (next: Updater<T>) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      const parsed: unknown = JSON.parse(raw);
      return validate(parsed) ? parsed : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 사생활 보호 모드 등 저장소를 쓸 수 없는 환경
    }
  }, [key, value]);

  const update = useCallback((next: Updater<T>) => {
    setValue((previous) =>
      typeof next === 'function' ? (next as (previous: T) => T)(previous) : next,
    );
  }, []);

  return [value, update];
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}
