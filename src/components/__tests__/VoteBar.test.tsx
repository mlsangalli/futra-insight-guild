import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VoteBar } from '@/components/futra/VoteBar';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('VoteBar', () => {
  it('renders binary options with labels and percentages', () => {
    const options = [
      { id: '1', label: 'Sim', votes: 60, creditsAllocated: 600, percentage: 60 },
      { id: '2', label: 'Não', votes: 40, creditsAllocated: 400, percentage: 40 },
    ];
    renderWithProviders(<VoteBar options={options} type="binary" />);
    expect(screen.getByText('Sim 60%')).toBeInTheDocument();
    expect(screen.getByText('Não 40%')).toBeInTheDocument();
  });

  it('renders multiple options sorted by percentage', () => {
    const options = [
      { id: '1', label: 'A', votes: 10, creditsAllocated: 100, percentage: 10 },
      { id: '2', label: 'B', votes: 50, creditsAllocated: 500, percentage: 50 },
      { id: '3', label: 'C', votes: 40, creditsAllocated: 400, percentage: 40 },
    ];
    renderWithProviders(<VoteBar options={options} type="multiple" />);
    const labels = screen.getAllByText(/\d+%/);
    expect(labels[0].textContent).toBe('50%');
  });

  it('shows "+N opções" when compact and more than 3 options', () => {
    const options = [
      { id: '1', label: 'A', votes: 10, creditsAllocated: 100, percentage: 25 },
      { id: '2', label: 'B', votes: 10, creditsAllocated: 100, percentage: 25 },
      { id: '3', label: 'C', votes: 10, creditsAllocated: 100, percentage: 25 },
      { id: '4', label: 'D', votes: 10, creditsAllocated: 100, percentage: 25 },
    ];
    renderWithProviders(<VoteBar options={options} type="multiple" compact />);
    expect(screen.getByText('+1 opções')).toBeInTheDocument();
  });
});
