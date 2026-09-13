import { PlanOverview } from './PlanOverview.jsx';

export function SubscriptionSection({ lang }) {
  return (
    <div className="nexo-settings-block" style={{ borderBottom: 'none' }}>
      <PlanOverview lang={lang} />
    </div>
  );
}