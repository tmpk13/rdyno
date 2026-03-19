import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getActiveBoard, getEffectivePort } from "./boardConfig";

function getCrateName(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) { return undefined; }
  const cargoPath = path.join(folders[0].uri.fsPath, "Cargo.toml");
  try {
    const content = fs.readFileSync(cargoPath, "utf8");
    return content.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
  } catch { return undefined; }
}

let rttTerminal: vscode.Terminal | undefined;

export function startRtt(): void {
  const board = getActiveBoard();
  if (!board?.rtt?.enabled) {
    vscode.window.showWarningMessage("RTT not enabled for this board");
    return;
  }

  const probePath = vscode.workspace.getConfiguration("rustdyno").get<string>("probersPath", "probe-rs");

  // Use pseudo-terminal for clean output
  rttTerminal?.dispose();
  rttTerminal = vscode.window.createTerminal("RTT");
  rttTerminal.show();
  const port = getEffectivePort();
  const portFlag = port ? ` --probe ${port}` : "";
  if (!board.probe) {
    vscode.window.showErrorMessage("RTT requires a [probe] section in the board config.");
    return;
  }
  const elf = (board.board.elf && board.board.elf !== "<CRATE_NAME>" ? board.board.elf : undefined) ?? getCrateName() ?? "<CRATE_NAME>";
  rttTerminal.sendText(`${probePath} attach --chip ${board.board.chip} --protocol ${board.probe.protocol}${portFlag} target/${board.board.target}/release/${elf}`);
}