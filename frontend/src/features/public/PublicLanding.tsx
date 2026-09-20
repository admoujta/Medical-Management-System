import { motion } from 'framer-motion'
import { type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CalendarCheck,
  Clock3,
  CreditCard,
  FileHeart,
  HeartPulse,
  Mail,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UsersRound,
  X
} from 'lucide-react'
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { AudienceSwitch } from '../../components/AudienceSwitch'
import { applyLanguage, getPreferredLanguage } from '../../i18n'
import { PatientLandingPage } from './PatientLanding'

type PublicLandingProps = {
  onStart: () => void
  onPatientStart: () => void
  onPatientBook: () => void
  onPatientSpace?: () => void
  onLogin: () => void
  onPricing?: () => void
  initialAudience?: 'doctor'|'patient'
}

type Language = 'fr' | 'ar' | 'en'
type Translate = (text: string) => string

const translations: Record<Exclude<Language, 'fr'>, Record<string, string>> = {
  en: {
    'Accueil':'Home','Solutions':'Solutions','Fonctionnalités':'Features','Tarifs':'Pricing','Témoignages':'Testimonials','Contact':'Contact','Connexion':'Sign in','Créer mon cabinet':'Create my practice',
    'Tarification transparente':'Transparent pricing','Des offres simples pour chaque cabinet':'Simple plans for every practice','Commencez par un essai gratuit, puis activez l’offre adaptée à votre organisation.':'Start with a free trial, then activate the plan that fits your organization.','Recommandée':'Recommended','an':'year','mois':'month','jours d’essai gratuit':'days free trial','Choisir cette offre':'Choose this plan','Comparer toutes les offres':'Compare all plans',
    'Plateforme SaaS médicale multi-cabinets':'Multi-practice medical SaaS platform','Le médecin se concentre sur ses patients, FADAA gère le reste.':'Doctors focus on their patients; FADAA handles the rest.','Centralisez agenda, dossiers patients, honoraires, CNSS/CNOPS, documents et relances dans une instance isolée pour votre cabinet.':'Centralize schedules, patient records, fees, CNSS/CNOPS, documents and reminders in a secure space dedicated to your practice.','Démarrer l’essai gratuit':'Start free trial','Voir les solutions':'View solutions','Cabinet médical moderne':'Modern medical practice',
    'temps administratif':'administrative time','rendez-vous confirmés':'confirmed appointments','accès cabinet':'practice access','données isolées':'isolated data','Nos solutions':'Our solutions','Une suite médicale pour piloter le cabinet sans dispersion':'A medical suite to run your practice in one place','Une présentation publique claire: promesse, modules, preuves, témoignages et appel à l’inscription.':'A clear platform that brings together every essential medical workflow.','Gestion 360':'360 management','Finance médicale':'Medical finance','Remboursements':'Reimbursements',
    'Agenda, patients, visites, documents et droits utilisateurs dans un espace cabinet isolé.':'Schedule, patients, visits, documents and user permissions in a secure practice space.','Paiements, reste à payer, reçus et suivi clair des impayés par patient.':'Payments, outstanding balances, receipts and clear tracking for every patient.','Dossiers CNSS/CNOPS, statuts, pièces et visibilité patient sans perdre le fil administratif.':'CNSS/CNOPS records, statuses, documents and patient visibility with simple administrative tracking.',
    'Tout ce qu’il faut pour lancer une instance cabinet.':'Everything you need to launch your practice.','Le site public rassure, présente les modules et guide le médecin vers un onboarding clair.':'A complete solution that guides doctors through a clear and simple setup.','Provisioning cabinet en quelques minutes':'Practice setup in minutes','Rôles médecin, secrétaire, patient et super-admin':'Doctor, secretary, patient and super-admin roles','Multi-tenant avec isolation stricte des données':'Multi-tenant with strict data isolation','Relances WhatsApp et rappels prêts à brancher':'WhatsApp follow-ups and ready-to-use reminders','Interface française professionnelle':'Professional multilingual interface','Essai gratuit de 30 jours':'30-day free trial',
    'Confiance':'Trust','Une vitrine claire pour convertir les cabinets':'A clear showcase built for medical practices','Le visiteur comprend le produit avant de lancer son essai gratuit.':'Visitors understand the product before starting their free trial.','Une interface claire pour suivre les patients, les impayés et les dossiers CNSS/CNOPS sans multiplier les fichiers.':'A clear interface to track patients, unpaid balances and CNSS/CNOPS records without multiplying files.','Médecin généraliste':'General practitioner','Le parcours d’inscription est rapide et donne une vraie impression de produit professionnel.':'Registration is fast and feels like a truly professional product.','Clinique privée':'Private clinic',
    'Essai gratuit':'Free trial','Prêt à créer votre espace cabinet ?':'Ready to create your practice space?','Lancez l’inscription, choisissez le rôle principal et obtenez votre instance d’essai.':'Register now and receive your own trial workspace.','Commencer maintenant':'Get started now','À propos':'About','Navigation':'Navigation','Adresse':'Address','Boostez la productivité de votre cabinet avec une solution qui simplifie l’agenda, les paiements, les dossiers CNSS/CNOPS et la communication patient.':'Boost your practice productivity with a solution that simplifies scheduling, payments, CNSS/CNOPS records and patient communication.','Tous droits réservés à':'All rights reserved to',
    'Blog':'Blog','Événements':'Events','Actualités & conseils':'News & insights','Des ressources utiles pour mieux gérer votre cabinet':'Useful resources to manage your practice better','Conseils pratiques, santé numérique et actualités pour les professionnels de santé.':'Practical advice, digital health and news for healthcare professionals.','Lire l’article':'Read article','Gestion du cabinet':'Practice management','Santé numérique':'Digital health','Administration':'Administration','5 conseils pour réduire les rendez-vous manqués':'5 tips to reduce missed appointments','Des actions simples pour améliorer les confirmations et mieux organiser le planning médical.':'Simple actions to improve confirmations and organize your medical schedule.','Pourquoi centraliser le dossier patient ?':'Why centralize patient records?','Découvrez comment une information médicale structurée améliore le suivi et le travail quotidien.':'Discover how structured medical information improves care and daily work.','Simplifier le suivi des dossiers CNSS/CNOPS':'Simplify CNSS/CNOPS record tracking','Une méthode claire pour suivre les pièces, les statuts et les remboursements sans perdre de temps.':'A clear method to track documents, statuses and reimbursements efficiently.','10 juillet 2026':'July 10, 2026','2 juillet 2026':'July 2, 2026','24 juin 2026':'June 24, 2026','5 min de lecture':'5 min read','7 min de lecture':'7 min read','4 min de lecture':'4 min read',
    'Agenda FADAA':'FADAA agenda','Rencontrez-nous lors de nos prochains événements':'Meet us at our upcoming events','Webinaires, ateliers et rencontres pour découvrir la santé numérique en pratique.':'Webinars, workshops and events to explore digital health in practice.','Démonstration en ligne de FADAA Santé':'Online demonstration of FADAA Santé','Digitaliser son cabinet médical simplement':'Digitize your medical practice simply','Gestion moderne du parcours patient':'Modern patient journey management','Webinaire gratuit':'Free webinar','Atelier pratique':'Practical workshop','Rencontre professionnelle':'Professional meeting','En ligne':'Online','Casablanca':'Casablanca','Rabat':'Rabat','S’inscrire':'Register','JUIL.':'JUL','AOÛT':'AUG','SEPT.':'SEP'
  },
  ar: {
    'Accueil':'الرئيسية','Solutions':'الحلول','Fonctionnalités':'المميزات','Tarifs':'الأسعار','Témoignages':'آراء العملاء','Contact':'اتصل بنا','Connexion':'تسجيل الدخول','Créer mon cabinet':'إنشاء عيادتي',
    'Tarification transparente':'أسعار واضحة','Des offres simples pour chaque cabinet':'عروض بسيطة لكل عيادة','Commencez par un essai gratuit, puis activez l’offre adaptée à votre organisation.':'ابدأ بتجربة مجانية ثم فعّل العرض المناسب لعيادتك.','Recommandée':'موصى بها','an':'سنة','mois':'شهر','jours d’essai gratuit':'يوماً للتجربة المجانية','Choisir cette offre':'اختر هذا العرض','Comparer toutes les offres':'قارن جميع العروض',
    'Plateforme SaaS médicale multi-cabinets':'منصة طبية سحابية متعددة العيادات','Le médecin se concentre sur ses patients, FADAA gère le reste.':'يركز الطبيب على مرضاه، وفضاء يتكفل بالباقي.','Centralisez agenda, dossiers patients, honoraires, CNSS/CNOPS, documents et relances dans une instance isolée pour votre cabinet.':'اجمع المواعيد وملفات المرضى والأتعاب وملفات الضمان الاجتماعي والوثائق والتذكيرات في فضاء آمن لعيادتك.','Démarrer l’essai gratuit':'ابدأ التجربة المجانية','Voir les solutions':'اكتشف الحلول','Cabinet médical moderne':'عيادة طبية حديثة',
    'temps administratif':'من الوقت الإداري','rendez-vous confirmés':'مواعيد مؤكدة','accès cabinet':'ولوج إلى العيادة','données isolées':'بيانات معزولة','Nos solutions':'حلولنا','Une suite médicale pour piloter le cabinet sans dispersion':'منظومة طبية متكاملة لإدارة العيادة بسهولة','Une présentation publique claire: promesse, modules, preuves, témoignages et appel à l’inscription.':'منصة واضحة تجمع كل أدوات الإدارة الطبية الأساسية.','Gestion 360':'إدارة شاملة','Finance médicale':'المالية الطبية','Remboursements':'التعويضات',
    'Agenda, patients, visites, documents et droits utilisateurs dans un espace cabinet isolé.':'المواعيد والمرضى والزيارات والوثائق والصلاحيات في فضاء آمن للعيادة.','Paiements, reste à payer, reçus et suivi clair des impayés par patient.':'المدفوعات والمبالغ المتبقية والوصولات وتتبع واضح لمستحقات كل مريض.','Dossiers CNSS/CNOPS, statuts, pièces et visibilité patient sans perdre le fil administratif.':'ملفات الضمان الاجتماعي والحالات والوثائق وتتبع إداري بسيط.',
    'Tout ce qu’il faut pour lancer une instance cabinet.':'كل ما تحتاجه لإطلاق فضاء عيادتك.','Le site public rassure, présente les modules et guide le médecin vers un onboarding clair.':'حل متكامل يرافق الطبيب خلال إعداد واضح وسهل.','Provisioning cabinet en quelques minutes':'إعداد العيادة في دقائق','Rôles médecin, secrétaire, patient et super-admin':'صلاحيات الطبيب والسكرتير والمريض والمدير','Multi-tenant avec isolation stricte des données':'عزل صارم وآمن لبيانات كل عيادة','Relances WhatsApp et rappels prêts à brancher':'تذكيرات ومتابعات عبر واتساب','Interface française professionnelle':'واجهة احترافية متعددة اللغات','Essai gratuit de 30 jours':'تجربة مجانية لمدة 30 يوماً',
    'Confiance':'الثقة','Une vitrine claire pour convertir les cabinets':'واجهة واضحة ومصممة للعيادات','Le visiteur comprend le produit avant de lancer son essai gratuit.':'يتعرف الزائر على المنصة قبل بدء تجربته المجانية.','Une interface claire pour suivre les patients, les impayés et les dossiers CNSS/CNOPS sans multiplier les fichiers.':'واجهة واضحة لتتبع المرضى والمستحقات وملفات الضمان الاجتماعي دون تعدد الملفات.','Médecin généraliste':'طبيب عام','Le parcours d’inscription est rapide et donne une vraie impression de produit professionnel.':'مسار التسجيل سريع ويعكس احترافية حقيقية.','Clinique privée':'مصحة خاصة',
    'Essai gratuit':'تجربة مجانية','Prêt à créer votre espace cabinet ?':'هل أنت مستعد لإنشاء فضاء عيادتك؟','Lancez l’inscription, choisissez le rôle principal et obtenez votre instance d’essai.':'ابدأ التسجيل واحصل على فضاء تجريبي خاص بك.','Commencer maintenant':'ابدأ الآن','À propos':'من نحن','Navigation':'التنقل','Adresse':'العنوان','Boostez la productivité de votre cabinet avec une solution qui simplifie l’agenda, les paiements, les dossiers CNSS/CNOPS et la communication patient.':'طوّر إنتاجية عيادتك بحل يبسّط المواعيد والمدفوعات وملفات الضمان الاجتماعي والتواصل مع المرضى.','Tous droits réservés à':'جميع الحقوق محفوظة لـ',
    'Blog':'المدونة','Événements':'الفعاليات','Actualités & conseils':'أخبار ونصائح','Des ressources utiles pour mieux gérer votre cabinet':'موارد مفيدة لإدارة عيادتك بشكل أفضل','Conseils pratiques, santé numérique et actualités pour les professionnels de santé.':'نصائح عملية وصحة رقمية وأخبار لمهنيي الصحة.','Lire l’article':'قراءة المقال','Gestion du cabinet':'إدارة العيادة','Santé numérique':'الصحة الرقمية','Administration':'الإدارة','5 conseils pour réduire les rendez-vous manqués':'5 نصائح للحد من المواعيد الفائتة','Des actions simples pour améliorer les confirmations et mieux organiser le planning médical.':'خطوات بسيطة لتحسين تأكيد المواعيد وتنظيم الجدول الطبي.','Pourquoi centraliser le dossier patient ?':'لماذا يجب توحيد ملف المريض؟','Découvrez comment une information médicale structurée améliore le suivi et le travail quotidien.':'اكتشف كيف تحسن المعلومات الطبية المنظمة المتابعة والعمل اليومي.','Simplifier le suivi des dossiers CNSS/CNOPS':'تبسيط تتبع ملفات الضمان الاجتماعي','Une méthode claire pour suivre les pièces, les statuts et les remboursements sans perdre de temps.':'طريقة واضحة لتتبع الوثائق والحالات والتعويضات بكفاءة.','10 juillet 2026':'10 يوليوز 2026','2 juillet 2026':'2 يوليوز 2026','24 juin 2026':'24 يونيو 2026','5 min de lecture':'5 دقائق للقراءة','7 min de lecture':'7 دقائق للقراءة','4 min de lecture':'4 دقائق للقراءة',
    'Agenda FADAA':'أجندة فضاء','Rencontrez-nous lors de nos prochains événements':'التقوا بنا في فعالياتنا القادمة','Webinaires, ateliers et rencontres pour découvrir la santé numérique en pratique.':'ندوات وورشات ولقاءات لاكتشاف الصحة الرقمية عملياً.','Démonstration en ligne de FADAA Santé':'عرض مباشر لمنصة فضاء صحة','Digitaliser son cabinet médical simplement':'رقمنة العيادة الطبية بسهولة','Gestion moderne du parcours patient':'الإدارة الحديثة لمسار المريض','Webinaire gratuit':'ندوة مجانية','Atelier pratique':'ورشة تطبيقية','Rencontre professionnelle':'لقاء مهني','En ligne':'عبر الإنترنت','Casablanca':'الدار البيضاء','Rabat':'الرباط','S’inscrire':'التسجيل','JUIL.':'يوليوز','AOÛT':'غشت','SEPT.':'شتنبر'
  }
}

const navItems = [
  ['Accueil', 'accueil'],
  ['Solutions', 'solutions'],
  ['Fonctionnalités', 'fonctionnalites'],
  ['Tarifs', 'tarifs'],
  ['Blog', 'blog'],
  ['Événements', 'evenements'],
  ['Témoignages', 'temoignages'],
  ['Contact', 'contact']
]
const publicNavHref=(id:string)=>id==='blog'?'/blog':id==='evenements'?'/evenements':`#${id}`

const fallbackBlogPosts=[
  {category:'Gestion du cabinet',title:'5 conseils pour réduire les rendez-vous manqués',text:'Des actions simples pour améliorer les confirmations et mieux organiser le planning médical.',date:'10 juillet 2026',readTime:'5 min de lecture'},
  {category:'Santé numérique',title:'Pourquoi centraliser le dossier patient ?',text:'Découvrez comment une information médicale structurée améliore le suivi et le travail quotidien.',date:'2 juillet 2026',readTime:'7 min de lecture'},
  {category:'Administration',title:'Simplifier le suivi des dossiers CNSS/CNOPS',text:'Une méthode claire pour suivre les pièces, les statuts et les remboursements sans perdre de temps.',date:'24 juin 2026',readTime:'4 min de lecture'}
]

export type LandingEvent={id?:string;slug?:string;day:string;month:string;title:string;type:string;description?:string|null;time:string;location:string;attendanceMode?:string;venueName?:string|null;city?:string|null;mapUrl?:string|null;onlineProvider?:string|null;registrationMode?:string;registrationUrl?:string|null;remainingCapacity?:number|null;isFull?:boolean}
type LandingPlan={id:string;name:string;slug:string|null;description:string|null;price:number;currency:string;billing_interval:string;trial_days:number;features:string[];is_featured:boolean}
const fallbackEvents:LandingEvent[]=[
  {day:'22',month:'JUIL.',title:'Démonstration en ligne de FADAA Santé',type:'Webinaire gratuit',time:'18:00 – 19:00',location:'En ligne'},
  {day:'05',month:'AOÛT',title:'Digitaliser son cabinet médical simplement',type:'Atelier pratique',time:'10:00 – 12:00',location:'Casablanca'},
  {day:'18',month:'SEPT.',title:'Gestion moderne du parcours patient',type:'Rencontre professionnelle',time:'17:30 – 19:30',location:'Rabat'}
]

const solutions = [
  {
    title: 'FADAA Cabinet',
    text: 'Agenda, patients, visites, documents et droits utilisateurs dans un espace cabinet isolé.',
    tag: 'Gestion 360',
    icon: Stethoscope
  },
  {
    title: 'FADAA Honoraires',
    text: 'Paiements, reste à payer, reçus et suivi clair des impayés par patient.',
    tag: 'Finance médicale',
    icon: CreditCard
  },
  {
    title: 'FADAA CNSS/CNOPS',
    text: 'Dossiers CNSS/CNOPS, statuts, pièces et visibilité patient sans perdre le fil administratif.',
    tag: 'Remboursements',
    icon: FileHeart
  }
]

const features = [
  ['Provisioning cabinet en quelques minutes', Sparkles],
  ['Rôles médecin, secrétaire, patient et super-admin', UsersRound],
  ['Multi-tenant avec isolation stricte des données', ShieldCheck],
  ['Relances WhatsApp et rappels prêts à brancher', FaWhatsapp],
  ['Interface française professionnelle', BadgeCheck],
  ['Essai gratuit de 30 jours', CalendarDays]
]

const stats = [
  ['-45%', 'temps administratif'],
  ['+30%', 'rendez-vous confirmés'],
  ['24/7', 'accès cabinet'],
  ['100%', 'données isolées']
]

const testimonials = [
  {
    quote: 'Une interface claire pour suivre les patients, les impayés et les dossiers CNSS/CNOPS sans multiplier les fichiers.',
    name: 'Dr. El Mansouri',
    role: 'Médecin généraliste'
  },
  {
    quote: 'Le parcours d’inscription est rapide et donne une vraie impression de produit professionnel.',
    name: 'Cabinet Atlas',
    role: 'Clinique privée'
  }
]

const footerNavigation = [
  ['Accueil', 'accueil'],
  ['À propos', 'fonctionnalites'],
  ['Blog', 'blog'],
  ['Événements', 'evenements'],
  ['Contact', 'contact']
]

const footerSolutions = [
  ['FADAA Cabinet', 'solutions'],
  ['FADAA Honoraires', 'solutions'],
  ['FADAA CNSS/CNOPS', 'solutions'],
  ['FADAA WhatsApp', 'fonctionnalites']
]

export function PublicLanding({ onStart, onPatientBook, onPatientSpace, onLogin, onPricing=onStart, initialAudience='doctor' }: PublicLandingProps) {
  const [language,setLanguage]=useState<Language>(()=>getPreferredLanguage())
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false)
  const [headerScrolled,setHeaderScrolled]=useState(false)
  const [activeSection,setActiveSection]=useState('accueil')
  const [audience,setAudience]=useState<'doctor'|'patient'>(initialAudience)
  const [displayedAudience,setDisplayedAudience]=useState<'doctor'|'patient'>(initialAudience)
  const audienceTimer=useRef<number|null>(null)
  const [events,setEvents]=useState<LandingEvent[]>(fallbackEvents)
  const[landingPosts,setLandingPosts]=useState<Array<{slug?:string;category:string;title:string;text:string;date:string;readTime:string}>>(fallbackBlogPosts)
  const[selectedEvent,setSelectedEvent]=useState<LandingEvent|null>(null)
  useEffect(()=>{
    if(!selectedEvent)return
    const previous=document.body.style.overflow
    document.body.style.overflow='hidden'
    return()=>{document.body.style.overflow=previous}
  },[selectedEvent])
  const [plans,setPlans]=useState<LandingPlan[]>([])
  const tr=useCallback<Translate>((text)=>language==='fr'?text:(translations[language][text]??text),[language])
  useEffect(()=>{const sync=(event:Event)=>setLanguage((event as CustomEvent<Language>).detail);window.addEventListener('fadaa:language-changed',sync);return()=>window.removeEventListener('fadaa:language-changed',sync)},[])
  useEffect(()=>()=>{if(audienceTimer.current!==null)window.clearTimeout(audienceTimer.current)},[])
  const changeAudience=useCallback((next:'doctor'|'patient')=>{
    if(next===audience&&next===displayedAudience)return
    setAudience(next)
    if(audienceTimer.current!==null)window.clearTimeout(audienceTimer.current)
    audienceTimer.current=window.setTimeout(()=>{setDisplayedAudience(next);audienceTimer.current=null},260)
  },[audience,displayedAudience])
  useEffect(()=>{const sync=()=>setHeaderScrolled(window.scrollY>12);sync();window.addEventListener('scroll',sync,{passive:true});return()=>window.removeEventListener('scroll',sync)},[])
  useEffect(()=>{
    const sections=navItems.map(([,id])=>document.getElementById(id)).filter((section):section is HTMLElement=>Boolean(section))
    if(!sections.length)return
    const sync=()=>{
      const marker=Math.min(240,window.innerHeight*.28)
      let current=sections[0].id
      for(const section of sections){
        if(section.getBoundingClientRect().top<=marker)current=section.id
      }
      setActiveSection(current)
    }
    sync()
    window.addEventListener('scroll',sync,{passive:true})
    window.addEventListener('resize',sync)
    return()=>{window.removeEventListener('scroll',sync);window.removeEventListener('resize',sync)}
  },[])
  useEffect(()=>{const controller=new AbortController();fetch(`${import.meta.env.VITE_API_URL??''}/api/public/events`,{signal:controller.signal}).then(response=>response.ok?response.json():Promise.reject()).then((items:Array<{id:string;title:string;event_type:string;description:string|null;start_at:string;end_at:string;location:string;attendance_mode:string;venue_name:string|null;city:string|null;map_url:string|null;online_provider:string|null;registration_mode:string;registration_url:string|null;remaining_capacity:number|null;is_full:boolean}>)=>{if(!items.length)return;const locale=language==='ar'?'ar-MA':language==='en'?'en-GB':'fr-FR';setEvents(items.map(item=>{const start=new Date(item.start_at),end=new Date(item.end_at);return{id:item.id,day:start.toLocaleDateString(locale,{day:'2-digit'}),month:start.toLocaleDateString(locale,{month:'short'}).toUpperCase(),title:item.title,type:item.event_type,description:item.description,time:`${start.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} – ${end.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})}`,location:item.attendance_mode==="online"?(item.online_provider??"En ligne"):[item.venue_name,item.location,item.city].filter(Boolean).join(" · "),attendanceMode:item.attendance_mode,venueName:item.venue_name,city:item.city,mapUrl:item.map_url,onlineProvider:item.online_provider,registrationMode:item.registration_mode,registrationUrl:item.registration_url,remainingCapacity:item.remaining_capacity,isFull:item.is_full}}))}).catch(()=>setEvents(fallbackEvents));return()=>controller.abort()},[language])
  useEffect(()=>{const controller=new AbortController();fetch(`${import.meta.env.VITE_API_URL??''}/api/public/blog`,{signal:controller.signal}).then(response=>response.ok?response.json():Promise.reject()).then((items:Array<{slug:string;category:string;title:string;excerpt:string|null;content:string;published_at:string|null}>)=>{if(!items.length)return;const locale=language==='ar'?'ar-MA':language==='en'?'en-GB':'fr-FR';setLandingPosts(items.slice(0,3).map(item=>({slug:item.slug,category:item.category,title:item.title,text:item.excerpt||item.content,date:item.published_at?new Date(item.published_at).toLocaleDateString(locale,{dateStyle:'long'}):'',readTime:`${Math.max(1,Math.ceil(item.content.split(/\s+/).length/200))} min de lecture`}))) }).catch(()=>setLandingPosts(fallbackBlogPosts));return()=>controller.abort()},[language])
  useEffect(()=>{const controller=new AbortController();fetch(`${import.meta.env.VITE_API_URL??''}/api/public/subscription-plans`,{signal:controller.signal}).then(response=>response.ok?response.json():Promise.reject()).then(setPlans).catch(()=>setPlans([]));return()=>controller.abort()},[])
  useEffect(()=>{applyLanguage(language);document.title=`FADAA Santé · ${tr('Plateforme SaaS médicale multi-cabinets')}`;let meta=document.querySelector<HTMLMetaElement>('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.name='description';document.head.appendChild(meta)}meta.content=tr('Centralisez agenda, dossiers patients, honoraires, CNSS/CNOPS, documents et relances dans une instance isolée pour votre cabinet.')},[language,tr])
  if(displayedAudience==='patient')return <PatientLandingPage audience={audience} onDoctor={()=>changeAudience('doctor')} onLogin={onLogin} onBook={onPatientBook} onPatientSpace={onPatientSpace} showAudienceSwitch={!onPatientSpace}/>
  return (
    <motion.main initial={{opacity:0,y:12,filter:'blur(3px)'}} animate={{opacity:1,y:0,filter:'blur(0px)'}} transition={{duration:.5,ease:[.22,1,.36,1]}} dir={language==='ar'?'rtl':'ltr'} className="min-h-screen overflow-x-clip bg-atlas-cloud text-atlas-ink">
      <header className={`sticky top-0 z-[80] border-b bg-white/95 backdrop-blur-xl transition-all duration-300 ${headerScrolled?'border-atlas-line shadow-[0_12px_35px_rgba(15,76,92,0.14)]':'border-atlas-line/70 shadow-[0_5px_22px_rgba(15,23,42,0.05)]'}`}>
        <div className={`mx-auto flex max-w-[1480px] items-center justify-between gap-3 pe-[190px] ps-4 transition-all duration-300 md:ps-7 ${headerScrolled?'py-2':'py-3'}`}>
          <a href="#accueil" className="flex shrink-0 items-center"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-11 w-24 object-contain sm:h-12 sm:w-32" /></a>

          <nav className="hidden items-center gap-0.5 rounded-2xl border border-atlas-line bg-slate-50/90 p-1.5 text-xs font-bold text-slate-600 shadow-inner xl:flex">
            {navItems.map(([item, id]) => (
              <a key={id} href={publicNavHref(id)} onClick={()=>setActiveSection(id)} aria-current={activeSection===id?'page':undefined} className={`relative whitespace-nowrap rounded-xl px-3 py-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atlas-teal/30 ${activeSection===id?'bg-white text-atlas-petrol shadow-sm':'hover:-translate-y-0.5 hover:bg-white hover:text-atlas-teal hover:shadow-sm'}`}>
                <span className="relative z-10">{tr(item)}</span>
                <span aria-hidden="true" className={`absolute inset-x-3 -bottom-0.5 h-0.5 origin-center rounded-full bg-atlas-teal transition-all duration-300 ${activeSection===id?'scale-x-100 opacity-100':'scale-x-0 opacity-0'}`}/>
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher language={language} onChange={setLanguage}/>
            <button
              type="button"
              onClick={onLogin}
              className="hidden h-11 items-center rounded-[10px] border border-atlas-line bg-white px-4 text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal hover:text-atlas-teal md:inline-flex"
            >
              {tr('Connexion')}
            </button>
            <button
              type="button"
              onClick={onStart}
              className="h-11 whitespace-nowrap rounded-[10px] bg-atlas-petrol px-3 text-xs font-bold text-white shadow-lg shadow-atlas-petrol/15 transition hover:-translate-y-0.5 hover:bg-atlas-teal sm:px-4 sm:text-sm md:px-5"
            >
              {tr('Créer mon cabinet')}
            </button>
            <button onClick={()=>setMobileMenuOpen(value=>!value)} className="hidden h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-atlas-line text-atlas-petrol max-xl:grid" type="button" aria-label="Menu" aria-expanded={mobileMenuOpen}>
              {mobileMenuOpen?<X size={20}/>:<Menu size={20}/>} 
            </button>
            
          </div>
        </div>
        <div className={`absolute end-3 transition-all duration-300 ${headerScrolled?'top-2':'top-3'}`}><AudienceSwitch audience={audience} onChange={changeAudience}/></div>
        {mobileMenuOpen&&<nav className="border-t border-atlas-line bg-white px-4 py-4 shadow-lg xl:hidden"><div className="mx-auto grid max-w-7xl gap-1">{navItems.map(([item,id])=><a key={id} href={publicNavHref(id)} aria-current={activeSection===id?'page':undefined} onClick={()=>{setActiveSection(id);setMobileMenuOpen(false)}} className={`flex items-center justify-between rounded-[9px] px-4 py-3 text-sm font-bold transition ${activeSection===id?'bg-atlas-mist text-atlas-teal':'text-slate-600 hover:bg-atlas-mist hover:text-atlas-teal'}`}><span>{tr(item)}</span><span className={`h-2 w-2 rounded-full bg-atlas-teal transition ${activeSection===id?'scale-100 opacity-100':'scale-0 opacity-0'}`}/></a>)}<button type="button" onClick={()=>{setMobileMenuOpen(false);onLogin()}} className="mt-2 rounded-[9px] border border-atlas-line px-4 py-3 text-start text-sm font-bold text-atlas-petrol md:hidden">{tr('Connexion')}</button></div></nav>}
      </header>

      <section id="accueil" className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(46,196,182,0.12),transparent_36%),linear-gradient(180deg,#f8fbfb_0%,#f3f7f7_100%)]">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-atlas-aqua/15 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-atlas-sage/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(#0f525f_1px,transparent_1px),linear-gradient(90deg,#0f525f_1px,transparent_1px)] [background-size:40px_40px]"/>
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="flex flex-col justify-center"
          >
            <p className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-atlas-teal/20 bg-white/90 px-4 py-2 text-sm font-bold text-atlas-teal shadow-sm backdrop-blur">
              <HeartPulse size={16} />
              {tr('Plateforme SaaS médicale multi-cabinets')}
            </p>
            <h1 className="max-w-3xl font-display text-4xl font-black leading-[1.12] tracking-[-0.025em] text-atlas-petrol md:text-6xl">
              {tr('Le médecin se concentre sur ses patients, FADAA gère le reste.')}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              {tr('Centralisez agenda, dossiers patients, honoraires, CNSS/CNOPS, documents et relances dans une instance isolée pour votre cabinet.')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-[11px] bg-atlas-teal px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-atlas-teal/20 transition hover:-translate-y-0.5 hover:bg-atlas-petrol"
              >
                {tr('Démarrer l’essai gratuit')}
                <ArrowRight size={17} />
              </button>
              <a
                href="#solutions"
                className="rounded-[11px] border border-atlas-line bg-white px-6 py-3.5 text-sm font-bold text-atlas-petrol shadow-sm transition hover:-translate-y-0.5 hover:border-atlas-teal"
              >
                {tr('Voir les solutions')}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="relative rounded-[24px] border border-white/80 bg-white/85 p-3 shadow-[0_30px_80px_rgba(15,82,95,0.16)] backdrop-blur"
          >
            <div className="overflow-hidden rounded-[18px]">
              <img
                src="/images/fadaa-clinic-hero.webp"
                alt={tr('Cabinet médical moderne')}
                width="1745"
                height="901"
                fetchPriority="high"
                decoding="async"
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              {stats.slice(0, 3).map(([value, label]) => (
                <div key={label} className="rounded-[12px] border border-atlas-line/70 bg-atlas-cloud p-4">
                  <strong className="block font-display text-2xl text-atlas-petrol">{value}</strong>
                  <span className="text-xs font-bold uppercase text-slate-500">{tr(label)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-atlas-line bg-white/95">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-2 md:grid-cols-4 md:px-8">
          {stats.map(([value, label]) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-[14px] border border-atlas-line/70 bg-atlas-cloud p-5 text-center transition hover:-translate-y-1 hover:border-atlas-teal/30"
            >
              <strong className="font-display text-3xl text-atlas-teal">{value}</strong>
              <p className="mt-2 text-sm font-bold text-slate-500">{tr(label)}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="solutions" className="landing-deferred mx-auto max-w-7xl px-5 py-20 md:px-8">
        <SectionTitle
          kicker={tr('Nos solutions')}
          title={tr('Une suite médicale pour piloter le cabinet sans dispersion')}
          text={tr('Une présentation publique claire: promesse, modules, preuves, témoignages et appel à l’inscription.')}
        />
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {solutions.map((solution, index) => {
            const Icon = solution.icon
            return (
              <motion.article
                key={solution.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-[18px] border border-atlas-line bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1.5 hover:border-atlas-teal/30 hover:shadow-panel"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-atlas-petrol via-atlas-teal to-atlas-aqua opacity-0 transition group-hover:opacity-100"/>
                <div className="grid h-12 w-12 place-items-center rounded-[12px] bg-atlas-mist text-atlas-teal transition group-hover:scale-105 group-hover:bg-atlas-teal group-hover:text-white">
                  <Icon size={22} />
                </div>
                <span className="mt-5 inline-flex rounded-full bg-atlas-mist px-3 py-1 text-xs font-bold uppercase text-atlas-teal">
                  {tr(solution.tag)}
                </span>
                <h3 className="mt-4 font-display text-xl font-bold">{solution.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{tr(solution.text)}</p>
              </motion.article>
            )
          })}
        </div>
      </section>

      <section id="fonctionnalites" className="landing-deferred relative overflow-hidden bg-atlas-ink py-20 text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-atlas-teal/20 blur-3xl"/>
        <div className="mx-auto grid max-w-7xl gap-10 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-bold uppercase text-atlas-aqua">{tr('Fonctionnalités')}</p>
            <h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">{tr('Tout ce qu’il faut pour lancer une instance cabinet.')}</h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              {tr('Le site public rassure, présente les modules et guide le médecin vers un onboarding clair.')}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {features.map(([feature, Icon]) => (
              <motion.div
                key={feature as string}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative flex items-center gap-3 rounded-[13px] border border-white/10 bg-white/[0.08] p-4 backdrop-blur transition hover:border-atlas-aqua/30 hover:bg-white/[0.12]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-atlas-aqua/15 text-atlas-aqua">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-semibold text-white/90">{tr(feature as string)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="landing-deferred border-b border-atlas-line bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionTitle kicker={tr('Tarification transparente')} title={tr('Des offres simples pour chaque cabinet')} text={tr('Commencez par un essai gratuit, puis activez l’offre adaptée à votre organisation.')}/>
          <div className={`mx-auto mt-10 grid max-w-5xl gap-6 ${plans.length>2?'lg:grid-cols-3':'md:grid-cols-2'}`}>
            {plans.slice(0,3).map((plan,index)=><motion.article key={plan.id} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.06}} className={`relative flex flex-col rounded-[20px] border bg-atlas-cloud/60 p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${plan.is_featured?'border-atlas-teal ring-2 ring-atlas-teal/10':'border-atlas-line'}`}>
              {plan.is_featured&&<span className="absolute -top-3 start-6 rounded-full bg-atlas-teal px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">{tr('Recommandée')}</span>}
              <h3 className="font-display text-2xl font-bold text-atlas-petrol">{plan.name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
              <p className="mt-6"><b className="font-display text-4xl text-atlas-ink">{Number(plan.price).toLocaleString('fr-MA')}</b><span className="ms-2 text-sm font-bold text-slate-500">{plan.currency} / {plan.billing_interval==='yearly'?tr('an'):tr('mois')}</span></p>
              <p className="mt-2 text-sm font-bold text-atlas-teal">{plan.trial_days} {tr('jours d’essai gratuit')}</p>
              <ul className="mt-6 flex-1 space-y-3">{plan.features.slice(0,6).map(feature=><li key={feature} className="flex gap-2 text-sm text-slate-600"><BadgeCheck size={18} className="shrink-0 text-emerald-600"/>{feature}</li>)}</ul>
              <button type="button" onClick={onPricing} className={`mt-7 rounded-[11px] px-5 py-3.5 text-sm font-bold transition ${plan.is_featured?'bg-atlas-teal text-white hover:bg-atlas-petrol':'border border-atlas-teal text-atlas-teal hover:bg-atlas-mist'}`}>{tr('Choisir cette offre')}<ArrowRight size={16} className="ms-2 inline"/></button>
            </motion.article>)}
          </div>
          <div className="mt-8 text-center"><button type="button" onClick={onPricing} className="inline-flex items-center gap-2 text-sm font-bold text-atlas-teal hover:text-atlas-petrol">{tr('Comparer toutes les offres')}<ArrowUpRight size={16}/></button></div>
        </div>
      </section>

      <section id="blog" className="landing-deferred mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-5"><SectionTitle kicker={tr('Actualités & conseils')} title={tr('Des ressources utiles pour mieux gérer votre cabinet')} text={tr('Conseils pratiques, santé numérique et actualités pour les professionnels de santé.')}/><a href="/blog" className="inline-flex items-center gap-2 rounded-[11px] border border-atlas-line bg-white px-5 py-3 text-sm font-bold text-atlas-teal shadow-sm transition hover:border-atlas-teal/30 hover:bg-atlas-mist"><Newspaper size={19}/>{tr('Voir tous les articles')}<ArrowUpRight size={16}/></a></div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">{landingPosts.map((post,index)=><motion.article key={post.slug??post.title} initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.06}} className="group overflow-hidden rounded-[18px] border border-atlas-line bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-panel"><div className={`h-2 ${index===0?'bg-atlas-teal':index===1?'bg-atlas-petrol':'bg-atlas-aqua'}`}/><div className="p-6"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-atlas-mist px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-atlas-teal">{tr(post.category)}</span><span className="text-xs font-semibold text-slate-400">{tr(post.date)}</span></div><h3 className="mt-5 font-display text-xl font-bold leading-snug text-atlas-ink">{tr(post.title)}</h3><p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600">{tr(post.text)}</p><div className="mt-6 flex items-center justify-between border-t border-atlas-line pt-4"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Clock3 size={14}/>{tr(post.readTime)}</span><a href={post.slug?`/blog/${post.slug}`:'/blog'} className="inline-flex items-center gap-1.5 text-sm font-bold text-atlas-teal transition group-hover:gap-2.5">{tr('Lire l’article')}<ArrowUpRight size={16}/></a></div></div></motion.article>)}</div>
      </section>

      <section id="evenements" className="border-y border-atlas-line bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5"><SectionTitle kicker={tr('Agenda FADAA')} title={tr('Rencontrez-nous lors de nos prochains événements')} text={tr('Webinaires, ateliers et rencontres pour découvrir la santé numérique en pratique.')}/><a href="/evenements" className="inline-flex items-center gap-2 rounded-[11px] border border-atlas-line bg-white px-5 py-3 text-sm font-bold text-atlas-teal shadow-sm transition hover:border-atlas-teal/30 hover:bg-atlas-mist"><CalendarDays size={19}/>Voir tous les événements<ArrowUpRight size={16}/></a></div>
          <div className="mt-9 grid gap-4">
            {events.map((event,index)=><motion.article key={event.id??event.title} initial={{opacity:0,x:language==='ar'?18:-18}} whileInView={{opacity:1,x:0}} viewport={{once:true}} transition={{delay:index*.05}} className="grid gap-4 rounded-[16px] border border-atlas-line bg-atlas-cloud/60 p-4 transition hover:border-atlas-teal/30 hover:bg-white hover:shadow-sm sm:grid-cols-[86px_1fr_auto] sm:items-center">
              <div className="grid h-20 place-items-center rounded-[13px] bg-atlas-petrol text-center text-white"><div><strong className="block font-display text-2xl leading-none">{event.day}</strong><span className="mt-1 block text-[10px] font-extrabold tracking-wider text-atlas-aqua">{tr(event.month)}</span></div></div>
              <div><span className="text-xs font-bold uppercase tracking-wide text-atlas-teal">{tr(event.type)}</span><h3 className="mt-1.5 font-display text-lg font-bold">{event.id?<a href={`/evenements/${event.slug??event.id}`} className="transition hover:text-atlas-teal">{tr(event.title)}</a>:tr(event.title)}</h3>{event.description&&<p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{event.description}</p>}<div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{event.time}</span><span className="inline-flex items-center gap-1.5"><MapPin size={14}/>{tr(event.location)}</span>{event.remainingCapacity!=null&&<span className="inline-flex items-center gap-1.5"><UsersRound size={14}/>{event.remainingCapacity} place{event.remainingCapacity!==1?'s':''} disponible{event.remainingCapacity!==1?'s':''}</span>}</div></div>
              <div className="flex flex-col gap-2">{event.id&&<a href={`/evenements/${event.slug??event.id}`} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-atlas-petrol px-5 py-3 text-sm font-bold text-white transition hover:bg-atlas-teal">Découvrir <ArrowUpRight size={16}/></a>}{event.isFull?<span className="rounded-[10px] bg-slate-100 px-5 py-3 text-center text-sm font-bold text-slate-500">Complet</span>:event.registrationMode==="external"&&event.registrationUrl?<a href={event.registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-atlas-teal/20 bg-white px-5 py-3 text-sm font-bold text-atlas-teal transition hover:bg-atlas-teal hover:text-white"><CalendarCheck size={17}/>{tr('S’inscrire')}</a>:event.id?<button type="button" onClick={()=>setSelectedEvent(event)} className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-atlas-teal/20 bg-white px-5 py-3 text-sm font-bold text-atlas-teal transition hover:bg-atlas-teal hover:text-white"><CalendarCheck size={17}/>{tr('S’inscrire')}</button>:<a href="#contact" className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-atlas-teal/20 bg-white px-5 py-3 text-sm font-bold text-atlas-teal"><CalendarCheck size={17}/>{tr('S’inscrire')}</a>}</div>
            </motion.article>)}
          </div>
        </div>
      </section>

      <section id="temoignages" className="landing-deferred mx-auto max-w-7xl px-5 py-16 md:px-8">
        <SectionTitle
          kicker={tr('Confiance')}
          title={tr('Une vitrine claire pour convertir les cabinets')}
          text={tr('Le visiteur comprend le produit avant de lancer son essai gratuit.')}
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className="relative rounded-[18px] border border-atlas-line bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-panel">
              <span className="absolute end-6 top-3 font-display text-6xl leading-none text-atlas-mist">“</span>
              <p className="text-base leading-8 text-slate-600">“{tr(testimonial.quote)}”</p>
              <div className="mt-5 border-t border-atlas-line pt-4">
                <strong className="block font-display text-atlas-ink">{testimonial.name}</strong>
                <span className="text-sm font-semibold text-slate-500">{tr(testimonial.role)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 pb-16 md:px-8">
        <div className="relative overflow-hidden rounded-[20px] bg-gradient-to-r from-atlas-petrol to-atlas-teal p-8 text-white shadow-[0_24px_60px_rgba(15,82,95,0.22)] md:p-10"><div className="absolute -end-16 -top-24 h-64 w-64 rounded-full border-[36px] border-white/5"/>
          <div className="relative grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase text-white/70">{tr('Essai gratuit')}</p>
              <h2 className="mt-2 font-display text-3xl font-bold">{tr('Prêt à créer votre espace cabinet ?')}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
                {tr('Lancez l’inscription, choisissez le rôle principal et obtenez votre instance d’essai.')}
              </p>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-white px-6 py-3 text-sm font-bold text-atlas-petrol transition hover:bg-atlas-mist"
            >
              {tr('Commencer maintenant')}
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      </section>

      <Footer tr={tr}/>
      {selectedEvent&&createPortal(<EventRegistrationDialog event={selectedEvent} onClose={()=>setSelectedEvent(null)}/>,document.body)}
    </motion.main>
  )
}

type RegistrationConfirmation={reference:string;event_title:string;participant_count:number;attendance_mode:string;location:string;map_url:string|null;online_provider:string|null;online_url:string|null}
export function EventRegistrationDialog({event,onClose}:{event:LandingEvent;onClose:()=>void}){
  const[contact,setContact]=useState({first_name:"",last_name:"",email:"",phone:"",notes:"",consent:false})
  const[participants,setParticipants]=useState([{first_name:"",last_name:"",email:"",phone:""}])
  const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[confirmation,setConfirmation]=useState<RegistrationConfirmation|null>(null)
  function updateContact(key:"first_name"|"last_name"|"email"|"phone"|"notes",value:string){setContact(current=>({...current,[key]:value}));if(["first_name","last_name","email","phone"].includes(key))setParticipants(current=>current.map((row,index)=>index===0?{...row,[key]:value}:row))}
  async function submit(e:FormEvent){e.preventDefault();if(!event.id)return;setBusy(true);setError("");try{const response=await fetch(`${import.meta.env.VITE_API_URL??""}/api/public/events/${event.id}/registrations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contact_first_name:contact.first_name,contact_last_name:contact.last_name,contact_email:contact.email,contact_phone:contact.phone,notes:contact.notes||null,consent_accepted:contact.consent,participants:participants.map(row=>({first_name:row.first_name,last_name:row.last_name,email:row.email||null,phone:row.phone||null}))})});const data=await response.json();if(!response.ok)throw new Error(typeof data.detail==="string"?data.detail:"Inscription impossible.");setConfirmation(data)}catch(reason){setError(reason instanceof Error?reason.message:"Inscription impossible.")}finally{setBusy(false)}}
  return <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto overscroll-contain rounded-[24px] bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]" onMouseDown={event=>event.stopPropagation()}>
    <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-atlas-line bg-white p-6"><div><p className="text-xs font-black uppercase tracking-widest text-atlas-teal">Inscription à l’événement</p><h2 className="mt-2 font-display text-2xl font-black text-atlas-petrol">{event.title}</h2><p className="mt-2 text-sm text-slate-500">{event.time} · {event.location}</p></div><button type="button" onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200" aria-label="Fermer"><X/></button></header>
    {confirmation?<div className="p-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"><BadgeCheck size={34}/></span><h3 className="mt-5 font-display text-2xl font-black">Inscription confirmée</h3><p className="mt-3 text-slate-600">{confirmation.participant_count} participant{confirmation.participant_count!==1?"s":""} inscrit{confirmation.participant_count!==1?"s":""}.</p><div className="mx-auto mt-5 max-w-md rounded-xl bg-atlas-cloud p-4"><p className="text-xs font-bold uppercase text-slate-400">Référence</p><b className="mt-1 block text-xl text-atlas-teal">{confirmation.reference}</b></div><div className="mt-5 flex flex-wrap justify-center gap-3">{confirmation.map_url&&<a href={confirmation.map_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-atlas-line px-5 py-3 font-bold text-atlas-petrol"><MapPin size={17}/>Voir l’itinéraire</a>}{confirmation.online_url&&<a href={confirmation.online_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-atlas-teal px-5 py-3 font-bold text-white"><CalendarCheck size={17}/>Accéder à {confirmation.online_provider??"la réunion"}</a>}</div><button type="button" onClick={onClose} className="mt-7 font-bold text-slate-500">Fermer</button></div>:<form onSubmit={submit} className="p-6">
      <div className="grid gap-4 sm:grid-cols-2"><PublicField label="Prénom du contact *"><input required value={contact.first_name} onChange={e=>updateContact("first_name",e.target.value)}/></PublicField><PublicField label="Nom du contact *"><input required value={contact.last_name} onChange={e=>updateContact("last_name",e.target.value)}/></PublicField><PublicField label="Email *"><input required type="email" value={contact.email} onChange={e=>updateContact("email",e.target.value)}/></PublicField><PublicField label="Téléphone *"><input required type="tel" value={contact.phone} onChange={e=>updateContact("phone",e.target.value)}/></PublicField></div>
      <div className="mt-7 flex items-center justify-between gap-3"><div><h3 className="font-display text-lg font-bold">Participants</h3><p className="text-xs text-slate-500">Ajoutez toutes les personnes pour réserver le bon nombre de places.</p></div><button type="button" disabled={participants.length>=10} onClick={()=>setParticipants(rows=>[...rows,{first_name:"",last_name:"",email:"",phone:""}])} className="rounded-lg bg-atlas-mist px-3 py-2 text-sm font-bold text-atlas-teal disabled:opacity-40">+ Ajouter</button></div>
      <div className="mt-4 space-y-3">{participants.map((row,index)=><fieldset key={index} className="rounded-xl border border-atlas-line bg-slate-50/50 p-4"><div className="flex items-center justify-between"><legend className="font-bold">Participant {index+1}{index===0?" · contact principal":""}</legend>{index>0&&<button type="button" onClick={()=>setParticipants(rows=>rows.filter((_,i)=>i!==index))} className="text-xs font-bold text-red-600">Retirer</button>}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><PublicField label="Prénom *"><input required value={row.first_name} onChange={e=>setParticipants(rows=>rows.map((item,i)=>i===index?{...item,first_name:e.target.value}:item))}/></PublicField><PublicField label="Nom *"><input required value={row.last_name} onChange={e=>setParticipants(rows=>rows.map((item,i)=>i===index?{...item,last_name:e.target.value}:item))}/></PublicField>{index>0&&<><PublicField label="Email"><input type="email" value={row.email} onChange={e=>setParticipants(rows=>rows.map((item,i)=>i===index?{...item,email:e.target.value}:item))}/></PublicField><PublicField label="Téléphone"><input type="tel" value={row.phone} onChange={e=>setParticipants(rows=>rows.map((item,i)=>i===index?{...item,phone:e.target.value}:item))}/></PublicField></>}</div></fieldset>)}</div>
      <PublicField label="Message ou besoin particulier"><textarea rows={3} value={contact.notes} onChange={e=>updateContact("notes",e.target.value)} placeholder="Optionnel"/></PublicField>
      <label className="mt-4 flex items-start gap-3 rounded-xl bg-atlas-cloud p-4 text-sm leading-6 text-slate-600"><input required type="checkbox" checked={contact.consent} onChange={e=>setContact({...contact,consent:e.target.checked})} className="mt-1 h-4 w-4 accent-atlas-teal"/>J’accepte que mes informations soient utilisées uniquement pour gérer cette inscription et les communications liées à l’événement.</label>
      {error&&<p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p>}<button disabled={busy} className="mt-5 w-full rounded-xl bg-atlas-teal px-6 py-3.5 font-bold text-white shadow-lg shadow-atlas-teal/20 disabled:opacity-50">{busy?"Inscription en cours…":`Confirmer ${participants.length} place${participants.length!==1?"s":""}`}</button>
    </form>}
  </section></div>
}
function PublicField({label,children}:{label:string;children:ReactNode}){return <label className="mt-3 block text-sm font-bold text-atlas-petrol">{label}<span className="mt-2 block [&_input]:h-12 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-atlas-line [&_input]:px-3 [&_input]:font-normal [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-atlas-line [&_textarea]:p-3 [&_textarea]:font-normal">{children}</span></label>}

function PatientLanding({onDoctor,onLogin}:{onDoctor:()=>void;onLogin:()=>void}) {
  const benefits=[
    [CalendarDays,'Vos rendez-vous, simplement','Demandez un rendez-vous et retrouvez toutes vos consultations à venir au même endroit.'],
    [FileHeart,'Votre suivi médical accessible','Consultez vos visites, ordonnances et documents partagés par votre médecin.'],
    [ShieldCheck,'Un espace privé et sécurisé','Vos informations de santé restent protégées et accessibles uniquement aux personnes autorisées.']
  ] as const
  return <main className="min-h-screen overflow-x-hidden bg-atlas-cloud text-atlas-ink">
    <header className="sticky top-0 z-30 border-b border-atlas-line/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 py-3 pe-[170px] ps-4 md:ps-8">
        <a href="#patient-accueil" className="flex shrink-0 items-center"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-11 w-24 object-contain sm:h-12 sm:w-32"/></a>
        <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 lg:flex"><a href="#patient-avantages" className="hover:text-atlas-teal">Avantages</a><a href="#patient-comment" className="hover:text-atlas-teal">Comment ça marche ?</a></nav>
        <div className="flex items-center gap-2"><button type="button" onClick={onLogin} className="hidden h-11 items-center rounded-[10px] border border-atlas-line bg-white px-4 text-sm font-bold text-atlas-petrol transition hover:border-atlas-teal sm:inline-flex">Connexion</button></div>
      </div>
      <div className="absolute end-2 top-3"><AudienceSwitch audience="patient" onChange={audience=>{if(audience==='doctor')onDoctor()}}/></div>
    </header>

    <section id="patient-accueil" className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(46,196,182,0.16),transparent_38%),linear-gradient(180deg,#f8fbfb_0%,#eef7f6_100%)]">
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:py-24">
        <motion.div initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.45}}>
          <p className="inline-flex items-center gap-2 rounded-full border border-atlas-teal/20 bg-white px-4 py-2 text-sm font-bold text-atlas-teal shadow-sm"><HeartPulse size={16}/>Votre santé, toujours à portée de main</p>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-black leading-[1.1] tracking-[-0.025em] text-atlas-petrol md:text-6xl">Votre parcours de santé, plus simple et mieux organisé.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">Prenez rendez-vous et accédez à vos documents, ordonnances et informations médicales depuis un espace patient sécurisé.</p>
          <div className="mt-8"><button type="button" onClick={onLogin} className="rounded-[11px] border border-atlas-line bg-white px-6 py-3.5 text-sm font-bold text-atlas-petrol shadow-sm transition hover:border-atlas-teal">J’ai déjà un compte</button></div>
        </motion.div>
        <motion.div initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{duration:.45,delay:.1}} className="rounded-[24px] border border-white bg-white/90 p-7 shadow-[0_30px_80px_rgba(15,82,95,0.16)]">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-atlas-mist text-atlas-teal"><HeartPulse size={38}/></div><h2 className="mt-5 text-center font-display text-2xl font-bold text-atlas-petrol">Bienvenue dans votre espace santé</h2><div className="mt-7 space-y-3">{['Mes prochains rendez-vous','Mes ordonnances et documents','Mon historique médical'].map((label,index)=><div key={label} className="flex items-center gap-3 rounded-[12px] border border-atlas-line bg-atlas-cloud p-4"><span className="grid h-9 w-9 place-items-center rounded-[9px] bg-white font-bold text-atlas-teal">{index+1}</span><span className="text-sm font-bold text-slate-600">{label}</span></div>)}</div>
        </motion.div>
      </div>
    </section>

    <section id="patient-avantages" className="mx-auto max-w-7xl px-5 py-20 md:px-8"><SectionTitle kicker="Espace patient" title="Tout votre suivi médical dans un seul espace" text="FADAA Santé vous rapproche de votre cabinet et simplifie chaque étape de votre parcours."/><div className="mt-9 grid gap-5 md:grid-cols-3">{benefits.map(([Icon,title,text],index)=><motion.article key={title} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.06}} className="rounded-[18px] border border-atlas-line bg-white p-7 shadow-sm"><span className="grid h-12 w-12 place-items-center rounded-[12px] bg-atlas-mist text-atlas-teal"><Icon size={23}/></span><h3 className="mt-5 font-display text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{text}</p></motion.article>)}</div></section>

    <section id="patient-comment" className="bg-atlas-ink py-20 text-white"><div className="mx-auto max-w-7xl px-5 md:px-8"><p className="text-sm font-bold uppercase tracking-wide text-atlas-aqua">Comment ça marche ?</p><h2 className="mt-3 font-display text-3xl font-bold md:text-4xl">Commencez en quelques minutes</h2><div className="mt-9 grid gap-4 md:grid-cols-3">{[['1','Créez votre compte','Renseignez vos informations personnelles.'],['2','Connectez-vous à votre cabinet','Retrouvez les services proposés par votre médecin.'],['3','Gérez votre suivi','Consultez vos rendez-vous et documents en toute sécurité.']].map(([step,title,text])=><div key={step} className="rounded-[16px] border border-white/10 bg-white/[.07] p-6"><strong className="text-3xl text-atlas-aqua">{step}</strong><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-7 text-white/65">{text}</p></div>)}</div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8"><div className="rounded-[20px] bg-gradient-to-r from-atlas-petrol to-atlas-teal p-8 text-center text-white shadow-xl md:p-12"><h2 className="font-display text-3xl font-bold">Prêt à simplifier votre suivi médical ?</h2><p className="mx-auto mt-3 max-w-2xl text-white/75">Choisissez d’abord un médecin dans l’annuaire pour demander un rendez-vous. Votre espace patient sera ensuite préparé automatiquement.</p></div></section>
    <footer className="bg-atlas-teal px-5 py-8 text-center text-sm font-semibold text-white/85">FADAA Santé © Copyright 2026 · Votre santé, en toute simplicité.</footer>
  </main>
}

function Footer({tr}:{tr:Translate}) {
  return (
    <footer className="relative overflow-hidden bg-atlas-teal text-white">
      <div className="absolute inset-x-0 top-0 h-9 bg-white/20 [clip-path:polygon(0_0,18%_45%,38%_0,56%_35%,73%_8%,100%_40%,100%_0)]" />
      <div className="absolute inset-0 bg-atlas-petrol/10" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-8 pt-20 md:px-8 lg:grid-cols-[1.3fr_0.7fr_0.85fr_1.2fr]">
        <div>
          <div className="flex items-center gap-4">
            <span className="rounded-[8px] bg-white p-2 shadow-lg shadow-black/10"><img src="/images/fadaa-logo.svg" alt="FADAA Santé" className="h-20 w-56 object-contain" /></span>
          </div>
          <p className="mt-6 max-w-md text-base font-medium leading-8 text-white/90">
            {tr('Boostez la productivité de votre cabinet avec une solution qui simplifie l’agenda, les paiements, les dossiers CNSS/CNOPS et la communication patient.')}
          </p>
        </div>

        <FooterColumn title={tr('Navigation')} items={footerNavigation} tr={tr}/>
        <FooterColumn title={tr('Nos solutions')} items={footerSolutions} tr={tr}/>

        <div>
          <h3 className="text-lg font-black">{tr('Adresse')}</h3>
          <ul className="mt-5 space-y-4 text-base font-semibold text-white/92">
            <li className="flex gap-3">
              <Phone className="mt-1 shrink-0" size={22} />
              <span>06 62 12 36 84</span>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-1 shrink-0" size={22} />
              <span>05 20 73 50 61</span>
            </li>
            <li className="flex gap-3">
              <Mail className="mt-1 shrink-0" size={22} />
              <span>contact@fadaa.ma</span>
            </li>
            <li className="flex gap-3">
              <MapPin className="mt-1 shrink-0" size={24} />
              <span>Angle Bd Abdelmoumen & Rue Soumiya, Résidence Shahrazade III, 3e étage, N° 14, Casablanca 20340</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-6 border-t border-white/10 px-5 py-8 md:px-8">
        <div className="flex items-center gap-5 text-4xl">
          <a href="https://www.linkedin.com" aria-label="LinkedIn" className="transition hover:scale-110 hover:text-atlas-aqua">
            <FaLinkedinIn />
          </a>
          <a href="https://www.facebook.com" aria-label="Facebook" className="transition hover:scale-110 hover:text-atlas-aqua">
            <FaFacebookF />
          </a>
          <a href="https://www.instagram.com" aria-label="Instagram" className="transition hover:scale-110 hover:text-atlas-aqua">
            <FaInstagram />
          </a>
          <a href="https://wa.me/212662123684" aria-label="WhatsApp" className="transition hover:scale-110 hover:text-atlas-aqua">
            <FaWhatsapp />
          </a>
        </div>
        <p className="text-center text-sm font-semibold text-white/88">
          FADAA Santé © Copyright 2026. {tr('Tous droits réservés à')} <a href="https://irmaservice.com" className="underline">IRMA SERVICE</a>
        </p>
      </div>
    </footer>
  )
}

function FooterColumn({ title, items,tr }: { title: string; items: string[][];tr:Translate }) {
  return (
    <div>
      <h3 className="text-lg font-black">{title}</h3>
      <ul className="mt-5 space-y-3 text-base font-semibold text-white/92">
        {items.map(([item, id]) => (
          <li key={item}>
            <a href={`#${id}`} className="transition hover:text-atlas-aqua">
              {tr(item)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  )
}
