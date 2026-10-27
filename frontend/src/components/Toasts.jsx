import { useAppData } from '../context/AppData.jsx';
import Icon from './Icon.jsx';

export default function Toasts() {
  const { toasts } = useAppData();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          <Icon name={t.tone === 'success' ? 'star' : 'info'} size={16} filled={t.tone === 'success'} />
          {t.message}
        </div>
      ))}
    </div>
  );
}
