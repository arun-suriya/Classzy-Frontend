
import { useState, type FormEvent } from "react";
import {
    ArrowRight,
    Eye,
    EyeOff,
    GraduationCap,
    LockKeyhole,
    Mail,
    ShieldCheck,
} from "lucide-react";

import "./Login.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        if (!email.trim() || !password) {
            setError("Please enter your email and password.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }

        // TODO: Connect your real authentication API here.
        // Validate credentials on the backend.
        // Never store the user's password in localStorage.

        setError("Authentication API is not connected yet.");
    }

    return (
        <main className="classzy-login">

            {/* LEFT: Branding section */}
            <section
                className="classzy-brand-panel"
                aria-labelledby="brand-heading"
            >
                <div
                    className="brand-orb brand-orb-one"
                    aria-hidden="true"
                />

                <div
                    className="brand-orb brand-orb-two"
                    aria-hidden="true"
                />

                <div className="brand-top">
                    <a
                        href="/login"
                        className="brand-logo"
                        aria-label="Centram Classzy"
                    >
                        <img
                            src="/classzy-logo.png"
                            alt="Centram Classzy"
                        />
                    </a>

                    <p className="brand-tagline">
                        <span className="tagline-dot" />
                        DIGITIZE <span>·</span> ENGAGE <span>·</span> SUCCEED
                    </p>
                </div>

                <div className="brand-content">
                    <div className="brand-icon">
                        <GraduationCap
                            size={32}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>

                    <p className="brand-eyebrow">
                        THE FUTURE OF SCHOOL MANAGEMENT
                    </p>

                    <h1 id="brand-heading">
                        Better school
                        <br />
                        management.
                        <span>Brighter futures.</span>
                    </h1>

                    <p className="brand-description">
                        One connected platform to simplify school
                        operations, empower educators, and keep your
                        school community in sync.
                    </p>

                    <div className="brand-features">
                        <span>School administration</span>
                        <span>Smart workflows</span>
                        <span>Connected communities</span>
                    </div>
                </div>

                <div className="brand-footer">
                    <ShieldCheck size={17} aria-hidden="true" />

                    <span>
                        A smarter way to manage your school
                    </span>

                    <span className="brand-footer-year">
                        © {new Date().getFullYear()}
                    </span>
                </div>
            </section>

            {/* RIGHT: Login section */}
            <section className="classzy-login-panel">

                <div
                    className="login-glow login-glow-one"
                    aria-hidden="true"
                />

                <div
                    className="login-glow login-glow-two"
                    aria-hidden="true"
                />

                <div className="login-panel-inner">

                    <div className="login-card">

                        {/* Logo shown on mobile */}
                        <div className="mobile-brand">
                            <img
                                src="/classzy-logo.png"
                                alt="Centram Classzy"
                            />

                            <p>DIGITIZE · ENGAGE · SUCCEED</p>
                        </div>

                        <div className="login-heading">

                            <div className="login-heading-icon">
                                <GraduationCap size={25} aria-hidden="true" />
                            </div>

                            <p className="login-eyebrow">
                                WELCOME TO CLASSZY
                            </p>

                            <h2>
                                Welcome back<span>.</span>
                            </h2>

                            <p className="login-subtitle">
                                Sign in to access your school management
                                dashboard.
                            </p>
                        </div>

                        <form
                            className="login-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >
                            <div className="login-field">

                                <label htmlFor="email">
                                    Email address
                                </label>

                                <div className="login-input-wrap">
                                    <Mail
                                        size={18}
                                        aria-hidden="true"
                                    />

                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        inputMode="email"
                                        autoComplete="username"
                                        placeholder="you@school.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="login-field">

                                <div className="login-label-row">
                                    <label htmlFor="password">
                                        Password
                                    </label>

                                    <a
                                        href="/forgot-password"
                                        className="forgot-password"
                                    >
                                        Forgot password?
                                    </a>
                                </div>

                                <div className="login-input-wrap">
                                    <LockKeyhole
                                        size={18}
                                        aria-hidden="true"
                                    />

                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowPassword((visible) => !visible)
                                        }
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <label className="remember-row">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />

                                <span className="remember-checkmark" />

                                <span>Remember me</span>
                            </label>

                            {error && (
                                <p
                                    className="login-error"
                                    role="alert"
                                    aria-live="polite"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                className="login-submit"
                            >
                                <span>Sign in to your account</span>

                                <ArrowRight
                                    size={19}
                                    aria-hidden="true"
                                />
                            </button>
                        </form>

                        <div className="secure-divider">
                            <span />
                            <p>SECURE ACCESS</p>
                            <span />
                        </div>

                        <p className="login-help">
                            Access is intended for authorized school
                            personnel. Contact your administrator if you
                            need assistance.
                        </p>
                    </div>

                    <footer className="login-footer">
                        <span>
                            © {new Date().getFullYear()} Centram Classzy
                        </span>

                        <span className="footer-separator">·</span>

                        <span>School Management Platform</span>
                    </footer>

                </div>
            </section>
        </main>
    );
}
