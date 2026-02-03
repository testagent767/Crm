const API_BASE = 'https://bjl82de9.rpcl.app/webhook/ai-crm-demo';

let view = "dashboard";
let selectedLead = null;
let allLeads = [];
let dashboardData = { weekly: {}, monthly: {} };

function icon(channel) {
  return channel === "instagram" ? "📸" : "💬";
}

async function fetchDashboard() {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboard: "dashboard" })
    });
    const data = await response.json();
    
    data.forEach(item => {
      if (item.time === "weekly") {
        dashboardData.weekly = item;
      } else if (item.time === "monthly") {
        dashboardData.monthly = item;
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
  }
}

async function fetchLeads() {
  try {
    const response = await fetch(API_BASE);
    allLeads = await response.json();
    renderLeads();
  } catch (error) {
    console.error('Error fetching leads:', error);
  }
}

async function fetchLeadDetails(leadId) {
  try {
    const response = await fetch(`${API_BASE}?lead_id=${leadId}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lead details:', error);
    return null;
  }
}

async function resetUnreadCount(leadId) {
  try {
    await fetch(API_BASE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        unread_count: 0
      })
    });
  } catch (error) {
    console.error('Error resetting unread count:', error);
  }
}

async function toggleAutomateResponse(leadId, automate) {
  try {
    await fetch(API_BASE, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        automate_response: automate
      })
    });
  } catch (error) {
    console.error('Error toggling automate:', error);
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  
  if (!text || !selectedLead) return;
  
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: selectedLead.lead_id,
        channel: selectedLead.first_channel,
        text: text,
        direction: "outbound"
      })
    });
    
    input.value = '';
    await selectLead(selectedLead);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function closeLead(leadId, closedBy, closedReason, closedMoney) {
  try {
    await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: leadId,
        closed_by: closedBy,
        closed_reason: closedReason,
        closed_money: parseFloat(closedMoney) || 0
      })
    });
  } catch (error) {
    console.error('Error closing lead:', error);
  }
}

function showDashboard() {
  view = "dashboard";
  document.getElementById("navDashboard").classList.add("active");
  document.getElementById("navLeads").classList.remove("active");
  render();
}

async function showLeads() {
  view = "leads";
  document.getElementById("navDashboard").classList.remove("active");
  document.getElementById("navLeads").classList.add("active");
  render();
}

function render() {
  const m = document.getElementById("mainView");
  if (view === "dashboard") {
    const w = dashboardData.weekly;
    const mon = dashboardData.monthly;
    m.innerHTML = `
      <div class="panel"><h3>This Week</h3>
        <div class="stats">
          <div class="stat"><b>${w.leads || 0}</b><br>Leads</div>
          <div class="stat"><b>${w.won || 0}</b><br>Won</div>
          <div class="stat"><b>${w.lost || 0}</b><br>Lost</div>
          <div class="stat"><b>₺${w.revenue || 0}</b><br>Revenue</div>
        </div>
      </div>
      <div class="panel"><h3>This Month</h3>
        <div class="stats">
          <div class="stat"><b>${mon.leads || 0}</b><br>Leads</div>
          <div class="stat"><b>${mon.won || 0}</b><br>Won</div>
          <div class="stat"><b>${mon.lost || 0}</b><br>Lost</div>
          <div class="stat"><b>₺${mon.revenue || 0}</b><br>Revenue</div>
        </div>
      </div>`;
  } else {
    m.innerHTML = `
      <div class="panel" id="leadDetails"><h3>Select a lead</h3></div>
      <div class="panel">
        <h3>Messages</h3>
        <div class="messages" id="messages"></div>
        <div class="chat-box">
          <textarea id="chatInput"></textarea>
          <button onclick="sendMessage()">➤</button>
        </div>
      </div>`;
  }
}

function renderLeads() {
  const activeDiv = document.getElementById("activeLeads");
  const closedDiv = document.getElementById("closedLeads");
  
  activeDiv.innerHTML = "";
  closedDiv.innerHTML = "";
  
  allLeads.forEach(lead => {
    const d = document.createElement("div");
    d.className = "lead";
    d.innerHTML = `
      ${icon(lead.first_channel)} ${lead.contact_key}
      <div class="badges">
        <span class="badge status">${lead.status}</span>
        <span class="badge score">${lead.lead_score}</span>
        ${lead.unread_count > 0 ? `<span class="badge unread">${lead.unread_count}</span>` : ""}
      </div>`;
    d.onclick = () => selectLead(lead);
    
    if (lead.is_closed === "" || lead.is_closed === null || lead.is_closed === undefined) {
      activeDiv.appendChild(d);
    } else {
      closedDiv.appendChild(d);
    }
  });
}

async function selectLead(lead) {
  selectedLead = lead;
  
  if (view !== "leads") {
    view = "leads";
    document.getElementById("navDashboard").classList.remove("active");
    document.getElementById("navLeads").classList.add("active");
    render();
  }
  
  await resetUnreadCount(lead.lead_id);
  
  const leadIndex = allLeads.findIndex(l => l.lead_id === lead.lead_id);
  if (leadIndex !== -1) {
    allLeads[leadIndex].unread_count = 0;
  }
  renderLeads();
  
  const details = await fetchLeadDetails(lead.lead_id);
  
  const leadDetailsDiv = document.getElementById("leadDetails");
  const isClosed = lead.is_closed !== "" && lead.is_closed !== null && lead.is_closed !== undefined;
  
  leadDetailsDiv.innerHTML = `
    <h3>${icon(lead.first_channel)} ${lead.contact_key}</h3>
    <p><b>Status:</b> ${lead.status}</p>
    <p><b>Stage:</b> ${lead.stage}</p>
    <button class="toggle" onclick="toggleAuto()">${lead.automate_response ? "🤖" : "✋"}</button>
    ${!isClosed ? `<button class="danger" onclick="showClose()">Mark Closed</button>` : `<b>Closed</b>`}
  `;
  
  const messagesDiv = document.getElementById("messages");
  messagesDiv.innerHTML = "";
  
  if (details && Array.isArray(details.messages) && details.messages.length > 0) {
    const sortedMessages = [...details.messages].sort((a, b) => {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    
    sortedMessages.forEach(msg => {
      const d = document.createElement("div");
      d.className = `msg ${msg.sender_type}`;
      d.textContent = msg.message_text;
      if (msg.sender_type === "ai") {
