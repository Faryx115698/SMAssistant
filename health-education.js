
"use strict";

const activities = [];
const participants = [];
const materials = [];
let healthDataPromise = null;
let usingFallback = false;

function escapeHtml(text) {
    if (text === null || text === undefined) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/''/g, "&#039;");
}

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

function formatTime(value) {
    if (!value) return "";
    try {
        const parts = String(value).split(":");
        if (parts.length >= 2) {
            let h = parseInt(parts[0], 10);
            const m = parts[1];
            const ampm = h >= 12 ? "pm" : "am";
            h = h % 12 || 12;
            return `${h}:${m} ${ampm}`;
        }
    } catch (e) {}
    return value;
}

function showToast(message, type) {
    let toast = document.getElementById("heToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "heToast";
        toast.style.cssText = "position:fixed;bottom:24px;right:24px;padding:12px 18px;border-radius:10px;color:#fff;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.18);display:none;max-width:360px;";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === "error" ? "#dc2626" : (type === "info" ? "#2563eb" : "#16a34a");
    toast.style.display = "block";
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.display = "none"; }, 3200);
}

function replaceArray(target, items) {
    target.length = 0;
    target.push(...(items || []));
}

function deriveStatus(row) {
    if (row.status === "Cancelled") return "Cancelled";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(`${row.activity_date}T00:00:00`);
    if (isNaN(d.getTime())) return row.status || "Upcoming";
    if (d < today) return "Completed";
    if (d.getTime() === today.getTime()) return "Ongoing";
    return "Upcoming";
}

function mapActivity(row) {
    return {
        id: row.id,
        title: row.title || "",
        description: row.description || "",
        dateISO: row.activity_date,
        date: formatDateOnly(row.activity_date),
        startTime: row.start_time,
        endTime: row.end_time,
        timeLabel: row.start_time ? `${formatTime(row.start_time)}${row.end_time ? " - " + formatTime(row.end_time) : ""}` : "Time TBD",
        venue: row.venue || "",
        speaker: row.speaker || "",
        target: row.target_group || "Barangay Residents",
        status: deriveStatus(row),
        storedStatus: row.status || "Upcoming",
        maxAttendees: row.max_attendees,
        createdAt: row.created_at
    };
}

function mapParticipant(row) {
    return {
        id: row.id,
        activityId: row.activity_id,
        name: row.attendee_name || "",
        purok: row.purok || "",
        age: row.age,
        sex: row.sex || "",
        contact: row.contact_number || "",
        attended: !!row.attended,
        rating: row.rating,
        notes: row.notes || "",
        createdAt: row.created_at
    };
}

function mapMaterial(row) {
    return {
        id: row.id,
        title: row.title || "",
        description: row.description || "",
        category: row.category || "General",
        type: row.material_type || "PDF",
        url: row.file_url || "",
        fileName: row.file_name || "",
        language: row.language || "Tagalog / English",
        target: row.target_group || "",
        published: !!row.published,
        copies: row.copies_distributed || 0,
        createdAt: row.created_at
    };
}

async function loadHealthData() {
    if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
        usingFallback = true;
        renderAll();
        return;
    }
    if (healthDataPromise) return healthDataPromise;
    healthDataPromise = (async () => {
        const [actRes, partRes, matRes] = await Promise.all([
            window.sb.from("health_education_activities").select("*").order("activity_date", { ascending: false }),
            window.sb.from("health_education_participants").select("*").order("created_at", { ascending: false }),
            window.sb.from("health_education_materials").select("*").order("created_at", { ascending: false })
        ]);
        if (actRes.error) throw actRes.error;
        const partRows = partRes.error ? [] : (partRes.data || []);
        const matRows = matRes.error ? [] : (matRes.data || []);
        if (partRes.error) console.warn("Health participants unavailable:", partRes.error.message);
        if (matRes.error) console.warn("Health materials unavailable:", matRes.error.message);
        replaceArray(activities, (actRes.data || []).map(mapActivity));
        replaceArray(participants, partRows.map(mapParticipant));
        replaceArray(materials, matRows.map(mapMaterial));
    })().catch((err) => {
        console.error("Could not load health education data:", err);
        showToast(err.message || "Could not load health education data.", "error");
    }).finally(() => {
        renderAll();
    });
    return healthDataPromise;
}

function getParticipants(activityId) {
    return participants.filter((p) => p.activityId === activityId);
}

function renderAll() {
    renderStats();
    renderSeminars();
    renderIec();
    renderAttendance();
}
function renderStats() {
    const conducted = activities.filter((a) => a.status === "Completed").length;
    const reached = participants.length;
    const upcoming = activities.filter((a) => a.status === "Upcoming" || a.status === "Ongoing").length;
    const iecDistributed = materials.reduce((sum, m) => sum + (m.copies || 0), 0);
    const ratings = participants.map((p) => p.rating).filter((r) => r !== null && r !== undefined);
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + Number(b), 0) / ratings.length).toFixed(1) : null;

    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set("statSeminars", conducted.toLocaleString());
    set("statAttendees", reached.toLocaleString());
    set("statUpcoming", upcoming.toLocaleString());
    set("statIec", iecDistributed.toLocaleString());
    set("statSatisfaction", avgRating ? `${avgRating} / 5.0` : "— / 5.0");
}

function seminarMatchesFilter(a) {
    const search = (document.getElementById("seminarSearch")?.value || "").trim().toLowerCase();
    const status = document.getElementById("seminarStatusFilter")?.value || "";
    if (status && a.status !== status) return false;
    if (!search) return true;
    return [a.title, a.description, a.venue, a.speaker, a.target].join(" ").toLowerCase().includes(search);
}

function renderSeminars() {
    const container = document.getElementById("seminarGrid");
    if (!container) return;
    const list = activities.filter(seminarMatchesFilter);
    if (!list.length) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-calendar-xmark"></i><p>${activities.length ? "No seminars match your filters." : "No seminars scheduled yet."}</p></div>`;
        return;
    }
    container.innerHTML = list.map((s) => {
        const reg = getParticipants(s.id).length;
        const attended = getParticipants(s.id).filter((p) => p.attended).length;
        const pct = s.maxAttendees ? Math.min(100, Math.round((reg / s.maxAttendees) * 100)) : null;
        const badgeClass = s.status === "Completed" ? "completed" : (s.status === "Cancelled" ? "cancelled" : (s.status === "Ongoing" ? "ongoing" : "upcoming"));
        return `
            <div class="seminar-card">
                <div>
                    <span class="seminar-badge ${badgeClass}">${escapeHtml(s.status)}</span>
                    <h3>${escapeHtml(s.title)}</h3>
                    <p>${escapeHtml(s.description)}</p>
                    <div class="seminar-meta">
                        <span><i class="fa-solid fa-calendar" style="color:var(--blue);"></i> ${escapeHtml(s.date)} • ${escapeHtml(s.timeLabel)}</span>
                        <span><i class="fa-solid fa-location-dot" style="color:var(--blue);"></i> ${escapeHtml(s.venue)}</span>
                        <span><i class="fa-solid fa-user-doctor" style="color:var(--blue);"></i> ${escapeHtml(s.speaker || "TBD")}</span>
                        <span><i class="fa-solid fa-users" style="color:var(--blue);"></i> Target: ${escapeHtml(s.target)}</span>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; gap:8px; flex-wrap:wrap;">
                    <span style="font-size:12px; font-weight:600; color:var(--muted);">${reg} registered${s.maxAttendees ? ` / ${s.maxAttendees} max` : ""}${attended ? ` • ${attended} attended` : ""}</span>
                    ${pct !== null ? `<div style="flex:1; min-width:80px; height:6px; background:var(--border,#e2e8f0); border-radius:999px; overflow:hidden;"><div style="width:${pct}%; height:100%; background:var(--blue,#2563eb);"></div></div>` : ""}
                </div>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    <button class="btn-primary" style="padding:6px 12px; font-size:11px;" onclick="openParticipantModal(${s.id})"><i class="fa-solid fa-user-plus"></i> Register</button>
                    <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="openParticipantsModal(${s.id})"><i class="fa-solid fa-list"></i> Participants</button>
                    <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="openEditSeminarModal(${s.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn-outline" style="padding:6px 12px; font-size:11px; color:#dc2626;" onclick="deleteSeminar(${s.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
    }).join("");
}
function iecMatchesFilter(m) {
    const search = (document.getElementById("iecSearch")?.value || "").trim().toLowerCase();
    const category = document.getElementById("iecCategoryFilter")?.value || "";
    const published = document.getElementById("iecPublishedFilter")?.value || "";
    if (category && m.category !== category) return false;
    if (published === "published" && !m.published) return false;
    if (published === "draft" && m.published) return false;
    if (!search) return true;
    return [m.title, m.description, m.category, m.type, m.target, m.language].join(" ").toLowerCase().includes(search);
}

function iecIcon(type) {
    const t = String(type || "").toLowerCase();
    if (t.includes("video")) return "fa-video";
    if (t.includes("poster")) return "fa-image";
    if (t.includes("brochure")) return "fa-book-open";
    return "fa-file-pdf";
}

function renderIec() {
    const container = document.getElementById("iecGrid");
    if (!container) return;
    const list = materials.filter(iecMatchesFilter);
    if (!list.length) {
        container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>${materials.length ? "No IEC materials match your filters." : "No IEC materials added yet."}</p></div>`;
        return;
    }
    container.innerHTML = list.map((m) => `
        <div class="iec-card">
            <i class="fa-solid ${iecIcon(m.type)} iec-icon"></i>
            <div class="iec-info">
                <h4>${escapeHtml(m.title)}</h4>
                <p>${escapeHtml(m.description || "No description provided.")}</p>
                <span class="seminar-badge ${m.published ? "completed" : "upcoming"}">${escapeHtml(m.category)} • ${escapeHtml(m.type)} • ${m.published ? "Published" : "Draft"}</span>
                <div style="font-size:11px; color:var(--muted); margin-top:6px; display:flex; flex-wrap:wrap; gap:8px;">
                    <span><i class="fa-solid fa-language"></i> ${escapeHtml(m.language)}</span>
                    ${m.target ? `<span><i class="fa-solid fa-users"></i> ${escapeHtml(m.target)}</span>` : ""}
                    <span><i class="fa-solid fa-copy"></i> ${m.copies.toLocaleString()} distributed</span>
                </div>
                <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                    ${m.url ? `<a class="btn-outline" style="padding:6px 12px; font-size:11px; text-decoration:none;" href="${escapeHtml(m.url)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> Open</a>` : ""}
                    <button class="btn-outline" style="padding:6px 12px; font-size:11px;" onclick="openEditIecModal(${m.id})"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn-outline" style="padding:6px 12px; font-size:11px; color:#dc2626;" onclick="deleteIec(${m.id})"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            </div>
        </div>
    `).join("");
}

function attendanceMatchesFilter(a) {
    const search = (document.getElementById("attendanceSearch")?.value || "").trim().toLowerCase();
    if (!search) return true;
    const reg = getParticipants(a.id);
    return [a.title, a.venue, a.target, a.speaker, ...reg.map((p) => `${p.name} ${p.purok}`)].join(" ").toLowerCase().includes(search);
}

function renderAttendance() {
    const tbody = document.getElementById("attendanceTableBody");
    if (!tbody) return;
    const completed = activities.filter((a) => a.status === "Completed" && attendanceMatchesFilter(a));
    if (!completed.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">${activities.length ? "No completed sessions match your search." : "No completed sessions logged yet."}</td></tr>`;
        return;
    }
    tbody.innerHTML = completed.map((a) => {
        const reg = getParticipants(a.id);
        const count = reg.length;
        const attended = reg.filter((p) => p.attended).length;
        const ratings = reg.map((p) => p.rating).filter((r) => r !== null && r !== undefined);
        const avg = ratings.length ? (ratings.reduce((x, y) => x + Number(y), 0) / ratings.length).toFixed(1) + " ★" : "—";
        return `
            <tr>
                <td><b>${escapeHtml(a.date)}</b></td>
                <td><b>${escapeHtml(a.title)}</b></td>
                <td>${escapeHtml(a.venue)}</td>
                <td>${escapeHtml(a.target)}</td>
                <td><b>${count} registered${attended ? ` / ${attended} attended` : ""}</b></td>
                <td>${escapeHtml(a.speaker || "TBD")}</td>
                <td><span style="color:#d97706; font-weight:700;">${avg}</span></td>
            </tr>
        `;
    }).join("");
}
function openSeminarModal() {
    const form = document.getElementById("seminarForm");
    if (form) form.reset();
    const id = document.getElementById("semId");
    if (id) id.value = "";
    const title = document.getElementById("seminarModalTitle");
    if (title) title.textContent = "Schedule Health Seminar";
    const date = document.getElementById("semDate");
    if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
    const modal = document.getElementById("seminarModal");
    if (modal) modal.classList.add("active");
}

function closeSeminarModal() {
    const modal = document.getElementById("seminarModal");
    if (modal) modal.classList.remove("active");
}

function openEditSeminarModal(id) {
    const s = activities.find((a) => a.id === id);
    if (!s) return;
    document.getElementById("semId").value = s.id;
    document.getElementById("semTitle").value = s.title;
    document.getElementById("semDesc").value = s.description;
    document.getElementById("semDate").value = s.dateISO || "";
    document.getElementById("semTime").value = s.startTime ? String(s.startTime).slice(0, 5) : "09:00";
    document.getElementById("semVenue").value = s.venue;
    document.getElementById("semSpeaker").value = s.speaker;
    const modalTitle = document.getElementById("seminarModalTitle");
    if (modalTitle) modalTitle.textContent = "Edit Health Seminar";
    document.getElementById("seminarModal").classList.add("active");
}

async function handleScheduleSeminar(e) {
    e.preventDefault();
    if (!window.sb) { showToast("Supabase is not configured.", "error"); return; }
    const id = document.getElementById("semId").value;
    const payload = {
        title: document.getElementById("semTitle").value.trim(),
        description: document.getElementById("semDesc").value.trim(),
        activity_date: document.getElementById("semDate").value,
        start_time: document.getElementById("semTime").value || null,
        venue: document.getElementById("semVenue").value.trim(),
        speaker: document.getElementById("semSpeaker").value.trim(),
        target_group: "Barangay Residents",
        status: "Upcoming"
    };
    try {
        let error;
        if (id) {
            const res = await window.sb.from("health_education_activities").update(payload).eq("id", id);
            error = res.error;
        } else {
            const res = await window.sb.from("health_education_activities").insert(payload);
            error = res.error;
        }
        if (error) throw error;
        closeSeminarModal();
        showToast(id ? "Seminar updated." : "Seminar scheduled.", "success");
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not save seminar.", "error");
    }
}

async function deleteSeminar(id) {
    if (!confirm("Delete this seminar and all registered participants?")) return;
    if (!window.sb) return;
    try {
        const { error } = await window.sb.from("health_education_activities").delete().eq("id", id);
        if (error) throw error;
        showToast("Seminar deleted.", "success");
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not delete seminar.", "error");
    }
}

function populateActivitySelect(selectedId) {
    const select = document.getElementById("participantActivity");
    if (!select) return;
    select.innerHTML = activities.map((a) => `<option value="${a.id}" ${String(a.id) === String(selectedId) ? "selected" : ""}>${escapeHtml(a.title)} (${escapeHtml(a.date)})</option>`).join("");
}

function openParticipantModal(activityId) {
    const form = document.getElementById("participantForm");
    if (form) form.reset();
    document.getElementById("participantId").value = "";
    document.getElementById("participantModalTitle").textContent = "Register Participant";
    populateActivitySelect(activityId || (activities[0] && activities[0].id));
    if (activityId) document.getElementById("participantActivity").value = activityId;
    document.getElementById("participantModal").classList.add("active");
}

function closeParticipantModal() {
    document.getElementById("participantModal").classList.remove("active");
}

function openEditParticipantModal(id) {
    const p = participants.find((x) => x.id === id);
    if (!p) return;
    document.getElementById("participantId").value = p.id;
    populateActivitySelect(p.activityId);
    document.getElementById("participantActivity").value = p.activityId;
    document.getElementById("participantName").value = p.name;
    document.getElementById("participantPurok").value = p.purok;
    document.getElementById("participantAge").value = p.age ?? "";
    document.getElementById("participantSex").value = p.sex || "Male";
    document.getElementById("participantContact").value = p.contact;
    document.getElementById("participantAttended").value = p.attended ? "true" : "false";
    document.getElementById("participantRating").value = p.rating ?? "";
    document.getElementById("participantNotes").value = p.notes;
    document.getElementById("participantModalTitle").textContent = "Edit Participant";
    document.getElementById("participantModal").classList.add("active");
}

async function handleParticipantSubmit(e) {
    e.preventDefault();
    if (!window.sb) { showToast("Supabase is not configured.", "error"); return; }
    const id = document.getElementById("participantId").value;
    const payload = {
        activity_id: Number(document.getElementById("participantActivity").value),
        attendee_name: document.getElementById("participantName").value.trim(),
        purok: document.getElementById("participantPurok").value.trim(),
        age: document.getElementById("participantAge").value ? Number(document.getElementById("participantAge").value) : null,
        sex: document.getElementById("participantSex").value,
        contact_number: document.getElementById("participantContact").value.trim(),
        attended: document.getElementById("participantAttended").value === "true",
        rating: document.getElementById("participantRating").value ? Number(document.getElementById("participantRating").value) : null,
        notes: document.getElementById("participantNotes").value.trim()
    };
    try {
        let error;
        if (id) {
            const res = await window.sb.from("health_education_participants").update(payload).eq("id", id);
            error = res.error;
        } else {
            const res = await window.sb.from("health_education_participants").insert(payload);
            error = res.error;
        }
        if (error) throw error;
        closeParticipantModal();
        showToast(id ? "Participant updated." : "Participant registered.", "success");
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not save participant.", "error");
    }
}

function openParticipantsModal(id) {
    const activity = activities.find((a) => a.id === id);
    const reg = getParticipants(id);
    const title = document.getElementById("participantsModalTitle");
    if (title) title.textContent = `Participants - ${activity ? activity.title : "Seminar"}`;
    const body = document.getElementById("participantsModalBody");
    if (!body) return;
    if (!reg.length) {
        body.innerHTML = `<p style="padding:16px; color:var(--muted);">No participants registered yet.</p>`;
    } else {
        body.innerHTML = `
            <div class="data-table-wrapper">
                <table class="data-table">
                    <thead><tr><th>Name</th><th>Purok</th><th>Age/Sex</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${reg.map((p) => `
                            <tr>
                                <td><b>${escapeHtml(p.name)}</b>${p.contact ? `<br><small>${escapeHtml(p.contact)}</small>` : ""}</td>
                                <td>${escapeHtml(p.purok || "—")}</td>
                                <td>${p.age ?? "—"} / ${escapeHtml(p.sex || "—")}</td>
                                <td>${p.attended ? "Attended" : "Registered"}</td>
                                <td>${p.rating !== null && p.rating !== undefined ? Number(p.rating).toFixed(1) + " ★" : "—"}</td>
                                <td>
                                    <button class="btn-outline" style="padding:4px 8px; font-size:10px;" onclick="openEditParticipantModal(${p.id})">Edit</button>
                                    <button class="btn-outline" style="padding:4px 8px; font-size:10px; color:#dc2626;" onclick="deleteParticipant(${p.id})">Delete</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        `;
    }
    document.getElementById("participantsModal").classList.add("active");
}

function closeParticipantsModal() {
    document.getElementById("participantsModal").classList.remove("active");
}

async function deleteParticipant(id) {
    const activityId = participants.find((p) => p.id === id)?.activityId;
    if (!confirm("Delete this participant?")) return;
    if (!window.sb) return;
    try {
        const { error } = await window.sb.from("health_education_participants").delete().eq("id", id);
        if (error) throw error;
        showToast("Participant deleted.", "success");
        if (activityId) openParticipantsModal(activityId);
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not delete participant.", "error");
    }
}

function openIecModal() {
    const form = document.getElementById("iecForm");
    if (form) form.reset();
    document.getElementById("iecId").value = "";
    document.getElementById("iecLanguage").value = "Tagalog / English";
    document.getElementById("iecCopies").value = 0;
    document.getElementById("iecPublished").value = "true";
    document.getElementById("iecModalTitle").textContent = "Add IEC Material";
    document.getElementById("iecModal").classList.add("active");
}

function closeIecModal() {
    document.getElementById("iecModal").classList.remove("active");
}

function openEditIecModal(id) {
    const m = materials.find((x) => x.id === id);
    if (!m) return;
    document.getElementById("iecId").value = m.id;
    document.getElementById("iecTitle").value = m.title;
    document.getElementById("iecDesc").value = m.description;
    document.getElementById("iecCategory").value = m.category;
    document.getElementById("iecType").value = m.type;
    document.getElementById("iecUrl").value = m.url;
    document.getElementById("iecFileName").value = m.fileName;
    document.getElementById("iecLanguage").value = m.language;
    document.getElementById("iecTarget").value = m.target;
    document.getElementById("iecCopies").value = m.copies;
    document.getElementById("iecPublished").value = m.published ? "true" : "false";
    document.getElementById("iecModalTitle").textContent = "Edit IEC Material";
    document.getElementById("iecModal").classList.add("active");
}

async function handleIecSubmit(e) {
    e.preventDefault();
    if (!window.sb) { showToast("Supabase is not configured.", "error"); return; }
    const id = document.getElementById("iecId").value;
    const payload = {
        title: document.getElementById("iecTitle").value.trim(),
        description: document.getElementById("iecDesc").value.trim(),
        category: document.getElementById("iecCategory").value,
        material_type: document.getElementById("iecType").value,
        file_url: document.getElementById("iecUrl").value.trim() || null,
        file_name: document.getElementById("iecFileName").value.trim() || null,
        language: document.getElementById("iecLanguage").value.trim() || "Tagalog / English",
        target_group: document.getElementById("iecTarget").value.trim() || null,
        copies_distributed: Number(document.getElementById("iecCopies").value || 0),
        published: document.getElementById("iecPublished").value === "true"
    };
    try {
        let error;
        if (id) {
            const res = await window.sb.from("health_education_materials").update(payload).eq("id", id);
            error = res.error;
        } else {
            const res = await window.sb.from("health_education_materials").insert(payload);
            error = res.error;
        }
        if (error) throw error;
        closeIecModal();
        showToast(id ? "IEC material updated." : "IEC material added.", "success");
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not save IEC material.", "error");
    }
}

async function deleteIec(id) {
    if (!confirm("Delete this IEC material?")) return;
    if (!window.sb) return;
    try {
        const { error } = await window.sb.from("health_education_materials").delete().eq("id", id);
        if (error) throw error;
        showToast("IEC material deleted.", "success");
        healthDataPromise = null;
        await loadHealthData();
    } catch (err) {
        console.error(err);
        showToast(err.message || "Could not delete IEC material.", "error");
    }
}
// Tab switching (original behavior)
document.addEventListener("DOMContentLoaded", function () {
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

    loadHealthData();
});

// Close modals on overlay click
["seminarModal", "participantModal", "iecModal", "participantsModal"].forEach((id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.addEventListener("click", function (e) {
            if (e.target === this) this.classList.remove("active");
        });
    }
});
