import { Component } from "react";

// Catches unexpected rendering errors so the whole app does not turn into a blank page.
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("UI error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <section className="empty-state" role="alert">
          <h1>Something went wrong</h1>
          <p>Please refresh the page. If the problem continues, try again later.</p>
          <button type="button" onClick={() => window.location.assign("/")}>
            Go to home page
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
