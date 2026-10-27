import { Component } from 'react';
import { ErrorState } from './States.jsx';

/** Keeps a rendering failure in one section from blanking the whole application. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('UI error', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This section failed to display"
          message="Reload the section to try again. Your favorites and recent conversions are safe."
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
