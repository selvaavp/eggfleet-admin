import { Card } from './Card';
import { Button } from './Button';

interface PageLoadErrorProps {
  title?: string;
  message?: string;
}

export function PageLoadError({
  title = 'Could not load data',
  message = 'The API may be offline or unreachable. Confirm the server is running, check VITE_API_BASE_URL if needed, then reload or sign in again.',
}: PageLoadErrorProps) {
  return (
    <Card className="max-w-lg border-red-200/90 bg-red-50/40">
      <p className="font-semibold text-dark">{title}</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <Button type="button" variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </Card>
  );
}
