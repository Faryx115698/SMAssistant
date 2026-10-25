"use strict";

const aiMotoFunctionName = "bright-service";

document.addEventListener("DOMContentLoaded", () => {
    const date = document.getElementById("currentDate");
    const connectionLabel = document.getElementById("connectionLabel");
    const form = document.getElementById("chatForm");
    const input = document.getElementById("chatInput");
    const status = document.getElementById("chatStatus");
    const transcript = document.getElementById("chatTranscript");
    const clearButton = document.getElementById("clearChat");
    const submitButton = form.querySelector('[type="submit"]');
    let sending = false;
    let conversation = [];

    if (date) {
        date.textContent = new Intl.DateTimeFormat(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(new Date());
    }

    document.querySelectorAll("[data-prompt]").forEach((button) => {
        button.addEventListener("click", () => {
            input.value = button.dataset.prompt || "";
            input.focus();
            status.textContent = "";
        });
    });

    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    clearButton.addEventListener("click", () => {
        conversation = [];
        transcript.replaceChildren();
        addMessage("assistant", "Chat cleared. Ask a general workflow or health-education question without including patient information.");
        input.value = "";
        status.textContent = "";
        input.focus();
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const question = input.value.trim();
        if (sending) return;
        if (!question) {
            status.textContent = "Enter a question first.";
            input.focus();
            return;
        }
        if (!window.sb || typeof isConfigured === "undefined" || !isConfigured) {
            status.textContent = "Supabase is not configured, so AI Moto cannot connect.";
            return;
        }

        sending = true;
        submitButton.disabled = true;
        clearButton.disabled = true;
        submitButton.textContent = "Thinking...";
        status.textContent = "Sending your general question and recent chat context to Gemini. Do not close this page.";
        addMessage("user", question);
        input.value = "";

        try {
            const messages = [
                ...conversation.flatMap((turn) => [
                    { role: "user", text: turn.user },
                    { role: "model", text: turn.assistant }
                ]),
                { role: "user", text: question }
            ];
            const { data, error } = await window.sb.functions.invoke(aiMotoFunctionName, {
                body: { messages }
            });
            if (error) throw new Error(await getFunctionError(error));
            if (!data || typeof data.reply !== "string" || !data.reply.trim()) {
                throw new Error("The AI service returned an empty response. Please try again.");
            }

            addMessage("assistant", data.reply);
            conversation.push({ user: question, assistant: data.reply });
            conversation = conversation.slice(-4);
            connectionLabel.textContent = "Gemini · ready";
            status.textContent = "Answered by Gemini. This response may be inaccurate; verify important information.";
        } catch (error) {
            console.error("AI Moto request failed:", error);
            const message = error.message || "AI Moto could not connect. Please try again.";
            addMessage("assistant", `AI Moto couldn't answer: ${message}`);
            status.textContent = message;
        } finally {
            sending = false;
            submitButton.disabled = false;
            clearButton.disabled = false;
            submitButton.innerHTML = '<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Send question';
            input.focus();
        }
    });

    function addMessage(role, message) {
        const article = document.createElement("article");
        article.className = `chat-message ${role}`;
        const label = document.createElement("strong");
        label.textContent = role === "user" ? "You" : "AI Moto";
        const content = document.createElement("p");
        content.textContent = message;
        article.append(label, content);
        transcript.appendChild(article);
        transcript.scrollTop = transcript.scrollHeight;
    }

    async function getFunctionError(error) {
        const context = error && error.context;
        if (context && typeof context.clone === "function") {
            try {
                const body = await context.clone().json();
                if (body && typeof body.error === "string") return body.error;
                if (body && typeof body.message === "string") return body.message;
            } catch {
                // Use the SDK error message when the response is not JSON.
            }
        }
        return error.message || "AI Moto request failed.";
    }
});
