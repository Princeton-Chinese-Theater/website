import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin-dashboard';
export const metadata: Metadata={title:'剧目管理',robots:{index:false,follow:false}};
export default function Admin(){return <AdminDashboard/>;}
