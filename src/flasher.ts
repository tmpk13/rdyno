import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { getActiveBoard, getEffectivePort, selectBoard } from "./boardConfig";

function getCrateName(): string | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) { return undefined; }
  const cargoPath = path.join(folders[0].uri.fsPath, "Cargo.toml");
  try {
    const content = fs.readFileSync(cargoPath, "utf8");
    return content.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
  } catch { return undefined; }
}

export async function flash(): Promise<void> {
  const board = getActiveBoard() ?? (await selectBoard());
  if (!board) { return; }

  const probePath = vscode.workspace.getConfiguration("rustdyno").get<string>("probersPath", "probe-rs");
  const port = getEffectivePort();
  const portFlag = port ? ` --probe ${port}` : "";

  const terminal = vscode.window.createTerminal("Flash");
  terminal.show();

  if (board.run?.command) {
    terminal.sendText(board.run.command);
  } else if (board.probe) {
    // Resolve ELF — convention: target/<target>/release/<crate-name>
    terminal.sendText(
      `${probePath} run --chip ${board.board.chip}` +
      ` --protocol ${board.probe.protocol}` +
      ` --speed ${board.probe.speed}` +
      portFlag +
      ` target/${board.board.target}/release/${(board.board.elf && board.board.elf !== "<CRATE_NAME>" ? board.board.elf : undefined) ?? getCrateName() ?? "<CRATE_NAME>"}`
    );
  } else {
    vscode.window.showErrorMessage("No flash command configured for this board. Add a [run] command or [probe] section to the board config.");
  }
}