import type { Metadata } from 'next';
import AdminLogin from '@/components/admin-login';
export const metadata: Metadata = { title: '设置管理员密码', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function ActivatePage() { return <AdminLogin activate />; }
