'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function AdminLogin({ activate = false }: { activate?: boolean }) {
  const [token, setToken] = useState(''), [email, setEmail] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [ready, setReady] = useState(!activate);
  const invitationRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activate) return;
    let active = true;
    if (invitationRef.current === null) {
      invitationRef.current = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    const invitation = invitationRef.current;
    setToken(invitation);
    if (!invitation) { setError('邀请链接不完整，请重新打开管理员发给你的链接。'); return; }
    api<{ email: string }>('/api/auth/invitation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: invitation }) })
      .then(data => { if (active) { setEmail(data.email); setReady(true); } })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [activate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const values = new FormData(event.currentTarget), password = String(values.get('password') || '');
    if (activate && password !== values.get('confirmPassword')) { setError('两次输入的密码不一致'); return; }
    setBusy(true);
    try {
      await api(activate ? '/api/auth/activate' : '/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activate ? { token, password } : { email: values.get('email'), password }),
      });
      window.location.assign('/admin/');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '登录失败，请稍后重试'); }
    finally { setBusy(false); }
  }
  return <div className="editor admin auth-page">
    <div className="eyebrow">BEHIND THE CURTAIN / 剧社后台</div>
    <h1>{activate ? '设置你的管理员密码。' : '欢迎回到幕后。'}</h1>
    <p className="editor-intro">{activate ? '此邀请只属于下方邮箱。设置密码后，即可管理剧目与管理员名单。' : '使用已获邀请的邮箱和密码登录。后台不开放自行注册。'}</p>
    {error && <p className="form-help" role="alert">{error}</p>}
    {activate && !ready && !error && <p role="status">正在检查邀请链接……</p>}
    {ready && <form className="auth-form" onSubmit={submit}>
      <label className="field"><span>邮箱</span><input name="email" type="email" autoComplete="username" maxLength={254} required {...activate ? { value: email, readOnly: true } : {}} /></label>
      <label className="field"><span>{activate ? '设置密码（15–128 个字符）' : '密码'}</span><input name="password" type="password" minLength={activate ? 15 : undefined} maxLength={128} autoComplete={activate ? 'new-password' : 'current-password'} required /></label>
      {activate && <label className="field"><span>再次输入密码</span><input name="confirmPassword" type="password" minLength={15} maxLength={128} autoComplete="new-password" required /></label>}
      <button className="button primary" disabled={busy} type="submit">{busy ? '正在处理……' : activate ? '设置密码并进入后台' : '登录后台'}</button>
    </form>}
    {!activate && <p className="auth-note">忘记密码时，请联系其他管理员撤销旧权限并重新邀请。</p>}
    <p><Link className="text-link" href={activate ? '/admin/login/' : '/archive/'}>{activate ? '已有密码？返回登录 →' : '返回剧目档案 →'}</Link></p>
  </div>;
}
