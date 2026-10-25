"use strict";

const reportSources = [
    { key: "consultations", label: "Consultation records", table: "consultations", dateColumn: "consultation_date" },
    { key: "appointments", label: "Appointment records", table: "appointments", dateColumn: "appointment_date" },
    { key: "immunizations", label: "Immunizations", table: "immunization_records", dateColumn: "date_given" },
    { key: "registrations", label: "New registrations", table: "patients", dateColumn: "created_at", timestamp: true }
];
const reportPageSize = 1000;
const reportRowLimit = 10000;

document.addEventListener("DOMContentLoaded", () => {
    const elements = {
        type: document.getElementById("reportType"),
        start: document.getElementById("startDate"),
        end: document.getElementById("endDate"),
        apply: document.getElementById("applyFilters"),
        export: document.getElementById("exportReport"),
        note: document.getElementById("filterNote"),
        status: document.getElementById("reportStatus"),
        total: document.getElementById("metricTotal"),
        consultations: document.getElementById("metricConsultations"),
        appointments: document.getElementById("metricAppointments"),
        immunizations: document.getElementById("metricImmunizations"),
        registrations: document.getElementById("metricRegistrations"),
        period: document.getElementById("metricPeriod"),
        heading: document.getElementById("reportHeading"),
        description: document.getElementById("reportDescription"),
        tableHeading: document.getElementById("tableHeading"),
        count: document.getElementById("recordCount"),
        chart: document.getElementById("trendChart"),
        tableHead: document.getElementById("reportTableHead"),
        tableBody: document.getElementById("reportTableBody"),
        exportSummary: document.getElementById("exportSummary")
    };
    const tabs = Array.from(document.querySelectorAll(".report-tab"));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));
    let lastReportSummary = "";

    const today = localDateString(new Date());
    const monthStart = `${today.slice(0, 7)}-01`;
    elements.start.value = monthStart;
    elements.end.value = today;
    elements.start.max = today;
    elements.end.max = today;

    elements.type.addEventListener("change", updateFilterState);
    elements.apply.addEventListener("click", loadReport);
    elements.export.addEventListener("click", exportReport);
    document.getElementById("staffInviteForm").addEventListener("submit", sendStaffInvitation);
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateTab(index, false));
        tab.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const nextIndex = event.key === "Home" ? 0
                : event.key === "End" ? tabs.length - 1
                    : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
            activateTab(nextIndex, true);
        });
    });
    updateFilterState();
    loadReport();

    function activateTab(index, moveFocus) {
        tabs.forEach((tab, tabIndex) => {
            const selected = tabIndex === index;
            tab.classList.toggle("active", selected);
            tab.setAttribute("aria-selected", String(selected));
            tab.tabIndex = selected ? 0 : -1;
            panels[tabIndex].hidden = !selected;
            panels[tabIndex].classList.toggle("active", selected);
        });
        if (moveFocus) tabs[index].focus();
    }

    async function sendStaffInvitation(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const fullName = document.getElementById("staffFullName").value.trim();
        const email = document.getElementById("staffEmail").value.trim();
        const role = document.getElementById("staffRole").value;
        const button = document.getElementById("inviteStaffButton");
        const status = document.getElementById("staffInviteStatus");

        if (!fullName || !email || !role) {
            status.dataset.state = "error";
            status.textContent = "Enter the staff name, work email, and designation.";
            return;
        }
        if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
            status.dataset.state = "error";
            status.textContent = "Supabase is not configured. The invitation was not sent.";
            return;
        }

        button.disabled = true;
        status.dataset.state = "loading";
        status.textContent = "Sending invitation…";
        try {
            const { data, error } = await window.sb.functions.invoke("invite-staff", {
                body: { fullName, email, role }
            });
            if (error) throw new Error(await getFunctionError(error));
            if (!data || data.invited !== true) {
                throw new Error("The invitation service did not confirm the invitation.");
            }
            form.reset();
            status.dataset.state = "success";
            status.textContent = `Invitation sent to ${data.email}. They can finish setting up their staff account from the email.`;
        } catch (error) {
            console.error("Could not send staff invitation:", error);
            status.dataset.state = "error";
            status.textContent = error.message || "Could not send the invitation. Check the function deployment and email configuration.";
        } finally {
            button.disabled = false;
        }
    }

    async function getFunctionError(error) {
        const context = error && error.context;
        if (context && typeof context.clone === "function") {
            try {
                const body = await context.clone().json();
                if (body && typeof body.error === "string") return body.error;
            } catch {
                // Use the SDK message when the response is not JSON.
            }
        }
        return error.message || "Staff invitation failed.";
    }

    function updateFilterState() {
        const isInventory = elements.type.value === "inventory";
        elements.start.disabled = isInventory;
        elements.end.disabled = isInventory;
        elements.note.textContent = isInventory
            ? "Inventory is a current stock snapshot; date filters do not apply."
            : "Date range is limited to one year.";
    }

    async function loadReport() {
        elements.apply.disabled = true;
        elements.export.disabled = true;
        elements.status.dataset.state = "loading";
        elements.status.textContent = "Loading live report data…";
        elements.exportSummary.textContent = "Building report…";
        lastReportSummary = "";
        resetMetrics();
        renderEmptyTable("Loading report data…");
        elements.chart.replaceChildren();

        try {
            if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
                throw new Error("Supabase is not configured.");
            }
            const { data: sessionData, error: sessionError } = await window.sb.auth.getSession();
            if (sessionError) throw sessionError;
            if (!sessionData.session) throw new Error("Sign in to view reports.");

            const reportType = elements.type.value;
            let exportRows;
            if (reportType === "inventory") {
                exportRows = await loadInventory();
            } else {
                const range = validateDateRange(elements.start.value, elements.end.value);
                const counts = await loadCounts(range);
                renderMetrics(counts, range);
                const activity = await loadActivity(reportType, range);
                renderActivity(activity, reportType, range);
                exportRows = activity.rows;
            }

            elements.export.disabled = exportRows.length === 0;
            const summary = reportType === "inventory"
                ? "Current medicine inventory snapshot"
                : `${elements.type.options[elements.type.selectedIndex].text} · ${formatDate(elements.start.value)} to ${formatDate(elements.end.value)}`;
            lastReportSummary = summary;
            elements.exportSummary.textContent = exportRows.length
                ? `${summary} · ${exportRows.length.toLocaleString()} aggregate rows ready to export.`
                : `${summary} · No rows are available to export.`;
            elements.status.dataset.state = "success";
            elements.status.textContent = reportType === "inventory"
                ? `Inventory snapshot loaded: ${exportRows.length.toLocaleString()} active items.`
                : `${elements.count.textContent} for ${formatDate(elements.start.value)} – ${formatDate(elements.end.value)}.`;
        } catch (error) {
            console.error("Could not load admin report:", error);
            elements.status.dataset.state = "error";
            elements.status.textContent = error.message || "Could not load report data. Check the database permissions and try again.";
            elements.exportSummary.textContent = "No report is ready to export. Build a report first.";
            resetMetrics();
            renderEmptyTable("Report data is unavailable.");
            renderEmptyChart("No report data to chart.");
        } finally {
            elements.apply.disabled = false;
        }
    }

    function validateDateRange(start, end) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
            throw new Error("Choose a valid start and end date.");
        }
        if (!isCalendarDate(start) || !isCalendarDate(end)) {
            throw new Error("Choose valid calendar dates.");
        }
        if (start > end) throw new Error("The start date must be on or before the end date.");
        if (end > today) throw new Error("The end date cannot be in the future.");
        const days = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
        if (!Number.isFinite(days) || days > 365) throw new Error("Choose a date range of one year or less.");
        return { start, end, endExclusive: addDays(end, 1), days: days + 1 };
    }

    function isCalendarDate(value) {
        const parsed = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }

    async function loadCounts(range) {
        const entries = await Promise.all(reportSources.map(async (source) => {
            const { count, error } = await applyRange(
                window.sb.from(source.table).select(source.dateColumn, { count: "exact", head: true }),
                source,
                range
            );
            if (error) throw new Error(`${source.label} count could not be loaded: ${error.message}`);
            if (count === null) throw new Error(`${source.label} count was not returned by the database.`);
            return [source.key, count];
        }));
        return Object.fromEntries(entries);
    }

    async function loadActivity(reportType, range) {
        const sources = reportType === "all"
            ? reportSources
            : reportSources.filter((source) => source.key === reportType);
        const grouped = new Map();

        for (const source of sources) {
            const rows = await fetchDateRows(source, range);
            rows.forEach((row) => {
                const value = row[source.dateColumn];
                const date = source.timestamp && value
                    ? localDateString(new Date(value))
                    : String(value || "").slice(0, 10);
                if (!date) return;
                const bucket = getBucket(date, range.days);
                if (!grouped.has(bucket.key)) grouped.set(bucket.key, { label: bucket.label, counts: {} });
                const entry = grouped.get(bucket.key);
                entry.counts[source.key] = (entry.counts[source.key] || 0) + 1;
            });
        }

        const keys = sources.map((source) => source.key);
        const rows = Array.from(grouped.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, entry]) => ({
                key,
                label: entry.label,
                counts: entry.counts,
                total: keys.reduce((sum, name) => sum + (entry.counts[name] || 0), 0)
            }));
        return { rows, sources };
    }

    async function fetchDateRows(source, range) {
        const rows = [];
        let offset = 0;
        let total = null;

        while (total === null || offset < total) {
            if (offset >= reportRowLimit) {
                throw new Error(`More than ${reportRowLimit.toLocaleString()} ${source.label.toLowerCase()} were found. Narrow the date range to load an accurate report.`);
            }
            const query = applyRange(
                window.sb.from(source.table).select(source.dateColumn, { count: "exact" }),
                source,
                range
            ).order(source.dateColumn, { ascending: true }).range(offset, offset + reportPageSize - 1);
            const { data, count, error } = await query;
            if (error) throw new Error(`${source.label} activity could not be loaded: ${error.message}`);
            if (total === null) {
                if (count === null) throw new Error(`${source.label} row count was not returned by the database.`);
                total = count;
                if (total > reportRowLimit) {
                    throw new Error(`More than ${reportRowLimit.toLocaleString()} ${source.label.toLowerCase()} were found. Narrow the date range to load an accurate report.`);
                }
            }
            rows.push(...(data || []));
            if (!data || data.length === 0) break;
            offset += data.length;
        }
        if (total !== null && rows.length !== total) {
            throw new Error(`${source.label} results changed while loading. Apply the report again to get complete totals.`);
        }
        return rows;
    }

    function applyRange(query, source, range) {
        if (source.timestamp) {
            return query
                .gte(source.dateColumn, new Date(`${range.start}T00:00:00`).toISOString())
                .lt(source.dateColumn, new Date(`${range.endExclusive}T00:00:00`).toISOString());
        }
        return query.gte(source.dateColumn, range.start).lt(source.dateColumn, range.endExclusive);
    }

    function renderMetrics(counts, range) {
        const values = reportSources.map((source) => counts[source.key]);
        elements.total.textContent = values.reduce((sum, count) => sum + count, 0).toLocaleString();
        elements.consultations.textContent = counts.consultations.toLocaleString();
        elements.appointments.textContent = counts.appointments.toLocaleString();
        elements.immunizations.textContent = counts.immunizations.toLocaleString();
        elements.registrations.textContent = counts.registrations.toLocaleString();
        elements.period.textContent = `${range.days.toLocaleString()}-day selected period`;
    }

    function resetMetrics() {
        setMetricLabels("Total activity", "Consultations", "Appointments", "Immunizations", "New registrations");
        ["Selected period", "Recorded visits", "Scheduled records", "Doses recorded", "Patients added"]
            .forEach((label, index) => {
                document.querySelectorAll(".metric-card small")[index].textContent = label;
            });
        [elements.total, elements.consultations, elements.appointments, elements.immunizations, elements.registrations]
            .forEach((element) => { element.textContent = "—"; });
        elements.period.textContent = "Selected period";
    }

    function renderActivity(activity, reportType, range) {
        const selectedSources = activity.sources;
        const heading = reportType === "all"
            ? "All activity"
            : selectedSources[0].label;
        elements.heading.textContent = `${heading} by period`;
        elements.tableHeading.textContent = `${heading} details`;
        elements.description.textContent = range.days <= 31
            ? "Daily totals for the selected date range."
            : "Weekly totals for the selected date range.";
        elements.count.textContent = `${activity.rows.reduce((sum, row) => sum + row.total, 0).toLocaleString()} records`;

        const columns = reportType === "all"
            ? [{ key: "label", label: "Period" }, ...selectedSources.map((source) => ({ key: source.key, label: source.label })), { key: "total", label: "Total" }]
            : [{ key: "label", label: "Period" }, { key: selectedSources[0].key, label: "Records" }];
        renderTable(columns, activity.rows.map((row) => ({
            label: row.label,
            ...row.counts,
            total: row.total
        })));
        renderChart(activity.rows, heading);
    }

    function renderChart(rows, label) {
        if (!rows.length) {
            renderEmptyChart("No activity found in this date range.");
            return;
        }
        const chartRows = rows.slice(-14);
        const max = Math.max(1, ...chartRows.map((row) => row.total));
        const fragment = document.createDocumentFragment();
        chartRows.forEach((row) => {
            const column = document.createElement("div");
            column.className = "chart-column";
            const value = document.createElement("span");
            value.className = "chart-value";
            value.textContent = row.total.toLocaleString();
            const track = document.createElement("div");
            track.className = "chart-bar-track";
            const bar = document.createElement("div");
            bar.className = "chart-bar";
            const percent = row.total === 0 ? 0 : Math.max(4, row.total / max * 100);
            bar.style.height = `${percent}%`;
            bar.setAttribute("role", "img");
            bar.setAttribute("aria-label", `${row.label}: ${row.total} ${label.toLowerCase()}`);
            track.append(bar);
            const dateLabel = document.createElement("span");
            dateLabel.className = "chart-label";
            dateLabel.textContent = row.label;
            column.append(value, track, dateLabel);
            fragment.append(column);
        });
        elements.chart.replaceChildren(fragment);
        elements.chart.setAttribute("aria-label", `${label} trend for the latest ${chartRows.length} periods`);
    }

    function renderTable(columns, rows) {
        const headRow = document.createElement("tr");
        columns.forEach((column) => {
            const cell = document.createElement("th");
            cell.scope = "col";
            cell.textContent = column.label;
            headRow.append(cell);
        });
        elements.tableHead.replaceChildren(headRow);

        if (!rows.length) {
            renderEmptyTable("No records found for this date range.");
            return;
        }
        const fragment = document.createDocumentFragment();
        rows.forEach((row) => {
            const tr = document.createElement("tr");
            columns.forEach((column) => {
                const td = document.createElement("td");
                const value = column.key === "label" ? row[column.key] : (row[column.key] || 0).toLocaleString();
                td.textContent = value;
                tr.append(td);
            });
            fragment.append(tr);
        });
        elements.tableBody.replaceChildren(fragment);
    }

    async function loadInventory() {
        const data = await fetchInventoryRows();

        const lowStock = data.filter((item) => Number(item.stock) > 0 && Number(item.stock) <= Number(item.reorder)).length;
        const outOfStock = data.filter((item) => Number(item.stock) <= 0).length;
        const units = data.reduce((sum, item) => sum + Number(item.stock || 0), 0);
        elements.total.textContent = data.length.toLocaleString();
        elements.consultations.textContent = lowStock.toLocaleString();
        elements.immunizations.textContent = outOfStock.toLocaleString();
        elements.appointments.textContent = units.toLocaleString();
        elements.registrations.textContent = "—";
        elements.period.textContent = "Current stock snapshot";
        setMetricLabels("Active medicines", "Low stock", "Units on hand", "Out of stock", "Not applicable");
        elements.heading.textContent = "Current inventory";
        elements.tableHeading.textContent = "Active medicine stock";
        elements.description.textContent = "Current quantities compared with each medicine's reorder level; date filters do not apply.";
        elements.count.textContent = `${data.length.toLocaleString()} active items`;
        renderTable([
            { key: "name", label: "Medicine" },
            { key: "category", label: "Category" },
            { key: "stock", label: "On hand" },
            { key: "reorder", label: "Reorder at" },
            { key: "status", label: "Status" }
        ], data.map((item) => ({
            name: item.name,
            category: item.category,
            stock: Number(item.stock || 0).toLocaleString(),
            reorder: Number(item.reorder || 0).toLocaleString(),
            status: item.status || "Unknown"
        })));
        renderInventoryChart(data, lowStock, outOfStock);
        return data.map((item) => ({
            Medicine: item.name,
            Category: item.category,
            "Units on hand": Number(item.stock || 0),
            "Reorder level": Number(item.reorder || 0),
            Status: item.status || "Unknown"
        }));
    }

    async function fetchInventoryRows() {
        const rows = [];
        let offset = 0;
        let total = null;

        while (total === null || offset < total) {
            const { data, count, error } = await window.sb.from("inventory")
                .select("name, category, stock, reorder, status", { count: "exact" })
                .eq("is_active", true)
                .order("name", { ascending: true })
                .range(offset, offset + reportPageSize - 1);
            if (error) throw new Error(`Inventory snapshot could not be loaded: ${error.message}`);
            if (!data) throw new Error("Inventory snapshot was not returned by the database.");
            if (total === null) {
                if (count === null) throw new Error("Inventory row count was not returned by the database.");
                total = count;
                if (total > reportRowLimit) {
                    throw new Error(`More than ${reportRowLimit.toLocaleString()} active inventory items were found. The export limit is ${reportRowLimit.toLocaleString()} items.`);
                }
            }
            rows.push(...data);
            if (data.length === 0) break;
            offset += data.length;
        }
        if (total !== null && rows.length !== total) {
            throw new Error("Inventory results changed while loading. Apply the report again to get a complete snapshot.");
        }
        return rows;
    }

    function setMetricLabels(total, consultations, appointments, immunizations, registrations) {
        const labels = document.querySelectorAll(".metric-card p");
        const sublabels = document.querySelectorAll(".metric-card small");
        [total, consultations, appointments, immunizations, registrations].forEach((label, index) => {
            labels[index].textContent = label;
        });
        sublabels[1].textContent = "At or below reorder level";
        sublabels[2].textContent = "Across active items";
        sublabels[3].textContent = "No stock available";
        sublabels[4].textContent = registrations;
    }

    function renderInventoryChart(items, lowStock, outOfStock) {
        const values = [
            ["Adequate", Math.max(0, items.length - lowStock - outOfStock)],
            ["Low stock", lowStock],
            ["Out of stock", outOfStock]
        ];
        const max = Math.max(1, ...values.map(([, count]) => count));
        elements.chart.replaceChildren();
        values.forEach(([label, count]) => {
            const column = document.createElement("div");
            column.className = "chart-column";
            const value = document.createElement("span");
            value.className = "chart-value";
            value.textContent = count.toLocaleString();
            const track = document.createElement("div");
            track.className = "chart-bar-track";
            const bar = document.createElement("div");
            bar.className = "chart-bar";
            bar.style.height = `${count === 0 ? 0 : Math.max(4, count / max * 100)}%`;
            track.append(bar);
            const dateLabel = document.createElement("span");
            dateLabel.className = "chart-label";
            dateLabel.textContent = label;
            column.append(value, track, dateLabel);
            elements.chart.append(column);
        });
        elements.chart.setAttribute("aria-label", "Current inventory counts by stock status");
    }

    function exportReport() {
        if (!lastReportSummary) return;
        const reportType = elements.type.value;
        let headers;
        let rows;
        if (reportType === "inventory") {
            headers = ["Medicine", "Category", "Units on hand", "Reorder level", "Status"];
            rows = Array.from(elements.tableBody.querySelectorAll("tr")).map((tr) =>
                Array.from(tr.cells, (cell) => cell.textContent)
            );
        } else {
            headers = Array.from(elements.tableHead.querySelectorAll("th"), (cell) => cell.textContent);
            rows = Array.from(elements.tableBody.querySelectorAll("tr"), (tr) =>
                Array.from(tr.cells, (cell) => cell.textContent)
            );
        }
        if (!rows.length || elements.tableBody.querySelector(".empty-cell")) return;

        const csv = [headers, ...rows]
            .map((row) => row.map((value) => {
                let text = String(value);
                if (/^[\u0000-\u0020]*[=+\-@]/.test(text)) text = `'${text}`;
                return `"${text.replace(/"/g, '""')}"`;
            }).join(","))
            .join("\r\n");
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${reportType}-report-${localDateString(new Date())}.csv`;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function renderEmptyTable(message) {
        const cell = document.createElement("td");
        cell.className = "empty-cell";
        cell.colSpan = 8;
        cell.textContent = message;
        const row = document.createElement("tr");
        row.append(cell);
        elements.tableHead.replaceChildren();
        elements.tableBody.replaceChildren(row);
        elements.count.textContent = "";
    }

    function renderEmptyChart(message) {
        const empty = document.createElement("p");
        empty.className = "empty-cell";
        empty.textContent = message;
        elements.chart.replaceChildren(empty);
    }
});

function getBucket(date, days) {
    if (days <= 31) return { key: date, label: date.slice(5) };
    const parsed = new Date(`${date}T00:00:00Z`);
    const weekday = (parsed.getUTCDay() + 6) % 7;
    parsed.setUTCDate(parsed.getUTCDate() - weekday);
    const start = utcDateString(parsed);
    return { key: start, label: start.slice(5) };
}

function addDays(date, days) {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return utcDateString(value);
}

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function utcDateString(date) {
    return date.toISOString().slice(0, 10);
}

function formatDate(date) {
    return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" })
        .format(new Date(`${date}T00:00:00`));
}
