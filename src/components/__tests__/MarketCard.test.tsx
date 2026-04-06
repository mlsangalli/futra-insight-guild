import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MarketCard } from '@/components/futra/MarketCard';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

const baseMarket = {
  id: 'test-123',
  question: 'O Bitcoin vai bater 100k?',
  description: 'Previsão sobre BTC',
  category: 'crypto' as const,
  type: 'binary',
  status: 'open' as const,
  options: [
    { id: 'o1', label: 'Sim', votes: 80, creditsAllocated: 800, percentage: 80 },
    { id: 'o2', label: 'Não', votes: 20, creditsAllocated: 200, percentage: 20 },
  ],
  totalParticipants: 100,
  totalCredits: 1000,
  endDate: new Date(Date.now() + 86400000).toISOString(),
  createdAt: new Date().toISOString(),
  resolutionSource: '',
  resolutionRules: '',
  featured: false,
  trending: false,
};

describe('MarketCard', () => {
  it('renders question and leader percentage', () => {
    renderWithProviders(<MarketCard market={baseMarket} />);
    expect(screen.getByText('O Bitcoin vai bater 100k?')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders participant and credit counts', () => {
    renderWithProviders(<MarketCard market={baseMarket} />);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('1.0K')).toBeInTheDocument();
    expect(screen.getByText('1K')).toBeInTheDocument();
  });

  it('links to market detail page', () => {
    renderWithProviders(<MarketCard market={baseMarket} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/market/test-123');
  });
});
