import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function ThrowingComponent(): JSX.Element {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <div>Hello World</div>
      </ErrorBoundary>
    );
    expect(getByText('Hello World')).toBeInTheDocument();
  });

  it('renders fallback on error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders custom fallback', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getByText } = render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(getByText('Custom fallback')).toBeInTheDocument();
    spy.mockRestore();
  });
});
