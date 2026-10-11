// feedback.js - Logic for Resident Messages, Inquiries & Patient Satisfaction

const sampleMessages = [
    {
        id: 1,
        sender: "Corazon Bautista",
        contact: "0917-234-9988",
        purok: "Purok 2",
        category: "Medicine Availability",
        subject: "Inquiry on Losartan 50mg supply",
        body: "Magandang araw po. May available stock po ba kayo ng maintenance medicine na Losartan 50mg at Amlodipine para sa senior citizen? Salamat po.",
        date: "Oct 10, 2026 • 10:15 AM",
        status: "Unread",
        badgeClass: "unread"
    },
    {
        id: 2,
        sender: "Jonathan Dela Rosa",
        contact: "0920-887-1234",
        purok: "Purok 4",
        category: "Immunization",
        subject: "Pentavalent vaccine schedule for baby",
        body: "Hello po BHW, ano po ang schedule ng bakuna ng 6 months baby ngayong October? Salamat po.",
        date: "Oct 10, 2026 • 09:40 AM",
        status: "Unread",
        badgeClass: "unread"
    },
    {
        id: 3,
        sender: "Marites Ramos",
        contact: "0918-334-5566",
        purok: "Purok 1",
        category: "Prenatal Schedule",
        subject: "Prenatal checkup request",
        body: "Available po ba si Dra. Cyron sa darating na Friday para sa 3rd trimester ultrasound review?",
        date: "Oct 09, 2026 • 03:20 PM",
        status: "Replied",
        badgeClass: "replied",
        reply: "Opo nanay Marites, available po si Dra. sa Biyernes mula 8:00 AM hanggang 12:00 PM. Nakalista na po ang inyong appointment."
    },
    {
        id: 4,
        sender: "Arthur Gonzales",
        contact: "0929-112-4433",
        purok: "Purok 3",
        category: "Animal Bite",
        subject: "Anti-rabies vaccine availability",
        body: "Nakalmot po ng pusa ang aking anak kaninang umaga. May available po ba tayong anti-tetanus or rabies vaccine sa center?",
        date: "Oct 08, 2026 • 01:10 PM",
        status: "Resolved",
        badgeClass: "resolved",
        reply: "Nahugasan na po ba ng sabon? Na-refer na po ang inyong anak sa Municipal Animal Bite Treatment Center sa Orani para sa complete post-exposure prophylaxis."
    }
];

const sampleSurveys = [
    {
        name: "Lourdes Manalili",
        purok: "Purok 3",
        stars: 5,
        category: "Consultation & Care Quality",
        comment: "Mabibilis at magagalang ang mga BHW at midwife. Maayos na naipaliwanag ang dosage ng gamot para sa ubo ng aking bunso.",
        date: "Oct 09, 2026"
    },
    {
        name: "Bernardo Silva",
        purok: "Purok 1",
        stars: 5,
        category: "Staff Courtesy",
        comment: "Very helpful po ang assistance sa pila ng senior citizens. Hindi kami pinatayo nang matagal.",
        date: "Oct 08, 2026"
    },
    {
        name: "Anonymous Patient",
        purok: "Purok 4",
        stars: 4,
        category: "Waiting Area",
        comment: "Maaliwalas at malinis ang center, baka puwede pong dagdagan ang electric fan sa bandang labas ng triage.",
        date: "Oct 06, 2026"
    }
];

const sampleSuggestions = [
    {
        title: "Extended Saturday Morning Clinic for Working Parents",
        submittedBy: "Purok 2 Homeowners",
        body: "Suggesting a once-a-month Saturday immunization window for parents who work in factories during weekdays.",
        date: "Oct 05, 2026",
        status: "Under Review by Barangay Captain & MHO"
    },
    {
        title: "SMS Reminder the Day Before Vaccination",
        submittedBy: "Maria Clara Santos",
        body: "Sana po mag-text ulit 1 day before the scheduled follow-up para maihanda ang baby book.",
        date: "Sep 28, 2026",
        status: "Implemented via SMAssistant SMS Module"
    }
];

document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    renderMessages();
    renderSurveys();
    renderSuggestions();
});

function initTabs() {
    const tabs = document.querySelectorAll(".record-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", function () {
            tabs.forEach(t => t.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            this.classList.add("active");
            const target = document.getElementById(this.getAttribute("data-tab"));
            if (target) target.classList.add("active");
        });
    });
}

function renderMessages() {
    const container = document.getElementById("messageList");
    if (!container) return;
    container.innerHTML = "";

    sampleMessages.forEach(m => {
        const item = document.createElement("div");
        item.className = "message-item" + (m.status === "Unread" ? " unread" : "");
        item.innerHTML = `
            <div style="flex:1;">
                <div class="msg-header">
                    <strong>${m.sender}</strong>
                    <span>• ${m.purok} (${m.contact})</span>
                    <span class="badge ${m.badgeClass}">${m.status}</span>
                </div>
                <div style="font-weight:600; font-size:13px; color:var(--navy); margin-bottom:4px;">${m.subject}</div>
                <div class="message-body">${m.body}</div>
                ${m.reply ? `<div style="background:#f1f5f9; padding:8px 12px; border-radius:6px; font-size:12px; color:#334155; margin-top:8px;"><b>Staff Reply:</b> ${m.reply}</div>` : ''}
                <div class="message-meta">
                    <span><i class="fa-solid fa-clock"></i> ${m.date}</span>
                    <span><i class="fa-solid fa-tag"></i> ${m.category}</span>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="openReplyModal('${m.sender}', '${m.contact}', '${m.body.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-reply"></i> Reply
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function renderSurveys() {
    const container = document.getElementById("surveyList");
    if (!container) return;
    container.innerHTML = "";

    sampleSurveys.forEach(s => {
        const starsStr = "★".repeat(s.stars) + "☆".repeat(5 - s.stars);
        const card = document.createElement("div");
        card.className = "survey-card";
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div>
                    <strong style="color:var(--navy); font-size:14px;">${s.name}</strong>
                    <span style="color:var(--muted); font-size:12px;"> • ${s.purok} (${s.category})</span>
                </div>
                <div class="survey-stars">${starsStr}</div>
            </div>
            <p style="font-size:13px; color:var(--text); line-height:1.4; margin-bottom:6px;">"${s.comment}"</p>
            <small style="color:var(--muted); font-size:11px;"><i class="fa-solid fa-calendar"></i> ${s.date}</small>
        `;
        container.appendChild(card);
    });
}

function renderSuggestions() {
    const container = document.getElementById("suggestionList");
    if (!container) return;
    container.innerHTML = "";

    sampleSuggestions.forEach(s => {
        const item = document.createElement("div");
        item.className = "message-item";
        item.innerHTML = `
            <div style="flex:1;">
                <div class="msg-header">
                    <strong>${s.title}</strong>
                    <span>• Submitted by ${s.submittedBy}</span>
                </div>
                <div class="message-body">${s.body}</div>
                <div class="message-meta">
                    <span><i class="fa-solid fa-clock"></i> ${s.date}</span>
                    <span class="badge resolved"><i class="fa-solid fa-circle-info"></i> ${s.status}</span>
                </div>
            </div>
        `;
        container.appendChild(item);
    });
}

// Modal Handlers
function openReplyModal(name, contact, origMsg) {
    document.getElementById("replyRecipient").value = name;
    document.getElementById("replyContact").value = contact || "09XX-XXX-XXXX";
    document.getElementById("replyOriginalMsg").textContent = origMsg || "(Outbound Announcement / Inquiry Response)";
    document.getElementById("replyText").value = "";
    document.getElementById("replyModal").classList.add("active");
}

function closeReplyModal() {
    document.getElementById("replyModal").classList.remove("active");
}

function handleSendReply(e) {
    e.preventDefault();
    const recipient = document.getElementById("replyRecipient").value;
    const reply = document.getElementById("replyText").value;

    const msg = sampleMessages.find(m => m.sender === recipient);
    if (msg) {
        msg.reply = reply;
        msg.status = "Replied";
        msg.badgeClass = "replied";
    }

    renderMessages();
    closeReplyModal();
    alert(`Response sent to ${recipient} via SMS successfully!`);
}

function handleFeedbackSubmit(e) {
    e.preventDefault();
    const name = document.getElementById("fbName").value;
    const purok = document.getElementById("fbPurok").value || "Purok 1";
    const category = document.getElementById("fbCategory").value;
    const rating = parseInt(document.getElementById("fbRating").value, 10);
    const details = document.getElementById("fbDetails").value;

    sampleSurveys.unshift({
        name,
        purok,
        stars: rating,
        category,
        comment: details,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    });

    renderSurveys();
    alert("Resident feedback logged successfully!");
    document.getElementById("feedbackForm").reset();

    // Switch to surveys tab
    document.querySelector("[data-tab='surveys']").click();
}
