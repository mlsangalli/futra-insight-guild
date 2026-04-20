import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface Props {
  children: React.ReactNode;
  /** Short label that helps the user know what failed (e.g. "ranking", "comentários"). */
  label?: string;
  /** Optional fully custom fallback. Receives a reset handler. */
  fallback?: (reset: () => void, error?: Error) => React.ReactNode;
  /** Optional callback invoked once the user clicks reset. */
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Lightweight error boundary intended to wrap individual sections / widgets
 * (not full pages). Keeps the rest of the page usable when a single piece of
 * UI throws. Use this around hooks-driven widgets (leaderboard, comments,
 * achievements, charts, etc.).
 */
export class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('SectionErrorBoundary caught', {
      label: this.props.label,
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset, this.state.error);

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          {this.props.label
            ? `Não foi possível carregar ${this.props.label}.`
            : 'Esta seção não pôde ser carregada.'}
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          O resto da página continua funcionando normalmente.
        </p>
        <Button variant="outline" size="sm" onClick={this.reset}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Tentar novamente
        </Button>
      </div>
    );
  }
}
