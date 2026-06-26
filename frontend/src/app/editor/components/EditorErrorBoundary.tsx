import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary that wraps the CodeMirror editor pane.
 * Catches uncaught exceptions (e.g. WASM panics that survive the patch) and
 * renders a minimal recovery UI instead of tearing down the whole workspace.
 */
export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[EditorErrorBoundary] Editor crashed:', error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-1 items-center justify-center bg-white p-6">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-500" />
            <p className="mt-3 text-sm font-medium text-slate-700">
              Trình soạn thảo gặp lỗi không mong muốn
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {this.state.error?.message ?? 'Lỗi không xác định'}
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              Thử lại
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
