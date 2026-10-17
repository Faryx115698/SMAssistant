/**
 * Patient Portal Logic - Barangay Talimundoc Health Center
 * Mobile-First, Responsive & Adaptive UI Controller
 */

document.addEventListener("DOMContentLoaded", function () {
    initAuthAndUserData();
    initTabRouting();
    initMobileDrawer();
    initDarkMode();
    initFormHandlers();
    initNotifications();
});

/* --------------------------------------------------------------------------
   1. User Session & Auth Initialization
   -------------------------------------------------------------------------- */
function initAuthAndUserData() {
    let residentName = "Juan D. Dela Cruz";
    let residentId = "PT-2026-0001";
    let residentEmail = "juandelacruz@example.com";

    // 1. Check local session
    const localSession = localStorage.getItem("sm_user_session");
    if (localSession) {
        try {
            const parsed = JSON.parse(localSession);
            if (parsed.name && parsed.name.toLowerCase() !== "admin cyron") {
                residentName = parsed.name;
            }
            if (parsed.residentId) {
                residentId = parsed.residentId;
            }
            if (parsed.email) {
                residentEmail = parsed.email;
            }
        } catch (e) {
            console.warn("Session parse error", e);
        }
    }

    // 2. Check Supabase session if configured
    if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
        window.sb.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                const meta = session.user.user_metadata || {};
                if (meta.full_name) {
                    residentName = meta.full_name;
                } else if (session.user.email) {
                    residentName = session.user.email.split("@")[0];
                }
                updateResidentUI(residentName, residentId);
            }
        }).catch(err => console.log("Supabase session check:", err));
    }

    updateResidentUI(residentName, residentId);

    // Sign out button
    const signOutBtn = document.getElementById("residentSignOutBtn");
    if (signOutBtn) {
        signOutBtn.addEventListener("click", async function () {
            if (window.sb && typeof isConfigured !== "undefined" && isConfigured) {
                try {
                    await window.sb.auth.signOut();
                } catch (e) { }
            }
            localStorage.removeItem("sm_user_session");
            showToast("Signing out...", "info");
            setTimeout(() => {
                window.location.href = "login.html";
            }, 600);
        });
    }
}

function updateResidentUI(name, id) {
    const sidebarName = document.getElementById("sidebarResidentName");
    const sidebarId = document.getElementById("sidebarResidentId");
    const headerName = document.getElementById("headerResidentName");
    const certInput = document.getElementById("certFullName");
    const recordName = document.getElementById("recordResidentName");
    const recordId = document.getElementById("recordResidentId");
    const dashWelcome = document.getElementById("dashWelcomeName");
    const dashWelcomeFull = document.getElementById("dashWelcomeFullName");
    const profileCardName = document.getElementById("profileCardName");
    const profileCardId = document.getElementById("profileCardId");
    const profileBoxName = document.getElementById("profileBoxName");
    const profileBoxId = document.getElementById("profileBoxId");

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarId) sidebarId.textContent = "ID: " + id;
    if (headerName) headerName.textContent = name;
    if (certInput) certInput.value = name;
    if (recordName) recordName.textContent = name;
    if (recordId) recordId.textContent = "ID: " + id;
    if (dashWelcome) dashWelcome.textContent = name.split(" ")[0];
    if (dashWelcomeFull) dashWelcomeFull.textContent = name;
    if (profileCardName) profileCardName.textContent = name;
    if (profileCardId) profileCardId.textContent = "Resident ID: " + id;
    if (profileBoxName) profileBoxName.textContent = name;
    if (profileBoxId) profileBoxId.textContent = id;
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
    // 1. Submit Health Certificate Request Form
    const certForm = document.getElementById("certificateRequestForm");
    const btnSubmitCert = document.getElementById("btnSubmitCert");
    const trackerList = document.getElementById("trackerList");

    if (certForm) {
        certForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const certType = document.getElementById("certType").value;
            const purpose = document.getElementById("certPurpose").value.trim();
            const remarks = document.getElementById("certRemarks").value.trim();

            if (!purpose) {
                showToast("Please specify the purpose of your request.", "info");
                return;
            }

            if (btnSubmitCert) {
                btnSubmitCert.disabled = true;
                btnSubmitCert.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting Request...';
            }

            setTimeout(() => {
                const now = new Date();
                const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                const randomId = "CR-2026-" + Math.floor(100 + Math.random() * 900);

                // Create new tracker card
                const newCard = document.createElement("div");
                newCard.className = "tracker-card";
                newCard.innerHTML = `
                    <div class="tracker-info">
                        <span class="tracker-badge badge-review">Submitted / Under Review</span>
                        <div class="tracker-title">${certType}</div>
                        <div class="tracker-date">Requested on: ${dateStr} &bull; Ref: ${randomId}</div>
                    </div>
                    <button type="button" class="track-details-btn" onclick="openTrackerModal('${randomId}', '${certType}', '${dateStr}', 'Submitted / Under Review')">
                        <span>Track Details</span>
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                `;

                if (trackerList) {
                    trackerList.insertBefore(newCard, trackerList.firstChild);
                }

                showToast(`Certificate request (${randomId}) submitted successfully!`, "success");

                // Reset form fields
                document.getElementById("certPurpose").value = "";
                document.getElementById("certRemarks").value = "";

                if (btnSubmitCert) {
                    btnSubmitCert.disabled = false;
                    btnSubmitCert.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <span>Submit Certificate Request</span>';
                }
            }, 800);
        });
    }

    // 2. Refill Request Modal Form
    const refillForm = document.getElementById("refillRequestForm");
    if (refillForm) {
        refillForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const med = document.getElementById("modalRefillMed").value;
            const duration = document.getElementById("modalRefillDuration").value;

            closeModal("modalRefill");
            showToast(`Refill request submitted for ${med} (${duration})!`, "success");

            // Update card supply indicator
            if (med.includes("Amlodipine")) {
                const supplyEl = document.getElementById("supply-1");
                if (supplyEl) supplyEl.innerHTML = '<span style="color: #2563eb;">Refill Pending Preparation</span>';
            } else if (med.includes("Ascorbic")) {
                const supplyEl = document.getElementById("supply-2");
                if (supplyEl) supplyEl.innerHTML = '<span style="color: #2563eb;">Refill Pending Preparation</span>';
            } else if (med.includes("Metformin")) {
                const supplyEl = document.getElementById("supply-3");
                if (supplyEl) supplyEl.innerHTML = '<span style="color: #2563eb;">Refill Pending Preparation</span>';
            }
        });
    }

    // 3. Program Registration Form
    const progForm = document.getElementById("programRegisterForm");
    if (progForm) {
        progForm.addEventListener("submit", function (e) {
            e.preventDefault();
            const title = document.getElementById("progModalTitle").value;
            const phone = document.getElementById("progModalPhone").value;

            closeModal("modalProgram");
            showToast(`Registration confirmed for ${title}! SMS ticket sent to ${phone}.`, "success");
        });
    }

    // 4. Save Settings Button
    const btnSaveSettings = document.getElementById("btnSaveSettings");
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener("click", function () {
            this.textContent = "Saving...";
            setTimeout(() => {
                this.textContent = "Save Settings";
                showToast("Account preferences updated successfully!", "success");
            }, 500);
        });
    }
}

/* --------------------------------------------------------------------------
   6. Notifications Management
   -------------------------------------------------------------------------- */
function initNotifications() {
    const markAllBtn = document.getElementById("btnMarkAllRead");
    const notifCards = document.querySelectorAll(".notification-card");
    const sidebarBadge = document.getElementById("sidebarNotifBadge");

    if (markAllBtn) {
        markAllBtn.addEventListener("click", function () {
            notifCards.forEach(c => c.classList.remove("unread"));
            if (sidebarBadge) sidebarBadge.style.display = "none";
            showToast("All notifications marked as read.", "info");
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
    openModal("modalTracker");
};

window.openRefillModal = function (med, doctor, supply) {
    const modal = document.getElementById("modalRefill");
    if (!modal) return;
    document.getElementById("modalRefillMed").value = med;
    document.getElementById("modalRefillDoctor").value = doctor;
    openModal("modalRefill");
};

window.openNewRefillModal = function () {
    openRefillModal("Amlodipine Besylate 5mg", "Dr. Maria Santos, M.D.", "12 Days");
};

window.openRxPdfModal = function (med, instructions, doctor, prc, date) {
    const modal = document.getElementById("modalRxPdf");
    if (!modal) return;
    document.getElementById("rxPdfMedName").textContent = med;
    document.getElementById("rxPdfInstructions").textContent = instructions;
    document.getElementById("rxPdfDoctor").textContent = doctor;
    document.getElementById("rxPdfPrc").textContent = prc;
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
    document.getElementById("progModalMeta").value = date + " @ " + venue;
    openModal("modalProgram");
};

window.openDownloadModal = function () {
    openModal("modalDownload");
};

window.triggerDownloadRecord = function (docName) {
    closeModal("modalDownload");
    showToast(`Generating ${docName}...`, "info");
    setTimeout(() => {
        showToast(`${docName} downloaded successfully!`, "success");
        window.print();
    }, 1200);
};

/* --------------------------------------------------------------------------
   8. Floating Toast Notification System
   -------------------------------------------------------------------------- */
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-msg ${type}`;

    let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
    if (type === "success") {
        iconHtml = '<i class="fa-solid fa-circle-check"></i>';
    } else if (type === "error") {
        iconHtml = '<i class="fa-solid fa-triangle-exclamation" style="color: #ef4444;"></i>';
    }

    toast.innerHTML = `${iconHtml} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(8px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}
window.showToast = showToast;
