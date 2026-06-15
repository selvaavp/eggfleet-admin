import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/store/auth.store';
import { EyePasswordClosedIcon, EyePasswordOpenIcon } from '@/components/auth/EyePasswordIcons';
import { Button, Input } from '@/components/ui';
import { APP_ROUTES } from '@/constants';
import toast from 'react-hot-toast';

// ── Local asset paths (served from /public) ─────────────────────────────────
const HERO_IMG = '/assets/auth/login/login-hero-illustration-2c7327.png';
const BTN_ARROW_ICON = '/assets/auth/login/icon-button-arrow.svg';

const authLabel = 'block text-sm font-semibold text-taupe mb-2';

const schema = z.object({
  identifier: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberDevice: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rememberDevice: false },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.accessToken, data.user, data.refreshToken ?? null);
      navigate(APP_ROUTES.DASHBOARD, { replace: true });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Check your credentials.';
      toast.error(msg);
    },
  });

  return (
    <div
      className="flex min-h-screen flex-col bg-white md:flex-row"
      data-node-id="254:1387"
      data-name="Login Screen"
    >
      {/* Left — hero; Figma left tint rgba(254, 113, 2, 0.2) via bg-auth-hero */}
      <aside className="flex min-h-[min(46vh,380px)] flex-col items-center justify-center border-b border-primary/40 bg-auth-hero px-8 py-12 md:min-h-screen md:w-[683px] md:max-w-[52%] md:flex-none md:border-b-0 md:py-16">
        <div className="flex w-full max-w-[510px] items-center justify-center">
          <img
            src={HERO_IMG}
            alt="EggFleet – Fast Egg Delivery"
            className="h-auto w-full max-w-[510px] select-none"
            draggable={false}
          />
        </div>
      </aside>

      {/* Right — form column (Figma: white panel + wordmark crop above tagline) */}
      <section className="relative flex min-h-0 min-h-[54vh] flex-1 flex-col justify-center border-primary bg-white px-5 py-10 sm:px-10 md:min-h-screen md:border-l md:border-solid md:px-16">
        <div className="mx-auto w-full max-w-[448px]">
          {/*
            Same asset as the left hero; show full wordmark scaled (no absolute % crop — avoids misaligned crops across resolutions/DPR).
          */}
          <div className="mb-6 flex w-full justify-center px-1" aria-hidden>
            <img
              src={HERO_IMG}
              alt=""
              className="h-auto max-h-[72px] w-auto max-w-[min(280px,100%)] object-contain object-center select-none sm:max-h-[80px]"
              draggable={false}
            />
          </div>

          <p className="mb-8 text-center text-base font-medium text-taupe">
            Freshness precisely delivered.
          </p>

          <div
            className="rounded-xl bg-white p-8 shadow-[0px_8px_12px_rgba(26,28,27,0.06)]"
            data-node-id="login-card"
          >
            <form
              onSubmit={handleSubmit((v) =>
                mutation.mutate({
                  identifier: v.identifier,
                  password: v.password,
                  rememberDevice: v.rememberDevice,
                })
              )}
              className="space-y-6"
            >
              <Input
                label="Email Address"
                labelClassName={authLabel}
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                leftIcon={<Mail className="size-4 text-taupe/70" />}
                error={errors.identifier?.message}
                className="bg-[#E9E8E6] border-transparent placeholder:text-[#a8a29e] placeholder:text-base text-base py-3.5 rounded-lg focus:bg-white"
                {...register('identifier')}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className={authLabel + ' mb-0'}>Password</span>
                  <Link
                    to={APP_ROUTES.FORGOT_PASSWORD}
                    className="shrink-0 text-xs font-semibold text-primary hover:text-primary-dark"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  label={undefined}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="size-4 text-taupe/70" />}
                  rightIcon={
                    <button
                      type="button"
                      tabIndex={-1}
                      className="flex size-10 items-center justify-center rounded text-taupe/70 hover:text-taupe"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyePasswordClosedIcon /> : <EyePasswordOpenIcon />}
                    </button>
                  }
                  error={errors.password?.message}
                  className="bg-[#E9E8E6] border-transparent placeholder:text-[#a8a29e] text-base py-3.5 rounded-lg focus:bg-white"
                  {...register('password')}
                />
              </div>

              <label className="flex cursor-pointer select-none items-center gap-3 px-1">
                <input
                  type="checkbox"
                  className="size-5 shrink-0 cursor-pointer rounded-[4px] border border-[#E9E8E6] bg-[#E9E8E6] accent-primary focus:ring-2 focus:ring-primary/30 focus:ring-offset-0"
                  {...register('rememberDevice')}
                />
                <span className="text-sm font-medium text-taupe">Keep me logged in</span>
              </label>

              <Button
                type="submit"
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-0 bg-primary text-lg font-semibold text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:bg-primary-dark"
                loading={mutation.isPending}
              >
                Login
                {!mutation.isPending && (
                  <img
                    src={BTN_ARROW_ICON}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="size-[18px] shrink-0 object-contain"
                  />
                )}
              </Button>
            </form>

            <div className="mt-6 border-t border-[#e9e8e6] pt-6 text-center text-sm">
              <span className="font-medium text-taupe">Don&apos;t have an account? </span>
              <span className="font-semibold text-[#904d00]">Contact your administrator</span>
            </div>
          </div>

          <div className="mt-10 flex justify-center opacity-60">
            <div className="h-1 w-32 rounded-full bg-gradient-to-r from-transparent via-[#ff8c00] to-transparent" />
          </div>
        </div>
      </section>
    </div>
  );
}
