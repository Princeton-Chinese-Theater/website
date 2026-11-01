'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type AdminAccount } from '@/lib/api';

type Invitation = { email: string; invitationToken: string; expiresAt: string };
export default function AdminAccounts({ currentEmail }: { currentEmail: string }) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const [invitation, setInvitation] = useState<{ email: string; url: string } | null>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  async function refresh() { const data = await api<{ admins: AdminAccount[] }>('/api/admins'); setAccounts(data.admins); }
  useEffect(() => { void refresh().catch(reason => setError(reason.message)); }, []);
  async function invite(email: string) {
    setBusy(true); setError(''); setMessage(''); setInvitation(null);
    try {
      const result = await api<Invitation>('/api/admins/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      setInvitation({ email: result.email, url: window.location.origin + '/admin/activate/#token=' + result.invitationToken });
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '邀请失败'); }
    finally { setBusy(false); }
  }
  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); void invite(String(new FormData(event.currentTarget).get('email') || ''));
  }
  async function copyLink() {
    if (!invitation) return;
    try { await navigator.clipboard.writeText(invitation.url); setMessage('邀请链接已复制，请单独发送给被邀请者。'); }
    catch { linkRef.current?.focus(); linkRef.current?.select(); setMessage('请复制选中的邀请链接。'); }
  }
  async function revoke(email: string) {
    setBusy(true); setError(''); setMessage('');
    try {
      await api('/api/admins/revoke', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      if (invitation?.email === email) setInvitation(null);
      setMessage('权限已撤销，该账号的登录会话和邀请链接均已失效。'); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : '撤销失败'); }
    finally { setBusy(false); }
  }
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('');
    const form = event.currentTarget, values = new FormData(form);
    if (values.get('password') !== values.get('confirmPassword')) { setError('两次输入的新密码不一致'); return; }
    setBusy(true);
    try {
      await api('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: values.get('currentPassword'), password: values.get('password') }) });
      form.reset(); setMessage('密码已更新，其他设备的登录会话已退出。');
    } catch (reason) { setError(reason instanceof Error ? reason.message : '修改密码失败'); }
    finally { setBusy(false); }
  }
  return <section className="form-section admin-accounts" aria-labelledby="admin-accounts-title">
    <h2 id="admin-accounts-title">管理员</h2>
    <p className="editor-intro">所有已激活的管理员都可以邀请新人或撤销其他人的权限。邀请链接 24 小时内有效，仅能使用一次。</p>
    {error && <p className="form-help" role="alert">{error}</p>}
    {message && <p className="notice" role="status">{message}</p>}
    <form className="admin-invite-form" onSubmit={submitInvite}>
      <label className="field"><span>新管理员邮箱</span><input name="email" type="email" maxLength={254} autoComplete="off" required /></label>
      <button className="button primary" type="submit" disabled={busy}>添加并生成邀请</button>
    </form>
    {invitation && <div className="notice invitation-box"><p>给 {invitation.email} 的邀请链接。请单独发送给对方；对方打开后自行设置密码。</p><label className="field"><span>邀请链接</span><input ref={linkRef} value={invitation.url} readOnly aria-label="邀请链接" /></label><button className="button" onClick={copyLink}>复制邀请链接</button></div>}
    <ul className="admin-account-list">{accounts.map(account => <li key={account.email}>
      <div><strong>{account.email}</strong>{account.email === currentEmail && <span className="status-pill">当前账号</span>}<p>{account.status === 'active' ? '已激活' : account.status === 'invited' ? '待设置密码' : '已撤销'}</p></div>
      <div className="actions">{account.status !== 'active' && <button className="button" disabled={busy} onClick={() => void invite(account.email)}>重新邀请</button>}{account.status !== 'revoked' && account.email !== currentEmail && <button className="button" disabled={busy} onClick={() => void revoke(account.email)}>撤销权限</button>}</div>
    </li>)}</ul>
    <details className="admin-password"><summary>修改我的密码</summary><form className="auth-form" onSubmit={changePassword}>
      <label className="field"><span>当前密码</span><input name="currentPassword" type="password" autoComplete="current-password" maxLength={128} required /></label>
      <label className="field"><span>新密码（15–128 个字符）</span><input name="password" type="password" autoComplete="new-password" minLength={15} maxLength={128} required /></label>
      <label className="field"><span>再次输入新密码</span><input name="confirmPassword" type="password" autoComplete="new-password" minLength={15} maxLength={128} required /></label>
      <button className="button" disabled={busy} type="submit">更新密码</button>
    </form></details>
  </section>;
}
