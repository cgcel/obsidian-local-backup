import * as path from "path";
import * as fs from "fs-extra";
import AdmZip from "adm-zip";
import { exec } from "child_process";

/**
 * Replaces date placeholders (%Y, %m, etc) with their appropriate values (2021, 01, etc)
 * @param value - The string to replace placeholders in
 */
export const replaceDatePlaceholdersWithValues = (value: string) => {
	const now = new Date();
	if (value.includes("%Y")) {
		value = value.replace(/%Y/g, now.getFullYear().toString());
	}

	if (value.includes("%m")) {
		value = value.replace(
			/%m/g,
			(now.getMonth() + 1).toString().padStart(2, "0")
		);
	}

	if (value.includes("%d")) {
		value = value.replace(/%d/g, now.getDate().toString().padStart(2, "0"));
	}

	if (value.includes("%H")) {
		value = value.replace(
			/%H/g,
			now.getHours().toString().padStart(2, "0")
		);
	}

	if (value.includes("%M")) {
		value = value.replace(
			/%M/g,
			now.getMinutes().toString().padStart(2, "0")
		);
	}

	if (value.includes("%S")) {
		value = value.replace(
			/%S/g,
			now.getSeconds().toString().padStart(2, "0")
		);
	}

	return value;
};

/**
 * Gets the date placeholders for ISO8604 format (YYYY-MM-DDTHH:MM:SS)
 * We return underscores instead of dashes to separate the date and time
 * @returns Returns iso date placeholders
 */
export const getDatePlaceholdersForISO = (includeTime: boolean) => {
	if (includeTime) {
		return "%Y_%m_%d-%H_%M_%S";
	}
	return "%Y_%m_%d";
};

/**
 * Get path of current vault
 * @returns
 */
export function getDefaultPath(): string {
	const defaultPath = path.dirname((this.app.vault.adapter as any).basePath);
	// this.settings.savePathSetting = defaultPath
	return defaultPath;
}

/**
 * Get default backup name
 * @returns
 */
export function getDefaultName(): string {
	const vaultName = this.app.vault.getName();
	const defaultDatePlaceholders = getDatePlaceholdersForISO(true);
	return `${vaultName}-Backup-${defaultDatePlaceholders}`;
}

/**
 * Delete backups by lifecycleSetting
 * @param winSavePath
 * @param unixSavePath
 * @param fileNameFormat 
 * @param lifecycle 
 * @returns 
 */
export function deleteBackupsByLifeCycle(
	winSavePath: string,
	unixSavePath: string,
	fileNameFormat: string,
	lifecycle: string,
) {
	console.log("Run deleteBackupsByLifeCycle");

	const os = require("os");
	const platform = os.platform();
	let savePathSetting = "";

	if (platform === "win32") {
		savePathSetting = winSavePath;
	} else if (platform === "linux" || platform === "darwin") {
		savePathSetting = unixSavePath;
	}

	const currentDate = new Date();

	// calculate the target date
	if (parseInt(lifecycle) !== 0) {
		currentDate.setDate(currentDate.getDate() - parseInt(lifecycle));
	}

	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		// lifecycleSetting
		if (parseInt(lifecycle) !== 0) {
			files.forEach((file) => {
				const filePath = path.join(savePathSetting, file);
				const stats = fs.statSync(filePath);
				const fileNameRegex = generateRegexFromCustomPattern(fileNameFormat);
				const matchFileName = file.match(fileNameRegex);

				if (stats.isFile() && matchFileName !== null) {
					const parseTime = stats.mtime;
					const createDate = new Date(parseTime.getFullYear(), parseTime.getMonth(), parseTime.getDate());

					if (createDate < currentDate) {
						fs.remove(filePath);
						console.log(`Backup removed by deleteBackupsByLifeCycle: ${filePath}`);
					}
				}
			});
		}
	});
}

/**
 * Delete backups by backupsPerDayValue
 * @param winSavePath
 * @param unixSavePath 
 * @param fileNameFormat 
 * @param backupsPerDay 
 */
export function deletePerDayBackups(
	winSavePath: string,
	unixSavePath: string,
	fileNameFormat: string,
	backupsPerDay: string
) {
	console.log("Run deletePerDayBackups");

	if (parseInt(backupsPerDay) === 0) {
		return;
	}

	const os = require("os");
	const platform = os.platform();
	let savePathSetting = "";

	if (platform === "win32") {
		savePathSetting = winSavePath;
	} else if (platform === "linux" || platform === "darwin") {
		savePathSetting = unixSavePath;
	}

	fs.readdir(savePathSetting, (err, files) => {
		if (err) {
			console.error(err);
			return;
		}

		const currentDate = new Date();
		currentDate.setHours(0, 0, 0, 0);
		const fileNameRegex = generateRegexFromCustomPattern(fileNameFormat);

		const backupFiles = files.filter((file) => {
			const filePath = path.join(savePathSetting, file);
			const stats = fs.statSync(filePath);
			const matchFileName = file.match(fileNameRegex);

			return stats.isFile() && matchFileName !== null;
		});

		const todayBackupFiles = backupFiles.filter((file) => {
			const filePath = path.join(savePathSetting, file);
			const stats = fs.statSync(filePath);
			const parseTime = stats.mtime;
			const createDate = new Date(parseTime.getFullYear(), parseTime.getMonth(), parseTime.getDate());

			return createDate.getTime() === currentDate.getTime();
		});

		if (todayBackupFiles.length > parseInt(backupsPerDay)) {
			const filesToDelete = todayBackupFiles.slice(0, todayBackupFiles.length - parseInt(backupsPerDay));

			filesToDelete.forEach((file) => {
				const filePath = path.join(savePathSetting, file);
				fs.remove(filePath, (err) => {
					if (err) {
						console.error(`Failed to remove backup file: ${filePath}`, err);
					} else {
						console.log(`Backup removed by deletePerDayBackups: ${filePath}`);
					}
				});
			});
		}
	});
}

/**
 * Generate regex from custom pattern,
 * @param customPattern 
 * @returns 
 */
function generateRegexFromCustomPattern(customPattern: string): RegExp {
	// Replace placeholders like %Y, %m, etc. with corresponding regex patterns
	const regexPattern = customPattern
		.replace(/%Y/g, '\\d{4}') // Year
		.replace(/%m/g, '\\d{2}') // Month
		.replace(/%d/g, '\\d{2}') // Day
		.replace(/%H/g, '\\d{2}') // Hour
		.replace(/%M/g, '\\d{2}') // Minute
		.replace(/%S/g, '\\d{2}'); // Second

	// Create a regular expression to match the custom pattern
	return new RegExp(regexPattern);
}

/**
 * Create zip file by adm-zip
 * @param vaultPath 
 * @param backupZipPath 
 */
export async function createZipByAdmZip(vaultPath: string, backupZipPath: string) {
	// const AdmZip = require("adm-zip");
	const zip = new AdmZip();
	await zip.addLocalFolderAsync(vaultPath, (success?: boolean, err?: string) => {
		if (success) {
			console.log('Folder added to ZIP successfully!');
		} else {
			console.error('Error adding folder to ZIP:', err);
		}
	});
	zip.writeZip(backupZipPath);
}

/**
 * Create file by external archiver
 * @param archiverType 
 * @param archiverPath 
 * @param vaultPath 
 * @param backupZipPath 
 * @returns 
 */
export async function createFileByArchiver(archiverType: string, archiverPath: string, archiveFileType: string, vaultPath: string, backupFilePath: string) {

	switch (archiverType) {
		case "sevenZip":
			const sevenZipPromise = new Promise<void>((resolve, reject) => {
				const command = `"${archiverPath}" a "${backupFilePath}" "${vaultPath}"`;
				console.log(`command: ${command}`);

				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error("Failed to create file by 7-Zip:", error);
						reject(error);
					} else {
						console.log("File created by 7-Zip successfully.");
						resolve();
					}
				});
			});
			return sevenZipPromise;

		case "winRAR":
			const winRARPromise = new Promise<void>((resolve, reject) => {
				const command = `"${archiverPath}" a -ep1 -rh "${backupFilePath}" "${vaultPath}\*"`;
				console.log(`command: ${command}`);

				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error("Failed to create file by WinRAR:", error);
						reject(error);
					} else {
						console.log("File created by WinRAR successfully.");
						resolve();
					}
				});
			});
			return winRARPromise;

		case "bandizip":
			const bandizipPromise = new Promise<void>((resolve, reject) => {
				const command = `"${archiverPath}" c "${backupFilePath}" "${vaultPath}"`;
				console.log(`command: ${command}`);

				exec(command, (error, stdout, stderr) => {
					if (error) {
						console.error("Failed to create file by Bandizip:", error);
						reject(error);
					} else {
						console.log("File created by Bandizip successfully.");
						resolve();
					}
				});
			});
			return bandizipPromise;

		default:
			break;
	}

}
