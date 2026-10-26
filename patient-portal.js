/**
 * Patient Portal Logic - Barangay Talimundoc Health Center
 * Mobile-First, Responsive & Adaptive UI Controller
 */

const portalState = {
    user: null,
    patient: null,
    consultations: [],
    vitals: [],
    prescriptions: [],
    appointments: [],
    certificates: [],
    refills: [],
    programRegistrations: [],
    announcements: [],
    notificationReads: []
};

document.addEventListener("DOMContentLoaded", async function () {
    try {
        const authenticated = await initAuthAndUserData();
        if (!authenticated) return;
        await loadPortalData();
        document.getElementById("mainContent").classList.remove("portal-loading");
        initTabRouting();
        initMobileDrawer();
        initDarkMode();
        initFormHandlers();
        initNotifications();
    } catch (error) {
        console.error("Patient portal initialization failed:", error);
        const message = error.code === "PGRST205" || error.code === "42P01"
            ? "Patient portal data is not set up yet. Run patient-portal-migration.sql in the Supabase SQL Editor, then reload."
            : error.code === "42501"
                ? "Your account is not authorized to view this patient data. Contact the health center."
                : error.message || "Could not load your patient portal data.";
        showPortalError(message);
    }
});

/* --------------------------------------------------------------------------
   1. User Session & Auth Initialization
   -------------------------------------------------------------------------- */
async function initAuthAndUserData() {
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        window.location.replace("login.html");
        return false;
    }

    const signOutBtn = document.getElementById("residentSignOutBtn");
    if (signOutBtn) {
        signOutBtn.addEventListener("click", async function () {
            signOutBtn.disabled = true;
            try {
                const { error } = await window.sb.auth.signOut();
                if (error) throw error;
                window.location.replace("login.html");
            } catch (error) {
                signOutBtn.disabled = false;
                showToast(`Could not sign out: ${error.message}`, "error");
            }
        });
    }

    const { data, error } = await window.sb.auth.getSession();
    if (error) throw error;
    if (!data.session || !data.session.user) {
        window.location.replace("login.html");
        return false;
    }
    portalState.user = data.session.user;
    return true;
}

function updateResidentUI(patient) {
    const name = [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
        .filter(Boolean).join(" ");
    const id = patient.patient_code || `PR-${String(patient.id).padStart(6, "0")}`;
    const sidebarName = document.getElementById("sidebarResidentName");
    const sidebarId = document.getElementById("sidebarResidentId");
    const headerName = document.getElementById("headerResidentName");
    const certInput = document.getElementById("certFullName");
    const recordName = document.getElementById("recordResidentName");
    const recordId = document.getElementById("recordResidentId");
    const dashWelcomeFull = document.getElementById("dashWelcomeFullName");
    const profileBoxName = document.getElementById("profileBoxName");
    const profileBoxId = document.getElementById("profileBoxId");
    const profileCivil = document.getElementById("profileCivilStatus");
    const profileAddress = document.getElementById("profileAddress");
    const profileContact = document.getElementById("profileContact");
    const profileSex = document.getElementById("profileSex");
    const profileBirthDate = document.getElementById("profileBirthDate");
    const profileEmail = document.getElementById("profileEmail");
    const profileBloodType = document.getElementById("profileBloodType");
    const profileHeight = document.getElementById("profileHeight");
    const profileWeight = document.getElementById("profileWeight");
    const profileAllergies = document.getElementById("profileAllergies");
    const profileConditions = document.getElementById("profileConditions");
    const recordMeta = document.getElementById("recordPatientMeta");
    const downloadName = document.getElementById("downloadPatientName");

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarId) sidebarId.textContent = "ID: " + id;
    if (headerName) headerName.textContent = name;
    if (certInput) certInput.value = name;
    if (recordName) recordName.textContent = name;
    if (recordId) recordId.textContent = "ID: " + id;
    if (dashWelcomeFull) dashWelcomeFull.textContent = name;
    if (profileBoxName) profileBoxName.textContent = name;
    if (profileBoxId) profileBoxId.textContent = id;
    if (profileCivil) profileCivil.textContent = patient.civil_status || "Not recorded";
    if (profileAddress) profileAddress.textContent = patient.address || "Not recorded";
    if (profileContact) profileContact.textContent = patient.contact_number || "Not recorded";
    if (profileSex) profileSex.textContent = patient.sex || "Not recorded";
    if (profileBirthDate) profileBirthDate.textContent = formatPortalDate(patient.birth_date);
    if (profileEmail) profileEmail.textContent = patient.email || portalState.user.email || "Not recorded";
    if (profileBloodType) profileBloodType.textContent = patient.blood_type || "Not recorded";
    if (profileHeight) profileHeight.textContent = patient.height || "Not recorded";
    if (profileWeight) profileWeight.textContent = patient.weight || "Not recorded";
    if (profileAllergies) profileAllergies.textContent = patient.allergies || "Not recorded";
    if (profileConditions) profileConditions.textContent = patient.medical_conditions || "Not recorded";
    if (recordMeta) {
        const age = calculatePatientAge(patient.birth_date);
        recordMeta.textContent = [
            age === null ? null : `Age: ${age}`,
            patient.sex ? `Gender: ${patient.sex}` : null,
            patient.blood_type ? `Blood Type: ${patient.blood_type}` : null
        ].filter(Boolean).join(" | ") || "No demographic details recorded";
    }
    if (downloadName) downloadName.textContent = `${name} (ID: ${id})`;
}

async function loadPortalData() {
    const { data: patients, error: patientError } = await window.sb
        .from("patients").select("*").limit(2);
    if (patientError) throw patientError;
    if (!patients || patients.length !== 1) {
        throw new Error("No unique patient record is linked to this account. Ask the health center to verify that your account email matches the email on your patient record.");
    }

    portalState.patient = patients[0];
    const patientId = portalState.patient.id;
    const results = await Promise.all([
        window.sb.from("health_profiles").select("*").eq("patient_id", patientId).limit(1).maybeSingle(),
        window.sb.from("consultations").select("*").eq("patient_id", patientId).order("consultation_date", { ascending: false }),
        window.sb.from("vital_signs").select("*, consultations!inner(patient_id)").eq("consultations.patient_id", patientId).order("created_at", { ascending: false }),
        window.sb.from("prescriptions").select("*, consultations!inner(patient_id, consultation_date, provider_name)").eq("consultations.patient_id", patientId).order("created_at", { ascending: false }),
        window.sb.from("appointments").select("*").eq("patient_id", patientId).order("appointment_date", { ascending: true }),
        window.sb.from("patient_certificate_requests").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
        window.sb.from("patient_refill_requests").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
        window.sb.from("patient_program_registrations").select("*").eq("patient_id", patientId).order("created_at", { ascending: false }),
        window.sb.from("announcements").select("*").order("date_posted", { ascending: false }),
        window.sb.from("patient_notification_reads").select("notification_key").eq("patient_id", patientId)
    ]);
    results.forEach(result => {
        if (result.error) throw result.error;
    });

    const [health, consultations, vitals, prescriptions, appointments, certificates,
        refills, registrations, announcements, notificationReads] = results.map(result => result.data);
    if (health) {
        portalState.patient = { ...portalState.patient, ...health };
    }
    portalState.consultations = consultations || [];
    portalState.vitals = vitals || [];
    portalState.prescriptions = prescriptions || [];
    portalState.appointments = appointments || [];
    portalState.certificates = certificates || [];
    portalState.refills = refills || [];
    portalState.programRegistrations = registrations || [];
    portalState.announcements = announcements || [];
    portalState.notificationReads = notificationReads || [];

    updateResidentUI(portalState.patient);
    renderPortalData();
}

function renderPortalData() {
    renderVitals();
    renderConsultations();
    renderPrescriptions();
    renderAppointments();
    renderCertificateRequests();
    renderAnnouncements();
    renderNotifications();
    renderDashboard();
    renderProgramRegistrations();
}

function renderVitals() {
    const container = document.getElementById("vitalsGrid");
    if (!container) return;
    container.replaceChildren();
    const latest = portalState.vitals[0];
    const entries = latest ? [
        ["Blood Pressure", latest.blood_pressure, "mmHg"],
        ["Heart Rate", latest.heart_rate, "bpm"],
        ["Temperature", latest.temperature, "°C"],
        ["Oxygen Saturation", latest.oxygen_saturation, "%"]
    ] : [];
    const recorded = entries.filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (!recorded.length) {
        container.appendChild(emptyMessage("No vital signs are available in your records."));
        return;
    }
    recorded.forEach(([label, value, unit]) => {
        const card = createElement("div", "vital-stat-card");
        card.append(createElement("span", "vital-label", label));
        const result = createElement("div", "vital-value");
        result.append(document.createTextNode(String(value) + " "));
        result.append(createElement("small", "", unit));
        card.append(result);
        card.append(createElement("div", "vital-status", `Recorded ${formatPortalDate(latest.created_at)}`));
        container.appendChild(card);
    });
}

function renderConsultations() {
    const tableBody = document.getElementById("consultationHistory");
    const recentList = document.getElementById("recentConsultations");
    if (!tableBody) return;
    tableBody.replaceChildren();
    if (recentList) recentList.replaceChildren();
    if (!portalState.consultations.length) {
        const row = document.createElement("tr");
        const cell = createElement("td", "", "No consultation records are available.");
        cell.colSpan = 5;
        row.appendChild(cell);
        tableBody.appendChild(row);
        if (recentList) recentList.appendChild(emptyMessage("No recent consultations."));
        return;
    }
    portalState.consultations.forEach(consultation => {
        const diagnosis = consultation.primary_diagnosis || consultation.visit_type || "Consultation";
        const date = formatPortalDate(consultation.consultation_date);
        const row = document.createElement("tr");
        row.append(
            createElement("td", "", date),
            createElement("td", "", diagnosis),
            createElement("td", "", consultation.provider_name || "Health center"),
            createElement("td", "", consultation.status || "Recorded")
        );
        const actionCell = document.createElement("td");
        const button = createElement("button", "btn-view-summary", "View Summary");
        button.type = "button";
        button.addEventListener("click", () => openConsultationSummaryModal(
            date, diagnosis, consultation.provider_name || "Health center",
            consultation.notes || consultation.treatment_plan || consultation.chief_complaint || "No additional notes are available."
        ));
        actionCell.appendChild(button);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
        if (recentList && recentList.childElementCount < 3) {
            const recent = createElement("div", "consultation-row");
            const details = createElement("div", "consult-info");
            details.append(createElement("h4", "", diagnosis));
            details.append(createElement("p", "", consultation.provider_name || "Health center"));
            const meta = createElement("div", "consult-meta");
            meta.append(createElement("span", "consult-date", date));
            meta.append(createElement("span", "badge-status badge-status-completed", consultation.status || "Recorded"));
            recent.append(details, meta);
            recentList.appendChild(recent);
        }
    });
}

function renderPrescriptions() {
    const container = document.getElementById("prescriptionList");
    if (!container) return;
    container.replaceChildren();
    if (!portalState.prescriptions.length) {
        container.appendChild(emptyMessage("No prescriptions are available in your records."));
        return;
    }
    portalState.prescriptions.forEach(prescription => {
        const card = createElement("article", "rx-card");
        const top = createElement("div", "rx-card-top");
        top.append(createElement("h3", "rx-name", prescription.medicine));
        top.append(createElement("span", "rx-badge-active", "Prescribed"));
        card.append(top);
        card.append(createElement("div", "rx-dosage",
            [prescription.dose, prescription.frequency, prescription.duration, prescription.instructions].filter(Boolean).join(" - ") || "Follow the instructions provided by your clinician."));
        const details = createElement("div", "rx-details-list");
        details.append(createElement("span", "", `Prescribed by: ${prescription.consultations?.provider_name || "Health center"}`));
        details.append(createElement("span", "", `Date: ${formatPortalDate(prescription.consultations?.consultation_date || prescription.created_at)}`));
        card.appendChild(details);
        const actions = createElement("div", "rx-actions");
        const refillButton = createElement("button", "btn-refill-card", "Request Refill");
        refillButton.type = "button";
        refillButton.addEventListener("click", () => openRefillModal(prescription.id, prescription.medicine, prescription.consultations?.provider_name || "Health center"));
        const printButton = createElement("button", "btn-rx-pdf", "Print Prescription");
        printButton.type = "button";
        printButton.addEventListener("click", () => openRxPdfModal(
            prescription.medicine,
            [prescription.dose, prescription.frequency, prescription.duration, prescription.instructions].filter(Boolean).join(" — "),
            prescription.consultations?.provider_name || "Health center",
            "",
            formatPortalDate(prescription.consultations?.consultation_date || prescription.created_at)
        ));
        actions.append(refillButton, printButton);
        card.appendChild(actions);
        container.appendChild(card);
    });
}

function renderAppointments() {
    const container = document.getElementById("appointmentList");
    if (!container) return;
    container.replaceChildren();
    const upcoming = portalState.appointments.filter(item =>
        new Date(`${item.appointment_date}T${item.appointment_time || "00:00"}`) >= new Date()
    );
    if (!upcoming.length) {
        container.appendChild(emptyMessage("You have no upcoming appointments."));
        return;
    }
    upcoming.forEach(item => {
        const card = createElement("div", "tracker-card");
        const info = createElement("div", "tracker-info");
        info.append(createElement("span", "tracker-badge badge-review", item.status || "Scheduled"));
        info.append(createElement("div", "tracker-title", item.service));
        info.append(createElement("div", "tracker-date",
            `${formatPortalDate(item.appointment_date)} at ${formatPortalTime(item.appointment_time)}`));
        if (item.purpose) info.append(createElement("div", "tracker-date", item.purpose));
        card.appendChild(info);
        container.appendChild(card);
    });
}

function renderCertificateRequests() {
    const container = document.getElementById("trackerList");
    if (!container) return;
    container.replaceChildren();
    if (!portalState.certificates.length) {
        container.appendChild(emptyMessage("You have no certificate requests."));
        return;
    }
    portalState.certificates.forEach(request => {
        const card = createElement("div", "tracker-card");
        const info = createElement("div", "tracker-info");
        info.append(createElement("span", "tracker-badge badge-review", request.status));
        info.append(createElement("div", "tracker-title", request.certificate_type));
        info.append(createElement("div", "tracker-date",
            `Requested ${formatPortalDate(request.created_at)} · Ref: ${request.reference_code}`));
        const button = createElement("button", "track-details-btn", "Track Details");
        button.type = "button";
        button.addEventListener("click", () => openTrackerModal(
            request.reference_code, request.certificate_type, formatPortalDate(request.created_at), request.status
        ));
        card.append(info, button);
        container.appendChild(card);
    });
}

function renderAnnouncements() {
    const container = document.getElementById("bulletinList");
    if (!container) return;
    container.replaceChildren();
    if (!portalState.announcements.length) {
        container.appendChild(emptyMessage("There are no current announcements."));
        return;
    }
    portalState.announcements.forEach((announcement, index) => {
        const card = createElement("article", `bulletin-card ${index % 2 ? "bar-green" : "bar-blue"}`);
        card.append(createElement("div", `bulletin-date ${index % 2 ? "date-green" : "date-blue"}`,
            formatPortalDate(announcement.date_posted || announcement.created_at)));
        card.append(createElement("h3", "bulletin-title", announcement.title));
        card.append(createElement("p", "bulletin-desc", announcement.message));
        container.appendChild(card);
    });
}

function renderNotifications() {
    const container = document.getElementById("notifAlertsList");
    const badge = document.getElementById("sidebarNotifBadge");
    if (!container) return;
    const items = [
        ...portalState.announcements.map(item => ({
            key: `announcement:${item.id}`, title: item.title, message: item.message,
            date: item.date_posted || item.created_at
        })),
        ...portalState.appointments.map(item => ({
            key: `appointment:${item.id}:${item.status || "Scheduled"}`, title: `Appointment ${item.status || "Scheduled"}`,
            message: `${item.service} · ${formatPortalDate(item.appointment_date)} at ${formatPortalTime(item.appointment_time)}`,
            date: item.created_at
        })),
        ...portalState.certificates.map(item => ({
            key: `certificate:${item.id}:${item.status}`, title: `Certificate ${item.status}`,
            message: item.certificate_type, date: item.created_at
        })),
        ...portalState.refills.map(item => ({
            key: `refill:${item.id}:${item.status}`, title: `Refill ${item.status}`,
            message: `Prescription refill request · ${item.requested_supply}`, date: item.created_at
        }))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    const readKeys = new Set(portalState.notificationReads.map(item => item.notification_key));
    container.replaceChildren();
    if (!items.length) container.appendChild(emptyMessage("You have no notifications."));
    items.forEach(item => {
        const card = createElement("article", `notif-alert-card${readKeys.has(item.key) ? "" : " unread"}`);
        const icon = createElement("div", "notif-alert-icon icon-blue");
        const iconElement = document.createElement("i");
        iconElement.className = "fa-regular fa-bell";
        icon.appendChild(iconElement);
        const content = createElement("div", "notif-alert-content");
        content.append(createElement("h4", "notif-alert-title", item.title));
        content.append(createElement("p", "notif-alert-sub", item.message));
        card.append(icon, content, createElement("div", "notif-alert-time", formatPortalDate(item.date)));
        container.appendChild(card);
    });
    const unreadCount = items.filter(item => !readKeys.has(item.key)).length;
    if (badge) {
        badge.textContent = String(unreadCount);
        badge.style.display = unreadCount ? "" : "none";
    }
}

function renderDashboard() {
    const metric = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };
    const upcoming = portalState.appointments.find(item =>
        new Date(`${item.appointment_date}T${item.appointment_time || "00:00"}`) >= new Date()
    );
    metric("dashboardAppointmentDate", upcoming ? formatPortalDate(upcoming.appointment_date) : "None scheduled");
    metric("dashboardAppointmentService", upcoming ? upcoming.service : "Request an appointment");
    metric("dashboardPrescriptionCount", String(portalState.prescriptions.length));
    const pending = portalState.certificates.filter(item => !["Ready for Pickup", "Rejected"].includes(item.status)).length +
        portalState.refills.filter(item => !["Ready for Pickup", "Rejected"].includes(item.status)).length;
    metric("dashboardPendingCount", String(pending));
    metric("dashboardPendingText", pending ? "Requests awaiting an update" : "No pending requests");
    const readKeys = new Set(portalState.notificationReads.map(item => item.notification_key));
    const unreadAnnouncements = portalState.announcements.filter(item => !readKeys.has(`announcement:${item.id}`)).length;
    metric("dashboardAnnouncementCount", String(unreadAnnouncements));
    metric("dashboardAnnouncementText", unreadAnnouncements ? "Unread health center updates" : "No unread bulletins");
}

function renderProgramRegistrations() {
    const container = document.getElementById("programRegistrationList");
    if (!container) return;
    container.replaceChildren();
    if (!portalState.programRegistrations.length) {
        container.appendChild(emptyMessage("You have not registered for a program yet."));
        return;
    }
    portalState.programRegistrations.forEach(item => {
        const row = createElement("div", "tracker-card");
        const info = createElement("div", "tracker-info");
        info.append(createElement("span", "tracker-badge badge-review", item.status));
        info.append(createElement("div", "tracker-title", item.program_name));
        info.append(createElement("div", "tracker-date", `${item.program_date} · ${item.venue}`));
        row.appendChild(info);
        container.appendChild(row);
    });
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
}

function emptyMessage(message) {
    return createElement("p", "portal-empty-state", message);
}

function calculatePatientAge(birthDate) {
    if (!birthDate) return null;
    const date = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    if (today.getMonth() < date.getMonth() ||
        (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())) age--;
    return age >= 0 ? age : null;
}

function currentLocalDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
}

function formatPortalDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function formatPortalTime(value) {
    if (!value) return "Time to be confirmed";
    const date = new Date(`1970-01-01T${value}`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function showPortalError(message) {
    const main = document.getElementById("mainContent");
    if (!main) {
        showToast(message, "error");
        return;
    }
    let alert = document.getElementById("portalError");
    if (!alert) {
        alert = createElement("div", "portal-error");
        alert.id = "portalError";
        alert.setAttribute("role", "alert");
        main.prepend(alert);
    }
    main.classList.remove("portal-loading");
    main.querySelectorAll(".tab-pane").forEach(pane => {
        pane.classList.remove("active");
        pane.hidden = true;
    });
    alert.textContent = message;
    showToast(message, "error");
}

/* --------------------------------------------------------------------------
   Mobile Navigation Drawer Controller (Global Scope)
   -------------------------------------------------------------------------- */
function openMobileDrawer() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeMobileDrawer() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "";
}

function toggleMobileDrawer() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar && sidebar.classList.contains("open")) {
        closeMobileDrawer();
    } else {
        openMobileDrawer();
    }
}

window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;
window.toggleMobileDrawer = toggleMobileDrawer;

/* --------------------------------------------------------------------------
   2. Responsive Tab Routing (SPA Architecture)
   -------------------------------------------------------------------------- */
function initTabRouting() {
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item[data-tab]");

    function activateTab(tabId) {
        if (!tabId) return;

        // Hide all panes
        const allPanes = document.querySelectorAll(".tab-pane");
        allPanes.forEach(pane => pane.classList.remove("active"));

        // Show target pane
        const targetPane = document.getElementById("pane-" + tabId);
        if (targetPane) {
            targetPane.classList.add("active");
        }

        // Update sidebar nav items
        navItems.forEach(item => {
            if (item.getAttribute("data-tab") === tabId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Update window hash without jump
        if (history.replaceState) {
            history.replaceState(null, null, "#" + tabId);
        } else {
            location.hash = "#" + tabId;
        }

        // Scroll to top of content
        window.scrollTo({ top: 0, behavior: "smooth" });

        // Close mobile drawer if opened
        closeMobileDrawer();
    }

    // Attach click events
    navItems.forEach(item => {
        item.addEventListener("click", function () {
            const tabId = this.getAttribute("data-tab");
            activateTab(tabId);
        });
    });

    // Check initial hash on load (default to 'certificate' or hash)
    let initialTab = "certificate";
    if (window.location.hash) {
        const hash = window.location.hash.replace("#", "");
        if (document.getElementById("pane-" + hash)) {
            initialTab = hash;
        }
    }
    activateTab(initialTab);

    // Support browser back/forward buttons
    window.addEventListener("hashchange", function () {
        const hash = window.location.hash.replace("#", "");
        if (hash && document.getElementById("pane-" + hash)) {
            activateTab(hash);
        }
    });

    // Global helper for in-page links
    window.switchTab = activateTab;
}

/* --------------------------------------------------------------------------
   3. Mobile Navigation Drawer Controller Event Setup
   -------------------------------------------------------------------------- */
function initMobileDrawer() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const openBtn = document.getElementById("mobileMenuBtn");
    const closeBtn = document.getElementById("sidebarCloseBtn");

    if (openBtn) {
        openBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            openMobileDrawer();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            closeMobileDrawer();
        });
    }

    if (overlay) {
        overlay.addEventListener("click", function (e) {
            e.stopPropagation();
            closeMobileDrawer();
        });
    }

    // Swipe left to close on mobile
    let touchStartX = 0;
    if (sidebar) {
        sidebar.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sidebar.addEventListener("touchend", (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 60) {
                closeMobileDrawer();
            }
        }, { passive: true });
    }
}

/* --------------------------------------------------------------------------
   4. Dark Mode Synchronization
   -------------------------------------------------------------------------- */
function initDarkMode() {
    const quickToggle = document.getElementById("quickDarkToggle");
    const prefToggle = document.getElementById("prefDarkMode");

    const isDark = localStorage.getItem("darkMode") === "true";
    syncDarkModeUI(isDark);

    function toggleDarkMode() {
        const currentlyDark = document.documentElement.classList.contains("dark-mode");
        const newDark = !currentlyDark;
        localStorage.setItem("darkMode", newDark ? "true" : "false");
        syncDarkModeUI(newDark);
        showToast(newDark ? "Dark theme enabled" : "Light theme enabled", "info");
    }

    function syncDarkModeUI(dark) {
        if (dark) {
            document.documentElement.classList.add("dark-mode");
            document.body.classList.add("dark-mode");
            if (quickToggle) quickToggle.innerHTML = '<i class="fa-solid fa-sun" style="color: #facc15;"></i>';
            if (prefToggle) prefToggle.checked = true;
        } else {
            document.documentElement.classList.remove("dark-mode");
            document.body.classList.remove("dark-mode");
            if (quickToggle) quickToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            if (prefToggle) prefToggle.checked = false;
        }
    }

    if (quickToggle) quickToggle.addEventListener("click", toggleDarkMode);
    if (prefToggle) prefToggle.addEventListener("change", function () {
        const newDark = this.checked;
        localStorage.setItem("darkMode", newDark ? "true" : "false");
        syncDarkModeUI(newDark);
    });
}

/* --------------------------------------------------------------------------
   5. Form Handlers & Live State
   -------------------------------------------------------------------------- */
function initFormHandlers() {
    const residentAiMotoForm = document.getElementById("residentAiMotoForm");
    if (residentAiMotoForm) {
        residentAiMotoForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const input = document.getElementById("residentAiInput");
            const chat = document.getElementById("residentAiChat");
            if (!input || !chat) return;
            const text = input.value.trim();
            if (!text || text.length > 1000) {
                showToast("Enter a question up to 1,000 characters.", "info");
                return;
            }
            const sendButton = residentAiMotoForm.querySelector("button[type='submit']");
            if (sendButton) sendButton.disabled = true;
            chat.appendChild(createElement("div", "user-message", text));
            input.value = "";
            try {
                const { data, error } = await window.sb.functions.invoke("ai-moto", {
                    body: { messages: [{ role: "user", text }] }
                });
                if (error) throw new Error(await getAiError(error));
                if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
                    throw new Error("AI Moto returned an empty response.");
                }
                chat.appendChild(createElement("div", "ai-message", data.reply));
            } catch (error) {
                console.error("Patient AI Moto request failed:", error);
                chat.appendChild(createElement("div", "ai-message",
                    `AI Moto could not answer: ${error.message || "Please try again later."}`));
            } finally {
                chat.scrollTop = chat.scrollHeight;
                if (sendButton) sendButton.disabled = false;
            }
        });
    }

    const certForm = document.getElementById("certificateRequestForm");
    const btnSubmitCert = document.getElementById("btnSubmitCert");
    if (certForm) {
        certForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            await submitPatientForm(btnSubmitCert, "Submit Certificate Request", async () => {
                const purpose = document.getElementById("certPurpose").value.trim();
                if (!purpose) throw new Error("Please specify the purpose of your request.");
                const { error } = await window.sb.from("patient_certificate_requests").insert({
                    patient_id: portalState.patient.id,
                    certificate_type: document.getElementById("certType").value,
                    purpose,
                    remarks: document.getElementById("certRemarks").value.trim()
                });
                if (error) throw error;
                certForm.reset();
                document.getElementById("certFullName").value = [
                    portalState.patient.first_name, portalState.patient.middle_name,
                    portalState.patient.last_name, portalState.patient.suffix
                ].filter(Boolean).join(" ");
                await refreshPortalDataAfterSave("Certificate request submitted.");
            });
        });
    }

    const refillForm = document.getElementById("refillRequestForm");
    if (refillForm) {
        refillForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const button = refillForm.querySelector("button[type='submit']");
            await submitPatientForm(button, "Submit Refill Request", async () => {
                const prescriptionId = Number(document.getElementById("modalRefillPrescriptionId").value);
                if (!portalState.prescriptions.some(item => item.id === prescriptionId)) {
                    throw new Error("Select one of your current prescriptions before requesting a refill.");
                }
                const { error } = await window.sb.from("patient_refill_requests").insert({
                    patient_id: portalState.patient.id,
                    prescription_id: prescriptionId,
                    requested_supply: document.getElementById("modalRefillDuration").value,
                    notes: document.getElementById("modalRefillNotes").value.trim()
                });
                if (error) throw error;
                closeModal("modalRefill");
                refillForm.reset();
                await refreshPortalDataAfterSave("Refill request submitted to the health center.");
            });
        });
    }

    const progForm = document.getElementById("programRegisterForm");
    if (progForm) {
        progForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const button = progForm.querySelector("button[type='submit']");
            await submitPatientForm(button, "Confirm Registration", async () => {
                const phone = document.getElementById("progModalPhone").value.trim();
                if (!phone) throw new Error("Enter a contact number for the registration.");
                const { error } = await window.sb.from("patient_program_registrations").insert({
                    patient_id: portalState.patient.id,
                    program_name: document.getElementById("progModalTitle").value,
                    program_date: document.getElementById("progModalDate").value,
                    venue: document.getElementById("progModalVenue").value,
                    contact_number: phone
                });
                if (error) throw error;
                closeModal("modalProgram");
                await refreshPortalDataAfterSave("Program registration saved.");
            });
        });
    }

    const appointmentForm = document.getElementById("appointmentRequestForm");
    if (appointmentForm) {
        appointmentForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const button = appointmentForm.querySelector("button[type='submit']");
            await submitPatientForm(button, "Request Appointment", async () => {
                const date = document.getElementById("appointmentDate").value;
                if (date < currentLocalDate()) {
                    throw new Error("Choose today or a future date for your appointment.");
                }
                const patient = portalState.patient;
                const { error } = await window.sb.from("appointments").insert({
                    patient_id: patient.id,
                    patient_name: [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" "),
                    service: document.getElementById("appointmentService").value,
                    appointment_date: date,
                    appointment_time: document.getElementById("appointmentTime").value,
                    purpose: document.getElementById("appointmentPurpose").value.trim(),
                    status: "Scheduled"
                });
                if (error) throw error;
                appointmentForm.reset();
                document.getElementById("appointmentDate").min = currentLocalDate();
                await refreshPortalDataAfterSave("Appointment request sent. The health center will confirm your schedule.");
            });
        });
    }

    const changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async function (event) {
            event.preventDefault();
            const button = document.getElementById("btnChangePassword");
            const email = portalState.user && portalState.user.email;
            const currentPassword = document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmNewPassword").value;
            if (!email) {
                showToast("Your account email is unavailable. Sign out and sign in again.", "error");
                return;
            }
            if (newPassword.length < 12) {
                showToast("Choose a new password with at least 12 characters.", "error");
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast("The new password and confirmation do not match.", "error");
                return;
            }
            if (newPassword === currentPassword) {
                showToast("Choose a new password different from your current password.", "error");
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = "Updating...";
            }
            try {
                const { error: reauthError } = await window.sb.auth.signInWithPassword({
                    email,
                    password: currentPassword
                });
                if (reauthError) throw reauthError;

                const { error: updateError } = await window.sb.auth.updateUser({ password: newPassword });
                if (updateError) throw updateError;

                changePasswordForm.reset();
                showToast("Your password has been changed.", "success");
            } catch (error) {
                console.error("Patient password change failed:", error);
                showToast(`Could not change your password: ${error.message || "Please try again."}`, "error");
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = "Change Password";
                }
            }
        });
    }

    const btnSaveSettings = document.getElementById("btnSaveSettings");
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener("click", function () {
            const key = `sm_patient_preferences_${portalState.user.id}`;
            const preferences = {};
            ["prefSms", "prefEmergency", "prefEmail"].forEach(id => {
                const input = document.getElementById(id);
                preferences[id] = Boolean(input && input.checked);
            });
            localStorage.setItem(key, JSON.stringify(preferences));
            showToast("Notification preferences saved on this device.", "success");
        });
    }

    const preferences = JSON.parse(localStorage.getItem(`sm_patient_preferences_${portalState.user.id}`) || "{}");
    ["prefSms", "prefEmergency", "prefEmail"].forEach(id => {
        const input = document.getElementById(id);
        if (input && typeof preferences[id] === "boolean") input.checked = preferences[id];
    });
    const appointmentDate = document.getElementById("appointmentDate");
    if (appointmentDate) appointmentDate.min = currentLocalDate();
}

async function submitPatientForm(button, idleText, action) {
    if (button) {
        button.disabled = true;
        button.dataset.idleMarkup = button.innerHTML;
        button.textContent = "Submitting...";
    }
    try {
        await action();
    } catch (error) {
        console.error("Patient request failed:", error);
        showToast(`Request was not saved: ${error.message || "Please try again."}`, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = button.dataset.idleMarkup || idleText;
        }
    }
}

async function refreshPortalDataAfterSave(successMessage) {
    showToast(successMessage, "success");
    try {
        await loadPortalData();
    } catch (error) {
        console.error("Request saved, but portal refresh failed:", error);
        showPortalError(`Your request was saved, but the portal could not refresh: ${error.message || "Reload the page to see the latest status."}`);
    }
}

async function getAiError(error) {
    if (error && typeof error.context?.json === "function") {
        try {
            const body = await error.context.json();
            if (body.error) return body.error;
        } catch (parseError) {
            console.warn("Could not read AI Moto error response:", parseError);
        }
    }
    return error.message || "AI Moto could not connect.";
}

/* --------------------------------------------------------------------------
   6. Notifications Management
   -------------------------------------------------------------------------- */
function initNotifications() {
    const markAllBtn = document.getElementById("btnMarkAllRead");
    if (markAllBtn) {
        markAllBtn.addEventListener("click", async function () {
            const items = [
                ...portalState.announcements.map(item => `announcement:${item.id}`),
                ...portalState.appointments.map(item => `appointment:${item.id}:${item.status || "Scheduled"}`),
                ...portalState.certificates.map(item => `certificate:${item.id}:${item.status}`),
                ...portalState.refills.map(item => `refill:${item.id}:${item.status}`)
            ];
            const existing = new Set(portalState.notificationReads.map(item => item.notification_key));
            const newReads = items.filter(key => !existing.has(key)).map(notification_key => ({
                patient_id: portalState.patient.id,
                notification_key
            }));
            if (!newReads.length) {
                showToast("All notifications are already marked as read.", "info");
                return;
            }
            markAllBtn.disabled = true;
            try {
                const { error } = await window.sb.from("patient_notification_reads").upsert(newReads, {
                    onConflict: "patient_id,notification_key",
                    ignoreDuplicates: true
                });
                if (error) throw error;
            } catch (error) {
                console.error("Could not save notification read state:", error);
                showToast(`Could not update notifications: ${error.message}`, "error");
                markAllBtn.disabled = false;
                return;
            }
            showToast("Notifications marked as read.", "success");
            try {
                await loadPortalData();
            } catch (error) {
                console.error("Notification read state was saved, but portal refresh failed:", error);
                showPortalError(`Notifications were marked as read, but the portal could not refresh: ${error.message || "Reload the page to see the latest data."}`);
            } finally {
                markAllBtn.disabled = false;
            }
        });
    }
}

/* --------------------------------------------------------------------------
   7. Modal Controller Functions (Global window access)
   -------------------------------------------------------------------------- */
window.openModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
        document.body.style.overflow = "hidden";
    }
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        document.body.style.overflow = "";
    }
};

// Close modal on backdrop click or ESC key
document.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal-backdrop")) {
        e.target.classList.remove("active");
        document.body.style.overflow = "";
    }
});

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal-backdrop.active").forEach(m => {
            m.classList.remove("active");
        });
        document.body.style.overflow = "";
    }
});

// Specific Modal Openers
window.openTrackerModal = function (ref, title, date, status) {
    const modal = document.getElementById("modalTracker");
    if (!modal) return;
    document.getElementById("modalTrackerRef").textContent = "Reference No: " + ref;
    document.getElementById("modalTrackerName").textContent = title;
    const statusLine = document.getElementById("modalTrackerStatus");
    if (statusLine) statusLine.textContent = `${status} · Requested ${date}`;
    openModal("modalTracker");
};

window.openRefillModal = function (prescriptionId, med, doctor) {
    const modal = document.getElementById("modalRefill");
    if (!modal) return;
    document.getElementById("modalRefillMed").value = med;
    document.getElementById("modalRefillDoctor").value = doctor;
    document.getElementById("modalRefillPrescriptionId").value = String(prescriptionId);
    openModal("modalRefill");
};

window.openNewRefillModal = function () {
    if (!portalState.prescriptions.length) {
        showToast("There are no prescriptions available for a refill request.", "info");
        return;
    }
    const prescription = portalState.prescriptions[0];
    openRefillModal(
        prescription.id,
        prescription.medicine,
        prescription.consultations?.provider_name || "Health center"
    );
};

window.openRxPdfModal = function (med, instructions, doctor, prc, date) {
    const modal = document.getElementById("modalRxPdf");
    if (!modal) return;
    const patient = portalState.patient;
    const name = patient
        ? [patient.first_name, patient.middle_name, patient.last_name, patient.suffix].filter(Boolean).join(" ")
        : "Patient";
    document.getElementById("rxPdfPatientName").textContent = name;
    document.getElementById("rxPdfMedName").textContent = med;
    document.getElementById("rxPdfInstructions").textContent = instructions;
    document.getElementById("rxPdfDoctor").textContent = doctor;
    document.getElementById("rxPdfPrc").textContent = prc || "Not recorded";
    document.getElementById("rxPdfDate").textContent = date;
    openModal("modalRxPdf");
};

window.openConsultationSummaryModal = function (date, diagnosis, doctor, notes) {
    const modal = document.getElementById("modalConsultSummary");
    if (!modal) return;
    document.getElementById("modalConsultDate").textContent = date;
    document.getElementById("modalConsultDiagnosis").textContent = diagnosis;
    document.getElementById("modalConsultDoctor").textContent = doctor;
    document.getElementById("modalConsultNotes").textContent = notes;
    openModal("modalConsultSummary");
};

window.openProgramModal = function (title, date, venue) {
    const modal = document.getElementById("modalProgram");
    if (!modal) return;
    document.getElementById("progModalTitle").value = title;
    document.getElementById("progModalDate").value = date;
    document.getElementById("progModalVenue").value = venue;
    document.getElementById("progModalMeta").value = date + " @ " + venue;
    const resident = portalState.patient;
    if (resident) {
        document.getElementById("progModalResident").value =
            `${[resident.first_name, resident.middle_name, resident.last_name, resident.suffix].filter(Boolean).join(" ")} (ID: ${resident.patient_code || resident.id})`;
        document.getElementById("progModalPhone").value = resident.contact_number || "";
    }
    openModal("modalProgram");
};

window.openDownloadModal = function () {
    openModal("modalDownload");
};

window.triggerDownloadRecord = function (docName) {
    closeModal("modalDownload");
    window.switchTab(docName.toLowerCase().includes("prescription") ? "prescriptions" : "records");
    const previousTitle = document.title;
    document.title = `${docName} - ${portalState.patient.patient_code || "Patient Record"}`;
    window.addEventListener("afterprint", () => {
        document.title = previousTitle;
    }, { once: true });
    window.print();
};

window.printPatientDocument = function () {
    document.body.classList.add("printing-prescription");
    window.addEventListener("afterprint", () => {
        document.body.classList.remove("printing-prescription");
    }, { once: true });
    window.print();
};

/* --------------------------------------------------------------------------
   8. Floating Toast Notification System
   -------------------------------------------------------------------------- */
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg ${type}`;
    const icon = document.createElement("i");
    icon.className = type === "success"
        ? "fa-solid fa-circle-check"
        : type === "error"
            ? "fa-solid fa-triangle-exclamation"
            : "fa-solid fa-circle-info";
    const text = createElement("span", "", message);
    toast.append(icon, text);
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
window.showToast = showToast;
