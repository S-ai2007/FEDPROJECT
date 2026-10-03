/* VoteSphere - single-file JavaScript application
   Combines the supplied data, authentication, admin and voter modules.
*/
const STORAGE_KEYS={
  USERS:"votesphere_users",SESSION:"votesphere_session",ELECTIONS:"votesphere_elections",
  CANDIDATES:"votesphere_candidates",VOTES:"votesphere_votes"
};

const seedData=()=>{
  if(!localStorage.getItem(STORAGE_KEYS.USERS)) localStorage.setItem(STORAGE_KEYS.USERS,JSON.stringify([
    {id:"u-admin",name:"System Administrator",username:"admin",password:"admin123",role:"admin",createdAt:"2026-01-10"},
    {id:"u-demo",name:"Demo Voter",username:"voter",password:"voter123",role:"user",createdAt:"2026-01-12"}
  ]));
  if(!localStorage.getItem(STORAGE_KEYS.ELECTIONS)) localStorage.setItem(STORAGE_KEYS.ELECTIONS,JSON.stringify([
    {id:"e-1",title:"Student Council Election 2026",date:"2026-09-30",status:"active",createdAt:"2026-09-20"}
  ]));
  if(!localStorage.getItem(STORAGE_KEYS.CANDIDATES)) localStorage.setItem(STORAGE_KEYS.CANDIDATES,JSON.stringify([
    {id:"c-1",electionId:"e-1",name:"Aarav Sharma",position:"President",symbol:"★"},
    {id:"c-2",electionId:"e-1",name:"Diya Reddy",position:"President",symbol:"◆"},
    {id:"c-3",electionId:"e-1",name:"Rahul Kumar",position:"President",symbol:"●"}
  ]));
  if(!localStorage.getItem(STORAGE_KEYS.VOTES)) localStorage.setItem(STORAGE_KEYS.VOTES,"[]");
};
const getData=key=>JSON.parse(localStorage.getItem(key)||"[]");
const saveData=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
const makeId=prefix=>`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const activeElection=()=>getData(STORAGE_KEYS.ELECTIONS).find(e=>e.status==="active");
const candidatesFor=id=>getData(STORAGE_KEYS.CANDIDATES).filter(c=>c.electionId===id);
const votesFor=id=>getData(STORAGE_KEYS.VOTES).filter(v=>v.electionId===id);

function getSession(){return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSION)||"null")}
function setSession(user){localStorage.setItem(STORAGE_KEYS.SESSION,JSON.stringify({id:user.id,name:user.name,username:user.username,role:user.role}))}
function clearSession(){localStorage.removeItem(STORAGE_KEYS.SESSION)}
function currentUser(){const s=getSession();return s?getData(STORAGE_KEYS.USERS).find(u=>u.id===s.id)||null:null}
function toast(message,type=""){const el=document.getElementById("toast");if(!el)return;el.textContent=message;el.className=`toast show ${type}`;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.className="toast",2800)}
function logout(){clearSession();location.reload()}
function hideAll(){["authPage","adminPage","userPage"].forEach(id=>document.getElementById(id).classList.add("hidden"))}
function show(id){hideAll();document.getElementById(id).classList.remove("hidden")}

function setupAuth(){
  const tabs=document.querySelectorAll("[data-auth-tab]"),login=document.getElementById("loginForm"),signup=document.getElementById("signupForm");
  const showTab=name=>{tabs.forEach(t=>t.classList.toggle("active",t.dataset.authTab===name));login.classList.toggle("hidden",name!=="login");signup.classList.toggle("hidden",name!=="signup")};
  tabs.forEach(t=>t.addEventListener("click",()=>showTab(t.dataset.authTab)));
  document.querySelectorAll(".password-toggle").forEach(btn=>btn.addEventListener("click",()=>{const input=document.getElementById(btn.dataset.target);input.type=input.type==="password"?"text":"password";btn.textContent=input.type==="password"?"Show":"Hide"}));
  login.addEventListener("submit",e=>{e.preventDefault();const username=document.getElementById("loginUsername").value.trim(),password=document.getElementById("loginPassword").value,user=getData(STORAGE_KEYS.USERS).find(u=>u.username.toLowerCase()===username.toLowerCase()&&u.password===password);if(!user){toast("Invalid username or password.","error");return}setSession(user);route()});
  signup.addEventListener("submit",e=>{e.preventDefault();const name=document.getElementById("signupName").value.trim(),username=document.getElementById("signupUsername").value.trim(),password=document.getElementById("signupPassword").value,confirm=document.getElementById("signupConfirm").value,users=getData(STORAGE_KEYS.USERS);if(password!==confirm){toast("Passwords do not match.","error");return}if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())){toast("Username already exists.","error");return}const user={id:makeId("u"),name,username,password,role:"user",createdAt:new Date().toISOString().slice(0,10)};users.push(user);saveData(STORAGE_KEYS.USERS,users);setSession(user);route()});
  document.getElementById("authLogoutBtn").onclick=logout;
}

function route(){
  const user=currentUser();
  if(!user){show("authPage");return}
  if(user.role==="admin"){show("adminPage");initAdmin(user)}
  else {show("userPage");initUser(user)}
}

function initAdmin(user){
  document.getElementById("adminName").textContent=`Admin · ${user.name}`;
  document.getElementById("adminLogoutBtn").onclick=logout;
  const sections=document.querySelectorAll("#adminPage .dash-section"),links=document.querySelectorAll("#adminPage .side-link");
  const showSection=id=>{sections.forEach(s=>s.classList.toggle("active",s.id===id));links.forEach(l=>l.classList.toggle("active",l.dataset.section===id));renderAdmin()};
  links.forEach(l=>l.onclick=()=>showSection(l.dataset.section));
  document.querySelectorAll("#adminPage [data-jump]").forEach(b=>b.onclick=()=>showSection(b.dataset.jump));

  function renderAdmin(){renderStats();renderLive();renderElections();renderCandidates();renderVoters();renderResults()}
  function renderStats(){
    const users=getData(STORAGE_KEYS.USERS),elections=getData(STORAGE_KEYS.ELECTIONS),candidates=getData(STORAGE_KEYS.CANDIDATES),votes=getData(STORAGE_KEYS.VOTES);
    const count=users.filter(u=>u.role==="user").length,participation=count?Math.round(votes.length/count*100):0;
    document.getElementById("adminStats").innerHTML=[["♙","Registered voters",count],["▣","Total elections",elections.length],["♢","Candidates",candidates.length],["✓","Participation",`${Math.min(participation,100)}%`]].map(x=>`<div class="stat-card"><span class="stat-icon">${x[0]}</span><small>${x[1]}</small><strong>${x[2]}</strong></div>`).join("");
  }
  function renderLive(){
    const e=activeElection(),users=getData(STORAGE_KEYS.USERS).filter(u=>u.role==="user"),votes=e?votesFor(e.id):[];
    document.getElementById("adminLive").innerHTML=e?`<div class="metric-row"><b>${e.title}</b><span>${votes.length}/${users.length} votes</span></div><div class="live-meter"><div style="width:${users.length?Math.min(100,votes.length/users.length*100):0}%"></div></div><div class="metric-row"><span>Election date</span><b>${e.date}</b></div>`:`<div class="empty-state">No active election.</div>`;
  }
  function renderElections(){
    const list=document.getElementById("electionList"),es=getData(STORAGE_KEYS.ELECTIONS);
    list.innerHTML=es.length?es.map(e=>`<div class="election-item"><div><span class="tag ${e.status==="closed"?"closed":""}">${e.status.toUpperCase()}</span><h3>${e.title}</h3><p>Scheduled date: ${e.date}</p></div><div>${e.status==="active"?'<button class="btn btn-danger-outline close-election" data-id="'+e.id+'">Close election</button>':'<button class="btn btn-outline reopen-election" data-id="'+e.id+'">Set active</button>'}</div></div>`).join(""):`<div class="empty-state card">No elections created yet.</div>`;
    document.querySelectorAll("#adminPage .close-election").forEach(b=>b.onclick=()=>setElectionStatus(b.dataset.id,"closed"));
    document.querySelectorAll("#adminPage .reopen-election").forEach(b=>b.onclick=()=>setElectionStatus(b.dataset.id,"active"));
  }
  function setElectionStatus(id,status){const es=getData(STORAGE_KEYS.ELECTIONS);es.forEach(e=>{if(status==="active")e.status="closed";if(e.id===id)e.status=status});saveData(STORAGE_KEYS.ELECTIONS,es);toast(status==="active"?"Election activated.":"Election closed.");renderAdmin()}
  document.getElementById("electionForm").onsubmit=e=>{e.preventDefault();const es=getData(STORAGE_KEYS.ELECTIONS);es.forEach(x=>x.status="closed");es.push({id:makeId("e"),title:document.getElementById("electionTitle").value.trim(),date:document.getElementById("electionDate").value,status:"active",createdAt:new Date().toISOString().slice(0,10)});saveData(STORAGE_KEYS.ELECTIONS,es);e.target.reset();toast("Election created and activated.");renderAdmin()};
  function renderCandidates(){const e=activeElection(),list=document.getElementById("candidateList"),cs=e?candidatesFor(e.id):[];list.innerHTML=cs.length?cs.map(c=>`<div class="candidate-card"><div class="candidate-symbol">${c.symbol||"•"}</div><h3>${c.name}</h3><p>${c.position}</p></div>`).join(""):`<div class="empty-state card">Add candidates to the active election.</div>`}
  document.getElementById("candidateForm").onsubmit=e=>{e.preventDefault();const election=activeElection();if(!election){toast("Create an active election first.","error");return}const cs=getData(STORAGE_KEYS.CANDIDATES);cs.push({id:makeId("c"),electionId:election.id,name:document.getElementById("candidateName").value.trim(),position:document.getElementById("candidatePosition").value.trim(),symbol:document.getElementById("candidateSymbol").value.trim()||"•"});saveData(STORAGE_KEYS.CANDIDATES,cs);e.target.reset();toast("Candidate added.");renderAdmin()};
  function renderVoters(){const users=getData(STORAGE_KEYS.USERS).filter(u=>u.role==="user"),votes=getData(STORAGE_KEYS.VOTES);document.getElementById("voterTable").innerHTML=users.length?`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Registered</th><th>Status</th></tr></thead><tbody>${users.map(u=>`<tr><td><b>${u.name}</b></td><td>${u.username}</td><td>${u.createdAt}</td><td><span class="role-pill">${votes.some(v=>v.userId===u.id)?"VOTED":"NOT VOTED"}</span></td></tr>`).join("")}</tbody></table></div>`:`<div class="empty-state">No registered voters.</div>`}
  function renderResults(){const e=activeElection(),board=document.getElementById("resultBoard");if(!e){board.innerHTML='<div class="empty-state">No active election.</div>';return}const cs=candidatesFor(e.id),vs=votesFor(e.id),max=Math.max(1,...cs.map(c=>vs.filter(v=>v.candidateId===c.id).length));board.innerHTML=cs.length?cs.map((c,i)=>{const n=vs.filter(v=>v.candidateId===c.id).length;return `<div class="result-row"><div class="rank">${i+1}</div><div><div class="result-name">${c.name}<small>${c.position}</small></div><div class="result-track"><div style="width:${n/max*100}%"></div></div></div><div class="vote-count">${n} vote${n===1?"":"s"}</div></div>`}).join(""):'<div class="empty-state">No candidates yet.</div>'}
  document.getElementById("resetVotesBtn").onclick=()=>{if(confirm("Reset all demo votes? This cannot be undone.")){saveData(STORAGE_KEYS.VOTES,[]);toast("Demo votes reset.");renderAdmin()}};
  renderAdmin();
}

function initUser(user){
  document.getElementById("userName").textContent=user.name;
  document.getElementById("userLogoutBtn").onclick=logout;
  const sections=document.querySelectorAll("#userPage .dash-section"),links=document.querySelectorAll("#userPage .side-link");
  const showSection=id=>{sections.forEach(s=>s.classList.toggle("active",s.id===id));links.forEach(l=>l.classList.toggle("active",l.dataset.userSection===id));renderUser()};
  links.forEach(l=>l.onclick=()=>showSection(l.dataset.userSection));
  renderUser();

  function renderUser(){renderVote();renderStatus();renderResults()}
  function renderVote(){
    const e=activeElection(),hero=document.getElementById("electionHero"),area=document.getElementById("votingArea");
    if(!e){hero.innerHTML="";area.innerHTML='<div class="empty-state card">No active election.</div>';return}
    const existing=getData(STORAGE_KEYS.VOTES).find(v=>v.electionId===e.id&&v.userId===user.id),cs=candidatesFor(e.id);
    hero.innerHTML=`<div class="eyebrow" style="color:#dbe1f7">ACTIVE ELECTION</div><h2>${e.title}</h2><p>Election date: ${e.date}</p>`;
    if(existing){area.innerHTML='<div class="card panel"><div class="success-box"><strong>✓ Your vote has been recorded.</strong><span>You have already voted in this election.</span></div></div>';return}
    area.innerHTML=cs.length?`<div class="vote-grid">${cs.map(c=>`<label class="vote-card" data-candidate="${c.id}"><input type="radio" name="candidate" value="${c.id}"><div class="candidate-symbol">${c.symbol||"•"}</div><h3>${c.name}</h3><p>${c.position}</p><div class="vote-check">✓</div></label>`).join("")}</div><div class="vote-submit"><button class="btn btn-primary" id="submitVote">Submit ballot →</button></div>`:'<div class="empty-state card">No candidates have been added yet.</div>';
    document.querySelectorAll("#userPage .vote-card").forEach(card=>card.onclick=()=>{document.querySelectorAll("#userPage .vote-card").forEach(c=>c.classList.remove("selected"));card.classList.add("selected");card.querySelector("input").checked=true});
    const submit=document.getElementById("submitVote");
    if(submit)submit.onclick=()=>{const selected=document.querySelector('#userPage input[name="candidate"]:checked');if(!selected){toast("Select a candidate first.","error");return}openModal(selected.value)};
  }
  function renderStatus(){
    const e=activeElection(),card=document.getElementById("statusCard"),vote=e&&getData(STORAGE_KEYS.VOTES).find(v=>v.electionId===e.id&&v.userId===user.id);
    card.innerHTML=e?`<div class="card panel status-card">${vote?`<div class="success-box"><strong>✓ Vote submitted</strong><span>Your ballot for this election is recorded.</span></div><div class="status-detail"><div class="detail-box"><small>Election</small><b>${e.title}</b></div><div class="detail-box"><small>Status</small><b>VOTED</b></div></div>`:`<div class="success-box" style="background:#f8f9fc;border-color:#e7eaf0;color:var(--ink)"><strong>Not voted yet</strong><span>Your ballot is still available.</span></div>`}</div>`:'<div class="empty-state card">No active election.</div>';
  }
  function renderResults(){
    const e=activeElection(),board=document.getElementById("userResults");if(!e){board.innerHTML='<div class="empty-state">No active election.</div>';return}
    const cs=candidatesFor(e.id),vs=votesFor(e.id),max=Math.max(1,...cs.map(c=>vs.filter(v=>v.candidateId===c.id).length));
    board.innerHTML=cs.length?cs.map((c,i)=>{const n=vs.filter(v=>v.candidateId===c.id).length;return `<div class="result-row"><div class="rank">${i+1}</div><div><div class="result-name">${c.name}<small>${c.position}</small></div><div class="result-track"><div style="width:${n/max*100}%"></div></div></div><div class="vote-count">${n} vote${n===1?"":"s"}</div></div>`}).join(""):'<div class="empty-state">No candidates yet.</div>';
  }
  function openModal(candidateId){
    const modal=document.getElementById("confirmModal"),candidate=candidatesFor(activeElection().id).find(c=>c.id===candidateId);
    modal.dataset.candidate=candidateId;document.getElementById("confirmText").textContent=`You are about to vote for ${candidate.name}. This action cannot be undone.`;modal.classList.remove("hidden");
  }
  const closeModal=()=>document.getElementById("confirmModal").classList.add("hidden");
  document.getElementById("modalClose").onclick=closeModal;
  document.getElementById("cancelVote").onclick=closeModal;
  document.getElementById("confirmVote").onclick=()=>{
    const e=activeElection(),candidateId=document.getElementById("confirmModal").dataset.candidate,votes=getData(STORAGE_KEYS.VOTES);
    if(votes.some(v=>v.electionId===e.id&&v.userId===user.id)){closeModal();toast("You have already voted in this election.","error");renderUser();return}
    votes.push({id:makeId("v"),electionId:e.id,userId:user.id,candidateId,date:new Date().toISOString()});
    saveData(STORAGE_KEYS.VOTES,votes);closeModal();toast("Your vote has been recorded.");renderUser();
  };
}

seedData();
document.addEventListener("DOMContentLoaded",()=>{setupAuth();route()});
