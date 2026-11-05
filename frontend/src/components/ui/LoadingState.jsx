import { Layers } from 'lucide-react';

export default function LoadingState({ message }) {
  return (
    <div className="py-24 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 animate-spin mb-3">
        <Layers className="w-5 h-5" />
      </div>
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}
