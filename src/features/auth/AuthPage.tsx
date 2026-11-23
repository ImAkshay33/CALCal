import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { signUp, signIn, checkUsernameAvailable } from '@/data/auth';
import { mapAuthError } from '@/lib/utils';
import { Icon } from '@/components/Icon';

type AuthMode = 'signin' | 'create';

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('create');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Live username availability check
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (mode === 'signin') {
      setIsAvailable(null);
      return;
    }

    const trimmed = username.trim().toLowerCase();
    if (trimmed.length < 3 || !/^[a-z0-9_]+$/.test(trimmed)) {
      setIsAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUsername(true);
      try {
        const avail = await checkUsernameAvailable(trimmed);
        setIsAvailable(avail);
      } catch {
        setIsAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const passwordMismatch =
    mode === 'create' &&
    retypePassword.length > 0 &&
    password !== retypePassword;

  const canSubmit =
    !loading &&
    username.trim().length >= 3 &&
    password.length >= 8 &&
    (mode === 'signin' || (!passwordMismatch && retypePassword.length >= 8 && isAvailable !== false));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setGeneralError(null);

    const cleanUsername = username.trim().toLowerCase();

    try {
      if (mode === 'create') {
        await signUp(cleanUsername, password);
        navigate('/', { replace: true });
      } else {
        await signIn(cleanUsername, password);
        navigate('/', { replace: true });
      }
    } catch (err) {
      setGeneralError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-page-background text-ink-primary font-body-md text-body-md antialiased min-h-screen flex flex-col justify-between pt-safe pb-safe selection:bg-action-primary selection:text-action-text">
      <main className="flex-1 flex flex-col relative w-full bg-page-background max-w-md mx-auto">
        <div className="flex flex-col w-full">
          {/* Top Forest Green Hero / Branding Header */}
          <section className="bg-header-panel text-header-text rounded-b-[24px] px-margin pt-space-lg pb-space-xl flex flex-col items-center text-center shadow-md">
            <h1 className="font-display-hero-mobile text-display-hero-mobile text-header-text tracking-tight mb-space-xs">
              CALCal
            </h1>
            <p className="font-body-md text-body-md text-[#dce5df] max-w-[280px]">
              Log what you eat. See your macros and micros add up.
            </p>
          </section>

          {/* Interactive Form Area on Linen Beige Canvas */}
          <section className="px-margin -mt-space-md mb-space-lg">
            <div className="bg-card-background rounded-[20px] p-space-md shadow-sm">
              {/* Segmented Tab Selector */}
              <div className="flex items-center p-1 bg-page-background rounded-full mb-space-lg" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'signin'}
                  onClick={() => {
                    setMode('signin');
                    setGeneralError(null);
                  }}
                  className={`flex-1 py-space-xs text-center font-label-md text-label-md rounded-full transition-all ${
                    mode === 'signin'
                      ? 'bg-card-background text-ink-primary shadow-sm font-semibold'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'create'}
                  onClick={() => {
                    setMode('create');
                    setGeneralError(null);
                  }}
                  className={`flex-1 py-space-xs text-center font-label-md text-label-md rounded-full transition-all ${
                    mode === 'create'
                      ? 'bg-card-background text-ink-primary shadow-sm font-semibold'
                      : 'text-ink-secondary hover:text-ink-primary'
                  }`}
                >
                  Create account
                </button>
              </div>

              {/* Form Container */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
                {/* General Error Banner */}
                {generalError && (
                  <div className="p-3 rounded-xl bg-status-danger/10 border border-status-danger/20 text-status-danger flex items-start gap-2">
                    <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                    <span className="font-body-sm text-body-sm">{generalError}</span>
                  </div>
                )}

                {/* Username Field */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-ink-primary font-medium" htmlFor="username">
                      Username
                    </label>

                    {/* Available / Taken status in Create Mode */}
                    {mode === 'create' && username.trim().length >= 3 && (
                      <>
                        {checkingUsername ? (
                          <span className="inline-flex items-center gap-1 text-ink-secondary font-label-sm text-label-sm">
                            checking...
                          </span>
                        ) : isAvailable === true ? (
                          <span className="inline-flex items-center gap-1 text-status-safe bg-status-safe/10 px-2 py-0.5 rounded-full font-label-sm text-label-sm">
                            <Icon name="check_circle" size={14} />
                            <span>available</span>
                          </span>
                        ) : isAvailable === false ? (
                          <span className="inline-flex items-center gap-1 text-status-danger bg-status-danger/10 px-2 py-0.5 rounded-full font-label-sm text-label-sm">
                            <Icon name="cancel" size={14} />
                            <span>taken</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="e.g. priya_sharma"
                      required
                      className="w-full bg-page-background text-ink-primary font-body-md text-body-md rounded-xl px-space-md py-3 pr-10 focus:outline-none focus:bg-surface-container-high transition-colors placeholder:text-ink-secondary/60"
                    />
                    {mode === 'create' && isAvailable === true && (
                      <span className="absolute right-3 text-status-safe">
                        <Icon name="check" size={20} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div className="flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-ink-primary font-medium" htmlFor="password">
                      Password
                    </label>
                    {mode === 'create' && password.length > 0 && password.length < 8 && (
                      <span className="font-label-sm text-label-sm text-ink-secondary">
                        Min 8 characters
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full bg-page-background text-ink-primary font-body-md text-body-md rounded-xl px-space-md py-3 pr-11 focus:outline-none focus:bg-surface-container-high transition-colors placeholder:text-ink-secondary/60"
                    />
                    <button
                      type="button"
                      aria-label="Toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center"
                    >
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
                    </button>
                  </div>
                </div>

                {/* Retype Password Field (Create mode only) */}
                {mode === 'create' && (
                  <div className="flex flex-col gap-space-xs">
                    <label className="font-label-md text-label-md text-ink-primary font-medium" htmlFor="retype-password">
                      Retype password
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="retype-password"
                        type={showRetypePassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={retypePassword}
                        onChange={(e) => setRetypePassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        className="w-full bg-page-background text-ink-primary font-body-md text-body-md rounded-xl px-space-md py-3 pr-11 focus:outline-none focus:bg-surface-container-high transition-colors placeholder:text-ink-secondary/60"
                      />
                      <button
                        type="button"
                        aria-label="Toggle retype password visibility"
                        onClick={() => setShowRetypePassword(!showRetypePassword)}
                        className="absolute right-3 p-1 text-ink-secondary hover:text-ink-primary transition-colors flex items-center justify-center"
                      >
                        <Icon name={showRetypePassword ? 'visibility_off' : 'visibility'} size={20} />
                      </button>
                    </div>

                    {/* Inline Mismatch Error */}
                    {passwordMismatch && (
                      <div className="flex items-center gap-1.5 pt-0.5 text-status-danger">
                        <Icon name="error" size={16} />
                        <span className="font-label-sm text-label-sm">Passwords don't match.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Security Disclaimer */}
                <div className="flex items-start gap-2 pt-1 pb-1">
                  <span className="text-ink-secondary mt-0.5 shrink-0">
                    <Icon name="lock" size={18} />
                  </span>
                  <p className="font-body-sm text-body-sm text-ink-secondary leading-snug">
                    There is no password recovery, so keep your password safe.
                  </p>
                </div>

                {/* Primary Action CTA (Electric Purple) */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full mt-space-xs py-3.5 px-space-lg rounded-[16px] bg-action-primary text-action-text font-title-sm text-title-sm tracking-normal text-center shadow-[0_8px_24px_-4px_rgba(26,38,32,0.14)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
                >
                  <span>{loading ? 'Please wait...' : mode === 'create' ? 'Create account' : 'Sign in'}</span>
                  {!loading && <Icon name="arrow_forward" size={18} />}
                </button>
              </form>
            </div>

            {/* Alternate Mode Prompt & Guest Mode */}
            <div className="text-center mt-space-md mb-space-sm space-y-2">
              <p className="font-body-md text-body-md text-ink-secondary">
                {mode === 'create' ? 'Already have an account?' : 'New to CALCal?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'create' ? 'signin' : 'create');
                    setGeneralError(null);
                  }}
                  className="font-title-sm text-title-sm text-ink-primary underline underline-offset-4 ml-1.5"
                >
                  {mode === 'create' ? 'Sign in' : 'Create account'}
                </button>
              </p>
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="font-label-sm text-label-sm text-ink-secondary hover:text-ink-primary transition-colors py-1 px-3 rounded-full hover:bg-card-background"
                >
                  Continue as guest &rarr;
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
