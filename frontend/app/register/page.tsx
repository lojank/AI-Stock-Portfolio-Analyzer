'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data?.user) {
        localStorage.setItem('userId', data.user.id);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
          Create a new account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-zinc-900 py-8 px-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <form className="space-y-6" onSubmit={handleRegister}>
            {error && (
              <div className="rounded border border-rose-100 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/10 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-400">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full appearance-none rounded border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-0 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full appearance-none rounded border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-0 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                Confirm Password
              </label>
              <div className="mt-2">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full appearance-none rounded border border-zinc-200 dark:border-zinc-700 px-3.5 py-2.5 placeholder-zinc-400 focus:border-teal-500 focus:outline-none focus:ring-0 text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center rounded bg-teal-600 hover:bg-teal-700 py-2.5 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing up...' : 'Sign up'}
              </button>
            </div>
          </form>
          
          <div className="mt-6 flex flex-col gap-4 text-center">
             <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                Already have an account? Sign in
             </Link>
          </div>
        </div>
      </div>
    </div>
  );

}
