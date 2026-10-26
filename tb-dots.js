const samplePatients = [];
const sampleLabs = [];
const sampleContacts = [];

let currentPatient = null;
function formatDateOnly(value) {
    if (!value) return "";
    try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        }
    } catch (e) {}
    return value;
}

function mapIntake(row) {
    return {
        id: row.id,
        date: formatDateOnly(row.intake_date),
        dateISO: row.intake_date,
        time: row.intake_time,
        regimen: row.regimen,
        dose: row.dose,
        observedBy: row.observed_by,
        adverse: row.adverse_event,
        status: row.status
    };
}

function mapCase(row, intakeRows) {
    return {
        id: row.id,
        code: row.tb_code,
        name: row.patient_name,
        age: row.age,
        sex: row.sex,
        category: row.category,
        phase: row.phase,
        startDate: formatDateOnly(row.treatment_start),
        treatmentStartISO: row.treatment_start,
        weight: row.weight,
        bhw: row.bhw,
        contact: row.contact,
        address: row.address,
        progressMonth: row.progress_month,
        totalMonths: row.total_months,
        progressPercent: row.progress_percent,
        status: row.status,
        intakes: (intakeRows || []).map(mapIntake)
    };
}

function mapLab(row) {
    return {
        id: row.id,
        date: formatDateOnly(row.test_date),
        dateISO: row.test_date,
        name: row.patient_name,
        type: row.test_type,
        timing: row.timing,
        smear: row.smear_result,
        genexpert: row.genexpert,
        rif: row.rif_resistance,
        action: row.action_taken,
        tbCaseId: row.tb_case_id
    };
}

function mapContact(row) {
    return {
        id: row.id,
        index: row.index_patient_name,
        name: row.contact_name,
        rel: row.relation,
        age: row.age,
        symp: row.symptoms,
        xray: row.xray_tst,
        tpt: row.tpt_status,
        tbCaseId: row.tb_case_id
    };
}

function replaceArray(target, items) {
    target.length = 0;
    target.push(...(items || []));
}

let tbDataPromise = null;
let usingFallback = false;

async function loadTbBaseData() {
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        usingFallback = true;
        return;
    }
    if (tbDataPromise) return tbDataPromise;
    tbDataPromise = (async () => {
        const [casesRes, intakesRes, labsRes, contactsRes] = await Promise.all([
            window.sb.from("tb_cases").select("*").order("created_at", { ascending: false }),
            window.sb.from("tb_intakes").select("*").order("intake_date", { ascending: false }),
            window.sb.from("tb_lab_results").select("*").order("test_date", { ascending: false }),
            window.sb.from("tb_contacts").select("*").order("created_at", { ascending: false })
        ]);

        if (casesRes.error) throw casesRes.error;

        const intakeRows = intakesRes.error ? [] : (intakesRes.data || []);
        const labRows = labsRes.error ? [] : (labsRes.data || []);
        const contactRows = contactsRes.error ? [] : (contactsRes.data || []);

        if (intakesRes.error) console.warn("TB intakes unavailable:", intakesRes.error.message);
        if (labsRes.error) console.warn("TB labs unavailable:", labsRes.error.message);
        if (contactsRes.error) console.warn("TB contacts unavailable:", contactsRes.error.message);

        const intakesByCase = new Map();
        intakeRows.forEach(r => {
            if (!intakesByCase.has(r.tb_case_id)) intakesByCase.set(r.tb_case_id, []);
            intakesByCase.get(r.tb_case_id).push(r);
        });

        const mappedCases = (casesRes.data || []).map(r => mapCase(r, intakesByCase.get(r.id) || []));
        replaceArray(samplePatients, mappedCases);
        replaceArray(sampleLabs, labRows.map(mapLab));
        replaceArray(sampleContacts, contactRows.map(mapContact));

        if (!mappedCases.length && !labRows.length && !contactRows.length) {
            usingFallback = true;
        }
    })();
    try {
        await tbDataPromise;
    } catch (err) {
        console.error("Failed to load TB-DOTS data:", err);
        usingFallback = true;
        tbDataPromise = null;
    }
}
function showToast(message, type) {
    let toast = document.getElementById("tbToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "tbToast";
        toast.style.cssText = "position:fixed;bottom:24px;right:24px;padding:12px 18px;border-radius:10px;color:#fff;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.18);display:none;";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === "error" ? "#dc2626" : "#16a34a";
    toast.style.display = "block";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = "none"; }, 3200);
}

function updateSummaryStats() {
    const activeCases = samplePatients.filter(p => p.status === "Active");
    const intensive = activeCases.filter(p => p.phase === "Intensive").length;
    const continuation = activeCases.filter(p => p.phase === "Continuation").length;
    const sputumDue = samplePatients.filter(p => p.status === "Active" && (p.progressMonth === 2 || p.progressMonth === 5)).length;
    const total = samplePatients.length;
    const cured = samplePatients.filter(p => p.status === "Cured" || p.status === "Completed").length;
    const success = total ? Math.round((cured / total) * 100) : 0;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("statActive", activeCases.length);
    set("statIntensive", intensive);
    set("statContinuation", continuation);
    set("statSputum", sputumDue);
    set("statSuccess", success + "%");
}

document.addEventListener("DOMContentLoaded", async function () {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("intakeDate");
    if (dateInput) dateInput.value = today;
    const labDate = document.getElementById("labDate");
    if (labDate) labDate.value = today;

    const dateStr = document.getElementById("currentDateStr");
    if (dateStr) dateStr.textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const listContainer = document.getElementById("patientListContainer");
    if (listContainer) listContainer.innerHTML = '<p style="padding:16px;color:#94a3b8;">Loading TB cases...</p>';

    await loadTbBaseData();

    initTabs();
    renderPatients(samplePatients);
    if (samplePatients.length) selectPatient(samplePatients[0]);
    renderLabTable();
    renderContactsTable();
    renderMasterIntakes();
    updateSummaryStats();
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
    if (!list || !list.length) {
        container.innerHTML = '<p style="padding:16px;color:#94a3b8;">No TB cases found.</p>';
        return;
    }
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
    const code = document.getElementById("detailCode");
    if (code) code.textContent = patient.code;
    const cat = document.getElementById("detailCat");
    if (cat) cat.textContent = patient.category;
    const demog = document.getElementById("detailDemog");
    if (demog) demog.textContent = `${patient.age} yrs • ${patient.sex}`;
    const start = document.getElementById("detailStart");
    if (start) start.textContent = patient.startDate;
    const weight = document.getElementById("detailWeight");
    if (weight) weight.textContent = patient.weight;
    const bhw = document.getElementById("detailBhw");
    if (bhw) bhw.textContent = patient.bhw;
    const contact = document.getElementById("detailContact");
    if (contact) contact.textContent = `${patient.contact} (${patient.address})`;

    const statusBadge = document.getElementById("detailStatus");
    if (statusBadge) {
        statusBadge.textContent = patient.status;
        statusBadge.className = "badge " + (patient.status === "Cured" ? "cured" : "active");
    }

    const progressText = document.getElementById("detailProgressText");
    if (progressText) progressText.textContent = `Month ${patient.progressMonth} of ${patient.totalMonths} (${patient.progressPercent}% Complete)`;
    const progressBar = document.getElementById("detailProgressBar");
    if (progressBar) progressBar.style.width = `${patient.progressPercent}%`;

    const tbody = document.getElementById("detailIntakeTable");
    if (tbody) {
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
    }

    renderPatients(samplePatients);
}

function filterPatients() {
    const input = document.getElementById("patientSearchInput");
    const q = (input ? input.value : "").toLowerCase();
    const filtered = samplePatients.filter(p =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
    renderPatients(filtered);
}

function renderLabTable() {
    const tbody = document.getElementById("labTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!sampleLabs.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:18px;">No lab results recorded yet.</td></tr>`;
        return;
    }
    sampleLabs.forEach(l => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${l.date}</b></td>
            <td>${l.name}</td>
            <td>${l.type}</td>
            <td>${l.timing || ""}</td>
            <td><span class="badge ${String(l.smear).includes('Negative') ? 'cured' : 'pending'}">${l.smear}</span></td>
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
    if (!sampleContacts.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:18px;">No contacts screened yet.</td></tr>`;
        return;
    }
    sampleContacts.forEach(c => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><b>${c.index}</b></td>
            <td>${c.name}</td>
            <td>${c.rel}</td>
            <td>${c.age}</td>
            <td>${c.symp}</td>
            <td>${c.xray}</td>
            <td><span class="badge ${String(c.tpt).includes('IPT') ? 'active' : 'intensive'}">${c.tpt}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMasterIntakes() {
    const tbody = document.getElementById("dailyIntakeMasterTable");
    if (!tbody) return;
    tbody.innerHTML = "";
    const active = samplePatients.filter(p => p.status === "Active");
    if (!active.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:18px;">No active patients.</td></tr>`;
        return;
    }
    active.forEach(p => {
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
function openEnrollModal() {
    const modal = document.getElementById("enrollModal");
    if (modal) modal.classList.add("active");
}
function closeEnrollModal() {
    const modal = document.getElementById("enrollModal");
    if (modal) modal.classList.remove("active");
}

function isSupabaseTableMissing(err) {
    const msg = String((err && (err.message || err.details || err.hint)) || err || "").toLowerCase();
    return msg.includes("schema cache") || msg.includes("could not find the table") || (msg.includes("relation") && msg.includes("does not exist"));
}

async function handleEnroll(e) {
    e.preventDefault();
    const name = document.getElementById("tbName").value.trim();
    const age = document.getElementById("tbAge").value;
    const sex = document.getElementById("tbSex").value;
    const cat = document.getElementById("tbCat").value;
    const weight = document.getElementById("tbWeight").value;
    const bhw = document.getElementById("tbBhw").value.trim();
    const address = document.getElementById("tbAddress").value.trim();

    const totalMonths = cat.includes("Category II") ? 8 : 6;
    const code = `TB-2026-${String(samplePatients.length + 1).padStart(4, "0")}`;

    const buildLocalPatient = () => ({
        id: Date.now(),
        code: code,
        name: name,
        age: parseInt(age, 10),
        sex: sex,
        category: cat,
        phase: "Intensive",
        startDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        weight: weight + " kg",
        bhw: bhw,
        contact: "0917-000-0000",
        address: address,
        progressMonth: 1,
        totalMonths: totalMonths,
        progressPercent: 5,
        status: "Active",
        intakes: []
    });

    let persisted = false;
    try {
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            try {
                const { data, error } = await window.sb.from("tb_cases").insert([{
                    patient_id: null,
                    tb_code: code,
                    patient_name: name,
                    age: parseInt(age, 10),
                    sex: sex,
                    category: cat,
                    phase: "Intensive",
                    treatment_start: new Date().toISOString().split("T")[0],
                    weight: weight + " kg",
                    bhw: bhw,
                    contact: "0917-000-0000",
                    address: address,
                    progress_month: 1,
                    total_months: totalMonths,
                    progress_percent: 5,
                    status: "Active"
                }]).select().single();
                if (error) throw error;
                const newPatient = mapCase(data, []);
                samplePatients.unshift(newPatient);
                persisted = true;
            } catch (err) {
                if (!isSupabaseTableMissing(err)) throw err;
                console.warn("TB-DOTS Supabase table missing; falling back to local mode.", err);
                showToast("TB-DOTS database table is missing in Supabase. Enrolled locally only — run tb-dots-migration.sql in the Supabase SQL Editor to enable saving.", "error");
                samplePatients.unshift(buildLocalPatient());
            }
        } else {
            samplePatients.unshift(buildLocalPatient());
        }
        selectPatient(samplePatients[0]);
        closeEnrollModal();
        renderMasterIntakes();
        updateSummaryStats();
        if (persisted) showToast("Patient enrolled successfully.");
    } catch (err) {
        console.error(err);
        showToast("Failed to enroll patient: " + (err.message || err), "error");
    }
}

function openIntakeModal() {
    if (!currentPatient) return;
    const nameInput = document.getElementById("intakePatientName");
    if (nameInput) nameInput.value = `${currentPatient.name} (${currentPatient.code})`;
    const modal = document.getElementById("intakeModal");
    if (modal) modal.classList.add("active");
}
function closeIntakeModal() {
    const modal = document.getElementById("intakeModal");
    if (modal) modal.classList.remove("active");
}

async function handleIntake(e) {
    e.preventDefault();
    if (!currentPatient) return;
    const date = document.getElementById("intakeDate").value;
    const time = document.getElementById("intakeTime").value;
    const regimen = document.getElementById("intakeRegimen").value;
    const supervisor = document.getElementById("intakeSupervisor").value.trim();

    try {
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            const { data, error } = await window.sb.from("tb_intakes").insert([{
                tb_case_id: currentPatient.id,
                intake_date: date,
                intake_time: time,
                regimen: regimen,
                dose: "Prescribed Dose",
                observed_by: supervisor,
                adverse_event: "None",
                status: "Taken"
            }]).select().single();
            if (error) throw error;
            currentPatient.intakes.unshift(mapIntake(data));
        } else {
            currentPatient.intakes.unshift({
                date: formatDateOnly(date),
                dateISO: date,
                time: time,
                regimen: regimen,
                dose: "Prescribed Dose",
                observedBy: supervisor,
                adverse: "None",
                status: "Taken"
            });
        }
        selectPatient(currentPatient);
        closeIntakeModal();
        renderMasterIntakes();
        showToast("Intake logged successfully.");
    } catch (err) {
        console.error(err);
        showToast("Failed to log intake: " + (err.message || err), "error");
    }
}
function openLabModal() {
    const modal = document.getElementById("labModal");
    if (currentPatient) {
        const input = document.getElementById("labPatientName");
        if (input) input.value = currentPatient.name;
    }
    const dateInput = document.getElementById("labDate");
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split("T")[0];
    if (modal) modal.classList.add("active");
}
function closeLabModal() {
    const modal = document.getElementById("labModal");
    if (modal) modal.classList.remove("active");
}

async function handleLab(e) {
    e.preventDefault();
    const patientName = document.getElementById("labPatientName").value.trim();
    const testType = document.getElementById("labTestType").value;
    const timing = document.getElementById("labTiming").value.trim();
    const testDate = document.getElementById("labDate").value;
    const smear = document.getElementById("labSmear").value.trim();
    const genexpert = document.getElementById("labGeneXpert").value.trim();
    const rif = document.getElementById("labRif").value.trim();
    const action = document.getElementById("labAction").value.trim();

    const tbCaseId = (currentPatient && currentPatient.name === patientName) ? currentPatient.id : null;

    try {
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            const { data, error } = await window.sb.from("tb_lab_results").insert([{
                tb_case_id: tbCaseId,
                patient_name: patientName,
                test_type: testType,
                timing: timing,
                test_date: testDate,
                smear_result: smear,
                genexpert: genexpert,
                rif_resistance: rif,
                action_taken: action
            }]).select().single();
            if (error) throw error;
            sampleLabs.unshift(mapLab(data));
        } else {
            sampleLabs.unshift({
                id: Date.now(),
                date: formatDateOnly(testDate),
                dateISO: testDate,
                name: patientName,
                type: testType,
                timing: timing,
                smear: smear,
                genexpert: genexpert,
                rif: rif,
                action: action,
                tbCaseId: tbCaseId
            });
        }
        renderLabTable();
        closeLabModal();
        updateSummaryStats();
        showToast("Lab result recorded.");
    } catch (err) {
        console.error(err);
        showToast("Failed to record lab result: " + (err.message || err), "error");
    }
}

function openContactModal() {
    const modal = document.getElementById("contactModal");
    if (currentPatient) {
        const idx = document.getElementById("contactIndex");
        if (idx) idx.value = currentPatient.name;
    }
    if (modal) modal.classList.add("active");
}
function closeContactModal() {
    const modal = document.getElementById("contactModal");
    if (modal) modal.classList.remove("active");
}

async function handleContact(e) {
    e.preventDefault();
    const indexName = document.getElementById("contactIndex").value.trim();
    const contactName = document.getElementById("contactName").value.trim();
    const rel = document.getElementById("contactRel").value.trim();
    const age = document.getElementById("contactAge").value;
    const symp = document.getElementById("contactSymp").value.trim();
    const xray = document.getElementById("contactXray").value.trim();
    const tpt = document.getElementById("contactTpt").value.trim();

    const tbCaseId = (currentPatient && currentPatient.name === indexName) ? currentPatient.id : null;

    try {
        if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
            const { data, error } = await window.sb.from("tb_contacts").insert([{
                tb_case_id: tbCaseId,
                index_patient_name: indexName,
                contact_name: contactName,
                relation: rel,
                age: parseInt(age, 10) || null,
                symptoms: symp,
                xray_tst: xray,
                tpt_status: tpt
            }]).select().single();
            if (error) throw error;
            sampleContacts.unshift(mapContact(data));
        } else {
            sampleContacts.unshift({
                id: Date.now(),
                index: indexName,
                name: contactName,
                rel: rel,
                age: parseInt(age, 10) || null,
                symp: symp,
                xray: xray,
                tpt: tpt,
                tbCaseId: tbCaseId
            });
        }
        renderContactsTable();
        closeContactModal();
        showToast("Contact screening saved.");
    } catch (err) {
        console.error(err);
        showToast("Failed to save contact: " + (err.message || err), "error");
    }
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        closeEnrollModal();
        closeIntakeModal();
        closeLabModal();
        closeContactModal();
    }
});
