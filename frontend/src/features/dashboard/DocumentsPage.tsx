import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Download, Eye, FileHeart, FileImage, FileText, FolderOpen, Grid3X3, List, Pencil, Printer, Receipt, Search, Trash2, UploadCloud, UserRound, X } from 'lucide-react'

import { apiCreate, apiDelete, apiDownload, apiList, apiPreview, apiUpdate, apiUpload, type PaginationMeta } from '../../lib/api'
import { PaginationControls } from '../../components/PaginationControls'
import { getSession, logout } from '../../lib/auth'
import { confirmAction } from '../../lib/uiFeedback'
import { MedecinLayout } from './MedecinLayout'
import { StaffLayout } from '../staff/StaffLayout'

type Patient={id:string;first_name:string;last_name:string;phone:string|null;status:string}
type DocumentItem={id:string;patient_id:string;invoice_id?:string|null;title:string;document_type:string;file_url:string|null;shared_with_patient:boolean;created_at:string;mime_type?:string|null;file_size?:number|null;extension?:string|null;source?:string}
type InvoiceItem={id:string;patient_id:string;invoice_number:string;amount_total:number;amount_paid:number;amount_due:number;status:string;issued_at:string}
type PaymentItem={id:string;patient_id:string;invoice_id:string|null;amount:number;method:string;status:string;paid_at:string;reference:string|null}
type PaymentDocument={id:string;document_number:string;document_type:string}
type Props={onNavigate:(path:string)=>void;mode?:'doctor'|'staff';permissionLevel?:string}
type LibraryItem={id:string;kind:'document'|'invoice'|'receipt';patient_id:string;title:string;category:string;date:string;document?:DocumentItem;invoice?:InvoiceItem;payment?:PaymentItem}

const uploadTypes=['Analyse','Radio','CIN','CNOPS','CNSS/CNOPS','Courrier','Ordonnance','Autre']
const filters=[
  ['all','Tous les documents',FolderOpen],
  ['Ordonnance','Ordonnances',FileHeart],
  ['CNSS/CNOPS','CNSS/CNOPS',FileText],
  ['CNOPS','CNOPS',FileText],
  ['CIN','CIN',UserRound],
  ['Facture','Factures',CreditCard],
  ['Reçu','Reçus',Receipt],
  ['Analyse','Analyses',FileText],
  ['Radio','Radios',FileImage],
] as const
const categoryStyles:Record<string,string>={
  Ordonnance:'bg-rose-50 text-rose-700 border-rose-100','CNSS/CNOPS':'bg-amber-50 text-amber-700 border-amber-100',
  CNOPS:'bg-sky-50 text-sky-700 border-sky-100',CIN:'bg-indigo-50 text-indigo-700 border-indigo-100',
  Facture:'bg-blue-50 text-blue-700 border-blue-100',Reçu:'bg-emerald-50 text-emerald-700 border-emerald-100',
  Analyse:'bg-violet-50 text-violet-700 border-violet-100',Radio:'bg-cyan-50 text-cyan-700 border-cyan-100',
  Courrier:'bg-teal-50 text-teal-700 border-teal-100',Autre:'bg-slate-100 text-slate-700 border-slate-200',
}
const fieldClass='mt-2 w-full rounded-[9px] border border-atlas-line bg-white px-4 py-3 outline-none transition focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10 disabled:bg-slate-50'
const money=(value:number)=>`${Number(value||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} MAD`

export function DocumentsPage({onNavigate,mode='doctor',permissionLevel}:Props){
  const session=getSession()
  const[documents,setDocuments]=useState<DocumentItem[]>([]);const[invoices,setInvoices]=useState<InvoiceItem[]>([]);const[payments,setPayments]=useState<PaymentItem[]>([]);const[patients,setPatients]=useState<Patient[]>([])
  const[patientId,setPatientId]=useState('');const[title,setTitle]=useState('');const[documentType,setDocumentType]=useState('Analyse');const[shared,setShared]=useState(false);const[file,setFile]=useState<File|null>(null)
  const[editingId,setEditingId]=useState<string|null>(null);const[search,setSearch]=useState('');const[filter,setFilter]=useState('all');const[view,setView]=useState<'grid'|'list'>('grid')
  const[page,setPage]=useState(1)
  const[loading,setLoading]=useState(true);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');const[uploadOpen,setUploadOpen]=useState(false);const[selected,setSelected]=useState<LibraryItem|null>(null)
  const readOnly=permissionLevel==='read'||session?.tenantStatus==='expired'||session?.tenantStatus==='suspended'
  const canDelete=mode==='doctor'||permissionLevel==='admin'
  const patientById=useMemo(()=>new Map(patients.map(patient=>[patient.id,patient])),[patients])

  const load=useCallback(async()=>{
    if(!session?.accessToken)return
    setLoading(true)
    try{
      const results=await Promise.allSettled([
        apiList<DocumentItem>('/doctor/documents',session.accessToken),
        apiList<Patient>('/patients',session.accessToken),
        apiList<InvoiceItem>('/invoices',session.accessToken),
        apiList<PaymentItem>('/payments',session.accessToken),
      ])
      if(results[0].status==='rejected'||results[1].status==='rejected')throw new Error('Chargement de la bibliothèque impossible.')
      setDocuments(results[0].value);setPatients(results[1].value.filter(patient=>patient.status!=='disabled'))
      setInvoices(results[2].status==='fulfilled'?results[2].value:[])
      setPayments(results[3].status==='fulfilled'?results[3].value:[])
      setMessage('')
    }catch(error){setMessage(error instanceof Error?error.message:'Chargement impossible.')}finally{setLoading(false)}
  },[session?.accessToken])
  useEffect(()=>{void load()},[load])
  useEffect(()=>{const patient=new URLSearchParams(window.location.search).get('patient');if(patient){setPatientId(patient);setUploadOpen(true)}},[])

  const library=useMemo<LibraryItem[]>(()=>{
    const archivedInvoiceIds=new Set(documents.map(item=>item.invoice_id).filter(Boolean))
    const rows:LibraryItem[]=[
      ...documents.map(item=>({id:`document-${item.id}`,kind:'document' as const,patient_id:item.patient_id,title:item.title,category:normalizeCategory(item.document_type),date:item.created_at,document:item})),
      ...invoices.filter(item=>!archivedInvoiceIds.has(item.id)).map(item=>({id:`invoice-${item.id}`,kind:'invoice' as const,patient_id:item.patient_id,title:`Facture ${item.invoice_number}`,category:'Facture',date:item.issued_at,invoice:item})),
      ...payments.filter(item=>item.status!=='ANNULE').map(item=>({id:`receipt-${item.id}`,kind:'receipt' as const,patient_id:item.patient_id,title:`Reçu ${item.reference||item.id.slice(0,8).toUpperCase()}`,category:'Reçu',date:item.paid_at,payment:item})),
    ]
    return rows.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime())
  },[documents,invoices,payments])
  const visible=useMemo(()=>{
    const query=search.trim().toLocaleLowerCase('fr')
    return library.filter(item=>{
      if(filter!=='all'&&item.category!==filter)return false
      const patient=patientById.get(item.patient_id)
      return !query||`${item.title} ${item.category} ${patient?.first_name??''} ${patient?.last_name??''}`.toLocaleLowerCase('fr').includes(query)
    })
  },[filter,library,patientById,search])
  const counts=useMemo(()=>Object.fromEntries(filters.map(([key])=>[key,key==='all'?library.length:library.filter(item=>item.category===key).length])),[library])
  const pageSize=10
  const pagination=useMemo<PaginationMeta>(()=>{const totalPages=Math.max(1,Math.ceil(visible.length/pageSize));const current=Math.min(page,totalPages);return{page:current,page_size:pageSize,total_items:visible.length,total_pages:totalPages,has_next:current<totalPages,has_previous:current>1}},[page,visible.length])
  const pagedVisible=useMemo(()=>visible.slice((pagination.page-1)*pageSize,pagination.page*pageSize),[pagination.page,visible])

  function resetForm(){setEditingId(null);setPatientId('');setTitle('');setDocumentType('Analyse');setShared(false);setFile(null);setUploadOpen(false)}
  function edit(item:DocumentItem){setEditingId(item.id);setPatientId(item.patient_id);setTitle(item.title);setDocumentType(item.document_type);setShared(item.shared_with_patient);setFile(null);setUploadOpen(true);setSelected(null)}
  async function submit(event:FormEvent){event.preventDefault();if(!session?.accessToken||readOnly)return;setSaving(true);setMessage('');try{if(editingId)await apiUpdate<DocumentItem>(`/doctor/documents/${editingId}`,session.accessToken,{title:title.trim(),document_type:documentType,shared_with_patient:shared});else{if(!file)throw new Error('Veuillez choisir un fichier.');await apiUpload<DocumentItem>(`/doctor/patients/${patientId}/documents`,session.accessToken,{title:title.trim(),document_type:documentType,shared_with_patient:shared,file})}const wasEditing=Boolean(editingId);resetForm();await load();setMessage(wasEditing?'Document modifié avec succès.':'Document ajouté avec succès.')}catch(error){setMessage(error instanceof Error?error.message:'Enregistrement impossible.')}finally{setSaving(false)}}
  async function remove(item:DocumentItem){if(!session?.accessToken||readOnly||!canDelete||!await confirmAction({title:'Archiver ce document ?',message:`« ${item.title} » sera retiré de la bibliothèque active.`,confirmLabel:'Archiver',tone:'danger'}))return;try{await apiDelete(`/doctor/documents/${item.id}`,session.accessToken);setSelected(null);await load()}catch(error){setMessage(error instanceof Error?error.message:'Archivage impossible.')}}
  async function preview(item:DocumentItem){if(!session?.accessToken||!item.file_url)return;const popup=window.open('about:blank','_blank');try{const response=await apiPreview(`/doctor/documents/${item.id}/preview`,session.accessToken);if(popup)popup.location.href=response.url;else window.location.href=response.url}catch(error){popup?.close();setMessage(error instanceof Error?error.message:'Aperçu impossible.')}}
  async function printDocument(item:DocumentItem){if(!session?.accessToken||!item.file_url)return;const popup=window.open('about:blank','_blank');try{const response=await apiPreview(`/doctor/documents/${item.id}/preview`,session.accessToken);if(popup){popup.location.href=response.url;window.setTimeout(()=>{popup.focus();popup.print()},900)}else window.location.href=response.url}catch(error){popup?.close();setMessage(error instanceof Error?error.message:'Impression impossible.')}}
  async function download(item:DocumentItem){if(!session?.accessToken||!item.file_url)return;try{await apiDownload(`/doctor/documents/${item.id}/download`,session.accessToken,item.title)}catch(error){setMessage(error instanceof Error?error.message:'Téléchargement impossible.')}}
  async function financialDocument(item:LibraryItem,action:'preview'|'download'|'print'){
    if(!session?.accessToken)return
    const popup=action==='download'?null:window.open('about:blank','_blank')
    try{
      if(item.invoice){
        const path=`/invoices/${item.invoice.id}/pdf?action=${action==='download'?'download':action}`
        if(action==='download')await apiDownload(path,session.accessToken,`facture_${item.invoice.invoice_number}.pdf`)
        else{const response=await apiPreview(path,session.accessToken);if(popup){popup.location.href=response.url;if(action==='print')window.setTimeout(()=>{popup.focus();popup.print()},900)}else window.location.href=response.url}
        return
      }
      if(item.payment){
        const document=await apiCreate<PaymentDocument>(`/paiements/${item.payment.id}/documents`,session.accessToken,{document_type:'recu'})
        if(action==='download')await apiDownload(`/documents-paiement/${document.id}/download`,session.accessToken,`${document.document_number}.pdf`)
        else{const response=await apiPreview(`/documents-paiement/${document.id}/preview`,session.accessToken);if(popup){popup.location.href=response.url;if(action==='print')window.setTimeout(()=>{popup.focus();popup.print()},900)}else window.location.href=response.url}
      }
    }catch(error){popup?.close();setMessage(error instanceof Error?error.message:'Ouverture du PDF impossible.')}
  }

  const content=<div className="mx-auto max-w-[1500px] px-5 py-6 md:px-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wide text-atlas-teal">Bibliothèque sécurisée du cabinet</p><h1 className="mt-1 font-display text-3xl font-bold">Documents</h1><p className="mt-2 text-sm text-slate-600">Tous les documents patients, ordonnances, pièces CNSS/CNOPS, factures et reçus au même endroit.</p></div><button disabled={readOnly} onClick={()=>{resetForm();setUploadOpen(true)}} className="inline-flex items-center gap-2 rounded-[10px] bg-atlas-teal px-5 py-3 font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-atlas-petrol disabled:opacity-40"><UploadCloud size={19}/>Ajouter un document</button></header>
    {message&&<p className={`mt-5 rounded-[9px] border px-4 py-3 text-sm font-bold ${message.includes('succès')?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-amber-200 bg-amber-50 text-amber-800'}`}>{message}</p>}

    <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Tous les fichiers" value={library.length} icon={FolderOpen}/>
      <Metric label="Ordonnances" value={counts.Ordonnance||0} icon={FileHeart} tone="rose"/>
      <Metric label="Dossiers CNSS/CNOPS" value={counts['CNSS/CNOPS']||0} icon={FileText} tone="amber"/>
      <Metric label="Documents financiers" value={(counts.Facture||0)+(counts.Reçu||0)} icon={CreditCard} tone="blue"/>
    </section>

    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[250px_1fr]">
      <aside className="rounded-[14px] border border-atlas-line bg-white p-3 shadow-sm lg:sticky lg:top-32"><p className="px-3 pb-2 pt-1 text-xs font-black uppercase tracking-wider text-slate-400">Catégories</p>{filters.map(([key,label,Icon])=><button key={key} onClick={()=>{setFilter(key);setPage(1)}} className={`mt-1 flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-start text-sm font-bold transition ${filter===key?'bg-atlas-mist text-atlas-teal shadow-sm':'text-slate-600 hover:bg-slate-50 hover:text-atlas-petrol'}`}><Icon size={18}/><span className="min-w-0 flex-1">{label}</span><span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500">{counts[key]||0}</span></button>)}</aside>

      <section className="min-w-0 overflow-hidden rounded-[14px] border border-atlas-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-atlas-line p-4"><div className="relative min-w-[240px] flex-1"><Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={event=>{setSearch(event.target.value);setPage(1)}} placeholder="Rechercher un document ou un patient…" className="w-full rounded-[10px] border border-atlas-line py-3 pe-4 ps-10 outline-none focus:border-atlas-teal focus:ring-4 focus:ring-atlas-teal/10"/></div><div className="flex rounded-[9px] border border-atlas-line bg-slate-50 p-1"><button onClick={()=>setView('grid')} title="Vue grille" className={`rounded-[7px] p-2 ${view==='grid'?'bg-white text-atlas-teal shadow-sm':'text-slate-400'}`}><Grid3X3 size={18}/></button><button onClick={()=>setView('list')} title="Vue liste" className={`rounded-[7px] p-2 ${view==='list'?'bg-white text-atlas-teal shadow-sm':'text-slate-400'}`}><List size={18}/></button></div></div>
        {loading?<div className="grid min-h-72 place-items-center"><p className="font-bold text-slate-500">Chargement de la bibliothèque…</p></div>:!visible.length?<div className="grid min-h-72 place-items-center p-8 text-center"><div><FolderOpen size={44} className="mx-auto text-slate-300"/><p className="mt-4 font-bold text-slate-600">Aucun document dans cette catégorie</p><p className="mt-1 text-sm text-slate-400">Modifiez les filtres ou ajoutez un nouveau fichier.</p></div></div>:<div className={view==='grid'?'grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3':'divide-y divide-atlas-line'}>{pagedVisible.map(item=><LibraryCard key={item.id} item={item} patient={patientById.get(item.patient_id)} view={view} onOpen={()=>setSelected(item)}/>)}</div>}
        <PaginationControls pagination={pagination} loading={loading} itemLabel="document" onPageChange={setPage}/>
      </section>
    </div>

    {uploadOpen&&<div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={event=>{if(event.target===event.currentTarget)resetForm()}}><form onSubmit={submit} className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[18px] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-atlas-teal">Classement patient</p><h2 className="mt-1 font-display text-2xl font-bold">{editingId?'Modifier le document':'Ajouter un document'}</h2></div><button type="button" onClick={resetForm} className="rounded-full bg-slate-100 p-2 text-slate-500"><X size={19}/></button></div>
      <label className="mt-5 block text-sm font-bold">Patient *<select required disabled={readOnly||Boolean(editingId)} value={patientId} onChange={event=>setPatientId(event.target.value)} className={fieldClass}><option value="">Choisir un patient</option>{patients.map(patient=><option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}{patient.phone?` · ${patient.phone}`:''}</option>)}</select></label>
      <label className="mt-4 block text-sm font-bold">Titre *<input required minLength={2} disabled={readOnly} value={title} onChange={event=>setTitle(event.target.value)} placeholder="Ex. Résultats prise de sang" className={fieldClass}/></label>
      <label className="mt-4 block text-sm font-bold">Catégorie *<select required disabled={readOnly} value={documentType} onChange={event=>setDocumentType(event.target.value)} className={fieldClass}>{uploadTypes.map(type=><option key={type}>{type}</option>)}</select></label>
      {!editingId&&<label className="mt-4 block text-sm font-bold">Fichier *<span className="mt-2 grid min-h-28 cursor-pointer place-items-center rounded-[12px] border-2 border-dashed border-atlas-line bg-atlas-mist/30 p-4 text-center transition hover:border-atlas-teal"><UploadCloud className="text-atlas-teal"/><span className="mt-2 text-sm text-slate-600">{file?file.name:'PDF, image ou document bureautique'}</span><input required disabled={readOnly} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" onChange={event=>setFile(event.target.files?.[0]??null)} className="sr-only"/></span></label>}
      <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-atlas-line bg-slate-50 px-4 py-3"><span><b className="block text-sm">Partager avec le patient</b><small className="text-slate-500">Visible dans son espace personnel</small></span><input type="checkbox" disabled={readOnly} checked={shared} onChange={event=>setShared(event.target.checked)} className="h-5 w-5 accent-atlas-teal"/></label>
      <button disabled={readOnly||saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[9px] bg-atlas-teal px-5 py-3.5 font-bold text-white hover:bg-atlas-petrol disabled:opacity-50"><CheckCircle2 size={18}/>{saving?'Enregistrement…':editingId?'Enregistrer les modifications':'Ajouter à la bibliothèque'}</button>
    </form></div>}

    {selected&&<DetailDrawer item={selected} patient={patientById.get(selected.patient_id)} canDelete={canDelete&&!readOnly} onClose={()=>setSelected(null)} onPreview={preview} onPrint={printDocument} onDownload={download} onEdit={edit} onDelete={remove} onFinancial={financialDocument}/>}
  </div>
  const out=()=>{logout();onNavigate('/login')}
  return mode==='staff'?<StaffLayout cabinetName="Espace secrétaire" onNavigate={onNavigate} onLogout={out}>{content}</StaffLayout>:<MedecinLayout cabinetName="Espace médecin" onNavigate={onNavigate} onLogout={out}>{content}</MedecinLayout>
}

function normalizeCategory(value:string){const lowered=value.toLocaleLowerCase('fr');if(lowered.includes('ordonnance'))return'Ordonnance';if(lowered.includes('cnss'))return'CNSS/CNOPS';if(lowered.includes('analyse'))return'Analyse';if(lowered.includes('radio'))return'Radio';if(lowered.includes('courrier'))return'Courrier';if(lowered.includes('facture'))return'Facture';return'Autre'}
function patientName(patient?:Patient){return patient?`${patient.first_name} ${patient.last_name}`:'Patient'}
function ItemIcon({category,size=20}:{category:string;size?:number}){const Icon=category==='Ordonnance'?FileHeart:category==='Facture'?CreditCard:category==='Reçu'?Receipt:category==='Radio'?FileImage:FileText;return <Icon size={size}/>}
function Metric({label,value,icon:Icon,tone='teal'}:{label:string;value:number;icon:typeof FileText;tone?:string}){const tones:Record<string,string>={teal:'bg-atlas-mist text-atlas-teal',rose:'bg-rose-50 text-rose-600',amber:'bg-amber-50 text-amber-600',blue:'bg-blue-50 text-blue-600'};return <article className="flex items-center gap-4 rounded-[13px] border border-atlas-line bg-white p-4 shadow-sm"><span className={`grid h-11 w-11 place-items-center rounded-[11px] ${tones[tone]}`}><Icon size={21}/></span><div><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-atlas-petrol">{value}</p></div></article>}
function LibraryCard({item,patient,view,onOpen}:{item:LibraryItem;patient?:Patient;view:'grid'|'list';onOpen:()=>void}){const style=categoryStyles[item.category]??categoryStyles.Autre;if(view==='list')return <button onClick={onOpen} className="flex w-full items-center gap-4 p-4 text-start transition hover:bg-slate-50"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[11px] border ${style}`}><ItemIcon category={item.category}/></span><span className="min-w-0 flex-1"><b className="block truncate">{item.title}</b><small className="text-slate-500">{patientName(patient)} · {new Date(item.date).toLocaleDateString('fr-FR')}</small></span><span className={`hidden rounded-full border px-3 py-1 text-xs font-bold sm:inline-flex ${style}`}>{item.category}</span><Eye size={18} className="text-slate-400"/></button>
  return <button onClick={onOpen} className="group overflow-hidden rounded-[13px] border border-atlas-line bg-white text-start shadow-sm transition duration-300 hover:-translate-y-1 hover:border-atlas-teal/35 hover:shadow-panel"><div className={`flex h-28 items-center justify-center border-b ${style}`}><ItemIcon category={item.category} size={38}/></div><div className="p-4"><div className="flex items-start justify-between gap-3"><b className="line-clamp-2">{item.title}</b><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${style}`}>{item.category}</span></div><p className="mt-3 flex items-center gap-2 truncate text-sm text-slate-500"><UserRound size={15}/>{patientName(patient)}</p><p className="mt-2 text-xs text-slate-400">{new Date(item.date).toLocaleDateString('fr-FR',{dateStyle:'medium'})}</p></div></button>}
function DetailDrawer({item,patient,canDelete,onClose,onPreview,onPrint,onDownload,onEdit,onDelete,onFinancial}:{item:LibraryItem;patient?:Patient;canDelete:boolean;onClose:()=>void;onPreview:(item:DocumentItem)=>void;onPrint:(item:DocumentItem)=>void;onDownload:(item:DocumentItem)=>void;onEdit:(item:DocumentItem)=>void;onDelete:(item:DocumentItem)=>void;onFinancial:(item:LibraryItem,action:'preview'|'download'|'print')=>void}){const style=categoryStyles[item.category]??categoryStyles.Autre;return <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/45 backdrop-blur-sm" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className="h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b border-atlas-line bg-white/95 p-5 backdrop-blur"><div><p className="text-xs font-black uppercase tracking-wider text-atlas-teal">Détail du document</p><h2 className="mt-1 font-display text-xl font-bold">{item.title}</h2></div><button onClick={onClose} className="rounded-full bg-slate-100 p-2"><X size={19}/></button></header><div className="p-5"><div className={`grid h-48 place-items-center rounded-[16px] border ${style}`}><ItemIcon category={item.category} size={60}/></div><div className="mt-5 grid gap-3 rounded-[13px] bg-slate-50 p-4"><Info label="Patient" value={patientName(patient)}/><Info label="Catégorie" value={item.category}/><Info label="Date" value={new Date(item.date).toLocaleString('fr-FR')}/>{item.document&&<><Info label="Partage patient" value={item.document.shared_with_patient?'Oui':'Non'}/><Info label="Source" value={item.document.source==='scanner'?'Scanner':'Import / génération'}/></>}{item.invoice&&<><Info label="Total" value={money(item.invoice.amount_total)}/><Info label="Payé" value={money(item.invoice.amount_paid)}/><Info label="Reste à payer" value={money(item.invoice.amount_due)}/><Info label="Statut" value={item.invoice.status}/></>}{item.payment&&<><Info label="Montant" value={money(item.payment.amount)}/><Info label="Mode" value={item.payment.method}/><Info label="Statut" value={item.payment.status}/></>}</div>{item.document?<div className="mt-5 grid grid-cols-3 gap-2"><button disabled={!item.document.file_url} onClick={()=>onPreview(item.document!)} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-atlas-teal px-3 py-3 text-sm font-bold text-white disabled:opacity-40"><Eye size={17}/>Aperçu</button><button disabled={!item.document.file_url} onClick={()=>onDownload(item.document!)} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-atlas-line px-3 py-3 text-sm font-bold text-atlas-petrol disabled:opacity-40"><Download size={17}/>Télécharger</button><button disabled={!item.document.file_url} onClick={()=>onPrint(item.document!)} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-atlas-line px-3 py-3 text-sm font-bold text-atlas-petrol disabled:opacity-40"><Printer size={17}/>Imprimer</button><button onClick={()=>onEdit(item.document!)} className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-atlas-line px-4 py-3 font-bold text-slate-600"><Pencil size={17}/>Modifier</button>{canDelete&&<button onClick={()=>void onDelete(item.document!)} className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-red-200 px-4 py-3 font-bold text-red-600"><Trash2 size={17}/>Archiver</button>}</div>:<div className="mt-5 grid grid-cols-3 gap-2"><button onClick={()=>void onFinancial(item,'preview')} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] bg-atlas-teal px-3 py-3 text-sm font-bold text-white"><Eye size={17}/>Aperçu</button><button onClick={()=>void onFinancial(item,'download')} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-atlas-line px-3 py-3 text-sm font-bold text-atlas-petrol"><Download size={17}/>Télécharger</button><button onClick={()=>void onFinancial(item,'print')} className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-atlas-line px-3 py-3 text-sm font-bold text-atlas-petrol"><Printer size={17}/>Imprimer</button></div>}</div></aside></div>}
function Info({label,value}:{label:string;value:string}){return <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-0 last:pb-0"><span className="text-sm text-slate-500">{label}</span><b className="text-end text-sm">{value}</b></div>}
