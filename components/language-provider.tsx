'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import translations from '@/data/translations.json';
export type Language = 'zh' | 'en';
const dictionary: Record<string,string> = translations;
const LanguageContext = createContext<{language:Language;setLanguage:(language:Language)=>void;t:(text:string)=>string}>({language:'zh',setLanguage:()=>{},t:text=>text});
export function LanguageProvider({children}:{children:ReactNode}){
  const [language,updateLanguage]=useState<Language>('zh');
  useEffect(()=>{try{if(localStorage.getItem('pct-language')==='en')updateLanguage('en');}catch{}},[]);
  useEffect(()=>{document.documentElement.lang=language==='en'?'en':'zh-CN';},[language]);
  const setLanguage=(next:Language)=>{updateLanguage(next);try{localStorage.setItem('pct-language',next);}catch{}};
  const t=(text:string)=>language==='en'?(dictionary[text]||text.replace('学期待考','Term unconfirmed')):text;
  return <LanguageContext.Provider value={{language,setLanguage,t}}>{children}</LanguageContext.Provider>;
}
export const useLanguage=()=>useContext(LanguageContext);
export function LanguageSwitch(){
  const {language,setLanguage}=useLanguage();
  return <div className="language-switch" role="group" aria-label="Language / 语言"><button type="button" lang="zh-CN" aria-pressed={language==='zh'} onClick={()=>setLanguage('zh')}>中文</button><span aria-hidden="true">/</span><button type="button" lang="en" aria-pressed={language==='en'} onClick={()=>setLanguage('en')}>EN</button></div>;
}
