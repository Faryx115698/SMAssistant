let activePatient = null;
let vaccinationRecords = [];
let patientOptions = [];
let vaccineLots = [];
let recordBeingEdited = null;

const $ = (selector) => document.querySelector(selector);
const todayLocal = () => {
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
};

function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (character) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(String(value).slice(0, 10) + "T00:00:00");
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric"
    });
}

function dateDifference(from, to) {
    const start = new Date(String(from).slice(0, 10) + "T00:00:00");
    const end = new Date(String(to).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return Math.round((end - start) / 86400000);
}

function calculateAgeAt(birthDate, asOfDate) {
    if (!birthDate || !asOfDate) return null;
    const born = new Date(String(birthDate).slice(0, 10) + "T00:00:00");
    const at = new Date(String(asOfDate).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(born.getTime()) || Number.isNaN(at.getTime()) || at < born) return null;
    let years = at.getFullYear() - born.getFullYear();
    let months = at.getMonth() - born.getMonth();
    let days = at.getDate() - born.getDate();
    if (days < 0) months--;
    if (months < 0) {
        years--;
        months += 12;
    }
    return years > 0 ? `${years}y ${months}m` : `${Math.max(0, months)}m`;
}

function ageInYears(birthDate, asOfDate = todayLocal()) {
    if (!birthDate) return null;
    const born = new Date(String(birthDate).slice(0, 10) + "T00:00:00");
    const at = new Date(String(asOfDate).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(born.getTime()) || Number.isNaN(at.getTime()) || at < born) return null;
    let age = at.getFullYear() - born.getFullYear();
    if (at.getMonth() < born.getMonth() ||
        (at.getMonth() === born.getMonth() && at.getDate() < born.getDate())) age--;
    return age;
}

function patientName(patient) {
    return [patient && patient.first_name, patient && patient.middle_name, patient && patient.last_name, patient && patient.suffix]
        .filter(Boolean).join(" ") || "Unknown patient";
}

function getRecordDueStatus(record) {
    if (String(record.status || "").toLowerCase() === "voided") return "Voided";
    if (String(record.status || "").toLowerCase() === "completed") return "Completed";
    return getNextDoseStatus(record);
}

function getNextDoseStatus(record) {
    if (String(record.status || "").toLowerCase() === "voided") return "Voided";
    if (!record.next_dose) return record.status || "Scheduled";
    const difference = dateDifference(todayLocal(), record.next_dose);
    if (difference === null) return record.status || "Scheduled";
    if (difference < 0) return "Overdue";
    if (difference === 0) return "Due Today";
    if (difference <= 30) return "Due Soon";
    return "Scheduled";
}

function statusClass(status) {
    const value = String(status || "").toLowerCase();
    if (value === "completed") return "status-completed";
    if (value === "overdue") return "status-overdue";
    if (value === "due soon" || value === "due today") return "status-due";
    if (value === "voided") return "status-voided";
    return "status-scheduled";
}

function getStoredPatient() {
    try {
        const stored = JSON.parse(localStorage.getItem("sm_active_patient") || "null");
        return stored && stored.id ? stored : null;
    } catch (error) {
        console.warn("Could not read the selected patient:", error);
        return null;
    }
}

function showPageMessage(message, isError = true) {
    const target = $("#pageMessage");
    target.textContent = message;
    target.classList.toggle("error", isError);
    target.hidden = false;
    if (!isError) {
        window.setTimeout(() => {
            if (target.textContent === message) target.hidden = true;
        }, 5000);
    }
}

function hidePageMessage() {
    $("#pageMessage").hidden = true;
}

function showTableMessage(message) {
    $("#vaccinationBody").innerHTML = `<tr><td colspan="9" class="table-message">${escapeHtml(message)}</td></tr>`;
}

function setPatientDetails(patient) {
    const age = patient.birth_date ? ageInYears(patient.birth_date) : null;
    $("#selectedPatientName").textContent = patientName(patient);
    $("#selectedPatientMeta").innerHTML =
        `<span>Patient ID: ${escapeHtml(patient.patient_code || patient.id)}</span>` +
        (age !== null ? `<span>|</span><span>${age} yrs</span>` : "") +
        (patient.birth_date ? `<span>|</span><span>${escapeHtml(formatDate(patient.birth_date))}</span>` : "");
    $("#selectedPatientContact").innerHTML = [
        patient.contact_number ? `<span><i class="fa-solid fa-phone"></i>${escapeHtml(patient.contact_number)}</span>` : "",
        patient.address ? `<span><i class="fa-solid fa-location-dot"></i>${escapeHtml(patient.address)}</span>` : ""
    ].join("");
    $("#viewPatientProfile").href = `patient-registration.html?patient_id=${encodeURIComponent(patient.id)}`;
    $("#vaccinationPatientId").value = patient.id;
}

function saveActivePatient(patient) {
    activePatient = patient;
    if (patient) {
        localStorage.setItem("sm_active_patient_id", String(patient.id));
        localStorage.setItem("sm_active_patient", JSON.stringify(patient));
    } else {
        localStorage.removeItem("sm_active_patient_id");
        localStorage.removeItem("sm_active_patient");
    }
}

function renderPatientSelector() {
    const selector = $("#patientSelector");
    const previousId = activePatient && String(activePatient.id);
    selector.innerHTML = '<option value="">Select a patient</option>' + patientOptions.map((patient) =>
        `<option value="${escapeHtml(patient.id)}">${escapeHtml(patientName(patient))} (${escapeHtml(patient.patient_code || patient.id)})</option>`
    ).join("");
    activePatient = patientOptions.find((patient) =>
        (previousId && String(patient.id) === previousId) ||
        (!previousId && String(patient.id) === String(getStoredPatient() && getStoredPatient().id))) || null;
    selector.value = activePatient ? String(activePatient.id) : "";
    $(".patient-actions .add-button").disabled = !activePatient;
    if (activePatient) {
        setPatientDetails(activePatient);
    } else {
        $("#selectedPatientName").textContent = "No patient selected";
        $("#selectedPatientMeta").innerHTML = "<span>Choose a patient to view vaccination history.</span>";
        $("#selectedPatientContact").textContent = "";
        $("#viewPatientProfile").href = "patient-registration.html";
        $("#vaccinationPatientId").value = "";
    }
}

function updateCatalog() {
    const names = new Set();
    vaccinationRecords.forEach((record) => record.vaccine && names.add(record.vaccine.trim()));
    vaccineLots.forEach((lot) => lot.vaccine && names.add(lot.vaccine.trim()));
    $("#vaccineCatalog").innerHTML = Array.from(names).sort((a, b) => a.localeCompare(b))
        .map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");
}

function renderRecords() {
    if (!activePatient) {
        showTableMessage("Choose a patient to view vaccination history.");
        return;
    }
    const records = vaccinationRecords.filter((record) => String(record.patient_id) === String(activePatient.id));
    if (!records.length) {
        showTableMessage("No vaccination records found for this patient.");
        return;
    }
    $("#vaccinationBody").innerHTML = records.map((record) => {
        const status = getRecordDueStatus(record);
        const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
        const age = record.age_at_dose || (patient && calculateAgeAt(patient.birth_date, record.date_given)) || "—";
        return `<tr data-vaccine="${escapeHtml((record.vaccine || "").toLowerCase())}" data-status="${escapeHtml(status.toLowerCase())}" data-age="${patient && patient.birth_date ? ageInYears(patient.birth_date) : ""}">
            <td><strong>${escapeHtml(record.vaccine)}</strong></td>
            <td>${escapeHtml(record.dose)}</td>
            <td>${escapeHtml(formatDate(record.date_given))}</td>
            <td>${escapeHtml(age)}</td>
            <td><code>${escapeHtml(record.batch_no || "—")}</code></td>
            <td>${escapeHtml(record.given_by || "—")}</td>
            <td>${escapeHtml(formatDate(record.next_dose))}</td>
            <td><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></td>
            <td class="row-actions">
                <button class="btn-icon" type="button" title="Details and audit history" aria-label="Details and audit history" onclick="showRecordHistory(${escapeHtml(JSON.stringify(String(record.id)))})"><i class="fa-regular fa-eye"></i></button>
                <button class="btn-icon" type="button" title="Edit record" aria-label="Edit record" onclick="editRecord(${escapeHtml(JSON.stringify(String(record.id)))})"><i class="fa-solid fa-pen"></i></button>
                ${status !== "Voided" ? `<button class="btn-icon danger-action" type="button" title="Void record" aria-label="Void record" onclick="voidRecord(${escapeHtml(JSON.stringify(String(record.id)))})"><i class="fa-solid fa-ban"></i></button>` : ""}
            </td>
        </tr>`;
    }).join("");
    applyFilters();
}

function renderDueQueue() {
    const target = $("#upcomingVaccinations");
    const dueRecords = vaccinationRecords.filter((record) => record.next_dose && getNextDoseStatus(record) !== "Voided")
        .sort((a, b) => String(a.next_dose).localeCompare(String(b.next_dose)));
    if (!dueRecords.length) {
        target.innerHTML = '<p class="empty-state">No upcoming or overdue doses are recorded.</p>';
        return;
    }
    const search = $("#scheduleSearch").value.trim().toLowerCase();
    const statusFilter = $("#scheduleStatusFilter").value;
    const filtered = dueRecords.filter((record) => {
        const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
        const status = getNextDoseStatus(record);
        return (!statusFilter || status === statusFilter) &&
            (!search || `${patientName(patient)} ${record.vaccine} ${record.dose} ${patient && patient.contact_number || ""}`.toLowerCase().includes(search));
    });
    if (!filtered.length) {
        target.innerHTML = '<p class="empty-state">No doses match these queue filters.</p>';
        return;
    }
    target.innerHTML = `<div class="queue-table-wrap"><table class="vaccination-table queue-table">
        <thead><tr><th>Due date</th><th>Patient</th><th>Vaccine / dose</th><th>Contact</th><th>Status</th><th></th></tr></thead>
        <tbody>${filtered.map((record) => {
            const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
            const status = getNextDoseStatus(record);
            return `<tr><td>${escapeHtml(formatDate(record.next_dose))}</td><td>${escapeHtml(patientName(patient))}</td>
                <td>${escapeHtml(record.vaccine)} / ${escapeHtml(record.dose)}</td>
                <td>${escapeHtml(patient && patient.contact_number || "—")}</td>
                <td><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></td>
                <td><button class="secondary-button" type="button" onclick="selectPatient(${escapeHtml(JSON.stringify(String(record.patient_id)))})">Open record</button></td></tr>`;
        }).join("")}</tbody></table></div>`;
}

function renderInventory() {
    const today = todayLocal();
    const sortedLots = vaccineLots.slice().sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
    $("#vaccineInventoryBody").innerHTML = sortedLots.length ? sortedLots.map((lot) => {
        const expired = lot.expiry_date < today;
        return `<tr><td><strong>${escapeHtml(lot.vaccine)}</strong></td><td>${escapeHtml(lot.manufacturer || "—")}</td>
            <td><code>${escapeHtml(lot.lot_number)}</code></td><td>${escapeHtml(formatDate(lot.expiry_date))}
            ${expired ? '<span class="status-pill status-overdue">Expired</span>' : ""}</td>
            <td>${Number(lot.quantity_available)}</td>
            <td>${Number(lot.quantity_received)}</td><td>${escapeHtml(formatDate(lot.received_date))} / ${escapeHtml(lot.received_by)}</td></tr>`;
    }).join("") : '<tr><td colspan="7" class="table-message">No vaccine lots received yet.</td></tr>';
    $("#inventoryMessage").textContent = sortedLots.length
        ? `${sortedLots.length} vaccine lot${sortedLots.length === 1 ? "" : "s"} recorded. Expired lots remain in history and cannot be used.`
        : "Receive a lot to start tracking vaccine stock.";

    $("#vaccineMovementBody").innerHTML = stockMovements.length ? stockMovements.map((movement) => {
        const lot = movement.vaccine_inventory_lots || {};
        const patient = movement.patients || {};
        const movementLabels = { receipt: "Receipt", administration: "Administered", correction: "Correction" };
        return `<tr><td>${escapeHtml(formatDate(movement.created_at))}</td>
            <td>${escapeHtml(lot.vaccine || "—")} / ${escapeHtml(lot.lot_number || "—")}</td>
            <td>${escapeHtml(movementLabels[movement.movement_type] || movement.movement_type)}</td>
            <td>${Number(movement.quantity) > 0 ? "+" : ""}${Number(movement.quantity)}</td>
            <td>${escapeHtml(patientName(patient))}${movement.received_by ? ` / ${escapeHtml(movement.received_by)}` : ""}</td>
            <td>${escapeHtml(movement.notes || "—")}</td></tr>`;
    }).join("") : '<tr><td colspan="6" class="table-message">No stock movements recorded.</td></tr>';
}

function renderReport() {
    const year = String(new Date().getFullYear());
    const allThisYear = vaccinationRecords.filter((record) =>
        record.date_given && String(record.date_given).slice(0, 4) === year);
    const thisYear = allThisYear.filter((record) => String(record.status).toLowerCase() !== "voided");
    const completed = thisYear.filter((record) => String(record.status).toLowerCase() === "completed").length;
    const total = thisYear.length;
    const percent = total ? Math.round(completed / total * 100) : 0;
    $("#coveragePercent").textContent = `${percent}%`;
    $("#coverageDonut").style.setProperty("--coverage", `${percent}%`);
    $("#coverageCompleted").textContent = completed;
    $("#coverageOther").textContent = total - completed;
    $("#coverageTotal").textContent = total;
    $("#statTotalPatients").textContent = patientOptions.length;
    $("#statFullyImmunized").textContent = vaccinationRecords.filter((record) =>
        String(record.status).toLowerCase() === "completed").length;
    const currentMonth = todayLocal().slice(0, 7);
    const dueRecords = vaccinationRecords.filter((record) =>
        record.next_dose && getNextDoseStatus(record) !== "Voided");
    $("#statDueThisMonth").textContent = dueRecords.filter((record) =>
        record.next_dose >= todayLocal() && String(record.next_dose).slice(0, 7) === currentMonth).length;
    $("#statOverdue").textContent = dueRecords.filter((record) =>
        getNextDoseStatus(record) === "Overdue").length;
    $("#statVaccinesToday").textContent = dueRecords.filter((record) =>
        record.next_dose === todayLocal()).length;
    const groups = new Map();
    allThisYear.forEach((record) => {
        const key = record.vaccine || "Unspecified";
        if (!groups.has(key)) groups.set(key, { completed: 0, scheduled: 0, voided: 0, total: 0 });
        const group = groups.get(key);
        group.total++;
        const status = String(record.status || "").toLowerCase();
        if (status === "completed") group.completed++;
        else if (status === "voided") group.voided++;
        else group.scheduled++;
    });
    $("#reportBreakdownBody").innerHTML = groups.size ? Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, group]) => `<tr><td>${escapeHtml(name)}</td><td>${group.completed}</td><td>${group.scheduled}</td><td>${group.voided}</td><td>${group.total}</td></tr>`).join("")
        : '<tr><td colspan="5" class="table-message">No doses recorded this year.</td></tr>';
}

let stockMovements = [];

async function loadAll() {
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        showPageMessage("Supabase is not configured. Immunization data cannot be loaded.");
        showTableMessage("Supabase is not configured.");
        return;
    }
    const [patients, records, lots, movements] = await Promise.all([
        window.sb.from("patients").select("id, patient_code, first_name, middle_name, last_name, suffix, birth_date, contact_number, address").order("last_name"),
        window.sb.from("immunization_records").select("id, patient_id, vaccine, dose, date_given, age_at_dose, batch_no, given_by, next_dose, status, administration_source, inventory_lot_id, created_at").order("date_given", { ascending: false, nullsFirst: false }),
        window.sb.from("vaccine_inventory_lots").select("*").order("expiry_date"),
        window.sb.from("vaccine_stock_movements").select("id, lot_id, movement_type, quantity, patient_id, received_by, notes, created_at, vaccine_inventory_lots(vaccine, lot_number), patients(first_name, middle_name, last_name)").order("created_at", { ascending: false }).limit(100)
    ]);
    for (const response of [patients, records, lots, movements]) {
        if (response.error) throw response.error;
    }
    patientOptions = patients.data || [];
    vaccinationRecords = records.data || [];
    vaccineLots = lots.data || [];
    stockMovements = movements.data || [];
    renderPatientSelector();
    renderRecords();
    renderDueQueue();
    renderInventory();
    renderReport();
    updateCatalog();
    hidePageMessage();
}

function applyFilters() {
    const search = $("#vaccineSearch").value.toLowerCase().trim();
    const status = $("#statusFilter").value.toLowerCase();
    const age = $("#ageFilter").value;
    document.querySelectorAll("#vaccinationBody tr").forEach((row) => {
        const patient = activePatient;
        const years = patient && patient.birth_date ? ageInYears(patient.birth_date) : null;
        const matchesAge = !age || (years !== null && (age === "child" ? years < 18 : years >= 18));
        const matchesSearch = !search || (row.dataset.vaccine || "").includes(search);
        const matchesStatus = !status || (row.dataset.status || "") === status.toLowerCase();
        row.style.display = matchesAge && matchesSearch && matchesStatus ? "" : "none";
    });
}

function selectPatient(patientId) {
    const patient = patientOptions.find((item) => String(item.id) === String(patientId));
    if (!patient) return;
    saveActivePatient(patient);
    $("#patientSelector").value = String(patient.id);
    setPatientDetails(patient);
    renderRecords();
    document.querySelector('[data-tab="records"]').click();
}

function setLotOptions(selectedId, vaccineName) {
    const selector = $("#inventoryLotSelector");
    const today = todayLocal();
    const validLots = vaccineLots.filter((lot) =>
        String(lot.vaccine).trim().toLowerCase() === String(vaccineName || "").trim().toLowerCase() &&
        (lot.expiry_date >= today || String(lot.id) === String(selectedId)) &&
        (Number(lot.quantity_available) > 0 || String(lot.id) === String(selectedId)));
    selector.innerHTML = '<option value="">Select an available lot</option>' + validLots.map((lot) =>
        `<option value="${escapeHtml(lot.id)}">${escapeHtml(lot.lot_number)} — expires ${escapeHtml(formatDate(lot.expiry_date))} — ${Number(lot.quantity_available)} available</option>`
    ).join("");
    selector.value = selectedId ? String(selectedId) : "";
}

function toggleStockSelection() {
    const clinic = $("#administrationSource").value === "clinic";
    const status = $("#vaccinationForm").elements.status.value;
    $("#stockLotField").hidden = !clinic;
    $("#inventoryLotSelector").required = clinic && status === "Completed";
    $("#inventoryLotSelector").disabled = !clinic || status !== "Completed";
    if (!clinic || status !== "Completed") $("#inventoryLotSelector").value = "";
}

function resetFormMessage() {
    const message = $("#vaccinationFormMessage");
    message.hidden = true;
    message.textContent = "";
}

function showFormMessage(selector, message) {
    const target = $(selector);
    target.textContent = message;
    target.hidden = false;
}

function openModal() {
    if (!activePatient) return showPageMessage("Select a patient before adding an immunization record.");
    recordBeingEdited = null;
    const form = $("#vaccinationForm");
    form.reset();
    resetFormMessage();
    $("#vaccinationModalTitle").textContent = "Add Vaccination Record";
    form.elements.patient_id.value = activePatient.id;
    form.elements.date_given.value = todayLocal();
    form.elements.date_given.max = todayLocal();
    form.elements.status.value = "Completed";
    form.elements.administration_source.value = "external";
    setLotOptions(null, "");
    toggleStockSelection();
    $("#vaccinationModal").classList.add("show");
}

function closeModal() {
    $("#vaccinationModal").classList.remove("show");
}

function openStockForm() {
    const form = $("#stockForm");
    form.reset();
    $("#stockFormMessage").hidden = true;
    form.elements.received_date.value = todayLocal();
    form.elements.received_date.max = todayLocal();
    const tomorrow = new Date(`${todayLocal()}T00:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    form.elements.expiry_date.min = [
        tomorrow.getFullYear(), String(tomorrow.getMonth() + 1).padStart(2, "0"), String(tomorrow.getDate()).padStart(2, "0")
    ].join("-");
    $("#stockModal").classList.add("show");
}

function closeStockForm() {
    $("#stockModal").classList.remove("show");
}

function editRecord(recordId) {
    const record = vaccinationRecords.find((item) => Number(item.id) === Number(recordId));
    if (!record || String(record.status).toLowerCase() === "voided") return;
    const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
    if (!patient) return showPageMessage("The patient for this record could not be found.");
    saveActivePatient(patient);
    $("#patientSelector").value = String(patient.id);
    setPatientDetails(patient);
    recordBeingEdited = record;
    const form = $("#vaccinationForm");
    form.reset();
    resetFormMessage();
    $("#vaccinationModalTitle").textContent = "Edit Immunization Record";
    form.elements.patient_id.value = record.patient_id;
    form.elements.date_given.max = todayLocal();
    ["vaccine", "dose", "date_given", "age_at_dose", "batch_no", "given_by", "next_dose", "status"].forEach((key) => {
        form.elements[key].value = record[key] || "";
    });
    form.elements.administration_source.value = record.administration_source || "external";
    setLotOptions(record.inventory_lot_id, record.vaccine);
    $("#vaccinationModal").classList.add("show");
    toggleStockSelection();
}

async function showRecordHistory(recordId) {
    const record = vaccinationRecords.find((item) => Number(item.id) === Number(recordId));
    if (!record) return;
    const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
    $("#recordDetails").innerHTML = `<dl class="record-detail-grid">
        <dt>Patient</dt><dd>${escapeHtml(patientName(patient))}</dd>
        <dt>Vaccine / dose</dt><dd>${escapeHtml(record.vaccine)} / ${escapeHtml(record.dose)}</dd>
        <dt>Status</dt><dd>${escapeHtml(getRecordDueStatus(record))}</dd>
        <dt>Date given</dt><dd>${escapeHtml(formatDate(record.date_given))}</dd>
        <dt>Next dose</dt><dd>${escapeHtml(formatDate(record.next_dose))}</dd>
        <dt>Batch</dt><dd>${escapeHtml(record.batch_no || "—")}</dd>
        <dt>Given by</dt><dd>${escapeHtml(record.given_by || "—")}</dd>
        <dt>Source</dt><dd>${record.administration_source === "clinic" ? "Clinic stock" : "External / not tracked"}</dd>
    </dl>`;
    $("#recordAuditHistory").innerHTML = '<p class="empty-state">Loading record history...</p>';
    $("#auditModal").classList.add("show");
    const response = await window.sb.from("immunization_record_audit").select("id, action, old_data, new_data, changed_by, changed_at").eq("record_id", record.id).order("changed_at", { ascending: false });
    if (response.error) {
        $("#recordAuditHistory").innerHTML = `<p class="form-message">${escapeHtml(response.error.message)}</p>`;
        return;
    }
    const entries = response.data || [];
    $("#recordAuditHistory").innerHTML = entries.length ? entries.map((entry) =>
        `<article class="audit-entry"><strong>${escapeHtml(entry.action === "UPDATE" ? "Updated" : entry.action)}</strong>
        <time>${escapeHtml(new Date(entry.changed_at).toLocaleString())}${entry.changed_by ? ` · User ${escapeHtml(entry.changed_by)}` : ""}</time>
        <details><summary>View recorded change</summary><pre>${escapeHtml(JSON.stringify({ before: entry.old_data, after: entry.new_data }, null, 2))}</pre></details></article>`
    ).join("") : '<p class="empty-state">No changes have been made to this record.</p>';
}

function closeAuditModal() {
    $("#auditModal").classList.remove("show");
}

async function voidRecord(recordId) {
    const record = vaccinationRecords.find((item) => Number(item.id) === Number(recordId));
    if (!record || String(record.status).toLowerCase() === "voided") return;
    if (!window.confirm("Void this immunization record? It will remain in the audit history. If it used a vaccine lot, that dose will be returned to available stock.")) return;
    const response = await window.sb.from("immunization_records").update({ status: "Voided" }).eq("id", record.id);
    if (response.error) {
        showPageMessage(`Could not void the record: ${response.error.message}`);
        return;
    }
    await reloadAfterChange();
}

async function reloadAfterChange() {
    try {
        await loadAll();
        showPageMessage("Changes saved successfully.", false);
    } catch (error) {
        console.error("Could not refresh immunization data:", error);
        showPageMessage(`Changes were saved, but data could not be refreshed: ${error.message}`);
    }
}

function toCsv(rows) {
    const quote = (value) => {
        let text = String(value == null ? "" : value);
        if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    };
    return "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
}

function downloadCsv(filename, rows) {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function exportDueQueue() {
    const records = vaccinationRecords.filter((record) => record.next_dose && getNextDoseStatus(record) !== "Voided")
        .sort((a, b) => String(a.next_dose).localeCompare(String(b.next_dose)));
    const rows = [["Due date", "Patient", "Patient ID", "Contact", "Vaccine", "Dose", "Status"]];
    records.forEach((record) => {
        const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
        rows.push([record.next_dose, patientName(patient), patient && (patient.patient_code || patient.id),
            patient && patient.contact_number, record.vaccine, record.dose, getNextDoseStatus(record)]);
    });
    downloadCsv("immunization-due-contacts.csv", rows);
}

function exportImmunizationReport() {
    const rows = [["Patient", "Patient ID", "Vaccine", "Dose", "Date given", "Age at dose", "Batch", "Given by", "Next dose", "Status", "Source"]];
    vaccinationRecords.forEach((record) => {
        const patient = patientOptions.find((item) => String(item.id) === String(record.patient_id));
        rows.push([patientName(patient), patient && (patient.patient_code || patient.id), record.vaccine, record.dose,
            record.date_given, record.age_at_dose, record.batch_no, record.given_by, record.next_dose,
            getRecordDueStatus(record), record.administration_source || "external"]);
    });
    downloadCsv("immunization-report.csv", rows);
}

async function saveVaccination(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const status = String(fields.get("status") || "Completed");
    const source = String(fields.get("administration_source") || "external");
    const lotId = fields.get("inventory_lot_id") || null;
    if (!activePatient) return showFormMessage("#vaccinationFormMessage", "Select a patient first.");
    if (status === "Completed" && !fields.get("date_given")) {
        return showFormMessage("#vaccinationFormMessage", "Enter the date the dose was given.");
    }
    if (status === "Completed" && fields.get("date_given") > todayLocal()) {
        return showFormMessage("#vaccinationFormMessage", "A completed dose cannot have a future administration date.");
    }
    if (source === "clinic" && status === "Completed" && !lotId) {
        return showFormMessage("#vaccinationFormMessage", "Select a vaccine lot for a completed clinic-administered dose.");
    }
    const chosenLot = lotId && vaccineLots.find((lot) => String(lot.id) === String(lotId));
    if (source === "clinic" && status === "Completed" && !chosenLot) {
        return showFormMessage("#vaccinationFormMessage", "The selected lot is no longer available. Refresh and choose another lot.");
    }
    if (chosenLot && chosenLot.expiry_date < todayLocal() && String(recordBeingEdited && recordBeingEdited.inventory_lot_id) !== String(chosenLot.id)) {
        return showFormMessage("#vaccinationFormMessage", "Expired vaccine lots cannot be used.");
    }
    const record = {
        patient_id: activePatient.id,
        vaccine: String(fields.get("vaccine") || "").trim(),
        dose: String(fields.get("dose") || "").trim(),
        date_given: fields.get("date_given") || null,
        age_at_dose: fields.get("age_at_dose") || calculateAgeAt(activePatient.birth_date, fields.get("date_given")) || null,
        batch_no: chosenLot && source === "clinic" && status === "Completed" ? chosenLot.lot_number : String(fields.get("batch_no") || "").trim() || null,
        given_by: String(fields.get("given_by") || "").trim() || null,
        next_dose: fields.get("next_dose") || null,
        status,
        administration_source: source,
        inventory_lot_id: source === "clinic" && status === "Completed" ? lotId : null
    };
    if (!record.vaccine || !record.dose) return showFormMessage("#vaccinationFormMessage", "Vaccine and dose are required.");
    const button = form.querySelector(".save-button");
    button.disabled = true;
    resetFormMessage();
    try {
        const response = recordBeingEdited
            ? await window.sb.from("immunization_records").update(record).eq("id", recordBeingEdited.id)
            : await window.sb.from("immunization_records").insert(record);
        if (response.error) throw response.error;
        closeModal();
        await reloadAfterChange();
    } catch (error) {
        console.error("Could not save immunization record:", error);
        showFormMessage("#vaccinationFormMessage", error.message || "Unknown database error.");
    } finally {
        button.disabled = false;
    }
}

async function receiveStock(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    if (fields.get("received_date") > todayLocal()) {
        return showFormMessage("#stockFormMessage", "Received date cannot be in the future.");
    }
    if (fields.get("expiry_date") <= todayLocal()) {
        return showFormMessage("#stockFormMessage", "Expired lots cannot be received into usable stock.");
    }
    const button = form.querySelector(".save-button");
    button.disabled = true;
    $("#stockFormMessage").hidden = true;
    try {
        const response = await window.sb.rpc("receive_vaccine_stock", {
            p_vaccine: String(fields.get("vaccine") || "").trim(),
            p_manufacturer: String(fields.get("manufacturer") || "").trim() || null,
            p_lot_number: String(fields.get("lot_number") || "").trim(),
            p_expiry_date: fields.get("expiry_date"),
            p_quantity: Number(fields.get("quantity")),
            p_received_date: fields.get("received_date"),
            p_received_by: String(fields.get("received_by") || "").trim(),
            p_notes: String(fields.get("notes") || "").trim() || null
        });
        if (response.error) throw response.error;
        closeStockForm();
        form.reset();
        await reloadAfterChange();
    } catch (error) {
        console.error("Could not receive vaccine stock:", error);
        showFormMessage("#stockFormMessage", error.message || "Unknown database error.");
    } finally {
        button.disabled = false;
    }
}

function handleDatabaseError(error) {
    console.error("Could not load immunization data:", error);
    const message = error && error.message || "Unknown database error.";
    showPageMessage(/vaccine_inventory_lots|vaccine_stock_movements|immunization_record_audit|administration_source|inventory_lot_id/i.test(message)
        ? `The immunization database update is required before this page can load: ${message}`
        : `Could not load immunization data: ${message}`);
    showTableMessage("Immunization data could not be loaded.");
}

document.addEventListener("DOMContentLoaded", () => {
    $("#vaccinationForm").addEventListener("submit", saveVaccination);
    $("#stockForm").addEventListener("submit", receiveStock);
    $("#patientSelector").addEventListener("change", (event) => {
        const patient = patientOptions.find((item) => String(item.id) === event.target.value);
        saveActivePatient(patient || null);
        renderPatientSelector();
        renderRecords();
    });
    ["vaccineSearch", "statusFilter", "ageFilter"].forEach((id) => $(`#${id}`).addEventListener("input", applyFilters));
    $("#scheduleSearch").addEventListener("input", renderDueQueue);
    $("#scheduleStatusFilter").addEventListener("change", renderDueQueue);
    $("#administrationSource").addEventListener("change", toggleStockSelection);
    $("#vaccinationForm").elements.status.addEventListener("change", toggleStockSelection);
    $("#vaccinationForm").elements.vaccine.addEventListener("input", () => {
        setLotOptions(null, $("#vaccinationForm").elements.vaccine.value);
    });
    $("#vaccinationModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) closeModal();
    });
    $("#stockModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) closeStockForm();
    });
    $("#auditModal").addEventListener("click", (event) => {
        if (event.target === event.currentTarget) closeAuditModal();
    });
    document.querySelectorAll(".record-tab").forEach((tab) => tab.addEventListener("click", () => {
        document.querySelectorAll(".record-tab").forEach((item) => item.classList.toggle("active", item === tab));
        document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.toggle("active", panel.id === tab.dataset.tab));
    }));
    loadAll().catch(handleDatabaseError);
});
