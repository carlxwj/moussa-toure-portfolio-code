import {lazy,Suspense,useEffect} from 'react';
import {Route,Routes,useLocation} from 'react-router-dom';
import {Header,Footer} from './components/Chrome';
import Home from './pages/Home';
import ProjectDetail from './pages/ProjectDetail';
import PhotoStoryDetail from './pages/PhotoStoryDetail';
import Legal from './pages/Legal';
import AnalyticsConsent from './components/AnalyticsConsent';
const Admin=lazy(()=>import('./pages/Admin'));
function RouteScroll(){const {pathname}=useLocation();useEffect(()=>{if(pathname!=='/')window.scrollTo({top:0,behavior:'instant'})},[pathname]);return null}
export default function App(){const {pathname}=useLocation();const isAdmin=pathname.startsWith('/admin');return <><RouteScroll/>{!isAdmin&&<Header/>}<Routes><Route path="/" element={<Home/>}/><Route path="/projects/:slug" element={<ProjectDetail/>}/><Route path="/shootings/:id" element={<PhotoStoryDetail kind="shootings"/>}/><Route path="/experiences/:id" element={<PhotoStoryDetail kind="experiences"/>}/><Route path="/privacy" element={<Legal privacy/>}/><Route path="/legal" element={<Legal privacy={false}/>}/><Route path="/admin/*" element={<Suspense fallback={<main className="admin-loading">Loading administration…</main>}><Admin/></Suspense>}/><Route path="*" element={<main className="detail-404 section-shell"><h1>404</h1><a href="/">Home →</a></main>}/></Routes>{!isAdmin&&<Footer/>}{!isAdmin&&<AnalyticsConsent/>}</>}
