import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api';
import { useAuth } from '../auth';
import { BrandMark } from '../brand';
import { ErrorBox } from '../components';

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!auth.loading && auth.user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await auth.login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="login-page">
      <form className="card login-card" onSubmit={onSubmit}>
        <BrandMark size="lg" layout="stack" showFullName />
        <p className="muted login-lead">Sign in to continue</p>
        <label>
          Username
          <input autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <ErrorBox error={error} />
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="hint">Default admin: admin / admin123</p>
      </form>
    </section>
  );
}
