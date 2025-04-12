// src/components/common/ErrorBoundary.jsx
import React, { Component } from 'react';
import { Button } from '../ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // Call onReset prop if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="rounded-md border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/50">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-300">
                Something went wrong
              </h3>
              
              <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                {this.props.fallback || (
                  <p>
                    An error occurred while trying to display this content. 
                    {process.env.NODE_ENV !== 'production' && (
                      <details className="mt-2 whitespace-pre-wrap text-red-600 dark:text-red-400">
                        <summary className="cursor-pointer">Show error details</summary>
                        <p className="mt-2">
                          {this.state.error && this.state.error.toString()}
                        </p>
                        <p className="mt-2">
                          {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </p>
                      </details>
                    )}
                  </p>
                )}
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={this.handleReset}
                  className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-800 dark:hover:bg-red-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;