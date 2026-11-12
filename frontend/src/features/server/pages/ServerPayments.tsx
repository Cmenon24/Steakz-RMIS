import { useEffect, useState } from "react";
import { RefreshCw, X, LockKeyhole } from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getBranchManagerForBranch } from "../branch-manager.config";
import { getServerOrderPayments, getServerOrders, recordServerPayment, requestServerRefund, reviewServerRefund, type ServerOrder } from "../server.service";

export default function ServerPayments(){
  // Identify the Branch Manager assigned to the authenticated Server's branch.
  const { user } = useAuth();
  const branchManager = getBranchManagerForBranch(user?.branchName);
  const [orders,setOrders]=useState<ServerOrder[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<ServerOrder|null>(null);
  const [method,setMethod]=useState<"CASH"|"CARD">("CARD");
  const [refundPaymentId,setRefundPaymentId]=useState("");
  const [refundReason,setRefundReason]=useState("");
  const [history,setHistory]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [authorizationRefund,setAuthorizationRefund]=useState<{id:string;orderNumber:string}|null>(null);
  const [managerPassword,setManagerPassword]=useState("");

  async function load(){
    setLoading(true);setError("");
    try{
      const result = await getServerOrders();
      const completed = result.filter(order => order.status === "COMPLETED");
      const details = await Promise.all(completed.map(async order => {
        // Load payment/refund history so the refund column is accurate.
        try {
          const full: any = await getServerOrderPayments(order.id);
          return { ...order, paymentStatus: full.paymentStatus, payments: full.payments };
        } catch {
          return order;
        }
      }));
      const map = new Map(details.map(order => [order.id, order]));
      setOrders(result.map(order => map.get(order.id) ?? order));
    }
    catch(e:any){setError(e.response?.data?.message??"Unable to load payment orders.");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  const completed=orders.filter(o=>o.status==="COMPLETED");
  const isPaid=(o:ServerOrder)=>o.paymentStatus?.toUpperCase()==="PAID"||o.payments?.some(p=>p.status==="SUCCESSFUL")===true;
  // Return the latest refund state across the order's payment records.
  const getRefundStatus=(o:ServerOrder):string|null=>{
    const refunds=(o.payments??[]).flatMap((payment:any)=>(payment.refunds??[]));
    if(!refunds.length) return null;
    return [...refunds].sort((a:any,b:any)=>new Date(b.createdAt??0).getTime()-new Date(a.createdAt??0).getTime())[0].status?.toUpperCase()??null;
  };
  const due=completed.filter(o=>!isPaid(o));
  const paid=completed.filter(isPaid);
  const paymentStatusClass=(status:string)=>{
    const value=status?.toUpperCase();
    if(value==="REFUNDED") return "bg-red-100 text-red-800";
    if(value==="PAID"||value==="SUCCESSFUL") return "bg-green-100 text-green-800";
    if(value==="PAYMENT DUE") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-700";
  };
  const refundStatusClass=(status:string)=>{
    switch(status?.toUpperCase()){
      case "REQUESTED": return "bg-amber-100 text-amber-800";
      case "APPROVED": return "bg-blue-100 text-blue-800";
      case "REJECTED": return "bg-gray-100 text-gray-700";
      case "PROCESSED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-700";
    }
  };
  const refundStatusLabel=(status:string)=>{
    return status?.toUpperCase()==="PROCESSED"?"REFUNDED":status?.toUpperCase();
  };

  async function takePayment(){
    if(!selected)return;
    setBusy(true);setError("");
    try{await recordServerPayment(selected.id,method);const paidOrder=selected;setSelected(null);await load();const printReceipt=window.confirm(`Payment for ${paidOrder.orderNumber} was successful. Would you like to print a receipt?`);if(printReceipt)window.alert(`Receipt for ${paidOrder.orderNumber} printed successfully. (Simulation)`);}
    catch(e:any){setError(e.response?.data?.message??"Unable to record payment.");}
    finally{setBusy(false);}
  }
  async function viewHistory(order:ServerOrder){
    setSelected(order);setHistory(null);setError("");
    try{setHistory(await getServerOrderPayments(order.id));}
    catch(e:any){setSelected(null);setError(e.response?.data?.message??"Unable to load payment history.");}
  }
  async function submitRefund(){
    if(!refundPaymentId)return;
    if(refundReason.trim().length<3){setError("Enter a refund reason (at least 3 characters).");return;}
    setBusy(true);setError("");
    try{
      const refund:any=await requestServerRefund(refundPaymentId,refundReason.trim());
      const orderNumber=selected?.orderNumber??"the selected order";
      setRefundPaymentId("");
      setRefundReason("");
      if(selected) await viewHistory(selected);
      await load();
      if(refund?.id){
        setManagerPassword("");
        setAuthorizationRefund({id:refund.id,orderNumber});
      }else{
        setError("The refund request was submitted, but its reference was not returned. Refresh payment details to continue.");
      }
    }
    catch(e:any){setError(e.response?.data?.message??"Unable to submit refund request.");}
    finally{setBusy(false);}
  }

  async function decideRefund(decision:"APPROVED"|"REJECTED"){
    if(!authorizationRefund||!branchManager)return;
    if(!managerPassword.trim()){setError("The Branch Manager must enter their password.");return;}
    setBusy(true);setError("");
    try{
      await reviewServerRefund(authorizationRefund.id,branchManager.email,managerPassword,decision);
      setAuthorizationRefund(null);
      setManagerPassword("");
      if(selected) await viewHistory(selected);
      await load();
    }catch(e:any){
      setError(e.response?.data?.message??"Unable to review this refund. Check the manager password and try again.");
    }finally{setBusy(false);}
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-gray-900">Payments</h1><p className="mt-1 text-sm text-gray-500">Record full payments for completed orders and review payment history.</p></div><button onClick={()=>void load()} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm"><RefreshCw size={16}/>Refresh</button></div>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Payments due</p><p className="mt-2 text-3xl font-bold">{loading?"…":due.length}</p></div><div className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">Paid orders</p><p className="mt-2 text-3xl font-bold">{loading?"…":paid.length}</p></div></div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Completed orders</h2><p className="mt-1 text-xs text-gray-500">Only completed orders can be paid.</p></div>
      {loading?<p className="p-6 text-sm text-gray-500">Loading…</p>:completed.length===0?<p className="p-6 text-sm text-gray-500">No completed orders found.</p>:<div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Order","Table","Total","Payment status","Refund status","Actions"].map(h=><th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{completed.map(o=>{const hasPaid=isPaid(o);const refundStatus=getRefundStatus(o);return <tr key={o.id}><td className="px-5 py-4 font-semibold">{o.orderNumber}</td><td className="px-5 py-4">{o.table?.tableNumber??"—"}</td><td className="px-5 py-4">${Number(o.totalAmount).toFixed(2)}</td><td className="px-5 py-4"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${hasPaid?"bg-green-100 text-green-800":"bg-red-100 text-red-800"}`}>{hasPaid?"PAID":"PAYMENT DUE"}</span></td><td className="px-5 py-4">{refundStatus?<span className={`rounded-md px-2 py-1 text-xs font-semibold ${refundStatusClass(refundStatus)}`}>{refundStatusLabel(refundStatus)}</span>:"—"}</td><td className="px-5 py-4"><div className="flex gap-2">{!hasPaid&&<button onClick={()=>{setSelected(o);setHistory(null);setMethod("CARD");}} className="rounded-lg bg-[#1F2937] px-3 py-2 text-xs text-white">Take payment</button>}<button onClick={()=>void viewHistory(o)} className="rounded-lg border px-3 py-2 text-xs">View details</button></div></td></tr>;})}</tbody></table></div>}
    </section>

    {selected&&!history&&<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-lg font-semibold">Record payment · {selected.orderNumber}</h2><button onClick={()=>setSelected(null)}><X/></button></div><p className="mt-3 text-sm text-gray-500">Full amount due</p><p className="text-3xl font-bold">${Number(selected.totalAmount).toFixed(2)}</p><p className="mt-4 text-sm font-medium">Payment method</p><div className="mt-2 grid grid-cols-2 gap-3"><button onClick={()=>setMethod("CASH")} className={`rounded-lg border p-3 text-sm ${method==="CASH"?"border-[#1F2937] bg-gray-100 font-semibold":"border-gray-200"}`}>Cash</button><button onClick={()=>setMethod("CARD")} className={`rounded-lg border p-3 text-sm ${method==="CARD"?"border-[#1F2937] bg-gray-100 font-semibold":"border-gray-200"}`}>Card</button></div><p className="mt-3 text-xs text-gray-500">This records one full payment. The backend prevents duplicate successful payments.</p><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setSelected(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={()=>void takePayment()} disabled={busy} className="rounded-lg bg-[#1F2937] px-4 py-2 text-sm text-white">{busy?"Processing…":"Confirm payment"}</button></div></div></div>}

    {selected&&history&&<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"><div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-lg font-semibold">Payment details · {history.orderNumber}</h2><button onClick={()=>{setSelected(null);setHistory(null);}}><X/></button></div><p className="mt-3 flex items-center gap-2 text-sm text-gray-500">Status: <span className={`rounded-md px-2 py-1 text-xs font-semibold ${paymentStatusClass(history.paymentStatus)}`}>{history.paymentStatus??"NOT PAID"}</span></p>{history.payments?.length?history.payments.map((p:any)=><div key={p.id} className="mt-4 rounded-lg border p-4"><div className="flex justify-between"><b>{p.paymentMethod}</b><span className="text-xs text-gray-500">{p.status}</span></div><p className="mt-1 text-sm">${Number(p.amount).toFixed(2)}</p><p className="text-xs text-gray-500">{p.paymentReference??"Payment reference unavailable"} · {new Date(p.createdAt).toLocaleString()}</p>{p.refunds?.map((r:any)=><div key={r.id} className="mt-3 border-t pt-3 text-sm">{r.status==="PROCESSED"?<p className="text-sm font-medium text-gray-700">Processed</p>:<p className="flex flex-wrap items-center gap-2">Refund status: <span className={`rounded-md px-2 py-1 text-xs font-semibold ${refundStatusClass(r.status)}`}>{refundStatusLabel(r.status)}</span></p>}<p className="mt-1 text-gray-500">Reason: {r.reason}</p>{r.processedBy&&<p className="mt-1 text-gray-500">Reviewed by: {r.processedBy.firstName} {r.processedBy.lastName}</p>}{r.status==="REQUESTED"&&<button onClick={()=>{setManagerPassword("");setAuthorizationRefund({id:r.id,orderNumber:history.orderNumber});}} className="mt-3 rounded-lg bg-[#1F2937] px-3 py-2 text-xs font-semibold text-white">Manager authorization</button>}</div>)}{p.status==="SUCCESSFUL"&&!p.refunds?.some((r:any)=>["REQUESTED","APPROVED","PROCESSED"].includes(r.status))&&<button onClick={()=>setRefundPaymentId(p.id)} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-xs text-red-700">Request refund</button>}</div>):<p className="mt-4 text-sm text-gray-500">No payment has been recorded for this order.</p>}
      {refundPaymentId&&<div className="mt-4 rounded-lg bg-gray-50 p-4"><label className="text-sm font-medium">Refund reason<textarea value={refundReason} onChange={e=>setRefundReason(e.target.value)} className="mt-2 min-h-20 w-full rounded-lg border p-2 text-sm" placeholder="Explain why a refund is requested"/></label><p className="mt-2 text-xs text-gray-500">The Branch Manager will authorize this request at this workstation. The refund is simulated and will be processed immediately if approved.</p><div className="mt-3 flex justify-end gap-2"><button onClick={()=>setRefundPaymentId("")} className="rounded-lg border px-3 py-2 text-xs">Back</button><button onClick={()=>void submitRefund()} disabled={busy} className="rounded-lg bg-[#1F2937] px-3 py-2 text-xs text-white">Submit request</button></div></div>}
    </div></div>}

    {authorizationRefund&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><LockKeyhole size={18} className="text-gray-600"/><h2 className="text-lg font-semibold text-gray-900">Branch Manager authorization</h2></div><p className="mt-1 text-sm text-gray-500">Refund request · {authorizationRefund.orderNumber}</p></div><button onClick={()=>{setAuthorizationRefund(null);setManagerPassword("");}} aria-label="Close authorization" className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X/></button></div>
      {branchManager?<><div className="mt-5 rounded-lg bg-gray-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Branch Manager</p><p className="mt-1 font-semibold text-gray-900">{branchManager.name}</p><p className="text-sm text-gray-500">{user?.branchName} Branch</p></div>
      <label className="mt-4 block text-sm font-medium text-gray-700">Branch Manager password<input type="password" autoComplete="off" value={managerPassword} onChange={e=>setManagerPassword(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void decideRefund("APPROVED");}} placeholder="Enter password" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"/></label>
      <p className="mt-2 text-xs text-gray-500">The password is verified by the existing backend. It is not saved by the application.</p>
      <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>void decideRefund("REJECTED")} disabled={busy||!managerPassword.trim()} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">{busy?"Processing…":"Reject refund"}</button><button onClick={()=>void decideRefund("APPROVED")} disabled={busy||!managerPassword.trim()} className="rounded-lg bg-[#1F2937] px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50">{busy?"Processing…":"Approve refund"}</button></div></>:<div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">No Branch Manager contact is configured for {user?.branchName??"this branch"}. Add the manager's name and email to <code>branch-manager.config.ts</code> before reviewing refunds.</div>}
      <p className="mt-4 text-xs text-gray-400">Approval processes the simulated refund immediately. Rejection records the decision without processing the refund.</p>
    </div></div>}
  </div>;
}
