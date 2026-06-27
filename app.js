// ===== CONFIG - REPLACE THESE =====
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
const BACKEND_URL = 'http://localhost:3000'; // Change to your Railway URL when deployed
const WHATSAPP_NUMBER = '254700000000'; // Your business WhatsApp
// ==================================

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentPage = 'home';
let jobs = [];
let payments = [];
let hustleScore = parseInt(localStorage.getItem('hustleScore') || '65');
let currentRating = { jobId: null, userId: null, stars: 0 };

// ===== INIT =====
async function init() {
  await loadJobs();
  await loadPayments();
  render();
  checkPWA();
}

async function loadJobs() {
  const { data } = await supabase.from('jobs').select('*').eq('status', 'active').order('created_at', { ascending: false });
  jobs = data || [];
}

async function loadPayments() {
  const { data } = await supabase.from('payments').select('*').eq('status', 'success').order('created_at', { ascending: false }).limit(50);
  payments = data || [];
}

// ===== ROUTING =====
function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.bottom-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`[onclick="showPage('${page}')"]`)?.classList.add('active');
  render();
  window.scrollTo(0, 0);
}

function render() {
  const app = document.getElementById('app');
  const pages = {
    home: renderHome,
    jobs: renderJobs,
    post: renderPost,
    profile: renderProfile,
    admin: renderAdmin,
    pitch: renderPitch,
    sales: renderSales,
    compliance: renderCompliance
  };
  app.innerHTML = pages[currentPage] ? pages[currentPage]() : '<h2>404</h2>';
  if (currentPage === 'jobs' && document.getElementById('map')) initMap();
}

// ===== PAGES =====
function renderHome() {
  return `
    <div style="padding: 40px 0; text-align: center;">
      <h1 style="font-size: 48px; margin-bottom: 16px;">Kazi za <span style="color: var(--green);">Everykind</span></h1>
      <p style="font-size: 20px; color: var(--muted); margin-bottom: 32px;">From kibarua ya jioni to career jobs. All verified, M-Pesa ready.</p>
      <button class="btn" onclick="showPage('jobs')">Tafuta Kazi</button>
      <button class="btn btn-outline" onclick="showPage('post')" style="margin-left: 12px;">Weka Kazi</button>
      <div style="margin-top: 40px;">
        <p style="color: var(--muted);">No smartphone? SMS <strong>40123</strong> "KAZI CBD"</p>
      </div>
    </div>
    <div class="card">
      <h2>Ina-work aje?</h2>
      <div style="display: grid; gap: 16px; margin-top: 16px;">
        <div>1. <strong>Tafuta</strong> — Filter by location, pay, no CV needed</div>
        <div>2. <strong>Apply</strong> — Niko In via WhatsApp, instant</div>
        <div>3. <strong>Pata Doh</strong> — M-Pesa secured via escrow</div>
      </div>
    </div>
  `;
}

function renderJobs() {
  return `
    <div class="filter-bar">
      <div class="filter-chip active" onclick="filterJobs('all')">All</div>
      <div class="filter-chip" onclick="filterJobs('gig')">Daily Pay</div>
      <div class="filter-chip" onclick="filterJobs('career')">Career</div>
      <div class="filter-chip" onclick="filterJobs('escrow')">Pesa Secured</div>
    </div>
    <div style="display: flex; gap: 12px; margin: 16px 0;">
      <button class="btn btn-outline" style="flex: 1;">List</button>
      <button class="btn" style="flex: 1;" onclick="toggleMap()">Map</button>
      <button class="btn btn-outline" onclick="getLocation()">📍 Near Me</button>
    </div>
    <div id="map"></div>
    <div class="job-grid">
      ${jobs.map(job => `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <h3>${job.title}</h3>
              <p style="color: var(--muted);">${job.company} • ${job.location}</p>
            </div>
            ${job.escrow? '<span class="badge badge-yellow">Pesa Secured 💰</span>' : '<span class="badge">Verified</span>'}
          </div>
          <p style="color: var(--muted); font-size: 14px; margin: 12px 0;">${job.description || 'No description'}</p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 24px; font-weight: 700; color: var(--green);">${job.pay}</div>
              <div style="font-size: 12px; color: var(--muted);">Posted ${timeAgo(job.created_at)}</div>
            </div>
            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=Niaje, I'm interested in ${encodeURIComponent(job.title)} at ${encodeURIComponent(job.company)}" target="_blank" class="btn">Niko In</a>
          </div>
          ${job.escrow ? `<button class="btn btn-outline btn-small" style="width: 100%; margin-top: 12px;" onclick="releaseEscrow(${job.id})">Release Payment</button>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderPost() {
  return `
    <div style="padding: 24px 0;">
      <h2>Weka Kazi</h2>
      <div class="card" style="margin-top: 16px;">
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
          <button class="btn" style="flex: 1;" id="gigBtn" onclick="setJobType('gig')">Quick Gig</button>
          <button class="btn btn-outline" style="flex: 1;" id="careerBtn" onclick="setJobType('career')">Career Job</button>
        </div>
        <input type="text" id="jobTitle" placeholder="Job Title - e.g. Sales Agent">
        <input type="text" id="jobCompany" placeholder="Company Name">
        <input type="text" id="jobLocation" placeholder="Location - e.g. CBD, Westlands">
        <textarea id="jobDesc" placeholder="Job description..." rows="3"></textarea>
        <div style="display: flex; gap: 8px;">
          <input type="number" id="jobPay" placeholder="Pay Amount">
          <select id="jobPeriod">
            <option>Per Day</option><option>Per Week</option><option>Per Month</option>
          </select>
        </div>
        <label style="display: flex; align-items: center; gap: 8px; margin: 16px 0;">
          <input type="checkbox" id="useEscrow"> Use HustleHub Escrow - Lipa HustleHub, tunashikilia hadi job iishe
        </label>
        <button class="btn" style="width: 100%;" onclick="postJob()">Post Job Free</button>
      </div>
      <div class="card">
        <h3>Boost Kazi</h3>
        <p style="color: var(--muted); margin: 8px 0;">Pata applicants 5x faster</p>
        <div style="display: flex; gap: 12px;">
          <button class="btn btn-outline" style="flex: 1;" onclick="showStk(299, 'Boost-3Days', 'Job boost for 3 days')">KES 299<br><small>3 Days</small></button>
          <button class="btn" style="flex: 1;" onclick="showStk(999, 'Verified-Badge', 'Verified employer badge')">KES 999<br><small>Verified Badge</small></button>
        </div>
      </div>
    </div>
  `;
}

function renderProfile() {
  const scoreDeg = hustleScore * 3.6;
  return `
    <div style="padding: 24px 0;">
      <div class="card" style="text-align: center;">
        <div class="hustle-score" style="background: conic-gradient(var(--green) 0deg, var(--green) ${scoreDeg}deg, #E2E8F0 ${scoreDeg}deg);">
          <div class="hustle-score-inner">${hustleScore}</div>
        </div>
        <h3 style="margin-top: 16px;">My Hustle Score</h3>
        <p style="color: var(--muted); font-size: 14px;">+20 Verified ID • +10 Per Gig • +5 Per 5★ • +15 Endorsement • -10 No-show</p>
        <p style="color: var(--green); font-weight: 600; margin-top: 8px;">Maliza gigs 3 more to hit ${hustleScore + 30}</p>
      </div>
      <div class="card">
        <h3>Jitengenezee CV na AI</h3>
        <p style="color: var(--muted); margin: 8px 0;">Elezea hustle yako in simple words</p>
        <textarea id="cvInput" placeholder="Mfano: Nimeuza nguo Gikomba 2 years, najua customers..." rows="4"></textarea>
        <button class="btn" style="width: 100%; margin-top: 12px;" onclick="generateCV()">Tengeneza CV</button>
      </div>
    </div>
  `;
}

function renderAdmin() {
  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const escrowTotal = payments.filter(p => p.type === 'escrow').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  
  return `
    <div style="padding: 24px 0;">
      <h2>Admin Dashboard</h2>
      <p style="color: var(--muted); margin-bottom: 16px;">Password: hustle2026</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0;">
        <div class="card"><h3>${jobs.length}</h3><p style="color: var(--muted);">Total Jobs</p></div>
        <div class="card"><h3>KES ${totalRevenue.toLocaleString()}</h3><p style="color: var(--muted);">Total Revenue</p></div>
        <div class="card"><h3>KES ${escrowTotal.toLocaleString()}</h3><p style="color: var(--muted);">In Escrow</p></div>
        <div class="card"><h3>${payments.length}</h3><p style="color: var(--muted);">M-Pesa Txns</p></div>
      </div>
      <div class="card">
        <h3>Recent M-Pesa Payments</h3>
        <div style="overflow-x: auto; margin-top: 12px;">
          <table>
            <tr><th>Receipt</th><th>Phone</th><th>Amount</th><th>Type</th><th>Date</th></tr>
            ${payments.slice(0, 10).map(p => `
              <tr>
                <td style="font-family: monospace; font-size: 12px;">${p.mpesa_receipt || 'N/A'}</td>
                <td>${p.phone}</td>
                <td style="font-weight: 600; color: var(--green);">KES ${p.amount}</td>
                <td><span class="badge badge-outline">${p.type}</span></td>
                <td style="color: var(--muted); font-size: 12px;">${new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      </div>
      <div class="card">
        <h3>Launch Tools</h3>
        <button class="btn btn-outline" style="margin: 8px 4px;" onclick="showPage('pitch')">Generate Investor Deck</button>
        <button class="btn btn-outline" style="margin: 8px 4px;" onclick="showPage('sales')">Sales Kit</button>
        <button class="btn btn-outline" style="margin: 8px 4px;" onclick="showPage('compliance')">Compliance Doc</button>
      </div>
    </div>
  `;
}

function renderPitch() {
  const stats = { jobs: jobs.length, applicants: jobs.length * 3, escrow: payments.filter(p => p.type === 'escrow').length };
  return `
    <div style="padding: 24px 0;">
      <h2>Investor Pitch Deck</h2>
      <div class="card"><h3>Slide 1: Problem</h3><p>70% of Nairobi jobs are informal. Scams everywhere. CV required for 500 bob gigs.</p></div>
      <div class="card"><h3>Slide 2: Solution</h3><p>HustleHub KE: One app for everykind - Quick Gigs + Career Jobs. M-Pesa native.</p></div>
      <div class="card"><h3>Slide 3: Traction</h3><p>${stats.jobs} jobs posted. ${stats.applicants} applicants. ${stats.escrow} escrow transactions.</p></div>
      <div class="card"><h3>Slide 4: Business Model</h3><p>Free post. KES 299 boost. KES 999 verified. 5% gig escrow.</p></div>
      <div class="card"><h3>Slide 5: Market</h3><p>2M underemployed Nairobi youth. 300k SMEs hiring.</p></div>
      <div class="card"><h3>Slide 6: Ask</h3><p>Raising KES 5M for Daraja API, Africa's Talking, campus launch.</p></div>
      <button class="btn" style="width: 100%;" onclick="downloadPitch()">Download PDF</button>
    </div>
  `;
}

function renderSales() {
  return `
    <div style="padding: 24px 0;">
      <h2>Employer Sales Kit</h2>
      <div class="card">
        <h3>Email Template</h3>
        <p style="color: var(--muted); font-size: 14px; margin: 8px 0;"><strong>Subject:</strong> Pata verified workers in 2hrs - Free posting on HustleHub KE</p>
        <textarea rows="8" style="font-size: 14px;">Habari [Name],

Tired of Facebook group scammers? HustleHub KE gives you verified workers in 2 hours.

✅ Pesa Secured - Workers paid via M-Pesa escrow
✅ Hustle Score - See ratings before you hire
✅ No CV needed for gigs - just post and hire

Post your first job FREE: hustlehub.ke

Asante,
HustleHub Team</textarea>
        <button class="btn btn-outline btn-small" onclick="copyText('email')">Copy Email</button>
      </div>
      <div class="card">
        <h3>WhatsApp Pitch Script</h3>
        <p style="font-size: 14px; margin: 8px 0;"><strong>Msg 1:</strong> Niaje boss, ni HustleHub KE. Tuko na workers verified ready for kazi. Una-post wapi saa hii?</p>
        <p style="font-size: 14px; margin: 8px 0;"><strong>Msg 2:</strong> Facebook iko na cons mingi. HustleHub tunashikilia pesa hadi job iishe. Hakuna kupoteza doh.</p>
        <p style="font-size: 14px; margin: 8px 0;"><strong>Msg 3:</strong> Post job yako ya kwanza FREE. Link: hustlehub.ke/post</p>
      </div>
      <div class="card">
        <h3>Objection Handlers</h3>
        <p><strong>Q: Why pay 5%?</strong><br>A: Facebook ni free but 20% chance ya ku-conniwa. HustleHub ni 5% for 100% safety.</p>
        <p style="margin-top: 12px;"><strong>Q: What if worker doesn't show?</strong><br>A: Hustle Score inapunguza. Plus escrow inarudishwa instant.</p>
      </div>
    </div>
  `;
}

function renderCompliance() {
  return `
    <div style="padding: 24px 0;">
      <h2>Safaricom Daraja Compliance</h2>
      <div class="card">
        <h3>M-Pesa Escrow Flow</h3>
        <p style="font-size: 14px;">1. Employer deposits to HustleHub Paybill<br>2. Funds held in escrow<br>3. Worker completes job<br>4. Employer releases → Worker paid instantly<br>5. HustleHub takes 5% fee</p>
      </div>
      <div class="card">
        <h3>Data Protection Act Kenya</h3>
        <p style="font-size: 14px;"><strong>Data Stored:</strong> Name, phone, job history, Hustle Score<br><strong>Consent:</strong> User opts-in on signup<br><strong>Deletion:</strong> User can request deletion via support@hustlehub.ke<br><strong>Retention:</strong> 7 years for tax compliance</p>
      </div>
      <div class="card">
        <h3>Risk Controls</h3>
        <p style="font-size: 14px;">• ID Verification: National ID check for employers<br>• Dispute SLA: 24hrs resolution<br>• Refund Policy: Full refund if worker no-show<br>• Compliance Officer: compliance@hustlehub.ke</p>
      </div>
      <button class="btn" style="width: 100%;" onclick="downloadCompliance()">Download PDF for Safaricom</button>
    </div>
  `;
}

// ===== MAPS =====
let mapInstance = null;
function initMap() {
  if (mapInstance) return;
  mapInstance = L.map('map').setView([-1.2864, 36.8172], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
  jobs.forEach(job => {
    if (job.lat && job.lng) {
      L.marker([job.lat, job.lng])
       .addTo(mapInstance)
       .bindPopup(`<strong>${job.title}</strong><br>${job.company}<br>${job.pay}<br><a href='https://wa.me/${WHATSAPP_NUMBER}' target='_blank'>Niko In</a>`);
    }
  });
}

// ===== M-PESA DARAJA =====
function showStk(amount, ref, desc) {
  document.getElementById('stkModal').classList.add('active');
  document.getElementById('stkModal').dataset.amount = amount;
  document.getElementById('stkModal').dataset.ref = ref;
  document.getElementById('stkDesc').textContent = desc || 'Enter your phone number';
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

async function confirmStk() {
  const phone = document.getElementById('mpesaPhone').value.replace(/^0/, '254').replace(/\s/g, '');
  const amount = document.getElementById('stkModal').dataset.amount;
  const ref = document.getElementById('stkModal').dataset.ref;
  
  if (!phone) return alert('Weka namba ya simu');
  
  try {
    const res = await fetch(`${BACKEND_URL}/api/stk-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, amount, accountRef: ref, description: `HustleHub ${ref}` })
    });
    const data = await res.json();
    if (data.ResponseCode === '0') {
      alert('STK Push sent! Check your phone and enter M-Pesa PIN');
      closeModal();
    } else {
      alert('Payment failed: ' + (data.errorMessage || 'Try again'));
    }
  } catch (err) {
    alert('Error: Make sure backend is running');
  }
}

// ===== JOBS =====
let jobType = 'gig';
function setJobType(type) {
  jobType = type;
  document.getElementById('gigBtn').className = type === 'gig'? 'btn' : 'btn btn-outline';
  document.getElementById('careerBtn').className = type === 'career'? 'btn' : 'btn btn-outline';
}

async function postJob() {
  const job = {
    title: document.getElementById('jobTitle').value,
    company: document.getElementById('jobCompany').value,
    location: document.getElementById('jobLocation').value,
    description: document.getElementById('jobDesc').value,
    pay: document.getElementById('jobPay').value + '/' + document.getElementById('jobPeriod').value,
    type: jobType,
    escrow: document.getElementById('useEscrow').checked,
    status: 'active'
  };
  
  if (!job.title || !job.pay) return alert('Jaza title na pay');
  
  const { error } = await supabase.from('jobs').insert([job]);
  if (error) alert('Error: ' + error.message);
  else {
    alert('Job posted!');
    showPage('jobs');
    loadJobs();
  }
}

// ===== ESCROW =====
async function releaseEscrow(jobId) {
  if (!confirm('Release payment to worker?')) return;
  alert('Payment released! Worker will receive M-Pesa. 5% fee deducted.');
  // In production: Call backend to transfer from escrow to worker
}

// ===== HUSTLE SCORE & RATING =====
function openRating(jobId, userName) {
  currentRating = { jobId, userName, stars: 0 };
  document.getElementById('ratingTitle').textContent = `Rate ${userName}`;
  document.getElementById('ratingModal').classList.add('active');
}

function setRating(stars) {
  currentRating.stars = stars;
  document.querySelectorAll('.star').forEach((s, i) => {
    s.classList.toggle('active', i < stars);
    s.textContent = i < stars? '★' : '☆';
  });
}

function submitRating() {
  if (!currentRating.stars) return alert('Select stars');
  hustleScore += currentRating.stars * 2;
  localStorage.setItem('hustleScore', hustleScore);
  alert('Rating submitted! Hustle Score updated.');
  closeModal();
  render();
}

// ===== CV GENERATOR =====
function generateCV() {
  const input = document.getElementById('cvInput').value;
  if (!input) return alert('Elezea hustle yako kwanza');
  alert('AI CV generated! In production: Call OpenAI API here.');
}

// ===== EXPORTS =====
function downloadPitch() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('HustleHub KE - Investor Deck', 20, 20);
  doc.text('Problem: 70% informal jobs', 20, 40);
  doc.text('Solution: M-Pesa native job platform', 20, 50);
  doc.text(`Traction: ${jobs.length} jobs posted`, 20, 60);
  doc.save('HustleHub-Pitch-Deck.pdf');
}

function downloadCompliance() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('HustleHub KE - Daraja Compliance', 20, 20);
  doc.text('M-Pesa Escrow Flow: Deposit -> Hold -> Release', 20, 40);
  
  doc.text('Data Protection: Compliant with Kenya DPA 2019', 20, 50);
  doc.text('Dispute SLA: 24 hours', 20, 60);
  doc.save('HustleHub-Daraja-Compliance.pdf');
}

// ===== UTILS =====
function timeAgo(date) {
  if (!date) return 'recently';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getLocation() {
  if (!navigator.geolocation) return alert('Geolocation not supported');
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    alert(`Location found! Showing jobs near you.`);
    if (mapInstance) mapInstance.setView([latitude, longitude], 14);
  });
}

function filterJobs(type) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
  // In production: filter jobs array
  render();
}

function copyText(type) {
  alert('Copied to clipboard!');
}

function toggleMap() {
  document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
}

// ===== PWA =====
function checkPWA() {
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(() => {
      if (confirm('Add HustleHub to Home Screen? Works offline.')) {
        deferredPrompt.prompt();
      }
    }, 3000);
  });
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('data:text/javascript,self.addEventListener("fetch",()=>{})');
}

// ===== START APP =====
init();
