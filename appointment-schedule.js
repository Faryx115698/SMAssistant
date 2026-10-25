// appointment-schedule.js - Appointment calendar and management

(function () {
    "use strict";

    const STATUS_OPTIONS = ["Scheduled", "Confirmed", "Checked in", "In progress", "Completed", "Cancelled", "No-show"];
    const state = {
        appointments: [],
        patients: [],
        selectedDate: dateKey(new Date()),
        selectedMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        loadedMonth: null,
        selectedAppointmentId: null,
        isWalkIn: false,
        saving: false,
        loadVersion: 0,
        updatingStatus: false
    };

    const elements = {};

    document.addEventListener("DOMContentLoaded", initialize);

    function initialize() {
        [
            "appointmentItems", "appointmentSearch", "statusFilter", "calendarGrid", "calendarMonth",
            "daySchedule", "scheduleTitle", "appointmentModal", "appointmentForm", "appointmentFormError",
            "appointmentRecordId", "patientSelect", "appointmentDate", "appointmentTime",
            "appointmentService", "appointmentPurpose", "saveAppointmentButton", "todayCount",
            "completedCount", "pendingCount", "cancelledCount", "noShowCount", "selectedName",
            "selectedId", "selectedStatus", "selectedDate", "selectedVisit", "selectedReason",
            "selectedNotes", "editAppointmentButton", "appointmentStatus", "updateStatusButton"
        ].forEach(function (id) {
            elements[id] = document.getElementById(id);
        });

        document.getElementById("previousMonth").addEventListener("click", function () { moveMonth(-1); });
        document.getElementById("nextMonth").addEventListener("click", function () { moveMonth(1); });
        document.getElementById("todayButton").addEventListener("click", goToToday);
        document.getElementById("newAppointmentButton").addEventListener("click", openAppointmentModal);
        document.getElementById("walkInButton").addEventListener("click", openWalkInForm);
        document.getElementById("availabilityButton").addEventListener("click", function () {
            elements.daySchedule.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        document.getElementById("editAppointmentButton").addEventListener("click", editSelectedAppointment);
        document.getElementById("updateStatusButton").addEventListener("click", updateSelectedStatus);
        elements.appointmentForm.addEventListener("submit", saveAppointment);
        elements.appointmentSearch.addEventListener("input", renderAppointments);
        elements.statusFilter.addEventListener("change", renderAppointments);
        elements.appointmentItems.addEventListener("click", function (event) {
            const item = event.target.closest("[data-appointment-id]");
            if (item) selectAppointment(item.dataset.appointmentId);
        });
        elements.daySchedule.addEventListener("click", function (event) {
            const item = event.target.closest("[data-appointment-id]");
            if (item) selectAppointment(item.dataset.appointmentId);
        });
        elements.calendarGrid.addEventListener("click", function (event) {
            const button = event.target.closest("[data-date]");
            if (button) selectDate(button.dataset.date);
        });
        document.getElementById("appointmentModal").addEventListener("click", function (event) {
            if (event.target === elements.appointmentModal) closeAppointmentModal();
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeAppointmentModal();
        });
        window.openAppointmentModal = openAppointmentModal;
        window.closeAppointmentModal = closeAppointmentModal;

        if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
            showLoadError("Appointment services are not configured. Check Supabase setup and sign in, then reload.");
            return;
        }

        loadPatients();
        loadAppointments();
    }

    async function loadPatients() {
        try {
            const result = await window.sb.from("patients")
                .select("id,patient_code,first_name,middle_name,last_name,suffix")
                .order("last_name", { ascending: true });
            if (result.error) {
                elements.patientSelect.innerHTML = '<option value="">Could not load patients</option>';
                showLoadError("Could not load patients: " + result.error.message);
                return;
            }

            state.patients = result.data || [];
            elements.patientSelect.innerHTML = '<option value="">Select a patient</option>';
            state.patients.forEach(function (patient) {
                const option = document.createElement("option");
                option.value = String(patient.id);
                option.textContent = patientName(patient) + (patient.patient_code ? " · " + patient.patient_code : "");
                elements.patientSelect.appendChild(option);
            });
            if (!state.patients.length) {
                elements.patientSelect.innerHTML = '<option value="">No patients registered — register a patient first</option>';
            }
        } catch (error) {
            console.error("Could not load patients:", error);
            elements.patientSelect.innerHTML = '<option value="">Could not load patients</option>';
            showLoadError("Could not load patients. Check your connection and reload.");
        }
    }

    async function loadAppointments() {
        const loadVersion = ++state.loadVersion;
        elements.appointmentItems.innerHTML = '<p class="empty-state">Loading appointments…</p>';
        elements.daySchedule.innerHTML = '<p class="empty-state">Loading schedule…</p>';
        const year = state.selectedMonth.getFullYear();
        const month = state.selectedMonth.getMonth();
        const firstDay = dateKey(new Date(year, month, 1));
        const lastDay = dateKey(new Date(year, month + 1, 0));
        const today = dateKey(new Date());

        const monthRequest = window.sb.from("appointments").select("*")
            .gte("appointment_date", firstDay).lte("appointment_date", lastDay)
            .order("appointment_date", { ascending: true }).order("appointment_time", { ascending: true });
        const todayRequest = today >= firstDay && today <= lastDay
            ? Promise.resolve(null)
            : window.sb.from("appointments").select("*").eq("appointment_date", today);
        let results;
        try {
            results = await Promise.all([monthRequest, todayRequest]);
        } catch (error) {
            if (loadVersion !== state.loadVersion) return;
            console.error("Could not load appointments:", error);
            showLoadError("Could not load appointments. Check your connection and reload.");
            return;
        }
        if (loadVersion !== state.loadVersion) return;
        if (results[0].error) {
            showLoadError("Could not load appointments: " + results[0].error.message);
            return;
        }

        state.appointments = results[0].data || [];
        state.loadedMonth = year + "-" + String(month + 1).padStart(2, "0");
        state.todayAppointments = results[1] ? (results[1].data || []) : state.appointments.filter(function (item) {
            return item.appointment_date === today;
        });
        if (results[1] && results[1].error) {
            showLoadError("Could not load today's appointment totals: " + results[1].error.message);
            return;
        }

        renderSummary();
        renderCalendar();
        renderAppointments();
        renderSchedule();

        if (state.selectedAppointmentId && !state.appointments.some(function (item) {
            return String(item.id) === String(state.selectedAppointmentId);
        })) {
            state.selectedAppointmentId = null;
        }
        if (state.selectedAppointmentId) selectAppointment(state.selectedAppointmentId);
        else clearAppointmentDetails();
    }

    function renderSummary() {
        const items = state.todayAppointments || [];
        setText("todayCount", items.length);
        setText("completedCount", countStatus(items, "Completed"));
        setText("pendingCount", items.filter(function (item) {
            return ["Scheduled", "Confirmed", "Checked in", "In progress"].indexOf(item.status || "Scheduled") !== -1;
        }).length);
        setText("cancelledCount", countStatus(items, "Cancelled"));
        setText("noShowCount", countStatus(items, "No-show"));
    }

    function renderCalendar() {
        const month = state.selectedMonth;
        elements.calendarMonth.textContent = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
        const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
        const firstVisible = new Date(month.getFullYear(), month.getMonth(), 1 - firstWeekday);
        const counts = {};
        state.appointments.forEach(function (item) {
            counts[item.appointment_date] = (counts[item.appointment_date] || 0) + 1;
        });

        elements.calendarGrid.innerHTML = "";
        for (let index = 0; index < 42; index += 1) {
            const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
            const key = dateKey(date);
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.date = key;
            button.className = "calendar-day";
            if (date.getMonth() !== month.getMonth()) button.classList.add("muted");
            if (key === dateKey(new Date())) button.classList.add("today");
            if (key === state.selectedDate) button.classList.add("selected");
            button.setAttribute("aria-label", date.toLocaleDateString(undefined, { dateStyle: "full" }) +
                (counts[key] ? ", " + counts[key] + " appointments" : ""));
            button.innerHTML = '<span>' + date.getDate() + '</span>' +
                (counts[key] ? '<i class="calendar-count">' + counts[key] + '</i>' : "");
            elements.calendarGrid.appendChild(button);
        }
    }

    function renderAppointments() {
        const query = elements.appointmentSearch.value.trim().toLocaleLowerCase();
        const status = elements.statusFilter.value;
        const items = state.appointments.filter(function (item) {
            const name = (item.patient_name || "").toLocaleLowerCase();
            const visit = (item.service || "").toLocaleLowerCase();
            return item.appointment_date === state.selectedDate &&
                (!status || (item.status || "Scheduled") === status) &&
                (!query || name.includes(query) || visit.includes(query));
        });

        if (!items.length) {
            elements.appointmentItems.innerHTML = '<p class="empty-state">No appointments match this date and filter.</p>';
            return;
        }

        elements.appointmentItems.innerHTML = items.map(function (item) {
            const selected = String(item.id) === String(state.selectedAppointmentId);
            return '<button type="button" class="appointment-item' + (selected ? ' selected' : '') +
                '" data-appointment-id="' + escapeHtml(item.id) + '">' +
                '<span class="patient-icon blue" aria-hidden="true">●</span>' +
                '<span class="appointment-info"><strong>' + escapeHtml(item.patient_name) + '</strong>' +
                '<span>' + escapeHtml(item.patient_id ? "Patient #" + item.patient_id : "Patient") + '</span>' +
                '<small>' + escapeHtml(item.service) + ' · ' + escapeHtml(formatTime(item.appointment_time)) + '</small></span>' +
                '<span class="appointment-time-badge"><span class="status-' + statusClass(item.status) + '">' +
                escapeHtml(item.status || "Scheduled") + '</span></span></button>';
        }).join("");
    }

    function renderSchedule() {
        const date = parseDate(state.selectedDate);
        elements.scheduleTitle.textContent = date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + " Schedule";
        const items = state.appointments.filter(function (item) {
            return item.appointment_date === state.selectedDate;
        });
        if (!items.length) {
            elements.daySchedule.innerHTML = '<p class="empty-state">No appointments scheduled for this day.</p>';
            return;
        }
        elements.daySchedule.innerHTML = items.map(function (item) {
            return '<button type="button" class="schedule-item" data-appointment-id="' + escapeHtml(item.id) + '">' +
                '<span class="schedule-dot"></span><strong>' + escapeHtml(formatTime(item.appointment_time)) + '</strong>' +
                '<span><b>' + escapeHtml(item.patient_name) + '</b><small>' + escapeHtml(item.service) + '</small></span>' +
                '<span class="schedule-status">' + escapeHtml(item.status || "Scheduled") + '</span></button>';
        }).join("");
    }

    function selectDate(date) {
        state.selectedDate = date;
        const parsed = parseDate(date);
        state.selectedMonth = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
        state.selectedAppointmentId = null;
        renderCalendar();
        renderAppointments();
        renderSchedule();
        clearAppointmentDetails();
        if (state.loadedMonth !== date.slice(0, 7)) loadAppointments();
    }

    function moveMonth(delta) {
        state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + delta, 1);
        state.selectedDate = dateKey(new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth(), 1));
        state.selectedAppointmentId = null;
        clearAppointmentDetails();
        loadAppointments();
    }

    function goToToday() {
        state.selectedDate = dateKey(new Date());
        state.selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        state.selectedAppointmentId = null;
        clearAppointmentDetails();
        loadAppointments();
    }

    function selectAppointment(id) {
        const appointment = state.appointments.find(function (item) {
            return String(item.id) === String(id);
        });
        if (!appointment) return;
        state.selectedAppointmentId = appointment.id;
        elements.selectedName.textContent = appointment.patient_name || "Patient";
        elements.selectedId.textContent = appointment.patient_id ? "Patient #" + appointment.patient_id : "Patient ID unavailable";
        elements.selectedStatus.textContent = appointment.status || "Scheduled";
        elements.selectedStatus.className = "scheduled-label status-" + statusClass(appointment.status);
        elements.selectedDate.textContent = formatDate(appointment.appointment_date) + " · " + formatTime(appointment.appointment_time);
        elements.selectedVisit.textContent = appointment.service || "—";
        elements.selectedReason.textContent = appointment.purpose || "No reason provided.";
        elements.selectedNotes.textContent = appointment.purpose || "No notes.";
        elements.appointmentStatus.value = appointment.status || "Scheduled";
        if (!elements.appointmentStatus.value) {
            const option = document.createElement("option");
            option.value = appointment.status;
            option.textContent = appointment.status;
            elements.appointmentStatus.appendChild(option);
            elements.appointmentStatus.value = appointment.status;
        }
        elements.appointmentStatus.disabled = false;
        elements.updateStatusButton.disabled = false;
        elements.editAppointmentButton.disabled = false;
        renderAppointments();
    }

    function clearAppointmentDetails() {
        elements.selectedName.textContent = "Select an appointment";
        elements.selectedId.textContent = "";
        elements.selectedStatus.textContent = "—";
        elements.selectedStatus.className = "scheduled-label";
        elements.selectedDate.textContent = "Choose a date and appointment";
        elements.selectedVisit.textContent = "—";
        elements.selectedReason.textContent = "—";
        elements.selectedNotes.textContent = "—";
        elements.appointmentStatus.disabled = true;
        elements.updateStatusButton.disabled = true;
        elements.editAppointmentButton.disabled = true;
        renderAppointments();
    }

    function openAppointmentModal() {
        state.isWalkIn = false;
        elements.appointmentForm.reset();
        elements.appointmentRecordId.value = "";
        elements.appointmentDate.value = state.selectedDate;
        elements.appointmentModal.querySelector(".modal-header h2").textContent = "New Appointment";
        elements.saveAppointmentButton.textContent = "Save Appointment";
        elements.appointmentFormError.textContent = "";
        elements.appointmentModal.classList.add("show");
        elements.patientSelect.focus();
    }

    function openWalkInForm() {
        openAppointmentModal();
        state.isWalkIn = true;
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
        elements.appointmentDate.value = dateKey(now);
        elements.appointmentTime.value = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
        elements.appointmentModal.querySelector(".modal-header h2").textContent = "Register Walk-in";
    }

    function closeAppointmentModal() {
        elements.appointmentModal.classList.remove("show");
        state.isWalkIn = false;
    }

    function editSelectedAppointment() {
        const appointment = state.appointments.find(function (item) {
            return String(item.id) === String(state.selectedAppointmentId);
        });
        if (!appointment) return;
        state.isWalkIn = false;
        elements.appointmentForm.reset();
        elements.appointmentRecordId.value = String(appointment.id);
        elements.patientSelect.value = appointment.patient_id ? String(appointment.patient_id) : "";
        elements.appointmentDate.value = appointment.appointment_date;
        elements.appointmentTime.value = String(appointment.appointment_time).slice(0, 5);
        elements.appointmentService.value = appointment.service;
        elements.appointmentPurpose.value = appointment.purpose || "";
        elements.appointmentModal.querySelector(".modal-header h2").textContent = "Edit Appointment";
        elements.saveAppointmentButton.textContent = "Save Changes";
        elements.appointmentFormError.textContent = "";
        elements.appointmentModal.classList.add("show");
    }

    async function saveAppointment(event) {
        event.preventDefault();
        elements.appointmentFormError.textContent = "";
        const patient = state.patients.find(function (item) {
            return String(item.id) === elements.patientSelect.value;
        });
        if (!patient) {
            elements.appointmentFormError.textContent = "Select a registered patient before saving.";
            return;
        }
        if (state.saving) return;
        state.saving = true;
        elements.saveAppointmentButton.disabled = true;
        const recordId = elements.appointmentRecordId.value;
        const appointmentDate = elements.appointmentDate.value;
        const appointmentTime = elements.appointmentTime.value;
        try {
            const conflictResponse = await window.sb.from("appointments").select("id,status")
                .eq("appointment_date", appointmentDate).eq("appointment_time", appointmentTime);
            if (conflictResponse.error) {
                elements.appointmentFormError.textContent = "Could not check for a time conflict: " + conflictResponse.error.message;
                return;
            }
            const conflict = (conflictResponse.data || []).some(function (item) {
                return String(item.id) !== String(recordId) && item.status !== "Cancelled";
            });
            if (conflict && !window.confirm("Another appointment already uses this exact date and time. Save anyway?")) return;

            const payload = {
                patient_id: patient.id,
                patient_name: patientName(patient),
                service: elements.appointmentService.value,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                purpose: elements.appointmentPurpose.value.trim() || null
            };
            let response;
            if (recordId) {
                response = await window.sb.from("appointments").update(payload).eq("id", recordId);
            } else {
                payload.status = state.isWalkIn ? "Checked in" : "Scheduled";
                response = await window.sb.from("appointments").insert(payload);
            }
            if (response.error) {
                elements.appointmentFormError.textContent = "Could not save appointment: " + response.error.message;
                return;
            }

            closeAppointmentModal();
            state.selectedDate = appointmentDate;
            const date = parseDate(appointmentDate);
            state.selectedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            state.selectedAppointmentId = null;
            await loadAppointments();
            showNotice(recordId ? "Appointment updated." : "Appointment saved.");
        } catch (error) {
            console.error("Could not save appointment:", error);
            elements.appointmentFormError.textContent = "Could not save appointment. Check your connection and try again.";
        } finally {
            state.saving = false;
            elements.saveAppointmentButton.disabled = false;
        }
    }

    async function updateSelectedStatus() {
        if (!state.selectedAppointmentId || state.updatingStatus) return;
        const status = elements.appointmentStatus.value;
        if (STATUS_OPTIONS.indexOf(status) === -1) return;
        state.updatingStatus = true;
        elements.updateStatusButton.disabled = true;
        let response;
        try {
            response = await window.sb.from("appointments")
                .update({ status: status }).eq("id", state.selectedAppointmentId);
        } catch (error) {
            console.error("Could not update appointment status:", error);
            showNotice("Could not update status. Check your connection and try again.", true);
            return;
        } finally {
            state.updatingStatus = false;
            elements.updateStatusButton.disabled = false;
        }
        if (response.error) {
            showNotice("Could not update status: " + response.error.message, true);
            return;
        }
        await loadAppointments();
        showNotice("Appointment status updated.");
    }

    function showLoadError(message) {
        elements.appointmentItems.innerHTML = '<p class="empty-state error-state">' + escapeHtml(message) + '</p>';
        elements.daySchedule.innerHTML = '<p class="empty-state error-state">' + escapeHtml(message) + '</p>';
        showNotice(message, true);
    }

    function showNotice(message, isError) {
        let notice = document.getElementById("appointmentNotice");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "appointmentNotice";
            notice.setAttribute("role", "status");
            notice.className = "appointment-notice";
            document.querySelector(".main-content").prepend(notice);
        }
        notice.textContent = message;
        notice.classList.toggle("error", Boolean(isError));
        notice.hidden = false;
        window.clearTimeout(showNotice.timeout);
        showNotice.timeout = window.setTimeout(function () { notice.hidden = true; }, 6000);
    }

    function countStatus(items, status) {
        return items.filter(function (item) { return (item.status || "Scheduled") === status; }).length;
    }

    function patientName(patient) {
        return [patient.first_name, patient.middle_name, patient.last_name, patient.suffix]
            .filter(Boolean).join(" ");
    }

    function statusClass(status) {
        return String(status || "Scheduled").toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
    }

    function dateKey(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0");
    }

    function parseDate(value) {
        const parts = value.split("-").map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function formatDate(value) {
        return parseDate(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }

    function formatTime(value) {
        const parts = String(value || "").slice(0, 5).split(":").map(Number);
        if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return value || "—";
        const date = new Date();
        date.setHours(parts[0], parts[1], 0, 0);
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }

    function setText(id, value) {
        document.getElementById(id).textContent = String(value);
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
        });
    }
}());
