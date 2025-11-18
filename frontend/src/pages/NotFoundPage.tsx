import React from 'react';
import { Button } from '../components';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6">
        <div>
          <h1 className="text-6xl font-bold text-slate-900">404</h1>
          <p className="text-2xl font-semibold text-slate-700 mt-2">Page Not Found</p>
        </div>

        <p className="text-slate-600 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => (window.location.href = '/')}>Go to Dashboard</Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export { NotFoundPage };
