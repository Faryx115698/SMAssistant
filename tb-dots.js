// tb-dots.js - Logic for TB-DOTS Program Management

const samplePatients = [
    {
        id: 1,
        code: "TB-2026-0001",
        name: "Rolando Rivera",
        age: 42,
        sex: "Male",
        category: "Category I (New)",
        phase: "Intensive",
        startDate: "Feb 10, 2026",
        weight: "58 kg",
        bhw: "BHW Elena Ramos",
        contact: "0917-889-1234",
        address: "Purok 3, Talimundoc",
        progressMonth: 3,
        totalMonths: 6,
        progressPercent: 68,
        status: "Active",
        intakes: [
            { date: "Oct 10, 2026", regimen: "FDC-4 (HRZE)", dose: "4 tabs", observedBy: "BHW Elena", adverse: "None", status: "Taken" },
            { date: "Oct 09, 2026", regimen: "FDC-4 (HRZE)", dose: "4 tabs", observedBy: "BHW Elena", adverse: "None", status: "Taken" },
            { date: "Oct 08, 2026", regimen: "FDC-4 (HRZE)", dose: "4 tabs", observedBy: "BHW Elena", adverse: "Mild nausea", status: "Taken" },
            { date: "Oct 07, 2026", regimen: "FDC-4 (HRZE)", dose: "4 tabs", observedBy: "BHW Elena", adverse: "None", status: "Taken" }
        ]
    },
    {
        id: 2,
        code: "TB-2026-0002",
        name: "Rosalinda Mendoza",
        age: 51,
        sex: "Female",
        category: "Category I (New)",
        phase: "Continuation",
        startDate: "Dec 05, 2025",
        weight: "52 kg",
        bhw: "BHW Teresa Gomez",
        contact: "0920-554-3211",
        address: "Purok 1, Talimundoc",
        progressMonth: 5,
        totalMonths: 6,
        progressPercent: 88,
        status: "Active",
        intakes: [
            { date: "Oct 10, 2026", regimen: "FDC-2 (HR)", dose: "2 tabs", observedBy: "BHW Teresa", adverse: "None", status: "Taken" },
            { date: "Oct 09, 2026", regimen: "FDC-2 (HR)", dose: "2 tabs", observedBy: "BHW Teresa", adverse: "None", status: "Taken" }
        ]
    },
    {
        id: 3,
        code: "TB-2026-0003",
        name: "Danilo Santos",
        age: 38,
        sex: "Male",
        category: "Category II (Relapse)",
        phase: "Intensive",
        startDate: "Mar 01, 2026",
        weight: "61 kg",
        bhw: "BHW Ricardo Lim",
        contact: "0918-223-4455",
        address: "Purok 4, Talimundoc",
        progressMonth: 2,
        totalMonths: 8,
        progressPercent: 30,
        status: "Active",
        intakes: [
            { date: "Oct 10, 2026", regimen: "FDC-4 + Strep", dose: "4 tabs + Inj", observedBy: "BHW Ricardo", adverse: "None", status: "Taken" }
        ]
    },
    {
        id: 4,
        code: "TB-2026-0004",
        name: "Eduardo Cruz",
        age: 29,
        sex: "Male",
        category: "Category I (New)",
        phase: "Completed",
        startDate: "Aug 15, 2025",
        weight: "64 kg",
        bhw: "BHW Elena Ramos",
        contact: "0919-445-6677",
        address: "Purok 2, Talimundoc",
        progressMonth: 6,
        totalMonths: 6,
        progressPercent: 100,
        status: "Cured",
        intakes: []
    }
];

const sampleLabs = [
    { date: "2026-10-05", name: "Rolando Rivera", type: "Smear Microscopy", timing: "Month 2 Follow-up", smear: "Negative (0 AFB)", genexpert: "MTB Detected", rif: "Resistance Not Detected", action: "Continue Intensive Regimen" },
    { date: "2026-09-28", name: "Rosalinda Mendoza", type: "Smear Microscopy", timing: "Month 4 Follow-up", smear: "Negative (0 AFB)", genexpert: "—", rif: "—", action: "On Track for Cure" },
    { date: "2026-09-15", name: "Danilo Santos", type: "GeneXpert MTB/RIF", timing: "Baseline Diagnostic", smear: "Positive (2+ AFB)", genexpert: "MTB Detected (High)", rif: "Resistance Not Detected", action: "Initiate Cat II Regimen" }
];

const sampleContacts = [
    { index: "Rolando Rivera", name: "Carmencita Rivera", rel: "Spouse", age: 40, symp: "None", xray: "Clear / Normal", tpt: "Enrolled in IPT" },
    { index: "Rolando Rivera", name: "Mark Rivera", rel: "Son", age: 14, symp: "None", xray: "Pending", tpt: "Scheduled for Screening" },
    { index: "Danilo Santos", name: "Gloria Santos", rel: "Mother", age: 67, symp: "Mild cough (Screened)", xray: "Clear", tpt: "Under observation" }
];

let currentPatient = samplePatients[0];

document.addEventListener("DOMContentLoaded", function () {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("intakeDate");
    if (dateInput) dateInput.value = today;

    const dateStr = document.getElementById("currentDateStr");
    if (dateStr) dateStr.textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    initTabs();
    renderPatients(samplePatients);
    selectPatient(samplePatients[0]);
    renderLabTable();
    renderContactsTable();
    renderMasterIntakes();
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

function renderPatients(list) {
    const container = document.getElementById("patientListContainer");
    if (!container) return;
    container.innerHTML = "";

    list.forEach(p => {
        const item = document.createElement("div");
        item.className = "tb-patient-item" + (currentPatient && currentPatient.id === p.id ? " selected" : "");
        item.onclick = () => selectPatient(p);

        const badgeClass = p.status === "Cured" ? "cured" : (p.phase === "Intensive" ? "intensive" : "active");

        item.innerHTML = `
            <strong>${p.name}</strong>
            <span>${p.code} • ${p.category}</span>
            <small class="badge ${badgeClass}">${p.phase} Phase (${p.progressPercent}%)</small>
        `;
        container.appendChild(item);
    });
}

function selectPatient(patient) {
    currentPatient = patient;
    document.querySelectorAll(".tb-patient-item").forEach(el => el.classList.remove("selected"));

    const el = document.getElementById("detailName");
    if (el) el.textContent = patient.name;
    document.getElementById("detailCode").textContent = patient.code;
    document.getElementById("detailCat").textContent = patient.category;
    document.getElementById("detailDemog").textContent = `${patient.age} yrs • ${patient.sex}`;
    document.getElementById("detailStart").textContent = patient.startDate;
    document.getElementById("detailWeight").textContent = patient.weight;
    document.getElementById("detailBhw").textContent = patient.bhw;
    document.getElementById("detailContact").textContent = `${patient.contact} (${patient.address})`;
    
    document.getElementById("detailProgressText").textContent = `Month ${patient.progressMonth} of ${patient.totalMonths} (${patient.progressPercent}% Complete)`;
    document.getElementById("detailProgressBar").style.width = `${patient.progressPercent}%`;

    const statusBadge = document.getElementById("detailStatus");
    statusBadge.textContent = patient.status;
    statusBadge.className = "badge " + (patient.status === "Cured" ? "cured" : "active");

    // Render detail intakes
    const tbody = document.getElementById("detailIntakeTable");
    tbody.innerHTML = "";
    if (!patient.intakes || patient.intakes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:18px;">No intake logs recorded yet.</td></tr>`;
    } else {
        patient.intakes.forEach(i => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><b>${i.date}</b></td>
                <td>${i.regimen}</td>
                <td>${i.dose}</td>
                <td>${i.observedBy}</td>
                <td>${i.adverse}</td>
                <td><span class="badge active">${i.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    renderPatients(samplePatients);
}

function filterPatients() {
    const q = document.getElementById("patientSearchInput").value.toLowerCase();
    const filtered = samplePatients.filter(p => 
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
    renderPatients(filtered);
}

function renderLabTable() {
    const tbody = document.getElementById("labTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    sampleLabs.forEach(l => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${l.date}</b></td>
            <td>${l.name}</td>
            <td>${l.type}</td>
            <td>${l.timing}</td>
            <td><span class="badge ${l.smear.includes('Negative') ? 'cured' : 'pending'}">${l.smear}</span></td>
            <td>${l.genexpert}</td>
            <td>${l.rif}</td>
            <td><b>${l.action}</b></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderContactsTable() {
    const tbody = document.getElementById("contactsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    sampleContacts.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${c.index}</b></td>
            <td>${c.name}</td>
            <td>${c.rel}</td>
            <td>${c.age}</td>
            <td>${c.symp}</td>
            <td>${c.xray}</td>
            <td><span class="badge ${c.tpt.includes('IPT') ? 'active' : 'intensive'}">${c.tpt}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMasterIntakes() {
    const tbody = document.getElementById("dailyIntakeMasterTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    samplePatients.filter(p => p.status === "Active").forEach(p => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${p.code}</b></td>
            <td>${p.name}</td>
            <td><span class="badge ${p.phase === 'Intensive' ? 'intensive' : 'active'}">${p.phase}</span></td>
            <td>FDC Tablets</td>
            <td>08:30 AM</td>
            <td>${p.bhw}</td>
            <td><span class="badge cured"><i class="fa-solid fa-check"></i> Observed</span></td>
        `;
        tbody.appendChild(tr);
    });
}

// Modal Handlers
function openEnrollModal() {
    document.getElementById("enrollModal").classList.add("active");
}
function closeEnrollModal() {
    document.getElementById("enrollModal").classList.remove("active");
}

function handleEnroll(e) {
    e.preventDefault();
    const name = document.getElementById("tbName").value;
    const age = document.getElementById("tbAge").value;
    const sex = document.getElementById("tbSex").value;
    const cat = document.getElementById("tbCat").value;
    const weight = document.getElementById("tbWeight").value + " kg";
    const bhw = document.getElementById("tbBhw").value;
    const address = document.getElementById("tbAddress").value;

    const newPatient = {
        id: samplePatients.length + 1,
        code: `TB-2026-000${samplePatients.length + 1}`,
        name,
        age: parseInt(age, 10),
        sex,
        category: cat,
        phase: "Intensive",
        startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        weight,
        bhw,
        contact: "0917-000-0000",
        address,
        progressMonth: 1,
        totalMonths: 6,
        progressPercent: 5,
        status: "Active",
        intakes: []
    };

    samplePatients.unshift(newPatient);
    selectPatient(newPatient);
    closeEnrollModal();
    alert(`Successfully enrolled patient: ${name}`);
}

function openIntakeModal() {
    if (!currentPatient) return;
    document.getElementById("intakePatientName").value = `${currentPatient.name} (${currentPatient.code})`;
    document.getElementById("intakeModal").classList.add("active");
}
function closeIntakeModal() {
    document.getElementById("intakeModal").classList.remove("active");
}

function handleIntake(e) {
    e.preventDefault();
    const date = document.getElementById("intakeDate").value;
    const regimen = document.getElementById("intakeRegimen").value;
    const supervisor = document.getElementById("intakeSupervisor").value;

    const newIntake = {
        date,
        regimen,
        dose: "Prescribed Dose",
        observedBy: supervisor,
        adverse: "None",
        status: "Taken"
    };

    if (currentPatient) {
        currentPatient.intakes.unshift(newIntake);
        selectPatient(currentPatient);
    }
    closeIntakeModal();
    alert("Directly observed intake logged successfully!");
}

function openLabModal() {
    const patientName = prompt("Enter Patient Name for Lab Test:", currentPatient ? currentPatient.name : "Rolando Rivera");
    if (!patientName) return;
    const testType = prompt("Test Type (Smear Microscopy / GeneXpert MTB):", "Smear Microscopy");
    const result = prompt("Result (e.g. Negative 0 AFB, or Positive 1+):", "Negative (0 AFB)");

    sampleLabs.unshift({
        date: new Date().toISOString().split("T")[0],
        name: patientName,
        type: testType,
        timing: "Follow-up",
        smear: result,
        genexpert: "—",
        rif: "—",
        action: "Logged by Health Worker"
    });
    renderLabTable();
    alert("Lab result recorded!");
}
