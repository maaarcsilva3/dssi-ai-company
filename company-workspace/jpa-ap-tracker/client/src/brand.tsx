import logo from './assets/jpa-logo.png';

export const APP_NAME = 'JPAFLI FMCS';
export const APP_NAME_FULL = 'JPAFLI FMCS (Financial Monitoring and Control System)';
export const APP_TAGLINE = 'Financial Monitoring and Control System';

export function BrandMark({
  size = 'md',
  layout = 'row',
  showFullName = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  layout?: 'row' | 'stack';
  showFullName?: boolean;
}) {
  return (
    <div className={`brand-mark brand-mark-${size} brand-mark-${layout}`}>
      <img src={logo} alt="" className="brand-logo" width={size === 'lg' ? 88 : size === 'sm' ? 32 : 40} height={size === 'lg' ? 88 : size === 'sm' ? 32 : 40} />
      <div className="brand-text">
        <span className="brand-name">{APP_NAME}</span>
        {(showFullName || size === 'lg') && <span className="brand-tagline">{APP_TAGLINE}</span>}
      </div>
    </div>
  );
}
