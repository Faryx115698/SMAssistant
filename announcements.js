const announcements = [];
let announcementFilter = "all";
let announcementSearchQuery = "";
let announcementCategoryFilter = "";
let announcementStatusFilter = "";
let announcementCurrentPage = 1;
let announcementRowsPerPage = 10;

const ANNOUNCEMENT_CATEGORIES = [
    "General News",
    "Health Reminders",
    "Events",
    "Programs & Services",
    "Emergency Alerts"
];

function escapeAnnouncementHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatAnnouncementDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
        alert(message);
        return;
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

function replaceAnnouncements(items) {
    announcements.length = 0;
    announcements.push(...items);
}

function mapAnnouncement(row) {
    return {
        id: row.id,
        title: row.title || "",
        message: row.message || "",
        category: row.category || "General News",
        priority: row.priority || "Medium",
        status: row.status || "Active",
        postedBy: row.posted_by || "Admin",
        datePosted: row.date_posted,
        dateLabel: formatAnnouncementDate(row.date_posted),
        expiryDate: row.expiry_date,
        expiryLabel: row.expiry_date ? formatAnnouncementDate(row.expiry_date) : "",
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

function categoryIcon(category) {
    switch (category) {
        case "Health Reminders": return "fa-heart-pulse";
        case "Events": return "fa-calendar";
        case "Programs & Services": return "fa-hand-holding-heart";
        case "Emergency Alerts": return "fa-triangle-exclamation";
        default: return "fa-bullhorn";
    }
}

function priorityClass(priority) {
    switch (priority) {
        case "Urgent": return "priority-urgent";
        case "High": return "priority-high";
        case "Low": return "priority-low";
        default: return "priority-medium";
    }
}

function statusClass(status) {
    switch (status) {
        case "Scheduled": return "status-scheduled";
        case "Expired": return "status-expired";
        case "Draft": return "status-draft";
        case "Archived": return "status-archived";
        default: return "status-active";
    }
}
async function loadAnnouncements() {
    if (!window.sb) {
        showToast("Supabase is not available.");
        return;
    }

    try {
        const { data, error } = await window.sb
            .from("announcements")
            .select("*")
            .order("date_posted", { ascending: false })
            .order("created_at", { ascending: false });

        if (error) throw error;
        replaceAnnouncements((data || []).map(mapAnnouncement));
        announcementCurrentPage = 1;
        renderAnnouncements();
    } catch (error) {
        console.error("Failed to load announcements:", error);
        showToast("Failed to load announcements.");
    }
}

function getFilteredAnnouncements() {
    const query = announcementSearchQuery.trim().toLowerCase();
    return announcements.filter((item) => {
        if (announcementFilter !== "all" && item.category !== announcementFilter) return false;
        if (announcementCategoryFilter && item.category !== announcementCategoryFilter) return false;
        if (announcementStatusFilter && item.status !== announcementStatusFilter) return false;
        if (query) {
            const haystack = [
                item.title,
                item.message,
                item.category,
                item.priority,
                item.status,
                item.postedBy
            ].join(" ").toLowerCase();
            if (!haystack.includes(query)) return false;
        }
        return true;
    });
}

function renderAnnouncementSummary() {
    const total = announcements.length;
    const active = announcements.filter((item) => item.status === "Active").length;
    const scheduled = announcements.filter((item) => item.status === "Scheduled").length;
    const expired = announcements.filter((item) => item.status === "Expired").length;

    const totalEl = document.getElementById("annTotalCount");
    const activeEl = document.getElementById("annActiveCount");
    const scheduledEl = document.getElementById("annScheduledCount");
    const expiredEl = document.getElementById("annExpiredCount");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (scheduledEl) scheduledEl.textContent = scheduled;
    if (expiredEl) expiredEl.textContent = expired;
}

function renderAnnouncementCategoryCounts() {
    const container = document.getElementById("announcementCategoryCounts");
    if (!container) return;

    const counts = ANNOUNCEMENT_CATEGORIES.map((category) => ({
        category,
        count: announcements.filter((item) => item.category === category).length
    }));

    container.innerHTML = counts.map((item) => `
        <div class="category">
            <span>${escapeAnnouncementHtml(item.category)}</span>
            <b>${item.count}</b>
        </div>
    `).join("");
}

function renderAnnouncementList(items) {
    const container = document.getElementById("announcementList");
    if (!container) return;

    if (!items.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-bell-slash"></i>
                <p>No announcements found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map((item) => {
        const icon = categoryIcon(item.category);
        const statusClass = item.status === "Scheduled" ? "scheduled-status" : item.status === "Expired" ? "expired-status" : "active-status";
        return `
        <article class="announcement-item">
            <div class="announcement-icon ${item.category === "Emergency Alerts" ? "red-icon" : item.category === "Events" ? "yellow-icon" : item.category === "Health Reminders" ? "pink-icon" : item.category === "Programs & Services" ? "green-icon" : "blue-icon"}">
                <i class="fa-solid ${icon}"></i>
            </div>

            <div class="announcement-content">
                <h2>${escapeAnnouncementHtml(item.title)}</h2>
                <p>${escapeAnnouncementHtml(item.message)}</p>

                <div class="announcement-meta">
                    <span>${escapeAnnouncementHtml(item.dateLabel)}</span>
                    <span>By ${escapeAnnouncementHtml(item.postedBy)}</span>
                    <b>${escapeAnnouncementHtml(item.category)}</b>
                    ${item.expiryLabel ? `<span>Expires ${escapeAnnouncementHtml(item.expiryLabel)}</span>` : ""}
                </div>
            </div>

            <div class="announcement-status">
                <span class="${statusClass}">${escapeAnnouncementHtml(item.status)}</span>
                <small>${escapeAnnouncementHtml(item.priority)}</small>
            </div>

            <span class="priority ${item.priority === "Urgent" ? "high" : item.priority.toLowerCase()}">${escapeAnnouncementHtml(item.priority)}</span>

            <div class="announcement-actions">
                <button class="more-button" type="button" onclick="openAnnouncementModal(${item.id})" title="Edit">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="more-button" type="button" onclick="deleteAnnouncement(${item.id})" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </article>
    `;
    }).join("");
}

function renderAnnouncementPagination(total, totalPages, start, count) {
    const info = document.getElementById("announcementPaginationInfo");
    if (info) {
        if (!total) {
            info.textContent = "Showing 0 announcements";
        } else {
            info.textContent = `Showing ${start + 1} to ${start + count} of ${total} announcements`;
        }
    }

    const container = document.getElementById("announcementPagination");
    if (!container) return;

    let html = `<button type="button" ${announcementCurrentPage <= 1 ? "disabled" : ""} onclick="changeAnnouncementPage(${announcementCurrentPage - 1})">Previous</button>`;

    const maxButtons = 5;
    let first = Math.max(1, announcementCurrentPage - 2);
    let last = Math.min(totalPages, first + maxButtons - 1);
    first = Math.max(1, last - maxButtons + 1);

    for (let page = first; page <= last; page++) {
        html += `<button type="button" class="${page === announcementCurrentPage ? "active" : ""}" onclick="changeAnnouncementPage(${page})">${page}</button>`;
    }

    html += `<button type="button" ${announcementCurrentPage >= totalPages ? "disabled" : ""} onclick="changeAnnouncementPage(${announcementCurrentPage + 1})">Next</button>`;

    container.innerHTML = html;
}

function renderAnnouncements() {
    renderAnnouncementSummary();
    renderAnnouncementCategoryCounts();

    const filtered = getFilteredAnnouncements();
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / announcementRowsPerPage));
    if (announcementCurrentPage > totalPages) announcementCurrentPage = totalPages;

    const start = (announcementCurrentPage - 1) * announcementRowsPerPage;
    const pageItems = filtered.slice(start, start + announcementRowsPerPage);

    renderAnnouncementList(pageItems);
    renderAnnouncementPagination(total, totalPages, start, pageItems.length);
}

function openAnnouncementModal(id = null) {
    const modal = document.getElementById("announcementModal");
    if (!modal) return;

    const form = modal.querySelector("form");
    if (form) form.reset();

    document.getElementById("annId").value = "";
    document.getElementById("annTitle").value = "";
    document.getElementById("annCategory").value = "";
    document.getElementById("annPriority").value = "Medium";
    document.getElementById("annStatus").value = "Active";
    document.getElementById("annPostedBy").value = "Admin";
    document.getElementById("annDatePosted").value = new Date().toISOString().slice(0, 10);
    document.getElementById("annExpiryDate").value = "";
    document.getElementById("annMessage").value = "";

    if (id !== null && id !== undefined && id !== "") {
        const item = announcements.find((entry) => String(entry.id) === String(id));
        if (item) {
            document.getElementById("annId").value = item.id;
            document.getElementById("annTitle").value = item.title;
            document.getElementById("annCategory").value = item.category;
            document.getElementById("annPriority").value = item.priority;
            document.getElementById("annStatus").value = item.status;
            document.getElementById("annPostedBy").value = item.postedBy;
            document.getElementById("annDatePosted").value = item.datePosted ? String(item.datePosted).slice(0, 10) : "";
            document.getElementById("annExpiryDate").value = item.expiryDate ? String(item.expiryDate).slice(0, 10) : "";
            document.getElementById("annMessage").value = item.message;
        }
    }

    modal.classList.add("show");

    const title = document.querySelector("#announcementModal .modal-header h2");
    if (title) title.textContent = (id !== null && id !== undefined && id !== "") ? "Edit Announcement" : "New Announcement";
}

function closeAnnouncementModal() {
    const modal = document.getElementById("announcementModal");
    if (modal) modal.classList.remove("show");
}

async function saveAnnouncement(event) {
    event.preventDefault();
    if (!window.sb) {
        showToast("Supabase is not available.");
        return;
    }

    const id = document.getElementById("annId").value;
    const payload = {
        title: document.getElementById("annTitle").value.trim(),
        category: document.getElementById("annCategory").value,
        priority: document.getElementById("annPriority").value,
        status: document.getElementById("annStatus").value,
        posted_by: document.getElementById("annPostedBy").value.trim() || "Admin",
        date_posted: document.getElementById("annDatePosted").value || null,
        expiry_date: document.getElementById("annExpiryDate").value || null,
        message: document.getElementById("annMessage").value.trim()
    };

    try {
        let response;
        if (id) {
            response = await window.sb
                .from("announcements")
                .update(payload)
                .eq("id", id);
        } else {
            response = await window.sb
                .from("announcements")
                .insert(payload);
        }

        if (response.error) throw response.error;

        closeAnnouncementModal();
        showToast(id ? "Announcement updated." : "Announcement published.");
        await loadAnnouncements();
    } catch (error) {
        console.error("Failed to save announcement:", error);
        showToast("Failed to save announcement.");
    }
}

async function deleteAnnouncement(id) {
    if (!window.sb) {
        showToast("Supabase is not available.");
        return;
    }
    if (!confirm("Delete this announcement?")) return;

    try {
        const { error } = await window.sb
            .from("announcements")
            .delete()
            .eq("id", id);

        if (error) throw error;
        showToast("Announcement deleted.");
        await loadAnnouncements();
    } catch (error) {
        console.error("Failed to delete announcement:", error);
        showToast("Failed to delete announcement.");
    }
}

function setAnnouncementTab(category) {
    announcementFilter = category;
    announcementCurrentPage = 1;

    document.querySelectorAll(".announcement-tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.category === category);
    });

    renderAnnouncements();
}

function applyAnnouncementFilters() {
    announcementSearchQuery = document.getElementById("searchAnnouncement")?.value || "";
    announcementCategoryFilter = document.getElementById("announcementCategoryFilter")?.value || "";
    announcementStatusFilter = document.getElementById("announcementStatusFilter")?.value || "";
    announcementCurrentPage = 1;
    renderAnnouncements();
}

function changeAnnouncementPage(page) {
    const filtered = getFilteredAnnouncements();
    const totalPages = Math.max(1, Math.ceil(filtered.length / announcementRowsPerPage));
    if (page < 1 || page > totalPages) return;
    announcementCurrentPage = page;
    renderAnnouncements();
}

function changeAnnouncementPageSize(value) {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) return;
    announcementRowsPerPage = size;
    announcementCurrentPage = 1;
    renderAnnouncements();
}

document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("announcementModal");
    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) closeAnnouncementModal();
        });
    }

    loadAnnouncements();
});
