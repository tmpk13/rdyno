import * as vscode from "vscode";
import * as path from "path";
import { getActiveBoard, getEffectivePort, selectBoard } from "./boardConfig";
import { getActiveFile } from "./filePicker";

export async function flash(): Promise<void> {
  const board = getActiveBoard() ?? (await selectBoard());
  if (!board) { return; }

  const port = getEffectivePort();
  const terminal = vscode.window.createTerminal("Flash");
  terminal.show();

  if (board.run?.command) {
    terminal.sendText(board.run.command);
  } else if (board.new_project?.runner) {
    // Project was scaffolded with a .cargo/config.toml runner — delegate to cargo
    const probeEnv = port ? `PROBE_RS_PROBE=${port} ` : "";
    const activeFile = getActiveFile();
    const binFlag = activeFile && path.basename(activeFile) !== "main.rs"
      ? ` --bin ${path.basename(activeFile, ".rs")}`
      : "";
    terminal.sendText(`${probeEnv}cargo run --release${binFlag}`);
  } else if (board.probe) {
    const probePath = vscode.workspace.getConfiguration("rustdyno").get<string>("probersPath", "probe-rs");
    const portFlag = port ? ` --probe ${port}` : "";
    terminal.sendText(
      `${probePath} run --chip ${board.board.chip}` +
      ` --protocol ${board.probe.protocol}` +
      ` --speed ${board.probe.speed}` +
      portFlag
    );
  } else {
    vscode.window.showErrorMessage("No flash command configured for this board. Add a [run] command or [probe] section to the board config.");
  }
}