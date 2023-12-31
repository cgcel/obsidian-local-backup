import { App, Component, MarkdownRenderer, Modal, Setting } from "obsidian";
import LocalBackupPlugin from "./main";

export class NewVersionNotifyModal extends Modal {
    plugin: LocalBackupPlugin;

    constructor(app: App, plugin: LocalBackupPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        const release = "0.1.6";

        const header = `### New in Local Backup ${release}\n`
        const text = `Thank you for using Local Backup!\n`;

        const contentDiv = contentEl.createDiv("local-backup-update-modal");
        const releaseNotes = [
            "1. Update the text in modal.",
            "2. Add customized retry after backup failed.",
            "3. Add support for Bandizip."
        ]
            .join("\n");

        const andNow = `Here are the updates in the latest version:`;
        const markdownStr = `${header}\n${text}\n${andNow}\n\n---\n\n${addExtraHashToHeadings(
            releaseNotes
        )}`;

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Okey")
                    .setCta()
                    .onClick(() => {
                        this.plugin.saveSettings();

                        this.close();
                    }));

        void MarkdownRenderer.renderMarkdown(
            markdownStr,
            contentDiv,
            app.vault.getRoot().path,
            new Component(),
        );
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }
}

function addExtraHashToHeadings(
    markdownText: string,
    numHashes = 1
): string {
    // Split the markdown text into an array of lines
    const lines = markdownText.split("\n");

    // Loop through each line and check if it starts with a heading syntax (#)
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#")) {
            // If the line starts with a heading syntax, add an extra '#' to the beginning
            lines[i] = "#".repeat(numHashes) + lines[i];
        }
    }

    // Join the array of lines back into a single string and return it
    return lines.join("\n");
}
