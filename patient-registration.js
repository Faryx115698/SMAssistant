// patient-registration.js - Client-Side Controller for Patient Registration & Records

let patientsList = [];

let selectedPatientId = null;
let currentFilter = "all";
let isEditingPatient = false;

document.addEventListener("DOMContentLoaded", function () {
    initTabs();
    initEventListeners();
    updateCounterCards();
    fetchLivePatients();

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("new_patient") === "1") {
        clearActivePatientFromStorage();
        showNewPatientView();
    } else if (urlParams.has("patient_id")) {
        const reqId = parseInt(urlParams.get("patient_id"), 10);
        if (!isNaN(reqId) && patientsList.some(p => p.id === reqId)) {
            showSelectedPatientView(reqId);
        } else {
            clearActivePatientFromStorage();
            showNoPatientView();
        }
    } else {
        clearActivePatientFromStorage();
        showNoPatientView();
    }
    setPatientEditMode(false);
});

// Fetch live patients from Supabase if configured
async function fetchLivePatients() {
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        try {
            const [{ data: patientData, error: patientError }, { data: healthData, error: healthError }] = await Promise.all([
                window.sb.from("patients").select("*").order("id", { ascending: true }),
                window.sb.from("health_profiles").select("*")
            ]);
            const healthMap = {};
            if (!healthError && healthData) {
                healthData.forEach(hp => { healthMap[hp.patient_id] = hp; });
            }
            if (!patientError && patientData && patientData.length > 0) {
                // Merge or update with Supabase data
                const map = {};
                patientsList.forEach(p => map[p.id] = p);
                patientData.forEach(dbP => {
                    const existing = map[dbP.id] || {};
                    const hp = healthMap[dbP.id] || {};
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
                        portal_invited_at: dbP.portal_invited_at || existing.portal_invited_at || null,
                        address: dbP.address || existing.address || "",
                        status: dbP.status || "Active",
                        created_at: dbP.created_at || existing.created_at || "",
                        blood_type: hp.blood_type || existing.blood_type || "",
                        height: hp.height || existing.height || "",
                        weight: hp.weight || existing.weight || "",
                        allergies: hp.allergies || existing.allergies || "",
                        conditions: hp.medical_conditions || existing.conditions || ""
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

    setPatientEditMode(false);
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

    setPatientEditMode(false);
    if (newView) newView.style.display = "none";
    if (noPatientView) noPatientView.style.display = "none";
    if (selectedView) selectedView.style.display = "contents";

    selectPatient(patientId);
}

function showNoPatientView() {
    selectedPatientId = null;
    clearActivePatientFromStorage();
    const selectedView = document.getElementById("selectedPatientView");
    const newView = document.getElementById("newPatientView");
    const noPatientView = document.getElementById("noPatientView");

    setPatientEditMode(false);
    if (newView) newView.style.display = "none";
    if (selectedView) selectedView.style.display = "none";
    if (noPatientView) noPatientView.style.display = "block";

    // Unselect patient cards in sidebar
    document.querySelectorAll(".patient-card").forEach(c => c.classList.remove("selected"));
}

// Select a patient and fill in all fields
function selectPatient(patientId) {
    selectedPatientId = patientId;
    const patient = patientsList.find(p => p.id === patientId);
    if (!patient) {
        clearActivePatientFromStorage();
        showNoPatientView();
        return;
    }

    // Persist selected patient so other pages can read it
    saveActivePatientToStorage(patient);

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

// Persist the currently-active patient to localStorage so other pages can read it
function clearActivePatientFromStorage() {
    try {
        localStorage.removeItem("sm_active_patient_id");
        localStorage.removeItem("sm_active_patient");
    } catch (e) {
        console.warn("Could not clear active patient from localStorage:", e);
    }
}

function saveActivePatientToStorage(patient) {
    if (!patient) return;
    try {
        localStorage.setItem("sm_active_patient_id", String(patient.id));
        localStorage.setItem("sm_active_patient", JSON.stringify(patient));
    } catch (e) {
        console.warn("Could not save active patient to localStorage:", e);
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
    setVal("pSex", patient.sex);
    setVal("pCivilStatus", patient.civil_status);
    setVal("pNationality", patient.nationality || "Filipino");
    setVal("pReligion", patient.religion || "Catholic");
    setVal("pOccupation", patient.occupation);
    setVal("pMobile", patient.contact_number);
    setVal("pTelephone", patient.telephone);
    setVal("pEmail", patient.email);
    setVal("pAddress", patient.address);

    const portalInviteBtn = document.getElementById("portalInviteBtn");
    if (portalInviteBtn) {
        portalInviteBtn.hidden = !patient.email || !patient.birth_date || Boolean(patient.portal_invited_at);
        portalInviteBtn.disabled = false;
        const label = portalInviteBtn.querySelector("span");
        if (label) label.textContent = "Send portal invite";
    }

    // 3. Health Profile Form Inputs
    setVal("hBloodType", patient.blood_type || "");
    setVal("hHeight", patient.height || "");
    setVal("hWeight", patient.weight || "");
    setVal("hAllergies", patient.allergies || "");
    setVal("hConditions", patient.conditions || "");

    // 4. Quick Summary Area
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

    // Default to locked view mode on populate
    if (!isEditingPatient) {
        setPatientEditMode(false);
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
        const searchInput = document.querySelector(".patient-search input");
        const hasQuery = searchInput && searchInput.value.trim().length > 0;
        const isFiltered = currentFilter !== "all";
        const emptyMsg = (hasQuery || isFiltered)
            ? `<i class="fa-solid fa-magnifying-glass"></i>
               <p>No patients found</p>
               <small>Try a different name, ID, or filter</small>`
            : `<i class="fa-solid fa-user-plus"></i>
               <p>No patients registered yet</p>
               <small>Click <strong>+ New Patient</strong> to add the first patient</small>`;
        container.innerHTML = `<div class="patient-list-empty">${emptyMsg}</div>`;
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
            if (selectedPatientId) {
                showSelectedPatientView(selectedPatientId);
            } else {
                showNoPatientView();
            }
        });
    });

    // 3. Date of birth changes -> age is derived automatically, no manual age field
    const pDob = document.getElementById("pBirthDate");
    if (pDob) {
        pDob.addEventListener("change", function () {
            // Age is calculated from the birth date on save and display.
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
            setPatientEditMode(false);
            showNotice("Editing cancelled. Information restored.", "info");
        });
    }

    // 5b. Health Profile Form Save
    const healthProfileForm = document.getElementById("healthProfileForm");
    if (healthProfileForm) {
        healthProfileForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            await handleSaveHealthProfileForm();
        });
    }

    // 5c. Health Profile Form Cancel (Reset)
    const cancelHealthBtn = document.getElementById("cancelHealthEditBtn");
    if (cancelHealthBtn) {
        cancelHealthBtn.addEventListener("click", function (e) {
            e.preventDefault();
            populatePatientData(selectedPatientId);
            setPatientEditMode(false);
            showNotice("Editing cancelled. Health profile restored.", "info");
        });
    }

    // 5d. Header Edit Button Click
    const editPatientBtn = document.getElementById("editPatientBtn");
    if (editPatientBtn) {
        editPatientBtn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggleEditMode();
        });
    }

    const portalInviteBtn = document.getElementById("portalInviteBtn");
    if (portalInviteBtn) {
        portalInviteBtn.addEventListener("click", async function () {
            const patient = patientsList.find(item => item.id === selectedPatientId);
            if (patient) await sendPatientPortalInvite(patient, portalInviteBtn);
        });
    }

    // 5e. Pulse Edit button when user clicks locked form fields in view mode
    if (personalForm) {
        personalForm.addEventListener("click", function (e) {
            if (!isEditingPatient && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "LABEL")) {
                const btn = document.getElementById("editPatientBtn");
                if (btn) {
                    btn.classList.remove("pulse-hint");
                    void btn.offsetWidth;
                    btn.classList.add("pulse-hint");
                }
            }
        });
    }
    if (healthProfileForm) {
        healthProfileForm.addEventListener("click", function (e) {
            if (!isEditingPatient && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "LABEL")) {
                const btn = document.getElementById("editPatientBtn");
                if (btn) {
                    btn.classList.remove("pulse-hint");
                    void btn.offsetWidth;
                    btn.classList.add("pulse-hint");
                }
            }
        });
    }

    // 6. New Patient Form Submit
    const newPatientForm = document.getElementById("newPatientForm");
    if (newPatientForm) {
        newPatientForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const submitButton = newPatientForm.querySelector("button[type='submit']");
            if (submitButton?.disabled) return;
            const idleMarkup = submitButton ? submitButton.innerHTML : "";
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Saving...";
            }
            try {
                await handleSaveNewPatientForm();
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = idleMarkup;
                }
            }
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
    const originalEmail = String(patient.email || "").trim().toLowerCase();

    // Update patient object in memory
    patient.first_name = document.getElementById("pFirstName").value;
    patient.middle_name = document.getElementById("pMiddleName").value;
    patient.last_name = document.getElementById("pLastName").value;
    patient.suffix = document.getElementById("pSuffix").value;
    patient.birth_date = document.getElementById("pBirthDate").value;
    patient.age = calculateAge(patient.birth_date) || 0;
    patient.sex = document.getElementById("pSex").value;
    patient.civil_status = document.getElementById("pCivilStatus").value;
    patient.nationality = document.getElementById("pNationality").value;
    patient.religion = document.getElementById("pReligion").value;
    patient.occupation = document.getElementById("pOccupation").value;
    patient.contact_number = document.getElementById("pMobile").value;
    patient.telephone = document.getElementById("pTelephone").value;
    patient.email = document.getElementById("pEmail").value;
    patient.address = document.getElementById("pAddress").value;
    const emailChanged = originalEmail !== String(patient.email || "").trim().toLowerCase();
    if (emailChanged) patient.portal_invited_at = null;

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
                address: patient.address,
                ...(emailChanged ? { portal_invited_at: null } : {})
            }).eq("id", patient.id);
        } catch (err) {
            console.warn("Supabase update error:", err);
        }
    }

    populatePatientData(patient.id);
    saveActivePatientToStorage(patient);
    updateCounterCards();
    applyFilters();
    setPatientEditMode(false);
    showNotice(`Personal Information for ${patient.first_name} ${patient.last_name} saved successfully!`);
}

// Handle Save Health Profile Form
async function handleSaveHealthProfileForm() {
    const patient = patientsList.find(p => p.id === selectedPatientId);
    if (!patient) return;

    const blood = document.getElementById("hBloodType") ? document.getElementById("hBloodType").value : (patient.blood_type || "");
    const height = document.getElementById("hHeight") ? document.getElementById("hHeight").value.trim() : (patient.height || "");
    const weight = document.getElementById("hWeight") ? document.getElementById("hWeight").value.trim() : (patient.weight || "");
    const allergies = document.getElementById("hAllergies") ? document.getElementById("hAllergies").value.trim() : (patient.allergies || "");
    const conditions = document.getElementById("hConditions") ? document.getElementById("hConditions").value.trim() : (patient.conditions || "");

    patient.blood_type = blood;
    patient.height = height;
    patient.weight = weight;
    patient.allergies = allergies;
    patient.conditions = conditions;

    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        try {
            const payload = {
                blood_type: patient.blood_type,
                height: patient.height,
                weight: patient.weight,
                allergies: patient.allergies,
                medical_conditions: patient.conditions
            };
            const { data: existing, error: checkError } = await window.sb.from("health_profiles").select("id").eq("patient_id", patient.id).limit(1);
            if (checkError) throw checkError;
            let saveError = null;
            if (existing && existing.length > 0) {
                const { error } = await window.sb.from("health_profiles").update(payload).eq("patient_id", patient.id);
                saveError = error;
            } else {
                const { error } = await window.sb.from("health_profiles").insert({ patient_id: patient.id, ...payload });
                saveError = error;
            }
            if (saveError) {
                console.warn("Supabase health profile save error:", saveError);
                if (isSupabaseTableMissing(saveError)) {
                    showNotice("Health profile database table is missing in Supabase. Saved locally only — run health-profile-migration.sql in the Supabase SQL Editor to enable saving.", "error");
                } else {
                    showNotice(`Saved locally, but cloud sync failed: ${saveError.message}`, "error");
                }
            } else {
                showNotice(`Health Profile for ${patient.first_name} ${patient.last_name} saved successfully!`);
            }
        } catch (err) {
            console.warn("Supabase health profile save error:", err);
            if (isSupabaseTableMissing(err)) {
                showNotice("Health profile database table is missing in Supabase. Saved locally only — run health-profile-migration.sql in the Supabase SQL Editor to enable saving.", "error");
            } else {
                showNotice(`Saved locally, but cloud sync failed: ${err.message || err}`, "error");
            }
        }
    } else {
        showNotice(`Health Profile for ${patient.first_name} ${patient.last_name} saved successfully!`);
    }

    populatePatientData(patient.id);
    saveActivePatientToStorage(patient);
    setPatientEditMode(false);
}

// Handle Save New Patient Form
async function handleSaveNewPatientForm() {
    const form = document.getElementById("newPatientForm");
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        showNotice("Patient registration requires a configured Supabase connection. No patient was saved.", "error");
        return;
    }
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
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const address = fd.get("address") || "";
    const bloodType = fd.get("blood_type") || "";
    const height = fd.get("height") || "";
    const weight = fd.get("weight") || "";
    const allergies = fd.get("allergies") || "None";
    const conditions = fd.get("medical_conditions") || "None";

    const parsedBirthDate = new Date(`${birthDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!email || !birthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate > today) {
        showNotice("Enter a valid patient email address and a date of birth that is not in the future.", "error");
        return;
    }

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
        conditions: conditions,
        blood_type: bloodType,
        height: height,
        weight: weight
    };

    let patientInsert;
    try {
        patientInsert = await window.sb.from("patients").insert([{
            patient_code: newCode,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix: suffix,
            birth_date: birthDate,
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
        }]).select().single();
    } catch (err) {
        showNotice(`Could not save the patient record: ${err.message || err}`, "error");
        return;
    }
    if (patientInsert.error || !patientInsert.data) {
        showNotice(`Could not save the patient record: ${patientInsert.error?.message || "Supabase did not return the saved patient record."}`, "error");
        return;
    }
    newPatient.id = patientInsert.data.id;
    newPatient.patient_code = patientInsert.data.patient_code || newCode;
    newPatient.portal_invited_at = patientInsert.data.portal_invited_at || null;
    if (patientInsert.data.created_at) newPatient.created_at = patientInsert.data.created_at;

    let healthProfileWarning = "";
    let healthProfileError;
    try {
        ({ error: healthProfileError } = await window.sb.from("health_profiles").insert({
            patient_id: newPatient.id,
            blood_type: bloodType || "O+",
            height: height || null,
            weight: weight || null,
            allergies: allergies || "None known",
            medical_conditions: conditions || "None"
        }));
    } catch (error) {
        healthProfileError = error;
    }
    if (healthProfileError) {
        console.error("Could not save the new patient's health profile:", healthProfileError);
        healthProfileWarning = ` Health profile could not be saved: ${healthProfileError.message}`;
    }

    patientsList.unshift(newPatient);
    form.reset();
    saveActivePatientToStorage(newPatient);
    updateCounterCards();
    applyFilters();
    showSelectedPatientView(newPatient.id);
    showNotice(`Patient ${firstName} ${lastName} (${newPatient.patient_code}) saved. Sending the portal invitation...`, "info");
    await sendPatientPortalInvite(newPatient, document.getElementById("portalInviteBtn"), healthProfileWarning.trim());
}

async function sendPatientPortalInvite(patient, button, existingWarning = "") {
    if (!patient.email || !patient.birth_date) {
        showNotice("A patient email and date of birth are required to send a portal invitation.", "error");
        return false;
    }
    if (patient.portal_invited_at) {
        showNotice("A portal invitation has already been sent to this patient's email.", "info");
        return false;
    }

    const label = button && button.querySelector("span");
    if (button) button.disabled = true;
    if (label) label.textContent = "Sending...";
    try {
        const redirectTo = new URL("login.html?auth=setup", window.location.href).href;
        const { data, error } = await window.sb.functions.invoke("invite-patient", {
            body: {
                patientId: patient.id,
                email: patient.email,
                birthDate: patient.birth_date,
                redirectTo
            }
        });
        if (error) throw new Error(await getPatientInviteError(error));
        if (!data || data.invited !== true) {
            throw new Error("The invitation service did not confirm that an invitation was sent.");
        }

        patient.portal_invited_at = data.invitedAt || new Date().toISOString();
        if (button) {
            button.hidden = true;
            button.disabled = false;
        }
        const warnings = [existingWarning, data.warning].filter(Boolean);
        showNotice(
            `Portal setup invitation sent to ${patient.email}.${warnings.length ? ` ${warnings.join(" ")}` : ""}`,
            warnings.length ? "error" : "success"
        );
        return true;
    } catch (error) {
        console.error("Could not send patient portal invitation:", error);
        if (button) button.disabled = false;
        if (label) label.textContent = "Send portal invite";
        showNotice(`Patient record saved, but the portal invitation was not sent: ${error.message}${existingWarning ? ` ${existingWarning}` : ""}`, "error");
        return false;
    }
}

async function getPatientInviteError(error) {
    const response = error.context;
    if (response && typeof response.clone === "function") {
        try {
            const body = await response.clone().json();
            if (body && typeof body.error === "string") return body.error;
        } catch {
            // Keep the Supabase Functions error below when no JSON response is available.
        }
    }
    return error.message || "Could not send the patient portal invitation.";
}

function showNotice(msg, type = "success") {
    const alertBox = document.getElementById("alertMessage");
    if (alertBox) {
        alertBox.textContent = msg;
        alertBox.style.display = "block";
        if (type === "info") {
            alertBox.style.background = "#eff6ff";
            alertBox.style.color = "#1e40af";
            alertBox.style.border = "1px solid #bfdbfe";
        } else if (type === "error") {
            alertBox.style.background = "#fef2f2";
            alertBox.style.color = "#991b1b";
            alertBox.style.border = "1px solid #fecaca";
        } else {
            alertBox.style.background = "#dcfce7";
            alertBox.style.color = "#166534";
            alertBox.style.border = "1px solid #bbf7d0";
        }
        alertBox.style.padding = "10px 16px";
        alertBox.style.borderRadius = "6px";
        alertBox.style.marginBottom = "14px";
        alertBox.style.fontWeight = "500";
        alertBox.style.fontSize = "13px";
        alertBox.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
        setTimeout(() => {
            alertBox.style.display = "none";
        }, 3500);
    } else {
        alert(msg);
    }
}

// Toggle Patient Edit Mode (Personal Information & Health Profile)
function setPatientEditMode(editable) {
    isEditingPatient = !!editable;

    const personalForm = document.getElementById("personalForm");
    const healthForm = document.getElementById("healthProfileForm");
    const editBtn = document.getElementById("editPatientBtn");
    const pActions = document.getElementById("personalFormActions");
    const hActions = document.getElementById("healthFormActions");
    const pPill = document.getElementById("personalModePill");
    const hPill = document.getElementById("healthModePill");

    if (personalForm) {
        personalForm.classList.toggle("editing-mode", isEditingPatient);
        personalForm.classList.toggle("view-mode", !isEditingPatient);
    }
    if (healthForm) {
        healthForm.classList.toggle("editing-mode", isEditingPatient);
        healthForm.classList.toggle("view-mode", !isEditingPatient);
    }

    // Toggle readonly/disabled on Personal Information inputs
    const personalTextInputs = [
        "pFirstName", "pMiddleName", "pLastName", "pSuffix",
        "pBirthDate", "pCivilStatus", "pNationality", "pReligion",
        "pOccupation", "pMobile", "pTelephone", "pEmail", "pAddress"
    ];
    personalTextInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.readOnly = !isEditingPatient;
            if (id === "pBirthDate") {
                el.disabled = !isEditingPatient;
            }
        }
    });

    const sexEl = document.getElementById("pSex");
    if (sexEl) sexEl.disabled = !isEditingPatient;

    // Toggle readonly/disabled on Health Profile inputs
    const healthTextInputs = ["hHeight", "hWeight", "hAllergies", "hConditions"];
    healthTextInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.readOnly = !isEditingPatient;
    });
    const bloodEl = document.getElementById("hBloodType");
    if (bloodEl) bloodEl.disabled = !isEditingPatient;

    // Action buttons display
    if (pActions) pActions.style.display = isEditingPatient ? "flex" : "none";
    if (hActions) hActions.style.display = isEditingPatient ? "flex" : "none";

    // Header Edit button state
    if (editBtn) {
        if (isEditingPatient) {
            editBtn.classList.add("active-editing");
            editBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span id="editBtnText">Cancel Edit</span>';
            editBtn.setAttribute("title", "Click to cancel editing and discard unsaved changes");
        } else {
            editBtn.classList.remove("active-editing");
            editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> <span id="editBtnText">Edit</span>';
            editBtn.setAttribute("title", "Click to edit patient information");
        }
    }

    // Status Pills
    if (pPill) {
        pPill.className = "mode-pill" + (isEditingPatient ? " editing" : "");
        pPill.innerHTML = isEditingPatient
            ? '<i class="fa-solid fa-pen-to-square"></i> Editable'
            : '<i class="fa-solid fa-lock"></i> View Only';
    }
    if (hPill) {
        hPill.className = "mode-pill" + (isEditingPatient ? " editing" : "");
        hPill.innerHTML = isEditingPatient
            ? '<i class="fa-solid fa-pen-to-square"></i> Editable'
            : '<i class="fa-solid fa-lock"></i> View Only';
    }
}

let lastEditToggleTime = 0;

function toggleEditMode(forceState) {
    const now = Date.now();
    if (now - lastEditToggleTime < 350) {
        return;
    }
    lastEditToggleTime = now;

    if (typeof forceState === "boolean") {
        if (forceState) {
            enableEditMode();
        } else {
            cancelEditMode();
        }
        return;
    }

    if (isEditingPatient) {
        cancelEditMode();
    } else {
        enableEditMode();
    }
}

function enableEditMode() {
    setPatientEditMode(true);

    // Switch to Personal tab if currently on an unrelated tab
    const activeTab = document.querySelector(".tab-button.active");
    const activeTabName = activeTab ? activeTab.getAttribute("data-tab") : "personal";
    if (activeTabName !== "personal" && activeTabName !== "health") {
        const personalTab = document.querySelector('.tab-button[data-tab="personal"]');
        if (personalTab) personalTab.click();
    }

    setTimeout(() => {
        const currentTab = document.querySelector(".tab-button.active");
        if (currentTab && currentTab.getAttribute("data-tab") === "health") {
            const hFocus = document.getElementById("hBloodType") || document.getElementById("hHeight");
            if (hFocus) hFocus.focus();
        } else {
            const fName = document.getElementById("pFirstName");
            if (fName) fName.focus();
        }
    }, 80);
}

function cancelEditMode() {
    populatePatientData(selectedPatientId);
    setPatientEditMode(false);
    showNotice("Editing cancelled. Information restored.", "info");
}

function focusPersonalForm() {
    enableEditMode();
}

window.toggleEditMode = toggleEditMode;
window.enableEditMode = enableEditMode;
window.cancelEditMode = cancelEditMode;
window.focusPersonalForm = focusPersonalForm;
window.setPatientEditMode = setPatientEditMode;

function isSupabaseTableMissing(err) {
    const msg = String((err && (err.message || err.details || err.hint)) || err || "").toLowerCase();
    return msg.includes("schema cache") || msg.includes("could not find the table") || (msg.includes("relation") && msg.includes("does not exist"));
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
