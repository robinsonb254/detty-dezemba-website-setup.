const prices = {Regular:1000, VIP:5000, VVIP:10000};
const quantities = {Regular:0, VIP:0, VVIP:0};
const money = n => "KSh " + n.toLocaleString("en-KE");
const totalEl = document.getElementById("total");
const countEl = document.getElementById("ticketCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const dialog = document.getElementById("checkoutDialog");
const toast = document.getElementById("toast");

function update(){
  let total=0, count=0;
  document.querySelectorAll(".ticket-row").forEach(row=>{
    const type=row.dataset.type;
    row.querySelector("output").textContent=quantities[type];
    total += quantities[type]*prices[type];
    count += quantities[type];
  });
  totalEl.textContent=money(total);
  countEl.textContent=`${count} ticket${count===1?"":"s"} selected`;
  checkoutBtn.disabled=count===0;
}
document.querySelectorAll(".ticket-row").forEach(row=>{
  const type=row.dataset.type;
  const [minus,plus]=row.querySelectorAll("button");
  minus.addEventListener("click",()=>{quantities[type]=Math.max(0,quantities[type]-1);update();});
  plus.addEventListener("click",()=>{quantities[type]=Math.min(10,quantities[type]+1);update();});
});
checkoutBtn.addEventListener("click",()=>{
  const lines=Object.entries(quantities).filter(([,q])=>q>0).map(([type,q])=>`${q} × ${type} — ${money(q*prices[type])}`);
  document.getElementById("orderSummary").innerHTML=lines.join("<br>")+`<hr><strong>Total: ${money(Object.entries(quantities).reduce((s,[t,q])=>s+q*prices[t],0))}</strong>`;
  dialog.showModal();
});
document.getElementById("requestSetup").addEventListener("click",()=>{
  const name=document.getElementById("buyerName").value.trim();
  const email=document.getElementById("buyerEmail").value.trim();
  const phone=document.getElementById("buyerPhone").value.trim();
  if(!name||!email||!phone){showToast("Please fill in your name, email and phone number.");return;}
  showToast("Preview only: payment gateway is not connected yet. No payment has been taken.");
});
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("nav").classList.toggle("open"));
document.querySelectorAll("#nav a").forEach(a=>a.addEventListener("click",()=>document.getElementById("nav").classList.remove("open")));
function showToast(msg){toast.textContent=msg;toast.style.display="block";setTimeout(()=>toast.style.display="none",4200);}
update();
