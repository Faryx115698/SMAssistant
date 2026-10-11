// patient-registration.js - Client-Side Controller for Patient Registration & Records

let patientsList = [
    {
        id: 1,
        patient_code: "PT-2026-0001",
        first_name: "Juan",
        middle_name: "D.",
        last_name: "Dela Cruz",
        suffix: "",
        birth_date: "1992-05-12",
        age: 34,
        sex: "Male",
        civil_status: "Single",
        nationality: "Filipino",
        religion: "Catholic",
        occupation: "Self-Employed",
        contact_number: "0917 123 4567",
        telephone: "(047) 237-1234",
        email: "juan@example.com",
        address: "Labin St., Talimundoc, Orani, Bataan",
        status: "Active",
        lastConsultationDate: "May 10, 2026",
        lastConsultationType: "General Consultation",
        nextApptDate: "May 25, 2026",
        nextApptTime: "09:00 AM",
        programs: ["Hypertension Management"],
        allergies: "Penicillin",
        conditions: "Hypertension Stage 1",
        blood_type: "O+",
        height: "170",
        weight: "68",
        created_at: "2026-10-10T13:30:55.528899+00:00"
    },
    {
        id: 2,
        patient_code: "PR-2026-0002",
        first_name: "Maria",
        middle_name: "Clara",
        last_name: "Santos",
        suffix: "",
        birth_date: "1998-08-20",
        age: 28,
        sex: "Female",
        civil_status: "Single",
        nationality: "Filipino",
        religion: "Catholic",
        occupation: "Teacher",
        contact_number: "0918 234 5678",
        telephone: "",
        email: "maria@example.com",
        address: "Centro St., Talimundoc, Orani, Bataan",
        status: "Active",
        lastConsultationDate: "Jun 02, 2026",
        lastConsultationType: "Prenatal Check-up",
        nextApptDate: "Jul 15, 2026",
        nextApptTime: "10:30 AM",
        programs: ["Maternal Health Program"],
        allergies: "None",
        conditions: "None",
        blood_type: "A+",
        height: "160",
        weight: "54",
        created_at: "2026-10-10T13:30:55.528899+00:00"
    },
    {
        id: 3,
        patient_code: "PR-2026-0003",
        first_name: "Pedro",
        middle_name: "O.",
        last_name: "Penduko",
        suffix: "",
        birth_date: "1985-03-15",
        age: 41,
        sex: "Male",
        civil_status: "Married",
        nationality: "Filipino",
        religion: "Catholic",
        occupation: "Farmer",
        contact_number: "0919 345 6789",
        telephone: "",
        email: "pedro@example.com",
        address: "Poblacion, Orani, Bataan",
        status: "Active",
        lastConsultationDate: "Apr 18, 2026",
        lastConsultationType: "Routine Physical Exam",
        nextApptDate: "",
        nextApptTime: "",
        programs: [],
        allergies: "None",
        conditions: "None",
        blood_type: "B+",
        height: "168",
        weight: "65",
        created_at: "2026-09-15T10:00:00.000000+00:00"
    },
    {
        id: 4,
        patient_code: "PR-2026-0004",
        first_name: "Ana Marie",
        middle_name: "T.",
        last_name: "Reyes",
        suffix: "",
        birth_date: "2002-01-14",
        age: 24,
        sex: "Female",
        civil_status: "Single",
        nationality: "Filipino",
        religion: "Catholic",
        occupation: "Student",
        contact_number: "0920 456 7890",
        telephone: "",
        email: "ana.reyes@example.com",
        address: "Sitio Silangan, Orani, Bataan",
        status: "Pending",
        lastConsultationDate: "",
        lastConsultationType: "",
        nextApptDate: "",
        nextApptTime: "",
        programs: [],
        allergies: "None",
        conditions: "None",
        blood_type: "O+",
        height: "155",
        weight: "48",
        created_at: "2026-10-11T08:30:00.000000+00:00"
    },
    {
        id: 5,
        patient_code: "PR-2026-0005",
        first_name: "Roberto",
        middle_name: "G.",
        last_name: "Gonzales",
        suffix: "Sr.",
        birth_date: "1964-07-22",
        age: 62,
        sex: "Male",
        civil_status: "Married",
        nationality: "Filipino",
        religion: "Catholic",
        occupation: "Retired",
        contact_number: "0921 567 8901",
        telephone: "",
        email: "roberto@example.com",
        address: "Barangay Parang, Orani, Bataan",
        status: "Inactive",
        lastConsultationDate: "Feb 14, 2026",
        lastConsultationType: "Annual Health Assessment",
        nextApptDate: "",
        nextApptTime: "",
        programs: ["Senior Citizen Wellness"],
        allergies: "Aspirin",
        conditions: "Arthritis",
        blood_type: "A+",
        height: "165",
        weight: "70",
        created_at: "2026-08-01T14:15:00.000000+00:00"
    }
];

let selectedPatientId = 1;
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initEventListeners();
    updateCounterCards();
    fetchLivePatients();

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new_patient") === "1") {
        showNewPatientView();
    } else {
        const reqId = parseInt(urlParams.get("patient_id") || "1", 10);
        showSelectedPatientView(reqId);
    }
});

// Fetch live patients from Supabase if configured
async function fetchLivePatients() {
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        try {
            const { data, error } = await window.sb.from("patients").select("*").order("id", { ascending: true });
            if (!error && data && data.length > 0) {
                // Merge or update with Supabase data
                const map = {};
                patientsList.forEach(p => map[p.id] = p);
                data.forEach(dbP => {
                    const existing = map[dbP.id] || {};
                    map[dbP.id] = {
                        ...existing,
                        id: dbP.id,
                        patient_code: dbP.patient_code || `PR-2026-${String(dbP.id).padStart(4, "0")}`,
                        first_name: dbP.first_name,
                        middle_name: dbP.middle_name || "",
                        last_name: dbP.last_name,
                        suffix: dbP.suffix || "",
                        birth_date: dbP.birth_date || existing.birth_date || "",
                        age: dbP.birth_date ? calculateAge(dbP.birth_date) : (existing.age || 30),
                        sex: dbP.sex || existing.sex || "Male",
                        civil_status: dbP.civil_status || existing.civil_status || "Single",
                        nationality: dbP.nationality || existing.nationality || "Filipino",
                        religion: dbP.religion || existing.religion || "Catholic",
                        occupation: dbP.occupation || existing.occupation || "",
                        contact_number: dbP.contact_number || existing.contact_number || "",
                        telephone: dbP.telephone || existing.telephone || "",
                        email: dbP.email || existing.email || "",
                        address: dbP.address || existing.address || "",
                        status: dbP.status || "Active",
                        created_at: dbP.created_at || existing.created_at || ""
                    };
                });
                patientsList = Object.values(map);
                applyFilters();
                if (selectedPatientId) {
                    populatePatientData(selectedPatientId);
                }
            }
        } catch (e) {
            console.warn("Using local patient list:", e);
        }
    }
    updateCounterCards();
    applyFilters();
}

function calculateAge(birthDateStr) {
    if (!birthDateStr) return "";
    const dob = new Date(birthDateStr);
    const diff = Date.now() - dob.getTime();
    const ageDt = new Date(diff);
    return Math.abs(ageDt.getUTCFullYear() - 1970);
}

// State View Changers
function showNewPatientView() {
    const selectedView = document.getElementById("selectedPatientView");
    const newView = document.getElementById("newPatientView");
    const noPatientView = document.getElementById("noPatientView");

    if (selectedView) selectedView.style.display = "none";
    if (noPatientView) noPatientView.style.display = "none";
    if (newView) {
        newView.style.display = "block";
        newView.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Unselect patient cards in sidebar
    document.querySelectorAll(".patient-card").forEach(c => c.classList.remove("selected"));
}

function showSelectedPatientView(patientId) {
    const selectedView = document.getElementById("selectedPatientView");
    const newView = document.getElementById("newPatientView");
    const noPatientView = document.getElementById("noPatientView");

    if (newView) newView.style.display = "none";
    if (noPatientView) noPatientView.style.display = "none";
    if (selectedView) selectedView.style.display = "contents";

    selectPatient(patientId);
}

function showNoPatientView() {
    const selectedView = document.getElementById("selectedPatientView");
    const newView = document.getElementById("newPatientView");
    const noPatientView = document.getElementById("noPatientView");

    if (newView) newView.style.display = "none";
    if (selectedView) selectedView.style.display = "none";
    if (noPatientView) noPatientView.style.display = "block";
}

// Select a patient and fill in all fields
function selectPatient(patientId) {
    selectedPatientId = patientId;
    const patient = patientsList.find(p => p.id === patientId) || patientsList[0];
    if (!patient) {
        showNoPatientView();
        return;
    }

    // Update list selection highlight
    document.querySelectorAll(".patient-card").forEach(c => {
        const id = parseInt(c.getAttribute("data-patient-id"), 10);
        if (id === patient.id) {
            c.classList.add("selected");
        } else {
            c.classList.remove("selected");
        }
    });

    populatePatientData(patient.id);

    // Make sure Personal Information tab is active
    const personalTabBtn = document.querySelector('.tab-button[data-tab="personal"]');
    if (personalTabBtn && !personalTabBtn.classList.contains("active")) {
        personalTabBtn.click();
    }
}

function populatePatientData(patientId) {
    const patient = patientsList.find(p => p.id === patientId);
    if (!patient) return;

    const fullName = `${patient.first_name} ${patient.middle_name ? patient.middle_name + ' ' : ''}${patient.last_name}${patient.suffix ? ' ' + patient.suffix : ''}`.trim();

    // 1. Header Elements
    const hName = document.getElementById("headerPatientName");
    if (hName) hName.textContent = fullName;

    const hCode = document.getElementById("headerPatientId");
    if (hCode) hCode.textContent = patient.patient_code || `PT-2026-${String(patient.id).padStart(4, "0")}`;

    const hBadge = document.getElementById("headerStatusBadge");
    if (hBadge) {
        hBadge.textContent = patient.status || "Active";
        hBadge.className = `status ${patient.status === 'Active' ? 'active' : ''}`;
    }

    const hAgeMeta = document.getElementById("headerAgeMeta");
    if (hAgeMeta) hAgeMeta.innerHTML = `<i class="fa-solid fa-cake-candles"></i> ${patient.age || calculateAge(patient.birth_date)} years old`;

    const hDobMeta = document.getElementById("headerDobMeta");
    if (hDobMeta) hDobMeta.innerHTML = `<i class="fa-regular fa-calendar"></i> ${formatDate(patient.birth_date)}`;

    const hSexMeta = document.getElementById("headerSexMeta");
    if (hSexMeta) hSexMeta.innerHTML = `<i class="fa-solid fa-venus-mars"></i> ${patient.sex || 'Male'}`;

    const hPhoneMeta = document.getElementById("headerPhoneMeta");
    if (hPhoneMeta) hPhoneMeta.innerHTML = `<i class="fa-solid fa-phone"></i> ${patient.contact_number || '--'}`;

    const hAddrMeta = document.getElementById("headerAddressMeta");
    if (hAddrMeta) hAddrMeta.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${patient.address || 'Barangay Talimundoc, Orani, Bataan'}`;

    // 2. Personal Information Form Inputs
    setVal("pFirstName", patient.first_name);
    setVal("pMiddleName", patient.middle_name);
    setVal("pLastName", patient.last_name);
    setVal("pSuffix", patient.suffix);
    setVal("pBirthDate", patient.birth_date);
    setVal("pAge", patient.age || calculateAge(patient.birth_date));
    setVal("pSex", patient.sex);
    setVal("pCivilStatus", patient.civil_status);
    setVal("pNationality", patient.nationality || "Filipino");
    setVal("pReligion", patient.religion || "Catholic");
    setVal("pOccupation", patient.occupation);
    setVal("pMobile", patient.contact_number);
    setVal("pTelephone", patient.telephone);
    setVal("pEmail", patient.email);
    setVal("pAddress", patient.address);

    // 3. Quick Summary Area
    const sLastDate = document.getElementById("summaryLastConsultDate");
    const sLastType = document.getElementById("summaryLastConsultType");
    if (sLastDate && sLastType) {
        if (patient.lastConsultationDate) {
            sLastDate.textContent = patient.lastConsultationDate;
            sLastType.textContent = patient.lastConsultationType || "General Consultation";
            sLastDate.style.display = "block";
            sLastType.style.display = "block";
            const noCons = document.getElementById("summaryNoConsultation");
            if (noCons) noCons.style.display = "none";
        } else {
            sLastDate.style.display = "none";
            sLastType.style.display = "none";
            const noCons = document.getElementById("summaryNoConsultation");
            if (noCons) noCons.style.display = "block";
        }
    }

    const sNextAppt = document.getElementById("summaryNextAppt");
    if (sNextAppt) {
        if (patient.nextApptDate) {
            sNextAppt.innerHTML = `<strong>${patient.nextApptDate}</strong> ${patient.nextApptTime ? '• ' + patient.nextApptTime : ''}`;
        } else {
            sNextAppt.textContent = "No upcoming appointment.";
        }
    }

    const sPrograms = document.getElementById("summaryPrograms");
    if (sPrograms) {
        if (patient.programs && patient.programs.length > 0) {
            sPrograms.innerHTML = patient.programs.map(pr => `<li>${pr}</li>`).join("");
        } else {
            sPrograms.innerHTML = "<p>None recorded.</p>";
        }
    }

    const sAllergies = document.getElementById("summaryAllergies");
    if (sAllergies) {
        sAllergies.textContent = patient.allergies || "None recorded.";
    }

    const sConditions = document.getElementById("summaryConditions");
    if (sConditions) {
        sConditions.textContent = patient.conditions || "None recorded.";
    }
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
}

function formatDate(dateStr) {
    if (!dateStr) return "--";
    try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
    } catch (e) {}
    return dateStr;
}

// Render Patient List in Sidebar
function renderPatientList(list) {
    const container = document.querySelector(".patient-list");
    if (!container) return;
    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="patient-list-empty">
                <i class="fa-solid fa-magnifying-glass"></i>
                <p>No patients found</p>
                <small>Try a different name or ID</small>
            </div>
        `;
        const footer = document.querySelector(".patient-list-footer");
        if (footer) footer.textContent = "Showing 0 patients";
        return;
    }

    list.forEach(p => {
        const card = document.createElement("a");
        card.className = "patient-card" + (p.id === selectedPatientId ? " selected" : "");
        card.setAttribute("data-patient-id", p.id);
        card.href = `patient-registration.html?patient_id=${p.id}`;
        card.onclick = function (e) {
            e.preventDefault();
            showSelectedPatientView(p.id);
        };

        const fullName = `${p.first_name} ${p.middle_name ? p.middle_name + ' ' : ''}${p.last_name}`.trim();
        const age = p.age || calculateAge(p.birth_date) || "30";
        const initials = `${p.first_name ? p.first_name[0] : ''}${p.last_name ? p.last_name[0] : ''}`.toUpperCase() || 'P';
        const st = p.status || 'Active';
        const stLower = st.toLowerCase();
        const badgeClass = stLower === 'active' ? 'status-active' : (stLower === 'pending' ? 'status-pending' : 'status-inactive');

        card.innerHTML = `
            <div class="patient-card-avatar">${initials}</div>
            <div class="patient-card-body">
                <div class="patient-card-header">
                    <strong title="${fullName}">${fullName}</strong>
                    <span class="patient-card-id">${p.patient_code || `PR-2026-${String(p.id).padStart(4, "0")}`}</span>
                </div>
                <div class="patient-card-details">
                    <span>${age} yrs old • ${p.sex || 'Male'}</span>
                    <span class="status-badge ${badgeClass}">${st}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    const footer = document.querySelector(".patient-list-footer");
    if (footer) {
        footer.textContent = `Showing ${list.length} patients`;
    }
}

// Event Listeners Initialization
function initEventListeners() {
    // 1. "New Patient" buttons
    const newPatientButtons = document.querySelectorAll(".new-patient-btn, #addPatientFromEmptyBtn, a[href*='new_patient=1']");
    newPatientButtons.forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            showNewPatientView();
        });
    });

    // 2. "Cancel" buttons in New Patient form
    const cancelNewBtns = document.querySelectorAll(".cancel-new-patient, #cancelNewPatientBtnTop, #cancelNewPatientBtnBottom");
    cancelNewBtns.forEach(btn => {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            showSelectedPatientView(selectedPatientId || 1);
        });
    });

    // 3. Date of birth changes -> auto-calculate age
    const pDob = document.getElementById("pBirthDate");
    if (pDob) {
        pDob.addEventListener("change", function () {
            const age = calculateAge(this.value);
            setVal("pAge", age);
        });
    }

    const newDob = document.querySelector("#newPatientForm input[name='birth_date']");
    if (newDob) {
        newDob.addEventListener("change", function () {
            const ageInput = document.querySelector("#newPatientForm input[name='age']");
            if (ageInput) ageInput.value = calculateAge(this.value);
        });
    }

    // 4. Personal Information Form Save
    const personalForm = document.getElementById("personalForm");
    if (personalForm) {
        personalForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            await handleSavePersonalForm();
        });
    }

    // 5. Personal Information Form Cancel (Reset)
    const cancelPersonalBtn = document.getElementById("cancelPersonalEditBtn");
    if (cancelPersonalBtn) {
        cancelPersonalBtn.addEventListener("click", function (e) {
            e.preventDefault();
            populatePatientData(selectedPatientId);
        });
    }

    // 6. New Patient Form Submit
    const newPatientForm = document.getElementById("newPatientForm");
    if (newPatientForm) {
        newPatientForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            await handleSaveNewPatientForm();
        });
    }

    // 7. Instant Search Filter
    const searchInput = document.querySelector(".patient-search input");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            applyFilters();
        });
    }

    // 8. Stat Cards Filtering
    initStatCardFilters();
}

// Animate numeric transition for stat counter cards
function animateCount(element, target) {
    if (!element) return;
    const current = parseInt(element.textContent, 10);
    if (isNaN(current)) {
        element.textContent = target;
        return;
    }
    if (current === target) {
        element.textContent = target;
        return;
    }
    const start = current;
    const duration = 350;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(start + (target - start) * ease);
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            element.textContent = target;
        }
    }
    requestAnimationFrame(step);
}

// Update the 5 Counter Cards dynamically based on active dataset
function updateCounterCards() {
    const totalEl = document.getElementById("statTotalPatients");
    const newMonthEl = document.getElementById("statNewThisMonth");
    const activeEl = document.getElementById("statActivePatients");
    const archiveEl = document.getElementById("statArchiveRecords");
    const pendingEl = document.getElementById("statPendingProfiles");

    const total = patientsList.length;

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const newThisMonth = patientsList.filter(p => {
        if (!p.created_at) return false;
        const d = new Date(p.created_at);
        return !isNaN(d.getTime()) && d.getMonth() === curMonth && d.getFullYear() === curYear;
    }).length;

    const active = patientsList.filter(p => (p.status || "").toLowerCase() === "active").length;
    const archived = patientsList.filter(p => {
        const s = (p.status || "").toLowerCase();
        return s === "inactive" || s === "archived" || s === "archive";
    }).length;
    const pending = patientsList.filter(p => {
        const s = (p.status || "").toLowerCase();
        return s === "pending" || s === "for verification";
    }).length;

    animateCount(totalEl, total);
    animateCount(newMonthEl, newThisMonth);
    animateCount(activeEl, active);
    animateCount(archiveEl, archived);
    animateCount(pendingEl, pending);
}

// Initialize Interactive Stat Card Filters
function initStatCardFilters() {
    const cards = document.querySelectorAll(".stats-grid .stat-card");
    cards.forEach(card => {
        card.addEventListener("click", function () {
            const filterType = this.getAttribute("data-filter") || "all";
            if (currentFilter === filterType && filterType !== "all") {
                currentFilter = "all";
            } else {
                currentFilter = filterType;
            }

            cards.forEach(c => {
                if (c.getAttribute("data-filter") === currentFilter && currentFilter !== "all") {
                    c.classList.add("active-filter");
                } else {
                    c.classList.remove("active-filter");
                }
            });

            applyFilters();
        });
    });
}

// Combined Search + Category Filter Handler
function applyFilters() {
    const searchInput = document.querySelector(".patient-search input");
    const q = (searchInput ? searchInput.value : "").toLowerCase().trim();

    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const filtered = patientsList.filter(p => {
        // 1. Text Search matching
        const fullName = `${p.first_name || ""} ${p.middle_name || ""} ${p.last_name || ""}`.toLowerCase();
        const code = (p.patient_code || "").toLowerCase();
        const phone = (p.contact_number || "").toLowerCase();
        const matchesSearch = !q || fullName.includes(q) || code.includes(q) || phone.includes(q);

        if (!matchesSearch) return false;

        // 2. Stat Card Category matching
        const status = (p.status || "").toLowerCase();
        if (currentFilter === "active") {
            return status === "active";
        } else if (currentFilter === "archived") {
            return status === "inactive" || status === "archived" || status === "archive";
        } else if (currentFilter === "pending") {
            return status === "pending" || status === "for verification";
        } else if (currentFilter === "new_month") {
            if (!p.created_at) return false;
            const d = new Date(p.created_at);
            return !isNaN(d.getTime()) && d.getMonth() === curMonth && d.getFullYear() === curYear;
        }

        return true;
    });

    renderPatientList(filtered);
}

// Handle Save Personal Form (Selected Patient)
async function handleSavePersonalForm() {
    const patient = patientsList.find(p => p.id === selectedPatientId);
    if (!patient) return;

    // Update patient object in memory
    patient.first_name = document.getElementById("pFirstName").value;
    patient.middle_name = document.getElementById("pMiddleName").value;
    patient.last_name = document.getElementById("pLastName").value;
    patient.suffix = document.getElementById("pSuffix").value;
    patient.birth_date = document.getElementById("pBirthDate").value;
    patient.age = parseInt(document.getElementById("pAge").value || "0", 10) || calculateAge(patient.birth_date);
    patient.sex = document.getElementById("pSex").value;
    patient.civil_status = document.getElementById("pCivilStatus").value;
    patient.nationality = document.getElementById("pNationality").value;
    patient.religion = document.getElementById("pReligion").value;
    patient.occupation = document.getElementById("pOccupation").value;
    patient.contact_number = document.getElementById("pMobile").value;
    patient.telephone = document.getElementById("pTelephone").value;
    patient.email = document.getElementById("pEmail").value;
    patient.address = document.getElementById("pAddress").value;

    // Sync to Supabase if available
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        try {
            await window.sb.from("patients").update({
                first_name: patient.first_name,
                middle_name: patient.middle_name,
                last_name: patient.last_name,
                suffix: patient.suffix,
                birth_date: patient.birth_date,
                sex: patient.sex,
                civil_status: patient.civil_status,
                nationality: patient.nationality,
                religion: patient.religion,
                occupation: patient.occupation,
                contact_number: patient.contact_number,
                telephone: patient.telephone,
                email: patient.email,
                address: patient.address
            }).eq("id", patient.id);
        } catch (err) {
            console.warn("Supabase update error:", err);
        }
    }

    populatePatientData(patient.id);
    updateCounterCards();
    applyFilters();
    showNotice(`Personal Information for ${patient.first_name} ${patient.last_name} saved successfully!`);
}

// Handle Save New Patient Form
async function handleSaveNewPatientForm() {
    const form = document.getElementById("newPatientForm");
    const fd = new FormData(form);

    const firstName = fd.get("first_name") || "";
    const middleName = fd.get("middle_name") || "";
    const lastName = fd.get("last_name") || "";
    const suffix = fd.get("suffix") || "";
    const birthDate = fd.get("birth_date") || "";
    const sex = fd.get("sex") || "Male";
    const civilStatus = fd.get("civil_status") || "Single";
    const nationality = fd.get("nationality") || "Filipino";
    const religion = fd.get("religion") || "Catholic";
    const occupation = fd.get("occupation") || "";
    const contact = fd.get("contact_number") || "";
    const telephone = fd.get("telephone") || "";
    const email = fd.get("email") || "";
    const address = fd.get("address") || "";
    const allergies = fd.get("allergies") || "None";
    const conditions = fd.get("medical_conditions") || "None";

    const nextId = patientsList.length > 0 ? Math.max(...patientsList.map(p => p.id)) + 1 : 1;
    const newCode = `PR-2026-${String(nextId).padStart(4, "0")}`;

    const newPatient = {
        id: nextId,
        patient_code: newCode,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix: suffix,
        birth_date: birthDate,
        age: calculateAge(birthDate) || 25,
        sex: sex,
        civil_status: civilStatus,
        nationality: nationality,
        religion: religion,
        occupation: occupation,
        contact_number: contact,
        telephone: telephone,
        email: email,
        address: address,
        status: "Active",
        created_at: new Date().toISOString(),
        lastConsultationDate: "",
        lastConsultationType: "",
        nextApptDate: "",
        nextApptTime: "",
        programs: [],
        allergies: allergies,
        conditions: conditions
    };

    // Save to Supabase if configured
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        try {
            const { data, error } = await window.sb.from("patients").insert([{
                patient_code: newCode,
                first_name: firstName,
                middle_name: middleName,
                last_name: lastName,
                suffix: suffix,
                birth_date: birthDate || null,
                sex: sex,
                civil_status: civilStatus,
                nationality: nationality,
                religion: religion,
                occupation: occupation,
                contact_number: contact,
                telephone: telephone,
                email: email,
                address: address,
                status: "Active"
            }]).select();

            if (!error && data && data[0]) {
                newPatient.id = data[0].id;
                if (data[0].created_at) newPatient.created_at = data[0].created_at;
            }
        } catch (err) {
            console.warn("Supabase insert error:", err);
        }
    }

    patientsList.unshift(newPatient);
    form.reset();
    updateCounterCards();
    applyFilters();
    showSelectedPatientView(newPatient.id);
    showNotice(`New patient ${firstName} ${lastName} (${newCode}) registered successfully!`);
}

function showNotice(msg) {
    const alertBox = document.getElementById("alertMessage");
    if (alertBox) {
        alertBox.textContent = msg;
        alertBox.style.display = "block";
        alertBox.style.background = "#dcfce7";
        alertBox.style.color = "#166534";
        alertBox.style.border = "1px solid #bbf7d0";
        alertBox.style.padding = "10px 16px";
        alertBox.style.borderRadius = "6px";
        alertBox.style.marginBottom = "14px";
        setTimeout(() => {
            alertBox.style.display = "none";
        }, 4000);
    } else {
        alert(msg);
    }
}

// Tab Switching
function initTabs() {
    const tabButtons = document.querySelectorAll(".tab-button");
    const tabContents = document.querySelectorAll(".tab-content");

    tabButtons.forEach(button => {
        button.addEventListener("click", function () {
            const tabName = button.getAttribute("data-tab");

            tabButtons.forEach(btn => btn.classList.remove("active"));
            tabContents.forEach(content => content.classList.remove("active"));

            button.classList.add("active");

            const target = document.getElementById("tab-" + tabName);
            if (target) {
                target.classList.add("active");
            }
        });
    });
}
