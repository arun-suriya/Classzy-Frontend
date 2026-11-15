import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
    AlertCircle,
    ArrowRight,
    CalendarCheck,
    Eye,
    EyeOff,
    GraduationCap,
    Loader2,
    LockKeyhole,
    Mail,
    ShieldCheck,
    Wallet,
} from "lucide-react";

import { api, session } from "../services/api";
import "./Login.css";

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    // If a protected page sent the user here, go back to it after signing in.
    const redirectTo =
        (location.state as { from?: string } | null)?.from ?? "/dashboard";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Already signed in? Skip the login screen.
    if (session.isSignedIn()) {
        return <Navigate to={redirectTo} replace />;
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (loading) return;
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            await api.auth.login(email.trim(), password, remember);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            // The backend sends readable messages, e.g. "Invalid email or password."
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again.",
            );
            setLoading(false);
        }
    }

    return (
        <main className="cz-login">
            {/* ============ LEFT: brand stage ============ */}
            <section className="cz-stage" aria-labelledby="cz-headline">
                <span className="cz-arch" aria-hidden="true" />

                <header className="cz-top">
                    {/* The logo image already contains the DIGITIZE · ENGAGE · SUCCEED tagline */}
                    <a href="/login" className="cz-logo" aria-label="Classzy">
                        <img src="/classzy-logo.png" alt="Classzy - Digitize, Engage, Succeed" width={416} height={157} />
                    </a>
                </header>

                <div className="cz-pitch">
                    <p className="cz-eyebrow">
                        <GraduationCap size={16} aria-hidden="true" />
                        The future of school management
                    </p>
                    <h1 id="cz-headline">
                        Every classroom,
                        <br />
                        one connected <em>platform.</em>
                    </h1>
                    <p className="cz-lead">
                        Simplify school operations, empower educators and keep
                        your whole school community in sync.
                    </p>
                    <ul className="cz-pills">
                        <li>School administration</li>
                        <li>Smart workflows</li>
                        <li>Connected communities</li>
                    </ul>
                </div>

                {/* Decorative preview cards (illustration only) */}
                <div className="cz-floaters" aria-hidden="true">
                    <div className="cz-card cz-float-a">
                        <div className="cz-ring"><b>96%</b></div>
                        <div>
                            <strong>Attendance</strong>
                            <span>Marked in seconds</span>
                        </div>
                    </div>

                    <div className="cz-card cz-float-b">
                        <div className="cz-card-icon"><Wallet size={16} /></div>
                        <div>
                            <strong>Fee collection</strong>
                            <div className="cz-bars">
                                {[40, 62, 48, 78, 100].map((h, i) => (
                                    <span key={i} style={{ height: `${h}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="cz-card cz-float-c">
                        <div className="cz-card-icon"><CalendarCheck size={16} /></div>
                        <div>
                            <strong>Smart timetable</strong>
                            <span>Classes · sections · teachers</span>
                        </div>
                    </div>
                </div>

                <footer className="cz-stage-foot">
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>A smarter way to manage your school</span>
                    <span className="cz-year">© {new Date().getFullYear()}</span>
                </footer>
            </section>

            {/* ============ RIGHT: sign in ============ */}
            <section className="cz-access">
                <div className="cz-access-inner">
                    <div className="cz-panel">
                        <div className="cz-mobile-brand">
                            <img src="/classzy-logo.png" alt="Classzy - Digitize, Engage, Succeed" width={416} height={157} />
                        </div>

                        <div className="cz-heading">
                            <span className="cz-heading-icon">
                                <GraduationCap size={22} aria-hidden="true" />
                            </span>
                            <p className="cz-kicker">Welcome to Classzy</p>
                            <h2>
                                Welcome back<span>.</span>
                            </h2>
                            <p className="cz-sub">
                                Sign in to access your school management dashboard.
                            </p>
                        </div>

                        <form className="cz-form" onSubmit={handleSubmit} noValidate>
                            <div className="cz-field">
                                <label htmlFor="email">Email address</label>
                                <div className="cz-input">
                                    <Mail size={18} aria-hidden="true" />
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="username"
                                        placeholder="you@school.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="cz-field">
                                <div className="cz-label-row">
                                    <label htmlFor="password">Password</label>
                                    <a href="/forgot-password" className="cz-forgot">
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="cz-input">
                                    <LockKeyhole size={18} aria-hidden="true" />
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="cz-eye"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <label className="cz-remember">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span className="cz-check" />
                                <span>Keep me signed in on this device</span>
                            </label>

                            {error && (
                                <p className="cz-error" role="alert" aria-live="polite">
                                    <AlertCircle size={16} aria-hidden="true" />
                                    <span>{error}</span>
                                </p>
                            )}

                            <button type="submit" className="cz-submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="cz-spin" aria-hidden="true" />
                                        <span>Signing in…</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Sign in to your account</span>
                                        <ArrowRight size={18} aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="cz-divider">
                            <span />
                            <p>SECURE ACCESS</p>
                            <span />
                        </div>

                        <p className="cz-help">
                            Access is intended for authorized school personnel.
                            Contact your administrator if you need assistance.
                        </p>
                    </div>

                    <footer className="cz-foot">
                        <span>© {new Date().getFullYear()} Centram Classzy</span>
                        <span className="cz-sep">·</span>
                        <span>School Management Platform</span>
                    </footer>
                </div>
            </section>
        </main>
    );
}
