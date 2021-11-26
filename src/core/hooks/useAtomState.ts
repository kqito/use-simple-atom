import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Listener, AtomStoreContext } from '../atomStore/atomStore';
import { Atom, EqualFn } from '../atom/atom';
import { Selector, useFunctionRef } from '../../utils/useFunctionRef';
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect';
import { isProduction } from '../../utils/isProduction';

export type UseAtomStateOptions<T, S> = {
  selector?: Selector<T, S>;
  equalFn?: EqualFn;
};

export type UseAtomState = {
  <T, S = T>(atom: Atom<T>): S;
  <T, S = T>(atom: Atom<T>, useAtomStateOptions?: UseAtomStateOptions<T, S>): S;
};

export const useAtomState: UseAtomState = <T, S>(
  atom: Atom<T>,
  { selector, equalFn }: UseAtomStateOptions<T, S> = {}
) => {
  const atomStore = useContext(AtomStoreContext);
  const selectStateRef = useFunctionRef(selector);
  const equalFnRef = useFunctionRef(equalFn);

  const selectState = useCallback(
    (state: T): S =>
      (selectStateRef.current ? selectStateRef.current(state) : state) as S,
    [selectStateRef]
  );

  const initialAtom = useMemo(
    (): Atom<T> => atomStore.mergeAtom<T>(atom),
    [atom, atomStore]
  );

  const [state, setState] = useState<S>(selectState(initialAtom.value));
  const prevStateRef = useRef<S>(selectState(initialAtom.value));

  useIsomorphicLayoutEffect(() => {
    const listener: Listener = (nextAtom) => {
      try {
        if (atom.key !== nextAtom.key) {
          return;
        }

        const newState = selectState(nextAtom.value as T);
        const targetEqualFn = equalFnRef.current || nextAtom.equalFn;
        if (targetEqualFn(prevStateRef.current, newState)) {
          return;
        }

        prevStateRef.current = newState;
        setState(newState);
      } catch (err) {
        if (isProduction) {
          return;
        }

        console.error(err);
      }
    };

    atomStore.subscribe(listener);

    return () => {
      atomStore.unsubscribe(listener);
    };
  }, [atom.key, selectState, atomStore]);

  return state;
};
