/** Small, local SVGs; adjacent text supplies the accessible link name. */
export default function SocialIcon({platform}:{platform:string}){
  const props={width:22,height:22,viewBox:'0 0 24 24','aria-hidden':true as const,focusable:false as const,className:'social-icon'};
  switch(platform){
    case 'wechat':return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 16.1a10 10 0 0 1-4.1-.4L3 17l.9-3A5.8 5.8 0 0 1 1.5 9.5C1.5 5.9 5 3 9.3 3c3.8 0 7 2.3 7.6 5.3"/><path d="M22.5 14.8c0-2.9-2.9-5.3-6.5-5.3s-6.5 2.4-6.5 5.3 2.9 5.3 6.5 5.3c.8 0 1.6-.1 2.3-.4l2.9 1.1-.7-2.5a4.9 4.9 0 0 0 2-3.5Z"/><g fill="currentColor" stroke="none"><circle cx="6.4" cy="8" r="1"/><circle cx="11.7" cy="8" r="1"/><circle cx="13.8" cy="13.9" r=".9"/><circle cx="18.3" cy="13.9" r=".9"/></g></svg>;
    case 'youtube':return <svg {...props} fill="currentColor"><path fillRule="evenodd" d="M3.2 4.9C5.1 4.5 8.3 4.3 12 4.3s6.9.2 8.8.6a2.8 2.8 0 0 1 2.1 2.2c.3 1.2.4 3 .4 4.9s-.1 3.7-.4 4.9a2.8 2.8 0 0 1-2.1 2.2c-1.9.4-5.1.6-8.8.6s-6.9-.2-8.8-.6a2.8 2.8 0 0 1-2.1-2.2C.8 15.7.7 13.9.7 12s.1-3.7.4-4.9a2.8 2.8 0 0 1 2.1-2.2ZM9.5 8v8l7-4-7-4Z"/></svg>;
    case 'bilibili':return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="15" rx="3"/><path d="m6 2 4 4m8-4-4 4M7 11v4m10-4v4m-7 2 2 1 2-1M7 21v1m10-1v1"/></svg>;
    case 'instagram':return <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg>;
    default:return null;
  }
}
