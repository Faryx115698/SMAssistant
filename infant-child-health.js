let childProfiles = [];
let patients = [];
let visits = [];
let nutritionAssessments = [];
let screenings = [];
let immunizations = [];
let selectedChild = null;
let activeMeasurement = "weight_kg";
const $ = (selector) => document.querySelector(selector);
const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function localDate(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = localDate(value);
    return date ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
}

function daysFromToday(value) {
    const date = localDate(value);
    const current = localDate(today());
    return date && current ? Math.round((date - current) / 86400000) : null;
}

function ageOnDate(birthDate, visitDate) {
    const born = localDate(birthDate);
    const at = localDate(visitDate);
    if (!born || !at || born > at) return "—";
    let years = at.getFullYear() - born.getFullYear();
    let months = at.getMonth() - born.getMonth();
    if (at.getDate() < born.getDate()) months--;
    if (months < 0) {
        years--;
        months += 12;
    }
    if (years < 0) return "—";
    return years ? `${years} yr${years === 1 ? "" : "s"}${months ? `, ${months} mo${months === 1 ? "" : "s"}` : ""}` : `${months} mo${months === 1 ? "" : "s"}`;
}

function patientFor(child) {
    if (!child) return null;
    if (child.patient && !Array.isArray(child.patient)) return child.patient;
    return patients.find((patient) => String(patient.id) === String(child.patient_id)) || null;
}

function childName(child) {
    const patient = patientFor(child);
    return [patient ? patient.first_name : child && child.first_name,
        patient ? patient.middle_name : child && child.middle_name,
        patient ? patient.last_name : child && child.last_name,
        patient ? patient.suffix : child && child.suffix].filter(Boolean).join(" ") || "Child profile";
}

function childBirthDate(child) {
    return patientFor(child)?.birth_date || child?.birth_date || "";
}

function childSex(child) {
    return patientFor(child)?.sex || child?.sex || "";
}

function childPhone(child) {
    const patient = patientFor(child);
    return child.contact_number || patient?.contact_number || child.mother_contact || "";
}

function getChildVisits() {
    return selectedChild ? visits.filter((visit) => String(visit.child_id) === String(selectedChild.id)) : [];
}

function getChildNutrition() {
    return selectedChild ? nutritionAssessments.filter((item) => String(item.child_id) === String(selectedChild.id)) : [];
}

function getChildScreenings() {
    return selectedChild ? screenings.filter((item) => String(item.child_id) === String(selectedChild.id)) : [];
}

function showMessage(message, type = "error") {
    const target = $("#pageMessage");
    target.textContent = message;
    target.className = `message ${type}`;
    target.hidden = false;
    if (type === "success") {
        window.setTimeout(() => {
            if (target.textContent === message) target.hidden = true;
        }, 4500);
    }
}

function setFormMessage(id, message) {
    const target = $(`#${id}`);
    target.textContent = message;
    target.hidden = !message;
}

function updatePatientOptions() {
    const select = $("#childForm").elements.patient_id;
    const currentId = selectedChild?.patient_id || "";
    const eligible = patients.filter((patient) => {
        const years = ageInYears(patient.birth_date);
        return patient.status !== "Archived" && (
            (years !== null && years >= 0 && years < 18) || String(patient.id) === String(currentId)
        );
    });
    select.innerHTML = '<option value="">Select an existing patient under 18</option>' +
        eligible.map((patient) => `<option value="${escapeHtml(patient.id)}">${escapeHtml(patientName(patient))} · ${escapeHtml(patient.patient_code || patient.id)} · born ${escapeHtml(formatDate(patient.birth_date))}</option>`).join("");
    if (currentId) select.value = String(currentId);
}

function ageInYears(birthDate) {
    const born = localDate(birthDate);
    const current = localDate(today());
    if (!born || !current || born > current) return null;
    let age = current.getFullYear() - born.getFullYear();
    if (current.getMonth() < born.getMonth() ||
        (current.getMonth() === born.getMonth() && current.getDate() < born.getDate())) age--;
    return age;
}

function patientName(patient) {
    return [patient?.first_name, patient?.middle_name, patient?.last_name, patient?.suffix].filter(Boolean).join(" ") || "Patient";
}

function renderChildList() {
    const search = $("#childSearch").value.trim().toLowerCase();
    const status = $("#childStatusFilter").value;
    const filtered = childProfiles.filter((child) => {
        const patient = patientFor(child);
        const haystack = `${childName(child)} ${child.child_code || ""} ${patient?.patient_code || ""} ${patient?.id || ""}`.toLowerCase();
        return (!search || haystack.includes(search)) && (!status || (child.status || "Active") === status);
    });
    $("#childListMessage").textContent = childProfiles.length
        ? `${filtered.length} of ${childProfiles.length} child health profiles`
        : "No child profiles yet. Link a child already in the patient registry.";
    $("#childrenList").innerHTML = filtered.map((child) => {
        const selected = selectedChild && String(selectedChild.id) === String(child.id);
        const birthDate = childBirthDate(child);
        const patient = patientFor(child);
        return `<button class="child-item${selected ? " selected" : ""}" type="button" onclick="selectChild(${JSON.stringify(String(child.id))})">
            <span class="child-avatar" aria-hidden="true"><i class="fa-solid fa-child"></i></span>
            <span class="child-info"><strong>${escapeHtml(childName(child))}</strong>
            <span>${escapeHtml(patient?.patient_code || child.child_code || `Profile ${child.id}`)} · ${escapeHtml(ageOnDate(birthDate, today()))} · ${escapeHtml(childSex(child) || "Sex not recorded")}</span>
            <small>${escapeHtml(child.mother_name ? `Guardian: ${child.mother_name}` : "Guardian not recorded")}${patient ? "" : " · Link to patient registry"}</small></span></button>`;
    }).join("") || (childProfiles.length ? '<p class="empty-state">No matching children.</p>' : "");
}

function renderProfile() {
    const target = $("#childProfile");
    if (!selectedChild) {
        target.innerHTML = '<div class="empty-state">Select a child profile to view their record.</div>';
        return;
    }
    const patient = patientFor(selectedChild);
    const birthDate = childBirthDate(selectedChild);
    target.innerHTML = `<div class="profile-main">
        <div class="large-avatar"><i class="fa-solid fa-child"></i></div>
        <div class="profile-info"><div class="name"><h2>${escapeHtml(childName(selectedChild))}</h2><span class="status-tag">${escapeHtml(selectedChild.status || "Active")}</span></div>
        <p><b>Patient record:</b> ${escapeHtml(patient?.patient_code || patient?.id || "Not linked")} · <b>Age:</b> ${escapeHtml(ageOnDate(birthDate, today()))} · <b>Birth date:</b> ${escapeHtml(formatDate(birthDate))}</p>
        <p><b>Contact:</b> ${escapeHtml(patient?.contact_number || selectedChild.contact_number || "—")} · <b>Address:</b> ${escapeHtml(patient?.address || selectedChild.address || "—")}</p>
        <p><b>Mother / guardian:</b> ${escapeHtml(selectedChild.mother_name || "—")} · <b>Contact:</b> ${escapeHtml(selectedChild.mother_contact || "—")}</p></div>
    </div>
    <div class="profile-actions"><button class="secondary-button" type="button" onclick="openChildForm(${JSON.stringify(String(selectedChild.id))})"><i class="fa-solid fa-pen"></i> Edit child profile</button><button class="secondary-button print-button" type="button" onclick="window.print()">Print record</button>${patient ? `<a class="secondary-button" href="patient-registration.html?patient_id=${encodeURIComponent(patient.id)}">Open patient registry</a>` : ""}<button class="text-button" type="button" onclick="showAudit('profile',${JSON.stringify(String(selectedChild.id))})">Profile audit</button></div>
    <div class="facts">
        <div><small>Blood type</small><b>${escapeHtml(selectedChild.blood_type || "—")}</b></div>
        <div><small>Allergies / notes</small><b>${escapeHtml(selectedChild.allergies || "—")}</b></div>
        <div><small>Birth weight</small><b>${selectedChild.birth_weight_kg ? `${escapeHtml(selectedChild.birth_weight_kg)} kg` : escapeHtml(selectedChild.birth_weight || "—")}</b></div>
        <div><small>Linked identity</small><b>${escapeHtml(patient ? "Patient registry" : "Not linked")}</b></div>
    </div>`;
}

function renderVisitHistory() {
    const rows = getChildVisits().sort((a, b) => String(b.visit_date).localeCompare(String(a.visit_date)));
    const table = (items, includeAction = true) => {
        if (!selectedChild) return '<p class="empty-state">Select a child profile.</p>';
        if (!items.length) return '<p class="empty-state">No visits recorded for this child.</p>';
        const headers = `<tr><th>Date</th><th>Age</th><th>Visit type</th><th>Weight (kg)</th><th>Height / length (cm)</th><th>Head circumference (cm)</th><th>Follow-up</th>${includeAction ? "<th>Action</th>" : ""}</tr>`;
        const tableRows = items.map((visit) => `<tr><td>${escapeHtml(formatDate(visit.visit_date))}</td><td>${escapeHtml(ageOnDate(childBirthDate(selectedChild), visit.visit_date))}</td>
        <td>${escapeHtml(visit.visit_type)}</td><td>${escapeHtml(visit.weight_kg ?? "—")}</td><td>${escapeHtml(visit.height_cm ?? "—")}</td>
        <td>${escapeHtml(visit.head_circumference_cm ?? "—")}</td><td>${escapeHtml(formatDate(visit.next_visit))}</td>
        ${includeAction ? `<td><button class="text-button" type="button" onclick="showVisitDetails(${JSON.stringify(String(visit.id))})">Details</button> <button class="text-button" type="button" onclick="editVisit(${JSON.stringify(String(visit.id))})">Edit</button></td>` : ""}</tr>`).join("");
        return `<table><thead>${headers}</thead><tbody>${tableRows}</tbody></table>`;
    };
    $("#visitTableBody").innerHTML = !selectedChild
        ? '<tr><td colspan="8" class="empty-state">Select a child profile.</td></tr>'
        : !rows.length
            ? '<tr><td colspan="8" class="empty-state">No visits recorded for this child.</td></tr>'
            : rows.map((visit) => `<tr><td>${escapeHtml(formatDate(visit.visit_date))}</td><td>${escapeHtml(ageOnDate(childBirthDate(selectedChild), visit.visit_date))}</td>
                <td>${escapeHtml(visit.visit_type)}</td><td>${escapeHtml(visit.weight_kg ?? "—")}</td><td>${escapeHtml(visit.height_cm ?? "—")}</td>
                <td>${escapeHtml(visit.head_circumference_cm ?? "—")}</td><td>${escapeHtml(formatDate(visit.next_visit))}</td>
                <td><button class="text-button" type="button" onclick="showVisitDetails(${JSON.stringify(String(visit.id))})">Details</button> <button class="text-button" type="button" onclick="editVisit(${JSON.stringify(String(visit.id))})">Edit</button></td></tr>`).join("");
    $("#growthHistory").innerHTML = table(rows, false);
    $("#vitalsHistory").innerHTML = rows.length ? `<table><thead><tr><th>Date</th><th>Age</th><th>Visit</th><th>BP</th><th>Weight</th><th>Height / length</th><th>Head circumference</th><th>Notes</th></tr></thead><tbody>
        ${rows.map((visit) => `<tr><td>${escapeHtml(formatDate(visit.visit_date))}</td><td>${escapeHtml(ageOnDate(childBirthDate(selectedChild), visit.visit_date))}</td><td>${escapeHtml(visit.visit_type)}</td><td>${escapeHtml(visit.bp || "—")}</td><td>${escapeHtml(visit.weight_kg == null ? "—" : `${visit.weight_kg} kg`)}</td><td>${escapeHtml(visit.height_cm == null ? "—" : `${visit.height_cm} cm`)}</td><td>${escapeHtml(visit.head_circumference_cm == null ? "—" : `${visit.head_circumference_cm} cm`)}</td><td>${escapeHtml(visit.notes || "—")}</td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No visits recorded.</p>';
}

function renderMeasurementChart() {
    const target = $("#growthChart");
    const fields = {
        weight_kg: { label: "Weight", unit: "kg" },
        height_cm: { label: "Height / length", unit: "cm" },
        head_circumference_cm: { label: "Head circumference", unit: "cm" }
    };
    const config = fields[activeMeasurement];
    const points = getChildVisits().filter((visit) => Number.isFinite(Number(visit[activeMeasurement])) && visit[activeMeasurement] !== null)
        .sort((a, b) => String(a.visit_date).localeCompare(String(b.visit_date)));
    $("#growthChartCaption").textContent = selectedChild ? `${config.label} · ${points.length} recorded measurement${points.length === 1 ? "" : "s"}` : "Select a child";
    if (!selectedChild || !points.length) {
        target.innerHTML = `<p class="empty-state">${selectedChild ? `No ${config.label.toLowerCase()} measurements recorded.` : "Recorded measurements will appear here."}</p>`;
        return;
    }
    const values = points.map((point) => Number(point[activeMeasurement]));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.2, max * 0.08, 0.2);
    const low = Math.max(0, min - padding);
    const high = max + padding;
    const xFor = (index) => points.length === 1 ? 240 : 42 + index * (396 / (points.length - 1));
    const yFor = (value) => 156 - ((value - low) / (high - low || 1)) * 126;
    const polyline = points.map((point, index) => `${xFor(index)},${yFor(Number(point[activeMeasurement]))}`).join(" ");
    const circles = points.map((point, index) => `<circle cx="${xFor(index)}" cy="${yFor(Number(point[activeMeasurement]))}" r="4"><title>${escapeHtml(formatDate(point.visit_date))}: ${Number(point[activeMeasurement])} ${config.unit}</title></circle>`).join("");
    const labels = points.map((point, index) => `<text x="${xFor(index)}" y="185" text-anchor="middle">${escapeHtml(formatDate(point.visit_date).replace(/,\s*\d{4}$/, ""))}</text>`).join("");
    target.innerHTML = `<svg viewBox="0 0 480 200" role="img" aria-label="${escapeHtml(config.label)} recorded measurements over time">
        <line x1="34" y1="20" x2="34" y2="160"></line><line x1="34" y1="160" x2="450" y2="160"></line>
        <text x="2" y="18">${escapeHtml(config.unit)}</text><text x="4" y="155">${low.toFixed(1)}</text><text x="4" y="34">${high.toFixed(1)}</text>
        <polyline points="${polyline}"></polyline>${circles}${labels}</svg>
        <div class="chart-legend">${escapeHtml(config.label)} (${escapeHtml(config.unit)}) · earliest to latest</div>`;
}

function followupItems() {
    const items = [];
    const childById = (id) => childProfiles.find((child) => String(child.id) === String(id));
    visits.forEach((visit) => {
        if (visit.next_visit && visit.follow_up_status === "Scheduled") items.push({ child: childById(visit.child_id), date: visit.next_visit, type: `Visit: ${visit.visit_type}`, recordId: visit.id, table: "child_visits" });
    });
    nutritionAssessments.forEach((item) => {
        if (item.follow_up_date && item.follow_up_status === "Scheduled") items.push({ child: childById(item.child_id), date: item.follow_up_date, type: `Nutrition follow-up${item.program_name ? `: ${item.program_name}` : ""}`, recordId: item.id, table: "child_nutrition_assessments" });
    });
    screenings.forEach((item) => {
        if (item.follow_up_date && item.follow_up_status === "Scheduled") items.push({ child: childById(item.child_id), date: item.follow_up_date, type: `Screening follow-up: ${item.tool_name}`, recordId: item.id, table: "child_development_screenings" });
    });
    return items.filter((item) => item.child && item.child.status !== "Archived" && daysFromToday(item.date) !== null)
        .map((item) => {
            const difference = daysFromToday(item.date);
            return { ...item, days: difference, status: difference < 0 ? "Overdue" : difference <= 30 ? "Due Soon" : "Scheduled" };
        }).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function renderFollowups() {
    const all = followupItems();
    const search = $("#followupSearch").value.trim().toLowerCase();
    const status = $("#followupStatus").value;
    const items = all.filter((item) => (!status || item.status === status) &&
        (!search || `${childName(item.child)} ${item.type} ${childPhone(item.child)}`.toLowerCase().includes(search)));
    $("#followupQueue").innerHTML = items.length ? `<table><thead><tr><th>Date</th><th>Child</th><th>Follow-up</th><th>Contact</th><th>Status</th><th>Action</th></tr></thead><tbody>
        ${items.map((item) => `<tr><td>${escapeHtml(formatDate(item.date))}</td><td>${escapeHtml(childName(item.child))}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(childPhone(item.child) || "—")}</td><td><span class="status-tag ${item.status === "Overdue" ? "status-overdue" : item.status === "Due Soon" ? "status-due" : ""}">${escapeHtml(item.status)}</span></td><td><button class="text-button" type="button" onclick="selectChild(${JSON.stringify(String(item.child.id))});activateTab('records')">Open</button><button class="text-button" type="button" onclick="completeFollowup(${JSON.stringify(item.table)},${JSON.stringify(String(item.recordId))})">Mark complete</button></td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No follow-ups match these filters.</p>';
    const dueCount = all.filter((item) => item.days <= 30).length;
    const overdueCount = all.filter((item) => item.days < 0).length;
    $("#statFollowups").textContent = `${dueCount} (${overdueCount} overdue)`;
    const childItems = selectedChild ? all.filter((item) => String(item.child.id) === String(selectedChild.id)).slice(0, 5) : [];
    $("#childFollowupPreview").innerHTML = childItems.length ? childItems.map((item) =>
        `<div class="followup-preview"><strong>${escapeHtml(item.type)}</strong><span>${escapeHtml(formatDate(item.date))} · ${escapeHtml(item.status)}</span></div>`
    ).join("") : '<p class="empty-state">No follow-ups recorded for this child.</p>';
}

function renderNutrition() {
    const items = getChildNutrition().sort((a, b) => String(b.assessment_date).localeCompare(String(a.assessment_date)));
    $("#nutritionHistory").innerHTML = !selectedChild ? '<p class="empty-state">Select a child profile.</p>' : items.length ? `<table><thead><tr><th>Date</th><th>Program</th><th>Enrolled</th><th>Follow-up</th><th>Assessment / observations</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
        ${items.map((item) => `<tr><td>${escapeHtml(formatDate(item.assessment_date))}</td><td>${escapeHtml(item.program_name || "—")}</td><td>${item.program_enrolled ? "Yes" : "No"}</td><td>${escapeHtml(formatDate(item.follow_up_date))}</td><td>${escapeHtml(item.assessment || "—")}</td><td>${escapeHtml(item.notes || "—")}</td><td><button class="text-button" type="button" onclick="editNutrition(${JSON.stringify(String(item.id))})">Edit</button><button class="text-button" type="button" onclick="showAudit('nutrition',${JSON.stringify(String(item.id))})">Audit</button></td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No nutrition assessments recorded.</p>';
}

function renderScreenings() {
    const items = getChildScreenings().sort((a, b) => String(b.screening_date).localeCompare(String(a.screening_date)));
    const markup = !selectedChild ? '<p class="empty-state">Select a child profile.</p>' : items.length ? `<table><thead><tr><th>Date</th><th>Tool / version</th><th>Outcome</th><th>Observations</th><th>Referral / follow-up plan</th><th>Follow-up date</th><th>Change history</th></tr></thead><tbody>
        ${items.map((item) => `<tr><td>${escapeHtml(formatDate(item.screening_date))}</td><td>${escapeHtml(item.tool_name)}${item.tool_version ? ` (${escapeHtml(item.tool_version)})` : ""}</td><td>${escapeHtml(item.outcome)}</td><td>${escapeHtml(item.observations || "—")}</td><td>${escapeHtml(item.referral_notes || "—")}</td><td>${escapeHtml(formatDate(item.follow_up_date))}</td><td><button class="text-button" type="button" onclick="editScreening(${JSON.stringify(String(item.id))})">Edit</button><button class="text-button" type="button" onclick="showAudit('screening',${JSON.stringify(String(item.id))})">Audit</button></td></tr>`).join("")}</tbody></table>` : '<p class="empty-state">No development screenings recorded.</p>';
    $("#screeningHistory").innerHTML = markup;
    $("#screeningSummary").innerHTML = items.length ? items.slice(0, 5).map((item) =>
        `<div class="screening-item"><strong>${escapeHtml(item.tool_name)} · ${escapeHtml(item.outcome)}</strong><span>${escapeHtml(formatDate(item.screening_date))}${item.follow_up_date ? ` · Follow-up ${escapeHtml(formatDate(item.follow_up_date))}` : ""}</span></div>`
    ).join("") : '<p class="empty-state">No development screenings recorded.</p>';
}

function renderImmunizationLink() {
    const target = $("#childImmunizationLink");
    const patient = patientFor(selectedChild);
    if (!selectedChild || !patient) {
        target.innerHTML = '<p class="empty-state">Link this profile to a patient record to access shared immunization history.</p>';
        return;
    }
    const records = immunizations.filter((item) => String(item.patient_id) === String(patient.id) && String(item.status).toLowerCase() !== "voided");
    const due = records.filter((item) => item.next_dose).sort((a, b) => String(a.next_dose).localeCompare(String(b.next_dose)))[0];
    target.innerHTML = `<p>${records.length} shared immunization record${records.length === 1 ? "" : "s"}.</p>${due ? `<p>Next recorded due date: <strong>${escapeHtml(formatDate(due.next_dose))}</strong> · ${escapeHtml(due.vaccine)}</p>` : "<p>No next-dose date is recorded.</p>"}<a class="secondary-button" href="immunization.html">Open immunization history</a>`;
}

function renderReport() {
    const start = $("#reportStart").value || `${new Date().getFullYear()}-01-01`;
    const end = $("#reportEnd").value || today();
    const between = (date) => date && date >= start && date <= end;
    const rangedVisits = visits.filter((item) => between(item.visit_date));
    const rangedNutrition = nutritionAssessments.filter((item) => between(item.assessment_date));
    const rangedScreenings = screenings.filter((item) => between(item.screening_date));
    const counts = [
        ["Child health profiles", childProfiles.length],
        ["Visits in range", rangedVisits.length],
        ["Nutrition assessments in range", rangedNutrition.length],
        ["Development screenings in range", rangedScreenings.length],
        ["Follow-ups due within 30 days", followupItems().filter((item) => item.days <= 30).length]
    ];
    $("#activityReport").innerHTML = counts.map(([label, value]) => `<article class="report-card"><span>${escapeHtml(label)}</span><strong>${Number(value)}</strong></article>`).join("");
}

function renderStats() {
    $("#statChildren").textContent = childProfiles.filter((child) => child.status !== "Archived").length;
    const month = today().slice(0, 7);
    $("#statVisits").textContent = visits.filter((visit) => String(visit.visit_date).slice(0, 7) === month).length;
    const latestNutritionByChild = new Map();
    nutritionAssessments.forEach((item) => {
        const current = latestNutritionByChild.get(String(item.child_id));
        if (!current || String(item.assessment_date) > String(current.assessment_date)) {
            latestNutritionByChild.set(String(item.child_id), item);
        }
    });
    $("#statNutrition").textContent = Array.from(latestNutritionByChild.values())
        .filter((item) => item.program_enrolled).length;
}

function renderAll() {
    renderChildList();
    renderProfile();
    renderVisitHistory();
    renderMeasurementChart();
    renderNutrition();
    renderScreenings();
    renderImmunizationLink();
    renderFollowups();
    renderStats();
    renderReport();
    const hasChild = Boolean(selectedChild && selectedChild.status !== "Archived");
    ["addVisitButton", "addScreeningButton", "screeningAddButton", "nutritionAddButton", "growthAddButton", "vitalsAddButton"].forEach((id) => {
        $(`#${id}`).disabled = !hasChild;
    });
}

async function loadData(preferredId) {
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        throw new Error("Supabase is not configured. Child health records cannot be loaded.");
    }
    const responses = await Promise.all([
        fetchAllRows(() => window.sb.from("patients").select("id, patient_code, first_name, middle_name, last_name, suffix, birth_date, sex, contact_number, address, status").order("last_name")),
        fetchAllRows(() => window.sb.from("child_records").select("*, patient:patients!child_records_patient_id_fkey(id, patient_code, first_name, middle_name, last_name, suffix, birth_date, sex, contact_number, address, status)").order("created_at", { ascending: false })),
        fetchAllRows(() => window.sb.from("child_visits").select("*").order("visit_date", { ascending: false })),
        fetchAllRows(() => window.sb.from("child_nutrition_assessments").select("*").order("assessment_date", { ascending: false })),
        fetchAllRows(() => window.sb.from("child_development_screenings").select("*").order("screening_date", { ascending: false })),
        fetchAllRows(() => window.sb.from("immunization_records").select("patient_id, vaccine, next_dose, status"))
    ]);
    patients = responses[0];
    childProfiles = responses[1];
    visits = responses[2];
    nutritionAssessments = responses[3];
    screenings = responses[4];
    immunizations = responses[5];
    if (preferredId) selectedChild = childProfiles.find((item) => String(item.id) === String(preferredId)) || null;
    else if (selectedChild) selectedChild = childProfiles.find((item) => String(item.id) === String(selectedChild.id)) || null;
    if (!selectedChild && childProfiles.length) {
        const requestedId = new URLSearchParams(window.location.search).get("child_id");
        const patientId = new URLSearchParams(window.location.search).get("patient_id");
        selectedChild = childProfiles.find((item) => String(item.id) === requestedId) ||
            childProfiles.find((item) => String(item.patient_id) === patientId) || childProfiles[0];
    }
    updatePatientOptions();
    renderAll();
    $("#pageMessage").hidden = true;
}

async function fetchAllRows(queryFactory) {
    const pageSize = 500;
    const rows = [];
    for (let offset = 0; ; offset += pageSize) {
        const response = await queryFactory().range(offset, offset + pageSize - 1);
        if (response.error) throw response.error;
        const page = response.data || [];
        rows.push(...page);
        if (page.length < pageSize) return rows;
    }
}

function selectChild(id) {
    selectedChild = childProfiles.find((item) => String(item.id) === String(id)) || null;
    renderAll();
}

function activateTab(id) {
    document.querySelectorAll(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === id));
    document.querySelectorAll(".tab").forEach((panel) => panel.classList.toggle("active", panel.id === id));
}

function openModal(id) {
    const modal = $(`#${id}`);
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeModal(id) {
    const modal = $(`#${id}`);
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal.show")) document.body.classList.remove("modal-open");
}

function openChildForm(childId) {
    const form = $("#childForm");
    const editing = Boolean(childId);
    const child = editing ? childProfiles.find((item) => String(item.id) === String(childId)) : null;
    form.reset();
    setFormMessage("childFormMessage", "");
    updatePatientOptions();
    $("#childModalTitle").textContent = editing ? "Edit child health profile" : "Link patient to child health";
    form.elements.child_record_id.value = child?.id || "";
    form.elements.patient_id.value = child?.patient_id || "";
    form.elements.status.value = child?.status || "Active";
    ["mother_name", "mother_contact", "blood_type", "birth_weight_kg", "allergies"].forEach((key) => {
        form.elements[key].value = child?.[key] || "";
    });
    if (!form.elements.birth_weight_kg.value && child?.birth_weight) {
        const legacyWeight = Number.parseFloat(child.birth_weight);
        if (Number.isFinite(legacyWeight)) form.elements.birth_weight_kg.value = legacyWeight;
    }
    openModal("childModal");
}

function openVisitForm() {
    if (!selectedChild || selectedChild.status === "Archived") return showMessage("Select an active child profile before recording a visit.");
    const form = $("#visitForm");
    form.reset();
    form.elements.visit_id.value = "";
    form.elements.visit_date.value = today();
    form.elements.visit_date.max = today();
    form.elements.follow_up_status.value = "Scheduled";
    setFormMessage("visitFormMessage", "");
    $("#visitModalTitle").textContent = "Record well-child visit";
    openModal("visitModal");
}

function editVisit(id) {
    const visit = visits.find((item) => String(item.id) === String(id));
    if (!visit) return;
    const form = $("#visitForm");
    form.reset();
    form.elements.visit_id.value = visit.id;
    form.elements.visit_date.value = visit.visit_date || "";
    form.elements.visit_date.max = today();
    ["visit_type", "bp", "weight_kg", "height_cm", "head_circumference_cm", "next_visit", "follow_up_status", "notes"].forEach((key) => {
        form.elements[key].value = visit[key] ?? "";
    });
    setFormMessage("visitFormMessage", "");
    $("#visitModalTitle").textContent = "Correct visit record";
    openModal("visitModal");
}

function openNutritionForm() {
    if (!selectedChild || selectedChild.status === "Archived") return showMessage("Select an active child profile before recording a nutrition assessment.");
    const form = $("#nutritionForm");
    form.reset();
    form.elements.assessment_id.value = "";
    form.elements.assessment_date.value = today();
    form.elements.assessment_date.max = today();
    form.elements.follow_up_status.value = "Scheduled";
    setFormMessage("nutritionFormMessage", "");
    openModal("nutritionModal");
}

function editNutrition(id) {
    const item = nutritionAssessments.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    const form = $("#nutritionForm");
    form.reset();
    form.elements.assessment_id.value = item.id;
    ["assessment_date", "program_name", "follow_up_date", "follow_up_status", "assessment", "notes"].forEach((key) => {
        form.elements[key].value = item[key] || "";
    });
    form.elements.program_enrolled.value = String(Boolean(item.program_enrolled));
    form.elements.assessment_date.max = today();
    setFormMessage("nutritionFormMessage", "");
    openModal("nutritionModal");
}

function openScreeningForm() {
    if (!selectedChild || selectedChild.status === "Archived") return showMessage("Select an active child profile before recording a screening.");
    const form = $("#screeningForm");
    form.reset();
    form.elements.screening_id.value = "";
    form.elements.screening_date.value = today();
    form.elements.screening_date.max = today();
    form.elements.follow_up_status.value = "Scheduled";
    setFormMessage("screeningFormMessage", "");
    openModal("screeningModal");
}

function editScreening(id) {
    const item = screenings.find((entry) => String(entry.id) === String(id));
    if (!item) return;
    const form = $("#screeningForm");
    form.reset();
    form.elements.screening_id.value = item.id;
    ["screening_date", "tool_name", "tool_version", "outcome", "observations", "referral_notes", "follow_up_date", "follow_up_status"].forEach((key) => {
        form.elements[key].value = item[key] || "";
    });
    form.elements.screening_date.max = today();
    setFormMessage("screeningFormMessage", "");
    openModal("screeningModal");
}

async function saveChild(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const patient = patients.find((item) => String(item.id) === String(values.get("patient_id")));
    if (!patient) return setFormMessage("childFormMessage", "Select a patient from the registry.");
    const existing = values.get("child_record_id");
    const payload = {
        patient_id: patient.id,
        first_name: patient.first_name,
        middle_name: patient.middle_name || null,
        last_name: patient.last_name,
        birth_date: patient.birth_date,
        sex: patient.sex || "Not recorded",
        contact_number: patient.contact_number || null,
        address: patient.address || null,
        mother_name: String(values.get("mother_name") || "").trim() || null,
        mother_contact: String(values.get("mother_contact") || "").trim() || null,
        blood_type: String(values.get("blood_type") || "").trim() || null,
        status: values.get("status") || "Active",
        birth_weight_kg: values.get("birth_weight_kg") ? Number(values.get("birth_weight_kg")) : null,
        birth_weight: values.get("birth_weight_kg") ? `${values.get("birth_weight_kg")} kg` : null,
        allergies: String(values.get("allergies") || "").trim() || null
    };
    const button = form.querySelector(".save");
    button.disabled = true;
    try {
        const query = existing
            ? window.sb.from("child_records").update(payload).eq("id", existing)
            : window.sb.from("child_records").insert(payload);
        const response = await query.select("id").single();
        if (response.error) throw response.error;
        closeModal("childModal");
        await refreshData(String(response.data.id));
    } catch (error) {
        console.error("Could not save child health profile:", error);
        setFormMessage("childFormMessage", error.message || "Could not save child profile.");
    } finally {
        button.disabled = false;
    }
}

function validateMeasurements(payload) {
    const ranges = [
        ["weight_kg", 0.3, 250, "Weight must be between 0.3 and 250 kg."],
        ["height_cm", 20, 250, "Height/length must be between 20 and 250 cm."],
        ["head_circumference_cm", 20, 80, "Head circumference must be between 20 and 80 cm."]
    ];
    for (const [field, minimum, maximum, message] of ranges) {
        if (payload[field] !== null && (payload[field] < minimum || payload[field] > maximum)) return message;
    }
    return null;
}

async function saveVisit(event) {
    event.preventDefault();
    if (!selectedChild || selectedChild.status === "Archived") return setFormMessage("visitFormMessage", "Select an active child profile first.");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const numeric = (name) => fields.get(name) === "" ? null : Number(fields.get(name));
    const payload = {
        child_id: selectedChild.id,
        visit_date: fields.get("visit_date"),
        visit_type: String(fields.get("visit_type") || "").trim(),
        bp: String(fields.get("bp") || "").trim() || null,
        weight_kg: numeric("weight_kg"),
        height_cm: numeric("height_cm"),
        head_circumference_cm: numeric("head_circumference_cm"),
        next_visit: fields.get("next_visit") || null,
        follow_up_status: fields.get("follow_up_status") || "Scheduled",
        notes: String(fields.get("notes") || "").trim() || null
    };
    if (payload.visit_date > today()) return setFormMessage("visitFormMessage", "Visit date cannot be in the future.");
    if (payload.next_visit && payload.next_visit < payload.visit_date) return setFormMessage("visitFormMessage", "Follow-up date cannot be before the visit date.");
    const invalid = validateMeasurements(payload);
    if (invalid) return setFormMessage("visitFormMessage", invalid);
    const visitId = fields.get("visit_id");
    const button = form.querySelector(".save");
    button.disabled = true;
    try {
        const query = visitId
            ? window.sb.from("child_visits").update(payload).eq("id", visitId)
            : window.sb.from("child_visits").insert(payload);
        const response = await query.select("id").single();
        if (response.error) throw response.error;
        closeModal("visitModal");
        await refreshData();
    } catch (error) {
        console.error("Could not save child visit:", error);
        setFormMessage("visitFormMessage", error.message || "Could not save visit.");
    } finally {
        button.disabled = false;
    }
}

async function completeFollowup(table, recordId) {
    if (!["child_visits", "child_nutrition_assessments", "child_development_screenings"].includes(table)) {
        return showMessage("Invalid follow-up record.");
    }
    if (!window.confirm("Mark this follow-up as completed? The original record will be retained in the audit history.")) return;
    try {
        const response = await window.sb.from(table).update({ follow_up_status: "Completed" }).eq("id", recordId);
        if (response.error) throw response.error;
        await refreshData();
    } catch (error) {
        console.error("Could not complete child health follow-up:", error);
        showMessage(`Could not update follow-up: ${error.message}`);
    }
}

async function saveNutrition(event) {
    event.preventDefault();
    if (!selectedChild || selectedChild.status === "Archived") return setFormMessage("nutritionFormMessage", "Select an active child profile first.");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
        child_id: selectedChild.id,
        assessment_date: fields.get("assessment_date"),
        program_enrolled: fields.get("program_enrolled") === "true",
        program_name: String(fields.get("program_name") || "").trim() || null,
        follow_up_date: fields.get("follow_up_date") || null,
        follow_up_status: fields.get("follow_up_status") || "Scheduled",
        assessment: String(fields.get("assessment") || "").trim() || null,
        notes: String(fields.get("notes") || "").trim() || null
    };
    if (payload.assessment_date > today()) return setFormMessage("nutritionFormMessage", "Assessment date cannot be in the future.");
    if (payload.follow_up_date && payload.follow_up_date < payload.assessment_date) return setFormMessage("nutritionFormMessage", "Follow-up date cannot be before the assessment date.");
    const assessmentId = fields.get("assessment_id");
    const button = form.querySelector(".save");
    button.disabled = true;
    try {
        const response = assessmentId
            ? await window.sb.from("child_nutrition_assessments").update(payload).eq("id", assessmentId)
            : await window.sb.from("child_nutrition_assessments").insert(payload);
        if (response.error) throw response.error;
        closeModal("nutritionModal");
        await refreshData();
    } catch (error) {
        console.error("Could not save nutrition assessment:", error);
        setFormMessage("nutritionFormMessage", error.message || "Could not save nutrition assessment.");
    } finally {
        button.disabled = false;
    }
}

async function saveScreening(event) {
    event.preventDefault();
    if (!selectedChild || selectedChild.status === "Archived") return setFormMessage("screeningFormMessage", "Select an active child profile first.");
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = {
        child_id: selectedChild.id,
        screening_date: fields.get("screening_date"),
        tool_name: String(fields.get("tool_name") || "").trim(),
        tool_version: String(fields.get("tool_version") || "").trim() || null,
        outcome: fields.get("outcome"),
        observations: String(fields.get("observations") || "").trim() || null,
        referral_notes: String(fields.get("referral_notes") || "").trim() || null,
        follow_up_date: fields.get("follow_up_date") || null,
        follow_up_status: fields.get("follow_up_status") || "Scheduled"
    };
    if (payload.screening_date > today()) return setFormMessage("screeningFormMessage", "Screening date cannot be in the future.");
    if (payload.follow_up_date && payload.follow_up_date < payload.screening_date) return setFormMessage("screeningFormMessage", "Follow-up date cannot be before the screening date.");
    const screeningId = fields.get("screening_id");
    const button = form.querySelector(".save");
    button.disabled = true;
    try {
        const response = screeningId
            ? await window.sb.from("child_development_screenings").update(payload).eq("id", screeningId)
            : await window.sb.from("child_development_screenings").insert(payload);
        if (response.error) throw response.error;
        closeModal("screeningModal");
        await refreshData();
    } catch (error) {
        console.error("Could not save development screening:", error);
        setFormMessage("screeningFormMessage", error.message || "Could not save screening.");
    } finally {
        button.disabled = false;
    }
}

async function showVisitDetails(id) {
    const visit = visits.find((item) => String(item.id) === String(id));
    if (!visit) return;
    $("#visitDetailContent").innerHTML = `<dl class="detail-grid"><dt>Date</dt><dd>${escapeHtml(formatDate(visit.visit_date))}</dd>
        <dt>Age at visit</dt><dd>${escapeHtml(ageOnDate(childBirthDate(selectedChild), visit.visit_date))}</dd>
        <dt>Visit type</dt><dd>${escapeHtml(visit.visit_type)}</dd><dt>Blood pressure</dt><dd>${escapeHtml(visit.bp || "—")}</dd>
        <dt>Weight</dt><dd>${escapeHtml(visit.weight_kg == null ? "—" : `${visit.weight_kg} kg`)}</dd>
        <dt>Height / length</dt><dd>${escapeHtml(visit.height_cm == null ? "—" : `${visit.height_cm} cm`)}</dd>
        <dt>Head circumference</dt><dd>${escapeHtml(visit.head_circumference_cm == null ? "—" : `${visit.head_circumference_cm} cm`)}</dd>
        <dt>Follow-up</dt><dd>${escapeHtml(formatDate(visit.next_visit))}</dd><dt>Notes</dt><dd>${escapeHtml(visit.notes || "—")}</dd></dl>
        <section class="audit-section"><h3>Change history</h3><div id="visitAuditHistory"><p class="empty-state">Loading audit history...</p></div></section>`;
    openModal("visitDetailModal");
    await loadAudit("visit", visit.id, "visitAuditHistory");
}

async function showAudit(recordType, recordId) {
    const labels = { profile: "Profile", nutrition: "Nutrition assessment", screening: "Development screening" };
    $("#visitDetailContent").innerHTML = `<section class="audit-section"><h3>${escapeHtml(labels[recordType] || "Record")} change history</h3><div id="visitAuditHistory"><p class="empty-state">Loading audit history...</p></div></section>`;
    openModal("visitDetailModal");
    await loadAudit(recordType, recordId, "visitAuditHistory");
}

async function loadAudit(recordType, recordId, targetId) {
    const response = await window.sb.from("child_health_audit").select("action, old_data, new_data, changed_by, changed_at")
        .eq("child_id", selectedChild.id).eq("record_type", recordType).eq("record_id", recordId).order("changed_at", { ascending: false });
    if (response.error) {
        $(`#${targetId}`).innerHTML = `<p class="inline-message error">${escapeHtml(response.error.message)}</p>`;
        return;
    }
    const entries = response.data || [];
    $(`#${targetId}`).innerHTML = entries.length ? entries.map((entry) =>
        `<article class="audit-entry"><strong>${entry.action === "INSERT" ? "Created" : "Updated"}</strong><time>${escapeHtml(new Date(entry.changed_at).toLocaleString())}${entry.changed_by ? ` · User ${escapeHtml(entry.changed_by)}` : ""}</time>
        <details><summary>View recorded change</summary><pre>${escapeHtml(JSON.stringify({ before: entry.old_data, after: entry.new_data }, null, 2))}</pre></details></article>`
    ).join("") : '<p class="empty-state">No audit history found.</p>';
}

function csvText(rows) {
    const quote = (value) => {
        let text = String(value == null ? "" : value);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    return "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
}

function downloadCsv(filename, rows) {
    const url = URL.createObjectURL(new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}

function exportFollowups() {
    const rows = [["Date", "Child", "Patient code", "Contact", "Follow-up", "Status"]];
    followupItems().forEach((item) => {
        const patient = patientFor(item.child);
        rows.push([item.date, childName(item.child), patient?.patient_code || item.child.child_code, childPhone(item.child), item.type, item.status]);
    });
    downloadCsv("child-health-followups.csv", rows);
}

function exportReport() {
    const start = $("#reportStart").value || `${new Date().getFullYear()}-01-01`;
    const end = $("#reportEnd").value || today();
    const rows = [["Record type", "Child", "Patient code", "Date", "Details"]];
    const addRows = (type, items, dateField, detail) => items.filter((item) => item[dateField] >= start && item[dateField] <= end).forEach((item) => {
        const child = childProfiles.find((profile) => String(profile.id) === String(item.child_id));
        rows.push([type, childName(child), patientFor(child)?.patient_code || child?.child_code, item[dateField], detail(item)]);
    });
    addRows("Visit", visits, "visit_date", (item) => `${item.visit_type}; weight=${item.weight_kg ?? ""} kg; height=${item.height_cm ?? ""} cm; head=${item.head_circumference_cm ?? ""} cm`);
    addRows("Nutrition", nutritionAssessments, "assessment_date", (item) => `${item.program_enrolled ? `Enrolled: ${item.program_name || "program not specified"}` : "Not enrolled"}; ${item.assessment || ""}`);
    addRows("Development screening", screenings, "screening_date", (item) => `${item.tool_name} ${item.tool_version || ""}; ${item.outcome}; ${item.observations || ""}`);
    downloadCsv("child-health-activity-report.csv", rows);
}

async function refreshData(selectedId) {
    try {
        await loadData(selectedId || (selectedChild && selectedChild.id));
        showMessage("Saved successfully.", "success");
    } catch (error) {
        console.error("Saved child health data but refresh failed:", error);
        showMessage(`Saved, but the latest data could not be refreshed: ${error.message}`);
    }
}

function loadError(error) {
    console.error("Could not load child health data:", error);
    const detail = error?.message || "Unknown database error.";
    showMessage(/child_visits|child_nutrition_assessments|child_development_screenings|child_health_audit|patient_id_fkey/i.test(detail)
        ? `The child-health database migration is required: ${detail}`
        : `Could not load child health data: ${detail}`);
    $("#childListMessage").textContent = "Child health records could not be loaded.";
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".tabs button").forEach((button) => button.addEventListener("click", () => activateTab(button.dataset.tab)));
    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) closeModal(modal.id);
        });
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") document.querySelectorAll(".modal.show").forEach((modal) => closeModal(modal.id));
    });
    $("#childSearch").addEventListener("input", renderChildList);
    $("#childStatusFilter").addEventListener("change", renderChildList);
    $("#followupSearch").addEventListener("input", renderFollowups);
    $("#followupStatus").addEventListener("change", renderFollowups);
    document.querySelectorAll(".growth-buttons button").forEach((button) => button.addEventListener("click", () => {
        activeMeasurement = button.dataset.measure;
        document.querySelectorAll(".growth-buttons button").forEach((item) => item.classList.toggle("on", item === button));
        renderMeasurementChart();
    }));
    $("#childForm").addEventListener("submit", saveChild);
    $("#visitForm").addEventListener("submit", saveVisit);
    $("#nutritionForm").addEventListener("submit", saveNutrition);
    $("#screeningForm").addEventListener("submit", saveScreening);
    $("#reportStart").value = `${new Date().getFullYear()}-01-01`;
    $("#reportEnd").value = today();
    loadData().catch(loadError);
});
