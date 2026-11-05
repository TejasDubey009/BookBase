import { Loader2 } from 'lucide-react';

export default function LoadingState({ message }) {
  return (
    <div className="py-24 text-center">
      <Loader2 className="w-5 h-5 mx-auto mb-3 text-muted animate-spin" />
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
