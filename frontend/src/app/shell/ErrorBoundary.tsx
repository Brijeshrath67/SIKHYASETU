import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { message: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('SikhyaSetu crashed', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message) {
      return (
        <div className="boot boot--error">
          <p>Something went wrong.</p>
          <pre>{this.state.message}</pre>
          <button type="button" onClick={() => this.setState({ message: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
