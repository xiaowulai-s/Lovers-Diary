import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '../lib/supabase';

export type AuthStatus = 'loading' | 'signedOut' | 'checking' | 'authorized' | 'error';

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  notice: string | null;
  authorizationError: string | null;
  debugDetail: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  retry: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid login credentials')) {
    return '邮箱或密码不正确。';
  }
  if (normalized.includes('email not confirmed')) {
    return '这个邮箱还没有完成验证。';
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return '尝试次数过多，请稍后再试。';
  }
  if (normalized.includes('invalid api key') || normalized.includes('invalid apikey')) {
    return 'Supabase 配置不正确，请检查 .env 中的 URL 与 publishable key。';
  }
  if (normalized.includes('network') || normalized.includes('fetch')) {
    return '网络连接失败，请检查网络后重试。';
  }

  return '登录失败，请稍后重试。';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [authorizationError, setAuthorizationError] = useState<string | null>(null);
  const [debugDetail, setDebugDetail] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const verifySession = useCallback(async (nextSession: Session | null) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSession(nextSession);

    if (!nextSession) {
      setStatus('signedOut');
      return;
    }

    setStatus('checking');
    setAuthorizationError(null);
    setDebugDetail(null);

    const { data, error } = await supabase.rpc('is_authorized');

    if (!mountedRef.current || requestId !== requestIdRef.current) {
      return;
    }

    if (error) {
      setStatus('error');
      setAuthorizationError('无法验证访问权限。请检查网络后再试，或退出后重新登录。');
      setDebugDetail(
        [error.code, error.message, error.details, error.hint].filter(Boolean).join(' · '),
      );

      if (__DEV__) {
        console.warn('[auth] is_authorized RPC failed', error);
      }
      return;
    }

    if (!data) {
      setNotice('这个账号不在授权名单里，无法进入小窝。');
      await supabase.auth.signOut({ scope: 'local' });
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return;
      }
      setSession(null);
      setStatus('signedOut');
      return;
    }

    setNotice(null);
    setDebugDetail(null);
    setStatus('authorized');
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      void verifySession(nextSession);
    });

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mountedRef.current) {
        return;
      }

      if (error) {
        setStatus('error');
        setAuthorizationError('读取本地登录状态失败，请重试。');
        setDebugDetail(error.message);
        return;
      }

      await verifySession(data.session);
    };

    void loadSession();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [verifySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    setNotice(null);
    setAuthorizationError(null);
    setDebugDetail(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      return mapAuthError(error.message);
    }

    setStatus('checking');
    return null;
  }, []);

  const signOut = useCallback(async () => {
    setNotice(null);
    setAuthorizationError(null);
    setDebugDetail(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      return '退出登录失败，请检查网络后重试。';
    }

    requestIdRef.current += 1;
    setSession(null);
    setStatus('signedOut');
    return null;
  }, []);

  const retry = useCallback(async () => {
    setStatus('checking');
    setAuthorizationError(null);
    setDebugDetail(null);

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setStatus('error');
      setAuthorizationError('读取本地登录状态失败，请重试。');
      setDebugDetail(error.message);
      return;
    }

    await verifySession(data.session);
  }, [verifySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      notice,
      authorizationError,
      debugDetail,
      signIn,
      signOut,
      retry,
    }),
    [status, session, notice, authorizationError, debugDetail, signIn, signOut, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用。');
  }

  return context;
}
