// health-education.js - Logic for Health Education & Community Seminars

const sampleSeminars = [
    {
        id: 1,
        title: "Buntis Congress & Maternal Care Seminar",
        desc: "Essential prenatal care guidelines, warning signs during pregnancy, birth preparedness plan, and exclusive breastfeeding guidance.",
        date: "Oct 18, 2026",
        time: "08:30 AM - 11:30 AM",
        venue: "Barangay Multi-Purpose Hall",
        speaker: "Midwife Teresa Gomez, RM",
        target: "Pregnant Women & Partners",
        status: "Upcoming",
        badgeClass: "upcoming",
        attendees: 45
    },
    {
        id: 2,
        title: "4S Kontra Dengue & Environmental Sanitation Drive",
        desc: "Community assembly on eliminating stagnant water mosquito breeding sites, early fever consultation, and misting coordination.",
        date: "Oct 24, 2026",
        time: "09:00 AM - 12:00 PM",
        venue: "Purok 3 Covered Court",
        speaker: "Sanitary Inspector Marco Diaz",
        target: "Purok Leaders & Households",
        status: "Upcoming",
        badgeClass: "upcoming",
        attendees: 80
    },
    {
        id: 3,
        title: "Hypertension & Diabetes Wellness Forum",
        desc: "Free blood pressure checking, blood sugar screening, low-sodium cooking tips, and maintenance medicine compliance education.",
        date: "Nov 05, 2026",
        time: "08:00 AM - 11:00 AM",
        venue: "Talimundoc Health Center",
        speaker: "Dr. Cyron Mendoza, MD",
        target: "Senior Citizens & Hypertensive Patients",
        status: "Upcoming",
        badgeClass: "upcoming",
        attendees: 60
    },
    {
        id: 4,
        title: "Responsible Parenthood & Family Planning Forum",
        desc: "Informed choice lecture on modern family planning methods, reproductive health rights, and preconception counseling.",
        date: "Sep 22, 2026",
        time: "01:30 PM - 04:30 PM",
        venue: "Barangay Session Hall",
        speaker: "Nurse Carmela Santos, RN",
        target: "Couples of Reproductive Age",
        status: "Completed",
        badgeClass: "completed",
        attendees: 58
    },
    {
        id: 5,
        title: "Rabies Prevention & Responsible Pet Ownership",
        desc: "Animal bite first-aid precautions, anti-rabies vaccination importance, and barangay pet registration campaign.",
        date: "Sep 10, 2026",
        time: "09:00 AM - 11:00 AM",
        venue: "Purok 1 Community Center",
        speaker: "Municipal Veterinarian Officer",
        target: "Pet Owners & Barangay Residents",
        status: "Completed",
        badgeClass: "completed",
        attendees: 72
    }
];

const sampleAttendanceLogs = [
    { date: "Sep 22, 2026", title: "Responsible Parenthood & Family Planning", venue: "Barangay Session Hall", target: "Couples of Reproductive Age", count: 58, speaker: "Nurse Carmela Santos", rating: "4.9 ★" },
    { date: "Sep 10, 2026", title: "Rabies Prevention & Responsible Pet Ownership", venue: "Purok 1 Community Center", target: "Pet Owners", count: 72, speaker: "Municipal Vet Office", rating: "4.8 ★" },
    { date: "Aug 28, 2026", title: "Infant Nutrition & Complementary Feeding", venue: "Talimundoc Health Center", target: "Mothers with infants 6-24 mos", count: 42, speaker: "Barangay Nutrition Scholar", rating: "5.0 ★" },
    { date: "Aug 15, 2026", title: "Tuberculosis Awareness & Stigma Reduction", venue: "Purok 4 Plaza", target: "General Public", count: 65, speaker: "BHW Elena Ramos", rating: "4.9 ★" }
];

document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    const semDateInput = document.getElementById("semDate");
    if (semDateInput) semDateInput.value = today;

    initTabs();
    renderSeminars();
    renderAttendance();
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

function renderSeminars() {
    const container = document.getElementById("seminarGrid");
    if (!container) return;
    container.innerHTML = "";

    sampleSeminars.forEach(s => {
        const card = document.createElement("div");
        card.className = "seminar-card";
        card.innerHTML = `
            <div>
                <span class="seminar-badge ${s.badgeClass}">${s.status}</span>
                <h3>${s.title}</h3>
                <p>${s.desc}</p>
                <div class="seminar-meta">
                    <span><i class="fa-solid fa-calendar" style="color:var(--blue);"></i> ${s.date} • ${s.time}</span>
                    <span><i class="fa-solid fa-location-dot" style="color:var(--blue);"></i> ${s.venue}</span>
                    <span><i class="fa-solid fa-user-doctor" style="color:var(--blue);"></i> ${s.speaker}</span>
                    <span><i class="fa-solid fa-users" style="color:var(--blue);"></i> Target: ${s.target}</span>
                </div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <span style="font-size:12px; font-weight:600; color:var(--muted);">${s.attendees} Registered</span>
                <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="registerAttendee('${s.title}')">
                    <i class="fa-solid fa-user-plus"></i> Register Attendee
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderAttendance() {
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    sampleAttendanceLogs.forEach(l => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${l.date}</b></td>
            <td><b>${l.title}</b></td>
            <td>${l.venue}</td>
            <td>${l.target}</td>
            <td><b>${l.count} participants</b></td>
            <td>${l.speaker}</td>
            <td><span style="color:#d97706; font-weight:700;">${l.rating}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function registerAttendee(title) {
    const name = prompt(`Enter attendee name to register for "${title}":`);
    if (!name) return;
    const purok = prompt("Enter Purok (e.g. Purok 1, Purok 2):", "Purok 1");
    alert(`Successfully registered ${name} (${purok}) for "${title}"!`);
}

function openSeminarModal() {
    document.getElementById("seminarModal").classList.add("active");
}
function closeSeminarModal() {
    document.getElementById("seminarModal").classList.remove("active");
}

function handleScheduleSeminar(e) {
    e.preventDefault();
    const title = document.getElementById("semTitle").value;
    const desc = document.getElementById("semDesc").value;
    const date = document.getElementById("semDate").value;
    const time = document.getElementById("semTime").value;
    const venue = document.getElementById("semVenue").value;
    const speaker = document.getElementById("semSpeaker").value;

    const newSeminar = {
        id: sampleSeminars.length + 1,
        title,
        desc,
        date,
        time: time + " onwards",
        venue,
        speaker,
        target: "Barangay Residents",
        status: "Upcoming",
        badgeClass: "upcoming",
        attendees: 0
    };

    sampleSeminars.unshift(newSeminar);
    renderSeminars();
    closeSeminarModal();
    alert(`New health seminar "${title}" scheduled successfully!`);
}
