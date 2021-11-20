import { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { getByTestId } from '@testing-library/dom';
import { render, cleanup } from '@testing-library/react';
import { createAtom } from '../atom/atom';
import { useAtom } from './useAtom';
import { StoreProvider } from '../store/StoreProvider';
import * as useIsomorphicLayoutEffectObject from '../../utils/useIsomorphicLayoutEffect';
import { useIsomorphicLayoutEffect } from '../../utils/useIsomorphicLayoutEffect';
import { useAtomDispatch } from './useAtomDispatch';
import { createStore } from '../store/store';

const expectRenderResult = (
  children: ReactElement,
  expectWithContainer: (container: HTMLElement) => void
) => {
  jest
    .spyOn(useIsomorphicLayoutEffectObject, 'useIsomorphicLayoutEffect')
    .mockImplementation((effect) => effect());

  it('CSR', () => {
    const { container } = render(children);

    expectWithContainer(container);
  });

  it('SSR', () => {
    const innerElement = renderToString(children);

    const container = document.createElement('div');
    container.innerHTML = innerElement;

    expectWithContainer(container);
  });
};

describe('useAtom', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('Initial state', () => {
    const User = () => {
      const userAtom = createAtom('user', {
        name: 'example',
        age: -1,
      });

      const [user] = useAtom(userAtom);

      return (
        <div>
          <p data-testid="name">{user.name}</p>
          <p data-testid="age">{user.age}</p>
        </div>
      );
    };

    expectRenderResult(
      <StoreProvider>
        <User />
      </StoreProvider>,
      (container) => {
        expect(getByTestId(container, 'name').textContent).toBe('example');
        expect(getByTestId(container, 'age').textContent).toBe('-1');
      }
    );
  });

  describe('Initial state from store', () => {
    type StoreValue = {
      user: {
        name: string;
        age: number;
      };
    };

    const initialUser = {
      name: '',
      age: -1,
    };

    const User = () => {
      const userAtom = createAtom('user', initialUser);

      const [user] = useAtom(userAtom);

      return (
        <div>
          <p data-testid="name">{user.name}</p>
          <p data-testid="age">{user.age}</p>
        </div>
      );
    };

    const store = createStore<StoreValue>({
      initialValue: {
        user: {
          name: 'example',
          age: 22,
        },
      },
    });

    expectRenderResult(
      <StoreProvider store={store}>
        <User />
      </StoreProvider>,
      (container) => {
        expect(getByTestId(container, 'name').textContent).toBe('example');
        expect(getByTestId(container, 'age').textContent).toBe('22');
      }
    );
  });

  describe('Dispatch', () => {
    const User = () => {
      const userAtom = createAtom('user', {
        name: '',
        age: -1,
      });

      const [name] = useAtom(userAtom, ({ name }) => name);
      const [age] = useAtom(userAtom, ({ age }) => age);
      const dispatch = useAtomDispatch(userAtom);

      useIsomorphicLayoutEffect(() => {
        dispatch({
          name: 'example',
          age: 22,
        });
      }, []);

      return (
        <div>
          <p data-testid="name">{name}</p>
          <p data-testid="age">{age}</p>
        </div>
      );
    };

    const store = createStore();
    expectRenderResult(
      <StoreProvider store={store}>
        <User />
      </StoreProvider>,
      (container) => {
        expect(getByTestId(container, 'name').textContent).toBe('example');
        expect(getByTestId(container, 'age').textContent).toBe('22');
        expect(store.getValue().user).toEqual({
          name: 'example',
          age: 22,
        });
      }
    );
  });

  describe('With multi atoms', () => {
    const User = () => {
      const userAtom = createAtom('user', {
        name: '',
        age: -1,
      });

      const countAtom = createAtom('count', 0);

      const [name] = useAtom(userAtom, ({ name }) => name);
      const [age] = useAtom(userAtom, ({ age }) => age);
      const [count] = useAtom(countAtom);
      const [nullable] = useAtom(countAtom, () => null);
      const userDispatch = useAtomDispatch(userAtom);
      const countDispatch = useAtomDispatch(countAtom);

      expect(nullable).toBe(null);

      useIsomorphicLayoutEffect(() => {
        userDispatch({
          name: 'example',
          age: 22,
        });
      }, [userDispatch]);

      useIsomorphicLayoutEffect(() => {
        countDispatch(10);
      }, [countDispatch]);

      return (
        <div>
          <p data-testid="name">{name}</p>
          <p data-testid="age">{age}</p>
          <p data-testid="count">{count}</p>
        </div>
      );
    };

    expectRenderResult(
      <StoreProvider>
        <User />
      </StoreProvider>,
      (container) => {
        expect(getByTestId(container, 'name').textContent).toBe('example');
        expect(getByTestId(container, 'age').textContent).toBe('22');
        expect(getByTestId(container, 'count').textContent).toBe('10');
      }
    );
  });
});
