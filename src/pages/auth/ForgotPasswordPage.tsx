import { useState, useRef, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Info, Mail } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { EyePasswordClosedIcon, EyePasswordOpenIcon } from '@/components/auth/EyePasswordIcons';
import { Button, Input } from '@/components/ui';
import { APP_ROUTES } from '@/constants';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ── Same asset paths as Login (served from /public) ───────────────────────────
const HERO_IMG = '/assets/auth/login/login-hero-illustration-2c7327.png';
const BTN_ARROW_ICON = '/assets/auth/login/icon-button-arrow.svg';

const emailSchema = z.object({
  identifier: z.string().email('Enter a valid email'),
});
const OTP_DIGITS = 6;

const otpSchema = z.object({
  otp: z.string().length(OTP_DIGITS, `Enter the ${OTP_DIGITS}-digit code`),
});
const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/\d/, 'Include a number'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type Step = 1 | 2 | 3 | 4;

/** Segmented OTP — Figma verification tray (`#6b7280` stroke, `#e9e8e6` fill, 12px radius) */
function OtpDigitInputs({
  value,
  onChange,
  disabled,
  digitCount,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  digitCount: number;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const pad = ' '.repeat(digitCount);
  const chars = (value.replace(/\D/g, '').slice(0, digitCount) + pad).slice(0, digitCount).split('');

  const setDigitAt = (index: number, raw: string) => {
    const d = raw.replace(/\D/g, '').slice(-1);
    const cur = value.replace(/\D/g, '').padEnd(digitCount, ' ').slice(0, digitCount).split('');
    cur[index] = d || ' ';
    const next = cur.join('').replace(/\s/g, '').slice(0, digitCount);
    onChange(next);
    if (d && index < digitCount - 1) refs.current[index + 1]?.focus();
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    const cell = chars[index]?.trim();
    if (e.key === 'Backspace' && !cell && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, digitCount);
    onChange(t);
    refs.current[Math.min(Math.max(t.length - 1, 0), digitCount - 1)]?.focus();
  };

  return (
    <div
      className="grid w-full gap-1.5 sm:gap-3"
      style={{ gridTemplateColumns: `repeat(${digitCount}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: digitCount }, (_, i) => i).map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          value={/\d/.test(chars[i] ?? '') ? (chars[i] as string) : ''}
          onChange={(e) => setDigitAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className={cn(
            'min-h-[48px] w-full min-w-0 rounded-xl border border-[#6b7280] bg-[#e9e8e6] py-2 text-center text-lg font-bold tabular-nums text-[#1a1c1b]',
            'transition-colors focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25',
            'sm:min-h-[54px] sm:text-2xl',
            disabled && 'opacity-50',
          )}
          aria-label={`Digit ${i + 1} of ${digitCount}`}
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const f1 = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) });
  const f2 = useForm<z.infer<typeof otpSchema>>({ resolver: zodResolver(otpSchema) });
  const f3 = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) });

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (step !== 2) return;
    const id = window.setInterval(() => {
      setResendCooldown((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [step]);

  const formatMmSs = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const reqMutation = useMutation({
    mutationFn: (identifier: string) => authApi.requestForgotPasswordOtp(identifier),
    onSuccess: (_, identifier) => {
      setEmail(identifier);
      toast.success('If an account exists, an OTP has been sent. Check your email (dev: server logs).');
      f2.reset({ otp: '' });
      setResendCooldown(60);
      setStep(2);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not send OTP.';
      toast.error(msg);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (data) => {
      setResetToken(data.resetToken);
      toast.success('Code verified. Choose your new password.');
      setStep(3);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid or expired code.';
      toast.error(msg);
    },
  });

  const resetMutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      setStep(4);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Reset failed.';
      toast.error(msg);
    },
  });

  const otpWatch = f2.watch('otp');

  /** Figma `255:1726` — Forgot Password (email): split hero + bordered column, accent card, ambient dots */
  if (step === 1) {
    return (
      <div
        className="flex min-h-screen flex-col bg-white md:flex-row"
        data-node-id="255:1726"
        data-name="Forgot Password"
      >
        <aside className="flex min-h-[min(46vh,380px)] flex-col items-center justify-center border-b border-primary/40 bg-auth-hero px-8 py-12 md:min-h-screen md:w-[683px] md:max-w-[52%] md:flex-none md:border-b-0 md:py-16">
          <div className="flex w-full max-w-[510px] items-center justify-center">
            <img
              src={HERO_IMG}
              alt=""
              className="h-auto w-full max-w-[510px] select-none"
              draggable={false}
            />
          </div>
        </aside>

        <section className="relative flex min-h-[54vh] flex-1 flex-col border-primary bg-white md:min-h-screen md:border-l md:border-solid">
          <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-[74px]">
            <div className="mx-auto flex w-full max-w-[448px] flex-col gap-12">
              <div className="flex overflow-hidden rounded-xl bg-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)]">
                <div
                  className="shrink-0 bg-gradient-to-br from-[#904d00] to-[#ff8c00]"
                  style={{ width: 4 }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 px-[39px] pb-10 pt-10 sm:px-10">
                  <header className="space-y-3">
                    <h1 className="font-display text-2xl font-bold leading-8 tracking-[-0.6px] text-[#1a1c1b]">
                      Forgot password?
                    </h1>
                    <div className="text-base font-normal leading-[26px] text-taupe">
                      <p>No worries, it happens. Enter your email below</p>
                      <p>and we&apos;ll send you instructions to reset your</p>
                      <p>password.</p>
                    </div>
                  </header>

                  <form
                    onSubmit={f1.handleSubmit((v) => reqMutation.mutate(v.identifier))}
                    className="mt-10 space-y-6"
                  >
                    <div className="flex flex-col gap-2">
                      <label
                        htmlFor="forgot-password-email"
                        className="text-[12px] font-semibold uppercase tracking-[1.2px] text-taupe"
                      >
                        Email address
                      </label>
                      <Input
                        id="forgot-password-email"
                        label={undefined}
                        type="email"
                        autoComplete="email"
                        placeholder="@example.com"
                        leftIcon={<Mail className="size-4 text-taupe/70" />}
                        error={f1.formState.errors.identifier?.message}
                        className="h-10 rounded-xl border-transparent bg-[#e9e8e6] py-2 text-base placeholder:text-[rgba(137,115,98,0.5)] focus:bg-white"
                        {...f1.register('identifier')}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-0 bg-primary px-4 text-base font-bold text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:bg-primary-dark"
                      loading={reqMutation.isPending}
                    >
                      Send Reset Link
                      {!reqMutation.isPending && (
                        <img
                          src={BTN_ARROW_ICON}
                          alt=""
                          aria-hidden
                          draggable={false}
                          className="size-[13px] shrink-0 object-contain"
                        />
                      )}
                    </Button>
                  </form>

                  <div className="mt-10 border-t border-[#e9e8e6] pt-8">
                    <Link
                      to={APP_ROUTES.LOGIN}
                      className="flex items-center justify-center gap-2 text-base font-semibold text-[#904d00] hover:text-[#7a4200]"
                    >
                      <ArrowLeft className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                      Return to Login
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4 opacity-40">
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /** Figma `257:1838` — Verification Code: 6 trays, Verify & Continue, resend row, Back to Login */
  if (step === 2) {
    return (
      <div
        className="flex min-h-screen flex-col bg-white md:flex-row"
        data-node-id="257:1838"
        data-name="Verification Code"
      >
        <aside className="flex min-h-[min(46vh,380px)] flex-col items-center justify-center border-b border-primary/40 bg-auth-hero px-8 py-12 md:min-h-screen md:w-[683px] md:max-w-[52%] md:flex-none md:border-b-0 md:py-16">
          <div className="flex w-full max-w-[510px] items-center justify-center">
            <img
              src={HERO_IMG}
              alt=""
              className="h-auto w-full max-w-[510px] select-none"
              draggable={false}
            />
          </div>
        </aside>

        <section className="relative flex min-h-[54vh] flex-1 flex-col border-primary bg-white md:min-h-screen md:border-l md:border-solid">
          <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-[74px]">
            <div className="mx-auto flex w-full max-w-[448px] flex-col gap-12">
              <div className="flex overflow-hidden rounded-xl bg-white shadow-[0px_8px_24px_0px_rgba(26,28,27,0.06)]">
                <div className="shrink-0 bg-primary" style={{ width: 4 }} aria-hidden />
                <div className="min-w-0 flex-1 px-8 pb-10 pt-10 sm:px-10">
                  <header className="space-y-[11px] text-center">
                    <h1 className="font-display text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#1a1c1b]">
                      Verification Code
                    </h1>
                    <div className="text-sm leading-[23px] text-taupe">
                      <p className="mb-0">We&apos;ve sent a 6-digit code to your email</p>
                      <p className="mt-0">
                        <span className="leading-[23px]">address </span>
                        <span className="font-semibold leading-[23px] text-[#1a1c1b]">{email}</span>
                      </p>
                    </div>
                  </header>

                  <form
                    onSubmit={f2.handleSubmit((v) =>
                      verifyMutation.mutate({ identifier: email, otp: v.otp }),
                    )}
                    className="mt-10 space-y-8"
                  >
                    <div className="space-y-2">
                      <Controller
                        control={f2.control}
                        name="otp"
                        render={({ field }) => (
                          <OtpDigitInputs
                            digitCount={OTP_DIGITS}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            disabled={verifyMutation.isPending}
                          />
                        )}
                      />
                      {f2.formState.errors.otp && (
                        <p className="text-center text-sm text-danger">{f2.formState.errors.otp.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border-0 bg-primary px-4 text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:bg-primary-dark disabled:opacity-60"
                      loading={verifyMutation.isPending}
                      disabled={(otpWatch?.length ?? 0) < OTP_DIGITS}
                    >
                      Verify {'&'} Continue
                      {!verifyMutation.isPending && (
                        <img
                          src={BTN_ARROW_ICON}
                          alt=""
                          aria-hidden
                          draggable={false}
                          className="size-[13px] shrink-0 object-contain"
                        />
                      )}
                    </Button>

                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[12px] font-normal uppercase tracking-[1.2px] text-taupe opacity-60">
                          Didn&apos;t receive the code?
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <button
                          type="button"
                          className={cn(
                            'font-semibold text-[#904d00] hover:text-[#7a4200]',
                            resendCooldown > 0 || reqMutation.isPending
                              ? 'cursor-not-allowed opacity-50'
                              : '',
                          )}
                          disabled={resendCooldown > 0 || reqMutation.isPending}
                          onClick={() => reqMutation.mutate(email)}
                        >
                          Resend Code
                        </button>
                        <div className="h-4 w-px shrink-0 bg-[rgba(221,193,174,0.3)]" aria-hidden />
                        <p className="text-center font-medium text-taupe">
                          Resend in{' '}
                          <span className="font-medium text-[#904d00]">{formatMmSs(resendCooldown)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-[#e9e8e6] pt-6">
                      <Link
                        to={APP_ROUTES.LOGIN}
                        className="flex items-center justify-center gap-2 text-sm font-medium text-taupe hover:text-[#1a1c1b]"
                      >
                        <ArrowLeft className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                        Back to Login
                      </Link>
                    </div>
                  </form>
                </div>
              </div>

              <div className="flex justify-center gap-4 opacity-40">
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /** Figma `257:2119` — Reset Your Password: dual fields, security tray, primary CTA, Return to Login */
  if (step === 3 && resetToken) {
    return (
      <div
        className="flex min-h-screen flex-col bg-white md:flex-row"
        data-node-id="257:2119"
        data-name="Reset Your Password"
      >
        <aside className="flex min-h-[min(46vh,380px)] flex-col items-center justify-center border-b border-primary/40 bg-auth-hero px-8 py-12 md:min-h-screen md:w-[683px] md:max-w-[52%] md:flex-none md:border-b-0 md:py-16">
          <div className="flex w-full max-w-[510px] items-center justify-center">
            <img
              src={HERO_IMG}
              alt=""
              className="h-auto w-full max-w-[510px] select-none"
              draggable={false}
            />
          </div>
        </aside>

        <section className="relative flex min-h-[54vh] flex-1 flex-col border-primary bg-white md:min-h-screen md:border-l md:border-solid">
          <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-[74px]">
            <div className="mx-auto flex w-full max-w-[448px] flex-col gap-12">
              <div className="flex overflow-hidden rounded-xl bg-white shadow-[0px_8px_24px_0px_rgba(26,28,27,0.06)]">
                <div className="shrink-0 bg-primary" style={{ width: 4 }} aria-hidden />
                <div className="min-w-0 flex-1 px-8 pb-10 pt-10 sm:px-10">
                  <header className="space-y-2 text-left">
                    <h1 className="font-display text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#1a1c1b]">
                      Reset Your Password
                    </h1>
                    <div className="text-base font-medium leading-[26px] text-taupe">
                      <p className="mb-0">Choose a strong password to protect your</p>
                      <p className="mt-0 leading-[26px]">account.</p>
                    </div>
                  </header>

                  <form
                    onSubmit={f3.handleSubmit((v) =>
                      resetMutation.mutate({ resetToken, newPassword: v.newPassword }),
                    )}
                    className="mt-8 space-y-6"
                  >
                    <div className="space-y-2">
                      <label
                        htmlFor="reset-new-password"
                        className="block text-sm font-semibold leading-5 text-taupe"
                      >
                        New Password
                      </label>
                      <Input
                        id="reset-new-password"
                        label={undefined}
                        type={showPw1 ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        rightIcon={
                          <button
                            type="button"
                            tabIndex={-1}
                            className="flex size-9 items-center justify-center rounded text-taupe/70 hover:text-taupe"
                            onClick={() => setShowPw1((s) => !s)}
                            aria-label={showPw1 ? 'Hide password' : 'Show password'}
                          >
                            {showPw1 ? <EyePasswordClosedIcon /> : <EyePasswordOpenIcon />}
                          </button>
                        }
                        error={f3.formState.errors.newPassword?.message}
                        className="rounded-lg border-transparent bg-[#e9e8e6] py-3.5 text-base placeholder:text-[rgba(137,115,98,0.5)] focus:bg-white"
                        {...f3.register('newPassword')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="reset-confirm-password"
                        className="block text-sm font-semibold leading-5 text-taupe"
                      >
                        Confirm New Password
                      </label>
                      <Input
                        id="reset-confirm-password"
                        label={undefined}
                        type={showPw2 ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        rightIcon={
                          <button
                            type="button"
                            tabIndex={-1}
                            className="flex size-9 items-center justify-center rounded text-taupe/70 hover:text-taupe"
                            onClick={() => setShowPw2((s) => !s)}
                            aria-label={showPw2 ? 'Hide confirm password' : 'Show confirm password'}
                          >
                            {showPw2 ? <EyePasswordClosedIcon /> : <EyePasswordOpenIcon />}
                          </button>
                        }
                        error={f3.formState.errors.confirmPassword?.message}
                        className="rounded-lg border-transparent bg-[#e9e8e6] py-3.5 text-base placeholder:text-[rgba(137,115,98,0.5)] focus:bg-white"
                        {...f3.register('confirmPassword')}
                      />
                    </div>

                    <div className="flex gap-3 rounded-lg bg-[#f4f3f1] p-4">
                      <Info className="mt-0.5 size-[18px] shrink-0 text-[#78471a]" strokeWidth={2} aria-hidden />
                      <div className="text-sm font-medium leading-5 text-[#78471a]">
                        <p className="mb-0">Password must be at least 8 characters and</p>
                        <p className="mt-0">include a number.</p>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border-0 bg-primary px-4 text-base font-semibold text-white shadow-[0px_8px_12px_rgba(26,28,27,0.06)] hover:bg-primary-dark"
                      loading={resetMutation.isPending}
                    >
                      Reset Password
                      {!resetMutation.isPending && (
                        <img
                          src={BTN_ARROW_ICON}
                          alt=""
                          aria-hidden
                          draggable={false}
                          className="size-3 shrink-0 object-contain"
                        />
                      )}
                    </Button>

                    <div className="pt-4">
                      <Link
                        to={APP_ROUTES.LOGIN}
                        className="flex items-center justify-center gap-2 text-sm font-semibold text-[#904d00] hover:text-[#7a4200]"
                      >
                        <ArrowLeft className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
                        Return to Login
                      </Link>
                    </div>
                  </form>
                </div>
              </div>

              <div className="flex justify-center gap-4 opacity-40">
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
                <span className="size-2 shrink-0 rounded-full bg-[#ffb77d]" />
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /** Figma `257:2281` — Password reset success: check badge, copy, Back to Login, tagline */
  if (step === 4) {
    return (
      <div
        className="flex min-h-screen flex-col bg-white md:flex-row"
        data-node-id="257:2281"
        data-name="Password Reset Successful"
      >
        <aside className="flex min-h-[min(46vh,380px)] flex-col items-center justify-center border-b border-primary/40 bg-auth-hero px-8 py-12 md:min-h-screen md:w-[683px] md:max-w-[52%] md:flex-none md:border-b-0 md:py-16">
          <div className="flex w-full max-w-[510px] items-center justify-center">
            <img
              src={HERO_IMG}
              alt=""
              className="h-auto w-full max-w-[510px] select-none"
              draggable={false}
            />
          </div>
        </aside>

        <section className="relative flex min-h-[54vh] flex-1 flex-col border-primary bg-white md:min-h-screen md:border-l md:border-solid">
          <div className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-[74px]">
            <div className="mx-auto flex w-full max-w-[448px] flex-col gap-12">
              <div className="flex overflow-hidden rounded-xl bg-white shadow-[0px_8px_24px_0px_rgba(26,28,27,0.06)]">
                <div className="shrink-0 bg-primary" style={{ width: 4 }} aria-hidden />
                <div className="min-w-0 flex-1 px-8 pb-10 pt-10 text-center sm:px-10">
                  <div className="flex justify-center">
                    <div className="flex h-20 w-20 flex-none items-center justify-center rounded-full bg-[#f4f3f1] py-3">
                      <div className="flex size-14 items-center justify-center rounded-full bg-[#22c55e] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]">
                        <Check className="size-[25px] text-white" strokeWidth={3} aria-hidden />
                      </div>
                    </div>
                  </div>

                  <h1 className="mt-4 font-display text-[30px] font-extrabold leading-9 tracking-[-0.75px] text-[#1a1c1b]">
                    <span className="block">Password Reset</span>
                    <span className="block">Successful</span>
                  </h1>

                  <div className="mx-auto mt-6 max-w-[352px] text-base font-medium leading-[26px] text-taupe">
                    <p className="mb-0">Your password has been updated. You can</p>
                    <p className="mb-0">now use your new credentials to log in to</p>
                    <p className="mt-0">your account.</p>
                  </div>

                  <Button
                    type="button"
                    className="mx-auto mt-8 flex h-10 w-full max-w-[352px] items-center justify-center gap-2 rounded-xl border-0 bg-primary px-6 text-lg font-bold text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] hover:bg-primary-dark"
                    onClick={() => navigate(APP_ROUTES.LOGIN, { replace: true })}
                  >
                    Back to Login
                    <img
                      src={BTN_ARROW_ICON}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="size-[13px] shrink-0 object-contain"
                    />
                  </Button>

                  <p className="mt-8 text-center text-[12px] font-medium tracking-[1.2px] text-[rgba(86,67,52,0.6)]">
                    ORGANIC PRECISION TRACKING
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-4 opacity-40">
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
                <span className="size-2 shrink-0 rounded-full bg-[#904d00]" />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}

